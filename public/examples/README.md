# Real statement examples

Files for UI smoke-test against a real Promsvyazbank PDF.

| File | Role |
|------|------|
| `Выписка_по_счёту.pdf` | Bank statement (credits only, Oct–Dec 2019) |
| `income.csv` | Income report aligned to that statement |
| `expense.csv` | Expense report (no bank debits → expected unmatched) |

## Expected reconcile (approx.)

- matched: **9** sponsorship rows (incl. date ±1 and amount ±0.05 cases)
- unmatched bank: **2** (deposit interest `3,78` and `18,10`)
- unmatched income: **1** (erroneous `20.12.2019`)
- unmatched expense: **2** (no debits in the PDF)
