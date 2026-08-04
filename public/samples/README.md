# Demo samples

Generated from `src/fixtures/samples/ledger.json`.

| File | Role |
|------|------|
| `bank.pdf` / `bank.txt` | Bank statement |
| `income.csv` | Income report |
| `expense.csv` | Expense report |

## Expected reconcile (default matcher)

- matched: **5**
- unmatched bank: **3**
- unmatched income: **2**
- unmatched expense: **2**

Cases covered: exact match, date ±1 day, amount ±0.05, purpose overlap,
bank-only, report-only, date too far (±3), amount too far.

Regenerate:

```sh
npm run samples
```
