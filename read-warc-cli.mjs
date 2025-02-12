/**
 * This script reads a WARC file and prints the contents of each record.
 *
 * Usage: node read-warc.js <path-to-warc-file>
 * Example: node read-warc.js example.warc.gz
 */

import { readWARC } from "./read-warc.mjs";

// Check if file path is provided as command line argument
const warcPath = process.argv[2];
if (!warcPath) {
  console.error("Please provide the path to a WARC file as an argument.");
  console.error("Usage: node script.js <path-to-warc-file>");
  process.exit(1);
}

// Run the function
readWARC(warcPath)
  .then((records) => console.log(records))
  .catch((error) => console.error("Fatal error:", error));
