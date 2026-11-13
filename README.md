# Shop Acc Liqi — Frontend

HTML + JS thuần, giao diện bằng **Tailwind CSS v3**. Backend: repo `shopaccliqi_backend`.

## Cấu trúc
```
index.html                    Trang chủ (danh sách acc)
frontend/
  components.js               Header + khung toast dùng chung (viết 1 lần, mọi trang gọi)
  scripts.js                  Logic trang chủ / đăng nhập / ví / lịch sử / admin
  config.js                   API_BASE_URL, GOOGLE_CLIENT_ID
  src/input.css               NGUỒN Tailwind (base + component)
  tailwind.css                File CSS đã build (commit sẵn, host tĩnh không cần build)
  danhsachaccban.html  lichsumuanick.html  naptien.html  dangnhap.html
tailwind.config.js            Design token: màu, font, bóng, gradient, animation, breakpoint
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
