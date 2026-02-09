const http = require('http');

const data = JSON.stringify({
  model: process.env.OLLAMA_MODEL || 'qwen2.5:latest',
  prompt: 'Say hello in one word',
  stream: false
});

const options = {
  hostname: 'ollama',
  port: 11434,
  path: '/api/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';

  res.on('data', chunk => {
    body += chunk.toString();
  });

  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', body);
  });
});

req.on('error', (err) => {
  console.error('ERROR:', err.message);
});

req.write(data);
req.end();
