/**
 * Read & Learn Extension - Content Script Entry Point
 * Thin orchestration layer that imports and wires together modular components
 *
 * Security note: All innerHTML usage in this file and imported modules uses
 * sanitizeForDisplay() from utils.js to escape HTML entities before rendering.
 * This prevents XSS from user input or API responses.
 */

(async function() {
  'use strict';

  console.log('🚀 Read & Learn v2.0 starting...');

  // ========================================
  // EARLY CHECKS
  // ========================================

  // Check if this is the demo page
  if (window.READANDLEARN_DEMO_PAGE === true ||
      document.documentElement.getAttribute('data-readandlearn-demo') === 'true' ||
      document.querySelector('meta[name="readandlearn-demo"]')) {
    console.log('⚠️ Demo page detected - extension disabled');
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
    console.log('⚠️ Read & Learn already running');
    return;
  }
  window.readAndLearnInjected = true;

  // ========================================
  // LOAD MODULES
  // ========================================

  let utils, api, language, pdf, ui;

  try {
    // Dynamic imports from extension resources
    const modulePath = (name) => chrome.runtime.getURL(`modules/${name}.js`);

    [utils, api, language, pdf, ui] = await Promise.all([
      import(modulePath('utils')),
      import(modulePath('api')),
      import(modulePath('language')),
      import(modulePath('pdf')),
      import(modulePath('ui'))
    ]);

    console.log('✅ Modules loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load modules:', error);
    return;
  }

  // ========================================
  // STATE
  // ========================================

  const state = {
    currentAnalysis: null,
    menuExpanded: false,
    selectionModeActive: localStorage.getItem('rl-selection-mode') === 'true',
    currentArticleElement: null,
    persistentTooltips: {},
    currentQuestions: null,
    currentQuestionIndex: 0,
    userAnswers: {},
    quizSubmitted: false
  };

  const USER_ID = utils.getUserId();

  // ========================================
  // ARTICLE DETECTION
  // ========================================

  function detectArticle() {
    const selectors = ['article', 'main', '[role="main"]', '.article', '.post',
                       '.content', '.entry-content', '#article', '#content'];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.innerText.length > 500) return el;
    }

    // Fallback: largest div
    const divs = Array.from(document.querySelectorAll('div'))
      .sort((a, b) => b.innerText.length - a.innerText.length);
    return divs.find(d => d.innerText.length > 1000) || null;
  }

  // ========================================
  // CORE ACTIONS
  // ========================================

  async function analyzeContent() {
    const isPdf = pdf.isPdfContext();
    ui.showBanner(isPdf ? '📄 Extracting PDF...' : '🔄 Detecting article...', 'loading');

    let text;
    if (isPdf) {
      text = await pdf.extractPdfText(window.location.href);
      if (!text || text.length < 100) {
        ui.showBanner('❌ Could not extract PDF text', 'error');
        return;
      }
    } else {
      const article = detectArticle();
      if (!article) {
        ui.showBanner('❌ Could not detect article', 'error');
        return;
      }
      state.currentArticleElement = article;
      text = article.innerText;
    }

    // Detect language if not manually set
    if (!language.getManualOverride()) {
      ui.showBanner('🔄 Detecting language...', 'loading');
      const detected = await language.detectLanguage(text.substring(0, 5000));
      if (detected) {
        language.setCurrentLanguage(detected);
      } else {
        ui.showBanner('❌ Unsupported language', 'error');
        return;
      }
    }

    const langCode = language.getEffectiveLanguage();
    const langName = language.getEffectiveLanguageName();
    ui.showBanner(`🔄 Analyzing ${langName}...`, 'loading');

    try {
      const result = await api.analyzeText(text, langCode, window.location.href);
      state.currentAnalysis = result;
      ui.removeBanner();
      updateMenu();
      ui.showBanner(`✅ ${result.cefr_level} level${result.cached ? ' (cached)' : ''}`, 'success');
    } catch (error) {
      ui.showBanner(`❌ ${error.message}`, 'error');
    }
  }

  async function handleWordSelection(word, x, y) {
    const selection = window.getSelection();
    const context = selection.rangeCount > 0
      ? selection.getRangeAt(0).startContainer.parentElement?.innerText?.substring(0, 200) || ''
      : '';

    const popup = ui.createSelectionPopup(word, x, y, {
      onGetMeaning: async () => {
        try {
          const result = await api.defineWord(word, context, language.getEffectiveLanguage());
          highlightWord(word, result.translation);
          return result;
        } catch (error) {
          throw error;
        }
      },
      onAddToDeck: async (meaning) => {
        try {
          let definition = meaning;
          if (!definition) {
            definition = await api.defineWord(word, context, language.getEffectiveLanguage());
          }

          await api.addToDeckApi({
            userId: USER_ID,
            word,
            phrase: word.split(/\s+/).length > 1 ? word : null,
            contextSentence: context.substring(0, 300),
            translation: definition.translation,
            definition: definition.definition,
            cefrLevel: definition.cefr,
            language: language.getEffectiveLanguage(),
            sourceUrl: window.location.href,
            sourceTitle: document.title,
            tags: []
          });

          ui.showBanner(`✅ Added "${word}" to deck!`, 'success');
          if (definition.translation) {
            highlightWord(word, definition.translation);
          }
        } catch (error) {
          ui.showBanner(`❌ ${error.message}`, 'error');
        }
      }
    });

    document.body.appendChild(popup);
  }

  function highlightWord(word, translation) {
    const normalized = word.toLowerCase().trim();
    if (state.persistentTooltips[normalized]) return;
    state.persistentTooltips[normalized] = translation;

    const root = state.currentArticleElement || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (parent.classList.contains('rl-highlighted-word') ||
            parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' ||
            parent.closest('#rl-menu, #rl-button, #rl-selection-popup')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const pattern = new RegExp(`\\b(${utils.escapeRegExp(word)})\\b`, 'gi');
    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (pattern.test(node.textContent)) nodes.push(node);
    }

    nodes.forEach(textNode => {
      const parts = textNode.textContent.split(pattern);
      const fragment = document.createDocumentFragment();

      parts.forEach(part => {
        if (!part) return;
        if (pattern.test(part)) {
          const span = ui.createHighlightedWord(part, translation);
          fragment.appendChild(span);
          pattern.lastIndex = 0;
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
      });

      textNode.parentElement.replaceChild(fragment, textNode);
    });
  }

  // ========================================
  // MENU MANAGEMENT
  // ========================================

  function updateMenu() {
    const content = document.getElementById('rl-menu-content');
    if (!content) return;

    // Note: renderAnalysisView and renderInitialView use sanitizeForDisplay
    // for all dynamic content before setting innerHTML
    if (state.currentAnalysis) {
      content.innerHTML = ui.renderAnalysisView(state.currentAnalysis, state.selectionModeActive);
    } else {
      content.innerHTML = ui.renderInitialView(state.selectionModeActive);
    }
    attachMenuListeners();
  }

  function attachMenuListeners() {
    document.getElementById('rl-analyze-btn')?.addEventListener('click', analyzeContent);
    document.getElementById('rl-view-deck-btn')?.addEventListener('click', showDeck);
    document.getElementById('rl-selection-mode-btn')?.addEventListener('click', toggleSelectionMode);
    document.getElementById('rl-generate-questions-btn')?.addEventListener('click', generateQuestions);

    const langSelect = document.getElementById('rl-language-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        language.setManualOverride(e.target.value);
        if (state.currentAnalysis) analyzeContent();
      });
    }
  }

  function toggleSelectionMode() {
    state.selectionModeActive = !state.selectionModeActive;
    localStorage.setItem('rl-selection-mode', state.selectionModeActive.toString());

    if (state.selectionModeActive) {
      ui.showBanner('✨ Select words to add to deck', 'info', false);
      document.addEventListener('mouseup', onTextSelection);
    } else {
      document.removeEventListener('mouseup', onTextSelection);
      document.getElementById('rl-selection-popup')?.remove();
    }
    updateMenu();
  }

  function onTextSelection(e) {
    if (!state.selectionModeActive) return;
    if (e.target.closest('#rl-menu, #rl-selection-popup')) return;

    const text = window.getSelection().toString().trim();
    document.getElementById('rl-selection-popup')?.remove();

    if (text) handleWordSelection(text, e.pageX, e.pageY);
  }

  async function showDeck() {
    try {
      ui.showBanner('🔄 Loading deck...', 'loading');
      const data = await api.fetchDeck(USER_ID);
      ui.removeBanner();

      const content = document.getElementById('rl-menu-content');
      if (content) {
        // Note: renderDeckView uses sanitizeForDisplay for all card data
        content.innerHTML = ui.renderDeckView(data.cards, utils.getCefrColor);
        attachDeckListeners(data.cards);
      }
    } catch (error) {
      ui.showBanner(`❌ ${error.message}`, 'error');
    }
  }

  function attachDeckListeners(cards) {
    document.getElementById('rl-back-to-analysis-btn')?.addEventListener('click', updateMenu);
    document.getElementById('rl-export-json-btn')?.addEventListener('click', () => exportDeck('json'));
    document.getElementById('rl-export-csv-btn')?.addEventListener('click', () => exportDeck('csv'));
    document.getElementById('rl-export-anki-btn')?.addEventListener('click', () => exportDeck('anki'));

    document.querySelectorAll('.rl-delete-card-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api.deleteCardApi(btn.dataset.cardId);
          ui.showBanner('✅ Card deleted', 'success');
          setTimeout(showDeck, 500);
        } catch (error) {
          ui.showBanner(`❌ ${error.message}`, 'error');
        }
      });
    });
  }

  async function exportDeck(format) {
    try {
      ui.showBanner(`🔄 Exporting ${format.toUpperCase()}...`, 'loading');
      const data = await api.exportDeckApi(USER_ID, format);

      const blob = format === 'json'
        ? new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        : new Blob([data], { type: 'text/csv' });

      utils.downloadBlob(blob, `deck-${USER_ID}${format === 'anki' ? '-anki' : ''}.${format === 'json' ? 'json' : 'csv'}`);
      ui.showBanner(`✅ Exported!`, 'success');
    } catch (error) {
      ui.showBanner(`❌ ${error.message}`, 'error');
    }
  }

  async function generateQuestions() {
    const levelSelect = document.getElementById('rl-question-level');
    if (!levelSelect) return;

    const level = levelSelect.value;
    const examType = ['C1', 'C2'].includes(level) ? 'DALF' : 'DELF';

    ui.showBanner('🔄 Generating questions...', 'loading');

    const article = state.currentArticleElement || detectArticle();
    if (!article) {
      ui.showBanner('❌ No article detected', 'error');
      return;
    }

    try {
      const result = await api.generateQuestionsApi(article.innerText, window.location.href, level, examType);
      state.currentQuestions = { ...result, level, examType };
      state.currentQuestionIndex = 0;
      state.userAnswers = {};
      state.quizSubmitted = false;

      ui.removeBanner();
      showQuestionsView();
      ui.showBanner(`✅ Generated ${result.questions.length} questions${result.cached ? ' (cached)' : ''}`, 'success');
    } catch (error) {
      ui.showBanner(`❌ ${error.message}`, 'error');
    }
  }

  function showQuestionsView() {
    const content = document.getElementById('rl-menu-content');
    if (!content || !state.currentQuestions) return;

    // Note: renderQuestionsView uses sanitizeForDisplay for all question data
    content.innerHTML = ui.renderQuestionsView(
      state.currentQuestions,
      state.currentQuestionIndex,
      state.userAnswers,
      state.quizSubmitted
    );
    attachQuestionListeners();
  }

  function attachQuestionListeners() {
    document.getElementById('rl-back-from-questions')?.addEventListener('click', () => {
      state.currentQuestions = null;
      updateMenu();
    });

    document.getElementById('rl-prev-question')?.addEventListener('click', () => {
      if (state.currentQuestionIndex > 0) {
        saveCurrentAnswer();
        state.currentQuestionIndex--;
        showQuestionsView();
      }
    });

    document.getElementById('rl-next-question')?.addEventListener('click', () => {
      if (state.currentQuestionIndex < state.currentQuestions.questions.length - 1) {
        saveCurrentAnswer();
        state.currentQuestionIndex++;
        showQuestionsView();
      }
    });

    document.getElementById('rl-check-answers-btn')?.addEventListener('click', async () => {
      saveCurrentAnswer();
      state.quizSubmitted = true;
      const score = calculateScore();
      ui.showBanner(`📊 Score: ${score.correct}/${score.total}`, 'success');

      await api.addQuestionsToDeckApi({
        userId: USER_ID,
        questionSetId: state.currentQuestions.questionSetId,
        questions: state.currentQuestions.questions,
        level: state.currentQuestions.level,
        examType: state.currentQuestions.examType,
        sourceUrl: window.location.href,
        sourceTitle: document.title,
        userScore: score.correct
      });

      showQuestionsView();
    });

    document.getElementById('rl-retake-quiz-btn')?.addEventListener('click', () => {
      state.userAnswers = {};
      state.quizSubmitted = false;
      state.currentQuestionIndex = 0;
      showQuestionsView();
    });

    document.getElementById('rl-export-questions-btn')?.addEventListener('click', async () => {
      try {
        ui.showBanner('🔄 Exporting...', 'loading');
        const csv = await api.exportQuestionsApi(USER_ID);
        utils.downloadBlob(new Blob([csv], { type: 'text/csv' }), `questions-${USER_ID}.csv`);
        ui.showBanner('✅ Exported!', 'success');
      } catch (error) {
        ui.showBanner(`❌ ${error.message}`, 'error');
      }
    });

    // Answer input listeners
    const q = state.currentQuestions.questions[state.currentQuestionIndex];
    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      document.querySelectorAll(`input[name="answer_${q.id}"]`).forEach(radio => {
        radio.addEventListener('change', () => { state.userAnswers[q.id] = radio.value; });
      });
    } else {
      const input = document.getElementById(`answer_${q.id}`);
      input?.addEventListener('input', () => { state.userAnswers[q.id] = input.value; });
    }
  }

  function saveCurrentAnswer() {
    const q = state.currentQuestions.questions[state.currentQuestionIndex];
    if (q.type === 'fill_blank' || q.type === 'short_answer') {
      const input = document.getElementById(`answer_${q.id}`);
      if (input) state.userAnswers[q.id] = input.value;
    }
  }

  function calculateScore() {
    let correct = 0;
    for (const q of state.currentQuestions.questions) {
      const answer = state.userAnswers[q.id];
      if (q.type === 'fill_blank' || q.type === 'short_answer') {
        if (answer?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) correct++;
      } else if (answer === q.correct_answer) {
        correct++;
      }
    }
    return { correct, total: state.currentQuestions.questions.length };
  }

  // ========================================
  // INITIALIZE
  // ========================================

  // Create R/L button
  const button = ui.createRLButton(() => {
    state.menuExpanded = !state.menuExpanded;
    if (state.menuExpanded) {
      // Note: Menu content is generated using sanitized render functions
      const menu = ui.createMenu(
        state.currentAnalysis
          ? ui.renderAnalysisView(state.currentAnalysis, state.selectionModeActive)
          : ui.renderInitialView(state.selectionModeActive),
        () => { state.menuExpanded = false; }
      );
      document.body.appendChild(menu);
      attachMenuListeners();
    } else {
      ui.hideMenu();
    }
  });
  document.body.appendChild(button);

  // Restore selection mode
  if (state.selectionModeActive) {
    console.log('🔄 Restoring selection mode');
    document.addEventListener('mouseup', onTextSelection);
  }

  console.log('✅ Read & Learn activated!');
})();
