# Phase 3 Discovery: PDF Reading

**Discovery Level:** 2 (Standard Research)
**Date:** 2026-01-15

## Research Question

How should the extension handle PDF text extraction for CEFR analysis?

## Options Evaluated

### Option 1: Bundle PDF.js in Extension (Recommended)

**Approach:** Include PDF.js library directly in the extension, use it to extract text from PDFs opened in browser tabs.

**Pros:**
- Full control over text extraction
- Works with both local and online PDFs
- No dependency on Chrome's built-in PDF viewer DOM structure
- Well-documented API for text extraction
- Consistent behavior across Chrome versions

**Cons:**
- Adds ~2MB to extension size (minified PDF.js)
- Need to configure web worker correctly in MV3 context
- Version maintenance burden

**Implementation:**
```javascript
// Load PDF from URL or blob
const pdf = await pdfjsLib.getDocument(source).promise;
let fullText = '';
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  fullText += content.items.map(item => item.str).join(' ');
}
```

### Option 2: Parse Chrome's Built-in PDF Viewer DOM

**Approach:** Detect when user is viewing a PDF in Chrome's native viewer, extract text from the rendered DOM elements.

**Pros:**
- No additional library needed
- Smaller extension size

**Cons:**
- Chrome's PDF viewer DOM structure is undocumented and can change
- Doesn't work for local PDFs (different rendering)
- Fragile - breaks with Chrome updates
- Complex selector logic needed

**Rejected:** Too fragile for production use.

### Option 3: Server-side PDF Processing

**Approach:** Upload PDF to backend, use Node.js libraries (pdf-parse, unpdf) for extraction.

**Pros:**
- Simpler extension code
- Can use more powerful libraries

**Cons:**
- Requires uploading potentially large files
- Privacy concerns with sending documents to server
- Doesn't work offline
- Adds latency

**Rejected:** Privacy concerns and offline capability are important.

## Decision

**Use Option 1: Bundle PDF.js in Extension**

Rationale:
- Self-contained, doesn't depend on Chrome internals
- Works offline
- Privacy-preserving (all processing local)
- Well-maintained Mozilla library
- Clear documentation and examples

## Implementation Requirements

### Manifest Changes
```json
{
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["*://*/*", "file://*/*"]
}
```

Note: `file://*/*` enables local PDF access, but user must still enable "Allow access to file URLs" in extension settings.

### PDF Detection

Detect PDFs by:
1. URL ending in `.pdf`
2. Content-Type header `application/pdf`
3. `<embed type="application/pdf">` elements

### User Flow

1. User opens PDF in browser (local or online)
2. Extension detects PDF context
3. R/L button shows "Analyze PDF" option
4. Click extracts text via PDF.js
5. Text sent to existing `/analyze` endpoint
6. Results displayed in existing analysis UI

### Technical Considerations

1. **Web Worker in MV3**: Service workers in MV3 have limitations. PDF.js worker should run in content script context or use offscreen document.

2. **Large PDFs**: Implement pagination - analyze first N pages if document is very long (same pattern as `smartSample()` for articles).

3. **Scanned PDFs**: PDF.js only extracts text layers. Scanned/image PDFs won't work (out of scope - would need OCR).

## Out of Scope

- OCR for scanned PDFs
- PDF rendering/viewing (use browser's native viewer)
- PDF editing or annotation
- Protected/encrypted PDFs

## References

- [PDF.js GitHub](https://github.com/mozilla/pdf.js)
- [PDF.js Chrome Extension Wiki](https://github.com/mozilla/pdf.js/wiki/PDF-Viewer-(Chrome-extension))
- [PDF.js Text Extraction Guide](https://www.nutrient.io/blog/how-to-extract-text-from-a-pdf-using-javascript/)

---
*Discovery completed: 2026-01-15*
