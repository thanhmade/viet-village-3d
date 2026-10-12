#!/usr/bin/env python3
"""Add selectable-map symbols, never redraw or move official map geometry."""
from pathlib import Path
from lxml import etree as E
import json, hashlib
import cairosvg
from PIL import Image

HERE=Path(__file__).resolve().parent
N='{http://www.w3.org/2000/svg}'
source=HERE/'02_Viet_Nam_Dia_Gioi_Khong_Chu.svg'
root=E.parse(str(source)).getroot()
original=[E.tostring(e) for e in root]
data=json.loads((HERE/'data/map-data.json').read_text())
group=E.SubElement(root,N+'g',id='map-entry-symbols')
group.set('data-description','Gold circle: existing reference images; hollow diamond: proposed map. Symbols are deliberately larger than geographic scale.')
for s in data['sites']:
    x,y=s['page_xy']
    g=E.SubElement(group,N+'g',id='poi-'+s['id'])
    g.set('transform',f'translate({x:.9f},{y:.9f})')
    if s['status']=='reference':
        E.SubElement(g,N+'circle',cx='0',cy='0',r='1.12',fill='#f5d58a',stroke='#153932',**{'stroke-width':'.36'})
        E.SubElement(g,N+'circle',cx='0',cy='0',r='.28',fill='#305647')
    else:
        E.SubElement(g,N+'path',d='M0 -1.3 L1.3 0 L0 1.3 L-1.3 0 Z',fill='#173b40',stroke='#f5d58a',**{'stroke-width':'.38'})
assert [E.tostring(e) for e in root][:-1]==original
assert not list(root.iter(N+'text'))
out=HERE/'03_Viet_Nam_Diem_Vao_Map_Khong_Chu.svg'
blob=E.tostring(root,encoding='utf-8',xml_declaration=True)
out.write_bytes(blob)
cairosvg.svg2png(bytestring=blob,write_to=str(out.with_suffix('.png')),output_height=6000)
with Image.open(out.with_suffix('.png')) as im:
    size=list(im.size)
    im.verify()
report={'base_svg_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'base_children_unchanged':True,
    'map_entries':len(data['sites']),'reference_entries':sum(s['status']=='reference' for s in data['sites']),
    'planned_entries':sum(s['status']=='planned' for s in data['sites']),'visible_text_elements':0,
    'png_size':size,'marker_note':'Point symbols are symbolic, not area to scale. No routes or new borders added.'}
(HERE/'marker-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
