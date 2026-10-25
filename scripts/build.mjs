import{readFile,mkdir,writeFile}from'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('lib/',root),{recursive:true});
await writeFile(new URL('lib/host.mjs',root),await readFile(new URL('src/index.mjs',root),'utf8'));
console.log('Host bundle built. No browser module is installed.');
