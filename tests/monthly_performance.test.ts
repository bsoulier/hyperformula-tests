import { buildModel } from '../src/modelBuilder';

describe('Financial Model Performance', () => {
    it('should build the model and calculate values correctly', () => {
        const start = Date.now();
        const { hf, sheetId } = buildModel();
        const end = Date.now();

        console.log(`Model build time: ${end - start}ms`);

        // Basic validity check
        const width = hf.getSheetDimensions(sheetId).width;
        expect(width).toBeGreaterThan(60); // 60 months + labels

        // Check if Total Revenue (last calculated section) is numeric and > 0
        // We need to find the specific cell. 
        // Since we don't have exact coordinates returned, we search for the "Total Revenue" label.
        // In a real app we would map these coordinates.
        // For this test, we scan column A (0).

        // const col0 = hf.getSimpleCellAddress({ sheet: sheetId, col: 0, row: 0 });

        // getSheetValues returns the whole sheet data
        const values = hf.getSheetValues(sheetId);
        let totalRevRowIndex = -1;
        for (let r = 0; r < values.length; r++) {
            if (values[r][0] === 'Total Revenue') {
                totalRevRowIndex = r;
                break;
            }
        }

        expect(totalRevRowIndex).not.toBe(-1);

        const month1Rev = values[totalRevRowIndex][1]; // Month 1
        const month60Rev = values[totalRevRowIndex][60]; // Month 60

        // Month 1 Revenue should be:
        // New Customers (10) * Setup Fee (100) = 1000
        // + Recurring: Total Cust (10) * Price (50) = 500
        // Total = 1500
        // Note: The logic in builder was:
        // Total Cust Month 1 = New (10)
        // Recurring = Total * Price = 10 * 50 = 500
        // Setup = New * Setup = 10 * 100 = 1000
        // Total = 1500.

        expect(month1Rev).toBe(1500);
        expect(month60Rev).toBeGreaterThan(1500); // Should grow
    });

    it('should serialize and deserialize correctly', () => {
        // --- 1. Creation ---
        const startBuild = process.hrtime();
        const { hf, sheetId } = buildModel();
        const endBuild = process.hrtime(startBuild);
        const buildTimeMs = (endBuild[0] * 1000 + endBuild[1] / 1e6).toFixed(2);

        // --- 2. Export (Serialization) ---
        const startSave = process.hrtime();
        const serialized = hf.getAllSheetsSerialized();
        const endSave = process.hrtime(startSave);
        const saveTimeMs = (endSave[0] * 1000 + endSave[1] / 1e6).toFixed(2);

        expect(serialized).toBeDefined();

        // --- 3. Re-import ---
        const { HyperFormula } = require('hyperformula');

        const startLoad = process.hrtime();
        // For true restoration, we use buildFromConfig or manually set serialized content
        const hf2 = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });

        // getAllSheetsSerialized returns { [sheetName]: cells }. 
        // We need to iterate and add sheets.
        for (const [name, content] of Object.entries(serialized)) {
            if (!hf2.doesSheetExist(name)) { // In case buildEmpty creates default sheet
                hf2.addSheet(name);
            }
            const sId = hf2.getSheetId(name);
            hf2.setSheetContent(sId, content);
        }

        const endLoad = process.hrtime(startLoad);
        const loadTimeMs = (endLoad[0] * 1000 + endLoad[1] / 1e6).toFixed(2);

        // --- 4. First Access / Calculation ---
        // Accessing a dependent value (Month 60 Net Income) to trigger evaluation
        const startCalc = process.hrtime();
        const originalSheetName = hf.getSheetName(sheetId);
        const sheetId2 = hf2.getSheetId(originalSheetName);
        // Use distinct variable for measurement checks
        const calcCheckVal = hf2.getCellValue({ sheet: sheetId2, col: 60, row: 5 });
        const tempVal = hf2.getCellValue({ sheet: sheetId2, col: 1, row: 5 });
        const endCalc = process.hrtime(startCalc);
        const calcTimeMs = (endCalc[0] * 1000 + endCalc[1] / 1e6).toFixed(2);

        console.log(`
---------------------------------------------------
PERFORMANCE REPORT
---------------------------------------------------
Model Creation Time    : ${buildTimeMs} ms
Model Export Time      : ${saveTimeMs} ms
Model Re-import Time   : ${loadTimeMs} ms
Model Calculation Time : ${calcTimeMs} ms (First Access)
---------------------------------------------------
    `);

        // Verification of data
        // const originalSheetName = hf.getSheetName(sheetId);
        // const sheetId2 = hf2.getSheetId(originalSheetName);

        const val1 = hf.getCellValue({ sheet: sheetId, col: 1, row: 5 });
        const valFinal = hf2.getCellValue({ sheet: sheetId2, col: 1, row: 5 });
        expect(valFinal).toBe(val1);
    });
});
