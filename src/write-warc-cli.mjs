/**
 * This script uses Puppeteer to capture a web page and its resources, and then creates a WARC file.
 * It can be used to archive web pages for long-term storage or for offline browsing.
 *
 * Usage: node write-warc.js <website-url> [--output-folder=folder] [--screenshot=true|false]
 * Example: node write-warc.js https://example.com
 */

import fs from "node:fs";
import path from "node:path";
import { writeWARC } from "./write-warc.mjs";
import { logError } from "./utils-error.mjs";

// Parse command line arguments
const args = process.argv.slice(2);
const website = args[0];
const outputFolderArg = args.find((arg) => arg.startsWith("--output-folder="));
const outputFolder = outputFolderArg ? outputFolderArg.split("=")[1] : null;
const screenshotArg = args.find((arg) => arg.startsWith("--screenshot="));
let screenshotEnabled = false;
if (screenshotArg) {
  const val = screenshotArg.split("=")[1];
  screenshotEnabled = val !== "false";
}

// Check if the website URL is provided
if (!website) {
  logError("Please provide the website URL as an argument.");
  logError(
    "Usage: node script.js <website-url> [--output-folder=folder] [--screenshot=true|false]",
  );
  process.exit(1); // Exit the process with an error code
}

// Sanitize the website URL to create a valid filename
// This removes 'http://', 'https://', and non-alphabetic characters
const sanitizedFilename = website
  .replace(/^https?:\/\//, "") // Remove protocol (http or https)
  .replaceAll(/[^a-zA-Z]/g, ""); // Remove non-alphabetic characters

// Determine output paths
let warcPath = `${sanitizedFilename}.warc.gz`;
let screenshotPath = `${sanitizedFilename}.png`;
if (outputFolder) {
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }
  warcPath = path.join(outputFolder, warcPath);
  screenshotPath = path.join(outputFolder, screenshotPath);
}

// Use the sanitized filename to create the WARC file
writeWARC(website, warcPath, {
  screenshotName: screenshotEnabled ? screenshotPath : null,
})
  .then(() => console.log("Archive complete")) // Log success message
  .catch((err) => logError(err, "Fatal error in write-warc-cli")); // Log any errors encountered during the process
