// const axios = require('axios');

// const baseURL = 'http://localhost:11434/api';

// const client = axios.create({
//     baseURL: baseURL,
//     headers: {
//         'Content-Type': 'application/json'
//     },
//     timeout: 60000 // 60 second timeout
// });

// async function callOllama() {
//     try {
//         console.log('Calling Ollama API...');
        
//         // ✅ Using client instance
//         const response = await client.post('/generate', {
//             model: 'llama3.2:latest',
//             prompt: 'Hello! How are you?',
//             stream: false,
//             options: {
//                 temperature: 0.7
//             }
//         });
        
//         console.log('Response:', response.data.response);
//         console.log('Total duration:', response.data.total_duration / 1e9, 'seconds');
        
//         return response.data;
        
//     } catch (error) {
//         if (error.response) {
//             // Server responded with error status
//             console.error('Ollama API Error:', error.response.status);
//             console.error('Error details:', error.response.data);
//         } else if (error.request) {
//             // Request made but no response
//             console.error('No response from Ollama. Is it running?');
//             console.log('Start Ollama with: ollama serve');
//         } else {
//             // Something else went wrong
//             console.error('Error:', error.message);
//         }
//         throw error;
//     }
// }

// // Test the connection
// callOllama();
// First install: npm install ollama
