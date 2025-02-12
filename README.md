# Puppeteer WARC

Demonstration of how to use Puppeteer to render a web page, and then create a [WARC](https://iipc.github.io/warc-specifications/specifications/warc-format/warc-1.1/) file of rendered page and it's resources. It can be used to archive web pages for long-term storage or for offline browsing.

## Usage

1. Install dependencies:

```bash
npm install
```

2. Run the script:

### Write WARC

```bash
node write-warc.mjs <website-url>
```

Example:

```bash
node write-warc.mjs https://example.com
```

The script will render and create a WARC file of the given website.

The script will also create a screenshot of the web page, which can be useful for debugging.

### Read WARC

```bash
node read-warc.mjs <path-to-warc-file>
```

Example:

```bash
node read-warc.mjs example.warc.gz
```

The script will read the contents of the given WARC file and print the records.

### Preview WARC file

https://replayweb.page/

### License

MIT License - Copyright (c) 2025 Ganapati V S
