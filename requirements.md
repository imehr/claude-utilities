# Claude Artifact Expander - Requirements & Features

## Core Features

### Panel Width Control
- Adjustable width control with pixel input
- Width range: 500px to browser window width
- Visual progress bar showing width relative to browser window
- Resize button to apply width changes
- Reset button to restore default state

### Display Options
- Toggle fullscreen mode for artifact panel
- Maintains scroll functionality in fullscreen
- Adapts to browser window dimensions
- Preserves content formatting

### Export Capabilities
1. PNG Export
   - Captures visible content area
   - Maintains high resolution (supports Retina displays)
   - Automatically copies to clipboard
   - Downloads with timestamp in filename
   - Format: claude-artifact-{timestamp}.png

2. Word Export
   - Exports markdown content to .doc format
   - Preserves formatting:
     - Code blocks with syntax highlighting
     - Tables with proper borders
     - Lists and paragraphs
     - Headings with hierarchy
   - Downloads with timestamp in filename
   - Format: claude-artifact-{timestamp}.doc

## Technical Implementation

### XPath Selectors
- Container for width adjustment: `/html/body/div[3]/div/div/div[2]/div[2]/div[2]`
- Content for PNG export: `/html/body/div[3]/div/div/div[2]/div[2]/div[2]/div/div/div/div[2]`
- Markdown for Word export: `/html/body/div[3]/div/div/div[2]/div[2]/div[2]/div/div/div/div[3]/div/div`

### Browser APIs Used
- chrome.scripting
- chrome.storage.local
- chrome.tabs
- chrome.downloads
- Clipboard API
- Canvas API

### UI Components
- Custom SVG icons for actions
- Responsive button layout
- Progress bar for width visualization
- Consistent styling with Claude's interface

## Browser Support
- Chrome/Chromium-based browsers
- Manifest V3 compliant