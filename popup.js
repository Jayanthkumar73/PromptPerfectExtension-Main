// popup.js — Settings page for Prompt Perfect

document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const modelSelect = document.getElementById("model");
  const saveBtn = document.getElementById("saveBtn");
  const toggleKeyBtn = document.getElementById("toggleKey");
  const statusEl = document.getElementById("status");

  // Load saved settings
  chrome.storage.sync.get(
    { apiKey: "", model: "gemini-2.5-flash" },
    (settings) => {
      apiKeyInput.value = settings.apiKey;
      modelSelect.value = settings.model;
    }
  );

  // Toggle API key visibility
  toggleKeyBtn.addEventListener("click", () => {
    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      toggleKeyBtn.textContent = "🔒";
    } else {
      apiKeyInput.type = "password";
      toggleKeyBtn.textContent = "👁";
    }
  });

  // Save settings
  saveBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;

    chrome.storage.sync.set({ apiKey, model }, () => {
      if (chrome.runtime.lastError) {
        statusEl.textContent = "Error saving settings.";
        statusEl.className = "status error";
      } else {
        statusEl.textContent = "✓ Settings saved!";
        statusEl.className = "status success";

        // Auto-clear status after 2s
        setTimeout(() => {
          statusEl.textContent = "";
          statusEl.className = "status";
        }, 2000);
      }
    });
  });
});
