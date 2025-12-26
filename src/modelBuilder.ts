import { HyperFormula } from 'hyperformula';

// Sheet Configuration
const SHEET_NAME = 'FinancialModel';
const TOTAL_MONTHS = 60;
const EMPLOYEE_COUNT = 20;

// Named ranges or coordinates helper could be useful, but for direct references we'll use cell addresses.

export function buildModel() {
    const hf = HyperFormula.buildEmpty({
        licenseKey: 'gpl-v3',
    });

    const sheetName = hf.addSheet(SHEET_NAME);
    const sheetId = hf.getSheetId(sheetName);
    if (sheetId === undefined) {
        throw new Error('Failed to create sheet');
    }

    // ---------------------------------------------------------
    // 1. Headers (Row 0)
    // ---------------------------------------------------------
    const headers = ['Metric', ...Array.from({ length: TOTAL_MONTHS }, (_, i) => `Month ${i + 1}`)];
    hf.setCellContents({ sheet: sheetId, row: 0, col: 0 }, [headers]);

    let currentRow = 1;

    // ---------------------------------------------------------
    // 2. SaaS Metrics (Drivers)
    // ---------------------------------------------------------
    // Row 1: New Customers per Month
    const newCustRow = currentRow++;
    const newCustInputs = Array(TOTAL_MONTHS).fill(10);
    hf.setCellContents({ sheet: sheetId, row: newCustRow, col: 0 }, [['New Customers', ...newCustInputs]]);

    // Row 2: Churn Rate
    const churnRow = currentRow++;
    const churnInputs = Array(TOTAL_MONTHS).fill(0.05);
    hf.setCellContents({ sheet: sheetId, row: churnRow, col: 0 }, [['Churn Rate', ...churnInputs]]);

    // Row 3: Subscription Price
    const priceRow = currentRow++;
    const priceInputs = Array(TOTAL_MONTHS).fill(50);
    hf.setCellContents({ sheet: sheetId, row: priceRow, col: 0 }, [['Price', ...priceInputs]]);

    // Row 4: Setup Fee
    const setupFeeRow = currentRow++;
    const setupFeeInputs = Array(TOTAL_MONTHS).fill(100);
    hf.setCellContents({ sheet: sheetId, row: setupFeeRow, col: 0 }, [['Setup Fee', ...setupFeeInputs]]);

    // Row 5: Total Customers (Calculated)
    const totalCustRow = currentRow++;
    const totalCustFormulas = [];
    for (let col = 1; col <= TOTAL_MONTHS; col++) {
        const colLetter = numToChar(col);
        if (col === 1) {
            totalCustFormulas.push(`=${numToChar(col)}${newCustRow + 1}`);
        } else {
            const prevCol = numToChar(col - 1);
            totalCustFormulas.push(`=${prevCol}${totalCustRow + 1} + ${colLetter}${newCustRow + 1} - (${prevCol}${totalCustRow + 1} * ${colLetter}${churnRow + 1})`);
        }
    }
    hf.setCellContents({ sheet: sheetId, row: totalCustRow, col: 0 }, [['Total Customers', ...totalCustFormulas]]);

    // Row 6: Recurring Revenue
    const arrRow = currentRow++;
    const arrFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        return `=${col}${totalCustRow + 1} * ${col}${priceRow + 1}`;
    });
    hf.setCellContents({ sheet: sheetId, row: arrRow, col: 0 }, [['Recurring Revenue', ...arrFormulas]]);

    // Row 7: Setup Revenue
    const setupRevRow = currentRow++;
    const setupRevFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        return `=${col}${newCustRow + 1} * ${col}${setupFeeRow + 1}`;
    });
    hf.setCellContents({ sheet: sheetId, row: setupRevRow, col: 0 }, [['Setup Revenue', ...setupRevFormulas]]);


    // ---------------------------------------------------------
    // 3. Infrastructure (Tiered Costs)
    // ---------------------------------------------------------
    // Tier 1: 0-100 ($500). Tier 2: 101-500 ($500 + 5/user). Tier 3: 500+ ($2500 + 3/user).
    const serverCostRow = currentRow++;
    const serverCostFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        const custCell = `${col}${totalCustRow + 1}`;
        // Nested IF: IF(Cust<=100, 500, IF(Cust<=500, 500 + (Cust-100)*5, 2500 + (Cust-500)*3))
        return `=IF(${custCell}<=100, 500, IF(${custCell}<=500, 500 + (${custCell}-100)*5, 2500 + (${custCell}-500)*3))`;
    });
    hf.setCellContents({ sheet: sheetId, row: serverCostRow, col: 0 }, [['Server Costs', ...serverCostFormulas]]);


    // ---------------------------------------------------------
    // 4. Employee Section
    // ---------------------------------------------------------
    const activeHeadcountRow = currentRow++; // We will calculate this row first
    // But we need individual employee rows to sum up active status.
    // Let's create employee rows first and then sum them up? 
    // Or we just calculate Headcount based on start dates?
    // Let's do implicit count.

    const salaryRows: number[] = [];
    const insuranceRows: number[] = [];
    const activeStatusRows: number[] = [];

    for (let i = 0; i < EMPLOYEE_COUNT; i++) {
        const startMonth = Math.floor(Math.random() * 24) + 1;
        const salary = 5000 + Math.floor(Math.random() * 5000);
        const baseInsurance = 500;

        currentRow++;
        hf.setCellContents({ sheet: sheetId, row: currentRow, col: 0 }, [[`Employee ${i + 1} (Starts M${startMonth})`]]);

        // Active Status (0 or 1) - Helper for Variable Costs
        const statusRow = currentRow++;
        activeStatusRows.push(statusRow);
        const statusFormulas = Array.from({ length: TOTAL_MONTHS }, (_, m) => (m + 1) >= startMonth ? '=1' : '=0');
        hf.setCellContents({ sheet: sheetId, row: statusRow, col: 0 }, [['Active', ...statusFormulas]]);

        // Salary Row (Salary * Active)
        const salRow = currentRow++;
        salaryRows.push(salRow);
        const salFormulas = Array.from({ length: TOTAL_MONTHS }, (_, m) => {
            const col = numToChar(m + 1);
            return `=${salary} * ${col}${statusRow + 1}`;
        });
        hf.setCellContents({ sheet: sheetId, row: salRow, col: 0 }, [['Salary', ...salFormulas]]);

        // Insurance Row (Base * (1.05^Year) * Active)
        const insRow = currentRow++;
        insuranceRows.push(insRow);
        const insFormulas = Array.from({ length: TOTAL_MONTHS }, (_, m) => {
            const col = numToChar(m + 1);
            const yearIndex = Math.floor(m / 12);
            // Compound mult
            const compound = Math.pow(1.05, yearIndex).toFixed(4); // Pre-calc constant for simplicity string
            return `=${baseInsurance} * ${compound} * ${col}${statusRow + 1}`;
        });
        hf.setCellContents({ sheet: sheetId, row: insRow, col: 0 }, [['Insurance', ...insFormulas]]);
    }

    // Total Headcount (Sum of Active Status)
    const totalHeadcoundRow = currentRow++; // Actually we reserved one above but index changed.
    // Let's just create it now.
    const headcountFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        const refs = activeStatusRows.map(r => `${col}${r + 1}`).join('+');
        return `=${refs}`;
    });
    hf.setCellContents({ sheet: sheetId, row: totalHeadcoundRow, col: 0 }, [['Total Headcount', ...headcountFormulas]]);


    // ---------------------------------------------------------
    // 5. Facilities
    // ---------------------------------------------------------
    // Office Rent: Base 10000 * 1.03^Year
    const rentRow = currentRow++;
    const rentFormulas = Array.from({ length: TOTAL_MONTHS }, (_, m) => {
        const yearIndex = Math.floor(m / 12);
        const compound = Math.pow(1.03, yearIndex).toFixed(4);
        return `=10000 * ${compound}`;
    });
    hf.setCellContents({ sheet: sheetId, row: rentRow, col: 0 }, [['Office Rent', ...rentFormulas]]);

    // Variable Office Costs: 200 * Headcount
    const varOfficeRow = currentRow++;
    const varOfficeFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        return `=200 * ${col}${totalHeadcoundRow + 1}`;
    });
    hf.setCellContents({ sheet: sheetId, row: varOfficeRow, col: 0 }, [['Variable Office Costs', ...varOfficeFormulas]]);

    // Marketing: 10% of Previous Month Revenue (Circular/Lag check?)
    // Month 1 Marketing = 0 (or seed).
    const marketingRow = currentRow++;
    const marketingFormulas = [];
    for (let i = 0; i < TOTAL_MONTHS; i++) {
        const col = numToChar(i + 1);
        if (i === 0) {
            marketingFormulas.push('=1000'); // Seed
        } else {
            // 10% of Prev Revenue
            const prevCol = numToChar(i);
            // Revenue Row index? We haven't built Total Revenue row yet? 
            // WAIT. We need Revenue calculated BEFORE this if we reference it.
            // OR we reference it and HF solves dependency. HF solves dependency!
            // But we need the ROW INDEX of Total Revenue.
            // Let's assume Total Revenue will be at `currentRow + X`.
            // Actually, we can just sum ARR + Setup here inline?
            // Or better, build Total Revenue higher up?
            // Let's reference the ARR + Setup rows we already have.
            // Total Revenue = arrRow + setupRevRow
            marketingFormulas.push(`=0.1 * (${prevCol}${arrRow + 1} + ${prevCol}${setupRevRow + 1})`);
        }
    }
    hf.setCellContents({ sheet: sheetId, row: marketingRow, col: 0 }, [['Marketing', ...marketingFormulas]]);


    // ---------------------------------------------------------
    // 6. Financial Statements
    // ---------------------------------------------------------
    currentRow++;
    hf.setCellContents({ sheet: sheetId, row: currentRow, col: 0 }, [['--- INCOME STATEMENT ---']]);
    currentRow++;

    // Total Revenue
    const totalRevRow = currentRow++;
    const totalRevFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        return `=${col}${arrRow + 1} + ${col}${setupRevRow + 1}`;
    });
    hf.setCellContents({ sheet: sheetId, row: totalRevRow, col: 0 }, [['Total Revenue', ...totalRevFormulas]]);

    // Gross Profit (Rev - Server)
    const grossProfitRow = currentRow++;
    const gpFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        return `=${col}${totalRevRow + 1} - ${col}${serverCostRow + 1}`;
    });
    hf.setCellContents({ sheet: sheetId, row: grossProfitRow, col: 0 }, [['Gross Profit', ...gpFormulas]]);

    // Operating Expenses
    const opexRow = currentRow++;
    const opexFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        // Payroll + Insurance+ Rent + VarOffice + Marketing
        // We need sums of payroll/insurance rows?
        // Let's sum valid arrays.
        const paySum = salaryRows.map(r => `${col}${r + 1}`).join('+');
        const insSum = insuranceRows.map(r => `${col}${r + 1}`).join('+');
        return `(${paySum}) + (${insSum}) + ${col}${rentRow + 1} + ${col}${varOfficeRow + 1} + ${col}${marketingRow + 1}`;
    });
    hf.setCellContents({ sheet: sheetId, row: opexRow, col: 0 }, [['Total OpEx', ...opexFormulas]]);

    // EBITDA
    const ebitdaRow = currentRow++;
    const ebitdaFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        return `=${col}${grossProfitRow + 1} - ${col}${opexRow + 1}`;
    });
    hf.setCellContents({ sheet: sheetId, row: ebitdaRow, col: 0 }, [['EBITDA', ...ebitdaFormulas]]);

    // Corporate Tax (21% of positive EBITDA)
    const taxRow = currentRow++;
    const taxFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        return `=IF(${col}${ebitdaRow + 1} > 0, ${col}${ebitdaRow + 1} * 0.21, 0)`;
    });
    hf.setCellContents({ sheet: sheetId, row: taxRow, col: 0 }, [['Corporate Tax', ...taxFormulas]]);

    // Net Income (EBITDA - Tax)
    const netIncomeRow = currentRow++;
    const netIncomeFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        return `=${col}${ebitdaRow + 1} - ${col}${taxRow + 1}`;
    });
    hf.setCellContents({ sheet: sheetId, row: netIncomeRow, col: 0 }, [['Net Income', ...netIncomeFormulas]]);


    // ---------------------------------------------------------
    // 7. Balance Sheet & Cash Flow (Overrides)
    // ---------------------------------------------------------
    currentRow++;
    hf.setCellContents({ sheet: sheetId, row: currentRow, col: 0 }, [['--- BALANCE SHEET ---']]);
    currentRow++;

    // We need 4 rows: Beginning, Change, Ending(Calc), Override, EffectiveEnding.
    // Beginning Cash: M1 = Seed (500k). M(n) = Prev EffectiveEnding.
    const beginCashRow = currentRow++;
    const changeCashRow = currentRow++;
    const endCashCalcRow = currentRow++;
    const overrideRow = currentRow++;
    const effectiveHighRow = currentRow++;

    // We have to build these iteratively because logic intertwines
    const beginFormulas = [];
    const changeFormulas = []; // = Net Income
    const endCalcFormulas = []; // = Begin + Change
    // Override is inputs, empty by default
    const effectiveFormulas = []; // = IF(Override, Override, EndCalc)

    for (let i = 0; i < TOTAL_MONTHS; i++) {
        const col = numToChar(i + 1);

        // 1. Beginning Cash
        if (i === 0) {
            beginFormulas.push('=500000');
        } else {
            const prevCol = numToChar(i);
            beginFormulas.push(`=${prevCol}${effectiveHighRow + 1}`);
        }

        // 2. Change (Net Income)
        changeFormulas.push(`=${col}${netIncomeRow + 1}`);

        // 3. Ending Calc
        endCalcFormulas.push(`=${col}${beginCashRow + 1} + ${col}${changeCashRow + 1}`);

        // 4. Override (Input) - We set empty values initially
        // HF setCellContents with empty strings or nulls? 
        // We'll leave them empty in the loop and set explicitly below? 
        // Actually we can set formulas to empty strings or just don't set them?
        // Let's set them to empty string `""` to ensure row exists.

        // 5. Effective Ending
        // IF(ISBLANK(Override), EndingCalc, Override)
        effectiveFormulas.push(`=IF(ISBLANK(${col}${overrideRow + 1}), ${col}${endCalcFormulas.length === 0 ? '0' : endCashCalcRow + 1}, ${col}${overrideRow + 1})`);
        // Wait, referencing `endCashCalcRow + 1` is safe as row number is constant.
    }

    // Batch set contents
    hf.setCellContents({ sheet: sheetId, row: beginCashRow, col: 0 }, [['Beginning Cash', ...beginFormulas]]);
    hf.setCellContents({ sheet: sheetId, row: changeCashRow, col: 0 }, [['Change in Cash', ...changeFormulas]]);
    hf.setCellContents({ sheet: sheetId, row: endCashCalcRow, col: 0 }, [['Ending Cash (Calc)', ...endCalcFormulas]]);

    // For override row, we want empty cells.
    const emptyOverrides = Array(TOTAL_MONTHS).fill(null);
    hf.setCellContents({ sheet: sheetId, row: overrideRow, col: 0 }, [['Manual Override', ...emptyOverrides]]);

    // Effective formulas need correction in loop? 
    // `endCashCalcRow` is resolved. 
    // `effectiveFormulas` pushed above should work.
    // One specific: `IF(ISBLANK(B45), B44, B45)`
    const effectiveFormulasCorrected = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
        const col = numToChar(i + 1);
        return `=IF(ISBLANK(${col}${overrideRow + 1}), ${col}${endCashCalcRow + 1}, ${col}${overrideRow + 1})`;
    });

    hf.setCellContents({ sheet: sheetId, row: effectiveHighRow, col: 0 }, [['Effective Closing Cash', ...effectiveFormulasCorrected]]);
    return { hf, sheetId, sheetName };
}

// Helper to convert index 1 to 'B', 2 to 'C', etc.
// 0 is 'A', but our data starts at col 1 (which is 'B' if 0-indexed? No wait.)
// HyperFormula A1 notation: Col 0 is A.
// Our headers are at Col 0 (Metric Name).
// Month 1 is Col 1 (B).
function numToChar(num: number): string {
    // 0 -> A, 1 -> B, etc.
    // Standard Excel column conversion
    let s = '';
    let t;

    // We want input 0 to be A, 1 to be B.
    // However, the loop above passes 1 for Month 1.
    // If Month 1 is at index 1, that is 'B'.

    while (num >= 0) {
        t = num % 26;
        s = String.fromCharCode(t + 65) + s;
        num = Math.floor(num / 26) - 1;
    }
    return s;
}
