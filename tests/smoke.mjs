import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../',import.meta.url);
const raw = readFileSync(new URL('workflow.json', root),'utf8');
const template = JSON.parse(raw);
const owner = '123456789';
const table = 'testTableId';
const w = JSON.parse(raw.replaceAll('REPLACE_WITH_TELEGRAM_USER_ID',owner).replaceAll('REPLACE_WITH_DATA_TABLE_ID',table));
const nodes = Object.fromEntries(w.nodes.map(x=>[x.name,x]));
let passed=0;
function test(name,fn){fn();console.log('PASS '+name);passed++;}
const wrap=x=>({json:x});
function run(name,inputs,refs={},globals={}){
 const source=nodes[name].parameters.jsCode;
 const context={ $input:{all:()=>inputs.map(wrap),first:()=>inputs.length?wrap(inputs[0]):undefined}, $:key=>({first:()=>wrap(refs[key]),all:()=>[wrap(refs[key])]}), ...globals};
 return JSON.parse(JSON.stringify(vm.runInNewContext(`(function(){${source}\n})()`,context,{timeout:3000}))).map(x=>x.json);
}
const msg=(text,id=owner,type='private')=>({message:{text,from:{id},chat:{id,type}}});
const intake=(text)=>run('Validate Telegram Input1',[msg(text)])[0];
const req=intake('/add https://example.com/grant?utm_source=test');
const task=(number,title,required=true,conditional='',done=false)=>({number,title,required,conditional,done,source_id:'S1',quote:'An example of a verified quote.'});
const row={owner_id:owner,opportunity_id:req.opportunity_id,dedupe_key:req.dedupe_key,title:'Synthetic grant',tasks_json:JSON.stringify([task(1,'Proposal',true,'',true),task(2,'Repository'),task(3,'Team names',true,'applying as a team'),task(4,'Letter',false)]),deadline_date:new Date(Date.now()+3600000+86400000).toISOString().slice(0,10),deadline_time:'23:59',deadline_timezone:'UTC',last_reminder_key:''};
test('template inactive, unique node IDs/names and valid connections',()=>{assert.equal(template.active,false);assert.equal(new Set(w.nodes.map(n=>n.id)).size,w.nodes.length);assert.equal(Object.keys(nodes).length,w.nodes.length);for(const [name,c] of Object.entries(w.connections)){assert.ok(nodes[name]);for(const output of c.main)for(const edge of output)assert.ok(nodes[edge.node]);}});
test('no credential references or pinned execution data',()=>{assert.deepEqual(template.pinData,{});assert.ok(template.nodes.every(n=>!n.credentials&&!n.webhookId));});
test('all Code nodes compile',()=>{for(const n of w.nodes.filter(n=>n.type==='n8n-nodes-base.code'))new vm.Script(`(function(){${n.parameters.jsCode}\n})`);});
test('10 database nodes and 3 owner settings configurable',()=>{assert.equal((raw.match(/REPLACE_WITH_TELEGRAM_USER_ID/g)||[]).length,3);assert.equal(w.nodes.filter(n=>n.parameters.dataTableId?.value===table).length,10);assert.ok(!JSON.stringify(w).includes('REPLACE_WITH_'));});
test('owner authorized, outsiders and groups ignored',()=>{assert.equal(intake('hello').action,'help');assert.equal(run('Validate Telegram Input1',[msg('hello','987654321'),msg('hello',owner,'group')]).length,0);});
test('canonical URL and invalid URL rejection',()=>{assert.equal(req.url,'https://example.com/grant');assert.equal(intake('/add https://example.invalid/a').error,'invalid_url');assert.equal(intake('/add http://127.0.0.1/a').error,'invalid_url');});
test('duplicate lookup returns actual saved ID',()=>{const hit=run('Check Existing',[row],{'Validate Telegram Input1':req})[0];assert.equal(hit.exists,true);assert.equal(hit.existing_id,row.opportunity_id);assert.equal(run('Check Existing',[{...row,owner_id:'111'}],{'Validate Telegram Input1':req})[0].exists,false);});
test('save confirmation fails when read-back missing or mismatched',()=>{const expected={...row,chat_id:owner,reply:'Saved'};const refs={'Validate and Pack':expected};assert.equal(run('Confirm Saved Record',[row],refs)[0].reply,'Saved');assert.match(run('Confirm Saved Record',[{}],refs)[0].reply,/did not confirm/);assert.match(run('Confirm Saved Record',[{...row,tasks_json:'[]'}],refs)[0].reply,/did not confirm/);});
test('progress groups and pagination formatting',()=>{const statusReq={owner_id:owner,chat_id:owner,opportunity_id:row.opportunity_id,page:1};const reply=run('Format Status',[row],{'Validate Telegram Input1':statusReq})[0].reply;assert.match(reply,/Core required: 1\/2 · Conditional required: 0\/1 · Optional \/ verify: 0\/1/);assert.match(reply,/Deadline evidence:/);assert.match(reply,/Required if applying as a team/);});
test('done and undo mutate task state',()=>{for(const [action,done] of [['done',true],['undo',false]]){const res=run('Change Task State',[row],{'Validate Telegram Input1':{...req,action,task_number:2}})[0];assert.equal(res.ok,true);assert.equal(JSON.parse(res.tasks_json)[1].done,done);}});
test('reminder excludes completed and optional tasks, dedupes marker',()=>{const r=run('Choose Reminders',[row])[0];assert.ok(r);assert.match(r.reminder_message,/Repository/);assert.doesNotMatch(r.reminder_message,/Proposal|Letter/);assert.match(r.reminder_message,/Conditional required tasks still unchecked: 1/);assert.match(r.reminder_message,/1 day away/);assert.equal(run('Choose Reminders',[{...row,last_reminder_key:r.last_reminder_key}]).length,0);assert.equal(run('Choose Reminders',[{...row,deadline_date:''}]).length,0);});
const ctx={...req,sources:[{id:'S1',url:req.url,content:'Synthetic grant. Applications close on December 10, 2026, at 11:59 PM UTC. \n*   1 distribution post on X summarising your article.\nPublish a demo video that demonstrates the project and include the final explanation. Videos must be uploaded publicly. Provide an original project proposal.'}],issues:[]};
const candidate={title:'Synthetic grant',category:'grant',summary:'Test grant',eligibility:[],deadline:{date:'2026-12-10',raw:'Applications close on December 10, 2026, at 11:59 PM UTC.',time:'23:59',timezone:'UTC',source_id:'S1',quote:'Applications close on December 10, 2026, at 11:59 PM UTC.'},tasks:[{task:'Publish X post',source_id:'S1',quote:'One distribution post on X summarising your article.',conditional:'',required:true},{task:'Publish public demo',source_id:'S1',quote:'Publish a demo video that demonstrates the project... Videos must be uploaded publicly.',conditional:'',required:true},{task:'Pay a fee',source_id:'S1',quote:'Pay a fee before submitting.',conditional:'',required:true}],submission_url:'https://example.com/invented',submission_instructions:'',issues:[]};
function validate(data){return run('Validate and Pack',[{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(data)}]}]}],{'Prepare AI Request':ctx})[0];}
test('recover numerical and ellipsis quote; reject fabricated task and URL',()=>{const r=validate(candidate);assert.equal(r.valid,true);const tasks=JSON.parse(r.tasks_json);assert.equal(tasks.length,2);assert.match(tasks[0].quote,/1 distribution post/);assert.match(tasks[1].quote,/include the final explanation/);assert.equal(r.submission_url,'');assert.equal(r.deadline_time,'23:59');assert.match(r.warnings_json,/Pay a fee/);});
test('incomplete API extraction does not save',()=>{const r=run('Validate and Pack',[{status:'incomplete',incomplete_details:{reason:'max_output_tokens'}}],{'Prepare AI Request':ctx})[0];assert.equal(r.valid,false);});
const setup=JSON.parse(readFileSync(new URL('setup-storage.json',root),'utf8'));
test('setup schema matches insertion mapping',()=>{const cols=setup.nodes[1].parameters.columns.column.map(x=>x.name).sort();assert.equal(cols.length,22);assert.deepEqual(cols,Object.keys(nodes['DB Save Opportunity'].parameters.columns.value).sort());});
console.log(`${passed} offline smoke tests passed`);
