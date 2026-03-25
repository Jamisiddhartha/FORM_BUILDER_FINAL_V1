const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function testModelRaw(apiKey, modelName) {
    console.log(`\nTesting raw HTTP request to ${modelName}...`);
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hi" }] }]
            })
        });

        const status = response.status;
        const rawText = await response.text();

        console.log(`[Status ${status}]`);
        if (!response.ok) {
            console.error(`RAW ERROR FROM GOOGLE (first 2000 chars):`);
            console.error(rawText.substring(0, 2000));
            return false;
        } else {
            try {
                const data = JSON.parse(rawText);
                console.log('Success:', data.candidates?.[0]?.content?.parts?.[0]?.text);
            } catch (e) {
                console.log('Success (raw):', rawText.substring(0, 500));
            }
            return true;
        }
    } catch (error) {
        console.error('Fetch Error:', error.message);
        return false;
    }
}

async function testAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    console.log('API Key starts with:', apiKey ? apiKey.substring(0, 7) : 'N/A');

    if (!apiKey) {
        console.error('No API key found in .env');
        return;
    }

    await testModelRaw(apiKey, 'gemini-2.5-flash');
}
testAI();
