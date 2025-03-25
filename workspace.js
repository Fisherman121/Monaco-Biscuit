let editor;
let ws;
let currentFile = null;
let openFiles = new Set();
let activeTab = null;
let currentFileContent = '';

// Initialize WebSocket connection
function initializeWebSocket() {
    ws = new WebSocket('ws://localhost:3001');

    ws.onopen = () => {
        console.log('WebSocket connected');
        updateStatus('Connected to server');
        requestFileStructure();
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateStatus('Disconnected from server');
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus('Connection error');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'fileStructure':
            updateFileExplorer(data.structure);
            break;
        case 'fileContent':
            if (currentFile === data.path) {
                editor.setValue(data.content);
                currentFileContent = data.content;
                console.log('File content loaded:', data.path);
                // Notify that file content is available
                window.dispatchEvent(new Event('fileContentUpdated'));
            }
            break;
        case 'fileSaved':
            updateStatus('File saved');
            break;
        case 'error':
            console.error('Server error:', data.message);
            updateStatus('Error: ' + data.message);
            break;
    }
}

// Request file structure from server
function requestFileStructure() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'getFileStructure' }));
    }
}

// Update file explorer with directory structure
function updateFileExplorer(structure) {
    const fileExplorer = document.getElementById('file-explorer');
    fileExplorer.innerHTML = '';
    
    function createFileItem(path, name, isDirectory) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${isDirectory ? 
                    '<path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/>' :
                    '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>'
                }
            </svg>
            <span>${name}</span>
        `;
        
        item.onclick = () => {
            if (isDirectory) {
                // Handle directory click (expand/collapse)
                const children = item.parentElement.querySelectorAll(`[data-path^="${path}/"]`);
                children.forEach(child => {
                    child.style.display = child.style.display === 'none' ? 'flex' : 'none';
                });
            } else {
                // Handle file click
                openFile(path);
            }
        };
        
        return item;
    }

    function renderStructure(items, parentPath = '') {
        items.forEach(item => {
            const path = parentPath ? `${parentPath}/${item.name}` : item.name;
            const fileItem = createFileItem(path, item.name, item.type === 'directory');
            fileItem.setAttribute('data-path', path);
            
            if (parentPath) {
                fileItem.style.paddingLeft = `${(path.split('/').length - 1) * 16}px`;
            }
            
            fileExplorer.appendChild(fileItem);
            
            if (item.type === 'directory' && item.children) {
                renderStructure(item.children, path);
            }
        });
    }

    renderStructure(structure);
}

// Open a file in the editor
function openFile(filePath) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        currentFile = filePath;
        ws.send(JSON.stringify({ type: 'getFileContent', path: filePath }));
        
        // Update file explorer selection
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('selected');
            if (item.getAttribute('data-path') === filePath) {
                item.classList.add('selected');
            }
        });

        // Add tab if not already open
        if (!openFiles.has(filePath)) {
            addEditorTab(filePath);
            openFiles.add(filePath);
        } else {
            // Switch to existing tab
            switchToTab(filePath);
        }

        // Set editor language based on file extension
        const ext = filePath.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'go': 'go',
            'rs': 'rust',
            'rb': 'ruby',
            'php': 'php'
        };
        monaco.editor.setModelLanguage(editor.getModel(), languageMap[ext] || 'plaintext');
    }
}

// Add a new editor tab
function addEditorTab(path) {
    const editorTabs = document.getElementById('editor-tabs');
    const fileName = path.split('/').pop();
    
    const tab = document.createElement('div');
    tab.className = 'editor-tab';
    tab.setAttribute('data-path', path);
    tab.innerHTML = `
        <span>${fileName}</span>
        <span class="close-button" onclick="closeTab('${path}')">×</span>
    `;
    
    tab.onclick = (e) => {
        if (!e.target.classList.contains('close-button')) {
            switchToTab(path);
        }
    };
    
    editorTabs.appendChild(tab);
    switchToTab(path);
}

// Switch to a specific tab
function switchToTab(path) {
    const tabs = document.querySelectorAll('.editor-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-path') === path) {
            tab.classList.add('active');
        }
    });
    
    currentFile = path;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'getFileContent', path }));
    }
}

// Close a tab
function closeTab(path) {
    const tab = document.querySelector(`.editor-tab[data-path="${path}"]`);
    if (tab) {
        tab.remove();
        openFiles.delete(path);
        
        if (currentFile === path) {
            currentFile = null;
            editor.setValue('');
            
            // Switch to another tab if available
            const remainingTabs = document.querySelectorAll('.editor-tab');
            if (remainingTabs.length > 0) {
                const nextTab = remainingTabs[0];
                switchToTab(nextTab.getAttribute('data-path'));
            }
        }
    }
}

// Save current file
function saveFile() {
    if (currentFile && ws && ws.readyState === WebSocket.OPEN) {
        const content = editor.getValue();
        currentFileContent = content;
        ws.send(JSON.stringify({
            type: 'saveFile',
            path: currentFile,
            content: content
        }));
    }
}

// Update status bar
function updateStatus(message) {
    const statusText = document.getElementById('status-text');
    statusText.textContent = message;
}

// Initialize Monaco Editor
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: '',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: {
            enabled: true
        }
    });

    // Make editor instance globally available
    window.editor = editor;
    window.editorLoaded = true;

    // Create initial model
    const model = monaco.editor.createModel('', 'javascript');
    editor.setModel(model);

    // Initialize WebSocket after editor is ready
    initializeWebSocket();

    window.dispatchEvent(new Event('editorLoaded'));
});

// Function to get current file content
window.getCurrentFileContent = function() {
    if (window.editor && window.editor.getModel()) {
        return window.editor.getModel().getValue();
    }
    return '';
};

// Make current file name available globally
window.getCurrentFileName = function() {
    return currentFile ? currentFile.split('/').pop() : '';
};