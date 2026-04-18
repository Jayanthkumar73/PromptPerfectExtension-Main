// content.js — Prompt Perfect overlay for textboxes

(function () {
  "use strict";

  // ─── State ───────────────────────────────────────────
  let activeTextbox = null;
  let overlay = null;
  let triggerBtn = null;
  let isOverlayVisible = false;
  let savedPromptsVisible = false;
  let feedbackVisible = false;
  let isListening = false;
  let recognition = null;

  // ─── Platform Detection ──────────────────────────────
  const PLATFORM_PATTERNS = {
    chatgpt: {
      patterns: [/chat\.openai\.com/, /chatgpt\.com/],
      name: "ChatGPT",
      selector: '#prompt-textarea, textarea[placeholder*="Message"], [data-testid="text-input"]'
    },
    claude: {
      patterns: [/claude\.ai/],
      name: "Claude",
      selector: '[contenteditable="true"][aria-label*="Message"], [contenteditable="true"][data-placeholder]'
    },
    gemini: {
      patterns: [/gemini\.google\.com/],
      name: "Gemini",
      selector: '[contenteditable="true"][aria-label*="input"], textarea[placeholder*="Ask"], rich-textarea'
    },
    copilot: {
      patterns: [/copilot\.microsoft\.com/, /bing\.com\/chat/],
      name: "Copilot",
      selector: '[data-testid="chat-input"], textarea[placeholder*="Ask"], #userInput'
    },
    deepseek: {
      patterns: [/deepseek\.com/, /chat\.deepseek\.com/],
      name: "DeepSeek",
      selector: 'textarea[placeholder*="Ask"], textarea[placeholder*="message"], [contenteditable="true"]'
    },
    zai: {
      patterns: [/chat\.z\.ai/, /z\.ai/],
      name: "Zai",
      selector: 'textarea, [contenteditable="true"]'
    },
    lmarena: {
      patterns: [/lmarena\.ai/, /arena\.ai/],
      name: "LM Arena",
      selector: 'textarea[placeholder*="message"], textarea[placeholder*="prompt"], [contenteditable="true"]'
    },
    kimi: {
      patterns: [/kimi\.moonshot\.cn/, /kimi\.ai/],
      name: "Kimi",
      selector: 'textarea, [contenteditable="true"], [data-testid="chat-input"]'
    },
    manus: {
      patterns: [/manus\.im/, /manus\.ai/],
      name: "Manus",
      selector: 'textarea, [contenteditable="true"]'
    }
  };

  function detectPlatform() {
    const url = window.location.href;
    for (const [key, config] of Object.entries(PLATFORM_PATTERNS)) {
      if (config.patterns.some(pattern => pattern.test(url))) {
        return key;
      }
    }
    return "general";
  }

  function getPlatformName(platform) {
    return PLATFORM_PATTERNS[platform]?.name || "General";
  }

  // ─── Helpers ─────────────────────────────────────────
  function isEditable(el) {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag === "textarea") return true;
    if (tag === "input" && el.type === "text") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function getTextFromBox(el) {
    if (el.isContentEditable) return el.innerText;
    return el.value || "";
  }

  function setTextInBox(el, text) {
    if (el.isContentEditable) {
      el.innerText = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      // Use native setter to bypass React wrappers
      const nativeSetter = Object.getOwnPropertyDescriptor(
        el.tagName === "TEXTAREA"
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(el, text);
      } else {
        el.value = text;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        { apiKey: "", model: "gemini-2.5-flash" },
        resolve
      );
    });
  }

  function getSavedPrompts() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ savedPrompts: [] }, (data) =>
        resolve(data.savedPrompts)
      );
    });
  }

  function savePrompt(text) {
    return getSavedPrompts().then((prompts) => {
      prompts.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text,
        createdAt: new Date().toISOString(),
      });
      return new Promise((resolve) => {
        chrome.storage.local.set({ savedPrompts: prompts }, resolve);
      });
    });
  }

  function deletePrompt(id) {
    return getSavedPrompts().then((prompts) => {
      const filtered = prompts.filter((p) => p.id !== id);
      return new Promise((resolve) => {
        chrome.storage.local.set({ savedPrompts: filtered }, resolve);
      });
    });
  }

  // ─── Trigger Button ──────────────────────────────────
  function createTriggerButton() {
    const btn = document.createElement("div");
    btn.id = "pp-trigger";
    btn.textContent = "✦";
    btn.title = "Prompt Perfect";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleOverlay();
    });
    return btn;
  }

  function positionTrigger(textbox) {
    if (!triggerBtn) return;
    const rect = textbox.getBoundingClientRect();
    triggerBtn.style.top = `${rect.top + window.scrollY + 6}px`;
    triggerBtn.style.left = `${rect.right + window.scrollX - 32}px`;
  }

  function showTrigger(textbox) {
    if (!triggerBtn) {
      triggerBtn = createTriggerButton();
      document.body.appendChild(triggerBtn);
    }
    activeTextbox = textbox;
    positionTrigger(textbox);
    triggerBtn.style.display = "flex";
  }

  function hideTrigger() {
    if (triggerBtn) triggerBtn.style.display = "none";
  }

  // ─── Overlay Panel ───────────────────────────────────
  function createOverlay() {
    const detectedPlatform = detectPlatform();
    const platformName = getPlatformName(detectedPlatform);

    const panel = document.createElement("div");
    panel.id = "pp-overlay";
    panel.dataset.platform = detectedPlatform;
    panel.innerHTML = `
      <div class="pp-header">
        <span class="pp-brand">✦ Prompt Perfect</span>
        <select class="pp-model-select">
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
          <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
          <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          <option value="gemini-2.0-flash-thinking-exp">Gemini 2.0 Flash Thinking</option>
        </select>
        <button class="pp-close-btn" title="Close">✕</button>
      </div>

      <div class="pp-platform-badge">
        <span class="pp-platform-indicator">🎯 ${platformName}</span>
        <span class="pp-auto-detect">Auto-detected</span>
      </div>

      <div class="pp-actions">
        <button class="pp-action-btn pp-perfect-btn">
          <span class="pp-action-icon">✦</span> Perfect
        </button>
        <button class="pp-action-btn pp-feedback-btn">
          <span class="pp-action-icon">💬</span> Feedback
        </button>
        <button class="pp-action-btn pp-save-btn">
          <span class="pp-action-icon">💾</span> Save Prompt
        </button>
      </div>

      <div class="pp-feedback-area" style="display:none;">
        <textarea class="pp-feedback-input" placeholder="Add feedback to improve the prompt..." rows="2"></textarea>
        <button class="pp-feedback-submit">Apply Feedback</button>
      </div>

      <div class="pp-input-row">
        <input type="text" class="pp-prompt-input" placeholder="Or type a new prompt here..." />
        <button class="pp-insert-btn" title="Insert saved prompt">➕</button>
        <button class="pp-mic-btn" title="Voice input">🎤</button>
      </div>

      <div class="pp-status-bar">
        <span class="pp-status-text"></span>
        <div class="pp-spinner" style="display:none;"></div>
      </div>

      <div class="pp-footer">
        <span class="pp-disclaimer">Gemini can make mistakes, so double-check</span>
        <button class="pp-saved-prompts-btn">📋 Saved Prompts</button>
      </div>

      <div class="pp-saved-panel" style="display:none;">
        <div class="pp-saved-list"></div>
      </div>
    `;
    return panel;
  }

  function positionOverlay() {
    if (!overlay || !activeTextbox) return;
    const rect = activeTextbox.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const viewportH = window.innerHeight;

    // Default: below the textbox
    let top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX;

    // Flip above if it overflows bottom
    if (rect.bottom + overlayRect.height + 16 > viewportH) {
      top = rect.top + window.scrollY - overlayRect.height - 8;
    }

    // Clamp left
    if (left + overlayRect.width > window.innerWidth) {
      left = window.innerWidth - overlayRect.width - 12;
    }
    if (left < 8) left = 8;

    overlay.style.top = `${top}px`;
    overlay.style.left = `${left}px`;
  }

  function showOverlay() {
    if (!overlay) {
      overlay = createOverlay();
      document.body.appendChild(overlay);
      bindOverlayEvents();
    }

    // Restore settings
    getSettings().then((settings) => {
      const select = overlay.querySelector(".pp-model-select");
      if (select) select.value = settings.model;
    });

    overlay.style.display = "block";
    isOverlayVisible = true;
    hideTrigger();

    // Position after render
    requestAnimationFrame(() => {
      positionOverlay();
    });
  }

  function hideOverlay() {
    if (overlay) {
      overlay.style.display = "none";
      // Reset sub-panels
      overlay.querySelector(".pp-feedback-area").style.display = "none";
      overlay.querySelector(".pp-saved-panel").style.display = "none";
      feedbackVisible = false;
      savedPromptsVisible = false;
    }
    isOverlayVisible = false;
    if (activeTextbox && document.contains(activeTextbox)) {
      showTrigger(activeTextbox);
    }
  }

  function toggleOverlay() {
    if (isOverlayVisible) {
      hideOverlay();
    } else {
      showOverlay();
    }
  }

  // ─── Overlay Event Bindings ──────────────────────────
  function bindOverlayEvents() {
    // Close button
    overlay.querySelector(".pp-close-btn").addEventListener("click", () => {
      hideOverlay();
    });

    // Perfect button
    overlay.querySelector(".pp-perfect-btn").addEventListener("click", () => {
      handlePerfect();
    });

    // Feedback toggle
    overlay.querySelector(".pp-feedback-btn").addEventListener("click", () => {
      feedbackVisible = !feedbackVisible;
      overlay.querySelector(".pp-feedback-area").style.display =
        feedbackVisible ? "block" : "none";
      if (feedbackVisible) {
        overlay.querySelector(".pp-feedback-input").focus();
      }
    });

    // Feedback submit
    overlay
      .querySelector(".pp-feedback-submit")
      .addEventListener("click", () => {
        handleFeedbackPerfect();
      });

    // Save prompt
    overlay.querySelector(".pp-save-btn").addEventListener("click", () => {
      handleSavePrompt();
    });

    // Insert saved prompt button
    overlay.querySelector(".pp-insert-btn").addEventListener("click", () => {
      toggleSavedPrompts();
    });

    // Mic button
    overlay.querySelector(".pp-mic-btn").addEventListener("click", () => {
      toggleMic();
    });

    // Saved prompts button
    overlay
      .querySelector(".pp-saved-prompts-btn")
      .addEventListener("click", () => {
        toggleSavedPrompts();
      });

    // Prompt input — Enter key to insert
    overlay
      .querySelector(".pp-prompt-input")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const inputText = e.target.value.trim();
          if (inputText && activeTextbox) {
            setTextInBox(activeTextbox, inputText);
            e.target.value = "";
            setStatus("Prompt inserted!");
          }
        }
      });

    // Stop click propagation so overlay doesn't close itself
    overlay.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // ─── Core Actions ────────────────────────────────────
  async function handlePerfect() {
    if (!activeTextbox) return;
    const text = getTextFromBox(activeTextbox).trim();
    if (!text) {
      setStatus("No text found in the textbox. Type something first!");
      return;
    }

    const settings = await getSettings();
    if (!settings.apiKey) {
      setStatus("⚠ No API key set. Click the extension icon to configure.");
      return;
    }

    const model = overlay.querySelector(".pp-model-select").value;
    // Use auto-detected platform from the overlay, fallback to settings
    const detectedPlatform = overlay.dataset.platform || detectPlatform();
    const platformName = getPlatformName(detectedPlatform);

    showSpinner(true);
    setStatus(`Enhancing for ${platformName}...`);

    chrome.runtime.sendMessage(
      {
        type: "PERFECT_PROMPT",
        text,
        apiKey: settings.apiKey,
        model,
        platform: detectedPlatform,
      },
      (response) => {
        showSpinner(false);
        if (chrome.runtime.lastError) {
          setStatus("Error: " + chrome.runtime.lastError.message);
          return;
        }
        if (response?.success) {
          setTextInBox(activeTextbox, response.result);
          setStatus("✓ Prompt perfected!");
        } else {
          setStatus("✗ " + (response?.error || "Unknown error"));
        }
      }
    );
  }

  async function handleFeedbackPerfect() {
    if (!activeTextbox) return;
    const text = getTextFromBox(activeTextbox).trim();
    if (!text) {
      setStatus("No text found in the textbox.");
      return;
    }

    const feedback = overlay
      .querySelector(".pp-feedback-input")
      .value.trim();
    if (!feedback) {
      setStatus("Please enter feedback first.");
      return;
    }

    const settings = await getSettings();
    if (!settings.apiKey) {
      setStatus("⚠ No API key set. Click the extension icon to configure.");
      return;
    }

    const model = overlay.querySelector(".pp-model-select").value;
    const detectedPlatform = overlay.dataset.platform || detectPlatform();
    const combinedText = `Original prompt:\n${text}\n\nUser feedback for improvement:\n${feedback}`;

    showSpinner(true);
    setStatus("Applying feedback...");

    chrome.runtime.sendMessage(
      {
        type: "PERFECT_PROMPT",
        text: combinedText,
        apiKey: settings.apiKey,
        model,
        platform: detectedPlatform,
      },
      (response) => {
        showSpinner(false);
        if (chrome.runtime.lastError) {
          setStatus("Error: " + chrome.runtime.lastError.message);
          return;
        }
        if (response?.success) {
          setTextInBox(activeTextbox, response.result);
          overlay.querySelector(".pp-feedback-input").value = "";
          overlay.querySelector(".pp-feedback-area").style.display = "none";
          feedbackVisible = false;
          setStatus("✓ Prompt improved with feedback!");
        } else {
          setStatus("✗ " + (response?.error || "Unknown error"));
        }
      }
    );
  }

  async function handleSavePrompt() {
    if (!activeTextbox) return;
    const text = getTextFromBox(activeTextbox).trim();
    if (!text) {
      setStatus("No text to save.");
      return;
    }
    await savePrompt(text);
    setStatus("✓ Prompt saved!");
  }

  async function toggleSavedPrompts() {
    savedPromptsVisible = !savedPromptsVisible;
    const panel = overlay.querySelector(".pp-saved-panel");
    panel.style.display = savedPromptsVisible ? "block" : "none";

    if (savedPromptsVisible) {
      const prompts = await getSavedPrompts();
      renderSavedPrompts(prompts);
    }
  }

  function renderSavedPrompts(prompts) {
    const list = overlay.querySelector(".pp-saved-list");
    if (prompts.length === 0) {
      list.innerHTML = '<div class="pp-no-saved">No saved prompts yet.</div>';
      return;
    }

    list.innerHTML = prompts
      .map(
        (p) => `
      <div class="pp-saved-item" data-id="${p.id}">
        <div class="pp-saved-text">${escapeHtml(p.text)}</div>
        <div class="pp-saved-meta">
          <span class="pp-saved-date">${new Date(p.createdAt).toLocaleDateString()}</span>
          <button class="pp-saved-insert" data-id="${p.id}">Insert</button>
          <button class="pp-saved-delete" data-id="${p.id}">🗑</button>
        </div>
      </div>
    `
      )
      .join("");

    // Bind insert buttons
    list.querySelectorAll(".pp-saved-insert").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const prompt = prompts.find((p) => p.id === id);
        if (prompt && activeTextbox) {
          setTextInBox(activeTextbox, prompt.text);
          setStatus("✓ Prompt inserted!");
        }
      });
    });

    // Bind delete buttons
    list.querySelectorAll(".pp-saved-delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await deletePrompt(id);
        const updated = await getSavedPrompts();
        renderSavedPrompts(updated);
        setStatus("✓ Prompt deleted.");
      });
    });
  }

  // ─── Voice Input ─────────────────────────────────────
  function toggleMic() {
    const micBtn = overlay.querySelector(".pp-mic-btn");

    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setStatus("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      if (recognition) recognition.stop();
      isListening = false;
      micBtn.classList.remove("pp-mic-active");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = overlay.querySelector(".pp-prompt-input");
      input.value = transcript;
      if (activeTextbox) {
        setTextInBox(activeTextbox, transcript);
      }
      setStatus("✓ Voice input captured.");
    };

    recognition.onerror = (event) => {
      setStatus("Voice error: " + event.error);
      isListening = false;
      micBtn.classList.remove("pp-mic-active");
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove("pp-mic-active");
    };

    recognition.start();
    isListening = true;
    micBtn.classList.add("pp-mic-active");
    setStatus("🎤 Listening...");
  }

  // ─── UI Helpers ──────────────────────────────────────
  function setStatus(msg) {
    if (!overlay) return;
    overlay.querySelector(".pp-status-text").textContent = msg;
  }

  function showSpinner(show) {
    if (!overlay) return;
    overlay.querySelector(".pp-spinner").style.display = show
      ? "block"
      : "none";
    // Disable action buttons while loading
    overlay.querySelectorAll(".pp-action-btn").forEach((btn) => {
      btn.disabled = show;
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Focus Listener ──────────────────────────────────
  function handleFocus(e) {
    const el = e.target;
    if (!isEditable(el)) return;

    // Don't trigger on our own elements
    if (el.closest && el.closest("#pp-overlay")) return;
    if (el.id === "pp-trigger") return;

    activeTextbox = el;
    showTrigger(el);
  }

  function handleBlur(e) {
    // Delay to allow trigger click
    setTimeout(() => {
      const el = e.target;
      if (!isEditable(el)) return;
      // Only hide if nothing in our UI is focused
      if (
        !overlay?.contains(document.activeElement) &&
        document.activeElement !== triggerBtn
      ) {
        // Keep trigger visible for a bit
      }
    }, 200);
  }

  // ─── Outside Click ───────────────────────────────────
  function handleOutsideClick(e) {
    if (
      isOverlayVisible &&
      overlay &&
      !overlay.contains(e.target) &&
      e.target !== triggerBtn
    ) {
      hideOverlay();
    }
  }

  // ─── Scroll / Resize Repositioning ──────────────────
  function handleReposition() {
    if (isOverlayVisible) positionOverlay();
    if (triggerBtn && triggerBtn.style.display !== "none" && activeTextbox) {
      positionTrigger(activeTextbox);
    }
  }

  // ─── Init ────────────────────────────────────────────
  function init() {
    // Capture phase to catch all focus events
    document.addEventListener("focus", handleFocus, true);
    document.addEventListener("blur", handleBlur, true);
    document.addEventListener("click", handleOutsideClick, true);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition, true);
  }

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
