INSERT INTO intakes(id,code,name,starts_on,owner) VALUES
('10000000-0000-4000-8000-000000000001','DIP-2027','Fictional design diploma',current_date+90,'Morgan'),
('10000000-0000-4000-8000-000000000002','CERT-2027','Fictional business certificate',current_date+60,'Jules') ON CONFLICT DO NOTHING;
INSERT INTO applications(id,source,external_id,intake_id,applicant_ref,name,received_on,due_on,owner,purpose,accuracy_checked_on,retention_review_on,checklist_approved_by,checklist_evidence) VALUES
('20000000-0000-4000-8000-000000000001','Fictional demo','APP-101','10000000-0000-4000-8000-000000000001','P-1','Alex Sample',current_date-30,current_date-7,'Morgan','Submitted student admission review',current_date-1,current_date+180,'Morgan','Demo policy checklist v1'),
('20000000-0000-4000-8000-000000000002','Fictional demo','APP-102','10000000-0000-4000-8000-000000000001','P-2','Jordan Example',current_date-20,current_date+3,'Morgan','Submitted student admission review',current_date-1,current_date+180,'Morgan','Demo policy checklist v1'),
('20000000-0000-4000-8000-000000000003','Fictional demo','APP-103','10000000-0000-4000-8000-000000000002','P-3','Taylor Sample',current_date-40,current_date-15,'Jules','Submitted student admission review',current_date-20,current_date+180,'Jules','Demo policy checklist v1'),
('20000000-0000-4000-8000-000000000004','Fictional demo','APP-104','10000000-0000-4000-8000-000000000002','P-4','Casey Example',current_date-60,current_date-20,'Jules','Submitted student admission review',NULL,current_date-1,NULL,NULL),
('20000000-0000-4000-8000-000000000005','Fictional demo','APP-105','10000000-0000-4000-8000-000000000001','P-1','Alex Sample',current_date-25,current_date-2,'Morgan','Submitted student admission review',current_date-1,current_date+180,'Morgan','Demo policy checklist v1') ON CONFLICT DO NOTHING;
INSERT INTO materials(id,application_id,name,due_on,status,evidence,recorded_by) VALUES
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Transcript',current_date-10,'missing',NULL,NULL),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Transcript',current_date-10,'received','Fictional transcript reference','Morgan'),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','Transcript',current_date-30,'received','Fictional transcript reference','Jules'),
('30000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000005','Transcript',current_date-10,'received','Fictional transcript reference','Morgan') ON CONFLICT DO NOTHING;
INSERT INTO reviews(id,application_id,reader,due_on,completed_on,evidence,recorded_by) VALUES
('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Samira',current_date-5,NULL,NULL,NULL),
('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Lee',current_date-3,current_date-2,'Fictional review record','Lee'),
('40000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','Lee',current_date-25,current_date-22,'Fictional review record','Lee'),
('40000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000005','Samira',current_date-1,NULL,NULL,NULL) ON CONFLICT DO NOTHING;
INSERT INTO decisions(id,application_id,outcome,decided_on,authorised_by,evidence,offer_due_on,actor) VALUES
('50000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','admit',current_date-20,'Fictional committee chair','Fictional committee minute 3',current_date-3,'Jules') ON CONFLICT DO NOTHING;
INSERT INTO events(id,action,actor,details) VALUES('60000000-0000-4000-8000-000000000001','seed','Demo generator','{"fictional":true}') ON CONFLICT DO NOTHING;
