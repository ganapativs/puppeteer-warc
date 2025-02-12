import { WARCParser } from "warcio";
import fs from "node:fs";

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

export async function readWARC(warcPath) {
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
      if (textMimeTypes.some((type) => httpContentType.includes(type))) {
        resourceDetails.content = Buffer.from(content).toString();
      } else {
        resourceDetails.content = Buffer.from(content);
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
