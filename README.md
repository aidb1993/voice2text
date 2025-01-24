# 🎙️ Voice2Text

A powerful Electron-based desktop application that converts speech to text in real-time, with support for translation and task management.

## ✨ Features

- 🎤 **Real-time Voice Recording**: Capture audio with high-quality settings
- 🔄 **Instant Transcription**: Convert speech to text using Google's Gemini AI
- 🌍 **Translation Support**: Automatically translate your recordings to English
- 📝 **Task Management**: Create and organize tasks from voice recordings
- 📋 **Clipboard Integration**: Automatically copy transcriptions to clipboard
- ⌨️ **Keyboard Shortcuts**: Quick access to all features
- 🎯 **Task Templates**: Structured format for task documentation

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- pnpm package manager
- Google Gemini API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/aidb1993/voice2text.git
cd voice2text
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_api_key_here
```

4. Start the application:

```bash
pnpm start
```

## 🛠️ Commands

### Recording Controls

- **Start/Stop Recording**: Click the record button or use keyboard shortcut
- **Translate Recording**: Click translate button or use shortcut
- **Create Task**: Click task button or use shortcut

### Git Configuration

Switch between different Git configurations using the provided batch script:

```bash
# For company settings
.\git-config.bat company

# For personal settings
.\git-config.bat personal
```

## 🏗️ Project Structure

```
voice2text/
├── src/
│   ├── main.js          # Electron main process
│   ├── renderer.js      # Renderer process & UI logic
│   └── icon.ico         # Application icon
├── tasks/               # Generated task files
├── index.html          # Main application window
├── package.json        # Dependencies and scripts
└── .env               # Environment variables
```

## 🎯 Features in Detail

### Voice Recording

- High-quality audio capture (128 kbps, stereo)
- Real-time status indicators
- Automatic error handling

### Transcription

- Powered by Google's Gemini AI
- Support for multiple languages
- Automatic clipboard copying

### Task Management

- Markdown-formatted task templates
- Automatic file naming with timestamps
- Structured documentation format

## ⚙️ Configuration

### Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key

### Git Configuration

The repository includes a batch script for switching between different Git configurations:

- Company: Sets name to "agustin" and email to "agustindb@argeniss.com"
- Personal: Sets name to "aidb1993" and email to "aidb1993@gmail.com"

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
