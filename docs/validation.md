# Validation

Executed on 13 November 2026 with Node 22.23.4 on Linux and the embedded PGlite database.

- npm install: passed, zero reported vulnerabilities.
- npm test: PASS, all 30 CLI commands exercised.
- npm run demo: passed with an isolated fictional dataset.
- npm run view and npm run docs: passed, weekly report plus three internal document types.
- Brand lint on README: clean. Prose scan found no banned phrases, em dashes or author placeholders.

The smoke test checks repeat migration and seed, missing materials, reader workload, committee readiness, overdue offers, retention findings, source-count reconciliation, all-or-nothing import, repeat-import skipping, conflicting original evidence rejection, source isolation, ambiguous names, partial IDs, strict flags and CSV dates, requirement changes invalidating checklist confirmation, human decision evidence, response dates, append-only decisions, export overwrite refusal, draft creation, JSON output and escaped HTML.

The [manual workflow](https://github.com/Enterprise-DNA-OS/admissions-desk-for-claude-code/actions/runs/43356639664) passed all five jobs on 13 November 2026: Windows with Node 20 and 22, Linux with Node 20 and 22, and PostgreSQL 17. The operating-system jobs ran npm ci, npm test and npm run demo. The PostgreSQL job ran the same smoke test against an empty disposable hosted-engine database.

The landing page passed check-page, including the rendered booking link. Headless browser checks passed at 1440px and 390px: noindex metadata, all three paths, booking attribution, three real command-output tables and no horizontal page overflow. Desktop, mobile, weekly report and committee packet screenshots were inspected. Evidence stays in the Command Centre at tmp/rebuild-slate-admissions. There are 33 slash commands and 30 CLI commands.
