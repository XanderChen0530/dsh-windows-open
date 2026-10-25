import {readFile,mkdir,open,rename,unlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const START='# >>> dsh-windows-open managed >>>';
const END='# <<< dsh-windows-open managed <<<';
const META='# dsh-windows-open restore-v1: ';
const stopWriters='Stop all other profile/configuration writers before retrying; the installer lock only coordinates this installer.';

// Match DSH's explicit > nonblank environment > default precedence, including tilde expansion.
export function resolveDshHome(configured,env=process.env){
 const value=configured??(env.DSH_HOME?.trim()?env.DSH_HOME:join(homedir(),'.dsh'));
 const expanded=value==='~'?homedir():value.startsWith('~/')||value.startsWith('~\\')?join(homedir(),value.slice(2)):value;
 return resolve(expanded);
}
function managed(entry,meta,eol){
 return [START,META+Buffer.from(JSON.stringify(meta)).toString('base64'),'- insert:','    - id: dsh-windows-open','      name: '+JSON.stringify(entry),END,''].join(eol);
}
function inspectManaged(text){
 // Treat malformed/duplicate marker-like lines as errors, not ordinary comments.
 const markers=[...text.matchAll(/^.*dsh-windows-open managed.*(?:\r?\n|$)/gm)];
 if(!markers.length)return null;
 const invalid=()=>Error('Invalid, incomplete, duplicate or edited managed block/marker. Restore it before continuing.');
 if(markers.length!==2)throw invalid();
 const [first,last]=markers;
 const block=text.slice(first.index,last.index+last[0].length);
 const eol=first[0].endsWith('\r\n')?'\r\n':'\n';
 const lines=block.split(eol);
 if(lines[0]!==START||lines[5]!==END||lines[6]!==''||lines.length!==7||!lines[1].startsWith(META))throw invalid();
 let meta,entry;
 try{meta=JSON.parse(Buffer.from(lines[1].slice(META.length),'base64').toString('utf8'));entry=JSON.parse(lines[4].slice('      name: '.length));}catch{throw invalid();}
 if(typeof entry!=='string'||!meta||typeof meta.restore!=='string'||!['','\n','\r\n'].includes(meta.separator)||Object.keys(meta).sort().join(',')!=='restore,separator'||managed(entry,meta,eol)!==block)throw invalid();
 // Only restore a single blank/comment/empty-sequence line, never arbitrary executable YAML.
 if(meta.restore&&!/^[ \t]*\[\][ \t]*(?:#[^\r\n]*)?(?:\r?\n)?$/.test(meta.restore))throw invalid();
 const begin=first.index-meta.separator.length;
 if(begin<0||text.slice(begin,first.index)!==meta.separator)throw invalid();
 return {begin,end:last.index+last[0].length,meta};
}
function installText(text,root){
 if(/\bid:\s*['"]?dsh-windows-open\b/.test(text))throw Error('An existing unmanaged plugin row already uses dsh-windows-open.');
 const eol=text.includes('\r\n')?'\r\n':'\n';
 const lines=[...text.matchAll(/[^\n]*(?:\n|$)/g)].filter(x=>x[0]);
 const meaningful=lines.filter(x=>!(/^[ \t]*(?:#[^\r\n]*)?(?:\r?\n)?$/).test(x[0]));
 const empty=meaningful.length===1&&/^[ \t]*\[\][ \t]*(?:#[^\r\n]*)?(?:\r?\n)?$/.test(meaningful[0][0])?meaningful[0]:null;
 if(!empty&&meaningful.length){
  // Conservative structural guard, not a YAML parser. Never evaluate !!js or load dependencies.
  // Accept only an existing block-list root; nested YAML remains opaque and unchanged.
  const indent=meaningful[0][0].match(/^ */)[0].length;
  if(indent!==0||meaningful.some(x=>!/^ +\S/.test(x[0])&&!/^-(?:[ \t]|\r?\n|$)/.test(x[0])))throw Error('Unsupported profile: expected blank/comments, a lone empty [], or a block-list root. Nonempty flow roots are not supported.');
 }
 const entry=join(root,'lib/host.mjs');
 if(empty)return text.slice(0,empty.index)+managed(entry,{restore:empty[0],separator:''},eol)+text.slice(empty.index+empty[0].length);
 const separator=text&&!text.endsWith('\n')?eol:'';
 return text+separator+managed(entry,{restore:'',separator},eol);
}
async function readSnapshot(target){
 try{return {text:await readFile(target,'utf8'),exists:true};}catch(e){if(e.code!=='ENOENT')throw e;return {text:'',exists:false};}
}
async function privateWrite(path,text){
 const handle=await open(path,'wx',0o600);
 try{await handle.writeFile(text,'utf8');await handle.sync();}finally{await handle.close();}
}
export async function changeProfile(action,{profileDir,root}){
 if(!['install','uninstall'].includes(action))throw Error('Use install or uninstall.');
 await mkdir(profileDir,{recursive:true});
 const target=join(profileDir,'cordis.patch.yml');
 const lockPath=target+'.dsh-windows-open.lock';
 let lock;
 try{lock=await open(lockPath,'wx',0o600);}catch(e){if(e.code==='EEXIST')throw Error('Installer lock exists. '+stopWriters+' Remove a stale lock only after confirming its owner has stopped.');throw e;}
 let temp;
 try{
  const initial=await readSnapshot(target),text=initial.text;
  const block=inspectManaged(text);
  if(action==='install'&&block||action==='uninstall'&&!block)return false;
  // Restoring [] alongside externally added entries would create an invalid mixed root.
  // Refuse before backups/temporary writes; never discard the user's added configuration.
  if(action==='uninstall'&&block.meta.restore){
   const outside=text.slice(0,block.begin)+text.slice(block.end);
   if(!outside.split(/\r?\n/).every(line=>/^[ \t]*(?:#[^\r\n]*)?$/.test(line)))throw Error('Cannot restore the empty [] root alongside other configuration. Manually remove the managed block while preserving the other configuration; do not restore [].');
  }
  const next=action==='install'?installText(text,root):text.slice(0,block.begin)+block.meta.restore+text.slice(block.end);
  // Backup the initial read, not a later copy of a possibly changed source. Exclusive and private.
  await privateWrite(target+'.dsh-windows-open.'+randomUUID()+'.bak',text);
  const candidate=target+'.dsh-windows-open.'+randomUUID()+'.tmp';
  // Record ownership only after wx succeeds: cleanup must never unlink someone else's file.
  const handle=await open(candidate,'wx',0o600);temp=candidate;
  try{await handle.writeFile(next,'utf8');await handle.sync();}finally{await handle.close();}
  const current=await readSnapshot(target);
  if(current.text!==text||current.exists!==initial.exists)throw Error('The profile changed during the operation. '+stopWriters);
  // Same-directory rename prevents truncation/partial reads, NOT an atomic compare-and-swap.
  // A noncooperating writer can still write between this reread and rename (or afterwards).
  // Stop other configuration writers; the exclusive lock protects only cooperating installers.
  await rename(temp,target);temp=undefined;
  return true;
 }finally{
  try{if(temp){if(!temp.startsWith(target+'.dsh-windows-open.')||!temp.endsWith('.tmp'))throw Error('Unexpected temporary path.');await unlink(temp);}}
  finally{try{await lock.close();}finally{await unlink(lockPath);}}
 }
}
const own=fileURLToPath(import.meta.url);
if(process.argv[1]&&resolve(process.argv[1])===own){
 const [action,...args]=process.argv.slice(2);let profile='web',configured;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--profile'&&args[i+1])profile=args[++i];
  else if(args[i]==='--dsh-home'&&args[i+1]!==undefined)configured=args[++i];
  else throw Error('Unknown argument: '+args[i]);
 }
 if(!/^[a-zA-Z0-9_-]+$/.test(profile))throw Error('Invalid profile name.');
 const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
 console.warn(stopWriters+' Reread + rename is not atomic CAS against noncooperating writers.');
 const changed=await changeProfile(action,{profileDir:join(resolveDshHome(configured),'profiles',profile),root});
 console.log(changed?'Profile updated. Restart DSH when no tasks are running. Then refresh the page.':'No profile change.');
}
