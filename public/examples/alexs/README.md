# Alexs (`alexs`) examples

Debit/credit column statement (Date · Doc№ · Debit/Credit · Purpose).
Use bank adapter **Auto** or **Alexs**.

| File | Role |
|------|------|
| `bank.pdf` / `bank.txt` | Bank statement (May 2026) |
| `income.ods` | Income operations report |
| `expense.ods` | Expense operations report |

Adapter: `src/lib/reconcile/adapters/alexs.ts`

## Matching rules (alexs)

- **Amount + date ±1 day only** — purpose text is not used for match score.
- **Возм**: parse `К.611.22` from purpose; **add K. to the bank settlement**
  (`32788.78 + 611.22 → 33400`) to pair with cash/РН income; also emit a fee
  leg `amount = K.` to pair with expense Возм commission.

## Expected reconcile (bundled fixtures)

| Metric | Count | Notes |
|--------|------:|-------|
| bank rows (raw → prepared) | **139 → 157** | +18 Возм fee legs |
| income / expense | **41 / 104** | ODS Приход / Расход |
| matched | **143** | 39 income + 104 expense |
| unmatched income | **2** | РН without bank+К. counterpart |
| unmatched expense | **0** | |
| unmatched bank | **14** | taxes, transfers, 2 orphan Возм totals |

Redact PII before publishing copies of these files.
