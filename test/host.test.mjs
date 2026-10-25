import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {apply,name,inject} from '../src/index.mjs';
function setup(env,release='linux'){
 const disposers=[];const ctx={effect(fn){const dispose=fn();if(dispose)disposers.push(dispose);}};
 apply(ctx,{internals:{env,release}});return {dispose(){disposers.reverse().forEach(fn=>fn());}};
}
test('host-only plugin needs no connection, filesystem, UI or network service',()=>{
 assert.equal(name,'dsh-windows-open');assert.deepEqual(inject,[]);
 const env={PATH:'/usr/bin'};const instance=setup(env);assert.equal(env.PATH,'/usr/bin');instance.dispose();
});
test('WSL appends one command directory and keeps global interop unchanged',()=>{
 const env={PATH:'/usr/bin::/bin',WSL_DISTRO_NAME:'Demo'};const a=setup(env),installed=env.PATH,bin=installed.split(':').at(-1);
 assert.match(bin,/dsh-windows-open\/bin$/);assert.equal(env.WSL_INTEROP,undefined);const b=setup(env);assert.equal(env.PATH,installed);
 env.PATH='/new:'+env.PATH+':/later';b.dispose();a.dispose();assert.equal(env.PATH,'/new:/usr/bin::/bin:/later');
});
test('existing command directory is not removed and absent PATH restores',()=>{
 const bin=fileURLToPath(new URL('../bin',import.meta.url));const env={PATH:bin,WSL_DISTRO_NAME:'Demo'};setup(env).dispose();assert.equal(env.PATH,bin);
 const empty={};setup(empty,'microsoft-WSL2').dispose();assert.equal(empty.PATH,undefined);
});
