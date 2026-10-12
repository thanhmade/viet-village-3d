from pathlib import Path
import json, numpy as np, pyproj
from shapely.geometry import Polygon, Point

OUT=Path(__file__).resolve().parent
raw=json.loads((OUT/'data/ranh-gioi-34-vung-nguon.json').read_text())
old=json.loads((OUT/'sources/diem-vao-map-ban-dau.json').read_text())
proj=pyproj.Proj(raw['source_projection_proj'])
affine=np.array(raw['projected_meters_to_page_affine_3x2'])
provinces=[]
for u in raw['units']:
    pts=[p for r in u['rings_page_xy'] for p in r]
    poly=max([Polygon(r) for r in u['rings_page_xy']],key=lambda p:p.area)
    c=poly.representative_point()
    path=' '.join('M'+' L'.join(f'{x:.9f},{y:.9f}' for x,y in r)+' Z' for r in u['rings_page_xy'])
    provinces.append({'id':u['id'],'name':u['name_2025'],'path':path,'center':[c.x,c.y],
       'bbox':[min(x for x,y in pts),min(y for x,y in pts),max(x for x,y in pts),max(y for x,y in pts)]})

details={
'thang_long':('Bắc Bộ','Kinh thành','Lý – Trần – Lê','Kinh thành, sân điện và khu dân cư; điểm trung tâm cho cụm Bắc Bộ.','THANG_LONG_4_GOC_THAM_CHIEU.zip'),
'hoa_lu':('Bắc Bộ','Cố đô','Đinh – Tiền Lê','Thung lũng núi đá vôi, cửa thành và bến sông.','HOA_LU_4_GOC_THAM_CHIEU.zip'),
'thanh_nha_ho':('Bắc Trung Bộ','Thành trì','Nhà Hồ','Thành đá, cổng vòm và vùng đồng ruộng ngoài thành.','THANH_NHA_HO_4_GOC_THAM_CHIEU.zip'),
'hue':('Trung Trung Bộ','Kinh thành','Nhà Nguyễn','Cửa cung, sân điện và kinh thành.','DAI_NOI_HUE_4_GOC_THAM_CHIEU.zip'),
'hoi_an':('Trung Trung Bộ','Đô thị – thương cảng','Thế kỷ XVII–XVIII','Phố nhà gỗ và bến thuyền; nhiệm vụ giao thương.','HOI_AN_4_GOC_THAM_CHIEU.zip'),
'my_son':('Trung Trung Bộ','Đền tháp','Champa','Cụm tháp gạch và thung lũng; khám phá kiến trúc Chăm.','MY_SON_4_GOC_THAM_CHIEU.zip'),
}
sites=[]
for s in old['sites']:
    region,kind,period,description,archive=details[s['id']]
    source=s['source']
    if s['id']=='hoa_lu':source='https://whc.unesco.org/en/list/1438/'
    sites.append({'id':s['id'],'name':s['name'],'lat':s['lat'],'lon':s['lon'],'page_xy':s['page_xy'],
       'region':region,'kind':kind,'period':period,'description':description,'status':'reference',
       'archive':archive,'source':source,
       'coordinate_quality':'Điểm định hướng xấp xỉ trên bản đồ tổng; không phải vị trí cổng khảo sát.'})
extra=[
 ('co_loa','Cổ Loa',21.113,105.872,'Bắc Bộ','Thành trì','Ngô thế kỷ X','Thành đất, hào nước và cụm nhà truyền thống.','reference','CO_LOA_4_GOC_THAM_CHIEU.zip','https://dsvh.gov.vn/di-tich-lich-su-kien-truc-nghe-thuat-va-khao-co-co-loa-2958'),
 ('van_don','Vân Đồn',20.900,107.550,'Bắc Bộ','Thương cảng','Thế kỷ XVI–XVII','Cụm thương cảng đảo; bộ ảnh lấy cảm hứng bến Cái Làng.','reference','VAN_DON_4_GOC_THAM_CHIEU.zip','https://dsvh.gov.vn/quan-the-thuong-cang-van-don-tinh-quang-ninh-22179'),
 ('bach_dang','Bạch Đằng',20.938,106.823,'Bắc Bộ','Bến sông','Nhà Trần – 1288','Bến hậu cần, bãi bùn ngập triều và các cụm cọc.','reference','BACH_DANG_4_GOC_THAM_CHIEU.zip','https://dsvh.gov.vn/di-tich-lich-su-bach-dang-2960'),
 ('lam_kinh','Lam Kinh',19.988,105.463,'Bắc Trung Bộ','Cung điện – sơn lăng','Nhà Lê','Cụm điện, sân, cầu và rừng bao quanh.','reference','LAM_KINH_4_GOC_THAM_CHIEU.zip','https://dsvh.gov.vn/di-tich-lich-su-va-kien-truc-nghe-thuat-lam-kinh-2961'),
 ('hoang_de','Thành Hoàng Đế',13.908,109.114,'Nam Trung Bộ','Thành trì','Tây Sơn – 1778–1793','Đề xuất thành đá ong, sân tập và cụm điện; chưa dựng ảnh/scene.','planned',None,'https://dulichquynhon.binhdinh.gov.vn/vi/thanhhoangde'),
 ('gia_dinh','Gia Định',10.780,106.701,'Đông Nam Bộ','Thành – bến sông','1790–1835','Đề xuất thành và bến sông, kho lương, tuyến giao thương Nam Bộ.','planned',None,'https://baotanglichsu.vn/VI/Articles/3096/70886/thanh-co-nam-bo-dau-tich-thanh-gia-djinh.html'),
 ('ha_tien','Hà Tiên',10.384,104.487,'Tây Nam Bộ','Trấn biển','Thế kỷ XVIII','Đề xuất trấn ven biển, bến thuyền và đường qua núi.','planned',None,'https://dsvh.gov.vn/le-gio-lan-thu-281-duc-khai-tran-mac-cuu-1221'),
 ('chau_doc','Châu Đốc – Vĩnh Tế',10.707,105.118,'Tây Nam Bộ','Thủy lộ','Nhà Nguyễn – sau 1824','Đề xuất bến đò, xóm ven kênh và đường ra vùng núi.','planned',None,'https://angiang.gov.vn/vi/boi-canh-lich-su-va-y-nghia-chien-luoc-cua-su-kien-dao-kenh-vinh-te')]
for id,name,lat,lon,region,kind,period,description,status,archive,source in extra:
    xy=(np.r_[proj(lon,lat),1]@affine).tolist()
    sites.append(dict(id=id,name=name,lat=lat,lon=lon,page_xy=xy,region=region,kind=kind,period=period,description=description,status=status,archive=archive,source=source,
      coordinate_quality='Vị trí đại diện vùng do thiết kế ước lượng; nguồn lịch sử không cung cấp tọa độ này; không phải cổng di tích khảo sát.'))
for s in sites:
    point=Point(s['page_xy'])
    s['admin_at_anchor']=[u['name_2025'] for u in raw['units'] if any(Polygon(r).buffer(.1).covers(point) for r in u['rings_page_xy'])]
    s['playable_scene_included']=False
    s['local_maps']=[{'name':s['name']+' – khu trung tâm','type':'main','status':'Đã có bộ ảnh tham chiếu' if s['status']=='reference' else 'Đề xuất'},
      {'name':'Ngoại vi nhận nhiệm vụ và luyện cấp','type':'side','status':'Chưa thiết kế riêng cho địa danh này'}]
data={'title':'VIỆT NAM · HÀNH TRÌNH QUA CÁC MIỀN','version':'2026-10-11',
 'source':raw['source'],'viewBox':[raw['page_viewport_xyxy'][0],raw['page_viewport_xyxy'][1],raw['page_viewport_xyxy'][2]-raw['page_viewport_xyxy'][0],raw['page_viewport_xyxy'][3]-raw['page_viewport_xyxy'][1]],
 'provinces':provinces,'sites':sites,
 'status_labels':{'reference':'Đã có ảnh tham chiếu','planned':'Map đề xuất'},
 'local_hubs':[{'id':'lang_viet','name':'Làng Việt','geographic_anchor':None,'description':'Làng gốc theo ZIP người dùng; chưa gán địa điểm thực.',
    'children':[{'id':'dong_tre','name':'Ngoại ô Làng Việt – Đồng Tre','role':'Nhận nhiệm vụ, luyện cấp đề xuất 1–10','archive':'NGOAI_LANG_DONG_TRE_4_GOC_THAM_CHIEU.zip'}]},
   {'id':'lang_tan_thu','name':'Làng tân thủ','geographic_anchor':None,'description':'Khu hướng dẫn riêng; chưa gán địa điểm thực.','children':[]}],
 'notes':['Địa giới theo nguồn 2025, tra cứu 11/10/2026.','Các thời kỳ là chương lịch sử riêng; không phải một triều đại duy nhất đồng thời.','Phóng to đồng nhất hai chiều; không kéo giãn từng vùng.','Biểu tượng lớn hơn tỷ lệ thực để lựa chọn map.','Không có scene chơi được hoặc dịch chuyển thật trong bản xem thử.']}
(OUT/'data/map-data.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print(json.dumps({'provinces':len(provinces),'sites':len(sites),'anchor_regions':{s['name']:s['admin_at_anchor'] for s in sites}},ensure_ascii=False))
