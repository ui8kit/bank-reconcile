# Alexs (`alexs`) examples

Debit/credit column statement (Date · Doc№ · Debit/Credit · Purpose).
Use bank adapter **Auto** or **Alexs**.

| File | Role |
|------|------|
| `bank.pdf` / `bank.txt` | Bank statement (May 2026) |
| `income.ods` | Income operations report |
| `expense.ods` | Expense operations report |

Adapter: `src/lib/reconcile/adapters/alexs.ts`

## Expected reconcile (default matcher)

Approx. counts from the bundled fixtures:

| Metric | Count | Notes |
|--------|------:|-------|
| bank rows | **139** | Doc№ stripped from amounts |
| income rows | **41** | ODS `Приход` column |
| expense rows | **104** | ODS `Расход` column |
| matched | **~109** | amount + same day (sparse PDF purpose OK) |
| unmatched income | **18** | ККТ / `РН` cash — not on bank statement |
| unmatched expense | **18** | `Возм` commission (`К.`) vs bank gross debit |
| unmatched bank | **~30** | bank-only lines + `Возм` gross amounts |

### Parser notes

- After the date, the next integer is the payment **document number** — never glue it into spaced thousands (`14` + `600 000,00` → `600 000`).
- Skip page headers (`Контрагент`, `Дата Номер Дебет…`).
- Ignore `К.912,26`-style fee fragments when a larger debit/credit amount is present.
- Redact PII before publishing copies of these files.
