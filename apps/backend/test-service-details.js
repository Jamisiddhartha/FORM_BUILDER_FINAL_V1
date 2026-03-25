// Test script to debug the service details endpoint
const API_URL = 'http://localhost:3001';

async function testServiceDetailsEndpoint() {
    console.log('Testing /kya/service-details/byids endpoint...\n');

    const payload = { service_ids: [577.1] };
    console.log('Sending payload:', payload);

    try {
        const response = await fetch(`${API_URL}/kya/service-details/byids`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers));

        const data = await response.json();
        console.log('\nResponse data:');
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testServiceDetailsEndpoint();
