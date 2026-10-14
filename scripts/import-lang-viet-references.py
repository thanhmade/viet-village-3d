"""Read-only reference import, including CRC-checked recovery of truncated ZIP entries.

Run with Python 3 + Pillow; no package installation or source archive modification.
The report and extracted originals are resumable. Runtime uses only the reduced
comparison images; references are never used as replacement model geometry.
"""
import argparse
import hashlib
import io
import json
import re
import struct
import zipfile
import zlib
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ANGLES = ('front', 'right', 'left', 'back')
SOURCE_DEFAULT = Path(r'H:\CHAT GPT\Chi-tiep-3D-MAP\lang-viet\REFERENCES')
MANIFEST = ROOT / 'DOCUMENTS/LANG-VIET-ASSET-MANIFEST.json'
CACHE = ROOT / '.cache/lang-viet-assets'
THUMBS = ROOT / 'MAP/regions/lang-viet/asset-references'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def relative(path):
    return path.relative_to(ROOT).as_posix()


def safe_name(name):
    path = PurePosixPath(name.replace('\\', '/'))
    if path.is_absolute() or '..' in path.parts or any(':' in p for p in path.parts):
        raise ValueError('Unsafe ZIP entry: ' + name)
    return path


def write_preserving(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes() != content:
        path = path.with_name(path.stem + '-variant-' + digest(content)[:10] + path.suffix)
    if not path.exists():
        path.write_bytes(content)
    return path


def recover_entries(data):
    """Inventory local headers first; recover only complete, verified members.

    Never attempts to repair an archive in place or accept a partial PNG.
    """
    listing, entries, issues = [], [], []
    offset = 0
    while offset + 30 <= len(data) and data[offset:offset + 4] == b'PK\x03\x04':
        fields = struct.unpack_from('<4s5H3I2H', data, offset)
        flags, method, crc, compressed, size, name_len, extra_len = (
            fields[2], fields[3], fields[6], fields[7], fields[8], fields[9], fields[10])
        name_end = offset + 30 + name_len
        name = data[offset + 30:name_end].decode('utf-8' if flags & 0x800 else 'cp437')
        safe_name(name)
        start = name_end + extra_len
        record = {'name': name, 'compressedBytes': compressed, 'bytes': size,
                  'crc32': f'{crc:08x}', 'localHeaderOffset': offset}
        listing.append(record)
        if flags & 1 or flags & 8 or method not in (0, 8) or not compressed:
            issues.append(name + ': missing/incomplete size or unsupported header; not recovered')
            break
        end = start + compressed
        if end > len(data):
            issues.append(name + ': compressed payload truncated; not recovered')
            break
        entries.append((record, start, end, method))
        offset = end
    recovered = []
    for record, start, end, method in entries:
        payload = data[start:end]
        try:
            if method == 8:
                decompressor = zlib.decompressobj(-15)
                content = decompressor.decompress(payload, record['bytes'] + 1)
                if not decompressor.eof or decompressor.unused_data:
                    raise ValueError('incomplete or trailing deflate stream')
            else:
                content = payload
            if len(content) != record['bytes'] or f'{zlib.crc32(content):08x}' != record['crc32']:
                raise ValueError('CRC32 or size mismatch')
            recovered.append((record['name'], content, 'local-header-crc-verified'))
        except Exception as error:
            issues.append(record['name'] + ': ' + str(error))
    return listing, recovered, issues


def archive_entries(path):
    data = path.read_bytes()
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            infos = archive.infolist()
            listing = [{'name': info.filename, 'bytes': info.file_size,
                        'compressedBytes': info.compress_size, 'crc32': f'{info.CRC:08x}'} for info in infos]
            # Validate the complete listing before extracting anything.
            for info in infos:
                safe_name(info.filename)
                if info.file_size > 80 * 1024 * 1024:
                    raise ValueError('Unexpected entry larger than 80 MiB')
            entries = [(info.filename, archive.read(info), 'zip-crc-verified')
                       for info in infos if not info.is_dir()]
        return digest(data), listing, entries, [], 'complete'
    except zipfile.BadZipFile as error:
        listing, entries, issues = recover_entries(data)
        return digest(data), listing, entries, [str(error), *issues], 'damaged-partially-recovered' if entries else 'damaged-unrecoverable'


def image_entry(code, name, data, verification):
    safe = safe_name(name)
    # Preserve verified ZIP members even if their embedded image is damaged.
    # They remain processing data, never runtime model textures.
    original_path = write_preserving(CACHE / 'import' / code / safe.name, data)
    match = re.search(r'_(FRONT|RIGHT|LEFT|BACK)_4K\.(png|jpg|jpeg)$', safe.name, re.I)
    if not match:
        raise ValueError('Unclassified image angle: ' + name)
    angle = match[1].lower()
    with Image.open(io.BytesIO(data)) as image:
        image.verify()
    with Image.open(io.BytesIO(data)) as image:
        image.load()
        dimensions, mode = list(image.size), image.mode
        rgb = Image.new('RGB', image.size, '#e9ece5')
        if image.mode == 'RGBA':
            rgb.paste(image, mask=image.getchannel('A'))
        else:
            rgb.paste(image.convert('RGB'))
        rgb.thumbnail((640, 640), Image.Resampling.LANCZOS)
        preview = io.BytesIO()
        rgb.save(preview, format='JPEG', quality=85, optimize=True)
    thumbnail_path = write_preserving(THUMBS / code / (angle + '.jpg'), preview.getvalue())
    return {'angle': angle, 'originalName': safe.name, 'sourceEntry': name,
            'sha256': digest(data), 'bytes': len(data), 'dimensions': dimensions,
            'mode': mode, 'verification': verification, 'imageReadable': True,
            'extractedPath': relative(original_path), 'comparisonPath': relative(thumbnail_path)}


def contacts(records):
    font_path = Path(r'C:\Windows\Fonts\arial.ttf')
    font = ImageFont.truetype(str(font_path), 22) if font_path.exists() else ImageFont.load_default()
    small = ImageFont.truetype(str(font_path), 17) if font_path.exists() else ImageFont.load_default()
    sheets = []
    for page_start in range(0, len(records), 6):
        subset = records[page_start:page_start + 6]
        canvas = Image.new('RGB', (1440, len(subset) * 340), '#e6e9e4')
        draw = ImageDraw.Draw(canvas)
        for row, record in enumerate(subset):
            y = row * 340
            draw.text((10, y + 5), record['code'] + ' | ' + record['archiveStatus'], fill='#12352b', font=font)
            for col, angle in enumerate(ANGLES):
                found = next((item for item in record['images'] if item['angle'] == angle), None)
                x = col * 360
                draw.text((x + 12, y + 33), angle.upper(), fill='#23352b', font=small)
                if found:
                    with Image.open(ROOT / found['comparisonPath']) as img:
                        fitted = ImageOps.contain(img, (350, 278), Image.Resampling.LANCZOS)
                        canvas.paste(fitted, (x + (360 - fitted.width) // 2, y + 58 + (278 - fitted.height) // 2))
                else:
                    draw.text((x + 25, y + 155), 'MISSING / ARCHIVE DAMAGED', fill='#aa261a', font=small)
        path = CACHE / f'contact-{page_start // 6 + 1:02d}.jpg'
        canvas.save(path, quality=92)
        sheets.append(relative(path))
    return sheets


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=SOURCE_DEFAULT)
    args = parser.parse_args()
    source = args.source.absolute()
    if not source.is_dir():
        raise FileNotFoundError('Reference source is not accessible: ' + str(source))
    old = json.loads(MANIFEST.read_text('utf-8')) if MANIFEST.exists() else {}
    previous = {record['code']: record for record in old.get('assets', [])}
    records = []
    for archive_path in sorted(source.glob('*.zip')):
        code = re.sub(r'_4K$', '', archive_path.stem)
        if not code.startswith('LV_'):
            continue
        sha, listing, entries, issues, archive_status = archive_entries(archive_path)
        record = dict(previous.get(code, {}))
        record.update({'code': code, 'id': code.lower().replace('_', '-'),
                       'sourceZip': archive_path.name, 'zipSha256': sha,
                       'zipBytes': archive_path.stat().st_size, 'archiveStatus': archive_status,
                       'zipListingReadBeforeExtraction': True, 'zipListing': listing,
                       'images': [], 'unreadableImages': [], 'otherResources': [], 'issues': issues,
                       'looseDuplicates': [], 'conflictingAngles': []})
        for name, content, verification in entries:
            if Path(name).suffix.lower() not in ('.png', '.jpg', '.jpeg'):
                record['otherResources'].append({'name': name, 'sha256': digest(content)})
                continue
            try:
                item = image_entry(code, name, content, verification)
                existing = next((i for i in record['images'] if i['angle'] == item['angle']), None)
                if existing and existing['sha256'] != item['sha256']:
                    record['conflictingAngles'].append(item['angle'])
                if not existing or existing['sha256'] != item['sha256']:
                    record['images'].append(item)
            except Exception as error:
                record['issues'].append(name + ': ' + str(error))
                failed_path = write_preserving(CACHE / 'import' / code / safe_name(name).name, content)
                record['unreadableImages'].append({'name': name, 'sha256': digest(content),
                    'bytes': len(content), 'error': str(error),
                    'extractedPath': relative(failed_path)})
        for path in sorted(source.rglob(code + '_*_4K.png')):
            if '.zip' in path.parts:
                continue
            data = path.read_bytes()
            same = next((item for item in record['images'] if item['sha256'] == digest(data)), None)
            if same:
                record['looseDuplicates'].append({'path': path.relative_to(source).as_posix(),
                                                   'matches': same['sourceEntry'], 'sha256': same['sha256']})
            else:
                try:
                    item = image_entry(code, path.name, data, 'loose-image-verified')
                    if any(i['angle'] == item['angle'] for i in record['images']):
                        record['conflictingAngles'].append(item['angle'])
                    record['images'].append(item)
                except Exception as error:
                    record['issues'].append(path.name + ': ' + str(error))
        record['missingAngles'] = [angle for angle in ANGLES if not any(i['angle'] == angle for i in record['images'])]
        record['referenceStatus'] = 'complete-four-views' if not record['missingAngles'] else ('partial-views' if record['images'] else 'no-readable-views')
        record.setdefault('modelStatus', 'not-generated')
        record.setdefault('integrationStatus', 'not-integrated')
        record.setdefault('visualInspection', 'pending')
        records.append(record)
        # A progress checkpoint after each asset makes interrupted runs resumable.
        MANIFEST.parent.mkdir(parents=True, exist_ok=True)
        processed_codes = {item['code'] for item in records}
        checkpoint_records = records + [item for key, item in previous.items() if key not in processed_codes]
        MANIFEST.write_text(json.dumps({**old, 'schemaVersion': 1, 'sourceDirectory': str(source),
            'sourceModified': False, 'generatedAt': datetime.now(timezone.utc).isoformat(),
            'importInProgress': True, 'assets': checkpoint_records}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(code, record['referenceStatus'], len(record['images']), flush=True)
    sheets = contacts(records)
    manifest = json.loads(MANIFEST.read_text('utf-8'))
    manifest['assets'] = records
    manifest['importInProgress'] = False
    manifest['contactSheets'] = sheets
    manifest['summary'] = {'assets': len(records), 'healthyArchives': sum(r['archiveStatus'] == 'complete' for r in records),
                          'readableImages': sum(len(r['images']) for r in records),
                          'unreadableExtractedImages': sum(len(r['unreadableImages']) for r in records),
                          'deduplicatedLooseImages': sum(len(r['looseDuplicates']) for r in records),
                          'completeFourViewAssets': sum(not r['missingAngles'] for r in records),
                          'partialViewAssets': sum(bool(r['images']) and bool(r['missingAngles']) for r in records),
                          'noReadableViews': sum(not r['images'] for r in records)}
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest['summary'], ensure_ascii=False))


if __name__ == '__main__':
    main()
