# Downloads the approved CC0 shortlist from Poly Haven's official API (https://api.polyhaven.com),
# keeps the originals in research/assets-original/polyhaven/ and writes runtime copies to public/v5/.
# Textures are resized and re-encoded as WebP (no KTX2 encoder is installed on this machine — see
# AFRAH_3D_STACK_FINAL.md). Licence + author for every asset go to assets/v5-asset-manifest.json.
import json, os, urllib.request, io
from PIL import Image

UA = {'User-Agent': 'afrah-asset-pipeline'}
ORIG = 'research/assets-original/polyhaven/'
OUT = 'public/v5/'

HDRIS = {  # environment preset -> (asset id, resolution)
    'day': ('kloofendal_48d_partly_cloudy_puresky', '1k'),
    'overcast': ('overcast_soil_puresky', '1k'),
    'golden': ('belfast_sunset_puresky', '1k'),
    'blue': ('qwantani_dusk_2_puresky', '2k'),
    'night': ('kloppenheim_02_puresky', '2k'),
}
TEXTURES = {  # role -> (asset id, download res, runtime px, maps)
    'stone': ('marble_01', '2k', 2048, ['Diffuse', 'nor_gl', 'Rough']),
    'granite': ('granite_tile', '1k', 1024, ['Diffuse', 'nor_gl', 'Rough']),
    'asphalt': ('asphalt_02', '1k', 1024, ['Diffuse', 'nor_gl', 'Rough']),
    'concrete': ('concrete_floor_02', '1k', 1024, ['Diffuse', 'nor_gl', 'Rough']),
    'paving': ('rectangular_paving', '1k', 1024, ['Diffuse', 'nor_gl', 'Rough']),
    'metal': ('metal_plate', '1k', 1024, ['nor_gl', 'Rough']),
}
MODELS = ['shrub_04', 'shrub_01', 'potted_plant_02']

def get(url, raw=False):
    r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()
    return r if raw else json.loads(r)

def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f: f.write(data)

manifest = {'source': 'Poly Haven (https://polyhaven.com) via official API', 'license': 'CC0 1.0', 'assets': []}

def info(aid):
    i = get(f'https://api.polyhaven.com/info/{aid}')
    return {'id': aid, 'name': i.get('name'), 'authors': list(i.get('authors', {}).keys()), 'license': 'CC0-1.0', 'url': f'https://polyhaven.com/a/{aid}'}

for preset, (aid, res) in HDRIS.items():
    f = get(f'https://api.polyhaven.com/files/{aid}')['hdri'][res]['hdr']
    data = get(f['url'], raw=True)
    save(f'{ORIG}{aid}/{aid}_{res}.hdr', data)
    save(f'{OUT}hdri/{preset}.hdr', data)
    manifest['assets'].append({**info(aid), 'type': 'hdri', 'role': preset, 'file': f'{OUT}hdri/{preset}.hdr', 'bytes': len(data)})
    print('hdri', preset, aid, len(data) // 1024, 'KB')

for role, (aid, res, px, maps) in TEXTURES.items():
    files = get(f'https://api.polyhaven.com/files/{aid}')
    rec = {**info(aid), 'type': 'texture', 'role': role, 'files': {}}
    for m in maps:
        f = files[m][res]['jpg']
        data = get(f['url'], raw=True)
        save(f'{ORIG}{aid}/{aid}_{m}_{res}.jpg', data)
        im = Image.open(io.BytesIO(data)).convert('RGB')
        if im.width > px: im = im.resize((px, px), Image.LANCZOS)
        out = f'{OUT}tex/{role}_{m.lower().replace("_gl", "")}.webp'
        os.makedirs(os.path.dirname(out), exist_ok=True)
        im.save(out, 'WEBP', quality=88 if m == 'Diffuse' else 92)
        rec['files'][m] = {'file': out, 'bytes': os.path.getsize(out)}
    manifest['assets'].append(rec)
    print('texture', role, aid, {k: v['bytes'] // 1024 for k, v in rec['files'].items()})

for aid in MODELS:
    g = get(f'https://api.polyhaven.com/files/{aid}')['gltf']['1k']['gltf']
    base = f'{ORIG}{aid}/'
    save(base + f'{aid}.gltf', get(g['url'], raw=True))
    total = 0
    for rel, inc in g.get('include', {}).items():
        d = get(inc['url'], raw=True); total += len(d); save(base + rel, d)
    manifest['assets'].append({**info(aid), 'type': 'model', 'original': base, 'bytes': total})
    print('model', aid, total // 1024, 'KB')

save('assets/v5-asset-manifest.json', json.dumps(manifest, indent=1).encode())
