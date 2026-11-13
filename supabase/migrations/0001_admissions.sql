CREATE TABLE intakes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK(length(trim(code))>0), name text NOT NULL,
 starts_on date NOT NULL, owner text NOT NULL CHECK(length(trim(owner))>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source text NOT NULL, external_id text NOT NULL,
 intake_id uuid NOT NULL REFERENCES intakes(id), applicant_ref text NOT NULL, name text NOT NULL,
 received_on date NOT NULL, due_on date NOT NULL, owner text NOT NULL, purpose text NOT NULL,
 accuracy_checked_on date, retention_review_on date NOT NULL,
 checklist_approved_by text, checklist_evidence text, raw_source jsonb NOT NULL DEFAULT '{}', source_hash text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source, external_id), CHECK(due_on>=received_on), CHECK(retention_review_on>=received_on),
 CHECK(length(trim(source))>0 AND length(trim(external_id))>0 AND length(trim(name))>0 AND length(trim(owner))>0 AND length(trim(purpose))>0),
 CHECK(accuracy_checked_on IS NULL OR accuracy_checked_on>=received_on)
);
CREATE TABLE materials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES applications(id), name text NOT NULL,
 due_on date NOT NULL, status text NOT NULL DEFAULT 'missing' CHECK(status IN ('missing','received','waived')),
 evidence text, recorded_by text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(application_id,name), CHECK(status='missing' OR (length(trim(evidence))>0 AND length(trim(recorded_by))>0))
);
CREATE TABLE reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES applications(id), reader text NOT NULL CHECK(length(trim(reader))>0),
 due_on date NOT NULL, completed_on date, evidence text, recorded_by text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(application_id,reader), CHECK(completed_on IS NULL OR (length(trim(evidence))>0 AND length(trim(recorded_by))>0))
);
CREATE TABLE decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL UNIQUE REFERENCES applications(id),
 outcome text NOT NULL CHECK(outcome IN ('admit','decline','waitlist')), decided_on date NOT NULL,
 authorised_by text NOT NULL CHECK(length(trim(authorised_by))>0), evidence text NOT NULL CHECK(length(trim(evidence))>0),
 offer_due_on date, actor text NOT NULL CHECK(length(trim(actor))>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((outcome='admit' AND offer_due_on>=decided_on) OR (outcome<>'admit' AND offer_due_on IS NULL))
);
CREATE TABLE responses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), decision_id uuid NOT NULL UNIQUE REFERENCES decisions(id),
 response text NOT NULL CHECK(response IN ('accepted','declined')), received_on date NOT NULL,
 evidence text NOT NULL CHECK(length(trim(evidence))>0), actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES applications(id), text text NOT NULL,
 actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source text NOT NULL, source_ref text NOT NULL, file_hash text NOT NULL,
 expected_count integer NOT NULL CHECK(expected_count>0), added integer NOT NULL, skipped integer NOT NULL,
 actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action text NOT NULL, record_id uuid, actor text NOT NULL, details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION touch_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE FUNCTION immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Evidence is append-only'; END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['intakes','applications','materials','reviews','decisions','responses','notes','imports','events'] LOOP
 EXECUTE format('CREATE TRIGGER updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_record()',t);
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['decisions','responses','notes','imports','events'] LOOP
 EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION immutable_record()',t);
 END LOOP;
END $$;
CREATE VIEW application_desk AS
SELECT a.id,a.source,a.external_id,a.name,a.applicant_ref,i.code AS intake,a.owner,a.received_on,a.due_on,
 current_date-a.received_on AS age_days,
 (SELECT count(*)::integer FROM materials m WHERE m.application_id=a.id AND m.status='missing') AS missing_materials,
 (SELECT count(*)::integer FROM reviews r WHERE r.application_id=a.id AND r.completed_on IS NULL) AS pending_reviews,
 (a.checklist_approved_by IS NOT NULL) AS checklist_checked,
 d.outcome,rs.response,
 CASE WHEN d.outcome IS NOT NULL THEN d.outcome
 WHEN a.checklist_approved_by IS NULL THEN 'checklist-unconfirmed'
 WHEN EXISTS(SELECT 1 FROM materials m WHERE m.application_id=a.id AND m.status='missing') THEN 'materials-outstanding'
 WHEN NOT EXISTS(SELECT 1 FROM reviews r WHERE r.application_id=a.id) THEN 'reader-unassigned'
 WHEN EXISTS(SELECT 1 FROM reviews r WHERE r.application_id=a.id AND r.completed_on IS NULL) THEN 'in-review'
 WHEN a.accuracy_checked_on IS NULL THEN 'accuracy-unconfirmed'
 ELSE 'committee-ready' END AS desk_state
FROM applications a JOIN intakes i ON i.id=a.intake_id LEFT JOIN decisions d ON d.application_id=a.id LEFT JOIN responses rs ON rs.decision_id=d.id;
CREATE VIEW reader_queue AS
SELECT r.id,a.external_id,a.name,i.code AS intake,r.reader,r.due_on,current_date-r.due_on AS overdue_days
FROM reviews r JOIN applications a ON a.id=r.application_id JOIN intakes i ON i.id=a.intake_id WHERE r.completed_on IS NULL;
CREATE VIEW offer_followup AS
SELECT d.id,a.external_id,a.name,i.code AS intake,a.owner,d.decided_on,d.offer_due_on,current_date-d.offer_due_on AS overdue_days
FROM decisions d JOIN applications a ON a.id=d.application_id JOIN intakes i ON i.id=a.intake_id
WHERE d.outcome='admit' AND NOT EXISTS(SELECT 1 FROM responses r WHERE r.decision_id=d.id);
CREATE VIEW compliance_findings AS
SELECT a.id,a.external_id,'accuracy-review' AS rule,'No recorded accuracy check before use' AS finding FROM applications a WHERE a.accuracy_checked_on IS NULL
UNION ALL SELECT a.id,a.external_id,'retention-review','Retention review is overdue; review purpose before disposal' FROM applications a WHERE a.retention_review_on<current_date
UNION ALL SELECT a.id,a.external_id,'checklist-confirmation','Required material list has not been confirmed' FROM applications a WHERE a.checklist_approved_by IS NULL
UNION ALL SELECT a.id,a.external_id,'reader-assignment','No reader assigned to an undecided application' FROM applications a WHERE NOT EXISTS(SELECT 1 FROM reviews r WHERE r.application_id=a.id) AND NOT EXISTS(SELECT 1 FROM decisions d WHERE d.application_id=a.id);
REVOKE ALL ON application_desk,reader_queue,offer_followup,compliance_findings FROM PUBLIC;
