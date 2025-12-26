import { HyperFormula } from 'hyperformula';

try {
    const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    const sheetName = hf.addSheet('Test');
    const sheetId = hf.getSheetId(sheetName);
    if (sheetId === undefined) throw new Error("Sheet ID not found");
    // @ts-ignore
    hf.setCellContents({ sheet: sheetId, row: 0, col: 0 }, [['=1+1']]);

    console.log('--- getAllSheetsValues (Should be 2) ---');
    console.log(JSON.stringify(hf.getAllSheetsValues()));

    console.log('--- getAllSheetsSerialized (Should be =1+1) ---');
    // @ts-ignore
    if (hf.getAllSheetsSerialized) {
        // @ts-ignore
        console.log(JSON.stringify(hf.getAllSheetsSerialized()));
    } else {
        console.log('getAllSheetsSerialized method missing');
    }

    console.log('--- getFillableSheets (Should be =1+1) ---');
    // @ts-ignore
    if (hf.getFillableSheets) {
        // @ts-ignore
        console.log(JSON.stringify(hf.getFillableSheets()));
    } else {
        console.log('getFillableSheets method missing');
    }
} catch (err) {
    console.error(err);
}
