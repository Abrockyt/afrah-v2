"""Official Poly Haven downloads only. Originals stay outside the public bundle."""
import concurrent.futures, hashlib, json, pathlib, requests, shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
RESEARCH = ROOT / 'research/open-source'
ORIGINALS = ROOT / 'assets/source/polyhaven'
RUNTIME = ROOT / 'public/afrah'
tasks = []
manifest = []

def queue(asset, entry, relative, runtime=None):
    target = ORIGINALS / relative
    tasks.append((entry, target, runtime))
    manifest.append({'asset': asset, 'url': entry['url'], 'source': str(target.relative_to(ROOT)), 'runtime': runtime, 'license': 'CC0-1.0', 'bytes': entry.get('size'), 'md5': entry.get('md5')})

for label, asset in [('day','kloofendal_48d_partly_cloudy_puresky'), ('overcast','kloofendal_overcast_puresky'), ('golden','kloppenheim_06_puresky'), ('blue','qwantani_dusk_1'), ('night','dikhololo_night')]:
    data = json.loads((RESEARCH / (asset+'-files.json')).read_text())
    queue(asset, data['hdri']['1k']['hdr'], f'{asset}.hdr', f'env/{label}.hdr')

for label, asset, size in [('stone','beige_wall_001','2k'), ('road','asphalt_02','1k'), ('paving','concrete_pavement','1k'), ('metal','metal_plate','1k')]:
    data = json.loads((RESEARCH / (asset+'-files.json')).read_text())
    for channel, source in [('color','Diffuse'),('normal','nor_gl'),('arm','arm')]:
        queue(asset, data[source][size]['jpg'], f'{asset}/{channel}.jpg', f'textures/{label}-{channel}.jpg')

# The tree is optimized before it can enter public/. Its raw mesh is 95 MB.
for asset in ['tree_small_02','shrub_01']:
    data = json.loads((RESEARCH / (asset+'-files.json')).read_text())['gltf']['1k']['gltf']
    queue(asset, data, f'{asset}/{asset}.gltf')
    for name, entry in data['include'].items(): queue(asset, entry, f'{asset}/{name}')

def download(task):
    entry, target, runtime = task
    target.parent.mkdir(parents=True,exist_ok=True)
    if not target.exists():
        r=requests.get(entry['url'],timeout=180); r.raise_for_status(); target.write_bytes(r.content)
    if entry.get('md5') and hashlib.md5(target.read_bytes()).hexdigest()!=entry['md5']: raise ValueError('Checksum failed: '+str(target))
    if runtime:
        dest=RUNTIME/runtime;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,dest)
    return str(target.relative_to(ROOT))

with concurrent.futures.ThreadPoolExecutor(5) as pool:
    for name in pool.map(download,tasks): print(name,flush=True)
(RESEARCH/'download-manifest.json').write_text(json.dumps(manifest,indent=2))
