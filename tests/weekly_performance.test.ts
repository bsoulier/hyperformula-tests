import { buildWeeklyModel } from '../src/modelBuilderWeekly';
import { HyperFormula } from 'hyperformula';

describe('Weekly Cash Flow Model', () => {
    let hf: HyperFormula;
    let sheetId: number;

    beforeEach(() => {
        const result = buildWeeklyModel();
        hf = result.hf;
        sheetId = result.sheetId;
    });

    test('should have 13 weeks of data', () => {
        const sheetValues = hf.getSheetValues(sheetId);
        // Col 0 + 13 Weeks = 14 Columns.
        expect(sheetValues[0].length).toBe(14);
        expect(sheetValues[0][1]).toBe('Week 1');
        expect(sheetValues[0][13]).toBe('Week 13');
    });

    test('should apply bi-weekly payroll logic', () => {
        // Payroll Row: "Payroll (Bi-Weekly)"
        const sheetValues = hf.getSheetValues(sheetId);
        let payrollRow = -1;
        for (let i = 0; i < sheetValues.length; i++) {
            if (sheetValues[i][0] === 'Payroll (Bi-Weekly)') {
                payrollRow = i;
                break;
            }
        }
        expect(payrollRow).not.toBe(-1);

        // Week 1 (Col 1) should be 0
        const w1 = hf.getCellValue({ sheet: sheetId, col: 1, row: payrollRow });
        expect(w1).toBe(0);

        // Week 2 (Col 2) should be 75000
        const w2 = hf.getCellValue({ sheet: sheetId, col: 2, row: payrollRow });
        expect(w2).toBe(75000);

        // Week 3 (Col 3) should be 0
        const w3 = hf.getCellValue({ sheet: sheetId, col: 3, row: payrollRow });
        expect(w3).toBe(0);
    });

    test('should trigger LOC Draw accurately below 50k buffer', () => {
        // We simulate a scenario where we force cash low
        // Find Rows
        const sheetValues = hf.getSheetValues(sheetId);
        let billingsRow = -1;
        let drawRow = -1;
        let finalCashRow = -1;
        let preFinRow = -1;

        for (let i = 0; i < sheetValues.length; i++) {
            const label = sheetValues[i][0];
            if (label === 'Billings (Invoiced)') billingsRow = i;
            if (label === 'Revolver Draw') drawRow = i;
            if (label === 'Ending Cash') finalCashRow = i;
            if (label === 'Pre-Financing Cash') preFinRow = i;
        }

        // Test Week 6 (Col 6). 
        // Force spike in Payables or drop in Billings. 
        // Let's set Pre-Financing manually to 10k? No, that's a formula.
        // We must change an input. Let's make Billings 0 and Vendor AP huge (500k) for Week 6.

        // Find AP Row
        let apRow = -1;
        for (let i = 0; i < sheetValues.length; i++) {
            if (sheetValues[i][0] === 'Vendor AP') apRow = i;
        }

        hf.setCellContents({ sheet: sheetId, col: 6, row: billingsRow }, [[0]]);
        hf.setCellContents({ sheet: sheetId, col: 6, row: apRow }, [[500000]]);

        const draw = hf.getCellValue({ sheet: sheetId, col: 6, row: drawRow });
        const finalCash = hf.getCellValue({ sheet: sheetId, col: 6, row: finalCashRow });
        const preFin = hf.getCellValue({ sheet: sheetId, col: 6, row: preFinRow });

        // Buffer is 50k. 
        // Draw + PreFin should = 50k (approximately, ignoring minor interest diffs if calculated post)
        // Actually Ending Cash = PreFin + Draw - Repay - Interest.
        // If PreFin is negative (-400k), Draw should be (50k - -400k) = 450k.

        expect(draw).toBeGreaterThan(0);
        // Precision might be floaty
        expect(Number(finalCash)).toBeCloseTo(50000, 0); // Check if we landed on the buffer
    });

    test('should serialize and deserialize correctly', () => {
        const serialized = hf.getAllSheetsSerialized();
        const hf2 = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });

        for (const [name, content] of Object.entries(serialized)) {
            if (!hf2.doesSheetExist(name)) hf2.addSheet(name);
            const sId = hf2.getSheetId(name);
            hf2.setSheetContent(sId!, content);
        }

        const sheetId2 = hf2.getSheetId(hf.getSheetName(sheetId)!);
        // Check Week 2 Payroll in new instance
        const sheetValues = hf2.getSheetValues(sheetId2!);
        let payrollRow = -1;
        for (let i = 0; i < sheetValues.length; i++) {
            if (sheetValues[i][0] === 'Payroll (Bi-Weekly)') {
                payrollRow = i;
                break;
            }
        }
        const w2 = hf2.getCellValue({ sheet: sheetId2!, col: 2, row: payrollRow });
        expect(w2).toBe(75000);
    });

    test('should match original values after serialization (Performance Benchmark)', () => {
        const startBuild = process.hrtime();
        const { hf: hfBench, sheetId: sheetIdBench } = buildWeeklyModel();
        const endBuild = process.hrtime(startBuild);
        const buildTime = (endBuild[0] * 1000 + endBuild[1] / 1e6).toFixed(2);
        console.log(`[Weekly] Model Creation Time: ${buildTime}ms`);

        const startExport = process.hrtime();
        const serialized = hfBench.getAllSheetsSerialized();
        const endExport = process.hrtime(startExport);
        const exportTime = (endExport[0] * 1000 + endExport[1] / 1e6).toFixed(2);
        console.log(`[Weekly] Export Time: ${exportTime}ms`);

        const startImport = process.hrtime();
        const hfImport = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
        for (const [name, content] of Object.entries(serialized)) {
            if (!hfImport.doesSheetExist(name)) hfImport.addSheet(name);
            const sId = hfImport.getSheetId(name);
            hfImport.setSheetContent(sId!, content);
        }
        const endImport = process.hrtime(startImport);
        const importTime = (endImport[0] * 1000 + endImport[1] / 1e6).toFixed(2);
        console.log(`[Weekly] Import Time: ${importTime}ms`);

        // Verify Data Integrity
        const originalName = hfBench.getSheetName(sheetIdBench);
        const importedSheetId = hfImport.getSheetId(originalName!);
        expect(importedSheetId).toBeDefined();

        // Check a random value (e.g., Week 2 Payroll)
        const sheetValues = hfImport.getSheetValues(importedSheetId!);
        let payrollRow = -1;
        for (let i = 0; i < sheetValues.length; i++) {
            if (sheetValues[i][0] === 'Payroll (Bi-Weekly)') {
                payrollRow = i;
                break;
            }
        }
        const val = hfImport.getCellValue({ sheet: importedSheetId!, col: 2, row: payrollRow });
        expect(val).toBe(75000);
    });
});
