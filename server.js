import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyAfmRTd9RWFh1oaFNhunToBi6RJeF42Kfw';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Initialize WebSocket server
const wss = new WebSocketServer({ port: 3001 });

// Store connected clients
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'getFileStructure':
                    const structure = await getDirectoryStructure(__dirname);
                    ws.send(JSON.stringify({ type: 'fileStructure', structure }));
                    break;
                    
                case 'getFileContent':
                    try {
                        const content = await fs.readFile(data.path, 'utf-8');
                        ws.send(JSON.stringify({ type: 'fileContent', path: data.path, content }));
                    } catch (error) {
                        console.error('Error reading file:', error);
                        ws.send(JSON.stringify({ type: 'error', message: 'Failed to read file' }));
                    }
                    break;

                case 'saveFile':
                    try {
                        await fs.writeFile(data.path, data.content, 'utf-8');
                        ws.send(JSON.stringify({ type: 'fileSaved', path: data.path }));
                    } catch (error) {
                        console.error('Error saving file:', error);
                        ws.send(JSON.stringify({ type: 'error', message: 'Failed to save file' }));
                    }
                    break;
            }
        } catch (error) {
            console.error('WebSocket error:', error);
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

// Helper function to get directory structure
async function getDirectoryStructure(dir) {
    try {
        const items = await fs.readdir(dir);
        const structure = [];

        for (const item of items) {
            // Skip node_modules, .git, and hidden files
            if (item === 'node_modules' || item === '.git' || item.startsWith('.')) {
                continue;
            }

            const fullPath = join(dir, item);
            const stat = await fs.stat(fullPath);
            
            if (stat.isDirectory()) {
                const children = await getDirectoryStructure(fullPath);
                structure.push({
                    name: item,
                    type: 'directory',
                    path: fullPath,
                    children
                });
            } else {
                structure.push({
                    name: item,
                    type: 'file',
                    path: fullPath
                });
            }
        }

        return structure;
    } catch (error) {
        console.error('Error reading directory:', error);
        return [];
    }
}

// Create initial welcome file if no files exist
async function createInitialFile() {
    try {
        const files = await fs.readdir(__dirname);
        if (files.length === 0) {
            await fs.writeFile('welcome.js', '// Welcome to Monaco Editor!\nconsole.log("Hello, World!");', 'utf-8');
            console.log('Created welcome.js file');
        }
    } catch (error) {
        console.error('Error creating initial file:', error);
    }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, currentFileContent } = req.body;

        // Prepare the content array with file content and user message
        const contents = [];
        
        if (currentFileContent && currentFileContent.trim()) {
            contents.push({
                text: `Here is the content of the currently opened file:\n\n${currentFileContent}`
            });
        }
        
        contents.push({
            text: message
        });

        // Generate content
        const result = await model.generateContent(contents);
        const response = await result.response;
        const text = response.text();

        console.log('Gemini API response:', text);
        res.json({ response: text });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// List of supported languages
const SUPPORTED_LANGUAGES = [
    "nasm", "bash", "c", "csharp", "d", "emacs-lisp", "haskell", "java", "julia", 
    "perl", "python", "rust", "zig", "nim", "scala", "lua", "awk", "brainfuck", 
    "lisp", "cpp", "ruby", "elixir", "go", "javascript", "kotlin", "php", 
    "python2", "swift", "crystal", "deno", "typescript"
];

// Code execution endpoint
app.post('/run', async (req, res) => {
    console.log('Received run request:', req.body); // Debug log
    const { language, code } = req.body;

    // Validate input
    if (!language || !code) {
        console.log('Missing required fields:', { language, code }); // Debug log
        return res.status(400).json({ error: "Language and code are required" });
    }

    // Check if the language is supported
    if (!SUPPORTED_LANGUAGES.includes(language.toLowerCase())) {
        console.log('Unsupported language:', language); // Debug log
        return res.status(400).json({ 
            error: `Unsupported language: ${language}. Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}` 
        });
    }

    try {
        console.log('Sending request to Piston API...'); // Debug log
        // Send request to Piston API
        const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
            language: language.toLowerCase(),
            version: "*",  // Use latest version available
            files: [{ 
                name: `main.${language.toLowerCase()}`,
                content: code 
            }]
        });

        console.log('Piston API response:', response.data); // Debug log

        // Extract output and error from the response
        const output = response.data.run?.output || '';
        const error = response.data.run?.stderr || '';

        // Send the execution output back to frontend
        res.json({ 
            output: output || error, // If no output but there's an error, use the error as output
            error: error || null,
            success: !error
        });

    } catch (error) {
        console.error("Execution error:", error.message); // Log error for debugging
        console.error("Full error:", error); // Log full error details

        // Check if the error is from the API response
        if (error.response) {
            console.error("API Error response:", error.response.data); // Log API error details
            return res.status(error.response.status).json({ 
                error: error.response.data || "Execution failed. Please check your code or try again later.",
                success: false
            });
        }

        // General server error response
        res.status(500).json({ 
            error: "Internal server error. Try again later.",
            success: false
        });
    }
});

// Add file system endpoints
app.get('/api/files/current-directory', (req, res) => {
    res.json({ directory: __dirname });
});

app.get('/api/files/check', async (req, res) => {
    try {
        const path = req.query.path;
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }
        
        const stats = await fs.stat(path);
        const modified = stats.mtimeMs;
        res.json({ modified });
    } catch (error) {
        console.error('Error checking file:', error);
        res.status(500).json({ error: 'Failed to check file' });
    }
});

app.post('/api/files/save', async (req, res) => {
    try {
        const { path, content } = req.body;
        if (!path || content === undefined) {
            return res.status(400).json({ error: 'Path and content are required' });
        }
        
        await fs.writeFile(path, content, 'utf-8');
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving file:', error);
        res.status(500).json({ error: 'Failed to save file' });
    }
});

app.get('/api/files/read', async (req, res) => {
    try {
        const path = req.query.path;
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }
        
        const content = await fs.readFile(path, 'utf-8');
        res.json({ content });
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: 'Failed to read file' });
    }
});

// Start server
app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`WebSocket server running at ws://localhost:3001`);
    await createInitialFile();
});
