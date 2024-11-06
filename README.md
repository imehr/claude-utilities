# Claude Artifact Expander

A Chrome extension to enhance Claude's artifact panel with resizing, fullscreen, and export capabilities.

![Extension UI](assets/claude-utility-UI.png)

## Features

- Adjust panel width with pixel precision
- Toggle fullscreen mode
- Export content as PNG with automatic clipboard copy
  - Saves PNG file to downloads
  - Automatically copies the same image to clipboard for easy pasting
- Export content as Word document
- Visual width indicator
- One-click reset

## Extension Icon
![Extension Icon](icons/icon-128.png)

## Installation

### From Source
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/claude-artifact-expander.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the extension directory

### Usage

1. Open Claude in Chrome
2. Click the extension icon in the toolbar
3. Use the controls to:
   - Adjust panel width using the input field and Resize button
   - Reset to default width using Reset button
   - Toggle fullscreen mode
   - Export content:
     - PNG: Saves file and copies to clipboard automatically
     - Word: Exports formatted document

## Interface

The extension provides a simple interface for controlling the artifact panel:

<img src="docs/images/claude-utility-UI.png" alt="Extension Interface" width="400"/>

1. Width Control Section:
   - Input field for precise width in pixels
   - Resize button to apply width
   - Reset button to restore default
   - Visual progress bar showing width relative to window

2. Export Section:
   - PNG export (with clipboard copy)
   - Word export

## Development

The extension is built using:
- Chrome Extension Manifest V3
- Vanilla JavaScript
- Chrome Extension APIs

### Project Structure