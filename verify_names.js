const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/model/names',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const names = JSON.parse(data);
            console.log('Registered Names:', names);

            const required = ['total.headcount', 'employee.1.active', 'new.customers'];
            const missing = required.filter(r => !names.includes(r));

            if (missing.length > 0) {
                console.error('Missing expected names:', missing);
                process.exit(1);
            } else {
                console.log('All required names present.');
                process.exit(0);
            }
        } catch (e) {
            console.error('Error parsing response:', e);
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    process.exit(1);
});

req.end();
