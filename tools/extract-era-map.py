# Study-only extraction from ERA's public 3D map (research/era-3d-map/Era_100.gltf, downloaded from
# https://era.estate/assets/3d-map/). Writes two GLBs with only the needed geometry:
#   era-building.glb — the ERA tower complex (group1, Zk104, polySurface358, cloud_15 groups)
#   era-city.glb     — the whole district (buildings, ground, river, trees) without clouds/cameras/probes
# Verge3D node-graph materials are replaced by plain PBR materials keeping the original names,
# so the site can re-skin them (black / silver / white) by name.
import json, struct

SRC = 'research/era-3d-map/'
OUT = 'public/v4/era-map/'
g = json.load(open(SRC + 'Era_100.gltf'))
blob = open(SRC + 'Era_100.bin', 'rb').read()
N = g['nodes']

def by_name(name):
    return [i for i, n in enumerate(N) if n.get('name') == name]

BUILDING_ROOTS = by_name('group1') + by_name('Zk104') + by_name('polySurface358') + [i for i in by_name('cloud_15') if N[i].get('children')]
CITY_ROOTS = by_name('geo') + by_name('ODRizomExport_172_Full_4:polySurface1906') + by_name('ODRizomExport_172_Full_4:pPlane10') \
    + BUILDING_ROOTS + by_name('group7')
DROP_MATERIAL = ('Cloud',)

def build(roots, out):
    nodes, meshes, accessors, views, materials = [], [], [], [], []
    mesh_map, acc_map, mat_map = {}, {}, {}
    data = bytearray()

    def material(i):
        if i not in mat_map:
            name = g['materials'][i].get('name', f'm{i}')
            mat_map[i] = len(materials)
            materials.append({'name': name, 'pbrMetallicRoughness': {'baseColorFactor': [.8, .8, .8, 1], 'metallicFactor': 0, 'roughnessFactor': .8}, 'doubleSided': True})
        return mat_map[i]

    def accessor(i):
        if i in acc_map: return acc_map[i]
        a = dict(g['accessors'][i]); v = g['bufferViews'][a['bufferView']]
        comp = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}[a['componentType']]
        ncomp = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
        size = comp * ncomp
        stride = v.get('byteStride', size)
        start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        if stride == size:
            chunk = bytes(blob[start:start + size * a['count']])
        else:
            chunk = b''.join(blob[start + k * stride:start + k * stride + size] for k in range(a['count']))
        while len(data) % 4: data.append(0)
        view = {'buffer': 0, 'byteOffset': len(data), 'byteLength': len(chunk)}
        if v.get('target'): view['target'] = v['target']
        data.extend(chunk)
        views.append(view)
        a['bufferView'] = len(views) - 1; a.pop('byteOffset', None); a.pop('extensions', None)
        acc_map[i] = len(accessors); accessors.append(a)
        return acc_map[i]

    def mesh(i):
        if i in mesh_map: return mesh_map[i]
        prims = []
        for p in g['meshes'][i]['primitives']:
            mname = g['materials'][p['material']].get('name', '') if 'material' in p else ''
            if mname.startswith(DROP_MATERIAL): continue
            q = {'attributes': {k: accessor(v) for k, v in p['attributes'].items() if k in ('POSITION', 'NORMAL', 'TEXCOORD_0', 'TEXCOORD_1')}}
            if 'indices' in p: q['indices'] = accessor(p['indices'])
            if 'material' in p: q['material'] = material(p['material'])
            if 'mode' in p: q['mode'] = p['mode']
            prims.append(q)
        mesh_map[i] = None
        if prims:
            mesh_map[i] = len(meshes); meshes.append({'name': g['meshes'][i].get('name', ''), 'primitives': prims})
        return mesh_map[i]

    def node(i):
        n = N[i]
        if n.get('name', '').startswith(('cloud_', 'Active_cam', 'cam_', 'pasted__v3d')) and not n.get('children'): return None
        out_n = {k: n[k] for k in ('name', 'translation', 'rotation', 'scale', 'matrix') if k in n}
        if 'mesh' in n:
            m = mesh(n['mesh'])
            if m is not None: out_n['mesh'] = m
        kids = [c for c in (node(c) for c in n.get('children', [])) if c is not None]
        if kids: out_n['children'] = kids
        if 'mesh' not in out_n and not kids: return None
        nodes.append(out_n); return len(nodes) - 1

    top = [r for r in (node(r) for r in roots) if r is not None]
    while len(data) % 4: data.append(0)
    doc = {'asset': {'version': '2.0', 'generator': 'afrah extract-era-map.py'}, 'scene': 0, 'scenes': [{'nodes': top}],
           'nodes': nodes, 'meshes': meshes, 'accessors': accessors, 'bufferViews': views, 'materials': materials,
           'buffers': [{'byteLength': len(data)}]}
    js = json.dumps(doc, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(data)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(data), 0x004E4942) + data
    open(out, 'wb').write(glb)
    print(out, f'{len(glb) / 1e6:.1f} MB', len(meshes), 'meshes', [m['name'] for m in materials])

build(BUILDING_ROOTS, OUT + 'era-building.glb')
build(CITY_ROOTS, OUT + 'era-city.glb')
