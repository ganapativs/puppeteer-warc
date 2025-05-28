/**
 * This script reads a WARC (Web ARChive) file and prints the contents of each record to the console.
 *
 * Usage: node read-warc.js <path-to-warc-file> [--format=json|text]
 * Example: node read-warc.js example.warc.gz --format=text
 *
 * A WARC file is a standardized format for storing web crawls as sequences of HTTP request and response records.
 */

import { readWARC } from "./read-warc.mjs"; // Import the readWARC function from the read-warc module
import { logError } from "./utils-error.mjs";

// Parse command line arguments
const args = process.argv.slice(2);
const warcPath = args[0];
const formatArg = args.find((arg) => arg.startsWith("--format="));
const format = formatArg ? formatArg.split("=")[1] : "json";

// Validate format option
if (format && !["json", "text"].includes(format)) {
  logError("Invalid format option. Use --format=json or --format=text");
  process.exit(1);
}

// Check if the WARC file path is provided
if (!warcPath) {
  // If no file path is provided, log an error message and exit the process
  logError("Please provide the path to a WARC file as an argument.");
  logError("Usage: node script.js <path-to-warc-file> [--format=json|text]");
  process.exit(1); // Exit the process with a non-zero status code to indicate an error
}

// Read the WARC file using the readWARC function and handle the results
readWARC(warcPath, { format })
  .then((result) => {
    if (format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result);
    }
  })
  .catch((error) => {
    // If an error occurs during the read process, log the error message
    logError(error, "Fatal error in read-warc-cli");
  });
