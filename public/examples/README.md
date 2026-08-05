# Example fixtures by bank adapter

Each subdirectory is one bank adapter id (see `src/lib/reconcile/adapters/`).

| Folder | Adapter | Notes |
|--------|---------|--------|
| [`psb/`](psb/) | Promsvyazbank | Statement + income/expense reports |
| [`alexs/`](alexs/) | Alexs | Debit/credit column PDF + ODS reports |

Demo samples (generic adapter) live in [`../samples/`](../samples/).

When adding a bank: create `public/examples/<adapter-id>/` with `bank.*`, `income.csv`, `expense.csv`, and a README of expected reconcile counts.
