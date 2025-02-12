/**
 * This script reads a WARC (Web ARChive) file and prints the contents of each record to the console.
 *
 * Usage: node read-warc.js <path-to-warc-file>
 * Example: node read-warc.js example.warc.gz
 *
 * A WARC file is a standardized format for storing web crawls as sequences of HTTP request and response records.
 */

import { readWARC } from "./read-warc.mjs"; // Import the readWARC function from the read-warc module

// Retrieve the WARC file path from the command line arguments
const warcPath = process.argv[2];

// Check if the WARC file path is provided
if (!warcPath) {
  // If no file path is provided, log an error message and exit the process
  console.error("Please provide the path to a WARC file as an argument.");
  console.error("Usage: node script.js <path-to-warc-file>");
  process.exit(1); // Exit the process with a non-zero status code to indicate an error
}

// Read the WARC file using the readWARC function and handle the results
readWARC(warcPath)
  .then((records) => {
    // If the WARC file is read successfully, log each record to the console
    console.log(records);
  })
  .catch((error) => {
    // If an error occurs during the read process, log the error message
    console.error("Fatal error:", error);
  });
