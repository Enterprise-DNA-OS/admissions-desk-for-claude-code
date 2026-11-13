# Record controls and sources

Checked 13 November 2026. This is an internal admissions administration desk, not a compliance certificate or admission policy. The operator applies the institution's policy and jurisdiction. No ranking, scoring or automated admission decision is shipped.

| Rule | Check | Authority |
|---|---|---|
| accuracy-review | Missing recorded accuracy check appears in compliance. A committee decision cannot be recorded without an accuracy check. | NZ Privacy Act 2020, information privacy principle 8 requires reasonable steps concerning accuracy before use or disclosure. The date is evidence of a recorded check, not proof of accuracy. |
| retention-review | Records past their institution-set retention review date are flagged. Nothing is automatically deleted. | NZ Privacy Act 2020, principle 9 limits keeping information beyond its lawful purpose. The Act does not prescribe the demo review interval. |
| checklist-confirmation | An operator confirms the required materials against an evidence reference. Adding a requirement invalidates that confirmation. | Local operating policy, not a statutory checklist. |
| reader-assignment | Undecided applications without a reader are flagged. | Local operating policy. |
| committee-evidence | All requirements must be resolved, at least one reader completed, and accuracy checked before recording a human decision. Future or pre-evidence decision dates are rejected. | Local operating policy, not an admission recommendation. |
| decision-provenance | Human authoriser and evidence reference required. Decisions, responses, notes, imports and events cannot be edited through this base. | Local operating policy supporting accountability. A database owner can bypass database controls. |

Sources: [Privacy Act 2020, section 22](https://www.legislation.govt.nz/act/public/2020/0031/latest/whole.html), [Privacy Commissioner principles guidance](https://www.privacy.org.nz/resources-and-learning/knowledge-base/view/376/), [Slate reader overview](https://knowledge.technolutions.net/docs/reader-overview), [Slate checklists](https://knowledge.technolutions.net/docs/checklists-and-materials).

A checklist-confirmed application is administratively ready, never academically eligible by implication. Record only an actual decision made by the institution's authorised people. Typed actor names are attribution, not authenticated identity. Corrections are appended as notes and require an authorised migration if a decision needs replacement. This base has no appeals, ranking, protected-characteristic processing, eligibility judgement, payment, visa or official notice engine.

Use only necessary applicant information. Keep transcript files in the institution's approved evidence store and record references here. Do not put health, ethnicity, disability, passport or financial-aid information into demo files or git. Restrict generated HTML and drafts as carefully as the database. Before shared production use, implement identity, role-scoped access, verified backups and restoration, retention/disposal procedures and a jurisdiction-specific privacy review. The SQL tables have row security enabled with no public policies, and the CLI expects a trusted owner connection. This is not multi-user access control.
