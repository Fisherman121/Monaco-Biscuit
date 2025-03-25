import { pipeline } from '@xenova/transformers';

async function downloadAndTestModel() {
    try {
        console.log('Starting model download and test...');
        console.log('This will download a smaller model (about 1GB) that works well for code assistance...');
        
        // Initialize the pipeline
        const pipe = await pipeline('text-generation', 'Xenova/codegen-350M-mono', {
            progress_callback: (progress) => {
                const percent = Math.round(progress.progress * 100);
                console.log(`Loading model: ${percent}%`);
                if (progress.status === 'downloading') {
                    console.log(`Downloading: ${progress.file}`);
                }
            }
        });

        console.log('Model loaded successfully!');

        // Test the model
        console.log('\nTesting model with a simple request...');
        const response = await pipe('Write a simple hello world program in Python', {
            max_length: 200,
            temperature: 0.7
        });

        console.log('\nModel test successful!');
        console.log('Response:', response[0].generated_text);
        
    } catch (error) {
        console.error('\nError during model download/test:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
    }
}
// Run the download and test
downloadAndTestModel(); 