import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
for(const args of [['scripts/build_substore.mjs','--check'],['tests/test_substore_generation.mjs'],
  ['tests/test_region_routing.mjs'],['tests/test_residential_ipv6.mjs'],['tests/test_generation_reliability.mjs'],
  ['tests/test_residential_relay.mjs'],['tests/test_surge_vless.mjs']]){
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
  if(result.status!==0)process.exit(result.status??1);
}
const result=spawnSync('python3',['-m','unittest','discover','-s','tests','-v'],
  {cwd:root,stdio:'inherit',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
process.exitCode=result.status??1;
