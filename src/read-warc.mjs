import fs from "node:fs"; // Import Node.js file system module for file operations
import { WARCParser } from "warcio"; // Import WARCParser from the warcio library for parsing WARC files

// List of MIME types considered as text for content extraction
const textMimeTypes = [
  "application/javascript",
  "application/ecmascript",
  "application/json",
  "application/json-patch+json",
  "application/json-seq",
  "application/ld+json",
  "text/html",
  "application/xhtml+xml",
  "application/xml",
  "text/xml",
  "text/css",
  "text/plain",
  "text/csv",
  "text/tab-separated-values",
  "text/markdown",
  "text/yaml",
  "application/x-yaml",
  "application/x-httpd-php",
  "application/x-perl",
  "application/x-python-code",
  "application/x-shellscript",
  "text/event-stream",
  "application/x-ndjson",
];

/**
 * Generates a text report from WARC record details
 * @param {Map} recordsMap - Map containing WARC records
 * @param {number} recordCount - Total number of records
 * @returns {string} - Formatted text report
 */
function generateTextReport(recordsMap, recordCount) {
  let report = 'WARC File Report\n';
  report += '================\n\n';
  report += `Total Records: ${recordCount}\n\n`;

  for (const [recordId, details] of recordsMap) {
    report += `${recordId}\n${'-'.repeat(recordId.length)}\n\n`;

    // WARC Headers
    report += 'WARC Headers:\n';
    for (const [key, value] of Object.entries(details.warcHeaders)) {
      report += `  ${key}: ${value}\n`;
    }
    report += '\n';

    // HTTP Headers (if present)
    if (details.httpHeaders) {
      report += 'HTTP Headers:\n';
      for (const [key, value] of Object.entries(details.httpHeaders)) {
        report += `  ${key}: ${value}\n`;
      }
      report += '\n';
    }

    // Content Details
    report += `Content Type: ${details.contentType}\n`;
    report += `Content Size: ${details.contentSize} bytes\n\n`;

    if (details.contentError) {
      report += `Content Error: ${details.contentError}\n`;
    } else if (typeof details.content === 'string') {
      report += 'Content:\n';
      report += '--------\n';
      report += `${details.content}\n`;
    } else {
      report += 'Content: [Binary data]\n';
    }

    report += `\n${'='.repeat(80)}\n\n`;
  }

  return report;
}

/**
 * Converts Map to a plain object for JSON serialization
 * @param {Map} recordsMap - Map containing WARC records
 * @returns {Object} - Plain object representation of the Map
 */
function mapToObject(recordsMap) {
  const obj = {};
  for (const [key, value] of recordsMap) {
    // Convert Buffer objects to base64 strings for JSON serialization
    if (value.content instanceof Buffer) {
      value.content = value.content.toString('base64');
      value.contentEncoding = 'base64';
    }
    obj[key] = value;
  }
  return obj;
}

/**
 * Reads a WARC file and extracts records into a structured format.
 * @param {string} warcPath - The path to the WARC file.
 * @param {Object} options - Options for reading the WARC file
 * @param {('json'|'text')} [options.format='json'] - Output format ('json' or 'text')
 * @returns {Promise<{recordCount: number, records: Object}|string>} - A promise that resolves with either a JSON object or text report
 */
export async function readWARC(warcPath, options = { format: 'json' }) {
  // Create a readable stream from the WARC file
  const nodeStream = fs.createReadStream(warcPath);
  // Initialize the WARC parser with the file stream
  const parser = new WARCParser(nodeStream);
  // Initialize a map to store the extracted records
  const recordsMap = new Map();
  // Initialize a counter to keep track of the number of records
  let recordCount = 0;

  // Iterate over each record in the WARC file using an asynchronous iterator
  for await (const record of parser) {
    // Increment the record count for each record processed
    recordCount++;
    // Initialize an object to store details of the current record
    const resourceDetails = {};

    // Collect WARC headers from the record
    resourceDetails.warcHeaders = {};
    for (const [key, value] of record.warcHeaders.headers) {
      resourceDetails.warcHeaders[key] = value; // Store each header key-value pair
    }

    // Collect HTTP headers if they exist in the record
    if (record.httpHeaders) {
      resourceDetails.httpHeaders = {};
      for (const [key, value] of record.httpHeaders.headers) {
        resourceDetails.httpHeaders[key] = value; // Store each HTTP header key-value pair
      }
    }

    // Collect content details from the record
    try {
      // Retrieve the content type from WARC or HTTP headers
      const contentType = record.warcHeader("Content-Type") || "";
      const httpContentType =
        record.httpHeaders?.headers.get("Content-Type") || "";
      // Read the full content of the record
      const content = await record.readFully(true);

      // Store the content type and size
      resourceDetails.contentType = httpContentType || contentType;
      resourceDetails.contentSize = content.length;

      // Convert content to string if it's a recognized text MIME type
      if (textMimeTypes.some((type) => httpContentType.includes(type))) {
        resourceDetails.content = Buffer.from(content).toString();
      } else {
        // Store binary content if not a text MIME type
        resourceDetails.content = Buffer.from(content);
      }
    } catch (error) {
      // Capture any errors encountered during content extraction
      resourceDetails.contentError = error.message;
    }

    // Add resource details to the map with a unique key
    recordsMap.set(`Record #${recordCount}`, resourceDetails);
  }

  // Return the appropriate format based on options
  if (options.format === 'text') {
    return generateTextReport(recordsMap, recordCount);
  }

  return {
    recordCount,
    records: mapToObject(recordsMap)
  };
}
