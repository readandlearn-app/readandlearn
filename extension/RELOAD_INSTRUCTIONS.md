# Extension Reload Instructions

## To Fix the SVG Error:

1. **Go to:** `arc://extensions/` (or `chrome://extensions/`)

2. **Enable Developer Mode** (toggle in top right if not already on)

3. **Find "French Article Translator"**

4. **Click "Remove"** to completely uninstall it

5. **Click "Load Unpacked"**

6. **Select the folder:** `/Users/vibhavbobade/go/src/github.com/waveywaves/readandlearn/extension`

7. **Close ALL tabs** with SVG files open (especially `https://vibhavbobade.xyz/redhat-logo.svg`)

8. **Open a fresh tab** with a regular HTML webpage

9. **Check:** The R/L button should appear on the right side with the new logo

## Why This Happened:
The extension was running on SVG files which don't have a normal HTML DOM (no `document.body.style`). The fix now explicitly blocks SVG, PDF, XML, JSON, and other non-HTML files.

## Verification:
In the console, you should see:
- ✅ On HTML pages: `✅ French Article Translator activated!`
- ✅ On SVG files: `⚠️ Not an HTML page, skipping... (detected: https://.../*.svg)`
