/**
 * This script uses Puppeteer to capture a web page and its resources, and then creates a WARC file.
 * It can be used to archive web pages for long-term storage or for offline browsing.
 *
 * Usage: node write-warc.js <website-url>
 * Example: node write-warc.js https://example.com
 */

import { writeWARC } from "./write-warc.mjs";

// Check if file path is provided as command line argument
const website = process.argv[2];
if (!website) {
  console.error("Please provide the path to a WARC file as an argument.");
  console.error("Usage: node script.js <path-to-warc-file>");
  process.exit(1);
}

// Sanitize the website URL by removing 'http://', 'https://', and non-alphabetic characters
const sanitizedFilename = website
  .replace(/^https?:\/\//, "")
  .replaceAll(/[^a-zA-Z]/g, "");

// Use the sanitized filename for the WARC file
writeWARC(website, `${sanitizedFilename}.warc.gz`, {
  screenshotName: sanitizedFilename,
})
  .then(() => console.log("Archive complete"))
  .catch(console.error);
