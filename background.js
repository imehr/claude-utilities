chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureFullPage') {
    captureFullPage(sender.tab.id);
  }
});

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