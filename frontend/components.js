// =====================================================================
// components.js — UI component dùng chung (hiện tại: header + khung toast).
// Trước đây cùng một khối header bị COPY vào 5 file HTML; giờ chỉ viết một lần ở đây.
//
// Cách dùng (đặt TRƯỚC scripts.js, vì scripts.js cần các phần tử này đã có trong DOM):
//   <div id="site-header" data-active="home" data-search="true" data-admin-tools="true"></div>
//   <script src="frontend/components.js"></script>
//
//   data-active       : home | sold | topup | history  (mục menu đang chọn)
//   data-search       : "true" => hiện thanh tìm kiếm + sắp xếp (chỉ trang chủ)
//   data-admin-tools  : "true" => menu admin có Thêm/Nhập CSV/Quản lý người dùng (chỉ trang chủ có modal tương ứng)
//
// Mọi chuỗi chèn vào HTML ở đây là hằng số của mình (không có dữ liệu người dùng) nên không có rủi ro XSS.
// =====================================================================
(function () {
  const root = document.getElementById("site-header");
  if (!root) return;

  const inFrontend = window.location.pathname.includes("/frontend/");
  const toFrontend = (file) => (inFrontend ? file : `frontend/${file}`);
  const homeHref = inFrontend ? "../index.html" : "index.html";

  const LOGO = "https://res.cloudinary.com/zv0jlmxj/image/upload/v1788875838/ChatGPT_Image_20_55_41_8_thg_9_2026.png";
  const AVATAR = "https://res.cloudinary.com/zv0jlmxj/image/upload/v1787241826/96477251-8c82-4f3f-a032-8719e420fb94.png";

  const NAV = [
    { key: "home", label: "Trang chủ", href: homeHref },
    { key: "sold", label: "Danh sách acc bay", href: toFrontend("danhsachaccban.html") },
    { key: "topup", label: "Nạp tiền", href: toFrontend("naptien.html") },
    { key: "history", label: "Lịch sử mua nick", href: toFrontend("lichsumuanick.html") },
    { key: "guide", label: "Bài viết hướng dẫn", href: toFrontend("baiviet.html") },
    { key: "contact", label: "Thông tin liên hệ", href: toFrontend("lienhe.html") },
  ];

  const active = root.dataset.active || "";
  const withSearch = root.dataset.search === "true";
  const withAdminTools = root.dataset.adminTools === "true";

  const sortOptions = `
    <option value="">Mới nhất</option>
    <option value="price_asc">Giá tăng dần</option>
    <option value="price_desc">Giá giảm dần</option>`;

  const navHTML = NAV.map((item) =>
    `<a href="${item.href}" class="nav-item${item.key === active ? " active" : ""}"${item.key === active ? ' aria-current="page"' : ""}>${item.label}</a>`
  ).join("");

  const adminItems = withAdminTools ? `
    <button type="button" id="add-acc-btn" class="admin-menu-item admin-only-menu-item">➕ Thêm acc mới</button>
    <button type="button" id="import-acc-btn" class="admin-menu-item admin-only-menu-item">📄 Nhập acc từ CSV</button>
    <button type="button" id="manage-users-btn" class="admin-menu-item admin-only-menu-item">👤 Quản lý người dùng</button>` : "";

  const searchBar = withSearch ? `
    <div class="flex items-center justify-between gap-7 bg-bg/65 px-12 py-3.5 max-lg:px-6 max-lg:py-3 max-md:flex-col max-md:gap-3 max-md:px-4 max-md:py-2.5">
      <a href="${homeHref}" class="flex shrink-0 items-center max-md:hidden" aria-label="Trang chủ">
        <img class="aspect-[2170/725] h-16 w-auto max-w-[260px] rounded-xl object-cover drop-shadow-[0_0_10px_rgba(245,158,11,.45)] transition duration-200 hover:scale-105 hover:drop-shadow-[0_0_16px_rgba(245,158,11,.7)]" src="${LOGO}" alt="Shop Acc Liqi">
      </a>
      <div class="search-box">
        <span class="search-icon" aria-hidden="true">🔍</span>
        <input id="search" type="text" placeholder="Nhập tên tướng hoặc skin, vật phẩm hoặc giá tiền..." autocomplete="off" aria-label="Tìm kiếm acc">
        <div id="search-hints" class="search-hints hidden">
          <div class="search-hint-group">
            <span class="search-hint-label">🎮 Tìm theo skin</span>
            <p class="search-hint-desc">Nhập tên skin, ví dụ: <em>Murad siêu việt</em></p>
          </div>
          <div class="search-hint-group">
            <span class="search-hint-label">💰 Tìm theo giá tiền</span>
            <p class="search-hint-desc">Nhập giá tiền, ví dụ: <em>1x(10k-19k) 1xx(100-199k)</em></p>
          </div>
        </div>
      </div>
      <div class="sort-box max-md:hidden">
        <select id="sort-select" aria-label="Sắp xếp">${sortOptions}</select>
      </div>
    </div>` : "";

  const sortMobile = withSearch ? `
    <div class="sort-box absolute left-[33%] top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2 md:hidden">
      <select id="sort-select-mobile" aria-label="Sắp xếp">${sortOptions}</select>
    </div>` : "";

  root.outerHTML = `
  <div id="toast-container" aria-live="polite"></div>
  <header class="sticky top-0 z-[100] border-b border-white/10 bg-bg/90 shadow-[0_4px_28px_rgba(0,0,0,.6)] backdrop-blur-lg">
    <div class="relative flex items-center justify-between border-b border-white/5 bg-[rgba(8,11,18,.95)] px-12 py-2.5 max-lg:px-6 max-md:min-h-[58px] max-md:px-4">
      <button type="button" id="mobile-menu-btn" class="mobile-menu-btn" aria-label="Mở menu điều hướng" aria-expanded="false" aria-controls="main-nav">
        <span></span><span></span><span></span>
      </button>
      ${sortMobile}
      <nav id="main-nav" class="nav-links" aria-label="Điều hướng chính">${navHTML}</nav>

      <div id="auth-actions" class="flex items-center max-md:absolute max-md:right-4 max-md:top-0 max-md:z-[3] max-md:h-[58px]">
        <button id="login-btn" class="btn btn-secondary max-md:px-4 max-md:py-2 max-md:text-[.82rem]">Đăng Nhập</button>
      </div>

      <div id="user-profile-top" class="user-profile-top hidden">
        <img class="user-avatar" src="${AVATAR}" alt="Avatar">
        <div class="flex flex-col text-[.85rem] leading-tight text-white">
          <span id="user-display" class="user-name"></span>
          <span class="user-balance"><strong id="wallet-balance-display">0đ</strong></span>
        </div>
        <div id="admin-menu-dropdown" class="admin-menu-dropdown hidden">
          ${adminItems}
          <button type="button" id="change-password-btn" class="admin-menu-item profile-menu-item">🔐 Đổi mật khẩu</button>
          <button type="button" id="profile-logout-btn" class="admin-menu-item profile-menu-item profile-logout-item">↪ Đăng xuất</button>
        </div>
      </div>
    </div>
    ${searchBar}
  </header>`;
})();
