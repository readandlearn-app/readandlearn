// UI module for Read & Learn extension
// Handles button, menu, banners, tooltips, and visual elements
// Note: All dynamic content is sanitized with sanitizeForDisplay() before innerHTML usage

import { sanitizeForDisplay, getCefrColor, SUPPORTED_LANGUAGES } from './utils.js';
import { renderLanguageSelector, getManualOverride, setManualOverride, getCurrentLanguage } from './language.js';

// ========================================
// COLOR DETECTION
// ========================================
export function getDominantColor() {
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;

  let mainBg = bodyBg;
  const mainElements = ['main', 'article', '[role="main"]', '.content', '#content'];
  for (const selector of mainElements) {
    const el = document.querySelector(selector);
    if (el) {
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        mainBg = bg;
        break;
      }
    }
  }

  const parseRGB = (rgbString) => {
    const match = rgbString.match(/\d+/g);
    return match ? match.map(Number) : [255, 255, 255];
  };

  const [r, g, b] = parseRGB(mainBg);
  return { r, g, b };
}

export function getComplementaryColor(r, g, b) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = 60 * (((gNorm - bNorm) / delta) % 6);
    } else if (max === gNorm) {
      h = 60 * (((bNorm - rNorm) / delta) + 2);
    } else {
      h = 60 * (((rNorm - gNorm) / delta) + 4);
    }
  }
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  const compH = (h + 180) % 360;
  const compS = Math.max(s, 0.7);
  const compL = l > 0.5 ? 0.35 : 0.65;

  const c = (1 - Math.abs(2 * compL - 1)) * compS;
  const x = c * (1 - Math.abs(((compH / 60) % 2) - 1));
  const m = compL - c / 2;

  let r2, g2, b2;
  if (compH >= 0 && compH < 60) {
    [r2, g2, b2] = [c, x, 0];
  } else if (compH >= 60 && compH < 120) {
    [r2, g2, b2] = [x, c, 0];
  } else if (compH >= 120 && compH < 180) {
    [r2, g2, b2] = [0, c, x];
  } else if (compH >= 180 && compH < 240) {
    [r2, g2, b2] = [0, x, c];
  } else if (compH >= 240 && compH < 300) {
    [r2, g2, b2] = [x, 0, c];
  } else {
    [r2, g2, b2] = [c, 0, x];
  }

  const toRGB = (val) => Math.round((val + m) * 255);
  return {
    r: toRGB(r2),
    g: toRGB(g2),
    b: toRGB(b2)
  };
}

// ========================================
// R/L BUTTON
// ========================================
export function createRLButton(onToggleMenu) {
  const existingButton = document.getElementById('rl-button');
  if (existingButton) {
    existingButton.remove();
  }

  // Load saved position from localStorage
  const savedPosition = localStorage.getItem('rl-button-position');
  const position = savedPosition ? JSON.parse(savedPosition) : { top: '33%' };

  const dominant = getDominantColor();
  const opposite = getComplementaryColor(dominant.r, dominant.g, dominant.b);

  const color1 = `rgb(${opposite.r}, ${opposite.g}, ${opposite.b})`;
  const color2 = `rgb(${Math.max(0, opposite.r - 30)}, ${Math.max(0, opposite.g - 30)}, ${Math.max(0, opposite.b - 30)})`;

  const button = document.createElement('div');
  button.id = 'rl-button';
  button.style.cssText = `
    position: fixed;
    top: ${position.top};
    right: 0;
    width: 60px;
    height: 80px;
    background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%);
    color: white;
    border-radius: 12px 0 0 12px;
    box-shadow: -2px 4px 20px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    cursor: move;
    transition: box-shadow 0.3s ease;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    font-weight: 700;
  `;

  // Create inner content using DOM methods for safety
  const innerDiv = document.createElement('div');
  innerDiv.style.cssText = 'font-size: 20px; line-height: 1.1; font-weight: 900; text-align: center; font-family: "Cinzel", "Playfair Display", "Bodoni MT", "Didot", "Georgia", serif; letter-spacing: 2px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); pointer-events: none;';

  const r = document.createElement('div');
  r.textContent = 'R';
  const slash = document.createElement('div');
  slash.style.cssText = 'margin-top: -3px; font-size: 16px;';
  slash.textContent = '/';
  const l = document.createElement('div');
  l.style.cssText = 'margin-top: -3px;';
  l.textContent = 'L';

  innerDiv.appendChild(r);
  innerDiv.appendChild(slash);
  innerDiv.appendChild(l);
  button.appendChild(innerDiv);

  // Draggable functionality
  let isDragging = false;
  let startY = 0;
  let startTop = 0;

  button.addEventListener('mousedown', (e) => {
    isDragging = true;
    startY = e.clientY;
    startTop = button.offsetTop;
    button.style.transition = 'none';
    button.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaY = e.clientY - startY;
    const newTop = startTop + deltaY;
    const maxTop = window.innerHeight - button.offsetHeight;

    const clampedTop = Math.max(0, Math.min(newTop, maxTop));
    button.style.top = `${clampedTop}px`;
  });

  document.addEventListener('mouseup', (e) => {
    if (isDragging) {
      isDragging = false;
      button.style.transition = 'box-shadow 0.3s ease';
      button.style.cursor = 'move';

      // Save position to localStorage
      const currentTop = button.style.top;
      localStorage.setItem('rl-button-position', JSON.stringify({ top: currentTop }));

      // If moved less than 5px, consider it a click
      const moved = Math.abs(e.clientY - startY);
      if (moved < 5) {
        onToggleMenu();
      }
    }
  });

  button.addEventListener('mouseenter', () => {
    if (!isDragging) {
      button.style.boxShadow = '-4px 6px 28px rgba(0,0,0,0.4)';
    }
  });

  button.addEventListener('mouseleave', () => {
    if (!isDragging) {
      button.style.boxShadow = '-2px 4px 20px rgba(0,0,0,0.3)';
    }
  });

  document.body.appendChild(button);
  console.log('✅ R/L button displayed (draggable)');
  return button;
}

// ========================================
// MENU
// ========================================
export function createMenu(content, onClose) {
  const existingMenu = document.getElementById('rl-menu');
  if (existingMenu) return existingMenu;

  const dominant = getDominantColor();
  const opposite = getComplementaryColor(dominant.r, dominant.g, dominant.b);
  const color1 = `rgb(${opposite.r}, ${opposite.g}, ${opposite.b})`;

  const menu = document.createElement('div');
  menu.id = 'rl-menu';
  menu.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 320px;
    max-height: 600px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
    z-index: 999998;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow-y: auto;
    transform: translateY(-10px) scale(0.95);
    opacity: 0;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  // Build header using DOM methods
  const header = document.createElement('div');
  header.style.cssText = `position: sticky; top: 0; background: linear-gradient(135deg, ${color1} 0%, ${color1} 100%); padding: 16px; color: white; z-index: 1; border-radius: 12px 12px 0 0;`;

  const headerInner = document.createElement('div');
  headerInner.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

  const title = document.createElement('div');
  title.style.cssText = "font-size: 20px; font-weight: 900; font-family: 'Cinzel', serif;";
  title.textContent = 'R/L';

  const closeBtn = document.createElement('button');
  closeBtn.id = 'rl-close-btn';
  closeBtn.style.cssText = 'background: rgba(255,255,255,0.2); border: none; color: white; font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.2s;';
  closeBtn.textContent = '×';

  headerInner.appendChild(title);
  headerInner.appendChild(closeBtn);
  header.appendChild(headerInner);

  const subtitle = document.createElement('div');
  subtitle.style.cssText = 'font-size: 11px; opacity: 0.85; margin-top: 2px;';
  subtitle.textContent = 'Read & Learn';
  header.appendChild(subtitle);

  const menuContent = document.createElement('div');
  menuContent.id = 'rl-menu-content';
  menuContent.style.cssText = 'padding: 16px;';
  // Content is sanitized before being passed to this function
  menuContent.innerHTML = content;

  menu.appendChild(header);
  menu.appendChild(menuContent);
  document.body.appendChild(menu);

  // Trigger pop-in animation
  setTimeout(() => {
    menu.style.transform = 'translateY(0) scale(1)';
    menu.style.opacity = '1';
  }, 10);

  // Close button
  closeBtn.addEventListener('click', onClose);

  return menu;
}

export function hideMenu() {
  const menu = document.getElementById('rl-menu');
  if (menu) {
    menu.style.transform = 'translateY(-10px) scale(0.95)';
    menu.style.opacity = '0';
    setTimeout(() => menu.remove(), 250);
  }
}

export function updateMenuContent(content) {
  const menuContent = document.getElementById('rl-menu-content');
  if (menuContent) {
    // Content is sanitized before being passed to this function
    menuContent.innerHTML = content;
  }
}

// ========================================
// BANNER
// ========================================
export function showBanner(message, type = 'info', autoRemove = true) {
  const existingBanner = document.getElementById('rl-banner');
  if (existingBanner) {
    existingBanner.remove();
  }

  const colors = {
    loading: '#2196F3',
    success: '#4CAF50',
    error: '#f44336',
    info: '#2196F3'
  };

  const banner = document.createElement('div');
  banner.id = 'rl-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: ${colors[type]};
    color: white;
    padding: 15px 20px;
    z-index: 999999;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  // Use textContent for safety - message may contain error.message from APIs
  banner.textContent = message;
  document.body.prepend(banner);

  if (autoRemove && type !== 'loading') {
    setTimeout(() => banner.remove(), 5000);
  }

  return banner;
}

export function removeBanner() {
  const banner = document.getElementById('rl-banner');
  if (banner) banner.remove();
}

// ========================================
// RENDER HELPERS
// All dynamic content passed to innerHTML is sanitized with sanitizeForDisplay()
// ========================================
export function renderInitialView(selectionModeActive) {
  // All static content - no sanitization needed
  return `
    ${renderLanguageSelector()}
    <div style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 48px; margin-bottom: 20px;">📚</div>
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #333;">Analyze This Page</div>
      <div style="font-size: 14px; color: #666; margin-bottom: 24px;">Get CEFR level, vocabulary insights, and build your flashcard deck</div>
      <button id="rl-analyze-btn" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 28px;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 12px rgba(102,126,234,0.4);
        transition: all 0.2s ease;
      ">📊 Analyze Page</button>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

    <div style="padding: 0 0 20px 0;">
      <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #333;">✨ Build Your Deck</div>
      <button id="rl-selection-mode-btn" style="
        width: 100%;
        background: ${selectionModeActive ? '#4CAF50' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
        color: white;
        border: none;
        padding: 14px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 8px;
      ">${selectionModeActive ? '✓ Selection Mode Active' : '📝 Add Words to Deck'}</button>
      <div style="font-size: 12px; color: #888; text-align: center;">Select words on the page to add to your deck</div>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

    <div style="padding: 0 0 20px 0;">
      <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #333;">🗂️ My Deck</div>
      <button id="rl-view-deck-btn" style="
        width: 100%;
        background: white;
        color: #333;
        border: 1px solid #ddd;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      ">View Deck</button>
    </div>
  `;
}

export function renderAnalysisView(analysis, selectionModeActive) {
  const vocab = analysis.vocabulary_examples || [];
  const grammar = analysis.grammar_features || [];

  // Sanitize all API response data to prevent XSS
  const safeCefrLevel = sanitizeForDisplay(analysis.cefr_level);
  const safeConfidence = sanitizeForDisplay(analysis.confidence);
  const safeReasoning = sanitizeForDisplay(analysis.reasoning);
  const safeVocab = vocab.map(w => sanitizeForDisplay(w));
  const safeGrammar = grammar.map(g => sanitizeForDisplay(g));

  return `
    ${renderLanguageSelector()}
    <div style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div style="font-size: 36px; font-weight: 900; color: ${getCefrColor(analysis.cefr_level)};">${safeCefrLevel}</div>
        <div>
          <div style="font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1px;">CEFR Level</div>
          <div style="font-size: 13px; color: #666;">${safeConfidence} confidence</div>
        </div>
      </div>
      ${analysis.cached ? '<div style="font-size: 12px; color: #4CAF50; margin-top: 8px;">💾 Loaded from cache (FREE!)</div>' : ''}
    </div>

    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">💡 Reasoning</div>
      <div style="font-size: 13px; color: #666; line-height: 1.6;">${safeReasoning}</div>
    </div>

    <div style="margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">📚 Key Vocabulary (${vocab.length})</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${safeVocab.map(word => `<span style="background: #e8eaf6; color: #3f51b5; padding: 6px 12px; border-radius: 16px; font-size: 12px;">${word}</span>`).join('')}
      </div>
    </div>

    <div style="margin-bottom: 24px;">
      <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">🎯 Grammar Features (${grammar.length})</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${safeGrammar.map(feature => `<span style="background: #fff3e0; color: #f57c00; padding: 6px 12px; border-radius: 16px; font-size: 12px;">${feature}</span>`).join('')}
      </div>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

    <div style="margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px;">✨ Build Your Deck</div>
      <button id="rl-selection-mode-btn" style="
        width: 100%;
        background: ${selectionModeActive ? '#4CAF50' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
        color: white;
        border: none;
        padding: 14px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      ">${selectionModeActive ? '✓ Selection Mode Active' : '🎯 Enable Selection Mode'}</button>
      <div style="font-size: 12px; color: #888; margin-top: 8px; text-align: center;">Select words on the page to add to your deck</div>
    </div>

    <div>
      <button id="rl-view-deck-btn" style="
        width: 100%;
        background: white;
        color: #333;
        border: 1px solid #ddd;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      ">🗂️ View My Deck</button>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

    <div style="margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px;">📝 Test Comprehension</div>

      <select id="rl-question-level" style="
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        margin-bottom: 8px;
        font-size: 13px;
        background: white;
      ">
        <optgroup label="DELF">
          <option value="A1">DELF A1 - Beginner</option>
          <option value="A2">DELF A2 - Elementary</option>
          <option value="B1">DELF B1 - Intermediate</option>
          <option value="B2">DELF B2 - Upper Intermediate</option>
        </optgroup>
        <optgroup label="DALF">
          <option value="C1">DALF C1 - Advanced</option>
          <option value="C2">DALF C2 - Proficient</option>
        </optgroup>
      </select>

      <button id="rl-generate-questions-btn" style="
        width: 100%;
        background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 12px rgba(255,152,0,0.4);
        transition: all 0.2s ease;
      ">🎯 Generate Questions</button>
    </div>
  `;
}

export function renderDeckView(cards, getCefrColorFn) {
  if (cards.length === 0) {
    // All static content - no sanitization needed
    return `
      <div style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 64px; margin-bottom: 20px;">📭</div>
        <div style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 8px;">Your deck is empty</div>
        <div style="font-size: 14px; color: #888;">Analyze an article and start adding words!</div>
        <button id="rl-back-to-analysis-btn" style="
          margin-top: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        ">Back to Analysis</button>
      </div>
    `;
  }

  // Sanitize card data - card.id is database ID (safe), other fields need sanitization
  const cardHtml = cards.map(card => {
    const safeWord = sanitizeForDisplay(card.word);
    const safeCefrLevel = sanitizeForDisplay(card.cefr_level);
    const safeDefinition = sanitizeForDisplay(card.definition || '');
    const safeContext = sanitizeForDisplay(card.context_sentence?.substring(0, 100) || '');
    return `
    <div class="rl-deck-card" data-card-id="${card.id}" style="
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s ease;
    ">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <div style="font-size: 16px; font-weight: 600; color: #333;">${safeWord}</div>
        <span style="background: ${getCefrColorFn(card.cefr_level)}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${safeCefrLevel}</span>
      </div>
      <div style="font-size: 13px; color: #666; margin-bottom: 8px;">${safeDefinition}</div>
      <div style="font-size: 12px; color: #888; font-style: italic; margin-bottom: 12px;">"${safeContext}..."</div>
      <div style="display: flex; gap: 8px;">
        <button class="rl-delete-card-btn" data-card-id="${card.id}" style="
          flex: 1;
          background: #ffebee;
          color: #c62828;
          border: none;
          padding: 6px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        ">🗑️ Delete</button>
      </div>
    </div>
  `}).join('');

  return `
    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div>
          <div style="font-size: 20px; font-weight: 600; color: #333;">My Deck</div>
          <div style="font-size: 13px; color: #888;">${cards.length} card${cards.length !== 1 ? 's' : ''}</div>
        </div>
        <button id="rl-back-to-analysis-btn" style="
          background: #f5f5f5;
          color: #666;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        ">← Back</button>
      </div>

      <div style="display: flex; gap: 8px; margin-bottom: 20px;">
        <button id="rl-export-json-btn" style="
          flex: 1;
          background: white;
          color: #333;
          border: 1px solid #ddd;
          padding: 8px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        ">📥 JSON</button>
        <button id="rl-export-csv-btn" style="
          flex: 1;
          background: white;
          color: #333;
          border: 1px solid #ddd;
          padding: 8px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        ">📥 CSV</button>
        <button id="rl-export-anki-btn" style="
          flex: 1;
          background: white;
          color: #333;
          border: 1px solid #ddd;
          padding: 8px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        ">📥 Anki</button>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${cardHtml}
    </div>
  `;
}

// ========================================
// SELECTION POPUP
// ========================================
export function createSelectionPopup(word, x, y, callbacks) {
  const existingPopup = document.getElementById('rl-selection-popup');
  if (existingPopup) existingPopup.remove();

  const popup = document.createElement('div');
  popup.id = 'rl-selection-popup';
  popup.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y + 10}px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    padding: 12px 16px;
    z-index: 999999;
    font-family: 'SF Pro Display', -apple-system, sans-serif;
    min-width: 220px;
    max-width: 300px;
  `;

  // Build popup using safe DOM methods for dynamic content
  const titleDiv = document.createElement('div');
  titleDiv.style.cssText = 'font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #333;';
  titleDiv.textContent = `"${word.substring(0, 30)}${word.length > 30 ? '...' : ''}"`;

  const meaningDiv = document.createElement('div');
  meaningDiv.id = 'rl-popup-meaning';
  meaningDiv.style.cssText = 'display: none; background: #f5f5f5; padding: 8px; border-radius: 6px; margin-bottom: 8px; font-size: 12px; color: #333;';

  const getMeaningBtn = document.createElement('button');
  getMeaningBtn.id = 'rl-get-meaning-btn';
  getMeaningBtn.style.cssText = `
    width: 100%;
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 6px;
  `;
  getMeaningBtn.textContent = '🔍 Get Meaning';

  const addToDeckBtn = document.createElement('button');
  addToDeckBtn.id = 'rl-add-to-deck-popup-btn';
  addToDeckBtn.style.cssText = `
    width: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 6px;
  `;
  addToDeckBtn.textContent = '+ Add to Deck';

  const cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = `
    width: 100%;
    background: #f5f5f5;
    color: #666;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
  `;
  cancelBtn.textContent = 'Cancel';

  popup.appendChild(titleDiv);
  popup.appendChild(meaningDiv);
  popup.appendChild(getMeaningBtn);
  popup.appendChild(addToDeckBtn);
  popup.appendChild(cancelBtn);

  let currentMeaning = null;

  getMeaningBtn.addEventListener('click', async () => {
    getMeaningBtn.textContent = '🔄 Loading...';
    getMeaningBtn.disabled = true;

    try {
      const result = await callbacks.onGetMeaning();
      currentMeaning = result;

      // Safely display API response using DOM methods
      meaningDiv.textContent = '';
      const translationEl = document.createElement('strong');
      translationEl.textContent = result.translation || '';
      const definitionEl = document.createElement('small');
      definitionEl.textContent = result.definition || '';
      meaningDiv.appendChild(translationEl);
      meaningDiv.appendChild(document.createElement('br'));
      meaningDiv.appendChild(definitionEl);
      meaningDiv.style.display = 'block';
      getMeaningBtn.style.display = 'none';
    } catch (error) {
      meaningDiv.textContent = '';
      const errorSpan = document.createElement('span');
      errorSpan.style.color = '#f44336';
      errorSpan.textContent = `Error: ${error.message || 'Unknown error'}`;
      meaningDiv.appendChild(errorSpan);
      meaningDiv.style.display = 'block';
      getMeaningBtn.textContent = '🔍 Get Meaning';
      getMeaningBtn.disabled = false;
    }
  });

  addToDeckBtn.addEventListener('click', () => {
    callbacks.onAddToDeck(currentMeaning);
    popup.remove();
  });

  cancelBtn.addEventListener('click', () => {
    popup.remove();
  });

  return popup;
}

// ========================================
// HIGHLIGHTED WORD
// ========================================
export function createHighlightedWord(word, translation) {
  const span = document.createElement('span');
  span.className = 'rl-highlighted-word';
  span.dataset.translation = translation;
  span.style.cssText = `
    background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
    border-bottom: 2px solid #FF9800;
    padding: 2px 4px;
    border-radius: 3px;
    cursor: help;
    position: relative;
  `;
  span.textContent = word; // Safe: uses textContent

  span.addEventListener('mouseenter', function() {
    const existingTooltip = document.getElementById('rl-word-tooltip');
    if (existingTooltip) existingTooltip.remove();

    const tooltip = document.createElement('div');
    tooltip.id = 'rl-word-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: #333;
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 13px;
      z-index: 999999;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    tooltip.textContent = this.dataset.translation;

    document.body.appendChild(tooltip);

    const rect = this.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
  });

  span.addEventListener('mouseleave', function() {
    const tooltip = document.getElementById('rl-word-tooltip');
    if (tooltip) tooltip.remove();
  });

  return span;
}

// ========================================
// QUESTIONS VIEW
// ========================================
export function renderQuestionsView(questions, currentIndex, userAnswers, quizSubmitted) {
  if (!questions || !questions.questions) {
    return '<div style="padding: 20px; text-align: center;">No questions available</div>';
  }

  const question = questions.questions[currentIndex];
  const totalQuestions = questions.questions.length;
  const userScore = quizSubmitted ? calculateDisplayScore(questions.questions, userAnswers) : null;

  return `
    <div style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <div style="font-size: 18px; font-weight: 600;">Test de Compréhension</div>
          <div style="font-size: 12px; color: #888;">${sanitizeForDisplay(questions.examType)} ${sanitizeForDisplay(questions.level)} | Question ${currentIndex + 1} / ${totalQuestions}</div>
          ${quizSubmitted ? `<div style="font-size: 14px; color: #4CAF50; font-weight: 600; margin-top: 4px;">Score: ${userScore.correct}/${totalQuestions}</div>` : ''}
        </div>
        <button id="rl-back-from-questions" style="
          background: #f5f5f5;
          color: #666;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        ">← Retour</button>
      </div>
    </div>

    ${renderQuestion(question, currentIndex, userAnswers, quizSubmitted)}

    <div style="display: flex; gap: 8px; margin: 16px 0;">
      <button id="rl-prev-question" style="
        flex: 1;
        background: ${currentIndex === 0 ? '#f5f5f5' : 'white'};
        color: ${currentIndex === 0 ? '#ccc' : '#333'};
        border: 1px solid #ddd;
        padding: 10px;
        border-radius: 6px;
        font-size: 13px;
        cursor: ${currentIndex === 0 ? 'not-allowed' : 'pointer'};
      " ${currentIndex === 0 ? 'disabled' : ''}>← Précédent</button>

      <button id="rl-next-question" style="
        flex: 1;
        background: ${currentIndex === totalQuestions - 1 ? '#f5f5f5' : 'white'};
        color: ${currentIndex === totalQuestions - 1 ? '#ccc' : '#333'};
        border: 1px solid #ddd;
        padding: 10px;
        border-radius: 6px;
        font-size: 13px;
        cursor: ${currentIndex === totalQuestions - 1 ? 'not-allowed' : 'pointer'};
      " ${currentIndex === totalQuestions - 1 ? 'disabled' : ''}>Suivant →</button>
    </div>

    ${!quizSubmitted ? `
      <button id="rl-check-answers-btn" style="
        width: 100%;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
        border: none;
        padding: 14px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 8px;
      ">✓ Vérifier les Réponses</button>
    ` : `
      <div style="display: flex; gap: 8px; margin-bottom: 8px;">
        <button id="rl-retake-quiz-btn" style="
          flex: 1;
          background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        ">🔄 Recommencer</button>

        <button id="rl-export-questions-btn" style="
          flex: 1;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        ">📥 Exporter</button>
      </div>
    `}
  `;
}

function renderQuestion(question, index, userAnswers, quizSubmitted) {
  const userAnswer = userAnswers[question.id];
  const isCorrect = quizSubmitted && userAnswer === question.correct_answer;

  // Sanitize question data to prevent XSS
  const safeQuestion = sanitizeForDisplay(question.question);
  const safeCorrectAnswer = sanitizeForDisplay(question.correct_answer);
  const safeExplanation = sanitizeForDisplay(question.explanation);
  const safeUserAnswer = sanitizeForDisplay(userAnswer || '');

  let questionHTML = `
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #333;">
        ${index + 1}. ${safeQuestion}
      </div>
  `;

  // Render based on question type
  if (question.type === 'multiple_choice') {
    questionHTML += '<div id="rl-question-options">';
    for (const [key, value] of Object.entries(question.options)) {
      const isSelected = userAnswer === key;
      const bgColor = quizSubmitted
        ? (key === question.correct_answer ? '#e8f5e9' : (isSelected ? '#ffebee' : 'white'))
        : (isSelected ? '#e3f2fd' : 'white');

      // Sanitize option value
      const safeValue = sanitizeForDisplay(value);

      questionHTML += `
        <label style="
          display: block;
          padding: 10px 12px;
          background: ${bgColor};
          margin-bottom: 8px;
          border-radius: 6px;
          cursor: ${quizSubmitted ? 'default' : 'pointer'};
          border: 2px solid ${quizSubmitted && key === question.correct_answer ? '#4CAF50' : (isSelected ? '#2196F3' : '#ddd')};
          transition: all 0.2s ease;
        ">
          <input type="radio" name="answer_${question.id}" value="${key}" ${isSelected ? 'checked' : ''} ${quizSubmitted ? 'disabled' : ''} style="margin-right: 8px;">
          <span style="font-size: 13px;">${key}. ${safeValue}</span>
        </label>
      `;
    }
    questionHTML += '</div>';

  } else if (question.type === 'true_false') {
    for (const option of ['Vrai', 'Faux']) {
      const isSelected = userAnswer === option;
      const bgColor = quizSubmitted
        ? (option === question.correct_answer ? '#e8f5e9' : (isSelected ? '#ffebee' : 'white'))
        : (isSelected ? '#e3f2fd' : 'white');

      questionHTML += `
        <label style="
          display: block;
          padding: 10px 12px;
          background: ${bgColor};
          margin-bottom: 8px;
          border-radius: 6px;
          cursor: ${quizSubmitted ? 'default' : 'pointer'};
          border: 2px solid ${quizSubmitted && option === question.correct_answer ? '#4CAF50' : (isSelected ? '#2196F3' : '#ddd')};
        ">
          <input type="radio" name="answer_${question.id}" value="${option}" ${isSelected ? 'checked' : ''} ${quizSubmitted ? 'disabled' : ''} style="margin-right: 8px;">
          <span>${option}</span>
        </label>
      `;
    }

  } else if (question.type === 'fill_blank' || question.type === 'short_answer') {
    const bgColor = quizSubmitted
      ? (userAnswer && userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim() ? '#e8f5e9' : '#ffebee')
      : 'white';

    questionHTML += `
      <input type="text" id="answer_${question.id}" value="${safeUserAnswer}" ${quizSubmitted ? 'disabled' : ''}
        style="
          width: 100%;
          padding: 10px;
          border: 2px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          background: ${bgColor};
        "
        placeholder="Votre réponse...">
    `;
  }

  // Show explanation after submission
  if (quizSubmitted) {
    const icon = isCorrect ? '✓' : '✗';
    const color = isCorrect ? '#2e7d32' : '#c62828';

    questionHTML += `
      <div style="background: ${isCorrect ? '#e8f5e9' : '#ffebee'}; padding: 12px; border-radius: 6px; margin-top: 12px; border-left: 4px solid ${color};">
        <div style="color: ${color}; font-weight: 600; margin-bottom: 4px;">${icon} Réponse correcte: ${safeCorrectAnswer}</div>
        <div style="font-size: 12px; color: #666;">${safeExplanation}</div>
      </div>
    `;
  }

  questionHTML += '</div>';
  return questionHTML;
}

function calculateDisplayScore(questions, userAnswers) {
  let correct = 0;
  for (const q of questions) {
    const answer = userAnswers[q.id];
    if (q.type === 'fill_blank' || q.type === 'short_answer') {
      if (answer?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) correct++;
    } else if (answer === q.correct_answer) {
      correct++;
    }
  }
  return { correct, total: questions.length };
}
