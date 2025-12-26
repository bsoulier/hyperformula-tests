import { buildModel } from './modelBuilder';
import { HyperFormula } from 'hyperformula';

console.log('--- START PERFORMANCE CHECK ---');

// 1. Creation
const startBuild = process.hrtime();
const { hf, sheetId } = buildModel();
const endBuild = process.hrtime(startBuild);
const buildTimeMs = (endBuild[0] * 1000 + endBuild[1] / 1e6).toFixed(2);

// 2. Export
const startSave = process.hrtime();
const serialized = hf.getAllSheetsSerialized();
const endSave = process.hrtime(startSave);
const saveTimeMs = (endSave[0] * 1000 + endSave[1] / 1e6).toFixed(2);

// 3. Import
const startLoad = process.hrtime();
const hf2 = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
for (const [name, content] of Object.entries(serialized)) {
    if (!hf2.doesSheetExist(name)) {
        hf2.addSheet(name);
    }
    const sId = hf2.getSheetId(name);
    if (sId === undefined) throw new Error("Sheet addition failed for " + name);
    hf2.setSheetContent(sId, content);
}
const endLoad = process.hrtime(startLoad);
const loadTimeMs = (endLoad[0] * 1000 + endLoad[1] / 1e6).toFixed(2);

// 4. Calculation (First Access)
const startCalc = process.hrtime();
const originalSheetName = hf.getSheetName(sheetId);
const sheetId2 = hf2.getSheetId(originalSheetName!); // Bang operator safe-ish here as we just verified existence implicitly
if (sheetId2 === undefined) throw new Error("Sheet ID 2 not found");

// Access a dependent value to trigger calculation
const val2 = hf2.getCellValue({ sheet: sheetId2, col: 60, row: 5 });
const endCalc = process.hrtime(startCalc);
const calcTimeMs = (endCalc[0] * 1000 + endCalc[1] / 1e6).toFixed(2);

// 5. Mutation & Recalculation
const startMutate = process.hrtime();
// Change Month 1 New Customers from 10 to 50
// In Builder: Headers(0), NewCust(1). Cell B2 (Col 1, Row 1).
hf2.setCellContents({ sheet: sheetId2, col: 1, row: 1 }, [[50]]);
const endMutate = process.hrtime(startMutate);
const mutateTimeMs = (endMutate[0] * 1000 + endMutate[1] / 1e6).toFixed(2);

// 6. Final Read/Validation check of dependent cells
const finalVal = hf2.getCellValue({ sheet: sheetId2, col: 60, row: 5 });

// 7. Override Mutation (Balance Sheet)
const startOverride = process.hrtime();

// Finding "Manual Override" row
const sheetValues = hf2.getSheetValues(sheetId2);
let overrideRow = -1;
for (let r = 0; r < sheetValues.length; r++) {
    if (sheetValues[r][0] === 'Manual Override') {
        overrideRow = r;
        break;
    }
}

if (overrideRow === -1) {
    console.warn("Manual Override row not found!");
} else {
    // Override Month 12 (Col 12) with 1,000,000 Cash
    hf2.setCellContents({ sheet: sheetId2, col: 12, row: overrideRow }, [[1000000]]);
    // This should trigger recalculation for Months 13-60
}

const endOverride = process.hrtime(startOverride);
const overrideTimeMs = (endOverride[0] * 1000 + endOverride[1] / 1e6).toFixed(2);

const report = `
---------------------------------------------------
PERFORMANCE REPORT (COMPLEX MODEL)
---------------------------------------------------
Model Creation Time    : ${buildTimeMs} ms
Model Export Time      : ${saveTimeMs} ms
Model Re-import Time   : ${loadTimeMs} ms
Model Calculation Time : ${calcTimeMs} ms
Model Mutation Time    : ${mutateTimeMs} ms (Driver Change)
Model Override Time    : ${overrideTimeMs} ms (Manual Reset)
---------------------------------------------------
`;
console.log(report);
require('fs').writeFileSync('final_report.txt', report);
