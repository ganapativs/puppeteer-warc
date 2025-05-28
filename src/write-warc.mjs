import { executablePath } from "puppeteer";
import { addExtra } from "puppeteer-extra";
import rebrowserPuppeteer from "rebrowser-puppeteer-core";
import {
  closeWARCOutputStream,
  getWARCOutputStream,
  writeRequestResponse,
  writeWARCInfo,
} from "./write-utils.mjs";

// Enhance Puppeteer with additional plugins
const puppeteer = addExtra(rebrowserPuppeteer);

/**
 * Writes a WARC (Web ARChive) file for a given URL.
 * This function captures the network requests and responses, along with a screenshot and the rendered HTML.
 *
 * @param {string} url - The URL of the web page to archive.
 * @param {string} WARCPath - The file path where the WARC file will be saved.
 * @param {Object} options - Additional options for the WARC creation.
 * @param {string|null} options.screenshotName - The full path for the screenshot file to be saved, or null to skip screenshot.
 */
export async function writeWARC(url, WARCPath, { screenshotName }) {
  let browser; // Variable to hold the browser instance
  let WARCOutputStream; // Variable to hold the WARC output stream

  try {
    // Launch a new browser instance with specified options
    browser = await puppeteer.launch({
      headless: true, // Run in headful mode to see the browser window
      executablePath: executablePath(), // Path to the Chrome/Chromium executable
      defaultViewport: {
        width: 1440, // Set the default width of the browser window
        height: 900, // Set the default height of the browser window
      },
    });

    // Open a new page in the browser
    const page = await browser.newPage();

    // Set a custom user agent to mimic a real browser
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
    );

    // Map to store request and response data for each resource
    const resourceData = new Map();

    // Enable request interception to capture request details
    await page.setRequestInterception(true);

    // Event listener for handling requests
    page.on("request", async (request) => {
      const { id } = request; // Unique identifier for the request
      const requestData = {
        id,
        method: request.method(), // HTTP method (GET, POST, etc.)
        headers: request.headers(), // Request headers
        postData: request.hasPostData()
          ? request.postData() || (await request.fetchPostData()) // Capture post data if available
          : undefined,
        timestamp: new Date().toISOString(), // Timestamp of the request
      };

      // Initialize entry for the URL if it doesn't exist
      if (!resourceData.has(request.url())) {
        resourceData.set(request.url(), {});
      }
      // Store request data in the map
      resourceData.get(request.url())[id] = { request: requestData };
      request.continue(); // Continue the request
    });

    // Event listener for handling responses
    page.on("response", async (response) => {
      try {
        const { id } = response.request(); // Get the request ID
        const url = response.url(); // Get the response URL
        const responseData = {
          id,
          status: response.status(), // HTTP status code
          headers: response.headers(), // Response headers
          timestamp: new Date().toISOString(), // Timestamp of the response
          buffer: await response.buffer().catch(() => null), // Capture response body
          remoteAddress: response.remoteAddress(), // Add remote IP address
          timing: response.timing(), // Add timing information
        };

        // Initialize entry for the URL if it doesn't exist
        if (!resourceData.has(url)) {
          resourceData.set(url, {});
        }
        // Store response data in the map
        const entries = resourceData.get(url);
        const resourceEntry = entries[id] || {};
        resourceEntry.response = responseData;
      } catch (error) {
        console.warn(`Failed to capture response for ${url}:`, error);
      }
    });

    // Navigate to the specified URL and wait for the network to be idle
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Capture a screenshot of the page if requested
    if (screenshotName) {
      await page.screenshot({ path: screenshotName });
    }

    // Get the final rendered HTML content of the page
    const renderedHTML = await page.content();

    /**
     * ========================================================================
     * WARC Begin
     * ========================================================================
     */

    // Create a writable stream for the WARC file
    WARCOutputStream = getWARCOutputStream(WARCPath);

    // Create and write a warcinfo record to the WARC file
    await writeWARCInfo(WARCOutputStream, WARCPath);

    // Write the main page response with rendered HTML to the WARC file
    await writeRequestResponse(WARCOutputStream, `${url}#rendered-html`, {
      request: {
        id: "rendered-html",
        method: "GET",
        headers: {},
        timestamp: new Date().toISOString(),
      },
      response: {
        id: "rendered-html",
        status: 200,
        headers: {
          "content-type": "text/html",
        },
        timestamp: new Date().toISOString(),
        buffer: Buffer.from(renderedHTML),
      },
    });

    // Write all other resources (requests and responses) to the WARC file
    for (const [resourceUrl, entries] of resourceData.entries()) {
      for (const [id, data] of Object.entries(entries)) {
        if (resourceUrl !== url) {
          await writeRequestResponse(WARCOutputStream, resourceUrl, data);
        }
      }
    }

    // Close the WARC file stream
    closeWARCOutputStream(WARCOutputStream);

    /**
     * ========================================================================
     * WARC End
     * ========================================================================
     */

    // Close the browser instance
    await browser.close();
  } catch (error) {
    console.error("Error during WARC creation:", error);
    throw error; // Rethrow the error after logging
  } finally {
    if (WARCOutputStream) {
      // Ensure the WARC file stream is closed
      closeWARCOutputStream(WARCOutputStream);
    }

    if (browser) {
      // Ensure the browser instance is closed
      await browser.close();
    }
  }
}
