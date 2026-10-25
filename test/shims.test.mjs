import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const harness=String.raw`
import sys, os, json, runpy, socket, tempfile, subprocess
from unittest.mock import patch
script, mode, *args = sys.argv[1:]
with tempfile.TemporaryDirectory() as directory:
 sockpath=directory+'/interop'; sock=socket.socket(socket.AF_UNIX); sock.bind(sockpath); sock.listen(8)
 stalepath=directory+'/stale'; stale=socket.socket(socket.AF_UNIX); stale.bind(stalepath)
 os.environ['WSL_INTEROP']=stalepath if mode=='bound-stale' else (sockpath if mode != 'stale' else '/missing/socket')
 calls=[]
 original_stat=os.stat
 def socket_stat(path, *args, **kwargs):
  if str(path).startswith('/run/WSL/') or (mode=='no-socket' and str(path)==sockpath): raise FileNotFoundError(path)
  return original_stat(path,*args,**kwargs)
 def run(argv, **kwargs):
  calls.append(argv)
  assert argv[0]=='/usr/bin/wslpath' and kwargs['timeout'] > 0
  if mode=='failure': raise subprocess.TimeoutExpired(argv,kwargs['timeout'])
  if argv[1]=='-u':
   value='/windows/explorer.exe' if argv[2]==r'C:\Windows\explorer.exe' else '/windows/powershell.exe'
  else: value='Z:'+argv[2].replace('/',chr(92))
  return subprocess.CompletedProcess(argv,0,value+'\n','')
 def execute(path, argv):
  if mode=='exec-failure': raise OSError('exec failed')
  print(json.dumps({'path':path,'argv':argv,'interop':os.environ.get('WSL_INTEROP'),'calls':calls}))
  raise SystemExit(0)
 sys.argv=[script]+args
 with patch('subprocess.run',run), patch('os.execv',execute), patch('os.stat',socket_stat), patch('glob.glob',return_value=[sockpath]):
  runpy.run_path(script,run_name='__main__')
`;
function invoke(shim,args=[],mode='ok'){
 return spawnSync('python3',['-c',harness,fileURLToPath(new URL('../bin/'+shim,import.meta.url)),mode,...args],{encoding:'utf8'});
}
test('explorer discovers Windows path and execs unchanged argv without shell',()=>{
 const result=invoke('explorer.exe',['/tmp/a b','x;echo nope']);assert.equal(result.status,0,result.stderr);
 const data=JSON.parse(result.stdout);assert.equal(data.path,'/windows/explorer.exe');assert.deepEqual(data.argv,['/windows/explorer.exe','/tmp/a b','x;echo nope']);assert.deepEqual(data.calls,[['/usr/bin/wslpath','-u','C:\\Windows\\explorer.exe']]);
});
test('PowerShell converts only the pre-command File operand preserving argument boundaries',()=>{
 const r=invoke('powershell.exe',['-NoProfile','-File','/tmp/a b.ps1','-File','/keep','a; b']);assert.equal(r.status,0,r.stderr);
 const d=JSON.parse(r.stdout);assert.deepEqual(d.argv,['/windows/powershell.exe','-NoProfile','-File','Z:\\tmp\\a b.ps1','-File','/keep','a; b']);
 for(const flag of ['-Command','-EncodedCommand','-c','-ec','-comm','-enco']){
  const x=invoke('powershell.exe',[flag,'echo','-File','/untouched']);assert.equal(x.status,0,x.stderr);assert.deepEqual(JSON.parse(x.stdout).argv.slice(1),[flag,'echo','-File','/untouched']);
 }
});
test('PowerShell abbreviated commands and option operands are not script switches',()=>{
 for(const args of [['-comm','-File','/untouched'],['-enco','-File','/untouched'],['-ExecutionPolicy','-File','-Command','body']]) {
  const r=invoke('powershell.exe',args);assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout).argv.slice(1),args);
 }
});
test('bound but non-listening stale env socket falls back to a connectable socket',()=>{
 for(const shim of ['explorer.exe','powershell.exe']) {
  const result=invoke(shim,[],'bound-stale');assert.equal(result.status,0,result.stderr);
  assert.match(JSON.parse(result.stdout).interop,/\/interop$/);
 }
});
test('socket fallback uses an actual socket and failures return 127, never 1',()=>{
 const result=invoke('explorer.exe',[],'stale');assert.equal(result.status,0,result.stderr);assert.match(JSON.parse(result.stdout).interop,/\/interop$/);
 for(const shim of ['explorer.exe','powershell.exe']) for(const mode of ['failure','no-socket','exec-failure']) {const r=invoke(shim,[],mode);assert.equal(r.status,127,r.stderr);}
});
