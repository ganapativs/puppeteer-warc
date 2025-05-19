# Puppeteer WARC

This project provides a CLI tool to archive any web page and all its resources as a [WARC](https://iipc.github.io/warc-specifications/specifications/warc-format/warc-1.1/) file using Puppeteer. It supports optional screenshot capture, custom output folders, and includes example outputs for both WARC creation and reading/parsing. This makes it easy to preserve, browse, and analyze web pages for long-term storage or offline use.

## Requirements

- **Node.js**: Ensure you have Node.js installed (version 22 or higher is recommended). You can download it from [nodejs.org](https://nodejs.org/).

## Installation

1. **Clone the repository**: This step involves downloading the project files to your local machine.

   ```bash
   git clone https://github.com/ganapativs/puppeteer-warc.git
   cd puppeteer-warc
   ```

2. **Install the necessary dependencies**: This command will install all the required Node.js packages specified in the `package.json` file.

   ```bash
   npm install
   ```

## Usage

### Writing a WARC File

To create a WARC file from a website, use the `src/write-warc-cli.mjs` script. This script will render the specified website and create a WARC file containing the page and its resources. It will also generate a screenshot of the web page, which can be useful for debugging.

- **Command**:

  ```bash
  node src/write-warc-cli.mjs <website-url> [--output-folder=folder] [--screenshot=true|false]
  ```

  - **Options**:

    - `--output-folder=folder`: (Optional) Output directory for the WARC and screenshot files. If the folder does not exist, it will be created.
    - `--screenshot=true|false`: (Optional, default: true) Whether to save a screenshot of the web page. Set to `false` to skip screenshot generation.

  - **Example**: To create a WARC file for `https://example.com` and save it to the `example` folder with a screenshot, run:

    ```bash
    node src/write-warc-cli.mjs https://example.com --output-folder=example --screenshot=true
    ```

    This will produce the following output files in the `example` folder:

    - `example/examplecom.warc.gz` (the WARC archive)
    - `example/examplecom.png` (the screenshot)

    You can find these example output files in the [example](example) directory of this repository.

### Reading a WARC File

To read and print the contents of a WARC file, use the `src/read-warc-cli.mjs` script. This script supports two output formats: JSON and text.

- **Command**:

  ```bash
  node src/read-warc-cli.mjs <path-to-warc-file> [--format=json|text]
  ```

  - **Options**:

    - `--format=json` (default): Outputs the WARC contents in JSON format
    - `--format=text`: Outputs a human-readable text report

  - **Examples**:

    ```bash
    # Output in JSON format (default)
    node src/read-warc-cli.mjs examplecom.warc.gz

    # Output in text format
    node src/read-warc-cli.mjs examplecom.warc.gz --format=text
    ```

  The JSON format includes:

  - `recordCount`: Total number of records in the WARC file
  - `records`: Object containing all records, where each record includes:
    - `warcHeaders`: WARC headers for the record
    - `httpHeaders`: HTTP headers (when present)
    - `contentType`: Type of the content
    - `contentSize`: Size of the content in bytes
    - `content`: The actual content (base64 encoded for binary data)
    - `contentEncoding`: Indicates if content is base64 encoded

  The text format provides a well-structured report that includes:

  - Total number of records
  - WARC headers for each record
  - HTTP headers (when present)
  - Content type and size
  - Full content for text-based resources
  - Binary data indicator for non-text resources

  **Example Output:**

  You can find a sample JSON output produced by reading the `example/examplecom.warc.gz` file in [`example/examplecom-read-output.json`](example/examplecom-read-output.json).

### Previewing WARC Files

You can preview WARC files using [ReplayWeb.page](https://replayweb.page/), a web-based tool for viewing archived web content. This tool allows you to interact with the archived pages as if you were browsing them live.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
