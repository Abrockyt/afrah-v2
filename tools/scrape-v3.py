# Study-only scrape of public reference images for the v3 composite build.
import json, os, urllib.request
S='https://silver-pinewood.com/media/cache/'; L='https://likova.space/assets/images/media/landing/'; E='https://era.estate/assets/images/media/landing/'
items={
 'silver/intro.webp':S+'intro_background_xxl/assets/images/media/landing/1.intro/background%40xxxl.webp',
 'silver/desc-small.webp':S+'description_small_xxl/assets/images/media/landing/2.description/image-1%40xxxl.webp',
 'silver/desc-big.webp':S+'description_big_xxl/assets/images/media/landing/2.description/image-2%40xxxl.webp',
 'silver/river-small.webp':S+'bor_small_xxl/assets/images/media/landing/3.bor/image-1%40xxxl.webp',
 'silver/river-big.webp':S+'bor_big_xxl/assets/images/media/landing/3.bor/image-3%40xxxl.webp',
 'silver/movement.webp':S+'sport_background_xxl/assets/images/media/landing/4.nature-of-movement/background%40xxxl.webp',
 **{f'silver/loc-{i}.webp':S+f'location_card_image{1 if i in (1,3) else 2 if i in (2,4) else i}_xxl/assets/images/media/landing/5.location-content/image-{i}%40xxxl.webp' for i in range(1,8)},
 'silver/idle.webp':S+'infrastructure_free_days_xxl/assets/images/media/landing/7.free-days/background%40xxxl.webp',
 'silver/territory.webp':'https://silver-pinewood.com/assets/images/media/landing/8.territory/background@xxl.webp',
 'silver/stone-1.webp':'https://silver-pinewood.com/assets/images/media/landing/8.territory/stone-1@xxl.webp',
 'silver/stone-2.webp':'https://silver-pinewood.com/assets/images/media/landing/8.territory/stone-2@xxl.webp',
 'silver/stone-3.webp':'https://silver-pinewood.com/assets/images/media/landing/8.territory/stone-3@xxl.webp',
 'silver/court.webp':S+'territory_image_xxl/uploads/image_1754649169.webp',
 **{f'silver/court-{i}.webp':S+'territory_gallery_image_xxl/uploads/'+n for i,n in enumerate(['image1_1754652307.webp','image2_1754652499.webp','image4_1754652636.webp','image5_1754652713.webp','r5_1736966945.webp','r6_1736967150.webp'],1)},
 'silver/taste.webp':S+'territory_life_background_xxl/assets/images/media/landing/10.life-with-taste/background%40xxxl.webp',
 **{f'silver/time-{i}.webp':S+f'territory_time_image{i}_xxl/assets/images/media/landing/11.good-time/image-{i}%40xxxl.webp' for i in range(1,5)},
 'silver/arch-intro.webp':S+'architecture_intro_background_xxl/assets/images/media/landing/12.architecture-intro/background%40xxxl.webp',
 'silver/arch-top.webp':S+'architecture_top_xxl/assets/images/media/landing/12.architecture/top%40xxxl.webp',
 'silver/terraces.webp':S+'architecture_terrace_xxl/assets/images/media/landing/12.architecture/terraces%40xxxl.webp',
 **{f'silver/gallery-{i}.webp':S+f'architecture_gallery_image_xxl/assets/images/media/landing/13.gallery/image-{i}%40xxxl.webp' for i in range(1,6)},
 'silver/lobby-top.webp':S+'lobby_top_xxl/assets/images/media/landing/15.space/top%40xxxl.webp',
 'silver/lobby-mid.webp':S+'lobby_middle_xxl/assets/images/media/landing/15.space/middle%40xxxl.webp',
 'silver/lobby-bottom.webp':S+'lobby_bottom_xxl/assets/images/media/landing/15.space/bottom%40xxxl.webp',
 'silver/lobby-space.webp':S+'lobby_space_xxl/uploads/slide1_1754653023.webp',
 **{f'silver/solution-{i}.webp':S+f'solution_image_card_xxl/assets/images/media/landing/17.solutions/image-{i}%40xxxl.webp' for i in range(1,9)},
 'likova/cube.webp':L+'2.idea/cube@xxl.webp','likova/idea-1.webp':L+'2.idea/image-1@xxl.webp','likova/idea-2.webp':L+'2.idea/image-2@xxl.webp',
 'likova/location.webp':L+'4.location/intro@xxl.webp',**{f'likova/loc-slide-{i}.webp':L+f'4.location/slider-{i}@xxl.webp' for i in range(1,4)},
 'likova/access.webp':L+'5.accessibility/background@xxl.webp',
 **{f'likova/env-bg-{i}.webp':L+f'6.environment/background-{i}@xxl.webp' for i in range(1,4)},
 **{f'likova/env-{i}.webp':L+f'6.environment/image-{i}@xxl.webp' for i in range(1,4)},
 'likova/plan.webp':L+'7.general-plan/image@xxl.webp','likova/arch.webp':L+'8.architecture/intro@xxl.webp','likova/arch-slide.webp':L+'8.architecture/slider-1@xxl.webp',
 'likova/lobby.webp':L+'9.lobby/intro@xxl.webp','likova/lobby-image.webp':L+'9.lobby/image@xxl.webp',**{f'likova/lobby-slide-{i}.webp':L+f'9.lobby/slider-{i}@xxl.webp' for i in range(1,4)},
 'likova/offices.webp':L+'10.offices/intro@xxl.webp','likova/engineering.webp':L+'12.engineering/intro@xxl.webp',
 'likova/infra.webp':L+'13.infrastructure/intro@xxl.webp',**{f'likova/infra-{i}.webp':L+f'13.infrastructure/content-{i}@xxl.webp' for i in range(1,4)},
 'era/new-era.webp':E+'new-era/background@xxl.webp','era/art-deco.webp':E+'art-deco/image-1@xxl.webp','era/arch-bg.webp':E+'architecture/architecture_bg@xxl.webp',
 'era/arch-building.webp':E+'architecture/architecture_building@xxl.webp','era/arch-2.webp':E+'architecture/image-2@xxl.webp','era/arch-4.webp':E+'architecture/image-4@xxl.webp',
 'era/joy-1.webp':E+'joy/image-1@xxl.webp','era/joy-2.webp':E+'joy/image-2@xxl.webp',**{f'era/joy-c{i}.webp':E+f'joy/carousel/image-{i}@xxl.webp' for i in (1,3,4,5,6)},
 'era/labirint.webp':E+'touch/labirint@xxl.webp','era/touch.webp':E+'touch/touch@xxxl.webp','era/ceilings.webp':E+'touch/ceilings@xxl.webp',
 'era/int-deco.webp':E+'interiors/deco@xxl.webp',**{f'era/int-{i}.webp':E+f'interiors/image-{i}@xxl.webp' for i in range(1,6)},
 'era/apart-bg.webp':E+'apartments/background@xxl.webp','era/apart-buildings.webp':E+'apartments/buildings@xxl.webp',
}
out='public/v3';ok={};bad=[]
for k,u in items.items():
  p=os.path.join(out,k);os.makedirs(os.path.dirname(p),exist_ok=True)
  if os.path.exists(p) and os.path.getsize(p)>2000: ok[k]=u;continue
  try:
    r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=40);data=r.read()
    if len(data)<2000: raise Exception('tiny')
    open(p,'wb').write(data);ok[k]=u
  except Exception as e: bad.append((k,str(e)))
json.dump({'purpose':'Temporary local study copies requested by the user. No publication rights established.','files':ok},open('assets/v3-scrape-manifest.json','w'),indent=1)
print(len(ok),'ok');print(bad)
