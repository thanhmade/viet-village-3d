/* The atlas selects regions; reference artwork alone never registers a playable map. */
(() => {
  const links = {
    lang_viet: { mapId: 'lang-viet', spawnId: 'village-entry' },
    lang_tan_thu: { mapId: 'lang-tan-thu', spawnId: 'village-entry' },
    dong_tre: { mapId: 'ngoai-lang-dong-tre', spawnId: 'village-entry', referenceRegionId: 'ngoai-lang-dong-tre' },
    thang_long: { mapId: null, spawnId: null, referenceRegionId: 'thang-long' },
    hoa_lu: { mapId: null, spawnId: null, referenceRegionId: 'hoa-lu' },
    thanh_nha_ho: { mapId: null, spawnId: null, referenceRegionId: 'thanh-nha-ho' },
    hue: { mapId: null, spawnId: null, referenceRegionId: 'dai-noi-hue' },
    hoi_an: { mapId: null, spawnId: null, referenceRegionId: 'hoi-an' },
    my_son: { mapId: null, spawnId: null, referenceRegionId: 'my-son' },
    co_loa: { mapId: null, spawnId: null, referenceRegionId: 'co-loa' },
    van_don: { mapId: null, spawnId: null, referenceRegionId: 'van-don' },
    bach_dang: { mapId: null, spawnId: null, referenceRegionId: 'bach-dang' },
    lam_kinh: { mapId: null, spawnId: null, referenceRegionId: 'lam-kinh' },
    hoang_de: { mapId: null, spawnId: null },
    gia_dinh: { mapId: null, spawnId: null },
    ha_tien: { mapId: null, spawnId: null },
    chau_doc: { mapId: null, spawnId: null }
  };
  for (const link of Object.values(links)) Object.freeze(link);
  window.VietVillageAtlasCatalog = Object.freeze({
    kind: 'region-selector',
    viewerPath: '../MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/04_Xem_Ban_Do.html',
    links: Object.freeze(links)
  });
})();
