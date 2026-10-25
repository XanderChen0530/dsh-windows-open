import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir,stat,unlink} from 'node:fs/promises';
import {tmpdir,homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import * as profile from '../scripts/profile.mjs';

const root='/opt/dsh-windows-open';
const template='# Your patch layer for this dsh profile, applied after every bundle layer:\n# a top-level YAML array of loader patch entries (id-targeted config\n# overrides, disables, and insert lists; `!!js` expressions allowed).\n[]\n';
async function fixture(text){
 const dir=await mkdtemp(join(tmpdir(),'dsh-open-profile-'));
 const target=join(dir,'cordis.patch.yml');await writeFile(target,text);
 return {dir,target,options:{profileDir:dir,root}};
}
for(const [name,text] of Object.entries({template,crlf:template.replaceAll('\n','\r\n'),blank:' \n# comment\n',empty:'',noNewline:'- id: existing\n  disabled: false',emptyNoNewline:'# comment\n[]',flowComment:'  [] # retain me\r\n# after\r\n'})){
 test('exact repeated round trip: '+name,async()=>{
  const {dir,target,options}=await fixture(text);
  for(let i=0;i<2;i++){
   assert.equal(await profile.changeProfile('install',options),true);
   const installed=await readFile(target,'utf8');
   assert.match(installed,/lib\/host\.mjs/);
   assert.doesNotMatch(installed,/^\s*\[\]/m);
   if(name==='crlf')assert.doesNotMatch(installed,/(?<!\r)\n/);
   assert.equal(await profile.changeProfile('install',options),false);
   assert.equal(await profile.changeProfile('uninstall',options),true);
   assert.equal(await readFile(target,'utf8'),text);
   assert.equal(await profile.changeProfile('uninstall',options),false);
  }
  const backups=(await readdir(dir)).filter(x=>x.endsWith('.bak'));
  assert.equal(backups.length,4);
  if(process.platform!=='win32')for(const file of [...backups,'cordis.patch.yml'])assert.equal((await stat(join(dir,file))).mode&0o777,0o600);
  assert.ok(!(await readdir(dir)).some(x=>x.endsWith('.lock')||x.endsWith('.tmp')));
 });
}
for(const eol of ['\n','\r\n']){
 test('empty-sequence restoration refuses external configuration: '+JSON.stringify(eol),async()=>{
  const {dir,target,options}=await fixture(template.replaceAll('\n',eol));
  await profile.changeProfile('install',options);
  const installed=await readFile(target,'utf8');
  for(const text of [installed+'- id: external'+eol,'- id: external'+eol+installed]){
   await writeFile(target,text);const before=(await readdir(dir)).sort();
   await assert.rejects(profile.changeProfile('uninstall',options),/manually remove.*managed block.*preserv.*other configuration/i);
   assert.deepEqual(await readFile(target),Buffer.from(text));
   assert.deepEqual((await readdir(dir)).sort(),before);
  }
 });
 test('empty-sequence restoration preserves external comments: '+JSON.stringify(eol),async()=>{
  const original=template.replaceAll('\n',eol);
  const {target,options}=await fixture(original);
  await profile.changeProfile('install',options);
  const prefix='# external before'+eol, suffix='  # external after'+eol+' \t'+eol;
  await writeFile(target,prefix+await readFile(target,'utf8')+suffix);
  await profile.changeProfile('uninstall',options);
  assert.deepEqual(await readFile(target),Buffer.from(prefix+original+suffix));
 });
}
test('backup is the initial text and external edits survive uninstall',async()=>{
 const text='- id: existing\n';const {dir,target,options}=await fixture(text);
 await profile.changeProfile('install',options);
 const backup=(await readdir(dir)).find(x=>x.endsWith('.bak'));
 assert.equal(await readFile(join(dir,backup),'utf8'),text);
 await writeFile(target,'# external before\n'+await readFile(target,'utf8')+'# external after\n');
 await profile.changeProfile('uninstall',options);
 assert.equal(await readFile(target,'utf8'),'# external before\n'+text+'# external after\n');
});
for(const text of ['[1]\n','[\n]\n','{}\n','key: value\n','!!js "throw Error()"\n','---\n[]\n','[]\n- id: x\n','- id: dsh-windows-open\n']){
 test('reject unsupported root without changes: '+JSON.stringify(text),async()=>{
  const {dir,target,options}=await fixture(text);
  await assert.rejects(profile.changeProfile('install',options));
  assert.equal(await readFile(target,'utf8'),text);
  assert.deepEqual(await readdir(dir),['cordis.patch.yml']);
 });
}
for(const text of ['# >>> dsh-windows-open managed >>>\n','# <<< dsh-windows-open managed <<<\n','# >>> dsh-windows-open managed >>>\n# <<< dsh-windows-open managed <<<\n','# >>> dsh-windows-open managed >>> broken\n']){
 test('reject abnormal markers: '+JSON.stringify(text),async()=>{
  const {target,options}=await fixture(text);
  for(const action of ['install','uninstall'])await assert.rejects(profile.changeProfile(action,options),/managed|marker/i);
  assert.equal(await readFile(target,'utf8'),text);
 });
}
test('reject duplicate and tampered installed blocks',async()=>{
 const {target,options}=await fixture('');await profile.changeProfile('install',options);
 const text=await readFile(target,'utf8');
 for(const bad of [text+text,text.replace('    - id:', '    - wrong:')]){
  await writeFile(target,bad);await assert.rejects(profile.changeProfile('uninstall',options),/managed|marker/i);
  assert.equal(await readFile(target,'utf8'),bad);
 }
});
test('exclusive lock conflict does not touch profile or someone else’s lock',async()=>{
 const {dir,target,options}=await fixture('[]\n');const lock=join(dir,'cordis.patch.yml.dsh-windows-open.lock');
 await writeFile(lock,'other owner');
 await assert.rejects(profile.changeProfile('install',options),/lock/i);
 assert.equal(await readFile(target,'utf8'),'[]\n');assert.equal(await readFile(lock,'utf8'),'other owner');
 await unlink(lock);
});
test('simultaneous cooperating installers serialize or reject',async()=>{
 const {target,options}=await fixture(template);
 const results=await Promise.allSettled(Array.from({length:8},()=>profile.changeProfile('install',options)));
 assert.equal(results.filter(x=>x.status==='fulfilled'&&x.value===true).length,1);
 for(const x of results)if(x.status==='rejected')assert.match(x.reason.message,/lock/i);
 await profile.changeProfile('uninstall',options);assert.equal(await readFile(target,'utf8'),template);
});
test('reread refuses an intervening external write and backup retains initial text',async()=>{
 const initial='- id: initial\n';const external='- id: external\n';
 const {dir,target}=await fixture(initial);
 // Isolate a deterministic filesystem interleaving in a child, without production test hooks.
 const source=`
  import fs from 'node:fs/promises';
  import {syncBuiltinESMExports} from 'node:module';
  const original=fs.open;
  fs.open=async function(path,...args){
   const handle=await original.call(this,path,...args);
   if(String(path).endsWith('.tmp'))await fs.writeFile(${JSON.stringify(target)},${JSON.stringify(external)});
   return handle;
  };
  syncBuiltinESMExports();
  const {changeProfile}=await import(${JSON.stringify(pathToFileURL(resolve('scripts/profile.mjs')).href)});
  try{await changeProfile('install',{profileDir:${JSON.stringify(dir)},root:${JSON.stringify(root)}});process.exitCode=2;}
  catch(e){if(!/profile changed/.test(e.message))throw e;}
 `;
 const child=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8'});
 assert.equal(child.status,0,child.stderr);
 assert.equal(await readFile(target,'utf8'),external);
 const files=await readdir(dir),backups=files.filter(x=>x.endsWith('.bak'));
 assert.equal(backups.length,1);assert.equal(await readFile(join(dir,backups[0]),'utf8'),initial);
 assert.ok(!files.some(x=>x.endsWith('.lock')||x.endsWith('.tmp')));
});
test('resolveDshHome matches DSH precedence and expansion',()=>{
 assert.equal(typeof profile.resolveDshHome,'function');
 for(const value of [undefined,'','  \t'])assert.equal(profile.resolveDshHome(undefined,{DSH_HOME:value}),join(homedir(),'.dsh'));
 for(const value of ['~','~/custom','~\\custom','relative','/explicit',' spaces ']){
  const expected=value==='~'?homedir():value.startsWith('~/')||value.startsWith('~\\')?resolve(homedir(),value.slice(2)):resolve(value);
  assert.equal(profile.resolveDshHome(undefined,{DSH_HOME:value}),expected);
  assert.equal(profile.resolveDshHome(value,{DSH_HOME:'/ignored'}),expected);
 }
 assert.equal(profile.resolveDshHome('',{DSH_HOME:'/ignored'}),resolve(''));
});
