import fs from 'node:fs';
import path from 'node:path';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {execute,format} from './admissions.mjs';
if(process.env.DATABASE_URL||fs.existsSync(path.join(REPO_ROOT,'.env'))||fs.existsSync(path.join(REPO_ROOT,'.env.local')))throw Error('Demo only runs without a configured hosted database or local environment file');
process.env.DATA_DIR=process.env.DATA_DIR||'.data/demo';
const db=await getDb();try{await migrate(db);await db.exec(fs.readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8'));for(const v of ['attention','committee-ready','offer-followup'])console.log('\n'+v+'\n'+format(await execute(db,[v])));console.log('\nDemo data: '+process.env.DATA_DIR+' (set DATA_DIR to this location for further commands).');}finally{await db.close();}
