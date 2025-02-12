import { WARCParser } from "warcio";
import fs from "node:fs";

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
 * Reads a WARC file and extracts records into a structured format.
 * @param {string} warcPath - The path to the WARC file.
 * @returns {Promise<{recordCount: number, recordsMap: Map}>} - A promise that resolves with the record count and a map of records.
 */
export async function readWARC(warcPath) {
  // Create a readable stream from the WARC file
  const nodeStream = fs.createReadStream(warcPath);
  const parser = new WARCParser(nodeStream);
  const recordsMap = new Map();
  let recordCount = 0;

  // Iterate over each record in the WARC file
  for await (const record of parser) {
    recordCount++;
    const resourceDetails = {};

    // Collect WARC headers
    resourceDetails.warcHeaders = {};
    for (const [key, value] of record.warcHeaders.headers) {
      resourceDetails.warcHeaders[key] = value;
    }

    // Collect HTTP headers if they exist
    if (record.httpHeaders) {
      resourceDetails.httpHeaders = {};
      for (const [key, value] of record.httpHeaders.headers) {
        resourceDetails.httpHeaders[key] = value;
      }
    }

    // Collect content details
    try {
      const contentType = record.warcHeader("Content-Type") || "";
      const httpContentType =
        record.httpHeaders?.headers.get("Content-Type") || "";
      const content = await record.readFully(true);

      resourceDetails.contentType = httpContentType || contentType;
      resourceDetails.contentSize = content.length;

      // Convert content to string if it's a recognized text MIME type
      if (textMimeTypes.some((type) => httpContentType.includes(type))) {
        resourceDetails.content = Buffer.from(content).toString();
      } else {
        resourceDetails.content = Buffer.from(content);
      }
    } catch (error) {
      // Capture any errors encountered during content extraction
      resourceDetails.contentError = error.message;
    }

    // Add resource details to the map
    recordsMap.set(`Record #${recordCount}`, resourceDetails);
  }

  // Return the total record count and the map of records
  return {
    recordCount,
    recordsMap,
  };
}
