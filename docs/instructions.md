# Claude Utilities Chrome Extension Technical Documentation

## Overview
This Chrome extension enhances the Claude.ai interface by providing additional functionality for managing and exporting artifacts (code, text, diagrams) displayed in the conversation panel.

## Core Features

### 1. Panel Width Control
- **Purpose**: Allows users to adjust the width of the artifact panel
- **Components**:
  - Width input field (ID: `width`)
  - Resize button (ID: `resizeBtn`)
  - Reset button (ID: `resetBtn`)
  - Progress bar (class: `progress-bar`)
- **Implementation Details**:
  - Width is stored in Chrome's local storage
  - Default width: 1500px
  - Width is constrained by window size
  - CSS injection targets the artifact panel using:
    ```css
    body > div.flex.min-h-screen.w-full > div > div > div.relative.flex.w-full.flex-1.overflow-x-hidden.overflow-y-scroll.pt-6.md\:pr-8 > div:nth-child(2) > div.fixed.bottom-0.top-0
    ```

### 2. Display Options
- **Purpose**: Provides fullscreen toggle for the artifact panel
- **Components**:
  - Fullscreen toggle button (ID: `fullscreenBtn`)
- **Implementation**:
  - Uses the same CSS selector as width control
  - Stores original styles before modification
  - Handles both enter and exit fullscreen states

### 3. Content Export
The extension supports three types of exports, each with its own tab and requirements:

#### 3.1 Text/Markdown Export
- **Tab ID**: `text-markdown`
- **Button ID**: `wordBtn`
- **Current Status**: Needs fixing
- **Required Selectors**:
  - Text content container
  - Markdown-specific elements
- **Implementation Notes**:
  - Should handle both plain text and formatted markdown
  - Need to preserve formatting during export

#### 3.2 Code/UI Export
- **Tab ID**: `code-ui` (This is just the name of the tab in our extension UI)
- **Button ID**: `codeUiScreenshotBtn`
- **Current Status**: Not working reliably
- **Target Element**: Claude.ai's artifact panel that displays UI mockups generated based on user's prompt
- **Correct Selector**: 
  ```javascript
  // The primary selector for Claude.ai's artifact panel:
  const artifactPanelSelector = "#artifacts-component-root-react";
  
  // Sometimes we need the first child:
  const artifactContentSelector = "#artifacts-component-root-react > div";
  ```
- **Previously Tried Selectors** (NOT RELIABLE):
  ```javascript
  const codeSelectors = [
    "pre code",
    ".code-block",
    ".hljs",
    "[data-testid='code-artifact']"
  ];
  const uiSelectors = [
    "[data-testid='ui-artifact']",
    ".ui-artifact",
    ".artifact-panel[data-type='ui']"
  ];
  ```
- **Important Note**: The "Code/UI" tab name refers to a tab in our extension UI and has nothing to do with Claude's UI structure. The actual target is Claude.ai's artifact panel which uses the ID `artifacts-component-root-react`.
- **Implementation Requirements**:
  - Must detect the artifact panel using the correct selector (`#artifacts-component-root-react`)
  - Capture the entire artifact panel which shows UI mockups
  - Support scrollable content
  - Maintain visual fidelity
- **Known Issues**:
  - Claude.ai may change the structure/selector of the artifact panel in future updates
  - Element visibility detection can be challenging
  - Need to handle varying sizes of the artifact panel

#### 3.3 Mermaid Diagram Export
- **Tab ID**: `mermaid`
- **Button ID**: `mermaidScreenshotBtn`
- **Current Selectors**:
  ```javascript
  const diagramSelectors = [
    ".react-transform-component",
    ".transform-component-module_content__ryUQq",
    "[class*='transform-component']",
    ".mermaid",
    "[class*='mermaid']",
    "[class*='diagram']"
  ];
  ```
- **SVG Handling**:
  - Searches for Mermaid-specific SVGs
  - Falls back to largest SVG if needed
  - Minimum size requirements: 200x200px

## Technical Implementation Details

### HTML2Canvas Integration
- **Loading**: Injected via Chrome's scripting API
- **Configuration**:
  ```javascript
  {
    backgroundColor: null,
    logging: true,
    scale: window.devicePixelRatio || 1,
    allowTaint: true,
    useCORS: true
  }
  ```
- **Error Handling**:
  - Retries on failure
  - 500ms delay between attempts
  - Preserves original element styles

### DOM Manipulation
- **Tab System**:
  - Uses data attributes for tab identification
  - Maintains active states via classes
  - Clones elements to remove old event listeners

### Chrome Extension APIs Used
- `chrome.scripting.executeScript`
- `chrome.storage.local`
- `chrome.tabs`
- Permissions required in manifest:
  - `activeTab`
  - `scripting`
  - `storage`

## UI/UX Specifications

### Layout
- Width: 400px
- Padding: 20px
- Font: Arial, sans-serif
- Color scheme:
  - Primary: #B75B3C
  - Hover: #9B4B30
  - Text: #333
  - Borders: #ddd

### Components
1. **Title Section**
   - Icon + Text layout
   - 24px font size for title

2. **Width Control**
   - Number input
   - Progress bar
   - Two action buttons

3. **Display Options**
   - Single toggle button
   - Icon + text layout

4. **Export Tabs**
   - Three tabs with consistent styling
   - Active state indication
   - Content area for each tab

5. **Loading Overlay**
   - Semi-transparent background
   - Centered spinner
   - Status text

## Required Fixes

### 1. Code/UI Export
- Need to identify correct DOM structure in Claude.ai
- Implement reliable element detection
- Handle different types of code displays
- Consider using MutationObserver for dynamic content

### 2. Text/Markdown Export
- Implement proper text selection
- Handle formatting preservation
- Support multi-page content

### 3. General Improvements
- Add error boundaries
- Improve loading states
- Add retry mechanisms
- Better error messages
- Cross-browser testing

## Development Guidelines

### Code Organization
- Separate concerns (UI, capture logic, file handling)
- Use TypeScript for better type safety
- Implement proper error handling
- Add comprehensive logging

### Testing Requirements
- Unit tests for each component
- Integration tests for capture functionality
- Cross-browser compatibility tests
- Performance testing for large artifacts

### Security Considerations
- Handle cross-origin restrictions
- Sanitize content before capture
- Respect Claude.ai's security boundaries
- Proper error handling for permissions

## Build and Deployment
- Use modern build tools (webpack/rollup)
- Implement proper versioning
- Create development/production builds
- Document release process

This documentation should serve as a comprehensive guide for understanding and improving the extension. The most critical areas needing attention are the element selection strategies and handling of different artifact types.
