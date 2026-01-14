// Default backend URL
const DEFAULT_BACKEND_URL = 'http://localhost:3001';

// DOM elements
const backendUrlInput = document.getElementById('backendUrl');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');
const currentUrlValue = document.getElementById('currentUrlValue');

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  checkLocalPdfAccess();
});

// Load settings from chrome.storage.sync
function loadSettings() {
  chrome.storage.sync.get(['backendUrl'], (result) => {
    const url = result.backendUrl || DEFAULT_BACKEND_URL;
    backendUrlInput.value = result.backendUrl || '';
    currentUrlValue.textContent = url;
  });
}

// Save settings
saveBtn.addEventListener('click', () => {
  const url = backendUrlInput.value.trim();

  // Validate URL if provided
  if (url && !isValidUrl(url)) {
    showStatus('Please enter a valid URL (e.g., http://localhost:3001)', 'error');
    return;
  }

  // Remove trailing slash if present
  const cleanUrl = url.replace(/\/$/, '');

  chrome.storage.sync.set({ backendUrl: cleanUrl || null }, () => {
    const savedUrl = cleanUrl || DEFAULT_BACKEND_URL;
    currentUrlValue.textContent = savedUrl;
    showStatus('Settings saved successfully!', 'success');

    // Log for debugging
    console.log('Backend URL saved:', savedUrl);
  });
});

// Reset to default
resetBtn.addEventListener('click', () => {
  chrome.storage.sync.remove(['backendUrl'], () => {
    backendUrlInput.value = '';
    currentUrlValue.textContent = DEFAULT_BACKEND_URL;
    showStatus('Reset to default settings', 'success');
  });
});

// URL validation helper
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 3000);
}

// Check local PDF file access status
function checkLocalPdfAccess() {
  const localPdfStatusValue = document.getElementById('localPdfStatusValue');

  if (chrome.extension && chrome.extension.isAllowedFileSchemeAccess) {
    chrome.extension.isAllowedFileSchemeAccess((isAllowed) => {
      // Clear existing content
      localPdfStatusValue.textContent = '';

      // Create status indicator
      const statusSpan = document.createElement('span');

      if (isAllowed) {
        statusSpan.style.color = '#2e7d32';
        statusSpan.textContent = '✓ Enabled';
        localPdfStatusValue.appendChild(statusSpan);
        localPdfStatusValue.appendChild(document.createTextNode(' - You can analyze local PDF files'));
      } else {
        statusSpan.style.color = '#c62828';
        statusSpan.textContent = '✗ Disabled';
        localPdfStatusValue.appendChild(statusSpan);
        localPdfStatusValue.appendChild(document.createTextNode(' - Follow the instructions below to enable'));
      }
    });
  } else {
    // Fallback for environments where the API isn't available
    localPdfStatusValue.textContent = 'Unable to check - verify manually in extension settings';
  }
}
