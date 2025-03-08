document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Starting initialization');
  
  // Debug log for DOM structure
  console.log('Popup DOM structure:', document.documentElement.innerHTML);
  
  function getButtonWithLogging(id) {
    const element = document.getElementById(id);
    console.log(`Looking for button #${id}:`, {
      found: !!element,
      element: element,
      isVisible: element ? window.getComputedStyle(element).display !== 'none' : false,
      hasClickHandler: element ? element.onclick !== null : false
    });
    return element;
  }

  function addClickHandler(element, handler) {
    if (!element) {
      console.error(`Cannot add click handler - element is null`);
      return false;
    }
    
    try {
      // Remove any existing listeners first
      const freshElement = element.cloneNode(true);
      element.parentNode.replaceChild(freshElement, element);
      
      // Add the new click handler
      freshElement.addEventListener('click', handler);
      console.log(`Successfully added click handler to ${element.id}`);
      return true;
    } catch (error) {
      console.error(`Error adding click handler to ${element.id}:`, error);
      return false;
    }
  }

  const widthInput = getButtonWithLogging('width');
  const resizeBtn = getButtonWithLogging('resizeBtn');
  const resetBtn = getButtonWithLogging('resetBtn');
  const fullscreenBtn = getButtonWithLogging('fullscreenBtn');
  const wordBtn = getButtonWithLogging('wordBtn');
  const codeUiScreenshotBtn = getButtonWithLogging('codeUiScreenshotBtn');
  const mermaidScreenshotBtn = getButtonWithLogging('mermaidScreenshotBtn');
  const progressBar = document.querySelector('.progress-bar');
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Debug log for button elements with more details
  console.log('Button elements found:', {
    widthInput: widthInput ? 'Found' : 'Not found',
    resizeBtn: resizeBtn ? 'Found' : 'Not found',
    resetBtn: resetBtn ? 'Found' : 'Not found',
    fullscreenBtn: fullscreenBtn ? 'Found' : 'Not found',
    wordBtn: wordBtn ? 'Found' : 'Not found',
    codeUiScreenshotBtn: codeUiScreenshotBtn ? 'Found' : 'Not found',
    mermaidScreenshotBtn: mermaidScreenshotBtn ? 'Found' : 'Not found',
    progressBar: progressBar ? 'Found' : 'Not found',
    tabsCount: tabs.length,
    tabContentsCount: tabContents.length
  });

  // Add click handlers with error checking
  if (codeUiScreenshotBtn) {
    console.log('Setting up Code/UI Screenshot button');
    addClickHandler(codeUiScreenshotBtn, function(e) {
      console.log('Code/UI Screenshot button clicked');
      e.preventDefault();
      
      // Show loading state
      document.getElementById('loading-overlay').style.display = 'flex';
      
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs || !tabs[0] || !tabs[0].id) {
          console.error("No active tab found");
          document.getElementById('loading-overlay').style.display = 'none';
          alert("Could not find active tab. Please try again.");
          return;
        }
        
        // First, inject and load html2canvas library
        injectHtml2CanvasToTab(tabs[0].id)
          .then(() => {
            console.log("html2canvas loaded successfully, executing capture script");
            return chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              function: () => {
                console.log('Starting element search for Code/UI artifact');
                
                // Debug function to log element details
                function logElement(element, source) {
                  console.log(`Found element from ${source}:`, {
                    tagName: element?.tagName,
                    id: element?.id,
                    className: element?.className,
                    childNodes: element?.childNodes?.length,
                    innerHTML: element?.innerHTML?.substring(0, 100) + '...',
                    rect: element?.getBoundingClientRect()
                  });
                }

                // Try multiple approaches to find the element
                let element = null;
                
                // Approach 1: Direct ID
                console.log('Approach 1: Trying direct ID');
                element = document.getElementById('artifacts-component-root-react');
                if (element) {
                  logElement(element, 'direct ID');
                  element = element.firstElementChild;
                }

                // Approach 2: CSS Selector
                if (!element) {
                  console.log('Approach 2: Trying CSS selectors');
                  const selectors = [
                    '#artifacts-component-root-react > div',
                    '[data-testid="artifacts-component"]',
                    '.artifact-panel',
                    'pre code',
                    '.code-block'
                  ];
                  
                  for (const selector of selectors) {
                    console.log(`Trying selector: ${selector}`);
                    const found = document.querySelector(selector);
                    if (found) {
                      logElement(found, `CSS selector: ${selector}`);
                      element = found;
                      break;
                    }
                  }
                }

                // Approach 3: Look for code-like content
                if (!element) {
                  console.log('Approach 3: Looking for code-like content');
                  const preElements = document.getElementsByTagName('pre');
                  const codeElements = document.getElementsByTagName('code');
                  console.log(`Found ${preElements.length} pre elements and ${codeElements.length} code elements`);
                  
                  if (preElements.length > 0) {
                    element = preElements[0];
                    logElement(element, 'pre tag');
                  } else if (codeElements.length > 0) {
                    element = codeElements[0];
                    logElement(element, 'code tag');
                  }
                }

                // Approach 4: Search in iframes
                if (!element) {
                  console.log('Approach 4: Checking iframes');
                  const iframes = document.getElementsByTagName('iframe');
                  console.log(`Found ${iframes.length} iframes`);
                  
                  for (const iframe of iframes) {
                    try {
                      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                      const iframeElement = iframeDoc.querySelector('#artifacts-component-root-react > div') ||
                                         iframeDoc.querySelector('pre code');
                      if (iframeElement) {
                        logElement(iframeElement, 'iframe');
                        element = iframeElement;
                        break;
                      }
                    } catch (e) {
                      console.log('Could not access iframe:', e);
                    }
                  }
                }

                // Log the final state
                if (!element) {
                  console.log('DEBUG: Document structure:', {
                    body: document.body.innerHTML.substring(0, 500) + '...',
                    ids: Array.from(document.querySelectorAll('[id]')).map(el => el.id),
                    classes: Array.from(document.querySelectorAll('[class]')).map(el => el.className)
                  });
                  console.error('Could not find element using any approach');
                  throw new Error('Could not find Code/UI artifact - please ensure you are viewing a code or UI artifact');
                }

                console.log('Found Code/UI element:', element);
                
                return new Promise((resolve) => {
                  // Ensure element is visible
                  element.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                  
                  // Use html2canvas to capture the element
                  window.html2canvas(element, {
                    backgroundColor: null,
                    logging: true,
                    scale: window.devicePixelRatio || 1,
                    allowTaint: true,
                    useCORS: true,
                    onclone: function(clonedDoc) {
                      console.log('html2canvas cloned document');
                      const clonedElement = clonedDoc.querySelector('#artifacts-component-root-react > div') ||
                                          clonedDoc.querySelector('pre code');
                      if (clonedElement) {
                        logElement(clonedElement, 'cloned document');
                      }
                    }
                  }).then(canvas => {
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve({ success: true, dataUrl });
                  }).catch(error => {
                    console.error("html2canvas error:", error);
                    resolve({ success: false, error: error.toString() });
                  });
                });
              }
            });
          })
          .then((results) => {
            console.log("Capture script executed:", results);
            processCanvasResult(results, 'code-ui');
          })
          .catch((error) => {
            console.error("Error during capture:", error);
            alert("Error capturing Code/UI: " + error.message);
          })
          .finally(() => {
            document.getElementById('loading-overlay').style.display = 'none';
          });
      });
    });
  }

  // Fix tab functionality
  tabs.forEach(tab => {
    const tabElement = tab.cloneNode(true);
    tab.parentNode.replaceChild(tabElement, tab);
    
    tabElement.addEventListener('click', function() {
      console.log('Tab clicked:', this.getAttribute('data-tab'));
      
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab
      this.classList.add('active');
      
      // Show corresponding content
      const tabId = this.getAttribute('data-tab');
      const content = document.getElementById(tabId);
      if (content) {
        content.classList.add('active');
      } else {
        console.error('Could not find tab content:', tabId);
      }
    });
  });

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

  // Add click handlers with error checking
  if (resizeBtn) {
    addClickHandler(resizeBtn, function() {
      const width = parseInt(widthInput.value);
      updateProgressBar(width, widthInput.max);
      chrome.storage.local.set({ width });

      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        injectCSS(tabs[0].id, width);
      });
    });
  }

  if (resetBtn) {
    addClickHandler(resetBtn, function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.reload(tabs[0].id);
      });
    });
  }

  if (fullscreenBtn) {
    addClickHandler(fullscreenBtn, function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: toggleFullscreen
        });
      });
    });
  }

  if (mermaidScreenshotBtn) {
    addClickHandler(mermaidScreenshotBtn, function() {
      // Show loading state
      document.getElementById('loading-overlay').style.display = 'flex';
      
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs || !tabs[0] || !tabs[0].id) {
          console.error("No active tab found");
          document.getElementById('loading-overlay').style.display = 'none';
          alert("Could not find active tab. Please try again.");
          return;
        }
        
        // First, inject and load html2canvas library
        injectHtml2CanvasToTab(tabs[0].id)
          .then(() => {
            console.log("html2canvas loaded successfully, executing capture script");
            return chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              function: captureMermaidElement
            });
          })
          .then((results) => {
            console.log("Capture script executed:", results);
            processCanvasResult(results, 'mermaid-diagram');
          })
          .catch((error) => {
            console.error("Error during mermaid capture:", error);
            alert("Error capturing mermaid diagram: " + error.message);
          })
          .finally(() => {
            // Always hide the loading overlay
            document.getElementById('loading-overlay').style.display = 'none';
          });
      });
    });
  }

  if (wordBtn) {
    addClickHandler(wordBtn, function() {
      console.log('Word export button clicked');
      
      // Show loading state
      document.getElementById('loading-overlay').style.display = 'flex';
      
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs || !tabs[0] || !tabs[0].id) {
          console.error("No active tab found");
          document.getElementById('loading-overlay').style.display = 'none';
          alert("Could not find active tab. Please try again.");
          return;
        }
        
        // First inject docx library
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["docx.min.js"]
        })
        .then(() => {
          // Then inject docx-generator
          return chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["docx-generator.js"]
          });
        })
        .then(() => {
          // Now execute script to get text content
          return chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: () => {
              console.log('Starting text/markdown content extraction');
              
              // Use specific XPath to find the text content
              const xpath = "/html/body/div[2]/div/div/div[2]/div[2]/div[2]/div/div/div[1]/div[2]";
              const xpathResult = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              );
              
              const element = xpathResult.singleNodeValue;
              
              if (!element) {
                console.error('Could not find element using XPath');
                throw new Error('Could not find text/markdown content - please ensure you are viewing a text or markdown artifact');
              }
              
              console.log('Found element using XPath');
              
              // Get the text content
              const content = element.innerText || element.textContent;
              
              // Clean up the content
              const cleanContent = content.trim();
              
              if (!cleanContent) {
                throw new Error('Found element but could not extract text content');
              }
              
              console.log('Successfully extracted text content');
              
              // Generate Word document
              return DocxGenerator.generateDocx(cleanContent)
                .then(blob => {
                  // Convert blob to base64
                  return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                  });
                });
            }
          });
        })
        .then((results) => {
          if (!results || !results[0] || !results[0].result) {
            throw new Error('Failed to generate Word document');
          }
          
          // Convert base64 back to blob
          const base64Data = results[0].result.split(',')[1];
          const binaryData = atob(base64Data);
          const array = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            array[i] = binaryData.charCodeAt(i);
          }
          const blob = new Blob([array], {type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
          
          // Download the file
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `claude-export-${new Date().toISOString().slice(0,19).replace(/[:]/g, '-')}.docx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          console.log('Word document downloaded');
        })
        .catch((error) => {
          console.error('Error during Word export:', error);
          alert('Error exporting to Word: ' + error.message);
        })
        .finally(() => {
          document.getElementById('loading-overlay').style.display = 'none';
        });
      });
    });
  }

  function updateProgressBar(currentWidth, maxWidth) {
    const percentage = (currentWidth / maxWidth) * 100;
    progressBar.style.width = `${percentage}%`;
  }

  // Helper function to process canvas result and download image
  function processCanvasResult(results, type) {
    if (!results || !results[0] || !results[0].result) {
      console.error("Canvas capture failed:", results);
      alert("Failed to capture the element. Please try again.");
      return;
    }
    
    const result = results[0].result;
    
    if (!result.success) {
      console.error("Capture error:", result.error);
      alert("Error capturing image: " + result.error);
      return;
    }
    
    console.log("Successfully captured element as canvas");
    
    // Convert dataURL to blob and download
    const dataUrl = result.dataUrl;
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], {type: mimeType});
    
    // Download the image
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `claude-${type}-${new Date().toISOString().slice(0,19).replace(/[:]/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log("Download initiated");
    
    // Try to copy to clipboard
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
  }

  // Function to inject and ensure html2canvas is loaded properly
  function injectHtml2CanvasToTab(tabId) {
    return new Promise((resolve, reject) => {
      // First, check if we need to inject the library
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
          // Check if already loaded
          if (window.html2canvas) {
            console.log("html2canvas already loaded");
            return true;
          }
          return false;
        }
      }).then(results => {
        if (results && results[0] && results[0].result === true) {
          // Library already loaded, proceed
          resolve();
          return;
        }
        
        // Library needs to be injected - use the extension's own copy
        console.log("Injecting html2canvas from extension's resources");
        
        // Inject the library from the extension's own directory
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["html2canvas.min.js"]
        }).then(() => {
          // Verify the library is now available
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: () => {
              if (typeof window.html2canvas === 'function') {
                console.log("html2canvas successfully loaded from extension");
                return true;
              } else {
                console.error("html2canvas failed to load properly");
                return false;
              }
            }
          }).then(verifyResults => {
            if (verifyResults && verifyResults[0] && verifyResults[0].result === true) {
              resolve();
            } else {
              reject(new Error("Failed to load html2canvas from extension resources"));
            }
          }).catch(error => {
            reject(error);
          });
        }).catch(error => {
          console.error("Failed to inject html2canvas:", error);
          reject(error);
        });
      }).catch(error => {
        reject(error);
      });
    });
  }

  // Function to capture Mermaid element
  function captureMermaidElement() {
    console.log("Starting Code/UI artifact capture");
    
    // Try to find the artifact panel using multiple strategies
    let targetElement = null;
    
    // Strategy 1: Try the main artifact panel container
    const artifactPanel = document.querySelector('.artifact-panel');
    if (artifactPanel) {
      console.log("Found artifact panel via .artifact-panel class");
      targetElement = artifactPanel;
    }
    
    // Strategy 2: Try the specific artifact component
    if (!targetElement) {
      const artifactRoot = document.getElementById('artifacts-component-root-react');
      if (artifactRoot) {
        console.log("Found artifact root element");
        const firstChild = artifactRoot.firstElementChild;
        if (firstChild) {
          console.log("Found artifact root's first child");
          targetElement = firstChild;
        }
      }
    }
    
    // Strategy 3: Try the broader artifact area
    if (!targetElement) {
      const artifactArea = document.querySelector('[data-testid="artifact-panel"]') || 
                          document.querySelector('[data-testid="artifacts-component"]');
      if (artifactArea) {
        console.log("Found artifact area via data-testid");
        targetElement = artifactArea;
      }
    }
    
    // Strategy 4: Try to find any code blocks
    if (!targetElement) {
      const codeBlock = document.querySelector('pre code') || 
                       document.querySelector('.code-block') ||
                       document.querySelector('pre');
      if (codeBlock) {
        console.log("Found code block element");
        targetElement = codeBlock.closest('pre') || codeBlock;
      }
    }
    
    // Log the DOM structure if we still can't find the element
    if (!targetElement) {
      console.log("Could not find target element. DOM structure:", {
        body: document.body.innerHTML.substring(0, 1000),
        possibleTargets: {
          artifactPanels: document.querySelectorAll('.artifact-panel').length,
          artifactRoots: document.querySelectorAll('#artifacts-component-root-react').length,
          codeBlocks: document.querySelectorAll('pre code').length,
          preElements: document.querySelectorAll('pre').length
        }
      });
      
      // Try one last fallback - get the largest pre/code element
      const allCodeElements = [...document.querySelectorAll('pre'), ...document.querySelectorAll('code')];
      if (allCodeElements.length > 0) {
        targetElement = allCodeElements.reduce((largest, current) => {
          const currentRect = current.getBoundingClientRect();
          const largestRect = largest.getBoundingClientRect();
          return (currentRect.width * currentRect.height) > (largestRect.width * largestRect.height) 
            ? current 
            : largest;
        });
        console.log("Using largest code element as fallback");
      }
    }
    
    if (!targetElement) {
      console.error("Could not find any suitable element to capture");
      return Promise.resolve({ 
        success: false, 
        error: "Could not find Code/UI content to capture. Please ensure you are viewing a code or UI artifact." 
      });
    }
    
    console.log("Found element to capture:", {
      tagName: targetElement.tagName,
      id: targetElement.id,
      className: targetElement.className,
      size: {
        width: targetElement.offsetWidth,
        height: targetElement.offsetHeight
      }
    });
    
    // Ensure the element is in view
    targetElement.scrollIntoView({ behavior: 'auto', block: 'center' });
    
    // Add a small delay to ensure the element is fully rendered
    return new Promise((resolve) => {
      setTimeout(() => {
        // Temporarily modify styles to ensure all content is visible
        const originalStyles = {
          overflow: targetElement.style.overflow,
          maxHeight: targetElement.style.maxHeight,
          height: targetElement.style.height
        };
        
        targetElement.style.overflow = 'visible';
        targetElement.style.maxHeight = 'none';
        targetElement.style.height = 'auto';
        
        // Use html2canvas with optimized settings
        window.html2canvas(targetElement, {
          backgroundColor: null,
          logging: true,
          scale: window.devicePixelRatio || 1,
          allowTaint: true,
          useCORS: true,
          scrollY: -window.scrollY,
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.querySelector('#' + targetElement.id) || 
                                clonedDoc.querySelector('.' + targetElement.className.split(' ')[0]);
            if (clonedElement) {
              console.log("Successfully cloned element");
              // Ensure the cloned element has the same styles
              clonedElement.style.overflow = 'visible';
              clonedElement.style.maxHeight = 'none';
              clonedElement.style.height = 'auto';
            } else {
              console.warn("Could not find cloned element");
            }
          }
        }).then(canvas => {
          // Restore original styles
          targetElement.style.overflow = originalStyles.overflow;
          targetElement.style.maxHeight = originalStyles.maxHeight;
          targetElement.style.height = originalStyles.height;
          
          const dataUrl = canvas.toDataURL('image/png');
          resolve({ success: true, dataUrl });
        }).catch(error => {
          // Restore original styles
          targetElement.style.overflow = originalStyles.overflow;
          targetElement.style.maxHeight = originalStyles.maxHeight;
          targetElement.style.height = originalStyles.height;
          
          console.error("html2canvas error:", error);
          resolve({ success: false, error: error.toString() });
        });
      }, 100); // Small delay to ensure rendering
    });
  }
});

function injectCSS(tabId, width) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    function: (width) => {
      // Updated selector for the new Claude.ai DOM structure
      const containerDiv = document.querySelector("body > div.flex.min-h-screen.w-full > div > div > div.relative.flex.w-full.flex-1.overflow-x-hidden.overflow-y-scroll.pt-6.md\\:pr-8 > div:nth-child(2) > div.fixed.bottom-0.top-0.flex.w-full.flex-col.transition-\\[width\\].z-\\[5\\].right-0.md\\:w-\\[calc\\(50vw-2\\.5rem\\)\\].pointer-events-auto.pt-16.md\\:pb-4.md\\:pr-1.bottom-24.md\\:bottom-20.lg\\:bottom-0");
      
      // Fallback to XPath if querySelector fails
      if (!containerDiv) {
        const containerDivXPath = document.evaluate(
          '/html/body/div[2]/div/div/div[2]/div[2]/div[2]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        
        if (containerDivXPath) {
          containerDivXPath.style.width = `${width}px`;
          containerDivXPath.style.maxWidth = `${width}px`;
        }
      } else {
        containerDiv.style.width = `${width}px`;
        containerDiv.style.maxWidth = `${width}px`;
      }
    },
    args: [width]
  });
}

function toggleFullscreen() {
  // Updated selector for the new Claude.ai DOM structure
  const targetDiv = document.querySelector("body > div.flex.min-h-screen.w-full > div > div > div.relative.flex.w-full.flex-1.overflow-x-hidden.overflow-y-scroll.pt-6.md\\:pr-8 > div:nth-child(2) > div.fixed.bottom-0.top-0.flex.w-full.flex-col.transition-\\[width\\].z-\\[5\\].right-0.md\\:w-\\[calc\\(50vw-2\\.5rem\\)\\].pointer-events-auto.pt-16.md\\:pb-4.md\\:pr-1.bottom-24.md\\:bottom-20.lg\\:bottom-0");
  
  // Fallback to XPath if querySelector fails
  if (!targetDiv) {
    const result = document.evaluate(
      '/html/body/div[2]/div/div/div[2]/div[2]/div[2]',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const targetDivXPath = result.singleNodeValue;
    
    if (!targetDivXPath) {
      console.error('Could not find target element for fullscreen');
      return;
    }
    
    handleFullscreen(targetDivXPath);
  } else {
    handleFullscreen(targetDiv);
  }
  
  function handleFullscreen(element) {
    if (!element.style.position || element.style.position !== 'fixed') {
      // Store original styles before going fullscreen
      element.setAttribute('data-original-styles', element.style.cssText);
      
      // Get browser window dimensions
      const maxWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
      const maxHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);

      // Go fullscreen with browser width limit
      element.style.position = 'fixed';
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = `${maxWidth}px`;
      element.style.height = `${maxHeight}px`;
      element.style.zIndex = '9999';
      element.style.backgroundColor = 'white';
      element.style.overflow = 'auto';
    } else {
      // Restore original styles
      const originalStyles = element.getAttribute('data-original-styles') || '';
      element.style.cssText = originalStyles;
      element.removeAttribute('data-original-styles');
    }
  }
} 