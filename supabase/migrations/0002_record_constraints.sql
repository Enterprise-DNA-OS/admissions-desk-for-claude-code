ALTER TABLE materials ADD CONSTRAINT material_evidence_required CHECK(status='missing' OR (COALESCE(length(trim(evidence)),0)>0 AND COALESCE(length(trim(recorded_by)),0)>0));
ALTER TABLE reviews ADD CONSTRAINT review_evidence_required CHECK(completed_on IS NULL OR (COALESCE(length(trim(evidence)),0)>0 AND COALESCE(length(trim(recorded_by)),0)>0));
ALTER TABLE decisions ADD CONSTRAINT admission_offer_deadline_required CHECK(outcome<>'admit' OR offer_due_on IS NOT NULL);
ALTER TABLE applications ADD CONSTRAINT applicant_reference_required CHECK(length(trim(applicant_ref))>0);
ALTER TABLE applications ADD CONSTRAINT checklist_confirmation_complete CHECK((checklist_approved_by IS NULL AND checklist_evidence IS NULL) OR (COALESCE(length(trim(checklist_approved_by)),0)>0 AND COALESCE(length(trim(checklist_evidence)),0)>0));
CREATE UNIQUE INDEX material_name_case_unique ON materials(application_id,lower(name));
CREATE UNIQUE INDEX review_reader_case_unique ON reviews(application_id,lower(reader));
