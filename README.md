# Monaco Editor + AI Code Assistant

A web-based code editor with AI-powered analysis and multi-language code execution. Built around Microsoft's Monaco Editor (the same engine that powers VS Code) with some extra goodies.

## What's this thing do?

- **Code editing** - Syntax highlighting, auto-completion, and all the usual editor features you'd expect
- **AI chat integration** - Ask questions about your code or get help debugging via Gemini AI
- **Code execution** - Run code in 25+ languages directly in the browser (Python, JavaScript, C++, Rust, Go, etc.)
- **File management** - Open, edit, and save files with a simple file explorer
- **AI code analysis** - Get insights about code quality, potential bugs, and optimization suggestions
- **WebSocket live updates** - Real-time file sync and collaboration features

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up your API key**
   - Create a `.env` file in the root directory
   - Add your Gemini API key: `GEMINI_API_KEY=your_key_here`
   - (Don't worry, the `.env` file is already gitignored)

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser** to `http://localhost:3000`

That's it! You should see the editor interface with a file explorer on the left and the main editor on the right.

## Features breakdown

### Code Execution
Uses the [Piston API](https://github.com/engineer-man/piston) to execute code in a sandboxed environment. Supports:
- Python, JavaScript, TypeScript, C/C++, Rust, Go, Java
- Haskell, Scala, Ruby, PHP, Swift, Kotlin
- And like 15 other languages

### AI Assistant
The chat panel lets you:
- Ask questions about your current file
- Get debugging help
- Request code explanations or improvements
- General programming Q&A

### Code Analysis
Click the "Analyze" button to get:
- Syntax and runtime issue detection
- Performance optimization suggestions
- Security vulnerability checks
- Code quality insights

## File Structure

```
├── server.js          # Main Express server + WebSocket handling
├── index.html         # Frontend interface
├── workspace.js       # Monaco editor setup and file management
├── ai-analyzer.js     # AI-powered code analysis
├── package.json       # Dependencies and scripts
└── .env              # Your API keys (create this)
```

## Environment Variables

You'll need a Gemini API key for the AI features. Get one from [Google AI Studio](https://aistudio.google.com/) and add it to your `.env` file:

```
GEMINI_API_KEY=your_actual_key_here
```

## Known quirks

- The AI analyzer downloads a local model on first run (takes a minute or two)
- Code execution has reasonable timeouts but don't try to mine Bitcoin with it
- File paths are case-sensitive on the file explorer
- WebSocket connections might need a refresh if they get wonky

## Tech stack

- **Frontend**: Monaco Editor, vanilla JS, WebSockets
- **Backend**: Node.js, Express, WebSocket server
- **AI**: Google Gemini API, local Hugging Face models
- **Code execution**: Piston API (remote sandboxed execution)

Built this as a learning project but it turned out pretty useful. Feel free to break things and submit issues if you find bugs!