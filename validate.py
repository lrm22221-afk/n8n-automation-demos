"""Static checks for the n8n workflow JSON files (run: python3 validate.py).

Checks: valid JSON, required fields, unique node names, every connection points to an
existing node, no orphan nodes, credentials are placeholders only, and no secrets
(API keys / tokens / real Slack webhooks) are committed.
"""
import glob, json, re, sys

SECRET = re.compile(r'(sk-[A-Za-z0-9]{20,}|xox[abp]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}|hooks\.slack\.com/services/(?!YOUR/)[A-Z0-9]+/)')
ok = True
for f in sorted(glob.glob('workflows/*.json')):
    raw = open(f, encoding='utf-8').read()
    errs = []
    try:
        w = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f'FAIL {f}: invalid JSON ({e})'); ok = False; continue
    errs += [f'missing {k}' for k in ('name', 'nodes', 'connections', 'active') if k not in w]
    nodes = w.get('nodes', [])
    names = [n.get('name') for n in nodes]
    if len(names) != len(set(names)):
        errs.append('duplicate node names')
    linked = set()
    for n in nodes:
        errs += [f"{n.get('name')}: missing {k}" for k in ('id', 'name', 'type', 'typeVersion', 'position', 'parameters') if k not in n]
        for ctype, cred in (n.get('credentials') or {}).items():
            if 'placeholder' not in cred.get('name', '').lower():
                errs.append(f"{n['name']}: credential '{ctype}' is not a placeholder")
    for src, c in w.get('connections', {}).items():
        if src not in names:
            errs.append(f'unknown source {src}')
        linked.add(src)
        for out in c.get('main', []):
            for t in out or []:
                linked.add(t['node'])
                if t['node'] not in names:
                    errs.append(f"{src} -> unknown {t['node']}")
    if len(nodes) > 1:
        errs += [f'orphan node {n}' for n in names if n not in linked]
    if SECRET.search(raw):
        errs.append('possible secret committed')
    print(('OK  ' if not errs else 'FAIL') + f' {f} ({len(nodes)} nodes)')
    for e in errs:
        print('   ', e)
    ok &= not errs
sys.exit(0 if ok else 1)
