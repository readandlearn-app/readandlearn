// PDF handling module for Read & Learn extension

// Maximum number of PDF pages to extract text from
export const MAX_PDF_PAGES = 50;

// PDF.js library reference (lazy loaded)
let pdfjsLib = null;

/**
 * Check if the current page is a PDF context
 * @returns {boolean} True if the page is displaying a PDF
 */
export function isPdfContext() {
  // Check if URL ends with .pdf
  const url = window.location.href.toLowerCase();
  if (url.endsWith('.pdf') || url.includes('.pdf?') || url.includes('.pdf#')) {
    return true;
  }

  // Check for PDF embed elements
  const pdfEmbed = document.querySelector('embed[type="application/pdf"]');
  if (pdfEmbed) {
    return true;
  }

  // Check for Chrome's built-in PDF viewer
  // Chrome renders PDFs in a special viewer with specific elements
  const chromeViewer = document.querySelector('embed[name="plugin"]');
  if (chromeViewer && chromeViewer.type === 'application/pdf') {
    return true;
  }

  // Check for PDF.js viewer (used by some sites)
  if (document.getElementById('viewer') && document.querySelector('.page[data-page-number]')) {
    return true;
  }

  return false;
}

/**
 * Load PDF.js library dynamically
 * @returns {Promise<object>} The PDF.js library object
 */
export async function loadPdfJs() {
  if (pdfjsLib) {
    return pdfjsLib;
  }

  try {
    // Import PDF.js dynamically from extension resources
    const pdfJsUrl = chrome.runtime.getURL('lib/pdf.min.mjs');
    const module = await import(pdfJsUrl);
    pdfjsLib = module;

    // Configure the worker path
    const workerUrl = chrome.runtime.getURL('lib/pdf.worker.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

    console.log('📄 PDF.js loaded successfully');
    return pdfjsLib;
  } catch (error) {
    console.error('📄 Failed to load PDF.js:', error);
    throw new Error('Could not load PDF library');
  }
}

/**
 * Extract text content from a PDF document
 * @param {string} url - URL of the PDF to extract text from
 * @returns {Promise<string|null>} Extracted text or null on failure
 */
export async function extractPdfText(url) {
  try {
    console.log('📄 Extracting text from PDF:', url);

    // Load PDF.js if not already loaded
    const pdfjs = await loadPdfJs();

    // Load the PDF document
    const loadingTask = pdfjs.getDocument({
      url: url,
      // Disable range requests for better compatibility
      disableRange: false,
      disableStream: false,
    });

    const pdf = await loadingTask.promise;
    const numPages = Math.min(pdf.numPages, MAX_PDF_PAGES);

    console.log(`📄 PDF has ${pdf.numPages} pages, extracting ${numPages}`);

    // Extract text from each page
    const textParts = [];
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Join text items with spaces, preserving some structure
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (pageText) {
          textParts.push(pageText);
        }
      } catch (pageError) {
        console.warn(`📄 Could not extract text from page ${pageNum}:`, pageError);
      }
    }

    const fullText = textParts.join('\n\n');

    if (!fullText || fullText.trim().length < 50) {
      console.warn('📄 PDF appears to have no extractable text (possibly scanned/image-only)');
      return null;
    }

    console.log(`📄 Extracted ${fullText.length} characters from ${textParts.length} pages`);

    // Add note if we truncated pages
    if (pdf.numPages > MAX_PDF_PAGES) {
      return fullText + `\n\n[Note: Text extracted from first ${MAX_PDF_PAGES} of ${pdf.numPages} pages]`;
    }

    return fullText;

  } catch (error) {
    console.error('📄 PDF extraction error:', error);

    // Provide helpful error messages
    if (error.message && error.message.includes('password')) {
      console.warn('📄 PDF is password protected');
      return null;
    }

    if (error.name === 'MissingPDFException') {
      console.warn('📄 PDF file not found or inaccessible');
      return null;
    }

    // CORS or network errors
    if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
      console.warn('📄 Could not access PDF (CORS or network restriction)');
      return null;
    }

    return null;
  }
}
