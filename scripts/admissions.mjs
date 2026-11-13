#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table} from './lib/format.mjs';

const reads={
 intakes:'SELECT id,code,name,starts_on,owner FROM intakes ORDER BY starts_on,code',
 applications:'SELECT * FROM application_desk ORDER BY due_on,external_id',
 materials:'SELECT m.id,a.external_id,m.name,m.due_on,m.status,m.evidence FROM materials m JOIN applications a ON a.id=m.application_id ORDER BY m.due_on,a.external_id,m.name',
 'reader-queue':'SELECT * FROM reader_queue ORDER BY due_on,external_id,reader',
 'committee-ready':"SELECT external_id,name,intake,owner,age_days FROM application_desk WHERE desk_state='committee-ready' ORDER BY due_on,external_id",
 'offer-followup':'SELECT * FROM offer_followup ORDER BY offer_due_on,external_id',
 attention:"SELECT external_id,owner,desk_state,missing_materials,pending_reviews FROM application_desk WHERE outcome IS NULL AND (due_on<current_date OR missing_materials>0 OR NOT checklist_checked) ORDER BY due_on,external_id",
 compliance:'SELECT external_id,rule,finding FROM compliance_findings ORDER BY external_id,rule',
 workload:'SELECT reader,count(*)::integer AS pending,count(*) FILTER(WHERE overdue_days>0)::integer AS overdue FROM reader_queue GROUP BY reader ORDER BY overdue DESC,reader',
 funnel:'SELECT intake,desk_state,count(*)::integer AS applications FROM application_desk GROUP BY intake,desk_state ORDER BY intake,desk_state',
 turnaround:'SELECT i.code AS intake,count(*)::integer AS decisions,round(avg(d.decided_on-a.received_on),1) AS average_days FROM decisions d JOIN applications a ON a.id=d.application_id JOIN intakes i ON i.id=a.intake_id GROUP BY i.code ORDER BY i.code',
 history:'SELECT action,record_id,actor,details,created_at FROM events ORDER BY created_at,id',
 imports:'SELECT source,source_ref,expected_count,added,skipped,actor,created_at FROM imports ORDER BY created_at,id'
};
export const contracts={...Object.fromEntries(Object.keys(reads).map(k=>[k,[]])),
 help:[],application:['ref'],
 'add-intake':['code','name','starts','owner','actor'],
 'add-application':['source','external-id','intake','applicant-ref','name','received','due','owner','purpose','retention-review','actor'],
 'add-material':['ref','name','due','actor'],
 'receive-material':['ref','evidence','status','actor'],
 'confirm-checklist':['ref','evidence','actor'],
 'check-accuracy':['ref','date','evidence','actor'],
 'assign-reader':['ref','reader','due','actor'],
 'complete-review':['ref','date','evidence','actor'],
 'record-decision':['ref','outcome','date','authorised-by','evidence','offer-due','actor'],
 'record-response':['ref','response','date','evidence','actor'],
 log:['ref','text','actor'],
 import:['source','file','expected-count','source-ref','actor','dry-run'],
 export:['file'],'weekly-review':[],'draft-chase':['ref']
};
export function parse(args){
 const verb=args[0]||'help';if(!Object.hasOwn(contracts,verb))throw Error('Unknown command: '+verb);
 const opts={};let vendor;
 for(const arg of args.slice(1)){
  if(verb==='import'&&!arg.startsWith('--')&&vendor===undefined){vendor=arg;continue;}
  if(!arg.startsWith('--'))throw Error('Unexpected argument: '+arg);
  const pos=arg.indexOf('=');const key=arg.slice(2,pos<0?undefined:pos);const value=pos<0?true:arg.slice(pos+1);
  if(key!=='json'&&!contracts[verb].includes(key))throw Error('Unknown flag: '+key);
  if(Object.hasOwn(opts,key))throw Error('Duplicate flag: '+key);
  if(['json','dry-run'].includes(key)){if(value!==true)throw Error(key+' takes no value');}
  else if(value===true)throw Error(key+' needs --'+key+'=value');
  opts[key]=value;
 }
 if(verb==='import'&&vendor!=='slate')throw Error('Use import slate');
 return {verb,opts};
}
const need=(o,k)=>{const v=String(o[k]??'').trim();if(!v)throw Error(k+' must be nonempty');return v;};
export function date(v,label='date'){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(label+' needs a real YYYY-MM-DD date');return v;
}
const day=(o,k)=>date(need(o,k),k);
const today=()=>new Date().toISOString().slice(0,10);
const past=(o,k)=>{const v=day(o,k);if(v>today())throw Error(k+' cannot be in the future');return v;};
const hash=s=>createHash('sha256').update(s).digest('hex');
const rowHash=r=>hash(JSON.stringify(Object.fromEntries(Object.entries(r).sort(([a],[b])=>a.localeCompare(b)))));
async function match(db,kind,ref){
 const definitions={intakes:['intakes','code','name'],applications:['applications','external_id','name'],materials:['materials','name','name'],reviews:['reviews','reader','reader'],decisions:['decisions','outcome','outcome']};
 const [tableName,key,name]=definitions[kind];
 const rows=await db.query(`SELECT * FROM ${tableName} WHERE lower(id::text)=lower($1) OR lower(${key})=lower($1) OR lower(${name})=lower($1) OR starts_with(lower(id::text),lower($1)) ORDER BY id`,[ref]);
 if(rows.length!==1)throw Error(rows.length?'Ambiguous '+kind+':\n'+rows.map(r=>`${r.id} | ${r[key]} | ${r[name]}`).join('\n'):'No '+kind+' match: '+ref);
 return rows[0];
}
async function app(db,o){return match(db,'applications',need(o,'ref'));}
async function undecided(db,id){if((await db.query('SELECT id FROM decisions WHERE application_id=$1',[id])).length)throw Error('Application already has a recorded decision; append a correction note for authorised review');}
async function audit(db,action,id,actor,details={}){await db.query('INSERT INTO events(action,record_id,actor,details) VALUES($1,$2,$3,$4)',[action,id,actor,JSON.stringify(details)]);}
async function addApplication(db,o){
 const intake=await match(db,'intakes',need(o,'intake'));
 return (await db.query(`INSERT INTO applications(source,external_id,intake_id,applicant_ref,name,received_on,due_on,owner,purpose,retention_review_on,raw_source,source_hash)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id,external_id,name`,[
 need(o,'source'),need(o,'external-id'),intake.id,need(o,'applicant-ref'),need(o,'name'),past(o,'received'),day(o,'due'),need(o,'owner'),need(o,'purpose'),day(o,'retention-review'),JSON.stringify(o.raw||{}),o.sourceHash||null]))[0];
}
export const csvHeaders=['Application GUID','Applicant Reference','Applicant Name','Intake Code','Submitted Date','Review Due Date','Owner','Purpose','Retention Review Date'];
async function importSlate(db,o){
 const source=need(o,'source'),sourceRef=need(o,'source-ref'),actor=need(o,'actor');
 const file=fs.readFileSync(path.resolve(need(o,'file')),'utf8');const rows=parseCsv(file);
 const count=Number(need(o,'expected-count'));if(!Number.isSafeInteger(count)||count<1||count!==rows.length)throw Error('Expected count does not match nonempty export rows');
 const ids=new Set();let added=0,skipped=0;
 for(const r of rows){
  for(const k of csvHeaders)if(!Object.hasOwn(r,k)||!r[k].trim())throw Error('Missing export column/value: '+k);
  const external=r['Application GUID'].trim();if(ids.has(external))throw Error('Duplicate Application GUID in export');ids.add(external);
  const opts={source,'external-id':external,'applicant-ref':r['Applicant Reference'],name:r['Applicant Name'],intake:r['Intake Code'],received:r['Submitted Date'],due:r['Review Due Date'],owner:r.Owner,purpose:r.Purpose,'retention-review':r['Retention Review Date'],raw:r,sourceHash:rowHash(r)};
  past(opts,'received');day(opts,'due');day(opts,'retention-review');
  const prior=await db.query('SELECT id,source_hash FROM applications WHERE source=$1 AND external_id=$2',[source,external]);
  if(prior.length){if(prior[0].source_hash!==opts.sourceHash)throw Error('Conflicting source record '+external+'; no original evidence overwritten');skipped++;continue;}
  await addApplication(db,opts);added++;
 }
 await db.query('INSERT INTO imports(source,source_ref,file_hash,expected_count,added,skipped,actor) VALUES($1,$2,$3,$4,$5,$6,$7)',[source,sourceRef,hash(file),count,added,skipped,actor]);
 await audit(db,'import',null,actor,{source,source_ref:sourceRef,added,skipped});
 return [{source,added,skipped,dry_run:Boolean(o['dry-run'])}];
}
function writePrivate(folder,name,text){
 const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,folder);fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const file=path.join(dir,name);fs.writeFileSync(file,text,{flag:'wx',mode:0o600});return [{file}];
}
async function mutate(db,verb,o){
 const actor=need(o,'actor');let result;
 if(verb==='add-intake')result=await db.query('INSERT INTO intakes(code,name,starts_on,owner) VALUES($1,$2,$3,$4) RETURNING *',[need(o,'code'),need(o,'name'),day(o,'starts'),need(o,'owner')]);
 else if(verb==='add-application')result=[await addApplication(db,o)];
 else if(verb==='add-material'){
  const a=await app(db,o);await undecided(db,a.id);
  result=await db.query('INSERT INTO materials(application_id,name,due_on) VALUES($1,$2,$3) RETURNING *',[a.id,need(o,'name'),day(o,'due')]);
  await db.query('UPDATE applications SET checklist_approved_by=NULL,checklist_evidence=NULL WHERE id=$1',[a.id]);
 }else if(verb==='receive-material'){
  const m=await match(db,'materials',need(o,'ref'));await undecided(db,m.application_id);
  const status=need(o,'status');if(!['received','waived'].includes(status))throw Error('status must be received or waived');
  if(m.status!=='missing')throw Error('Material already resolved');
  result=await db.query('UPDATE materials SET status=$1,evidence=$2,recorded_by=$3 WHERE id=$4 RETURNING *',[status,need(o,'evidence'),actor,m.id]);
 }else if(verb==='confirm-checklist'){
  const a=await app(db,o);await undecided(db,a.id);
  if(!(await db.query('SELECT id FROM materials WHERE application_id=$1',[a.id])).length)throw Error('At least one material requirement must be recorded');
  result=await db.query('UPDATE applications SET checklist_approved_by=$1,checklist_evidence=$2 WHERE id=$3 RETURNING id,external_id,checklist_approved_by',[actor,need(o,'evidence'),a.id]);
 }else if(verb==='check-accuracy'){
  const a=await app(db,o);await undecided(db,a.id);const d=past(o,'date');need(o,'evidence');
  result=await db.query('UPDATE applications SET accuracy_checked_on=$1 WHERE id=$2 RETURNING id,external_id,accuracy_checked_on',[d,a.id]);
 }else if(verb==='assign-reader'){
  const a=await app(db,o);await undecided(db,a.id);
  result=await db.query('INSERT INTO reviews(application_id,reader,due_on) VALUES($1,$2,$3) RETURNING *',[a.id,need(o,'reader'),day(o,'due')]);
 }else if(verb==='complete-review'){
  const r=await match(db,'reviews',need(o,'ref'));await undecided(db,r.application_id);if(r.completed_on)throw Error('Review already complete');
  const a=(await db.query('SELECT received_on FROM applications WHERE id=$1',[r.application_id]))[0];const d=past(o,'date');if(d<a.received_on)throw Error('Review predates application');
  result=await db.query('UPDATE reviews SET completed_on=$1,evidence=$2,recorded_by=$3 WHERE id=$4 RETURNING *',[d,need(o,'evidence'),actor,r.id]);
 }else if(verb==='record-decision'){
  const a=await app(db,o);await undecided(db,a.id);const state=(await db.query('SELECT desk_state FROM application_desk WHERE id=$1',[a.id]))[0].desk_state;
  if(state!=='committee-ready')throw Error('Administrative evidence incomplete: '+state);
  const d=past(o,'date');const latest=(await db.query('SELECT max(completed_on) AS date FROM reviews WHERE application_id=$1',[a.id]))[0].date;
  if(d<a.received_on||d<latest||d<a.accuracy_checked_on)throw Error('Decision predates required evidence');
  const outcome=need(o,'outcome');const offer=outcome==='admit'?day(o,'offer-due'):null;if(outcome!=='admit'&&o['offer-due'])throw Error('offer-due is only for admit');
  result=await db.query('INSERT INTO decisions(application_id,outcome,decided_on,authorised_by,evidence,offer_due_on,actor) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[a.id,outcome,d,need(o,'authorised-by'),need(o,'evidence'),offer,actor]);
 }else if(verb==='record-response'){
  const a=await app(db,o);const d=(await db.query('SELECT * FROM decisions WHERE application_id=$1',[a.id]))[0];
  if(!d||d.outcome!=='admit')throw Error('An admission decision is required');const received=past(o,'date');if(received<d.decided_on)throw Error('Response predates decision');
  result=await db.query('INSERT INTO responses(decision_id,response,received_on,evidence,actor) VALUES($1,$2,$3,$4,$5) RETURNING *',[d.id,need(o,'response'),received,need(o,'evidence'),actor]);
 }else if(verb==='log'){
  const a=await app(db,o);result=await db.query('INSERT INTO notes(application_id,text,actor) VALUES($1,$2,$3) RETURNING *',[a.id,need(o,'text'),actor]);
 }else throw Error('Unimplemented command '+verb);
 await audit(db,verb,result[0]?.id||null,actor,o);return result;
}
export async function execute(db,args){
 const {verb,opts:o}=parse(args);
 if(verb==='help')return Object.entries(contracts).map(([command,flags])=>({command,flags:flags.map(f=>'--'+f).join(' ')}));
 if(reads[verb])return db.query(reads[verb]);
 if(verb==='application'){
  const a=await app(db,o);return [{...a,materials:await db.query('SELECT * FROM materials WHERE application_id=$1 ORDER BY name',[a.id]),reviews:await db.query('SELECT * FROM reviews WHERE application_id=$1 ORDER BY reader',[a.id]),decisions:await db.query('SELECT * FROM decisions WHERE application_id=$1',[a.id]),notes:await db.query('SELECT * FROM notes WHERE application_id=$1 ORDER BY created_at,id',[a.id])}];
 }
 if(verb==='export'){
  const records={};await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try{for(const t of ['intakes','applications','materials','reviews','decisions','responses','notes','imports','events'])records[t]=await db.query(`SELECT * FROM ${t} ORDER BY id`);}finally{await db.exec('ROLLBACK');}
  const file=path.resolve(need(o,'file'));fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify({version:1,exported_at:new Date().toISOString(),records},null,2)+'\n',{flag:'wx',mode:0o600});return [{file}];
 }
 if(verb==='weekly-review'){
  const blocks=[];for(const v of ['attention','reader-queue','offer-followup','compliance'])blocks.push('## '+v+'\n'+format(await db.query(reads[v])));
  return writePrivate('drafts','weekly-'+randomUUID()+'.md','# Admissions weekly review\n\nDraft. Internal use. Human decisions only.\n\n'+blocks.join('\n\n')+'\n');
 }
 if(verb==='draft-chase'){
  const a=await app(db,o);const missing=await db.query("SELECT name,due_on FROM materials WHERE application_id=$1 AND status='missing' ORDER BY name",[a.id]);if(!missing.length)throw Error('No missing materials to chase');
  return writePrivate('drafts','chase-'+a.id+'-'+randomUUID()+'.md',`# Draft material follow-up\n\nInternal draft. Verify recipient and evidence before any communication. Nothing sent.\n\nApplication ${a.external_id}: ${a.name}\n\nOur record is awaiting these materials:\n\n${format(missing)}\n`);
 }
 await db.exec('BEGIN');
 try{const result=verb==='import'?await importSlate(db,o):await mutate(db,verb,o);await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}
}
export function format(rows){
 if(!rows.length)return '(none)';
 const flat=rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v instanceof Date?v.toISOString():v&&typeof v==='object'?JSON.stringify(v):v])));
 return table(flat,Object.keys(flat[0]).map(key=>({key,label:key,width:['details','flags'].includes(key)?110:50})));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{const args=process.argv.slice(2);const {opts}=parse(args);db=await getDb();const rows=await execute(db,args);console.log(opts.json?JSON.stringify(rows,null,2):format(rows));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}
}
