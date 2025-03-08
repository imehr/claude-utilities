// Function to wait for an element with timeout
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    function check() {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout: Element '${selector}' not found`));
      } else {
        setTimeout(check, 100); // Poll every 100ms
      }
    }
    check();
  });
}

// Main capture function
async function captureElement(type = 'code-ui') {
  console.log(`Starting capture for type: ${type}`);
  
  // Define selectors based on capture type
  const selectors = type === 'code-ui' ? [
    "#artifacts-component-root-react > div",
    "#artifacts-component-root-react",
    ".artifact-panel",
    "[data-testid='artifacts-component']",
    "[data-testid='artifact-panel']",
    "pre code",
    ".code-container"
  ] : [
    ".react-transform-component",
    ".transform-component-module_content__ryUQq",
    "[class*='transform-component']",
    ".mermaid",
    "[class*='mermaid']",
    "svg[id*='mermaid']",
    "[class*='diagram']"
  ];

  // Log document state
  console.log('Document readyState:', document.readyState);
  console.log('Looking for elements with "artifact" in ID:');
  document.querySelectorAll('[id*="artifact"]').forEach(el => {
    console.log('Found element:', {
      id: el.id,
      tagName: el.tagName,
      className: el.className,
      isVisible: el.offsetParent !== null
    });
  });

  // Try each selector
  let targetElement = null;
  for (const selector of selectors) {
    try {
      console.log(`Trying selector: ${selector}`);
      const element = await waitForElement(selector, 2000); // 2 second timeout per selector
      const rect = element.getBoundingClientRect();
      console.log(`Found element with selector ${selector}:`, {
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0
      });
      
      if (rect.width > 0 && rect.height > 0) {
        targetElement = element;
        console.log('Selected element for capture:', selector);
        break;
      }
    } catch (e) {
      console.log(`Selector ${selector} failed:`, e.message);
    }
  }

  if (!targetElement) {
    console.error('No suitable element found');
    return { success: false, error: 'No suitable element found' };
  }

  // Ensure element is visible
  targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });

  // Store original styles
  const originalStyles = {
    overflow: targetElement.style.overflow,
    maxHeight: targetElement.style.maxHeight,
    transform: targetElement.style.transform,
    display: targetElement.style.display
  };

  // Modify styles for capture
  targetElement.style.overflow = 'visible';
  targetElement.style.maxHeight = 'none';
  targetElement.style.transform = 'none';
  targetElement.style.display = 'block';

  try {
    // Wait for any animations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture with html2canvas
    const canvas = await html2canvas(targetElement, {
      backgroundColor: null,
      scale: window.devicePixelRatio || 1,
      useCORS: true,
      allowTaint: true,
      logging: true,
      ignoreElements: (element) => {
        // Ignore elements that might interfere with capture
        return element.classList.contains('loading-overlay') ||
               element.classList.contains('popup');
      }
    });

    // Restore original styles
    Object.assign(targetElement.style, originalStyles);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png');
    return { success: true, dataUrl };
  } catch (error) {
    // Restore original styles
    Object.assign(targetElement.style, originalStyles);
    console.error('Capture error:', error);
    return { success: false, error: error.toString() };
  }
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    console.log('Received capture request:', request);
    captureElement(request.captureType)
      .then(result => {
        console.log('Capture result:', result.success);
        sendResponse(result);
      })
      .catch(error => {
        console.error('Capture error:', error);
        sendResponse({ success: false, error: error.toString() });
      });
    return true; // Indicates async response
  }
}); 