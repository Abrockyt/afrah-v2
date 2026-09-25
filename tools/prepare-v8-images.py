from pathlib import Path
from PIL import Image

source = Path(r'C:\Users\abroc\.codex\generated_images\01a0cf46-3486-7f91-b00d-f5e712b7dedd')
target = Path(__file__).resolve().parents[1] / 'public' / 'v8' / 'photos'
target.mkdir(parents=True, exist_ok=True)
images = {
    'architecture': 'exec-8007c2be-e803-4456-a204-d8f7c9bdbe89.png',
    'morning': 'exec-aa7b532a-546e-4733-b92b-0a179afb0efa.png',
    'inside': 'exec-4bb8da0a-59dd-4282-a058-64bd899da77c.png',
    'outside': 'exec-cced8761-d61a-453f-831e-9e6f788fe7f4.png',
    'evening': 'exec-20c3788d-f4ac-490d-892d-3d72fdbfd5ab.png',
}
for name, filename in images.items():
    with Image.open(source / filename) as image:
        image.convert('RGB').save(target / f'{name}.webp', 'WEBP', quality=84, method=6)
    print(target / f'{name}.webp')
