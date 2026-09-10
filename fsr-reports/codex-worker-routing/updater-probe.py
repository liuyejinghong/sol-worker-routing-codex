import tempfile,pathlib,subprocess,shutil,json,os
R=pathlib.Path(__file__).resolve().parents[2];root=pathlib.Path(tempfile.mkdtemp(prefix='cwr-update-'));results=[]
def git(p,*a):return subprocess.run(['git','-C',str(p),'-c','user.name=Audit Fixture','-c','user.email=audit@example.invalid',*a],text=True,capture_output=True,check=True)
origin=root/'origin';origin.mkdir();git(origin,'init','-b','main');(origin/'scripts').mkdir();shutil.copy(R/'scripts/update.sh',origin/'scripts/update.sh');(origin/'scripts/install.sh').write_text('#!/bin/bash\necho called >> "$PROBE_RECEIPT"\nexit "${PROBE_INSTALL_EXIT:-0}"\n');git(origin,'add','.');git(origin,'commit','-m','fixture baseline');base=git(origin,'rev-parse','HEAD').stdout.strip()
for case in ['same','fast-forward','dirty','untracked','ahead','diverged','detached','no-upstream','installer-fails']:
 p=root/case;subprocess.run(['git','clone','-q',str(origin),str(p)],check=True)
 if case in ['fast-forward','diverged','installer-fails']:
  (origin/'change').write_text(case);git(origin,'add','.');git(origin,'commit','-m',case)
 if case in ['ahead','diverged']:
  (p/'local').write_text('local');git(p,'add','.');git(p,'commit','-m','local fixture')
 if case=='dirty':(p/'scripts/update.sh').write_text((p/'scripts/update.sh').read_text()+'\n# local\n')
 if case=='untracked':(p/'user-notes').write_text('untouched')
 if case=='detached':git(p,'checkout','--detach')
 if case=='no-upstream':git(p,'branch','--unset-upstream')
 receipt=root/(case+'.receipt');e=dict(os.environ,PROBE_RECEIPT=str(receipt),PROBE_INSTALL_EXIT='17' if case=='installer-fails' else '0')
 r=subprocess.run(['bash',str(p/'scripts/update.sh')],env=e,text=True,capture_output=True)
 results.append({'case':case,'exit':r.returncode,'installer_called':receipt.exists(),'output':r.stdout+r.stderr})
print(json.dumps(results,indent=2));(R/'fsr-reports/codex-worker-routing/updater-results.json').write_text(json.dumps(results,indent=2))
