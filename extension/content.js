(async function() {
  'use strict';

  console.log('🚀 Read & Learn v2.0 starting...');
  console.log('Page URL:', window.location.href);

  // Check if this is the demo page - skip if it is
  if (window.READANDLEARN_DEMO_PAGE === true ||
      document.documentElement.getAttribute('data-readandlearn-demo') === 'true' ||
      document.querySelector('meta[name="readandlearn-demo"]')) {
    console.log('⚠️ Read & Learn demo page detected - extension disabled to avoid conflicts');
    return;
  }

  // Only run on HTML pages
  const url = window.location.href.toLowerCase();
  const isNonHtmlFile = url.endsWith('.svg') || url.endsWith('.pdf') ||
                        url.endsWith('.xml') || url.endsWith('.json') ||
                        url.includes('chrome://') || url.includes('chrome-extension://');

  if (!document.body || isNonHtmlFile || !document.documentElement ||
      document.documentElement.tagName !== 'HTML') {
    console.log('⚠️ Not an HTML page, skipping...');
    return;
  }

  // Prevent multiple injections
  if (window.readAndLearnInjected) {
    console.log('⚠️ Read & Learn already running on this page');
    return;
  }
  window.readAndLearnInjected = true;

  // Backend URL is now configured via chrome.storage.sync and handled by background.js
  // All API requests go through message passing to background.js

  // Helper function to make API requests via background script (bypasses Private Network Access)
  async function apiFetch(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      // Pass endpoint directly - background.js will prepend the configured backend URL
      const url = endpoint;

      chrome.runtime.sendMessage({
        type: 'API_REQUEST',
        url: url,
        options: options,
        expectJson: true
      }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response) {
          reject(new Error('No response from background script'));
          return;
        }

        // Create a response-like object for consistency with fetch API
        resolve({
          ok: response.ok || false,
          status: response.status || 500,
          json: async () => response.data || { error: response.error || 'Unknown error' },
          text: async () => JSON.stringify(response.data || { error: response.error || 'Unknown error' })
        });
      });
    });
  }

  // Generate unique user ID (browser fingerprint)
  const USER_ID = localStorage.getItem('readandlearn_user_id') ||
                  (() => {
                    const id = 'user_' + Math.random().toString(36).substring(2, 15);
                    localStorage.setItem('readandlearn_user_id', id);
                    return id;
                  })();

  // State management
  let currentAnalysis = null;
  let menuExpanded = false;
  // Load selection mode state from localStorage
  let selectionModeActive = localStorage.getItem('rl-selection-mode') === 'true';
  let currentArticleElement = null;
  let persistentTooltips = {}; // Stores word translations that persist on page
  let currentQuestions = null; // Stores current question set
  let currentQuestionIndex = 0; // Current question being viewed
  let userAnswers = {}; // Stores user's answers {questionId: answer}
  let quizSubmitted = false; // Whether user has checked answers

  console.log('✅ Read & Learn activated!');

  // Load Google Font
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@900&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);

  // ========================================
  // COLOR DETECTION
  // ========================================
  function getDominantColor() {
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

  function getComplementaryColor(r, g, b) {
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
  function showRLButton() {
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

    button.innerHTML = `
      <div style="font-size: 20px; line-height: 1.1; font-weight: 900; text-align: center; font-family: 'Cinzel', 'Playfair Display', 'Bodoni MT', 'Didot', 'Georgia', serif; letter-spacing: 2px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); pointer-events: none;">
        <div>R</div>
        <div style="margin-top: -3px; font-size: 16px;">/</div>
        <div style="margin-top: -3px;">L</div>
      </div>
    `;

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
          toggleMenu();
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
  }

  // ========================================
  // EXPANDABLE MENU
  // ========================================
  function toggleMenu() {
    menuExpanded = !menuExpanded;

    if (menuExpanded) {
      showMenu();
    } else {
      hideMenu();
    }
  }

  function showMenu() {
    const existingMenu = document.getElementById('rl-menu');
    if (existingMenu) return;

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

    menu.innerHTML = `
      <div style="position: sticky; top: 0; background: linear-gradient(135deg, ${color1} 0%, ${color1} 100%); padding: 16px; color: white; z-index: 1; border-radius: 12px 12px 0 0;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 20px; font-weight: 900; font-family: 'Cinzel', serif;">R/L</div>
          <button id="rl-close-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.2s;">&times;</button>
        </div>
        <div style="font-size: 11px; opacity: 0.85; margin-top: 2px;">Read & Learn</div>
      </div>

      <div id="rl-menu-content" style="padding: 16px;">
        ${currentAnalysis ? renderAnalysisView() : renderInitialView()}
      </div>
    `;

    document.body.appendChild(menu);

    // Trigger pop-in animation
    setTimeout(() => {
      menu.style.transform = 'translateY(0) scale(1)';
      menu.style.opacity = '1';
    }, 10);

    // Event listeners
    document.getElementById('rl-close-btn').addEventListener('click', hideMenu);

    // Attach action button listeners
    attachMenuListeners();
  }

  function renderInitialView() {
    return `
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

  function renderAnalysisView() {
    const vocab = currentAnalysis.vocabulary_examples || [];
    const grammar = currentAnalysis.grammar_features || [];

    return `
      <div style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="font-size: 36px; font-weight: 900; color: ${getCefrColor(currentAnalysis.cefr_level)};">${currentAnalysis.cefr_level}</div>
          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1px;">CEFR Level</div>
            <div style="font-size: 13px; color: #666;">${currentAnalysis.confidence} confidence</div>
          </div>
        </div>
        ${currentAnalysis.cached ? '<div style="font-size: 12px; color: #4CAF50; margin-top: 8px;">💾 Loaded from cache (FREE!)</div>' : ''}
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">💡 Reasoning</div>
        <div style="font-size: 13px; color: #666; line-height: 1.6;">${currentAnalysis.reasoning}</div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">📚 Key Vocabulary (${vocab.length})</div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${vocab.map(word => `<span style="background: #e8eaf6; color: #3f51b5; padding: 6px 12px; border-radius: 16px; font-size: 12px;">${word}</span>`).join('')}
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">🎯 Grammar Features (${grammar.length})</div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${grammar.map(feature => `<span style="background: #fff3e0; color: #f57c00; padding: 6px 12px; border-radius: 16px; font-size: 12px;">${feature}</span>`).join('')}
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

  function getCefrColor(level) {
    const colors = {
      'A1': '#4CAF50',
      'A2': '#8BC34A',
      'B1': '#FFC107',
      'B2': '#FF9800',
      'C1': '#FF5722',
      'C2': '#9C27B0'
    };
    return colors[level] || '#667eea';
  }

  function hideMenu() {
    const menu = document.getElementById('rl-menu');
    if (menu) {
      menu.style.transform = 'translateY(-10px) scale(0.95)';
      menu.style.opacity = '0';
      setTimeout(() => menu.remove(), 250);
    }
    menuExpanded = false;

    // Keep selection mode active when menu closes (state persists in localStorage)
  }

  function attachMenuListeners() {
    const analyzeBtn = document.getElementById('rl-analyze-btn');
    const viewDeckBtn = document.getElementById('rl-view-deck-btn');
    const selectionModeBtn = document.getElementById('rl-selection-mode-btn');
    const generateQuestionsBtn = document.getElementById('rl-generate-questions-btn');

    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', analyzeArticle);
    }

    if (viewDeckBtn) {
      viewDeckBtn.addEventListener('click', showDeck);
    }

    if (selectionModeBtn) {
      selectionModeBtn.addEventListener('click', toggleSelectionMode);
    }

    if (generateQuestionsBtn) {
      generateQuestionsBtn.addEventListener('click', generateQuestions);
    }
  }

  // ========================================
  // ARTICLE DETECTION
  // ========================================
  function detectArticle() {
    let article = document.querySelector('article');
    if (article && article.innerText.length > 500) {
      return article;
    }

    article = document.querySelector('main');
    if (article && article.innerText.length > 500) {
      return article;
    }

    const selectors = [
      '[role="main"]',
      '.article',
      '.post',
      '.content',
      '.entry-content',
      '#article',
      '#content'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.length > 500) {
        return element;
      }
    }

    const divs = Array.from(document.querySelectorAll('div'));
    divs.sort((a, b) => b.innerText.length - a.innerText.length);

    for (const div of divs) {
      if (div.innerText.length > 1000) {
        return div;
      }
    }

    return null;
  }

  function isFrench(text) {
    const frenchWords = ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'est', 'dans', 'pour', 'que', 'qui', 'avec', 'sur', 'pas', 'plus'];
    const words = text.toLowerCase().split(/\s+/).slice(0, 100);

    let frenchWordCount = 0;
    for (const word of words) {
      if (frenchWords.includes(word)) {
        frenchWordCount++;
      }
    }

    return frenchWordCount / words.length > 0.1;
  }

  // ========================================
  // ANALYZE ARTICLE
  // ========================================
  async function analyzeArticle() {
    try {
      showBanner('🔄 Detecting article...', 'loading');

      const articleElement = detectArticle();
      if (!articleElement) {
        showBanner('❌ Could not detect article content', 'error');
        return;
      }

      currentArticleElement = articleElement;
      const text = articleElement.innerText;
      console.log(`Found article with ${text.length} characters`);

      if (!isFrench(text)) {
        showBanner('❌ This doesn\'t appear to be French text', 'error');
        return;
      }

      showBanner('🔄 Analyzing French level... (this may take 5-10 seconds)', 'loading');

      const response = await apiFetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          url: window.location.href
        })
      });

      if (!response.ok) {
        const error = await response.json();
        showBanner(`❌ Analysis failed: ${error.error}`, 'error');
        return;
      }

      const result = await response.json();
      console.log('✅ CEFR Analysis:', result);

      currentAnalysis = result;

      // Remove banner
      const banner = document.getElementById('rl-banner');
      if (banner) banner.remove();

      // Update menu
      updateMenuContent();

      showBanner(`✅ Analysis complete: ${result.cefr_level} level${result.cached ? ' (cached)' : ''}`, 'success');

    } catch (error) {
      console.error('Analysis error:', error);
      showBanner(`❌ Error: ${error.message}. Make sure backend is running.`, 'error');
    }
  }

  function updateMenuContent() {
    const menuContent = document.getElementById('rl-menu-content');
    if (menuContent) {
      menuContent.innerHTML = renderAnalysisView();
      attachMenuListeners();
    }
  }

  // ========================================
  // SELECTION MODE
  // ========================================
  function toggleSelectionMode() {
    selectionModeActive = !selectionModeActive;

    // Save to localStorage
    localStorage.setItem('rl-selection-mode', selectionModeActive.toString());
    console.log(`💾 Saved selection mode state: ${selectionModeActive}`);

    if (selectionModeActive) {
      enableSelectionMode();
    } else {
      disableSelectionMode();
    }

    updateMenuContent();
  }

  function enableSelectionMode() {
    console.log('✨ Selection mode enabled');

    // Add overlay
    const overlay = document.createElement('div');
    overlay.id = 'rl-selection-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 380px;
      bottom: 0;
      background: rgba(0, 0, 0, 0.02);
      z-index: 999997;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);

    // Add instruction banner
    showBanner('✨ Select any word or phrase to add to your deck', 'info', false);

    // Listen for text selection
    document.addEventListener('mouseup', handleTextSelection);
  }

  function disableSelectionMode() {
    console.log('Selection mode disabled');

    const overlay = document.getElementById('rl-selection-overlay');
    if (overlay) overlay.remove();

    const popup = document.getElementById('rl-selection-popup');
    if (popup) popup.remove();

    document.removeEventListener('mouseup', handleTextSelection);
  }

  function handleTextSelection(e) {
    if (!selectionModeActive) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText || selectedText.length === 0) {
      const popup = document.getElementById('rl-selection-popup');
      if (popup) popup.remove();
      return;
    }

    // Don't show popup if clicked inside menu or popup
    if (e.target.closest('#rl-menu') || e.target.closest('#rl-selection-popup')) {
      return;
    }

    showSelectionPopup(selectedText, e.pageX, e.pageY);
  }

  function showSelectionPopup(text, x, y) {
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

    popup.innerHTML = `
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #333;">"${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"</div>
      <div id="rl-popup-meaning" style="display: none; background: #f5f5f5; padding: 8px; border-radius: 6px; margin-bottom: 8px; font-size: 12px; color: #333;"></div>
      <button id="rl-get-meaning-btn" style="
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
      ">🔍 Get Meaning</button>
      <button id="rl-add-to-deck-popup-btn" style="
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
      ">+ Add to Deck</button>
      <button id="rl-cancel-popup-btn" style="
        width: 100%;
        background: #f5f5f5;
        color: #666;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
      ">Cancel</button>
    `;

    document.body.appendChild(popup);

    let currentMeaning = null;

    document.getElementById('rl-get-meaning-btn').addEventListener('click', async () => {
      const meaningBtn = document.getElementById('rl-get-meaning-btn');
      const meaningDiv = document.getElementById('rl-popup-meaning');

      meaningBtn.innerHTML = '🔄 Loading...';
      meaningBtn.disabled = true;

      try {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const sentence = range.startContainer.parentElement?.innerText || '';

        const response = await apiFetch('/define', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: text,
            context: sentence.substring(0, 200),
            language: 'fr'
          })
        });

        if (!response.ok) throw new Error('Failed to get meaning');

        const result = await response.json();
        currentMeaning = result;

        console.log('📥 Received definition result:', { word: text, cached: result.cached, translation: result.translation });

        meaningDiv.innerHTML = `<strong>${result.translation}</strong><br/><small>${result.definition}</small>`;
        meaningDiv.style.display = 'block';
        meaningBtn.style.display = 'none';

        // Create persistent tooltip on the page
        console.log('🔧 Calling createPersistentTooltip for:', text);
        createPersistentTooltip(text, result.translation);

      } catch (error) {
        meaningDiv.innerHTML = `<span style="color: #f44336;">Error: ${error.message}</span>`;
        meaningDiv.style.display = 'block';
        meaningBtn.innerHTML = '🔍 Get Meaning';
        meaningBtn.disabled = false;
      }
    });

    document.getElementById('rl-add-to-deck-popup-btn').addEventListener('click', () => {
      addToDeck(text, currentMeaning);
      popup.remove();
    });

    document.getElementById('rl-cancel-popup-btn').addEventListener('click', () => {
      popup.remove();
    });
  }

  // ========================================
  // ADD TO DECK
  // ========================================
  async function addToDeck(word, existingMeaning = null) {
    try {
      showBanner('🔄 Adding to deck...', 'loading');

      // Get context sentence
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const sentence = range.startContainer.parentElement?.innerText || '';

      let definition = existingMeaning;

      // Get definition from backend if not already fetched
      if (!definition) {
        const defResponse = await apiFetch('/define', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word,
            context: sentence.substring(0, 200),
            language: 'fr'
          })
        });

        if (!defResponse.ok) {
          throw new Error('Failed to get definition');
        }

        definition = await defResponse.json();
      }

      // Add to deck
      const addResponse = await apiFetch('/deck/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: USER_ID,
          word: word,
          phrase: word.split(/\s+/).length > 1 ? word : null,
          contextSentence: sentence.substring(0, 300),
          translation: definition.translation,
          definition: definition.definition,
          cefrLevel: definition.cefr,
          language: 'fr',
          sourceUrl: window.location.href,
          sourceTitle: document.title,
          tags: []
        })
      });

      if (!addResponse.ok) {
        throw new Error('Failed to add to deck');
      }

      console.log(`✅ Added "${word}" to deck`);
      showBanner(`✅ Added "${word}" to deck!${definition.cached ? ' (definition cached)' : ''}`, 'success');

      // Create persistent tooltip on the page if not already created
      if (definition.translation) {
        createPersistentTooltip(word, definition.translation);
      }

    } catch (error) {
      console.error('Error adding to deck:', error);
      showBanner(`❌ Failed to add to deck: ${error.message}`, 'error');
    }
  }

  // ========================================
  // VIEW DECK
  // ========================================
  async function showDeck() {
    try {
      showBanner('🔄 Loading deck...', 'loading');

      const response = await apiFetch(`/deck/${USER_ID}`);
      if (!response.ok) {
        throw new Error('Failed to load deck');
      }

      const data = await response.json();
      const cards = data.cards;

      const banner = document.getElementById('rl-banner');
      if (banner) banner.remove();

      // Update menu with deck view
      const menuContent = document.getElementById('rl-menu-content');
      if (menuContent) {
        menuContent.innerHTML = renderDeckView(cards);
        attachDeckListeners(cards);
      }

    } catch (error) {
      console.error('Error loading deck:', error);
      showBanner(`❌ Failed to load deck: ${error.message}`, 'error');
    }
  }

  function renderDeckView(cards) {
    if (cards.length === 0) {
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
        ${cards.map(card => `
          <div class="rl-deck-card" data-card-id="${card.id}" style="
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px;
            transition: all 0.2s ease;
          ">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <div style="font-size: 16px; font-weight: 600; color: #333;">${card.word}</div>
              <span style="background: ${getCefrColor(card.cefr_level)}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${card.cefr_level}</span>
            </div>
            <div style="font-size: 13px; color: #666; margin-bottom: 8px;">${card.definition || ''}</div>
            <div style="font-size: 12px; color: #888; font-style: italic; margin-bottom: 12px;">"${card.context_sentence?.substring(0, 100) || ''}..."</div>
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
        `).join('')}
      </div>
    `;
  }

  function attachDeckListeners(cards) {
    const backBtn = document.getElementById('rl-back-to-analysis-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const menuContent = document.getElementById('rl-menu-content');
        if (menuContent) {
          menuContent.innerHTML = currentAnalysis ? renderAnalysisView() : renderInitialView();
          attachMenuListeners();
        }
      });
    }

    // Export buttons
    document.getElementById('rl-export-json-btn')?.addEventListener('click', () => exportDeck('json'));
    document.getElementById('rl-export-csv-btn')?.addEventListener('click', () => exportDeck('csv'));
    document.getElementById('rl-export-anki-btn')?.addEventListener('click', () => exportDeck('anki'));

    // Delete buttons
    document.querySelectorAll('.rl-delete-card-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const cardId = e.target.dataset.cardId;
        await deleteCard(cardId);
      });
    });
  }

  async function deleteCard(cardId) {
    try {
      const response = await apiFetch(`/deck/${cardId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete card');
      }

      console.log(`✅ Deleted card ${cardId}`);
      showBanner('✅ Card deleted', 'success');

      // Refresh deck view
      setTimeout(() => showDeck(), 500);

    } catch (error) {
      console.error('Error deleting card:', error);
      showBanner(`❌ Failed to delete card: ${error.message}`, 'error');
    }
  }

  async function exportDeck(format) {
    try {
      showBanner(`🔄 Exporting as ${format.toUpperCase()}...`, 'loading');

      const response = await apiFetch(`/deck/${USER_ID}/export?format=${format}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (format === 'json') {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `deck-${USER_ID}.json`);
      } else {
        const csv = await response.text();
        const blob = new Blob([csv], { type: 'text/csv' });
        downloadBlob(blob, `deck-${USER_ID}${format === 'anki' ? '-anki' : ''}.csv`);
      }

      showBanner(`✅ Exported as ${format.toUpperCase()}!`, 'success');

    } catch (error) {
      console.error('Export error:', error);
      showBanner(`❌ Export failed: ${error.message}`, 'error');
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ========================================
  // COMPREHENSION QUESTIONS
  // ========================================
  async function generateQuestions() {
    try {
      const levelSelect = document.getElementById('rl-question-level');
      const level = levelSelect.value;
      const examType = level === 'C1' || level === 'C2' ? 'DALF' : 'DELF';

      showBanner('🔄 Generating comprehension questions... (this may take 5-10 seconds)', 'loading');

      const articleElement = currentArticleElement || detectArticle();
      if (!articleElement) {
        showBanner('❌ Could not detect article content', 'error');
        return;
      }

      const text = articleElement.innerText;

      const response = await apiFetch('/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          url: window.location.href,
          level,
          examType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        showBanner(`❌ Failed to generate questions: ${error.error}`, 'error');
        return;
      }

      const result = await response.json();
      console.log('✅ Questions generated:', result);

      currentQuestions = {
        questions: result.questions,
        questionSetId: result.questionSetId,
        level,
        examType,
        cached: result.cached
      };
      currentQuestionIndex = 0;
      userAnswers = {};
      quizSubmitted = false;

      // Remove banner
      const banner = document.getElementById('rl-banner');
      if (banner) banner.remove();

      // Show questions view
      showQuestionsView();

      showBanner(`✅ Generated 10 questions${result.cached ? ' (cached)' : ''}!`, 'success');

    } catch (error) {
      console.error('Error generating questions:', error);
      showBanner(`❌ Error: ${error.message}. Make sure backend is running.`, 'error');
    }
  }

  function showQuestionsView() {
    const menuContent = document.getElementById('rl-menu-content');
    if (menuContent) {
      menuContent.innerHTML = renderQuestionsView();
      attachQuestionListeners();
    }
  }

  function renderQuestionsView() {
    if (!currentQuestions || !currentQuestions.questions) {
      return '<div style="padding: 20px; text-align: center;">No questions available</div>';
    }

    const question = currentQuestions.questions[currentQuestionIndex];
    const totalQuestions = currentQuestions.questions.length;
    const userScore = quizSubmitted ? calculateScore() : null;

    return `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="font-size: 18px; font-weight: 600;">Test de Compréhension</div>
            <div style="font-size: 12px; color: #888;">${currentQuestions.examType} ${currentQuestions.level} | Question ${currentQuestionIndex + 1} / ${totalQuestions}</div>
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

      ${renderQuestion(question, currentQuestionIndex)}

      <div style="display: flex; gap: 8px; margin: 16px 0;">
        <button id="rl-prev-question" style="
          flex: 1;
          background: ${currentQuestionIndex === 0 ? '#f5f5f5' : 'white'};
          color: ${currentQuestionIndex === 0 ? '#ccc' : '#333'};
          border: 1px solid #ddd;
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          cursor: ${currentQuestionIndex === 0 ? 'not-allowed' : 'pointer'};
        " ${currentQuestionIndex === 0 ? 'disabled' : ''}>← Précédent</button>

        <button id="rl-next-question" style="
          flex: 1;
          background: ${currentQuestionIndex === totalQuestions - 1 ? '#f5f5f5' : 'white'};
          color: ${currentQuestionIndex === totalQuestions - 1 ? '#ccc' : '#333'};
          border: 1px solid #ddd;
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          cursor: ${currentQuestionIndex === totalQuestions - 1 ? 'not-allowed' : 'pointer'};
        " ${currentQuestionIndex === totalQuestions - 1 ? 'disabled' : ''}>Suivant →</button>
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

  function renderQuestion(question, index) {
    const isAnswered = userAnswers.hasOwnProperty(question.id);
    const userAnswer = userAnswers[question.id];
    const isCorrect = quizSubmitted && userAnswer === question.correct_answer;

    let questionHTML = `
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #333;">
          ${index + 1}. ${question.question}
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
            <span style="font-size: 13px;">${key}. ${value}</span>
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
        <input type="text" id="answer_${question.id}" value="${userAnswer || ''}" ${quizSubmitted ? 'disabled' : ''}
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
          <div style="color: ${color}; font-weight: 600; margin-bottom: 4px;">${icon} Réponse correcte: ${question.correct_answer}</div>
          <div style="font-size: 12px; color: #666;">${question.explanation}</div>
        </div>
      `;
    }

    questionHTML += '</div>';
    return questionHTML;
  }

  function attachQuestionListeners() {
    // Back button
    const backBtn = document.getElementById('rl-back-from-questions');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        currentQuestions = null;
        currentQuestionIndex = 0;
        userAnswers = {};
        quizSubmitted = false;
        updateMenuContent();
      });
    }

    // Navigation buttons
    document.getElementById('rl-prev-question')?.addEventListener('click', () => {
      if (currentQuestionIndex > 0) {
        saveCurrentAnswer();
        currentQuestionIndex--;
        showQuestionsView();
      }
    });

    document.getElementById('rl-next-question')?.addEventListener('click', () => {
      if (currentQuestionIndex < currentQuestions.questions.length - 1) {
        saveCurrentAnswer();
        currentQuestionIndex++;
        showQuestionsView();
      }
    });

    // Check answers button
    document.getElementById('rl-check-answers-btn')?.addEventListener('click', async () => {
      saveCurrentAnswer();
      quizSubmitted = true;

      // Calculate score and save to deck
      const score = calculateScore();
      showBanner(`📊 Votre score: ${score.correct}/${score.total}`, 'success');

      // Add to deck
      await addQuestionsToDeck(score.correct);

      showQuestionsView();
    });

    // Retake button
    document.getElementById('rl-retake-quiz-btn')?.addEventListener('click', () => {
      userAnswers = {};
      quizSubmitted = false;
      currentQuestionIndex = 0;
      showQuestionsView();
    });

    // Export button
    document.getElementById('rl-export-questions-btn')?.addEventListener('click', () => {
      exportQuestions();
    });

    // Answer inputs
    const currentQuestion = currentQuestions.questions[currentQuestionIndex];

    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') {
      document.querySelectorAll(`input[name="answer_${currentQuestion.id}"]`).forEach(radio => {
        radio.addEventListener('change', () => {
          userAnswers[currentQuestion.id] = radio.value;
        });
      });
    } else if (currentQuestion.type === 'fill_blank' || currentQuestion.type === 'short_answer') {
      const input = document.getElementById(`answer_${currentQuestion.id}`);
      if (input) {
        input.addEventListener('input', () => {
          userAnswers[currentQuestion.id] = input.value;
        });
      }
    }
  }

  function saveCurrentAnswer() {
    const currentQuestion = currentQuestions.questions[currentQuestionIndex];

    if (currentQuestion.type === 'fill_blank' || currentQuestion.type === 'short_answer') {
      const input = document.getElementById(`answer_${currentQuestion.id}`);
      if (input) {
        userAnswers[currentQuestion.id] = input.value;
      }
    }
  }

  function calculateScore() {
    let correct = 0;
    let total = currentQuestions.questions.length;

    for (const question of currentQuestions.questions) {
      const userAnswer = userAnswers[question.id];

      if (question.type === 'fill_blank' || question.type === 'short_answer') {
        if (userAnswer && userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()) {
          correct++;
        }
      } else {
        if (userAnswer === question.correct_answer) {
          correct++;
        }
      }
    }

    return { correct, total };
  }

  async function addQuestionsToDeck(userScore) {
    try {
      await apiFetch('/questions/deck/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: USER_ID,
          questionSetId: currentQuestions.questionSetId,
          questions: currentQuestions.questions,
          level: currentQuestions.level,
          examType: currentQuestions.examType,
          sourceUrl: window.location.href,
          sourceTitle: document.title,
          userScore
        })
      });

      console.log('✅ Questions added to deck');
    } catch (error) {
      console.error('Error adding to deck:', error);
    }
  }

  async function exportQuestions() {
    try {
      showBanner('🔄 Exporting questions...', 'loading');

      const response = await apiFetch(`/questions/deck/${USER_ID}/export?format=anki`);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const csv = await response.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprehension-deck-${USER_ID}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      showBanner('✅ Exported to Anki CSV!', 'success');

    } catch (error) {
      console.error('Export error:', error);
      showBanner(`❌ Export failed: ${error.message}`, 'error');
    }
  }

  // ========================================
  // PERSISTENT TOOLTIPS
  // ========================================
  function createPersistentTooltip(word, translation) {
    // Store in our persistent tooltips object
    const normalizedWord = word.toLowerCase().trim();
    if (persistentTooltips[normalizedWord]) {
      console.log(`⚠️ Word "${word}" already in persistentTooltips, but will re-highlight anyway`);
      // Still highlight in case page content changed or word wasn't actually highlighted
      highlightWordOnPage(word, translation);
      return;
    }

    persistentTooltips[normalizedWord] = translation;
    console.log(`✅ Created persistent tooltip for "${word}": "${translation}"`);

    // Find all instances of this word in the page and add tooltips
    highlightWordOnPage(word, translation);
  }

  function highlightWordOnPage(word, translation) {
    const articleElement = detectArticle();
    if (!articleElement) {
      console.warn('⚠️ No article element detected, falling back to document.body');
      // Fallback to document.body if no article detected
      const bodyElement = document.body;
      if (!bodyElement) {
        console.error('❌ Cannot highlight - no body element');
        return;
      }
      highlightInElement(bodyElement, word, translation);
      return;
    }

    highlightInElement(articleElement, word, translation);
  }

  function highlightInElement(rootElement, word, translation) {
    console.log(`🎨 Highlighting word "${word}" with translation "${translation}"`);

    // Use TreeWalker to find text nodes
    const walker = document.createTreeWalker(
      rootElement,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip if parent is already highlighted or is script/style
          if (node.parentElement.classList.contains('rl-highlighted-word') ||
              node.parentElement.tagName === 'SCRIPT' ||
              node.parentElement.tagName === 'STYLE' ||
              node.parentElement.closest('#rl-menu') ||
              node.parentElement.closest('#rl-button') ||
              node.parentElement.closest('#rl-selection-popup')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodesToReplace = [];
    const wordPattern = new RegExp(`\\b(${escapeRegExp(word)})\\b`, 'gi');

    // Collect all text nodes that contain the word
    let node;
    while (node = walker.nextNode()) {
      if (wordPattern.test(node.textContent)) {
        nodesToReplace.push(node);
      }
    }

    console.log(`📍 Found ${nodesToReplace.length} text nodes containing "${word}"`);

    // Replace text nodes with highlighted spans
    nodesToReplace.forEach(textNode => {
      const parent = textNode.parentElement;
      const newHTML = textNode.textContent.replace(wordPattern, (match) => {
        return `<span class="rl-highlighted-word" data-translation="${escapeHtml(translation)}" style="
          background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
          border-bottom: 2px solid #FF9800;
          padding: 2px 4px;
          border-radius: 3px;
          cursor: help;
          position: relative;
        ">${match}</span>`;
      });

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newHTML;

      while (tempDiv.firstChild) {
        parent.insertBefore(tempDiv.firstChild, textNode);
      }
      parent.removeChild(textNode);
    });

    // Add hover tooltips to all highlighted words
    document.querySelectorAll('.rl-highlighted-word').forEach(span => {
      if (!span.dataset.listenerAttached) {
        span.dataset.listenerAttached = 'true';

        span.addEventListener('mouseenter', function(e) {
          const tooltipText = this.dataset.translation;
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
          tooltip.textContent = tooltipText;

          document.body.appendChild(tooltip);

          const rect = this.getBoundingClientRect();
          tooltip.style.left = `${rect.left + window.scrollX}px`;
          tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        });

        span.addEventListener('mouseleave', function() {
          const tooltip = document.getElementById('rl-word-tooltip');
          if (tooltip) tooltip.remove();
        });
      }
    });
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========================================
  // BANNER
  // ========================================
  function showBanner(message, type = 'info', autoRemove = true) {
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
    banner.innerHTML = message;
    document.body.prepend(banner);

    if (autoRemove && type !== 'loading') {
      setTimeout(() => banner.remove(), 5000);
    }

    return banner;
  }

  // ========================================
  // INITIALIZE
  // ========================================
  showRLButton();

  // Restore selection mode if it was active
  if (selectionModeActive) {
    console.log('🔄 Restoring selection mode from localStorage');
    enableSelectionMode();
  }

})();
