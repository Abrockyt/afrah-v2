"""AB WEB SCRAP — build the reuse-assets library from crawled originals.

python tools/scrap/build_library.py

original/  untouched downloads (crawler output + earlier extractions + CC0 Poly Haven)
working/   editable copies of every 3D model (GLB/GLTF/OBJ) + CC0 textures/HDRIs
approved/  production candidates — only assets whose licence permits commercial reuse (CC0)
rejected/  index of assets that must not ship (proprietary / no licence) — files stay in original/
licenses/  one record per source, reports/ one inspection report per 3D asset, manifest.json
"""
import datetime, json, shutil, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIB = ROOT / 'reuse-assets'
ORIG, WORK, APPR, REJ, LIC, REP = (LIB / d for d in ('original', 'working', 'approved', 'rejected', 'licenses', 'reports'))
TODAY = datetime.date.today().isoformat()
TYPES = ['3d', 'textures', 'hdri', 'shaders', 'images', 'video', 'audio', 'svg', 'code', 'fonts']
for base in (ORIG, WORK, APPR):
    for t in TYPES:
        (base / t).mkdir(parents=True, exist_ok=True)
for d in (REJ, LIC, REP):
    d.mkdir(parents=True, exist_ok=True)

SITES = {
    'era-full': ('https://era.estate/', 'ERA residential complex (developer site)'),
    'composites-full': ('https://www.composites.archi/', 'Composites.archi'),
    'likova-full': ('https://likova.space/', 'Likova'),
    'silver-full': ('https://silver-pinewood.com/', 'Silver Pinewood'),
    'era-3d-map': ('https://era.estate/3d-map', 'ERA residential complex (developer site)'),
}
PROPRIETARY = {
    'license': 'Proprietary — no licence found on the source site (all rights reserved by default)',
    'commercial_use': False, 'modification_allowed': 'local study only', 'attribution_required': True,
}

def copy_tree(src, dst):
    if src.exists() and not dst.exists():
        shutil.copytree(src, dst)

# 1. Earlier extractions into original/ (copy, never move).
copy_tree(ROOT / 'research/era-3d-map', ORIG / '3d/era-3d-map')
for p in (ROOT / 'research/assets-original/polyhaven').glob('*'):
    kind = 'hdri' if 'sky' in p.name or any(p.rglob('*.hdr')) else ('3d' if 'plant' in p.name or 'shrub' in p.name else 'textures')
    copy_tree(p, ORIG / kind / 'polyhaven' / p.name)

def rel(p): return str(p.relative_to(ROOT)).replace('\\', '/')
def size(p): return sum(f.stat().st_size for f in p.rglob('*') if f.is_file()) if p.is_dir() else p.stat().st_size
def human(n): return f'{n / 1e6:.2f} MB' if n > 1e6 else f'{n / 1e3:.0f} KB'

url_of = {}
for site in SITES:
    inv = ROOT / 'research' / site / 'network-assets.json'
    if inv.exists():
        for r in json.loads(inv.read_text(encoding='utf8')):
            if r.get('saved'): url_of[r['saved']] = r['url']

def gltf_inspect(path):
    exe = ROOT / 'node_modules/.bin/gltf-transform.cmd'
    try:
        out = subprocess.run([str(exe), 'inspect', str(path), '--format', 'md'], capture_output=True, text=True, encoding='utf8', errors='replace', timeout=300)
        return out.stdout or out.stderr
    except Exception as e:
        return f'inspect failed: {e}'

def obj_stats(path):
    v = f = l = 0
    for line in path.read_text(errors='ignore').splitlines():
        if line.startswith('v '): v += 1
        elif line.startswith('f '): f += 1
        elif line.startswith('l '): l += 1
    return f'{v} vertices · {f} faces · {l} line segments'

manifest, rejected = [], []
def add(**item):
    item.setdefault('approved_path', '')
    manifest.append(item)

# 2. Reference-site 3D assets → working copies + inspection reports.
PURPOSE = {
    'tunnel': 'Composites rib tunnel / cave (scroll camera passes through)', 'shape': 'Composites hero shape',
    'feather': 'Composites feather element', 'dark': 'Likova building (dark WebGL presentation)', 'model': 'Silver Pinewood Zeus sculpture',
    'city': 'ERA loader line-drawing city', 'rays': 'ERA loader light rays', 'Era_100': 'ERA 3D district map (tower + city + terrain)',
}
for site, (src, owner) in SITES.items():
    base = ORIG / '3d' / site
    if not base.exists(): continue
    for p in [p for p in base.rglob('*') if p.suffix.lower() in ('.glb', '.gltf', '.obj')]:
        name = p.stem.split('.')[0]
        wdir = WORK / '3d' / site
        wdir.mkdir(parents=True, exist_ok=True)
        if p.suffix == '.gltf':  # keep .gltf with its .bin / textures
            wpath = wdir / (p.parent.name if p.parent != base else name)
            if not wpath.exists(): shutil.copytree(p.parent, wpath)
            wfile = wpath / p.name
        else:
            wfile = wdir / (name + p.suffix)
            if not wfile.exists(): shutil.copy2(p, wfile)
        stats = obj_stats(p) if p.suffix == '.obj' else gltf_inspect(p)
        (REP / f'{site}__{name}.md').write_text(
            f'# {name}\n\nSOURCE: {url_of.get(rel(p), src)}\nORIGINAL: {rel(p)}\nWORKING: {rel(wfile)}\nFILE SIZE: {human(size(p))}\n'
            f'LICENCE: {PROPRIETARY["license"]}\nSTATUS: study only — do not ship\n\n## Inspection\n\n{stats}\n', encoding='utf8')
        in_proto = site == 'era-3d-map'
        add(id=f'{site}:{name}', name=name, type='3d', source_url=url_of.get(rel(p), src), source_site=src, creator=owner, **PROPRIETARY,
            original_path=rel(p), working_path=rel(wfile), status='working' if in_proto else 'original', file_size=human(size(p)),
            polycount=stats if p.suffix == '.obj' else f'see reports/{site}__{name}.md', texture_resolution=f'see reports/{site}__{name}.md',
            purpose=next((v for k, v in PURPOSE.items() if name.startswith(k)), 'reference 3D asset'),
            notes=('Used in the LOCAL study prototype only (public/v4/era-map/*.glb is derived from it). Must be replaced by an original or licensed '
                   'tower and district before any public launch.' if in_proto else 'Study reference. Rebuild an original equivalent; see AFRAH_REUSE_PLAN.md.'))
        rejected.append((f'{site}:{name}', 'licence (proprietary, no reuse permission)'))

# 3. Other captured media → one manifest entry per site/type (files stay in original/).
for t in ('images', 'video', 'audio', 'svg', 'fonts', 'code'):
    for site, (src, owner) in SITES.items():
        base = ORIG / t / site
        files = [p for p in base.rglob('*') if p.is_file()] if base.exists() else []
        if not files: continue
        add(id=f'{site}:{t}', name=f'{site} {t} ({len(files)} files)', type=t, source_url=src, source_site=src, creator=owner, **PROPRIETARY,
            original_path=rel(base), working_path='', status='original', file_size=human(sum(f.stat().st_size for f in files)), polycount='',
            texture_resolution='', purpose=f'{t} captured while crawling {src}',
            notes='Commercial typefaces — the site uses the OFL alternatives Playfair Display and Inter.' if t == 'fonts' else 'Study reference only.')
        rejected.append((f'{site}:{t}', 'licence (proprietary, no reuse permission)'))

# 4. CC0 Poly Haven → working + approved.
for kind in ('hdri', 'textures', '3d'):
    src_dir = ORIG / kind / 'polyhaven'
    for p in sorted(src_dir.glob('*')) if src_dir.exists() else []:
        w = WORK / kind / 'polyhaven' / p.name; a = APPR / kind / 'polyhaven' / p.name
        copy_tree(p, w); copy_tree(p, a)
        (LIC / f'polyhaven__{p.name}.md').write_text(
            f'ASSET: {p.name}\nCREATOR: Poly Haven contributors\nSOURCE: https://polyhaven.com/a/{p.name} (official API, tools/fetch-polyhaven.py)\n'
            f'LICENSE: CC0 1.0\nLICENSE URL: https://polyhaven.com/license\nCOMMERCIAL USE: yes\nMODIFICATION: yes\nATTRIBUTION: not required (credited in README)\n'
            f'DOWNLOAD DATE: see assets/v5-asset-manifest.json\nNOTES: optimised copies in public/v5/.\n', encoding='utf8')
        add(id=f'polyhaven:{p.name}', name=p.name, type=kind, source_url=f'https://polyhaven.com/a/{p.name}', source_site='https://polyhaven.com',
            creator='Poly Haven', license='CC0 1.0', commercial_use=True, modification_allowed=True, attribution_required=False,
            original_path=rel(p), working_path=rel(w), approved_path=rel(a), status='approved', file_size=human(size(p)), polycount='',
            texture_resolution='2k' if kind != '3d' else 'see files', purpose={'hdri': 'sky / environment lighting', 'textures': 'PBR material', '3d': 'vegetation'}[kind],
            notes='Approved for AFRAH production.')

# 5. Licence record per reference site.
for site, (src, owner) in SITES.items():
    (LIC / f'{site}.md').write_text(
        f'ASSET: everything under original/*/{site}/\nCREATOR: {owner}\nSOURCE: {src}\nLICENSE: none published — proprietary, all rights reserved\n'
        f'LICENSE URL: n/a\nCOMMERCIAL USE: no\nMODIFICATION: local study / education only\nATTRIBUTION: required if ever referenced\n'
        f'DOWNLOAD DATE: {TODAY} (crawler: tools/scrap/crawl.mjs)\nNOTES: Captured from publicly served responses for study. Not approved for a '
        f'published build. Replace with original or CC0/MIT assets before launch (see AFRAH_REUSE_PLAN.md).\n', encoding='utf8')

(REJ / 'README.md').write_text('# Rejected for production\n\nFiles stay in `original/` (and `working/` for study). Listed here because their licence does not permit '
                               'reuse in a published AFRAH build.\n\n| asset | reason |\n|---|---|\n' + '\n'.join(f'| {a} | {r} |' for a, r in rejected) + '\n', encoding='utf8')
(LIB / 'manifest.json').write_text(json.dumps(manifest, indent=1, ensure_ascii=False), encoding='utf8')
counts = {}
for m in manifest: counts[m['status']] = counts.get(m['status'], 0) + 1
print('manifest items', len(manifest), counts)
