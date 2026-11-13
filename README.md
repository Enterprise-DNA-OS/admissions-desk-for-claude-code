# Admissions Desk for Claude Code

Run the internal admissions review desk from records you own: required materials, reader queues, committee evidence and offer follow-up. A focused alternative for work done inside Slate Admissions.

Built by Enterprise DNA. MIT licence. Runs with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Install and operate the database and commands. | Your intakes, material rules, export mapping and reports. | Installed, connected and operated through Omni by Enterprise DNA. Setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_medium=github&utm_campaign=slate-admissions) | [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_medium=github&utm_campaign=slate-admissions) |

Technolutions lists annual admissions licences from US$30,000 and says most clients pay US$50,000. These are vendor licence figures, not a verified local invoice. [Pricing checked 13 November 2026](https://technolutions.com/licensing). This is the internal review desk, not a complete replacement for Slate's portals, forms, communication services or student lifecycle platform.

## Quick start

Node 20 or newer. No vendor connection or paid database needed for the demo.

```bash
git clone https://github.com/Enterprise-DNA-OS/admissions-desk-for-claude-code.git
cd admissions-desk-for-claude-code
npm install
npm run demo
```

Demo data lives in .data/demo. For a separate working example in the default .data/db, run npm run migrate then npm run seed. The seed contains only fictional records and is idempotent. Never seed a production database. Set DATA_DIR=.data/demo in your shell to explore the demo further, or use the seeded default database:

```bash
npm run admissions -- attention
npm run admissions -- committee-ready --json
npm run view
npm run docs
```

PGlite runs locally. Set DATABASE_URL for PostgreSQL. The CLI expects a trusted operator connection. Hosted multi-user use needs identity, scoped access, tested backups and retention controls before real applicant records are loaded.

## The working week

1. /material-chase finds missing documents and overdue files.
2. /reader-queue shows assigned readers and due dates.
3. /committee-ready prepares administratively complete files for people to assess.
4. /offer-followup lists recorded offers with no response.
5. /weekly-review combines attention, reader workload, offers and record controls in a private draft.

There are 33 slash commands and 30 CLI commands. The single CLI supports human-readable columns and --json. Run npm run admissions -- help. Names match without case and IDs accept prefixes. Ambiguous references list candidates and exit 1. The demo deliberately has two applications named Alex Sample: use APP-101 or APP-105.

## Bring your application records across

The [switching guide](docs/replace-slate-admissions.md) defines a configured Slate application CSV with nine required aliases. Register intakes, export cumulative rows, reconcile the count, then run one import. Dry runs write nothing. Imports are atomic, duplicate-safe and preserve every original exported column. Source plus application identifier keeps institutions separate. Review forms, attachments and decision history need additional mapping and are never inferred from a status field.

```bash
npm run admissions -- import slate --source="Institution Slate" --file=imports/applications.csv --expected-count=250 --source-ref="Actual source query and export date" --actor="Actual operator" --dry-run
```

## Record the institution's decisions

Confirm the required-material list against your policy, resolve each requirement with evidence, assign readers, record their completed review evidence and check accuracy. Only then can an existing human committee decision be recorded with its authoriser and evidence reference. Administrative readiness is not an eligibility judgement. No scoring, ranking or automatic accept/reject system is included. Nothing sends an email or official decision.

Decisions, responses, notes, import receipts and activity events are append-only. Typed names provide attribution, not authentication. Corrections go in notes for authorised review. A database owner can bypass application controls. [Record controls and cited rules](docs/compliance.md).

## Ten questions to ask

These queries work today. They are not claims that Slate cannot produce a similar report.
1. Which applications are overdue and still missing materials? `attention`
2. Which readers have the most overdue work? `workload`
3. Which applications have complete administrative evidence for committee? `committee-ready`
4. Which offers have no recorded response? `offer-followup`
5. Which intake has the largest group waiting for materials? `funnel`
6. Which records need an accuracy or retention review? `compliance`
7. How long did recorded decisions take by intake? `turnaround`
8. What source export and independent count support the imported records? `imports`
9. Who confirmed each checklist or recorded a committee decision? `history`
10. What material, reader and note history belongs to this application? `application --ref=APP-101`

## Your first hour: ten things to ask for

1. Put our name, logo and colours in brand.json.
2. Register our real intake codes and owners.
3. Agree which source query covers the applications we need.
4. Set a documented purpose and retention review policy.
5. Check the source count before importing.
6. Map our required materials and evidence references.
7. Assign each reader and due date.
8. Confirm the checklist against our policy.
9. Generate the internal committee packet.
10. Add our own read-only weekly view.

/customise adds a field, changes a local rule or renames a stage through a versioned migration and tests. /new-view creates a read-only report.

## Documents, views and backups

npm run docs produces branded committee packets, internal decision records and missing-material checklists under docs-out/. npm run view produces views/week.html. Both use brand.json and escape record values. They are internal reports, not official notices. [Why no front end](docs/why-no-front-end.md).

npm run admissions -- export --file=exports/backup.json saves all nine domain record types in a new file and refuses overwrites. Keep native database backups and original exports too. An automatic JSON restore is not included. Test restoration before production use.

npm test uses a temporary database and checks every CLI command, import rollback and idempotency, source isolation, ambiguity, evidence gates, decisions, responses, escaped reports and private outputs. The manual workflow covers Windows and Linux with Node 20 and 22, plus PostgreSQL 17. [Executed validation](docs/validation.md).

[Selection evidence](docs/research.md). Built and optionally operated through [Omni by Enterprise DNA](https://enterprisedna.co/omni/instead-of/slate-admissions?utm_source=github&utm_medium=readme&utm_campaign=slate-admissions).
