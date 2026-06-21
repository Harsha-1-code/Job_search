/**
 * Teak AI Assistant Chatbot — Standalone Module
 * Extracted and rewritten to fix Chromium-based browser loading issues.
 * Uses explicit DOM-ready binding and avoids nested-scope conflicts.
 */

(function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────────────────────

  const CHAT_FAQ = {
    'how do i tailor my resume': 'To tailor your resume, go to the Jobs tab, find a job you like, and click "Tailor Resume" (or press Space). The AI Tailoring Suite panel will slide open where you can generate an optimized resume or cover letter for that specific job.',
    'how to apply for a job': 'From the Jobs tab, swipe right or click "Apply" to save a job to your Applications pipeline. You can also click "Apply on Careers Page" to visit the company\'s careers site directly.',
    'what is the outreach console': 'The Outreach Console lets you generate personalized LinkedIn DMs for recruiters at companies you\'re interested in. Select a recruiter, click "Generate via Gemini", and the AI will draft a custom message you can copy.',
    'how to use filters': 'Click the "Filters" button in the top search bar to filter jobs by type (intern/fulltime), ATS platform (Greenhouse/Lever), match score, and location.',
    'how to import jobs': 'Click the "Import Job (Bulk Scrape)" button at the top of the dashboard. This connects to the Supabase database and fetches fresh job listings.',
    'what is the email section': 'The Emails section helps you manage post-application communications. You can view inbound emails and generate AI-drafted replies for interview scheduling, follow-ups, or thank-you notes.',
    'how to save api key': 'Go to the "Profile & Keys" section in the sidebar. Enter your Gemini API key and click "Save Key". It\'s stored locally in your browser only.',
    'how to track applications': 'The Applications tab shows a Kanban board with columns: Saved Deck, Applied, Interviewing, and Offers & Decisions. Drag and drop cards between columns to track your progress.',
    'what is ats score': 'The ATS (Applicant Tracking System) Compatibility Index shows how well your resume matches a job\'s requirements. Higher scores mean better keyword alignment with the job posting.',
    'how to skip a job': 'From the Jobs tab, swipe left or click "Pass" to skip a job. Skipped jobs are tracked in the "Skipped" section where you can restore them back to the deck if you change your mind.',
    'how to view skipped jobs': 'Click on "Skipped" in the left sidebar to see your last 30 skipped jobs. You can restore any job back to the active deck.',
    'how to upload resume': 'On the profile setup page, you can upload a PDF, DOCX, or TXT file. The text will be auto-extracted for AI parsing. You can also paste text manually using the toggle.',
  };

  const AI_SERVER_URL =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://server-xi-sable-49.vercel.app';

  // ─── State ───────────────────────────────────────────────────────────────────

  let isChatOpen = false;
  let chatMessages = []; // { role: 'user' | 'bot', text: string }

  // ─── DOM Refs (populated in init) ────────────────────────────────────────────

  let fab, panel, messagesContainer, suggestionsContainer, chatInput, sendBtn;

  // ─── Utility ─────────────────────────────────────────────────────────────────

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function stripMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^---+$/gm, '')
      .replace(/^\*\*\*+$/gm, '')
      .replace(/^\*\s/gm, '- ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ─── Message Rendering ───────────────────────────────────────────────────────

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function addUserMessage(text) {
    chatMessages.push({ role: 'user', text });
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.textContent = text;
    messagesContainer.appendChild(bubble);
    scrollToBottom();
  }

  function addBotMessage(text) {
    chatMessages.push({ role: 'bot', text });
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot';
    bubble.textContent = text;
    messagesContainer.appendChild(bubble);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const existing = document.getElementById('teak-typing-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.className = 'chat-typing-indicator';
    indicator.id = 'teak-typing-indicator';
    indicator.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    messagesContainer.appendChild(indicator);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('teak-typing-indicator');
    if (indicator) indicator.remove();
  }

  // ─── Suggestion Chips ────────────────────────────────────────────────────────

  function renderSuggestions(chips) {
    if (!suggestionsContainer) return;
    suggestionsContainer.innerHTML = '';
    chips.forEach(chip => {
      const btn = document.createElement('button');
      btn.className = 'chat-suggestion-chip';
      btn.textContent = chip;
      btn.addEventListener('click', () => {
        chatInput.value = chip;
        sendMessage();
      });
      suggestionsContainer.appendChild(btn);
    });
  }

  function renderContextualSuggestions(lastQuery) {
    const suggestions = [];
    if (!lastQuery.includes('tailor'))   suggestions.push('How do I tailor my resume?');
    if (!lastQuery.includes('apply'))    suggestions.push('How to apply for a job?');
    if (!lastQuery.includes('filter'))   suggestions.push('How to use filters?');
    if (!lastQuery.includes('skip'))     suggestions.push('How to view skipped jobs?');
    renderSuggestions(suggestions.slice(0, 3));
  }

  // ─── FAQ Matching ─────────────────────────────────────────────────────────────

  function levenshteinSimilar(a, b) {
    const wordsA = a.split(/\s+/);
    const wordsB = b.split(/\s+/);
    const overlap = wordsA.filter(w => wordsB.includes(w) && w.length > 2);
    return overlap.length >= 2;
  }

  // ─── AI Backend Call ─────────────────────────────────────────────────────────

  async function callAIBackend(endpoint, payload) {
    const response = await fetch(`${AI_SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errData.error || `Server error ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'AI generation failed');
    return data;
  }

  // ─── Bot Response Handler ────────────────────────────────────────────────────

  async function handleBotResponse(userText) {
    const lowerText = userText.toLowerCase().replace(/[?!.]/g, '').trim();

    // Check FAQ first (fast local path)
    let faqAnswer = null;
    for (const [key, answer] of Object.entries(CHAT_FAQ)) {
      if (lowerText.includes(key) || key.includes(lowerText) || levenshteinSimilar(lowerText, key)) {
        faqAnswer = answer;
        break;
      }
    }

    if (faqAnswer) {
      showTypingIndicator();
      await delay(600 + Math.random() * 400);
      removeTypingIndicator();
      addBotMessage(faqAnswer);
      renderContextualSuggestions(lowerText);
      return;
    }

    // Fall through to AI backend
    showTypingIndicator();
    try {
      const systemPrompt = `You are Teak AI Assistant, a helpful chatbot for the Teak job search platform. Teak is an AI-powered job board that helps candidates find tech jobs, tailor resumes using LLMs, manage applications via a Kanban board, generate outreach messages for recruiters, and draft email replies. The app has these sections: Jobs (swipe deck), Applications (Kanban), Outreach (recruiter messaging), Emails (follow-up drafts), Skipped (last 30 passed jobs), and Profile & Keys (settings). Keep answers concise and helpful. If asked about something unrelated to job searching or the app, politely redirect.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...chatMessages.map(msg => ({
          role: msg.role === 'bot' ? 'assistant' : msg.role,
          content: msg.text
        }))
      ];

      const result = await callAIBackend('/api/chat', { messages });
      removeTypingIndicator();
      addBotMessage(stripMarkdown(result.text));
    } catch (err) {
      removeTypingIndicator();
      addBotMessage("I can help with questions about using Teak! Try asking about how to tailor your resume, apply for jobs, use the outreach console, track applications, or manage your profile.");
      renderSuggestions([
        'How do I tailor my resume?',
        'How to track applications?',
        'How to view skipped jobs?',
        'How to upload resume?'
      ]);
    }
  }

  // ─── Send Message ────────────────────────────────────────────────────────────

  function sendMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;

    addUserMessage(text);
    chatInput.value = '';
    if (suggestionsContainer) suggestionsContainer.innerHTML = '';

    handleBotResponse(text);
  }

  // ─── Toggle Chat Panel ───────────────────────────────────────────────────────

  function toggleChat() {
    isChatOpen = !isChatOpen;

    // Toggle FAB icon animation
    if (fab) fab.classList.toggle('open', isChatOpen);
    // Toggle panel visibility
    if (panel) panel.classList.toggle('open', isChatOpen);

    if (isChatOpen && chatInput) {
      // Small delay to let the panel transition finish before focusing
      setTimeout(() => chatInput.focus(), 320);
    }
  }

  // ─── Initialise ──────────────────────────────────────────────────────────────

  function init() {
    fab               = document.getElementById('chat-fab');
    panel             = document.getElementById('chat-panel');
    messagesContainer = document.getElementById('chat-messages');
    suggestionsContainer = document.getElementById('chat-suggestions');
    chatInput         = document.getElementById('chat-input');
    sendBtn           = document.getElementById('chat-send-btn');

    // Guard: abort silently if the chatbot HTML isn't present
    if (!fab || !panel || !messagesContainer || !chatInput || !sendBtn) {
      console.warn('[Teak Chatbot] Required DOM elements not found — chatbot not initialised.');
      return;
    }

    // Seed welcome message (only if messages area is empty — avoids double-init)
    if (messagesContainer.children.length === 0) {
      addBotMessage("Hey there! 👋 I'm the Teak AI Assistant. I can help you with:\n\n• How to tailor your resume\n• Navigating the app\n• Application tips\n• Understanding features\n\nWhat would you like to know?");
    }

    renderSuggestions([
      'How do I tailor my resume?',
      'How to apply for a job?',
      'How to use filters?',
      'What is the outreach console?'
    ]);

    // ── Event bindings ──────────────────────────────────────────────────────

    // FAB click — toggle panel
    fab.addEventListener('click', toggleChat);

    // Send button click
    sendBtn.addEventListener('click', sendMessage);

    // Enter key in input
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Close panel when clicking outside of it (Chromium-safe approach)
    document.addEventListener('click', function (e) {
      if (!isChatOpen) return;
      if (!panel.contains(e.target) && !fab.contains(e.target)) {
        isChatOpen = false;
        fab.classList.remove('open');
        panel.classList.remove('open');
      }
    });
  }

  // ─── Entry Point ─────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM is already ready (e.g. script loaded with defer/at end of body)
    init();
  }

})();
