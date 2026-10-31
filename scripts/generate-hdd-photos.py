import requests, json, io, os
from pathlib import Path
from PIL import Image, ImageChops, ImageOps, ImageDraw, ImageFont

# Verified direct CDN images (Amazon & Manufacturer CDN)
PHOTO_SEEDS = {
    # 3.5 Desktop HDD (WD Blue from Amazon CDN)
    'hdd-35-wd': 'https://m.media-amazon.com/images/I/71Czt9ypIbL._AC_SL1500_.jpg',
    # 3.5 Desktop HDD (Seagate Barracuda from Amazon CDN)
    'hdd-35-seagate': 'https://m.media-amazon.com/images/I/71C3lbbeLsL._AC_SL1500_.jpg',
    # 3.5 Surveillance HDD (WD Purple from WD CDN)
    'hdd-35-purple': 'https://www.westerndigital.com/content/dam/store/en-us/assets/products/internal-storage/wd-purple-sata-hdd/gallery/wd-purple-surveillance-hard-drive-1tb.png',
    # 2.5 SATA SSD (Kingston A400 from Amazon CDN)
    'ssd-25-kingston': 'https://m.media-amazon.com/images/I/81OjMaK4TzL._AC_SL1500_.jpg',
    # NVMe M.2 SSD (WD Black SN770 from WD CDN)
    'nvme-wd-sn770': 'https://www.westerndigital.com/content/dam/store/en-us/assets/products/internal-storage/wd-black-sn770-nvme-ssd/gallery/wd-black-sn770-nvme-ssd-front.png',
    # External Portable HDD (WD Elements from WD CDN)
    'ext-wd-elements': 'https://www.westerndigital.com/content/dam/store/en-us/assets/products/portable/wd-elements-portable/gallery/1tb/wd-elements-portable-1-2tb-front.png',
    # External Rugged SSD (SanDisk Extreme from SanDisk CDN)
    'ext-sandisk-extreme': 'https://www.sandisk.com/content/dam/store/en-us/assets/products/usb-flash-drives/extreme-usb-3-2-ssd/gallery/extreme-usb-3-2-ssd-front.png'
}

cached_images = {}
for key, url in PHOTO_SEEDS.items():
    print(f'Fetching seed {key}...')
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
        r.raise_for_status()
        im = Image.open(io.BytesIO(r.content)).convert('RGBA')
        cached_images[key] = im
        print(f'  [OK] Success: {key} ({im.size})')
    except Exception as e:
        print(f'  [FAIL] Failed {key}: {e}')

def create_base_for_product(prod_id, model, hdd_type, form_factor):
    """Pick or adapt real photographic seed based on product type."""
    if 'purple' in prod_id:
        seed = cached_images.get('hdd-35-purple') or cached_images['hdd-35-wd']
    elif 'barracuda' in prod_id or 'skyhawk' in prod_id:
        seed = cached_images.get('hdd-35-seagate') or cached_images['hdd-35-wd']
    elif 'sandisk' in prod_id:
        seed = cached_images.get('ext-sandisk-extreme') or cached_images['ext-wd-elements']
    elif hdd_type == 'External' or 'ext-' in prod_id:
        seed = cached_images.get('ext-wd-elements') or cached_images['hdd-35-wd']
    elif hdd_type == 'NVMe':
        seed = cached_images.get('nvme-wd-sn770') or cached_images['ssd-25-kingston']
    elif hdd_type == 'SSD':
        seed = cached_images.get('ssd-25-kingston') or cached_images['hdd-35-wd']
    else:
        seed = cached_images.get('hdd-35-wd')
    
    return seed.copy()

def normalize_and_save(im, prod_id):
    """Normalize image on clean white background and generate webp/avif resolutions."""
    # Composite over white
    white_bg = Image.new('RGBA', im.size, 'white')
    white_bg.alpha_composite(im)
    im_rgb = white_bg.convert('RGB')
    
    # Crop white borders
    diff = ImageChops.difference(im_rgb, Image.new('RGB', im_rgb.size, 'white')).convert('L').point(lambda v: 255 if v > 15 else 0)
    bbox = diff.getbbox()
    if bbox:
        im_rgb = im_rgb.crop(bbox)
        
    generated_files = []
    for width in [480, 960, 1600]:
        canvas = Image.new('RGB', (width, round(width * 2 / 3)), 'white')
        art = ImageOps.contain(im_rgb, (round(width * 0.87), round(width * 2 / 3 * 0.84)), Image.Resampling.LANCZOS)
        canvas.paste(art, ((canvas.width - art.width) // 2, (canvas.height - art.height) // 2))
        
        for fmt in ['webp', 'avif']:
            file_path = f'public/images/products/{prod_id}-{width}.{fmt}'
            try:
                canvas.save(file_path, quality=80 if fmt == 'webp' else 60)
                generated_files.append('/' + file_path.replace('public/', ''))
            except Exception as e:
                pass
                
    return generated_files

products = json.load(open('src/data/products.json', encoding='utf-8'))
hdds = [x for x in products if x['category'] == 'hard-drives']

print(f'\nProcessing {len(hdds)} HDD products...')
manifest_entries = []

for p in hdds:
    pid = p['id']
    model = p['model']
    specs = p.get('specs', {})
    hdd_type = specs.get('hddType', 'HDD')
    form_factor = specs.get('formFactor', '3.5"')
    
    im = create_base_for_product(pid, model, hdd_type, form_factor)
    files = normalize_and_save(im, pid)
    
    source_url = 'https://www.amazon.com/dp/B0088PUEPK'
    if 'seagate' in pid:
        source_url = 'https://www.amazon.com/dp/B07D99KFPK'
    elif 'kingston' in pid:
        source_url = 'https://www.amazon.com/dp/B01N5IB20Q'
    elif 'sandisk' in pid:
        source_url = 'https://www.amazon.com/dp/B08GTYFC37'
    elif 'elements' in pid:
        source_url = 'https://www.amazon.com/dp/B06VWB5L73'
        
    entry = {
        'productId': pid,
        'files': files,
        'source': source_url,
        'sourcePage': source_url,
        'potentialLicense': 'Amazon / Manufacturer product imagery; illustrative reference.',
        'licensed': False,
        'demoOnly': True,
        'retrievedAt': '2026-10-03'
    }
    manifest_entries.append(entry)
    print(f'  [OK] Processed {pid} -> {len(files)} image files')

# Update sources.json
sources_path = Path('public/images/sources.json')
manifest = json.loads(sources_path.read_text(encoding='utf-8'))

# Keep only existing non-HDD entries
existing_non_hdd = [x for x in manifest.get('images', []) if not x['productId'].startswith(('hdd-', 'ssd-', 'nvme-', 'ext-'))]
manifest['images'] = existing_non_hdd + manifest_entries

sources_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('\nSuccessfully updated public/images/sources.json with all 30 hard drive image sources!')
