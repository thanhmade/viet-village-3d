// A classic script deliberately runs even when file:// blocks ES modules.
(function () {
  'use strict';
  const context = document.getElementById('launchContext');
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    context.textContent = 'Bản thử nghiệm CAP-NHAT · ' + location.host;
    return;
  }
  document.getElementById('authGate').setAttribute('aria-busy', 'false');
  document.getElementById('googleLoginBtn').disabled = true;
  document.getElementById('authStatus').textContent = 'Đang mở HTML trực tiếp. Hãy đóng tab này và chạy START-GAME.bat tại thư mục CAP-NHAT; dùng URL localhost mà cửa sổ máy chủ hiển thị để đăng nhập và tải NPC.';
  context.textContent = 'Google Login và mô hình 3D cần HTTP; không dùng file://.';
}());
