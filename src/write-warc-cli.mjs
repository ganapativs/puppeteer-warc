/**
 * This script uses Puppeteer to capture a web page and its resources, and then creates a WARC file.
 * It can be used to archive web pages for long-term storage or for offline browsing.
 *
 * Usage: node write-warc.js <website-url>
 * Example: node write-warc.js https://example.com
 */

import { writeWARC } from "./write-warc.mjs";

// Retrieve the website URL from the command line arguments
const website = process.argv[2];

// Check if the website URL is provided
if (!website) {
  console.error("Please provide the website URL as an argument.");
  console.error("Usage: node script.js <website-url>");
  process.exit(1); // Exit the process with an error code
}

// Sanitize the website URL to create a valid filename
// This removes 'http://', 'https://', and non-alphabetic characters
const sanitizedFilename = website
  .replace(/^https?:\/\//, "") // Remove protocol (http or https)
  .replaceAll(/[^a-zA-Z]/g, ""); // Remove non-alphabetic characters

// Use the sanitized filename to create the WARC file
writeWARC(website, `${sanitizedFilename}.warc.gz`, {
  screenshotName: sanitizedFilename, // Use the sanitized filename for the screenshot
})
  .then(() => console.log("Archive complete")) // Log success message
  .catch(console.error); // Log any errors encountered during the process
