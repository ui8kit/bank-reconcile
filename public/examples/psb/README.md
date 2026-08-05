# Promsvyazbank (`psb`) examples

Fixtures for the **psb** bank adapter. Use with adapter **Auto** or **Promsvyazbank**.

| File | Role |
|------|------|
| `bank.txt` | Anonymized statement dump (PSB-style headers + credit lines) |
| `income.csv` | Income report aligned to that statement |
| `expense.csv` | Expense report (no bank debits → expected unmatched) |

> A real PDF may be added as `bank.pdf` locally; keep PII redacted before publishing.

## Expected reconcile (default matcher)

- matched: **9** sponsorship rows (incl. date ±1 and amount ±0.05 cases)
- unmatched bank: **2** (deposit interest `3,78` and `18,10`)
- unmatched income: **1** (erroneous `20.12.2019`)
- unmatched expense: **2** (no debits in the statement)

Adapter: `src/lib/reconcile/adapters/psb.ts`
