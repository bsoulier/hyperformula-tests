# Financial Model Logic Details

## Time Dimension
- **Horizon**: 60 Months (5 Years).
- **Columns**: Month 1 to Month 60.

## Drivers & Assumptions
- **New Customers**: Static input per month.
- **Churn Rate**: Static % input per month.
- **Price**: Subscription price.
- **Setup Fee**: One-time revenue per new customer.

## Core Metrics
- **Total Customers**: Previous Total + New - (Previous * Churn).
- **Recurring Revenue**: Total Customers * Price.
- **Setup Revenue**: New Customers * Setup Fee.
- **Total Revenue**: Recurring + Setup.

## Human Capital (Complex Logic)
- **Employees**: 20 Individual Rows.
- **Start Month**: Randomized (1-24).
- **Salary status**: `IF(CurrentMonth >= StartMonth, BaseSalary, 0)`.
- **Variable Office Cost**: $200 per active employee per month (Snacks, util).
- **Benefits (Health Insurance)**: 
  - Base: $500/mo.
  - **Annual Increase**: Price increases by 5% every 12 months.
  - Formula approach: `Base * (1.05 ^ FLOOR((Month-1)/12))`.

## Facilities (Compounding Logic)
- **Office Rent**: 
  - Base: $10,000/mo.
  - **Annual Increase**: 3% every 12 months.
  - Formula: `10000 * (1.03 ^ FLOOR((Month-1)/12))`.

## Infrastructure (Tiered Logic)
- **Server Costs**:
  - Dependent on **Total Customers**.
  - Tier 1: 0-100 customers: $500 flat.
  - Tier 2: 101-500 customers: $500 + $5/user over 100.
  - Tier 3: 500+ customers: $2500 + $3/user over 500.
  - Formula: Nested IFs.

## Financial Statements
- **Gross Profit**: Revenue - Server Costs.
- **OpEx**: 
  - Payroll (Sum of Salaries).
  - Benefits (Sum of Health Insurance).
  - Office Rent.
  - Variable Office Costs.
  - Marketing (10% of *Previous Month's* Revenue).
- **EBITDA**: Gross Profit - OpEx.
- **Corporate Tax**:
  - 21% of EBITDA if positive.
  - Formula: `IF(EBITDA > 0, EBITDA * 0.21, 0)`.
- **Net Income**: EBITDA - Corporate Tax.

## Balance Sheet & Cash Flow (State & Overrides)
- **Cash Flow Chain**:
  - **Beginning Cash**: Previous Month's *Effective Ending*. Month 1 starts with seed capital ($500k).
  - **Change in Cash**: Equal to Net Income (Simplified proxy).
  - **Ending Cash (Calc)**: Beginning + Change.
  - **Manual Override**: A dedicated row for user inputs. Default is empty.
  - **Effective Ending Cash**: 
    - Logic: `IF(NOT(ISBLANK(Override)), Override, Ending Cash (Calc))`.
    - This creates a **conditional reset**: If a user types a value in Month 12, it ignores the calculated history for that month and starts a new history from Month 13 onwards using the override as the new baseline.

