import { pipeline } from '@xenova/transformers';

class AIAnalyzer {
    constructor() {
        this.pipe = null;
        this.initialized = false;
        this.chatHistory = [];
        this.supportedLanguages = {
            'js': 'JavaScript',
            'jsx': 'JavaScript',
            'ts': 'TypeScript',
            'tsx': 'TypeScript',
            'py': 'Python',
            'java': 'Java',
            'cpp': 'C++',
            'c': 'C',
            'cs': 'C#',
            'go': 'Go',
            'rs': 'Rust',
            'rb': 'Ruby',
            'php': 'PHP'
        };
    }

    async initialize() {
        if (this.initialized) return;

        console.log('Loading model...');
        this.pipe = await pipeline('text-generation', 'Xenova/codegen-350M-mono', {
            progress_callback: (progress) => {
                console.log(`Loading progress: ${Math.round(progress.progress * 100)}%`);
            }
        });
        this.initialized = true;
        console.log('Model loaded successfully');
    }

    async chat(message) {
        if (!this.initialized) {
            throw new Error('AI model not initialized');
        }

        // Add user message to chat history
        this.chatHistory.push({ role: 'user', content: message });

        // Create prompt with chat history
        const prompt = `You are an expert code reviewer and debugging assistant. Provide clear, concise, and accurate responses.
${this.chatHistory.map(msg => 
    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
).join('\n')}\nAssistant: `;

        try {
            const response = await this.pipe(prompt, {
                max_length: 500,
                temperature: 0.7,
                do_sample: true,
                top_p: 0.95,
                repetition_penalty: 1.1,
                stop: ['User:', '\n\n']
            });

            const aiResponse = response[0].generated_text.split('Assistant: ').pop().trim();
            
            // Add AI response to chat history
            this.chatHistory.push({ role: 'assistant', content: aiResponse });

            return aiResponse;
        } catch (error) {
            console.error('Error in chat:', error);
            throw error;
        }
    }

    async analyzeCode(content, filePath) {
        if (!this.initialized) {
            throw new Error('AI model not initialized');
        }

        const language = this.getLanguageFromPath(filePath);
        const prompt = `You are an expert code reviewer and static analyzer. Analyze this ${language} code and provide a comprehensive review.

Code to analyze:
\`\`\`${language}
${content}
\`\`\`

Provide a JSON response in this format:
{
    "issues": [
        {
            "severity": "error|warning|info|hint",
            "message": "description of the issue",
            "line": line number,
            "column": column number,
            "length": length of the issue,
            "category": "security|performance|maintainability|bug|style",
            "suggestion": "suggested fix or improvement"
        }
    ],
    "metrics": {
        "complexity": "high|medium|low",
        "maintainability": "high|medium|low",
        "security": "high|medium|low",
        "performance": "high|medium|low"
    },
    "summary": "overall code quality summary",
    "optimizations": [
        {
            "type": "performance|security|maintainability",
            "description": "suggestion for improvement",
            "impact": "high|medium|low"
        }
    ]
}

Focus on:
1. Security vulnerabilities and best practices
2. Performance bottlenecks and optimization opportunities
3. Code maintainability and readability
4. Potential bugs and edge cases
5. Design patterns and architectural improvements
6. Language-specific best practices
7. Error handling and logging
8. Documentation and comments
9. Testing opportunities
10. Version control best practices`;
            
        try {
            const response = await this.pipe(prompt, {
                max_length: 2000,
                temperature: 0.3,
                do_sample: false,
                stop: ['\n\n']
            });

            const analysisText = response[0].generated_text;
            
            // Extract JSON from the response
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }

            const analysis = JSON.parse(jsonMatch[0]);
            return analysis;
        } catch (error) {
            console.error('Error analyzing code:', error);
            return {
                issues: [{
                    severity: 'error',
                    message: 'Failed to analyze code: ' + error.message,
                    line: 1,
                    column: 1,
                    length: 1,
                    category: 'error',
                    suggestion: 'Please check the code and try again'
                }],
                metrics: {
                    complexity: 'unknown',
                    maintainability: 'unknown',
                    security: 'unknown',
                    performance: 'unknown'
                },
                summary: 'Analysis failed',
                optimizations: []
            };
        }
    }

    getLanguageFromPath(path) {
        const ext = path.split('.').pop().toLowerCase();
        return this.supportedLanguages[ext] || 'unknown';
    }

    clearChat() {
        this.chatHistory = [];
    }
}

export const aiAnalyzer = new AIAnalyzer(); 