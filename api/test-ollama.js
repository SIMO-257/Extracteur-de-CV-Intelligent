const axios = require('axios');
const OLLAMA_HOST = /* process.env.OLLAMA_HOST || 'http://ollama:11434 */'http://localhost:11434';

async function test() {
    console.log(`Connecting to Ollama at: ${OLLAMA_HOST}`);
    try {
        const start = Date.now();
        const res = await axios.get(`${OLLAMA_HOST}/api/tags`, { timeout: 5000 });
        console.log(`✅ Connection successful! Status: ${res.status}`);
        console.log(`Models found:`, res.data.models ? res.data.models.map(m => m.name) : 'none');
        console.log(`Response time: ${Date.now() - start}ms`);
    } catch (err) {
        console.error(`❌ Connection failed!`);
        console.error(`Error message: ${err.message}`);
        if (err.code) console.error(`Code: ${err.code}`);
        if (err.response) console.error(`Status: ${err.response.status}`);
    }
}

test();
