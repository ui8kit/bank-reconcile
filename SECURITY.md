# Security Policy

Bank reconcile is a **static, browser-only** app: statements are parsed and
matched in the tab. There is no application server, no account system, and no
intentional upload of user files.

## Report a vulnerability

Use GitHub **Security → Report a vulnerability** (private disclosure) on
[ui8kit/bank-reconcile](https://github.com/ui8kit/bank-reconcile).
Do not open a public issue for exploitable findings.

Include: affected path (`src/lib/reconcile`, Vite build, `vercel.json`, deps),
reproduction steps, and impact.

## In scope (examples)

- XSS or script injection via malicious PDF/CSV/TXT that runs in the app origin
- Dependency issues in `pdfjs-dist`, Svelte, Vite, or other shipped packages that
  affect this app’s threat model
- Misconfiguration in `vercel.json` headers that weakens a production deploy
- Accidental persistence or exfiltration of statement contents (e.g. unexpected
  network calls, storage APIs) introduced by a change

## Out of scope

- Users pasting or uploading their own real statements (client-side by design)
- Browser / OS vulnerabilities unrelated to this codebase
- Social engineering around shared screen recordings of private statements
- Issues that require a compromised Vercel/GitHub account or supply-chain attack
  outside this repository’s release artifacts

## Product expectations

- Matching must remain **in-browser**; do not add server-side processing of
  user files without an explicit, reviewed design change and docs update.
- Prefer not to log file contents or full statement text.
- Treat files under `public/examples/` as potentially sensitive samples; avoid
  expanding personal data in issues, PRs, or screenshots.

We investigate legitimate reports and aim to fix confirmed issues promptly.
