# PromptPerfect Extension

PromptPerfect Extension is a Chrome extension that helps users improve and refine their prompts before using them in AI tools.  
It is designed to make prompts clearer, more structured, and more effective using Gemini API integration.

This repository contains all source files needed to run the extension locally and customize it further.

---

## 📁 Project Structure

```text
PromptPerfectExtension-Main/
├── background.js          # Background service logic for extension events/tasks
├── content.js             # Injected script for interaction with web pages
├── content.css            # Styles used by content script UI (if injected)
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic (API key, model selection, prompt actions)
├── manifest.json          # Chrome extension manifest (configuration + permissions)
├── icons/                 # Extension icons
├── generate_icons.js      # Utility script for icon generation
├── convert_icons.js       # Utility script for icon conversion
├── package.json           # Node project metadata/dependencies (if used)
├── package-lock.json      # Dependency lock file
└── node_modules/          # Installed dependencies
```

---

## 🛠️ Tech Stack / Tools Used

- **JavaScript** (core extension logic)
- **HTML** (popup UI structure)
- **CSS** (UI styling)
- **Chrome Extensions API** (Manifest + browser extension features)
- **Gemini API** (prompt enhancement/model response integration)
- **Node.js + npm** (for utility scripts/dependency management)

---

## 🚀 How to Fork and Use Locally

Follow these steps after forking this repository:

### 1) Fork this repository
Create your own fork of this repo on GitHub.

### 2) Clone your fork locally
```bash
git clone https://github.com/<your-username>/PromptPerfectExtension-Main.git
cd PromptPerfectExtension-Main
```

### 3) Open Chrome Extensions page
In Chrome, go to:

`chrome://extensions/`

### 4) Enable Developer Mode
Turn on the **Developer mode** toggle (top-right).

### 5) Load the extension
Click **Load unpacked** and select the project folder (`PromptPerfectExtension-Main`).

That’s it — the extension is now loaded locally.

---

## 🔑 First-Time Setup in Extension

1. Open the extension from the Chrome extensions bar.
2. Enter your **Gemini API Key**.
3. Choose your preferred **Gemini model**.
4. Start using it to improve your prompts.

Enjoy 🚀

---

## 🤝 Contributing

If you want to improve the extension:
1. Fork the repo
2. Create your feature branch
3. Commit your changes
4. Push to your fork
5. Open a pull request

---

## 📌 Notes

- Keep your Gemini API key private.
- If the extension doesn’t update after changes, reload it from `chrome://extensions/`.
- For development changes to `popup.js`, `content.js`, or `background.js`, refresh the extension and the target tab.
