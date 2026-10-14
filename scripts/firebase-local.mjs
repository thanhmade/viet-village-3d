import {spawn, execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (path.resolve(process.cwd()) !== root) throw new Error('Run Firebase tests from CAP-NHAT.');
const gitRoot=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:root,encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim();
if(path.resolve(gitRoot)!==root || branch!=='cap-nhat')throw new Error('Expected the CAP-NHAT worktree on branch cap-nhat.');
const candidateJava = ['C:/Program Files/Android/Android Studio/jbr/bin', process.env.JAVA_HOME && path.join(process.env.JAVA_HOME,'bin')]
  .filter(Boolean).find(p => existsSync(path.join(p, process.platform === 'win32' ? 'java.exe' : 'java')));
const cache = path.join(root, '.cache'); mkdirSync(cache, {recursive: true});
const temporary = path.join(cache,'tmp');mkdirSync(temporary,{recursive:true});
const nodeTools=path.join(root,'.local-tools/node-22');
const nodeFolder=existsSync(nodeTools)?readdirSync(nodeTools).find(name=>/^node-v22\..*-win-x64$/.test(name)):null;
const localNode=nodeFolder?path.join(nodeTools,nodeFolder,'node.exe'):process.execPath;
const env = {...process.env, FIREBASE_EMULATORS_PATH: path.join(cache,'firebase/emulators'),
  XDG_CONFIG_HOME: path.join(cache,'config'), npm_config_cache: path.join(cache,'npm'),
  FIREBASE_CLI_DISABLE_USAGE_REPORTING: '1', CI: 'true',
  TMP:temporary,TEMP:temporary,TMPDIR:temporary,CLOUDSDK_CONFIG:path.join(cache,'gcloud'),
  PATH: path.dirname(localNode)+path.delimiter+(candidateJava ? candidateJava + path.delimiter : '') + process.env.PATH};
const test = process.argv[2] === 'test';
if (!test && process.argv[2] !== 'start') throw new Error('Use test or start. No deployment command is provided.');
const args = ['node_modules/firebase-tools/lib/bin/firebase.js', test ? 'emulators:exec' : 'emulators:start',
  '--only','auth,firestore,database,functions','--project','demo-viet-village-3d','--config','firebase.json'];
if (test) args.push('node --test --test-concurrency=1 SOURCE-CODE/tests/firebase-emulator.test.mjs SOURCE-CODE/tests/experience-emulator.test.mjs SOURCE-CODE/tests/quest-emulator.test.mjs');
const child = spawn(localNode, args, {cwd: root, env, stdio:'inherit'});
child.on('error', error => {console.error(error.message);process.exitCode = 1;});
child.on('exit', code => {process.exitCode = code ?? 1;});
