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
