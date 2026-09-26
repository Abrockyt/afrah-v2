# Fetches the CC0 Poly Haven furniture (1k glTF) that tools/roomgen.js stages into
# the rooms seen through AFRAH's windows. Downloads to tools/ph/ (git-ignored);
# only the rendered room atlases ship (public/media/era3d/rooms-*.webp).
import os
ROOT = os.path.join(os.path.dirname(__file__), 'ph')
import json, os, urllib.request, concurrent.futures as cf
UA={'User-Agent':'afrah-asset-pipeline'}
IDS='''sofa_02 sofa_03 Sofa_01 modern_arm_chair_01 mid_century_lounge_chair ArmChair_01 coffee_table_round_01 modern_coffee_table_01 modern_coffee_table_02 side_table_01 side_table_tall_01 dining_table dining_chair_02 round_wooden_table_01 bar_chair_round_01 potted_plant_01 potted_plant_02 potted_plant_04 pachira_aquatica_01 calathea_orbifolia_01 Chandelier_01 modern_ceiling_lamp_01 desk_lamp_arm_01 throw_pillows_01 decorative_book_set_01 book_encyclopedia_set_01 ceramic_vase_01 ceramic_vase_03 brass_vase_01 fancy_picture_frame_01 hanging_picture_frame_01 hanging_picture_frame_02 standing_picture_frame_01 modern_wooden_cabinet ClassicNightstand_01 wooden_display_shelves_01 television_02 tea_set_01 WoodenTable_01 GreenChair_01 Ottoman_01 caged_hanging_light'''.split()
def get(u, raw=False):
    r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=120).read(); return r if raw else json.loads(r)
def one(i):
    try:
        f=get(f'https://api.polyhaven.com/files/{i}')['gltf']['1k']['gltf']
        os.makedirs(f'{ROOT}/{i}',exist_ok=True)
        open(f'{ROOT}/{i}/{i}.gltf','wb').write(get(f['url'],True))
        for rel,inc in f.get('include',{}).items():
            p=f'{ROOT}/{i}/{rel}'; os.makedirs(os.path.dirname(p),exist_ok=True); open(p,'wb').write(get(inc['url'],True))
        return i,'ok'
    except Exception as e: return i,str(e)
with cf.ThreadPoolExecutor(8) as ex:
    for r in ex.map(one,IDS): print(*r)
