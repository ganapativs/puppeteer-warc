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

async function printWARCRecords(warcPath) {
  try {
    const nodeStream = fs.createReadStream(warcPath);
    const parser = new WARCParser(nodeStream);
    let recordCount = 0;

    for await (const record of parser) {
      recordCount++;
      console.log("=".repeat(80));
      console.log("\n");
      console.log(`Record #${recordCount}`);
      console.log("=".repeat(80));

      // Print WARC headers
      console.log("\nWARC Headers:");
      console.log("-".repeat(20));
      for (const [key, value] of record.warcHeaders.headers) {
        console.log(`${key}: ${value}`);
      }

      // Print HTTP headers if they exist
      if (record.httpHeaders) {
        console.log("\nHTTP Headers:");
        console.log("-".repeat(20));
        for (const [key, value] of record.httpHeaders.headers) {
          console.log(`${key}: ${value}`);
        }
      }

      // Print content summary
      console.log("\nContent Summary:");
      console.log("-".repeat(20));

      try {
        // For text content, print first 500 characters
        const contentType = record.warcHeader("Content-Type") || "";
        const httpContentType =
          record.httpHeaders?.headers.get("Content-Type") || "";

        // For binary content, just show the size
        const content = await record.readFully(true);
        console.log(
          `Binary content(content-type: ${
            httpContentType || contentType
          }) of size: ${content.length} bytes`
        );
        if (textMimeTypes.some((type) => httpContentType.includes(type))) {
          console.log("Content is:");
          console.log("-".repeat(20));
          console.log(new Buffer.from(content).toString());
        } else {
          console.log("Non text content.");
        }
      } catch (error) {
        console.log("Error reading content:", error.message);
      }
    }

    console.log("=".repeat(80));
    console.log("\n");
    console.log(`Total records processed: ${recordCount}`);
  } catch (error) {
    console.error("Error processing WARC file:", error);
  }
}

// Run the function
printWARCRecords(warcPath)
  .then(() => console.log("Finished processing WARC file"))
  .catch((error) => console.error("Fatal error:", error));
