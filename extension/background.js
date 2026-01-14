// Default backend URL (for development)
const DEFAULT_BACKEND_URL = 'http://localhost:3001';

// Get backend URL from storage, falling back to default
async function getBackendUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['backendUrl'], (result) => {
      resolve(result.backendUrl || DEFAULT_BACKEND_URL);
    });
  });
}

// Handle API requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'API_REQUEST') {
    // Handle the request asynchronously to get the backend URL
    (async () => {
      const backendUrl = await getBackendUrl();
      const url = request.url.startsWith('http') ? request.url : `${backendUrl}${request.url}`;
      console.log('Background: Handling API request to', url, '(backend:', backendUrl, ')');

      // Make the fetch request from the background script (bypasses Private Network Access)
      fetch(url, request.options)
      .then(async response => {
        console.log('Background: Response received, status:', response.status, 'ok:', response.ok);

        let data;
        try {
          data = await (request.expectJson ? response.json() : response.text());
          console.log('Background: Data parsed successfully');
        } catch (err) {
          console.error('Background: Failed to parse response:', err);
          data = { error: 'Failed to parse response' };
        }

        sendResponse({
          ok: response.ok,
          status: response.status,
          data: data
        });
      })
      .catch(error => {
        console.error('Background: Fetch error:', error);
        sendResponse({
          ok: false,
          status: 500,
          error: error.message
        });
      });
    })();

    // Return true to indicate we'll send response asynchronously
    return true;
  }
});

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked, tab:', tab.id, tab.url);

  // Check if we can inject into this page
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    console.error('Cannot inject into this page:', tab.url);
    return;
  }

  // Inject the content script into the current tab
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  }).then(() => {
    console.log('✅ Content script injected successfully into tab:', tab.id);
  }).catch((error) => {
    console.error('❌ Failed to inject content script:', error);
    console.error('Tab URL:', tab.url);
  });
});
