import { HyperFormula } from 'hyperformula';

const SHEET_NAME = 'WeeklyCashFlow';
const WEEKS = 13;

export function buildWeeklyModel() {
    const hf = HyperFormula.buildEmpty({
        licenseKey: 'gpl-v3',
    });

    const sheetName = hf.addSheet(SHEET_NAME);
    const sheetId = hf.getSheetId(sheetName);
    if (sheetId === undefined) throw new Error('Failed to create sheet');

    // Helper for A1 notation
    function getAddr(colIndex: number, rowIndex: number): string {
        // Simple A-Z, AA-AZ converter if needed, but for 13 weeks we essentially need columns A-N (0-13)
        // Col 0 = Labels. Col 1 = W1.
        let colLabel = '';
        let t;
        let num = colIndex;
        while (num >= 0) {
            t = num % 26;
            colLabel = String.fromCharCode(t + 65) + colLabel;
            num = Math.floor(num / 26) - 1;
        }
        return `${colLabel}${rowIndex + 1}`;
    }

    let currentRow = 0;

    // 1. Headers
    const headers = ['Metric', ...Array.from({ length: WEEKS }, (_, i) => `Week ${i + 1}`)];
    hf.setCellContents({ sheet: sheetId, row: currentRow++, col: 0 }, [headers]);

    // ---------------------------------------------------------
    // 2. Billings & Collections (Inflows)
    // ---------------------------------------------------------
    hf.setCellContents({ sheet: sheetId, row: currentRow++, col: 0 }, [['--- INFLOWS ---']]);

    // Billings Input
    const billingsRow = currentRow++;
    // Simulate ~100k/week fluctuating
    const billingsData = Array.from({ length: WEEKS }, () => 100000 + Math.floor(Math.random() * 20000));
    hf.setCellContents({ sheet: sheetId, row: billingsRow, col: 0 }, [['Billings (Invoiced)', ...billingsData]]);

    // Collections
    const currentCollRow = currentRow++;
    const net30CollRow = currentRow++;
    const net60CollRow = currentRow++;
    const totalReceiptsRow = currentRow++;

    const currentFormulas = [];
    const net30Formulas = [];
    const net60Formulas = [];
    const totalReceiptsFormulas = [];

    for (let i = 0; i < WEEKS; i++) {
        const col = getAddr(i + 1, 0).replace(/[0-9]/g, ''); // Get column letter logic properly? 
        // Actually getAddr returns full address "B2". We just need column of Billing Row.
        const billingRefForWeek = (w: number) => {
            if (w < 0) return '0'; // Prior period assumption 0 for simplicity
            return getAddr(w + 1, billingsRow);
        };

        // 40% Current
        currentFormulas.push(`=0.4 * ${billingRefForWeek(i)}`);

        // 40% Net 30 (Lags 4 weeks)
        // If i=0 (Week 1), we reference Week -3 (Prior). Assume 0 for simplicity or seed.
        // Let's rely on valid ref.
        if (i >= 4) {
            net30Formulas.push(`=0.4 * ${billingRefForWeek(i - 4)}`);
        } else {
            net30Formulas.push('=20000'); // Seed prior period AR
        }

        // 20% Net 60 (Lags 8 weeks)
        if (i >= 8) {
            net60Formulas.push(`=0.2 * ${billingRefForWeek(i - 8)}`);
        } else {
            net60Formulas.push('=10000'); // Seed prior period AR
        }

        totalReceiptsFormulas.push(`=${getAddr(i + 1, currentCollRow)} + ${getAddr(i + 1, net30CollRow)} + ${getAddr(i + 1, net60CollRow)}`);
    }

    hf.setCellContents({ sheet: sheetId, row: currentCollRow, col: 0 }, [['Collections (Current)', ...currentFormulas]]);
    hf.setCellContents({ sheet: sheetId, row: net30CollRow, col: 0 }, [['Collections (Net 30)', ...net30Formulas]]);
    hf.setCellContents({ sheet: sheetId, row: net60CollRow, col: 0 }, [['Collections (Net 60)', ...net60Formulas]]);
    hf.setCellContents({ sheet: sheetId, row: totalReceiptsRow, col: 0 }, [['Total Cash Receipts', ...totalReceiptsFormulas]]);


    // ---------------------------------------------------------
    // 3. Disbursements (Outflows)
    // ---------------------------------------------------------
    hf.setCellContents({ sheet: sheetId, row: currentRow++, col: 0 }, [['--- OUTFLOWS ---']]);

    // Payroll (Bi-weekly: Week 2, 4, 6...)
    const payrollRow = currentRow++;
    const payrollFormulas = Array.from({ length: WEEKS }, (_, i) => {
        // Week 1 is index 0. Week 2 is index 1.
        // Even weeks (2, 4) -> indices 1, 3.
        return ((i + 1) % 2 === 0) ? '=75000' : '=0';
    });
    hf.setCellContents({ sheet: sheetId, row: payrollRow, col: 0 }, [['Payroll (Bi-Weekly)', ...payrollFormulas]]);

    // Rent (Monthly: Week 1, 5, 9)
    const rentRow = currentRow++;
    const rentFormulas = Array.from({ length: WEEKS }, (_, i) => {
        // Week 1 (i=0), Week 5 (i=4). i % 4 === 0.
        return (i % 4 === 0) ? '=15000' : '=0';
    });
    hf.setCellContents({ sheet: sheetId, row: rentRow, col: 0 }, [['Rent (Monthly)', ...rentFormulas]]);

    // AP/Opex Variable
    const apRow = currentRow++;
    const apInputs = Array.from({ length: WEEKS }, () => 20000 + Math.floor(Math.random() * 5000));
    hf.setCellContents({ sheet: sheetId, row: apRow, col: 0 }, [['Vendor AP', ...apInputs]]);

    // Total Disbursements
    const totalDisbRow = currentRow++;
    const totalDisbFormulas = Array.from({ length: WEEKS }, (_, i) => {
        const colLetter = getAddr(i + 1, 0).replace(/[0-9]/g, '');
        return `=${getAddr(i + 1, payrollRow)} + ${getAddr(i + 1, rentRow)} + ${getAddr(i + 1, apRow)}`;
    });
    hf.setCellContents({ sheet: sheetId, row: totalDisbRow, col: 0 }, [['Total Disbursements', ...totalDisbFormulas]]);


    // ---------------------------------------------------------
    // 4. Treasury (Revolver Logic)
    // ---------------------------------------------------------
    hf.setCellContents({ sheet: sheetId, row: currentRow++, col: 0 }, [['--- TREASURY ---']]);

    // Rows needed:
    // Beginning Cash (Ref Prev Ending)
    // Net Operating CF
    // Pre-Financing Cash
    // LOC Balance Opening
    // Revolver Draw (Calculated)
    // Revolver Repay (Calculated)
    // Interest Expense
    // Ending Cash
    // LOC Balance Closing

    const beginCashRow = currentRow++;
    const netOpRow = currentRow++;
    const preFinRow = currentRow++;
    const locOpenRow = currentRow++;
    const drawRow = currentRow++;
    const repayRow = currentRow++;
    const interestRow = currentRow++;
    const endCashRow = currentRow++;
    const locCloseRow = currentRow++;

    const MIN_BUFFER = 50000;
    const LOC_LIMIT = 500000; // Not strictly enforcing limit in logic for now, but implies capacity.

    const beginCashFormulas = [];
    const netOpFormulas = [];
    const preFinFormulas = [];
    const locOpenFormulas = [];
    const drawFormulas = [];
    const repayFormulas = [];
    const interestFormulas = [];
    const endCashFormulas = [];
    const locCloseFormulas = [];

    // Iterative build due to dependencies
    for (let i = 0; i < WEEKS; i++) {
        const col = (r: number) => getAddr(i + 1, r);

        // 1. Beginning Cash
        if (i === 0) {
            beginCashFormulas.push('=25000'); // Starting low to trigger draw? No, let's start at 60k.
        } else {
            beginCashFormulas.push(`=${getAddr(i, endCashRow)}`); // Prev Week Ending
        }

        // 2. Net Op
        netOpFormulas.push(`=${getAddr(i + 1, totalReceiptsRow)} - ${getAddr(i + 1, totalDisbRow)}`);

        // 3. Pre-Financing
        preFinFormulas.push(`=${col(beginCashRow)} + ${col(netOpRow)}`);

        // 4. LOC Opening
        if (i === 0) {
            locOpenFormulas.push('=0');
        } else {
            locOpenFormulas.push(`=${getAddr(i, locCloseRow)}`);
        }

        // 5. Draw Logic
        // IF(PreFin < 50k, 50k - PreFin, 0)
        drawFormulas.push(`=IF(${col(preFinRow)} < ${MIN_BUFFER}, ${MIN_BUFFER} - ${col(preFinRow)}, 0)`);

        // 6. Repay Logic
        // IF(PreFin > 50k, MIN(LOC_Open, PreFin - 50k), 0)
        // Only repay if we have excess cash AND we have a balance.
        repayFormulas.push(`=IF(${col(preFinRow)} > ${MIN_BUFFER}, MIN(${col(locOpenRow)}, ${col(preFinRow)} - ${MIN_BUFFER}), 0)`);

        // 7. Interest (Simulated on Opening Balance for simplicity circularity avoidance)
        // 5% annual / 52 weeks
        interestFormulas.push(`=${col(locOpenRow)} * 0.05 / 52`);

        // 8. Ending Cash
        // PreFin + Draw - Repay - Interest
        endCashFormulas.push(`=${col(preFinRow)} + ${col(drawRow)} - ${col(repayRow)} - ${col(interestRow)}`);

        // 9. LOC Closing
        // Open + Draw - Repay
        locCloseFormulas.push(`=${col(locOpenRow)} + ${col(drawRow)} - ${col(repayRow)}`);
    }

    hf.setCellContents({ sheet: sheetId, row: beginCashRow, col: 0 }, [['Beginning Cash', ...beginCashFormulas]]);
    hf.setCellContents({ sheet: sheetId, row: netOpRow, col: 0 }, [['Net Operating CF', ...netOpFormulas]]);
    hf.setCellContents({ sheet: sheetId, row: preFinRow, col: 0 }, [['Pre-Financing Cash', ...preFinFormulas]]);
    hf.setCellContents({ sheet: sheetId, row: locOpenRow, col: 0 }, [['LOC Opening Bal', ...locOpenFormulas]]);
    hf.setCellContents({ sheet: sheetId, row: drawRow, col: 0 }, [['Revolver Draw', ...drawFormulas]]);
    hf.setCellContents({ sheet: sheetId, row: repayRow, col: 0 }, [['Revolver Repay', ...repayFormulas]]);
    hf.setCellContents({ sheet: sheetId, row: interestRow, col: 0 }, [['Interest Exp', ...interestFormulas]]);
    hf.setCellContents({ sheet: sheetId, row: endCashRow, col: 0 }, [['Ending Cash', ...endCashFormulas]]);
    hf.setCellContents({ sheet: sheetId, row: locCloseRow, col: 0 }, [['LOC Closing Bal', ...locCloseFormulas]]);

    return { hf, sheetId, sheetName };
}
