import 'dotenv/config';
import aiAnalyzer from './ai-analyzer.js';

async function testModel() {
    try {
        console.log('Testing model installation...');
        await aiAnalyzer.initialize();
        
        console.log('Testing chat functionality...');
        const response = await aiAnalyzer.chat('Hello! Can you help me with coding?');
        console.log('Model response:', response);
        
        console.log('Model test completed successfully!');
    } catch (error) {
        console.error('Model test failed:', error);
        process.exit(1);
    }
}

testModel(); 