import os,pathlib,tempfile,subprocess,json,shutil,itertools,signal
R=pathlib.Path(__file__).resolve().parents[2]; O=R/'fsr-reports/codex-worker-routing'; results=[]
def home(): return pathlib.Path(tempfile.mkdtemp(prefix='cwr-probe-'))
def run(h,args=(),extra=None):
 e=dict(os.environ,SOL_WORKER_ROUTING_TEST_HOME=str(h)); e.pop('CODEX_HOME',None);e.update(extra or {})
 p=subprocess.run(['/bin/bash',str(R/'scripts/install.sh'),*args],env=e,text=True,capture_output=True,timeout=20)
 return {'exit':p.returncode,'output':p.stdout+p.stderr}
def record(name,result):results.append({'case':name,**result})
def snap(h):return {str(p.relative_to(h)):p.read_bytes().hex() for p in h.rglob('*') if p.is_file() and not p.is_symlink()}
for a,b in itertools.product([False,True],repeat=2):
 h=home();run(h)
 for flag,lane in [(a,'luna_medium_worker'),(b,'luna_worker')]:
  if flag:run(h,['--disable-lane',lane])
 before=snap(h); r=run(h);record('repeat-state-'+str((a,b)),{'exit':r['exit'],'preserved':snap(h)==before})
for conflict in ['unknown','dual','symlink','fifo','missing']:
 h=home();run(h);p=h/'.codex/agents/luna-worker.toml'
 if conflict=='unknown':p.write_text('user custom')
 elif conflict=='dual':shutil.copyfile(p,str(p)+'.disabled')
 elif conflict=='symlink':p.unlink();p.symlink_to(R/'agents/luna-worker.toml')
 elif conflict=='fifo':p.unlink();os.mkfifo(p)
 else:p.unlink()
 # avoid reading fifo
 r=run(h);record('conflict-'+conflict,r)
# Supported release bytes, all state combinations for each topology.
for tag in ['v0.4.1','v0.5.3','v0.6.0','v0.7.0','v0.7.1','v0.8.0','v0.9.0','v0.10.0','v0.12.0','v0.12.1','v0.12.2','v0.12.3','v0.13.0','bfbafeb']:
 files=subprocess.check_output(['git','ls-tree','-r','--name-only',tag],cwd=R,text=True).splitlines()
 for disabled in [False,True]:
  h=home()
  for f in files:
   if (f.startswith('agents/') and f.endswith('.toml')) or f in ['skills/sol-worker-routing/SKILL.md','skills/sol-luna-workflow/SKILL.md']:
    dest=h/('.codex/'+f+('.disabled' if disabled else '') if f.startswith('agents/') else '.agents/'+f)
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(subprocess.check_output(['git','show',tag+':'+f],cwd=R))
  r=run(h);record('upgrade-'+tag+('-disabled' if disabled else '-enabled'),r)
# Inject process termination after first atomic rename; real installation code is unchanged.
for mode in ['fresh','disable']:
 for fault in ['fail','TERM','KILL']:
  h=home()
  if mode=='disable':run(h)
  before=snap(h);bindir=pathlib.Path(tempfile.mkdtemp(prefix='cwr-bin-'));mark=bindir/'hit'
  wrapper=bindir/'mv';wrapper.write_text('#!/bin/bash\n/bin/mv "$@" || exit $?\nif [[ ! -e "'+str(mark)+'" ]]; then\n touch "'+str(mark)+'"\n'+('exit 19' if fault=='fail' else 'kill -'+fault+' "$PPID"')+'\nfi\n');wrapper.chmod(0o755)
  r=run(h,['--disable-lane','luna_worker'] if mode=='disable' else [],{'PATH':str(bindir)+':'+os.environ['PATH']})
  recovered= snap(h)==before
  rerun=run(h,['--disable-lane','luna_worker'] if mode=='disable' else [])
  record('interruption-'+mode+'-'+fault,{'first':r,'restored':recovered,'rerun':rerun})
O.mkdir(parents=True,exist_ok=True);(O/'probe-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
for x in results:
 print(x['case'],x.get('exit',x.get('first',{}).get('exit')),'rerun='+str(x.get('rerun',{}).get('exit')) if 'rerun'in x else '', 'preserved='+str(x.get('preserved',x.get('restored',''))))
