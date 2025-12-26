import { HyperFormula } from 'hyperformula';

console.log("--- RECALCULATION VERIFICATION ---");

// 1. Setup Original
const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
const sheetName = hf.addSheet('Test');
const sheetId = hf.getSheetId(sheetName)!;

// A1 = 10
// B1 = A1 * 2
hf.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [[10]]);
hf.setCellContents({ sheet: sheetId, col: 1, row: 0 }, [['=A1 * 2']]);

const v1 = hf.getCellValue({ sheet: sheetId, col: 1, row: 0 });
console.log(`Original B1 (Should be 20): ${v1}`);

// 2. Serialize
console.log("Serializing (preserving formulas)...");
const serialized = hf.getAllSheetsSerialized();
// inspect serialized structure specifically for B1
const sheetData = serialized['Test'];
// It's likely an array of rows. Row 0, Col 1.
// We can log it to show the user it is a formula string, not a number.
console.log(`Serialized Data for A1: ${JSON.stringify(sheetData[0][0])}`);
console.log(`Serialized Data for B1: ${JSON.stringify(sheetData[0][1])}`);

// 3. Re-import
console.log("Re-importing into new instance...");
const hf2 = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
for (const [name, content] of Object.entries(serialized)) {
    hf2.addSheet(name);
    const sId = hf2.getSheetId(name)!;
    hf2.setSheetContent(sId, content);
}

const sId2 = hf2.getSheetId('Test')!;
const v2 = hf2.getCellValue({ sheet: sId2, col: 1, row: 0 });
console.log(`Re-imported B1 (Should be 20): ${v2}`);

// 4. Mutation Check
console.log("Mutating Re-imported A1 to 50...");
hf2.setCellContents({ sheet: sId2, col: 0, row: 0 }, [[50]]);

// 5. Check Result
const v3 = hf2.getCellValue({ sheet: sId2, col: 1, row: 0 });
console.log(`Post-Mutation B1 (Should be 100): ${v3}`);

if (v3 === 100) {
    console.log("SUCCESS: Model is live and recalculating properly.");
} else {
    console.error("FAILURE: Model did not update dependent value.");
}
