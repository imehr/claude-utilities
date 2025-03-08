// background.js - Claude Utilities
console.log('Background script loaded');

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.action === 'capture') {
    console.log('Capture requested for tab:', sender.tab.id);
    captureTab(sender.tab.id, message.cropDetails)
      .then(result => {
        console.log('Capture completed:', result.success);
        sendResponse(result);
      })
      .catch(error => {
        console.error('Error in capture:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for the async response
  }
  
  if (message.action === 'cropImageToElement') {
    console.log('Crop image requested:', message.details);
    const imageDataUrl = message.dataUrl;
    const position = message.details;
    
    try {
      chrome.windows.getCurrent({}, async (window) => {
        const { cropImageToElement } = await chrome.runtime.getBackgroundPage();
        cropImageToElement(imageDataUrl, position)
          .then(result => {
            console.log('Image cropped, result length:', result.dataUrl?.length || 0);
            sendResponse(result);
          })
          .catch(error => {
            console.error('Error cropping image:', error);
            sendResponse({ success: false, error: error.message });
          });
      });
    } catch (error) {
      console.error('Error accessing background page:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (message.action === 'findMermaidDiagrams') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }
      
      const tab = tabs[0];
      captureMermaidDiagram(tab.id)
        .then(result => sendResponse(result))
        .catch(error => {
          console.error('Error capturing Mermaid diagram:', error);
          sendResponse({ success: false, error: error.message });
        });
    });
    return true;
  }
});

// Capture a tab with optional cropping
async function captureTab(tabId, cropDetails) {
  console.log('Capturing tab', tabId, 'with crop details:', cropDetails);
  
  try {
    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    console.log('Tab captured, dataUrl length:', dataUrl.length);
    
    // If crop details provided, crop the image
    if (cropDetails) {
      console.log('Cropping image with details:', cropDetails);
      return await cropImage(dataUrl, cropDetails);
    }
    
    return { success: true, dataUrl };
  } catch (error) {
    console.error('Error capturing tab:', error);
    return { success: false, error: error.message };
  }
}

// Capture Mermaid diagram
async function captureMermaidDiagram(tabId) {
  console.log('Capturing Mermaid diagram from tab:', tabId);
  
  try {
    // First try to find Mermaid diagrams in the tab
    const injectionResult = await chrome.scripting.executeScript({
      target: { tabId },
      function: findMermaidDiagrams
    });
    
    if (!injectionResult || !injectionResult[0] || !injectionResult[0].result) {
      console.error('Failed to find Mermaid diagrams');
      return { success: false, error: 'Failed to find Mermaid diagrams' };
    }
    
    const diagrams = injectionResult[0].result;
    console.log(`Found ${diagrams.length} Mermaid diagrams`);
    
    if (diagrams.length === 0) {
      return { success: false, error: 'No Mermaid diagrams found' };
    }
    
    // Sort diagrams by score (highest first)
    diagrams.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Capture the best diagram
    const bestDiagram = diagrams[0];
    console.log('Capturing best diagram:', bestDiagram);
    
    // Capture the tab
    const captureResult = await captureTab(tabId, bestDiagram.position);
    return captureResult;
  } catch (error) {
    console.error('Error capturing Mermaid diagram:', error);
    return { success: false, error: error.message };
  }
}

// Function to find Mermaid diagrams in the page
function findMermaidDiagrams() {
  console.log('Finding Mermaid diagrams in the page');
  const diagrams = [];
  
  try {
    // Find SVG mermaid diagrams
    const svgMermaidElements = document.querySelectorAll('svg.mermaid');
    for (const element of svgMermaidElements) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        diagrams.push({
          position: {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height
          },
          method: 'svg-mermaid-class',
          score: 0.9
        });
      }
    }
    
    // Find div mermaid elements (often containing SVGs)
    const divMermaidElements = document.querySelectorAll('div.mermaid');
    for (const element of divMermaidElements) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        diagrams.push({
          position: {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height
          },
          method: 'div-mermaid-class',
          score: 0.8
        });
      }
    }
    
    // Find SVGs with mermaid characteristics (nodes, clusters, etc.)
    const svgElements = document.querySelectorAll('svg');
    for (const svg of svgElements) {
      // Skip if already found as mermaid-class
      if (svg.classList.contains('mermaid')) continue;
      
      // Check for mermaid characteristics
      const hasMermaidElements = 
        svg.querySelector('.node') || 
        svg.querySelector('.cluster') || 
        svg.querySelector('.edgePath') ||
        svg.querySelector('.flowchart-link') ||
        svg.querySelector('.relationshipLabelContainer');
        
      if (hasMermaidElements) {
        const rect = svg.getBoundingClientRect();
        if (rect.width > 10 && rect.height > 10) {
          diagrams.push({
            position: {
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY,
              width: rect.width,
              height: rect.height
            },
            method: 'svg-mermaid-characteristics',
            score: 0.7
          });
        }
      }
    }
    
    // Look for Claude-specific selectors
    const claudeContainers = document.querySelectorAll('.claude-msg-container, .message-content');
    for (const container of claudeContainers) {
      const svgs = container.querySelectorAll('svg');
      for (const svg of svgs) {
        // Skip if already processed
        if (diagrams.some(d => d.position.x === svg.getBoundingClientRect().left + window.scrollX)) {
          continue;
        }
        
        const rect = svg.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50) {
          diagrams.push({
            position: {
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY,
              width: rect.width,
              height: rect.height
            },
            method: 'claude-specific-selector',
            score: 0.85
          });
        }
      }
    }
    
    console.log(`Found ${diagrams.length} diagrams`);
    return diagrams;
  } catch (error) {
    console.error('Error finding Mermaid diagrams:', error);
    return [];
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureFullPage') {
    captureFullPage(sender.tab.id);
  }
  else if (request.action === 'captureAndCropDiagram') {
    // Handle the message for capturing and cropping a diagram
    console.log('Received captureAndCropDiagram request:', request);
    captureAndCropDiagram(sender.tab.id, request.diagram);
  }
  else if (request.action === 'diagramSelected') {
    // Handle diagram selection from the content script
    console.log('Received diagram selection from content script:', request.diagram);
    
    // Forward the message to the popup
    chrome.runtime.sendMessage({
      action: 'diagramSelected',
      diagram: request.diagram,
      tabId: sender.tab.id
    });
  }
  else if (request.action === 'selectorCancelled') {
    // Handle selector cancellation
    console.log('Diagram selection cancelled');
    
    // Forward to popup
    chrome.runtime.sendMessage({
      action: 'selectorCancelled'
    });
  }
  else if (request.action === 'captureResult') {
    const { result } = request;
    if (result.success) {
      // Create a download for the image
      const timestamp = new Date().toISOString().replace(/[:]/g, '-');
      chrome.downloads.download({
        url: result.dataUrl,
        filename: `claude-capture-${timestamp}.png`,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError);
        } else {
          console.log('Download started:', downloadId);
        }
      });
    } else {
      console.error('Capture failed:', result.error);
    }
  }
});

// Function to capture and crop a diagram
async function captureAndCropDiagram(tabId, diagram) {
  try {
    console.log('Capturing diagram:', diagram);
    
    // First scroll to the element
    await chrome.scripting.executeScript({
      target: { tabId },
      function: (diagramData) => {
        // Extract position from diagram object
        const position = diagramData.position || diagramData;
        
        // Standardize position format
        const standardPosition = {
          x: position.x || position.left || 0,
          y: position.y || position.top || 0,
          width: position.width || 100,
          height: position.height || 100
        };
        
        // Scroll to the element with some padding
        window.scrollTo({
          top: standardPosition.y - 100,
          left: standardPosition.x - 50,
          behavior: 'smooth'
        });
        
        // Return success
        return { success: true };
      },
      args: [diagram]
    });
    
    // Wait for scrolling to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(tabId, { format: 'png' });
    
    // Crop the image to the element
    const croppedImage = await chrome.scripting.executeScript({
      target: { tabId },
      function: (dataUrl, diagramData) => {
        return window.cropImageToElement(dataUrl, diagramData);
      },
      args: [dataUrl, diagram]
    });
    
    // Get the result from the first result in the array
    const result = croppedImage[0]?.result;
    
    if (result && result.success) {
      // Download the cropped image
      const timestamp = new Date().toISOString().replace(/[:]/g, '-');
      await chrome.downloads.download({
        url: result.dataUrl,
        filename: `mermaid-diagram-${timestamp}.png`,
        saveAs: true
      });
      
      return { success: true };
    } else {
      console.error('Failed to crop image:', result?.error || 'Unknown error');
      return { success: false, error: result?.error || 'Failed to crop image' };
    }
  } catch (error) {
    console.error('Error capturing diagram:', error);
    return { success: false, error: error.message };
  }
}

async function captureFullPage(tabId) {
  try {
    // First prepare the content
    await chrome.scripting.executeScript({
      target: { tabId },
      function: () => {
        const contentDiv = document.evaluate(
          '/html/body/div[3]/div/div/div[2]/div[2]/div[2]/div/div/div/div[2]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (!contentDiv) return null;

        // Store original styles
        const originalStyles = {
          height: contentDiv.style.height,
          maxHeight: contentDiv.style.maxHeight,
          overflow: contentDiv.style.overflow
        };

        // Modify styles to show full content
        contentDiv.style.height = 'auto';
        contentDiv.style.maxHeight = 'none';
        contentDiv.style.overflow = 'visible';

        // Get dimensions
        const rect = contentDiv.getBoundingClientRect();

        // Scroll into view
        contentDiv.scrollIntoView({ behavior: 'instant', block: 'start' });

        return { rect, originalStyles };
      }
    });

    // Take the screenshot
    const dataUrl = await chrome.tabs.captureVisibleTab(tabId, {
      format: 'png'
    });

    // Restore original styles
    await chrome.scripting.executeScript({
      target: { tabId },
      function: () => {
        const contentDiv = document.evaluate(
          '/html/body/div[3]/div/div/div[2]/div[2]/div[2]/div/div/div/div[2]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (contentDiv) {
          contentDiv.style.height = '';
          contentDiv.style.maxHeight = '';
          contentDiv.style.overflow = '';
        }
      }
    });

    // Download the screenshot
    if (dataUrl) {
      const timestamp = new Date().toISOString().slice(0,19).replace(/[:]/g, '-');
      await chrome.downloads.download({
        url: dataUrl,
        filename: `claude-artifact-${timestamp}.png`
      });
    }

  } catch (error) {
    console.error('Error capturing screenshot:', error);
  }
}

// Function to crop an image based on position information
async function cropImage(dataUrl, position) {
  console.log('Cropping image with position:', position);
  
  try {
    // Create an image object from the data URL
    const img = await createImageFromDataUrl(dataUrl);
    console.log(`Image loaded: ${img.width}x${img.height}`);
    
    // Handle different position formats
    const standardPosition = {
      x: position.x !== undefined ? position.x : (position.left || 0),
      y: position.y !== undefined ? position.y : (position.top || 0),
      width: position.width || 0,
      height: position.height || 0
    };
    
    // Calculate device pixel ratio for retina displays
    const devicePixelRatio = window.devicePixelRatio || 1;
    console.log('Device pixel ratio:', devicePixelRatio);
    
    // Calculate the scaled position
    const scaledPosition = {
      x: standardPosition.x * devicePixelRatio,
      y: standardPosition.y * devicePixelRatio,
      width: standardPosition.width * devicePixelRatio,
      height: standardPosition.height * devicePixelRatio
    };
    
    // Add padding around the element (20px on each side)
    const padding = 20 * devicePixelRatio;
    
    // Calculate the crop dimensions with padding
    const cropX = Math.max(0, scaledPosition.x - padding);
    const cropY = Math.max(0, scaledPosition.y - padding);
    const cropWidth = Math.min(img.width - cropX, scaledPosition.width + (padding * 2));
    const cropHeight = Math.min(img.height - cropY, scaledPosition.height + (padding * 2));
    
    // Validate crop dimensions
    if (cropWidth <= 0 || cropHeight <= 0 || cropX < 0 || cropY < 0 ||
        cropX >= img.width || cropY >= img.height) {
      console.error('Invalid crop dimensions, using full image instead');
      return { success: true, dataUrl };
    }
    
    // Create a canvas for the cropped image
    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    // Get context and enable image smoothing
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }
    
    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw the cropped image on the canvas
    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    
    // Convert to data URL
    const croppedDataUrl = canvas.toDataURL('image/png', 1.0);
    
    return { success: true, dataUrl: croppedDataUrl };
  } catch (error) {
    console.error('Error cropping image:', error);
    return { success: false, error: error.message, dataUrl };
  }
}

// Helper function to create an image from a data URL
function createImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image for cropping'));
    
    // Set crossOrigin to anonymous to prevent tainted canvas issues
    img.crossOrigin = 'anonymous';
    
    // Add timestamp to URL to prevent caching issues
    const timestamp = new Date().getTime();
    img.src = dataUrl.includes('?') ? `${dataUrl}&_t=${timestamp}` : `${dataUrl}?_t=${timestamp}`;
  });
} 