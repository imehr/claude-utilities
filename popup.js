// Popup.js - Claude Utilities

document.addEventListener('DOMContentLoaded', function() {
  console.log('Document ready, initializing extension...');
  
  // Initialize the extension when popup opens
  initializeExtension();
  
  console.log('DOM fully loaded - initializing popup.js');
  
  // Initialize UI and event listeners
  initializeUI();
  
  // Add event listeners for export buttons
  document.getElementById('wordBtn').addEventListener('click', handleWordExport);
  document.getElementById('pdfBtn').addEventListener('click', handlePdfExport);
  document.getElementById('txtBtn').addEventListener('click', handleTxtExport);
  document.getElementById('copyBtn').addEventListener('click', handleCopyToClipboard);
});

// Function to ensure proper file extensions for downloads
function ensureProperFileExtensions() {
  // Check browser download support
  if (!("download" in document.createElement("a"))) {
    console.warn("This browser doesn't support the HTML5 download attribute");
  }
}

// Track the current URL to reset state when navigating to new pages
let currentTabUrl = '';

// Function to initialize the extension when popup is opened
function initializeExtension() {
  console.log('Initializing extension...');
  
  // Get current tab URL to track page changes
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs[0]) {
      currentTabUrl = tabs[0].url;
      console.log('Current tab URL:', currentTabUrl);
    }
  });
  
  // Ensure file extensions are properly supported
  ensureProperFileExtensions();
}

// Initialize UI elements
function initializeUI() {
  // Nothing to initialize for the streamlined version
}

// Show the loading overlay with optional custom message
function showLoading(message = 'Processing...') {
  const loadingText = document.querySelector('.loading-text');
  if (loadingText) {
    loadingText.textContent = message;
  }
  document.getElementById('loading-overlay').style.display = 'flex';
}

// Hide the loading overlay
function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

// Show a notification with the specified type (success, error, info)
function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = type;
  notification.style.display = 'block';
  
  setTimeout(function() {
    notification.style.display = 'none';
  }, duration);
}

// Extracts text content from the Claude window
function extractTextContent(callback) {
  // Get the current active tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs || tabs.length === 0) {
      callback({error: 'No active tab found'});
      return;
    }
    
    const activeTab = tabs[0];
    
    // Execute a content script to extract text
    chrome.scripting.executeScript({
      target: {tabId: activeTab.id},
      function: function() {
        // Function to convert a DOM element to Markdown
        function elementToMarkdown(element, depth = 0) {
          if (!element) return '';
          
          let markdown = '';
          
          // Skip hidden elements
          if (element.offsetParent === null && !['BODY', 'MAIN', 'DIV', 'SECTION'].includes(element.tagName)) {
            return '';
          }
          
          // Process by tag name
          switch (element.tagName) {
            case 'H1':
              markdown += `# ${element.textContent.trim()}\n\n`;
              break;
            case 'H2':
              markdown += `## ${element.textContent.trim()}\n\n`;
              break;
            case 'H3':
              markdown += `### ${element.textContent.trim()}\n\n`;
              break;
            case 'H4':
              markdown += `#### ${element.textContent.trim()}\n\n`;
              break;
            case 'H5':
              markdown += `##### ${element.textContent.trim()}\n\n`;
              break;
            case 'H6':
              markdown += `###### ${element.textContent.trim()}\n\n`;
              break;
            case 'P':
              if (element.textContent.trim()) {
                markdown += `${element.textContent.trim()}\n\n`;
              }
              break;
            case 'BR':
              markdown += '\n';
              break;
            case 'HR':
              markdown += '---\n\n';
              break;
            case 'UL':
              // Process list items in a UL separately
              for (const child of element.children) {
                if (child.tagName === 'LI') {
                  markdown += `* ${child.textContent.trim()}\n`;
                } else {
                  markdown += elementToMarkdown(child, depth + 1);
                }
              }
              markdown += '\n';
              break;
            case 'OL':
              // Process list items in an OL separately
              let index = 1;
              for (const child of element.children) {
                if (child.tagName === 'LI') {
                  markdown += `${index}. ${child.textContent.trim()}\n`;
                  index++;
                } else {
                  markdown += elementToMarkdown(child, depth + 1);
                }
              }
              markdown += '\n';
              break;
            case 'LI':
              // This should be handled by UL/OL processing
              markdown += `* ${element.textContent.trim()}\n`;
              break;
            case 'BLOCKQUOTE':
              markdown += `> ${element.textContent.trim().replace(/\n/g, '\n> ')}\n\n`;
              break;
            case 'PRE':
              if (element.querySelector('code')) {
                const code = element.querySelector('code');
                let language = '';
                if (code.className) {
                  const match = code.className.match(/language-(\w+)/);
                  if (match) {
                    language = match[1];
                  }
                }
                markdown += '```' + language + '\n' + code.textContent.trim() + '\n```\n\n';
              } else {
                markdown += '```\n' + element.textContent.trim() + '\n```\n\n';
              }
              break;
            case 'CODE':
              if (element.parentElement.tagName !== 'PRE') {
                markdown += '`' + element.textContent.trim() + '`';
              }
              break;
            case 'STRONG':
            case 'B':
              markdown += '**' + element.textContent.trim() + '**';
              break;
            case 'EM':
            case 'I':
              markdown += '*' + element.textContent.trim() + '*';
              break;
            case 'U':
              markdown += '_' + element.textContent.trim() + '_';
              break;
            case 'A':
              markdown += '[' + element.textContent.trim() + '](' + element.href + ')';
              break;
            case 'IMG':
              markdown += `![${element.alt || 'Image'}](${element.src})`;
              break;
            case 'TABLE':
              const rows = element.querySelectorAll('tr');
              if (rows.length > 0) {
                // Process header row
                const headerRow = rows[0];
                const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => cell.textContent.trim());
                markdown += '| ' + headers.join(' | ') + ' |\n';
                markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
                
                // Process data rows
                for (let i = 1; i < rows.length; i++) {
                  const cells = Array.from(rows[i].querySelectorAll('td')).map(cell => cell.textContent.trim());
                  markdown += '| ' + cells.join(' | ') + ' |\n';
                }
                markdown += '\n';
              }
              break;
            case 'DIV':
            case 'SPAN':
            case 'SECTION':
            case 'ARTICLE':
            case 'MAIN':
            case 'BODY':
              // For container elements, process their children
              for (const child of element.childNodes) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                  markdown += elementToMarkdown(child, depth + 1);
                } else if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() && element.childNodes.length === 1) {
                  markdown += child.textContent.trim() + '\n\n';
                }
              }
              break;
            default:
              if (element.textContent && element.textContent.trim() && element.children.length === 0) {
                markdown += element.textContent.trim() + '\n\n';
              } else {
                for (const child of element.childNodes) {
                  if (child.nodeType === Node.ELEMENT_NODE) {
                    markdown += elementToMarkdown(child, depth + 1);
                  }
                }
              }
          }
          
          return markdown;
        }
        
        // Get main content elements from Claude's interface
        function getClaudeContent() {
          console.log("Searching for Claude content...");
          
          // 1. Try the specific XPath provided by the user
          try {
            const xpathResult = document.evaluate('/html/body/div[2]/div/div/div[2]/div[2]/div[2]/div', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            if (xpathResult && xpathResult.singleNodeValue) {
              console.log("Found content using specific XPath");
              return xpathResult.singleNodeValue;
            }
          } catch (e) {
            console.error("XPath evaluation error:", e);
          }
          
          // 2. Try alternate XPaths that might work for Claude
          try {
            const alternateXPaths = [
              '//div[@class="prose"]', 
              '//main//div[contains(@class, "prose")]',
              '//div[contains(@class, "ProseMirror")]',
              '//div[contains(@class, "markdown")]'
            ];
            
            for (const xpath of alternateXPaths) {
              const xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
              if (xpathResult && xpathResult.singleNodeValue) {
                console.log("Found content using alternate XPath:", xpath);
                return xpathResult.singleNodeValue;
              }
            }
          } catch (e) {
            console.error("Alternate XPath evaluation error:", e);
          }
          
          // 3. Try the standard class-based selectors
          const conversationContainer = document.querySelector('.prose');
          if (conversationContainer) {
            console.log("Found content using .prose selector");
            return conversationContainer;
          }
          
          // 4. Fall back to main content
          const mainContent = document.querySelector('main');
          if (mainContent) {
            console.log("Found content using main selector");
            return mainContent;
          }
          
          // 5. Last resort, use body
          console.log("Using document.body as last resort");
          return document.body;
        }
        
        const content = getClaudeContent();
        const markdown = elementToMarkdown(content);
        
        // Clean up any leftover markdown issues
        const cleanedMarkdown = markdown
          .replace(/\n{3,}/g, '\n\n') // Remove excess line breaks
          .trim();
        
        // Extract plain text for text export and clipboard
        const plainText = content.innerText || content.textContent || '';
        
        return {
          markdown: cleanedMarkdown,
          title: document.title || 'Claude Conversation',
          html: content.outerHTML || document.body.outerHTML, // Include HTML for PDF export
          text: plainText.trim() // Include plain text for TXT export and clipboard
        };
      }
    }, function(results) {
      if (chrome.runtime.lastError) {
        callback({error: 'Error executing content script: ' + chrome.runtime.lastError.message});
        return;
      }
      
      if (!results || results.length === 0 || !results[0].result) {
        callback({error: 'No content found'});
        return;
      }
      
      callback(results[0].result);
    });
  });
}

// Handle Word export
function handleWordExport() {
  showLoading('Generating Word document...');
  
  extractTextContent(function(result) {
    if (result.error) {
      hideLoading();
      showNotification('Error: ' + result.error, 'error');
      return;
    }
    
    const markdown = result.markdown;
    const title = result.title || 'Claude Conversation';
    
    // Convert markdown to Word document
    downloadWordDocument(markdown, title);
  });
}

// Handle PDF export
function handlePdfExport() {
  showLoading('Preparing PDF export...');
  
  extractTextContent(function(result) {
    if (result.error) {
      hideLoading();
      showNotification('Error: ' + result.error, 'error');
      return;
    }
    
    const markdown = result.markdown;
    const title = result.title || 'Claude Conversation';
    
    // Create a well-formatted HTML document
    const html = markdownToHTML(markdown);
    const completePage = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 1.5cm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 { font-size: 24px; margin-top: 24px; color: #111; }
          h2 { font-size: 20px; margin-top: 20px; color: #222; }
          h3 { font-size: 18px; margin-top: 18px; color: #333; }
          pre {
            background-color: #f5f5f5;
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            font-size: 14px;
          }
          code {
            font-family: 'Courier New', monospace;
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 14px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          img {
            max-width: 100%;
          }
          blockquote {
            border-left: 4px solid #ddd;
            padding-left: 16px;
            margin-left: 0;
            color: #555;
          }
          .print-instructions {
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
          }
          .button-container {
            text-align: center;
            margin: 20px 0;
          }
          .print-button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
          }
          .print-button:hover {
            background-color: #45a049;
          }
          @media print {
            .print-instructions, .button-container, .print-button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-instructions">
          <h3>To save as PDF:</h3>
          <ol>
            <li>Click the "Print / Save as PDF" button below</li>
            <li>In the print dialog, select "Save as PDF" from the destination options</li>
            <li>Click "Save" and choose where to save your PDF file</li>
          </ol>
        </div>
        
        <div class="button-container">
          <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
        </div>
        
        <h1>${title}</h1>
        ${html}
        
        <script>
          // Auto-open print dialog after a short delay
          setTimeout(function() {
            window.print();
          }, 1000);
        </script>
      </body>
      </html>
    `;
    
    // Create a data URI
    const dataUri = 'data:text/html;charset=UTF-8,' + encodeURIComponent(completePage);
    
    // Open the formatted page in a new tab
    chrome.tabs.create({ url: dataUri }, function(tab) {
      hideLoading();
      showNotification('PDF ready in new tab', 'success');
    });
  });
}

// Handle Copy to Clipboard
function handleCopyToClipboard() {
  showLoading('Copying content to clipboard...');
  
  extractTextContent(function(result) {
    if (result.error) {
      hideLoading();
      showNotification('Error: ' + result.error, 'error');
      return;
    }
    
    try {
      // Extract plain text content (not markdown)
      // We'll use the raw text if available, or extract plain text from markdown
      let plainText = '';
      
      if (result.text) {
        // If the content script provided raw text, use that
        plainText = result.text;
      } else {
        // Remove markdown formatting to get plain text
        plainText = convertMarkdownToPlainText(result.markdown);
      }
      
      // Copy to clipboard
      const textArea = document.createElement('textarea');
      textArea.value = plainText;
      textArea.style.position = 'fixed';  // Avoid scrolling to bottom
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        hideLoading();
        showNotification('Content copied to clipboard', 'success');
      } else {
        hideLoading();
        showNotification('Failed to copy to clipboard', 'error');
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      hideLoading();
      showNotification('Error: ' + error.message, 'error');
    }
  });
}

// Convert markdown to plain text
function convertMarkdownToPlainText(markdown) {
  if (!markdown) return '';
  
  return markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, function(match) {
      // Keep the code content, remove the backticks
      return match.split('\n').slice(1, -1).join('\n');
    })
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove headings markers
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // Remove bold and italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove link syntax but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]+)\]\([^)]+\)/g, 'Image: $1')
    // Remove blockquotes
    .replace(/^>\s+(.+)$/gm, '$1')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Normalize list items
    .replace(/^\s*[-*+]\s+(.+)$/gm, '• $1')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '$1')
    // Remove excess line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Handle TXT export
function handleTxtExport() {
  showLoading('Generating text file...');
  
  extractTextContent(function(result) {
    if (result.error) {
      hideLoading();
      showNotification('Error: ' + result.error, 'error');
      return;
    }
    
    const text = result.text || convertMarkdownToPlainText(result.markdown);
    const title = result.title || 'Claude Conversation';
    
    // Download as simple text file
    downloadTextFile(text, title);
  });
}

// Download content as a plain text file
function downloadTextFile(text, title) {
  try {
    // Create a blob with plain text
    const blob = new Blob([text], { type: 'text/plain' });
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    
    // Create a download link and trigger it
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    hideLoading();
    showNotification('Text file downloaded successfully', 'success');
  } catch (error) {
    console.error('Error creating text file:', error);
    hideLoading();
    showNotification('Error creating text file: ' + error.message, 'error');
  }
}

// Download content as a Word document
function downloadWordDocument(markdown, title) {
  // Load the docx library
  const script = document.createElement('script');
  script.src = 'docx.min.js';
  
  console.log("Loading Word generation library from:", script.src);
  
  script.onload = function() {
    console.log("Word generation library loaded successfully");
    try {
      // Parse the markdown to create document content
      const docContent = parseMarkdownForWord(markdown);
      
      // Create a new document
      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: docContent
        }]
      });
      
      // Generate the document as a blob
      docx.Packer.toBlob(doc).then(blob => {
        const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
        
        // Create a download link and trigger it
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        hideLoading();
        showNotification('Word document downloaded successfully', 'success');
      }).catch(error => {
        console.error('Error packing Word document:', error);
        hideLoading();
        showNotification('Error creating Word document: ' + error.message, 'error');
      });
    } catch (error) {
      console.error('Error generating Word document:', error);
      hideLoading();
      showNotification('Error generating Word document: ' + error.message, 'error');
    }
  };
  
  script.onerror = function(error) {
    console.error('Error loading Word generation library:', error);
    hideLoading();
    showNotification('Error loading Word generation library. Check console for details.', 'error');
  };
  
  document.head.appendChild(script);
}

// Simple markdown to HTML conversion
function markdownToHTML(markdown) {
  if (!markdown) return '';
  
  // Basic markdown conversion
  let html = markdown
    // Headers
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
    .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
    
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\__(.*?)\__/g, '<strong>$1</strong>')
    .replace(/\_(.*?)\_/g, '<em>$1</em>')
    
    // Code blocks
    .replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre><code>${code}</code></pre>`;
    })
    
    // Inline code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    
    // Lists
    .replace(/^[\*\-] (.*$)/gm, '<li>$1</li>')
    .replace(/^[0-9]+\. (.*$)/gm, '<li>$1</li>')
    
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    
    // Images
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2">')
    
    // Paragraphs (this needs to come after other replacements)
    .replace(/^(?!<[hl])(.+)$/gm, '<p>$1</p>')
    
    // Clean up empty paragraphs
    .replace(/<p>\s*<\/p>/g, '');
  
  // Wrap lists
  let inList = false;
  let listItems = [];
  let finalHtml = '';
  
  const lines = html.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('<li>')) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(line);
    } else {
      if (inList) {
        inList = false;
        finalHtml += '<ul>' + listItems.join('') + '</ul>';
        listItems = [];
      }
      finalHtml += line + '\n';
    }
  }
  
  // Handle any remaining list items
  if (inList) {
    finalHtml += '<ul>' + listItems.join('') + '</ul>';
  }
  
  return finalHtml;
}

// Parse markdown for Word document
function parseMarkdownForWord(markdown) {
  const lines = markdown.split('\n');
  const docContent = [];
  
  let inCodeBlock = false;
  let codeContent = '';
  let inListBlock = false;
  let listItems = [];
  let isOrderedList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        inCodeBlock = false;
        docContent.push(new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: codeContent,
              font: 'Courier New',
              size: 20
            })
          ],
          spacing: {
            before: 200,
            after: 200
          },
          shading: {
            type: docx.ShadingType.SOLID,
            color: 'F5F5F5'
          }
        }));
        codeContent = '';
      } else {
        // Start of code block
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }
    
    // Handle headers
    if (line.startsWith('# ')) {
      docContent.push(new docx.Paragraph({
        text: line.substring(2).trim(),
        heading: docx.HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));
      continue;
    }
    
    if (line.startsWith('## ')) {
      docContent.push(new docx.Paragraph({
        text: line.substring(3).trim(),
        heading: docx.HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 180 }
      }));
      continue;
    }
    
    if (line.startsWith('### ')) {
      docContent.push(new docx.Paragraph({
        text: line.substring(4).trim(),
        heading: docx.HeadingLevel.HEADING_3,
        spacing: { before: 320, after: 160 }
      }));
      continue;
    }
    
    if (line.startsWith('#### ')) {
      docContent.push(new docx.Paragraph({
        text: line.substring(5).trim(),
        heading: docx.HeadingLevel.HEADING_4,
        spacing: { before: 280, after: 140 }
      }));
      continue;
    }
    
    // Handle lists
    const unorderedListMatch = line.match(/^\s*[\*\-]\s+(.+)$/);
    const orderedListMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    
    if (unorderedListMatch || orderedListMatch) {
      const itemText = unorderedListMatch ? unorderedListMatch[1] : orderedListMatch[1];
      
      if (!inListBlock) {
        // Start a new list
        inListBlock = true;
        isOrderedList = !!orderedListMatch;
        listItems = [];
      }
      
      listItems.push(itemText);
      continue;
    } else if (inListBlock && line.trim() === '') {
      // End of list block
      inListBlock = false;
      
      // Add list to document
      for (let j = 0; j < listItems.length; j++) {
        docContent.push(new docx.Paragraph({
          text: listItems[j],
          bullet: {
            level: 0
          },
          spacing: {
            before: 80,
            after: 80
          }
        }));
      }
      
      listItems = [];
    }
    
    // Handle paragraphs
    if (!inListBlock && line.trim() !== '') {
      // Handle bold, italic, etc.
      const textRuns = parseInlineFormatting(line);
      
      docContent.push(new docx.Paragraph({
        children: textRuns,
        spacing: {
          before: 120,
          after: 120
        }
      }));
    }
  }
  
  // Handle any remaining list items
  if (inListBlock && listItems.length > 0) {
    for (let j = 0; j < listItems.length; j++) {
      docContent.push(new docx.Paragraph({
        text: listItems[j],
        bullet: {
          level: 0
        },
        spacing: {
          before: 80,
          after: 80
        }
      }));
    }
  }
  
  return docContent;
}

// Parse inline formatting (bold, italic, etc.)
function parseInlineFormatting(text) {
  const runs = [];
  let currentText = '';
  let isBold = false;
  let isItalic = false;
  let isCode = false;
  
  // Simple state machine to handle basic formatting
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = i + 1 < text.length ? text[i + 1] : '';
    const prevChar = i > 0 ? text[i - 1] : '';
    
    // Handle code formatting
    if (char === '`' && !isCode) {
      if (currentText) {
        runs.push(new docx.TextRun({
          text: currentText,
          bold: isBold,
          italic: isItalic
        }));
        currentText = '';
      }
      isCode = true;
      continue;
    } else if (char === '`' && isCode) {
      runs.push(new docx.TextRun({
        text: currentText,
        font: 'Courier New',
        size: 20
      }));
      currentText = '';
      isCode = false;
      continue;
    }
    
    // Handle bold formatting
    if (char === '*' && nextChar === '*' && !isCode) {
      if (currentText) {
        runs.push(new docx.TextRun({
          text: currentText,
          bold: isBold,
          italic: isItalic
        }));
        currentText = '';
      }
      isBold = !isBold;
      i++; // Skip the next asterisk
      continue;
    }
    
    // Handle italic formatting
    if (char === '*' && nextChar !== '*' && prevChar !== '*' && !isCode) {
      if (currentText) {
        runs.push(new docx.TextRun({
          text: currentText,
          bold: isBold,
          italic: isItalic
        }));
        currentText = '';
      }
      isItalic = !isItalic;
      continue;
    }
    
    currentText += char;
  }
  
  // Add any remaining text
  if (currentText) {
    runs.push(new docx.TextRun({
      text: currentText,
      bold: isBold,
      italic: isItalic,
      font: isCode ? 'Courier New' : undefined,
      size: isCode ? 20 : undefined
    }));
  }
  
  return runs.length > 0 ? runs : [new docx.TextRun({ text })];
}