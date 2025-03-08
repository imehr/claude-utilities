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
  console.log('Content script received message:', request);
  
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
  
  if (request.action === 'findMermaidDiagrams') {
    console.log('Finding Mermaid diagrams...');
    const results = findMermaidDiagrams();
    console.log('Mermaid diagram results:', results);
    sendResponse(results);
    return true;
  }
  
  if (request.action === 'scrollToElement') {
    console.log('Scrolling to element at position:', request.position);
    try {
      // Calculate the center of the element
      const centerX = request.position.left + (request.position.width / 2);
      const centerY = request.position.top + (request.position.height / 2);
      
      // Scroll to position with the element in the center of the viewport if possible
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate the ideal scroll position to center the element
      const scrollX = Math.max(0, centerX - (viewportWidth / 2));
      const scrollY = Math.max(0, centerY - (viewportHeight / 2));
      
      // Perform the scroll
      window.scrollTo({
        left: scrollX,
        top: scrollY,
        behavior: 'smooth'
      });
      
      // Log the result
      console.log('Scrolled to position:', { 
        scrollX, 
        scrollY, 
        elementCenter: { x: centerX, y: centerY },
        viewportSize: { width: viewportWidth, height: viewportHeight }
      });
      
      // Wait a moment for the scroll to complete before responding
      setTimeout(() => {
        sendResponse({ success: true, scrollPosition: { x: window.scrollX, y: window.scrollY } });
      }, 300);
    } catch (error) {
      console.error('Error scrolling to element:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  return false;
});

// Function to find Mermaid diagrams using various approaches
function findMermaidDiagrams() {
  console.log('Starting to find Mermaid diagrams...');
  
  try {
    const results = {
      success: false,
      diagrams: []
    };
    
    // Add detailed logging to help debug
    console.log('Document body:', document.body);
    console.log('Document first child:', document.body.firstChild);
    console.log('Window dimensions:', {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      devicePixelRatio: window.devicePixelRatio || 1
    });
    
    // Approach 1: Check direct DOM path
    console.log('Approach 1: Checking direct DOM path...');
    const directPathElement = document.body.firstChild;
    if (directPathElement && isVisible(directPathElement)) {
      console.log('Found direct path element:', directPathElement);
      
      // Check if this element or its descendants contain SVG or Mermaid related content
      if (
        directPathElement.querySelector('svg') || 
        directPathElement.innerHTML.includes('mermaid') ||
        directPathElement.classList.contains('mermaid')
      ) {
        console.log('Direct path element contains mermaid content');
        const position = getElementPosition(directPathElement);
        if (position.width > 10 && position.height > 10) {
          results.diagrams.push({
            position: position,
            caption: '',
            method: 'direct-path'
          });
        }
      }
    }
    
    // Approach 2: Try various CSS selectors
    console.log('Approach 2: Trying CSS selectors...');
    const selectors = [
      '.mermaid',
      '[class*="mermaid"]',
      '.mermaid-viewer',
      '.mermaid-container',
      '.diagram-container',
      '.markdown-section [class*="mermaid"]',
      '.markdown-body [class*="mermaid"]',
      '.notion-page-content [class*="mermaid"]',
      '.notion-page-content-inner [class*="mermaid"]',
      '.mermaid-diagram',
      'pre.mermaid',
      'div[data-mermaid]',
      'svg.mermaid'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Selector "${selector}" found ${elements.length} elements`);
        
        for (const element of elements) {
          if (isVisible(element)) {
            console.log(`Found visible element with selector "${selector}":`, element);
            const position = getElementPosition(element);
            
            if (position.width > 10 && position.height > 10) {
              console.log(`Element has valid dimensions: ${position.width}x${position.height}`);
              results.diagrams.push({
                position: position,
                caption: element.getAttribute('data-caption') || '',
                method: `selector-${selector}`
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error with selector "${selector}":`, error);
      }
    }
    
    // Approach 3: Try XPath evaluation
    console.log('Approach 3: Trying XPath evaluation...');
    const xpathExpressions = [
      "//div[contains(@class, 'mermaid')]",
      "//svg[contains(@class, 'mermaid')]",
      "//pre[contains(@class, 'mermaid')]",
      "//div[contains(@id, 'mermaid')]",
      "//div[contains(@class, 'diagram')]//svg"
    ];
    
    for (const xpath of xpathExpressions) {
      try {
        const elements = document.evaluate(
          xpath, 
          document, 
          null, 
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
          null
        );
        
        console.log(`XPath "${xpath}" found ${elements.snapshotLength} elements`);
        
        for (let i = 0; i < elements.snapshotLength; i++) {
          const element = elements.snapshotItem(i);
          if (isVisible(element)) {
            console.log(`Found visible element with XPath "${xpath}":`, element);
            const position = getElementPosition(element);
            
            if (position.width > 10 && position.height > 10) {
              console.log(`Element has valid dimensions: ${position.width}x${position.height}`);
              results.diagrams.push({
                position: position,
                caption: element.getAttribute('data-caption') || '',
                method: `xpath-${xpath}`
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error with XPath "${xpath}":`, error);
      }
    }
    
    // Approach 4: Find any SVG elements that might be Mermaid diagrams
    console.log('Approach 4: Finding SVG elements...');
    const svgElements = document.querySelectorAll('svg');
    console.log(`Found ${svgElements.length} SVG elements`);
    
    for (const svg of svgElements) {
      if (isVisible(svg)) {
        // Look for evidence this is a Mermaid diagram
        const isMermaid = 
          svg.classList.contains('mermaid') || 
          svg.parentElement.classList.contains('mermaid') ||
          svg.querySelector('g.graph') !== null ||
          (svg.querySelector('desc') && svg.querySelector('desc').textContent.includes('mermaid')) ||
          svg.innerHTML.includes('mermaid') ||
          svg.parentElement.innerHTML.includes('mermaid');
        
        if (isMermaid) {
          console.log('Found visible SVG that seems to be a Mermaid diagram:', svg);
          
          // Get the relevant container - might be the SVG or a parent element
          let targetElement = svg;
          
          // If SVG has a class 'mermaid', use it directly
          if (svg.classList.contains('mermaid')) {
            targetElement = svg;
          } 
          // Otherwise, look for the best container (usually a parent)
          else {
            // Check if a parent is a better container (up to 3 levels up)
            let parent = svg.parentElement;
            let bestParent = null;
            let maxArea = svg.getBoundingClientRect().width * svg.getBoundingClientRect().height;
            
            for (let i = 0; i < 3 && parent; i++) {
              if (isVisible(parent)) {
                const rect = parent.getBoundingClientRect();
                const area = rect.width * rect.height;
                
                // Use this parent if it's not too much larger and seems reasonable
                if (area > maxArea && area < maxArea * 4 && rect.width > 100 && rect.height > 100) {
                  bestParent = parent;
                  maxArea = area;
                }
              }
              parent = parent.parentElement;
            }
            
            if (bestParent) {
              targetElement = bestParent;
              console.log('Using parent element as better container:', bestParent);
            }
          }
          
          // Get the final position
          const position = getElementPosition(targetElement);
          
          // Expand the capturing area to get full context
          const expandedPosition = {
            left: Math.max(0, position.left - 20),
            top: Math.max(0, position.top - 20),
            width: position.width + 40,
            height: position.height + 40,
            devicePixelRatio: position.devicePixelRatio,
            scrollX: position.scrollX,
            scrollY: position.scrollY
          };
          
          console.log('Using expanded position for better context:', expandedPosition);
          
          if (expandedPosition.width > 10 && expandedPosition.height > 10) {
            console.log(`Element has valid dimensions: ${expandedPosition.width}x${expandedPosition.height}`);
            
            results.diagrams.push({
              position: expandedPosition,
              caption: targetElement.getAttribute('data-caption') || '',
              method: 'svg-mermaid'
            });
          }
        }
      }
    }
    
    // Approach 5: Find divs containing SVG elements
    console.log('Approach 5: Finding divs containing SVGs...');
    const divsWithSVG = document.querySelectorAll('div:has(svg)');
    console.log(`Found ${divsWithSVG.length} divs containing SVG elements`);
    
    for (const div of divsWithSVG) {
      if (isVisible(div)) {
        console.log('Found visible div containing SVG:', div);
        const position = getElementPosition(div);
        
        if (position.width > 50 && position.height > 50) {
          console.log(`Div has valid dimensions: ${position.width}x${position.height}`);
          results.diagrams.push({
            position: position,
            caption: div.getAttribute('data-caption') || '',
            method: 'div-with-svg'
          });
        }
      }
    }
    
    // Approach 6: Last resort - find the largest visible div on the page
    if (results.diagrams.length === 0) {
      console.log('Approach 6: Last resort - finding largest visible div...');
        let largestDiv = null;
        let largestArea = 0;
        
        const allDivs = document.querySelectorAll('div');
      console.log(`Checking ${allDivs.length} divs for the largest visible one`);
      
        for (const div of allDivs) {
        if (isVisible(div)) {
          const position = getElementPosition(div);
          const area = position.width * position.height;
          
          if (area > largestArea && position.width > 100 && position.height > 100) {
            largestArea = area;
                largestDiv = div;
          }
        }
      }
      
      if (largestDiv) {
        console.log('Found largest visible div:', largestDiv);
        const position = getElementPosition(largestDiv);
        console.log(`Largest div dimensions: ${position.width}x${position.height}`);
        
        results.diagrams.push({
          position: position,
          caption: largestDiv.getAttribute('data-caption') || '',
          method: 'largest-div'
        });
      }
    }
    
    // Before returning the results, add more detailed info for each diagram found
    if (results.diagrams.length > 0) {
      console.log(`Found ${results.diagrams.length} Mermaid diagrams`);
      results.diagrams.forEach((diagram, index) => {
        console.log(`Diagram ${index + 1} found via method: ${diagram.method}`);
        console.log(`Position data:`, JSON.stringify(diagram.position));
        // Take screenshots of the area for debugging
        try {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = diagram.position.width;
            canvas.height = diagram.position.height;
            context.fillStyle = 'rgba(255, 0, 0, 0.2)'; // Highlight the area
            context.fillRect(0, 0, canvas.width, canvas.height);
            console.log(`Debug visualization for diagram ${index + 1} created`);
          }
        } catch (e) {
          console.error('Error creating debug visualization:', e);
        }
      });
      results.success = true;
    } else {
      console.log('No Mermaid diagrams found');
    }
    
    return results;
  } catch (error) {
    console.error('Error finding Mermaid diagrams:', error);
    return {
      success: false,
      error: error.toString(),
      diagrams: []
    };
  }
}

// Helper function to check if an element is visible
function isVisible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  
  if (rect.width === 0 || rect.height === 0) return false;
  
  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.visibility === 'hidden' || computedStyle.display === 'none' || computedStyle.opacity === '0') {
    return false;
  }
  
  return true;
}

// Helper function to get element position with scroll offset
function getElementPosition(element) {
  if (!element) return null;
  
  const rect = element.getBoundingClientRect();
  console.log('Element rect:', JSON.stringify(rect));
  
  // Additional diagnostic info
  const computedStyle = window.getComputedStyle(element);
  console.log('Element computed style:', {
    position: computedStyle.position,
    display: computedStyle.display,
    visibility: computedStyle.visibility,
    zIndex: computedStyle.zIndex,
    overflow: computedStyle.overflow
  });
  
  // Get the full element info for debugging
  const elementInfo = {
    tagName: element.tagName,
    id: element.id,
    className: element.className,
    innerHTML: element.innerHTML.substring(0, 200) + '...' // First 200 chars
  };
  console.log('Element details:', elementInfo);
  
  // Capture child SVG details if present
  const svgChild = element.querySelector('svg');
  if (svgChild) {
    console.log('SVG child found:', {
      width: svgChild.getAttribute('width'),
      height: svgChild.getAttribute('height'),
      viewBox: svgChild.getAttribute('viewBox')
    });
  }
  
  // Return the position data
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
    devicePixelRatio: window.devicePixelRatio || 1,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };
}

// Simulate interaction to ensure the DOM is active
function simulateInteraction() {
  console.log('Simulating user interaction...');
  
  // Force styles recalculation
  document.body.offsetHeight;
  
  // Create and dispatch a mousedown event
  const clickEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2
  });
  
  document.dispatchEvent(clickEvent);
  console.log('Interaction simulated');
}

// Prepare elements for full viewing
function preparePageForCapture() {
  const elementsWithOverflow = document.querySelectorAll('*');
  let modifiedElements = [];
  
  elementsWithOverflow.forEach(el => {
    try {
      const style = window.getComputedStyle(el);
      if (style.overflow === 'hidden' || 
          style.overflowY === 'hidden' || 
          style.overflowX === 'hidden') {
        
        // Save original styles
        modifiedElements.push({
          element: el,
          originalOverflow: el.style.overflow,
          originalOverflowX: el.style.overflowX,
          originalOverflowY: el.style.overflowY,
          originalHeight: el.style.height,
          originalMaxHeight: el.style.maxHeight
        });
        
        // Modify styles to show all content
        el.style.overflow = 'visible';
        el.style.overflowX = 'visible';
        el.style.overflowY = 'visible';
        
        // If this has a fixed height, make sure we're showing all content
        if (style.height !== 'auto' && style.maxHeight !== 'none') {
          el.style.maxHeight = 'none';
        }
      }
    } catch (e) {
      // Ignore errors for inaccessible elements
    }
  });
  
  console.log(`Modified ${modifiedElements.length} elements with overflow restrictions`);
  return modifiedElements;
}

// Restore original styles
function restoreStyles(modifiedElements) {
  modifiedElements.forEach(item => {
    try {
      item.element.style.overflow = item.originalOverflow;
      item.element.style.overflowX = item.originalOverflowX;
      item.element.style.overflowY = item.originalOverflowY;
      item.element.style.height = item.originalHeight;
      item.element.style.maxHeight = item.originalMaxHeight;
    } catch (e) {
      // Ignore errors for inaccessible elements
    }
  });
} 