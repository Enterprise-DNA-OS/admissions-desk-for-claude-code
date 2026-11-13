# Move the internal admissions desk from Slate

This importer reads a configured Slate application-query CSV. Slate has configurable exports, not one universal column layout. A vendor export and the fixture are different things: examples/slate-applications.csv is fictional and uses the explicit contract below.

1. Choose submitted applications for the intake you intend to move. Run a cumulative application query with all intended rows, not an incremental query that omits earlier history.
2. Add or alias exports to exactly these headings: Application GUID, Applicant Reference, Applicant Name, Intake Code, Submitted Date, Review Due Date, Owner, Purpose, Retention Review Date. GUID and reference come from the source identifiers. Review due date, purpose, owner and retention review date need an agreed institution policy and can be configured literal exports. Use YYYY-MM-DD dates, not ambiguous regional dates.
3. Download the query with Output set to Comma-delimited CSV file. Save the query, filter description and independent row count. Register the referenced intakes locally with add-intake. Intake Code matches a registered code without case.
4. Run the command below once with --dry-run, then remove that flag to commit. The transaction rolls back all writes if any row is invalid. The expected count must equal the number of exported rows. It checks reconciliation with your supplied count, not whether your source query selected everything.
5. Check applications, imports and compliance. Review and record each application's required materials and reader evidence before confirming a checklist or recording a new decision. Compare samples with Slate, and retain Slate until the required integrations and full review history are migrated and reconciled.

```bash
npm run admissions -- import slate --source="Institution Slate" --file=imports/applications.csv --expected-count=250 --source-ref="Actual cumulative query, intake and export date" --actor="Actual operator" --dry-run
```

Source plus Application GUID is the identity. Repeat identical exports are skipped. A changed row with that identity is rejected so original evidence is never silently replaced. Every original column is retained in raw_source, including custom columns. A change requires an explicit reviewed migration, not an automatic overwrite.

## What carries across

The application identifier, applicant reference and display name, intake, submission and review dates, owner, purpose and retention review date become searchable records. Extra exported columns remain in the original row. Import batches retain a file hash, source reference, counts and actor. Original files stay in your private evidence store.

## What needs mapping

Reader forms, scores, checklists, decision letters, email history, attached documents, portals and workflows are not recreated from an application CSV. Extra exported statuses remain evidence only and never become approved decisions automatically. A legacy Committee bin does not make an application committee-ready here. Enterprise DNA maps additional export types as part of a scoped migration. Retain the source system until required history, applicant forms and official correspondence are working in your version. This base covers the internal administrative desk, not every function in Slate.

Sources checked 13 November 2026: [Query Output Options](https://knowledge.technolutions.net/v1/docs/query-output-options), [Building a Data Export Query](https://knowledge.technolutions.net/v1/docs/building-data-export-query), [Determining Your Data Export Process](https://knowledge.technolutions.net/v1/docs/data-export), [Document exports](https://knowledge.technolutions.net/v1/docs/getting-started-with-document-exports).
