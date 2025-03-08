# Claude Utilities

A Chrome extension for exporting conversations from Claude AI in various formats, with a clean and intuitive user interface.

<img src="assets/screenshots/screenshot-1.png" alt="Extension UI" width="400"/>

## Features

- **Export in Multiple Formats:**
  - **Text/Markdown:** Export conversations as clean Markdown files for use in documentation or other Markdown editors.
  - **Word Documents:** Export conversations as formatted .docx files with proper formatting preserved.
  - **PDF Files:** Export conversations as PDF documents for easy sharing and printing.
  - **Plain Text Files:** Export conversations as simple .txt files for maximum compatibility.
  
- **Copy to Clipboard:**
  - Instantly copy the entire conversation as plain text to your clipboard.
  - Strips Markdown formatting for clean pasting into any application.
  
- **User-Friendly Interface:**
  - Clear, intuitive buttons for each export option.
  - Real-time notifications for successful operations.
  - Loading indicators during processing.
  
- **Designed for Claude:**
  - Works with both claude.ai and anthropic.com domains.
  - Intelligently extracts conversation content.

## Extension Icon
<img src="icons/icon-128.png" alt="Extension Icon" width="128"/>

## Installation

### From Chrome Web Store
1. Visit the [Claude Utilities page](https://chrome.google.com/webstore/detail/your-extension-id) on the Chrome Web Store.
2. Click "Add to Chrome" to install the extension.

### From Source
1. Download this repository as a ZIP file or clone it:
   ```bash
   git clone https://github.com/imehr/claude-utilities.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the extension directory

## Usage

1. Open Claude in Chrome (works on both claude.ai and anthropic.com)
2. Have a conversation with Claude
3. Click the extension icon in the toolbar
4. Choose your desired export format:
   - **Text/Markdown:** Exports conversation as .md file
   - **Word:** Exports as .docx with formatting preserved
   - **PDF:** Exports as PDF document
   - **TXT:** Exports as plain text file
   - **Copy to Clipboard:** Copies the conversation as plain text to clipboard

## Privacy

This extension operates entirely within your browser and does not send any data to external servers. For full details on data handling, see our [Privacy Policy](PRIVACY.md).

## Development

The extension is built using:
- Chrome Extension Manifest V3
- Vanilla JavaScript
- Chrome Extension APIs
- docx.js for Word document generation
- html2canvas for content capture

### Project Structure
```
claude-utilities/
├── icons/                 # Extension icons
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── icon-256.png
├── assets/                # Documentation assets
│   └── screenshots/
│       └── screenshot-1.png
├── manifest.json          # Extension manifest
├── popup.html             # Extension popup UI
├── popup.css              # Styles for popup
├── popup.js               # Popup functionality
├── background.js          # Background service worker
├── content.js             # Content script for page interaction
├── docx.min.js            # Library for Word document generation
├── html2canvas.min.js     # Library for content capture
└── README.md              # This file
```

## Version History

- **v1.1:** Added PDF export, TXT export, and copy to clipboard functionality. Updated UI with improved design.
- **v1.0:** Initial release with Text/Markdown and Word export functionality.

## License

MIT License - see LICENSE file for details

## Author

Mehran Mozaffari