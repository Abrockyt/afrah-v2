from pathlib import Path
p=Path('src/scene/Landscape.jsx');s=p.read_text().replace('trees.push([x,z,6+rand(i)*4]);',"if(!(edge===3&&Math.abs(x)<13))trees.push([x,z,6+rand(i)*4]);").replace(' trees.push([-14,-4,40.8],[14,-4,40.8]);','');p.write_text(s)
p=Path('src/scene/World.jsx');s=p.read_text().replace("pos=mobile?[8,5,37]:[13,6,37]","pos=mobile?[0,5,37]:[10,6,37]");p.write_text(s)
p=Path('vite.config.js');s=p.read_text().replace("manualChunks:{three:","manualChunks:{react:['react','react-dom','scheduler'],three:");p.write_text(s)
