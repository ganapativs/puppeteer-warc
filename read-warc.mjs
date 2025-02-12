/**
 * This script reads a WARC file and prints the contents of each record.
 *
 * Usage: node read-warc.js <path-to-warc-file>
 * Example: node read-warc.js example.warc.gz
 */

import { WARCParser } from "warcio";
import fs from "node:fs";

// Check if file path is provided as command line argument
const warcPath = process.argv[2];
if (!warcPath) {
  console.error("Please provide the path to a WARC file as an argument.");
  console.error("Usage: node script.js <path-to-warc-file>");
  process.exit(1);
}

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

async function readWARCRecords(warcPath) {
  const nodeStream = fs.createReadStream(warcPath);
  const parser = new WARCParser(nodeStream);
  const recordsMap = new Map();
  let recordCount = 0;

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

      // Add content for response records
      if (resourceDetails.warcHeaders["warc-type"] === "response") {
        if (textMimeTypes.some((type) => httpContentType.includes(type))) {
          resourceDetails.content = Buffer.from(content).toString();
        } else {
          resourceDetails.content = Buffer.from(content);
        }
      }
    } catch (error) {
      resourceDetails.contentError = error.message;
    }

    // Add resource details to the map
    recordsMap.set(`Record #${recordCount}`, resourceDetails);
  }

  return {
    recordCount,
    recordsMap,
  };
}

// Run the function
readWARCRecords(warcPath)
  .then((records) => console.log(records))
  .catch((error) => console.error("Fatal error:", error));
