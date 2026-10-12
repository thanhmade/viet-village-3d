/* Open the separate visualizer without loading its controls into the village. */
(() => {
  'use strict';
  function openWeaponsDemo(event) {
    event.stopPropagation();
    if (!window.VietVillageAuth?.isAuthenticated()) return;
    window.VietVillageGame?.clearMotion();
    const url = new URL('./weapons-vfx-demo.html', document.baseURI);
    // Keep this synchronous with the click so browser popup protection permits it.
    // A null result is also normal with noopener, so it is not treated as failure.
    window.open(url.href, '_blank', 'noopener,noreferrer');
  }
  for (const id of ['weaponsDemoBtn', 'homeWeaponsDemoBtn']) {
    document.getElementById(id)?.addEventListener('click', openWeaponsDemo);
  }
})();
