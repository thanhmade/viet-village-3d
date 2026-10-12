#!/usr/bin/env python3
"""Style official Vietnam map paths without changing their geometry.

Paint gradients and paper/sea marks are decorative cartography, not DEM or
bathymetry. All original path commands, transforms, clipping geometry and
island/reef symbols are retained exactly. No added borders or maritime lines.
"""
from pathlib import Path
from lxml import etree as E
import copy, hashlib, json, argparse
import cairosvg
from PIL import Image

HERE=Path(__file__).resolve().parent
SOURCE=HERE/'sources'/'official-base.svg'
S='http://www.w3.org/2000/svg'; N='{'+S+'}'
I='{http://www.inkscape.org/namespaces/inkscape}'
XL='{http://www.w3.org/1999/xlink}'
BASE=None
VX=VY=VW=VH=None
GEOM_KEYS=('d','transform','x','y','cx','cy','r','rx','ry','width','height','points',XL+'href','clip-path','fill-rule')
def sig(e):
    return [e.tag,[[k,e.get(k)] for k in GEOM_KEYS if e.get(k) is not None]]
ORIGINAL=None
def node(tag,attrs=None,parent=None):
    out=E.Element(N+tag,{k:str(v) for k,v in (attrs or {}).items()})
    if parent is not None:parent.append(out)
    return out
def mix(c,t,f):
    a=tuple(int(c[i:i+2],16) for i in (1,3,5)); b=tuple(int(t[i:i+2],16) for i in (1,3,5))
    return '#'+''.join(f'{round(x*(1-f)+y*f):02x}' for x,y in zip(a,b))
def gradient(defs,id,stops,attrs=None):
    g=node('linearGradient',{'id':id,**(attrs or {})},defs)
    for position,color in stops:node('stop',{'offset':position,'stop-color':color},g)
    return g
def layer(root,label):
    return next(g for g in root.iter(N+'g') if g.get(I+'label')==label)
def paint(root,admin):
    for k,e in enumerate(root.iter()):e.set('data-source-element',str(k))
    defs=root.find(N+'defs')
    gradient(defs,'atlas-ocean',[('0%','#193f49'),('40%','#153b46'),('100%','#092530')],{'x1':'0','y1':'0','x2':'0.92','y2':'1'})
    gradient(defs,'atlas-neighbor',[('0%','#395a52'),('100%','#233f3d')],{'x1':'0','y1':'0','x2':'0.8','y2':'1'})
    # All province paths share the SAME local map coordinate transform.
    ga={'gradientUnits':'userSpaceOnUse','x1':'-160','y1':'280','x2':'-15','y2':'-260'}
    gradient(defs,'atlas-land',[('0%','#8b9a64'),('42%','#779c73'),('78%','#9fa773'),('100%','#c3b984')],ga)
    palette=['#95a477','#83a47e','#b1ae7b','#8fa889','#a2b489','#9da16e','#adc194','#91b399','#b9b28c','#8fa780','#a5b895','#b4be87']
    for j,c in enumerate(palette):gradient(defs,f'atlas-region-{j}',[('0%',mix(c,'#d7c790',.08)),('55%',c),('100%',mix(c,'#d8c38d',.23))],ga)
    pattern=node('pattern',{'id':'atlas-sea-grain','width':'7.7','height':'7.7','patternUnits':'userSpaceOnUse'},defs)
    node('path',{'d':'M1.2 2.1h.42 M4.6 5.6h.6','fill':'none','stroke':'#9bbfba','stroke-width':'.12','opacity':'.12'},pattern)
    # The source full-page background remains the exact original path.
    background=next(e for e in root.iter(N+'path') if e.get('transform')=='matrix(.24,0,0,.24,0,-.000061035159)' and e.get('fill')=='#234f5e')
    background.set('fill','url(#atlas-ocean)')
    sea=node('rect',{'x':VX,'y':VY,'width':VW,'height':VH,'fill':'url(#atlas-sea-grain)','pointer-events':'none','data-decoration':'ocean-grain'})
    background.addnext(sea)
    for e in layer(root,'Vùng lãnh thổ quốc gia trên đất liền lân cận'):
        e.set('fill','url(#atlas-neighbor)')
    for j,e in enumerate(layer(root,'Địa phận đơn vị hành chính trên đất liền')):
        e.set('fill',f'url(#atlas-region-{j%len(palette)})' if admin else 'url(#atlas-land)')
        if not admin:
            # Same-color hairline paint conceals subpixel raster seams between
            # adjacent source polygons, without moving any path vertex.
            e.set('stroke','url(#atlas-land)');e.set('stroke-width','.09')
        e.set('data-admin-index',str(j+1))
    # Keep each original water, island, and coral path. Colors improve visibility.
    for label in ['Mặt nước sông suối lân cận','Mặt nước lân cận','Mặt nước sông suối','Mặt nước']:
        for e in layer(root,label):e.set('fill','#214b50')
    for e in layer(root,'Biển đảo dạng vùng'):
        e.set('fill','#173d46' if e.get('fill')=='#234f5e' else '#42675c')
    for label,color,opacity in [('Đường bờ nước lân cận','#88a394','.42'),('Mạng dòng chảy lân cận','#80a098','.25'),('Mạng dòng chảy','#9bc0b1','.78'),('Đường bờ nước','#ccce9f','.88')]:
        g=layer(root,label);g.set('opacity',opacity)
        for e in g:e.set('stroke',color)
    for label in ['SanHoLanCan','SanHo_Line']:
        g=layer(root,label);g.set('opacity','.94')
        for e in g:e.set('fill','#bfc79c')
    for e in layer(root,'Ranh giới bãi'):e.set('fill','#87bab1')
    for label,opacity in [('Đường biên giới quốc gia trên đất liền lân cận','.24'),('Đường biên giới quốc gia trên đất liền','.94')]:
        g=layer(root,label);g.set('opacity',opacity);g.set('fill','#dacba1')
        for e in g:
            if e.get('stroke'):e.set('stroke','#dacba1')
            if not e.get('fill') or e.get('fill')!='none':e.set('fill','#dacba1')
    g=layer(root,'DuongDiaGioiDonViHanhChinh');g.set('id','administrative-boundaries')
    g.set('opacity','.86' if admin else '0')
    g.set('fill','#e0cca0')
    for e in g:
        if e.get('stroke'):
            e.set('stroke','#e0cca0');e.set('stroke-width','.29')
        elif e.get('fill')!='none':e.set('fill','#e0cca0')
    # Fine double-painted source shoreline, not a new contour or displaced coast.
    coast=layer(root,'Đường bờ nước')
    halo=copy.deepcopy(coast);halo.set('id','shoreline-ink-underlay');halo.set('data-decoration','same-geometry-shore-ink');halo.set('opacity','.5')
    halo.attrib.pop('data-source-element',None)
    for e in halo.iter():
        e.attrib.pop('data-source-element',None)
        if e.get('stroke'):
            e.set('stroke','#244c46');e.set('stroke-width','.65')
    coast.addprevious(halo)
    # Title/description metadata is non-visible. No text element is generated.
    node('title',parent=root).text='Bản đồ Việt Nam — nền atlas game, hình học từ bản đồ hành chính 2025'
    node('desc',parent=root).text='Đổi bảng màu từ SVG nguồn chính thống, giữ nguyên các hình học và phạm vi. Sắc độ chỉ mang tính trang trí, không biểu thị cao độ hoặc độ sâu. Không có nhãn hiển thị.'
    root.set('preserveAspectRatio','xMidYMid meet')
    root.set('data-art-version','1.0')
    return root
def audit(root):
    refs={int(e.get('data-source-element')):sig(e) for e in root.iter() if e.get('data-source-element') is not None}
    # Width/height/viewBox are kept at their exact source values, transforms stay byte-identical.
    assert len(refs)==len(ORIGINAL)
    for i,s in enumerate(ORIGINAL):assert refs[i]==s,(i,s,refs[i])
    assert not list(root.iter(N+'text'))
    return {'source_elements_preserved':len(refs),'source_path_count':len(list(BASE.iter(N+'path'))),'source_use_symbols':len(list(BASE.iter(N+'use'))),'source_geometry_unchanged':True,'visible_text_elements':0,'viewBox':root.get('viewBox'),'administrative_regions':len(layer(root,'Địa phận đơn vị hành chính trên đất liền')),'decorations':'Same-geometry shoreline paint, color gradients and faint ocean-grain marks; no DEM/bathymetry, added boundary or maritime line.'}
def main():
    global SOURCE,BASE,VX,VY,VW,VH,ORIGINAL
    ap=argparse.ArgumentParser();ap.add_argument('--height',type=int,default=6000)
    ap.add_argument('--source',type=Path,default=SOURCE,help='Official-source SVG with original geometry and labeled layers')
    args=ap.parse_args();SOURCE=args.source
    BASE=E.parse(str(SOURCE)).getroot();VX,VY,VW,VH=map(float,BASE.get('viewBox').split())
    ORIGINAL=[sig(e) for e in BASE.iter()]
    reports=[]
    for admin,name in [(False,'01_Viet_Nam_Nen_Khong_Chu'),(True,'02_Viet_Nam_Dia_Gioi_Khong_Chu')]:
        root=paint(copy.deepcopy(BASE),admin); report=audit(root)
        svg=HERE/(name+'.svg'); data=E.tostring(root,xml_declaration=True,encoding='utf-8');svg.write_bytes(data)
        # Setting output_height only uses a uniform scale. CairoSVG derives width.
        png=HERE/(name+'.png');cairosvg.svg2png(bytestring=data,write_to=str(png),output_height=args.height)
        with Image.open(png) as im:report['png_size']=list(im.size);im.verify()
        report['svg_sha256']=hashlib.sha256(data).hexdigest();report['files']=[svg.name,png.name];reports.append(report)
    (HERE/'art-validation.json').write_text(json.dumps({'source_svg_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'outputs':reports},ensure_ascii=False,indent=2))
    print(json.dumps(reports,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
