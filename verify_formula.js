const http = require('http');

function get(path) {
    return new Promise((resolve, reject) => {
        http.get({ hostname: 'localhost', port: 3000, path }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

(async () => {
    try {
        const model = await get('/api/model');
        // Find Total Headcount row
        const rowIndex = model.findIndex(row => row[0] === 'Total Headcount');

        if (rowIndex === -1) {
            console.error('Total Headcount row not found');
            process.exit(1);
        }

        console.log(`Found Total Headcount at row ${rowIndex}`);

        // Get Formula for Month 1 (col 1)
        const formulaRes = await get(`/api/formula?col=1&row=${rowIndex}`);
        console.log('Formula:', formulaRes.formula);

        if (formulaRes.formula.includes('employee.1.active') || formulaRes.formula.includes('EMPLOYEE_1_ACTIVE')) {
            if (formulaRes.formula.includes('employee.1.active')) {
                console.log('Success: Formula uses dot notation.');
            } else {
                console.warn('Warning: Formula uses internal name (check display mapping).');
            }
        } else {
            console.error('Formula does not contain expected employee references.');
            process.exit(1);
        }

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
