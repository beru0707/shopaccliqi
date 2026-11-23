# Shop Acc Liqi — Frontend

HTML + JS thuần, giao diện bằng **Tailwind CSS v3**. Backend: repo `shopaccliqi_backend`.

## Cấu trúc Module Hóa
```
index.html                    Trang chủ (danh sách acc)
frontend/
  style.css                   File CSS chính (tập hợp @import các module CSS)
  css/                        Module CSS phân tách theo vai trò:
    variables.css             - Design tokens, bảng màu, fonts, bán kính bo góc
    base.css                  - Reset CSS, nền trang, scrollbars, tiện ích
    header.css                - Header 2 tầng, logo banner, menu, tìm kiếm & sắp xếp
    buttons.css               - Tất cả kiểu dáng nút bấm (primary, secondary, gold...)
    cards.css                 - Lưới và thẻ tài khoản gaming, skin tags, skeleton loading
    modals.css                - Hộp thoại popup, forms nhập liệu, CSV import, bảng user
    features.css              - Nạp tiền (wallet), toast, lịch sử mua nick, phân trang
    responsive.css            - Media queries tối ưu cho PC, Tablet, Mobile
  scripts.js                  Logic tổng hợp chạy trên mọi trang
  js/                         Module JS phân tách theo vai trò:
    core.js                   - Khởi tạo DOM chính, trạng thái toàn cục & header scroll
    api.js                    - Hàm apiFetch & hệ thống toast thông báo
    auth.js                   - Đăng nhập, đăng ký, đăng xuất, phiên làm việc & đổi mật khẩu
    accounts.js               - Tải danh sách acc, phân trang, lọc chip, thẻ acc, sort
    auction.js                - Mua ngay & logic đấu giá trực tiếp
    wallet-history.js         - Modal ví tiền, lịch sử mua acc & xem ảnh lightbox
    admin.js                  - Thêm/sửa/xóa acc, nhập CSV & quản lý tài khoản thành viên
    modals.js                 - Xử lý đóng/mở modal chung & sự kiện khởi tạo
  config.js                   API_BASE_URL, GOOGLE_CLIENT_ID
  danhsachaccban.html  lichsumuanick.html  naptien.html  dangnhap.html
```

## Sửa giao diện
```bash
npm install          # lần đầu
npm run watch:css    # vừa sửa vừa build
npm run build:css    # build bản nén trước khi commit (BẮT BUỘC, vì tailwind.css được commit)
```
- Màu / bóng / gradient chỉ khai báo ở `tailwind.config.js` (vd `bg-surface`, `text-gold-light`, `shadow-gold`).
- Bố cục từng trang viết bằng utility trong HTML. Phần lặp lại nhiều (nút, modal, form, thẻ acc…) là component trong `frontend/src/input.css`.
- Class `hidden` / `active` / `mobile-open` / `leaving` là **trạng thái do JS bật tắt**, đừng đổi tên.
- Breakpoint giữ đúng bản cũ: `sm` 481px, `md` 769px, `lg` 993px, `xl` 1201px (`max-md:` = ≤768px).

## Bảo mật phía giao diện
Mọi dữ liệu người dùng chèn vào `innerHTML` đều đi qua `escapeHTML()` / `escapeAttr()`; tên người dùng hiển thị bằng `textContent`.
