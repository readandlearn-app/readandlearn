const BACKEND_URL = 'http://localhost:3000';

// Handle API requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'API_REQUEST') {
    console.log('Background: Handling API request to', request.url);

    // Make the fetch request from the background script (bypasses Private Network Access)
    fetch(request.url, request.options)
      .then(async response => {
        const data = await (request.expectJson ? response.json() : response.text());
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
          error: error.message
        });
      });

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
