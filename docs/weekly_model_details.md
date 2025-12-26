# 13-Week Cash Flow Model Details

## Overview
A high-fidelity weekly liquidity model focused on working capital timing and automated treasury management.
- **Timeline**: 13 Weeks.
- **Core Feature**: Automated Line of Credit (Revolver) Draw/Repayment sweeps.

## 1. Operating Cash Flow
### Inflows (Collections)
- **Billings**: Raw sales input.
- **Cash Receipts**:
    - **Cash Sales**: 40% collected in Week $t$.
    - **Net 30**: 40% collected in Week $t+4$.
    - **Net 60**: 20% collected in Week $t+8$.

### Outflows (Disbursements)
- **Payroll**: Bi-weekly cycle. Paid in even weeks (2, 4, 6...).
- **Rent**: Monthly cycle. Paid in Week 1, 5, 9, 13.
- **AP / Opex**: Random/Variable inputs.

## 2. Treasury & Financing (Automated Logic)
### Line of Credit (LOC)
- **Minimum Cash Buffer**: $50,000.
- **Interest Rate**: 5% APR (Calculated weekly).

### Weekly Logic Flow
1.  **Beginning Cash**: = Prev Week Ending Cash.
2.  **Net Operations**: = Total Receipts - Total Disbursements.
3.  **Pre-Financing Cash**: = Beginning + Net Operations.
4.  **LOC Draw Logic**:
    - If `Pre-Financing < $50,000`, Draw difference to reach $50k.
5.  **LOC Repayment Logic**:
    - If `Pre-Financing > $50,000` AND `LOC Balance > 0`, Repay excess cash to reduce LOC.
6.  **Ending Cash**: = Pre-Financing + Draw - Repayment - Interest.
