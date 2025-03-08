document.addEventListener('DOMContentLoaded', function() {
    const widthInput = document.getElementById('width');
    const resizeBtn = document.getElementById('resizeBtn');
    const resetBtn = document.getElementById('resetBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const screenshotBtn = document.getElementById('screenshotBtn');
    const wordBtn = document.getElementById('wordBtn');
    const progressBar = document.querySelector('.progress-bar');
  
    // Get max window width and set input max
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          return window.innerWidth;
        }
      }, (results) => {
        if (results && results[0]) {
          const maxWidth = results[0].result;
          widthInput.max = maxWidth;
          updateProgressBar(widthInput.value, maxWidth);
        }
      });
    });
  
    // Load saved width
    chrome.storage.local.get(['width'], function(result) {
      widthInput.value = result.width || 1500;
      updateProgressBar(widthInput.value, widthInput.max);
    });
  
    // Handle width input changes
    resizeBtn.addEventListener('click', function() {
      const width = parseInt(widthInput.value);
      updateProgressBar(width, widthInput.max);
      chrome.storage.local.set({ width });
  
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        injectCSS(tabs[0].id, width);
      });
    });
  
    // Handle reset button
    resetBtn.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        // Reload the page to reset everything
        chrome.tabs.reload(tabs[0].id);
      });
    });
  
    function updateProgressBar(currentWidth, maxWidth) {
      const percentage = (currentWidth / maxWidth) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  
    // Handle fullscreen button
    fullscreenBtn.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: toggleFullscreen
        });
      });
    });
  
    // Update the screenshot button handler
    screenshotBtn.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => {
            const contentDiv = document.evaluate(
              '/html/body/div[3]/div/div/div[2]/div[2]/div[2]/div/div/div/div[2]',
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;
  
            if (!contentDiv) {
              alert('Could not find the artifact container');
              return null;
            }
  
            // Get dimensions
            const rect = contentDiv.getBoundingClientRect();
            const devicePixelRatio = window.devicePixelRatio || 1;
  
            return {
              rect: {
                x: rect.left * devicePixelRatio,
                y: rect.top * devicePixelRatio,
                width: rect.width * devicePixelRatio,
                height: rect.height * devicePixelRatio
              },
              devicePixelRatio
            };
          }
        }, (results) => {
          if (!results || !results[0].result) {
            console.error('Could not find target element');
            alert('Could not find the target element');
            return;
          }
  
          const { rect } = results[0].result;
  
          chrome.tabs.captureVisibleTab(
            null,
            { format: 'png' },
            function(dataUrl) {
              const img = new Image();
              img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
  
                canvas.width = rect.width;
                canvas.height = rect.height;
  
                ctx.drawImage(img, 
                  rect.x, rect.y,
                  rect.width, rect.height,
                  0, 0,
                  rect.width, rect.height
                );
  
                canvas.toBlob(function(blob) {
                  // Download the image
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `claude-artifact-${new Date().toISOString().slice(0,19).replace(/[:]/g, '-')}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
  
                  // Copy to clipboard
                  try {
                    const item = new ClipboardItem({ 'image/png': blob });
                    navigator.clipboard.write([item]).then(() => {
                      console.log('Image copied to clipboard');
                    }).catch((err) => {
                      console.error('Failed to copy to clipboard:', err);
                    });
                  } catch (err) {
                    console.error('Clipboard API not supported:', err);
                  }
                }, 'image/png', 1.0);
              };
  
              img.src = dataUrl;
            }
          );
        });
      });
    });
  
    // Add after the screenshot button event listener
    wordBtn.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => {
            const contentDiv = document.evaluate(
              '/html/body/div[3]/div/div/div[2]/div[2]/div[2]/div/div/div/div[3]/div/div',
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;
  
            if (!contentDiv) {
              alert('Could not find the markdown content');
              return;
            }
  
            // Get the markdown content and clean it up
            let markdownContent = contentDiv.innerHTML;
            
            // Create Word-compatible HTML
            const htmlContent = `
              <html xmlns:o='urn:schemas-microsoft-com:office:office' 
                    xmlns:w='urn:schemas-microsoft-com:office:word' 
                    xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                  <meta charset="utf-8">
                  <title>Claude Artifact Export</title>
                  <!--[if gte mso 9]>
                  <xml>
                    <w:WordDocument>
                      <w:View>Print</w:View>
                      <w:Zoom>100</w:Zoom>
                      <w:DoNotOptimizeForBrowser/>
                    </w:WordDocument>
                  </xml>
                  <![endif]-->
                  <style>
                    /* Basic styling */
                    body {
                      font-family: Arial, sans-serif;
                      font-size: 11pt;
                      line-height: 1.5;
                      margin: 20px;
                    }
                    
                    /* Table styling */
                    table {
                      border-collapse: collapse;
                      width: 100%;
                      margin: 10pt 0;
                    }
                    th, td {
                      border: 1pt solid #000;
                      padding: 8pt;
                      text-align: left;
                    }
                    
                    /* Code block styling */
                    pre, code {
                      font-family: "Courier New", Courier, monospace;
                      font-size: 10pt;
                      background-color: #f6f8fa;
                      padding: 8pt;
                      margin: 8pt 0;
                      border: 1pt solid #ddd;
                      white-space: pre-wrap;
                    }
                    
                    /* Heading styles */
                    h1 { font-size: 16pt; margin: 12pt 0 6pt 0; }
                    h2 { font-size: 14pt; margin: 10pt 0 6pt 0; }
                    h3 { font-size: 12pt; margin: 8pt 0 6pt 0; }
                    
                    /* List styles */
                    ul, ol { margin: 6pt 0; padding-left: 20pt; }
                    li { margin: 3pt 0; }
                    
                    /* Paragraph spacing */
                    p { margin: 6pt 0; }
  
                    /* Page setup */
                    @page {
                      margin: 1in;
                    }
                    
                    /* Print optimizations */
                    @media print {
                      pre, code, table { page-break-inside: avoid; }
                      h1, h2, h3 { page-break-after: avoid; }
                    }
                  </style>
                </head>
                <body>
                  ${markdownContent}
                </body>
              </html>
            `;
  
            // Create blob with proper Word mime type
            const blob = new Blob([htmlContent], { 
              type: 'application/vnd.ms-word;charset=utf-8'
            });
            
            // Download file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `claude-artifact-${new Date().toISOString().slice(0,19).replace(/[:]/g, '-')}.doc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        });
      });
    });
  });
  
  function injectCSS(tabId, width) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: (width) => {
        const containerDiv = document.evaluate(
          '/html/body/div[3]/div/div/div[2]/div[2]/div[2]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
  
        if (containerDiv) {
          containerDiv.style.width = `${width}px`;
          containerDiv.style.maxWidth = `${width}px`;
        }
      },
      args: [width]
    });
  }
  
  function toggleFullscreen() {
    const xpath = '/html/body/div[3]/div/div/div[2]/div[2]/div[2]';
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const targetDiv = result.singleNodeValue;
  
    if (targetDiv) {
      if (!targetDiv.style.position || targetDiv.style.position !== 'fixed') {
        // Store original styles before going fullscreen
        targetDiv.setAttribute('data-original-styles', targetDiv.style.cssText);
        
        // Get browser window dimensions
        const maxWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
        const maxHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
  
        // Go fullscreen with browser width limit
        targetDiv.style.position = 'fixed';
        targetDiv.style.top = '0';
        targetDiv.style.left = '0';
        targetDiv.style.width = `${maxWidth}px`;
        targetDiv.style.height = `${maxHeight}px`;
        targetDiv.style.zIndex = '9999';
        targetDiv.style.backgroundColor = 'white';
        targetDiv.style.overflow = 'auto';
      } else {
        // Restore original styles
        const originalStyles = targetDiv.getAttribute('data-original-styles') || '';
        targetDiv.style.cssText = originalStyles;
        targetDiv.removeAttribute('data-original-styles');
      }
    }
  } 