"""Structural check of the n8n workflow JSON files (run: python3 validate.py)."""
import json, glob, sys
ok = True
for f in sorted(glob.glob('workflows/*.json')):
    w = json.load(open(f)); names = {n['name'] for n in w['nodes']}
    errs = [k for k in ('name', 'nodes', 'connections') if k not in w]
    for n in w['nodes']:
        for k in ('id', 'name', 'type', 'typeVersion', 'position', 'parameters'):
            if k not in n: errs.append(f"{n.get('name')}: missing {k}")
    for src, c in w['connections'].items():
        if src not in names: errs.append(f'unknown source {src}')
        for out in c['main']:
            for t in out:
                if t['node'] not in names: errs.append(f"{src} -> unknown {t['node']}")
    print(('OK  ' if not errs else 'FAIL') + f' {f} ({len(w["nodes"])} nodes)'); [print('   ', e) for e in errs]; ok &= not errs
sys.exit(0 if ok else 1)
