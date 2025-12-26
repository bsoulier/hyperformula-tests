import { Injectable } from '@nestjs/common';
import { HyperFormula } from 'hyperformula';

@Injectable()
export class ModelService {
    private hf: HyperFormula;
    private sheetId: number;
    private nameRowMap: Map<string, number> = new Map();
    private formulaMap: Map<string, string> = new Map();

    constructor() {
        this.buildModel();
    }

    private numToChar(num: number): string {
        let s = '';
        let t;
        while (num >= 0) {
            t = num % 26;
            s = String.fromCharCode(t + 65) + s;
            num = Math.floor(num / 26) - 1;
        }
        return s;
    }

    private getMapKey(col: number, row: number): string {
        return `${col},${row}`;
    }


    private getAddress(col: number, row: number): string {
        const colLet = this.numToChar(col);
        return `${colLet}${row + 1}`;
    }

    private preprocessFormula(formula: string, currentCol: number): string {
        return formula.replace(/([A-Z_a-z][A-Z_a-z0-9]*)(?:\[\s*(-?\d+)\s*\])?/g, (match, name, offsetStr) => {
            const upperName = name.toUpperCase();
            if (this.nameRowMap.has(upperName)) {
                const targetRow = this.nameRowMap.get(upperName)!;
                const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
                const targetCol = currentCol + offset;
                // Basic bounds check (col 0 is header)
                // If target <= 0, we can't do much (HF might error or return empty).
                return this.getAddress(targetCol, targetRow);
            }
            return match;
        });
    }

    private buildModel() {
        this.hf = HyperFormula.buildEmpty({
            licenseKey: 'gpl-v3',
        });

        const SHEET_NAME = 'FinancialModel';
        const TOTAL_MONTHS = 60;
        const EMPLOYEE_COUNT = 20;

        const sheetName = this.hf.addSheet(SHEET_NAME);
        this.sheetId = this.hf.getSheetId(sheetName)!;
        this.nameRowMap.clear();

        let currentRow = 1; // 0 is Headers

        // --- Helpers ---
        // 1. Register Name
        const registerRow = (label: string, row: number, defaultVal: any[] | null = null) => {
            // Safe name: New Customers -> NEW_CUSTOMERS
            const safeName = label.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
            this.nameRowMap.set(safeName, row);

            // Also register HF Named Expression for "Whole Row" usage (useful for SUMs)
            try {
                const startCol = this.numToChar(1);
                const endCol = this.numToChar(TOTAL_MONTHS);
                const r = row + 1;
                this.hf.addNamedExpression(safeName, `'${SHEET_NAME}'!$${startCol}$${r}:$${endCol}$${r}`);
            } catch (e) { }

            // Set Label
            if (defaultVal) {
                this.hf.setCellContents({ sheet: this.sheetId, row, col: 0 }, [[label, ...defaultVal]]);
            } else {
                this.hf.setCellContents({ sheet: this.sheetId, row, col: 0 }, [[label]]);
            }
        };

        // 2. Set Row Formulas (with Compiling AND Storing)
        const setRowFormulas = (row: number, formulaGenerator: (monthIndex: number) => string) => {
            const formulas = [];
            for (let i = 1; i <= TOTAL_MONTHS; i++) {
                // i is column index (1-based)
                // monthIndex 0-based
                const rawFormula = formulaGenerator(i - 1);

                // STORE IT
                this.formulaMap.set(this.getMapKey(i, row), rawFormula);

                // Compile
                formulas.push(this.preprocessFormula(rawFormula, i));
            }
            this.hf.setCellContents({ sheet: this.sheetId, row, col: 1 }, [formulas]);
        };


        // 1. Headers
        const headers = ['Metric', ...Array.from({ length: TOTAL_MONTHS }, (_, i) => `Month ${i + 1}`)];
        this.hf.setCellContents({ sheet: this.sheetId, row: 0, col: 0 }, [headers]);

        // 2. SaaS Metrics
        const newCustRow = currentRow++;
        registerRow('New Customers', newCustRow, Array(TOTAL_MONTHS).fill(10));

        const churnRow = currentRow++;
        registerRow('Churn Rate', churnRow, Array(TOTAL_MONTHS).fill(0.05));

        const priceRow = currentRow++;
        registerRow('Price', priceRow, Array(TOTAL_MONTHS).fill(50));

        const setupFeeRow = currentRow++;
        registerRow('Setup Fee', setupFeeRow, Array(TOTAL_MONTHS).fill(100));


        const totalCustRow = currentRow++;
        registerRow('Total Customers', totalCustRow);
        setRowFormulas(totalCustRow, (i) => {
            if (i === 0) return '=NEW_CUSTOMERS';
            // Recursive: Prev + New - (Prev * Churn)
            // Notation: NAME[-1]
            return '=TOTAL_CUSTOMERS[-1] + NEW_CUSTOMERS - (TOTAL_CUSTOMERS[-1] * CHURN_RATE)';
        });

        // Example: 3-Month Lag Check (to demonstrate NAME[-3])
        const lagCheckRow = currentRow++;
        registerRow('Growth Lag Check', lagCheckRow);
        setRowFormulas(lagCheckRow, (i) => {
            if (i < 3) return '=0';
            return '=TOTAL_CUSTOMERS[-3]';
        });


        const arrRow = currentRow++;
        registerRow('Recurring Revenue', arrRow);
        setRowFormulas(arrRow, () => '=TOTAL_CUSTOMERS * PRICE');


        const setupRevRow = currentRow++;
        registerRow('Setup Revenue', setupRevRow);
        setRowFormulas(setupRevRow, () => '=NEW_CUSTOMERS * SETUP_FEE');

        // 3. Infrastructure
        const serverCostRow = currentRow++;
        registerRow('Server Costs', serverCostRow);
        setRowFormulas(serverCostRow, () => {
            // We can mix ref styles if needed, but preprocessing helps.
            // IF(Total_Customers <= 100...)
            return '=IF(TOTAL_CUSTOMERS<=100, 500, IF(TOTAL_CUSTOMERS<=500, 500 + (TOTAL_CUSTOMERS-100)*5, 2500 + (TOTAL_CUSTOMERS-500)*3))';
        });

        // 4. Employee (Detailed Rows + Aggregates)
        const activeHeadcountRow = currentRow++;
        // We can't easily map "Salaries" dynamic rows with this static map unless we generate names like SALARY_1.
        // For simplicity, we keep the loop logic for detailed rows but use Aggregates for Main Model.

        const activeStatusRows: number[] = [];
        const salaryRows: number[] = [];
        const insuranceRows: number[] = [];

        for (let i = 0; i < EMPLOYEE_COUNT; i++) {
            const startMonth = (i * 2) % 12 + 1;
            const salary = 5000 + ((i % 5) * 1000);
            const baseInsurance = 500;

            currentRow++;
            this.hf.setCellContents({ sheet: this.sheetId, row: currentRow, col: 0 }, [[`Employee ${i + 1} (Starts M${startMonth})`]]);

            const statusRow = currentRow++;
            // We won't register individual rows in map to avoid clutter, 
            // but we could: EMPLOYEE_1_ACTIVE
            activeStatusRows.push(statusRow);
            const statusFormulas = Array.from({ length: TOTAL_MONTHS }, (_, m) => (m + 1) >= startMonth ? '=1' : '=0');
            this.hf.setCellContents({ sheet: this.sheetId, row: statusRow, col: 0 }, [['Active', ...statusFormulas]]);

            const salRow = currentRow++;
            salaryRows.push(salRow);
            const salFormulas = Array.from({ length: TOTAL_MONTHS }, (_, m) => {
                const col = this.numToChar(m + 1);
                return `=${salary} * ${col}${statusRow + 1}`; // Keeping direct ref for internals
            });
            this.hf.setCellContents({ sheet: this.sheetId, row: salRow, col: 0 }, [['Salary', ...salFormulas]]);

            const insRow = currentRow++;
            insuranceRows.push(insRow);
            const insFormulas = Array.from({ length: TOTAL_MONTHS }, (_, m) => {
                const col = this.numToChar(m + 1);
                const yearIndex = Math.floor(m / 12);
                const compound = Math.pow(1.05, yearIndex).toFixed(4);
                // Direct ref
                return `=${baseInsurance} * ${compound} * ${col}${statusRow + 1}`;
            });
            this.hf.setCellContents({ sheet: this.sheetId, row: insRow, col: 0 }, [['Insurance', ...insFormulas]]);
        }

        const totalHeadcoundRow = currentRow++;
        registerRow('Total Headcount', totalHeadcoundRow);
        // Manual Sum for this one as it aggregates un-mapped rows
        const headcountFormulas = Array.from({ length: TOTAL_MONTHS }, (_, i) => {
            const col = this.numToChar(i + 1);
            const refs = activeStatusRows.map(r => `${col}${r + 1}`).join('+');
            return `=${refs}`;
        });
        this.hf.setCellContents({ sheet: this.sheetId, row: totalHeadcoundRow, col: 1 }, [headcountFormulas]);


        // 5. Facilities
        const rentRow = currentRow++;
        registerRow('Office Rent', rentRow);
        setRowFormulas(rentRow, (i) => {
            const yearIndex = Math.floor(i / 12);
            const compound = Math.pow(1.03, yearIndex).toFixed(4);
            return `=10000 * ${compound}`;
        });

        const varOfficeRow = currentRow++;
        registerRow('Variable Office Costs', varOfficeRow);
        setRowFormulas(varOfficeRow, () => '=200 * TOTAL_HEADCOUNT');

        // Marketing
        const marketingRow = currentRow++;
        registerRow('Marketing', marketingRow);
        setRowFormulas(marketingRow, (i) => {
            if (i === 0) return '=1000';
            // 10% of Prev Revenue (Recurring + Setup)
            // RECURRING_REVENUE[-1] + SETUP_REVENUE[-1]
            return '=0.1 * (RECURRING_REVENUE[-1] + SETUP_REVENUE[-1])';
        });


        // 6. Financial Statements
        currentRow++;
        this.hf.setCellContents({ sheet: this.sheetId, row: currentRow, col: 0 }, [['--- INCOME STATEMENT ---']]);
        currentRow++;

        const totalRevRow = currentRow++;
        registerRow('Total Revenue', totalRevRow);
        setRowFormulas(totalRevRow, () => '=RECURRING_REVENUE + SETUP_REVENUE');

        const grossProfitRow = currentRow++;
        registerRow('Gross Profit', grossProfitRow);
        setRowFormulas(grossProfitRow, () => '=TOTAL_REVENUE - SERVER_COSTS');

        const opexRow = currentRow++;
        registerRow('Total OpEx', opexRow);
        // Complex sum again: Payroll + Insurance + Rent + Var + Marketing
        // We can use the registered names for Rent/Var/Market. 
        // For Payroll/Insurance, same issue as Headcount.
        setRowFormulas(opexRow, (i) => {
            const col = this.numToChar(i + 1);
            const paySum = salaryRows.map(r => `${col}${r + 1}`).join('+');
            const insSum = insuranceRows.map(r => `${col}${r + 1}`).join('+');
            return `(${paySum}) + (${insSum}) + OFFICE_RENT + VARIABLE_OFFICE_COSTS + MARKETING`;
        });

        const ebitdaRow = currentRow++;
        registerRow('EBITDA', ebitdaRow);
        setRowFormulas(ebitdaRow, () => '=GROSS_PROFIT - TOTAL_OPEX');

        const taxRow = currentRow++;
        registerRow('Corporate Tax', taxRow);
        setRowFormulas(taxRow, () => '=IF(EBITDA > 0, EBITDA * 0.21, 0)');

        const netIncomeRow = currentRow++;
        registerRow('Net Income', netIncomeRow);
        setRowFormulas(netIncomeRow, () => '=EBITDA - CORPORATE_TAX');


        // 7. Balance Sheet
        currentRow++;
        this.hf.setCellContents({ sheet: this.sheetId, row: currentRow, col: 0 }, [['--- BALANCE SHEET ---']]);
        currentRow++;

        const beginCashRow = currentRow++;
        registerRow('Beginning Cash', beginCashRow);

        const changeCashRow = currentRow++;
        registerRow('Change in Cash', changeCashRow);

        const endCashCalcRow = currentRow++;
        // internal only?
        registerRow('Ending Cash Calc', endCashCalcRow);

        const overrideRow = currentRow++;
        registerRow('Manual Override', overrideRow, Array(TOTAL_MONTHS).fill(null));

        const effectiveHighRow = currentRow++;
        registerRow('Effective Closing Cash', effectiveHighRow);

        // Balance Sheet Logic
        setRowFormulas(beginCashRow, (i) => {
            if (i === 0) return '=500000';
            // Prev Effective
            return '=EFFECTIVE_CLOSING_CASH[-1]';
        });

        setRowFormulas(changeCashRow, () => '=NET_INCOME');

        setRowFormulas(endCashCalcRow, () => '=BEGINNING_CASH + CHANGE_IN_CASH');

        setRowFormulas(effectiveHighRow, () => {
            return '=IF(ISBLANK(MANUAL_OVERRIDE), ENDING_CASH_CALC, MANUAL_OVERRIDE)';
        });
    }

    getAllValues() {
        return this.hf.getSheetValues(this.sheetId);
    }

    getFormula(col: number, row: number) {
        // Return stored source formula if exists, else compiled one
        const key = this.getMapKey(col, row);
        if (this.formulaMap.has(key)) {
            return this.formulaMap.get(key);
        }
        return this.hf.getCellFormula({ sheet: this.sheetId, col, row });
    }

    updateCell(col: number, row: number, input: string | number) {
        let val: string | number = input;
        const inputStr = String(input);

        // Store Source Formula
        if (typeof input === 'string' && input.startsWith('=')) {
            this.formulaMap.set(this.getMapKey(col, row), input);
            val = this.preprocessFormula(input, col);
        } else {
            // If not a formula (value), remove from map so we don't show stale formula
            this.formulaMap.delete(this.getMapKey(col, row));
        }

        if (!isNaN(Number(inputStr)) && inputStr.trim() !== '' && !inputStr.startsWith('=')) {
            val = Number(inputStr);
        }

        this.hf.setCellContents({ sheet: this.sheetId, col, row }, [[val]]);
        return this.getAllValues();
    }

    getRegisteredNames(): string[] {
        return Array.from(this.nameRowMap.keys());
    }
}
