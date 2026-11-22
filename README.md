# Tạo bài tập về nhà

Web app ghép ảnh từng câu hỏi thành một phiếu bài tập PDF khổ A4. Mọi xử lý chạy ngay trong trình duyệt, không cần server hay tài khoản. Bản nháp tự lưu trong trình duyệt (IndexedDB).

## Tính năng
- Chụp ảnh bằng camera điện thoại, chọn nhiều ảnh, kéo thả hoặc dán ảnh (Ctrl+V)
- Xoay, cắt từng ảnh; kéo ⠿ để đổi thứ tự, các câu tự đánh số (Câu 1, Câu 2… / Bài 1… / 1, 2…)
- Tiêu đề: tên bài, môn, lớp, ngày, dòng "Họ và tên" cho học sinh
- Tự cắt viền trắng quanh ảnh khi thêm vào (chỉnh lại được bằng nút Cắt)
- Cỡ chữ đồng đều: mọi câu phóng cùng tỷ lệ, câu rộng nhất vừa kín chiều ngang trang (chỉnh bằng "Cỡ câu hỏi")
- Tự xếp nhiều câu lên một trang, chọn chỗ trống làm bài cho từng câu
- Xem trước trực tiếp, Tải PDF, Xem PDF, Chia sẻ (Zalo/Messenger… trên điện thoại)

## Chạy
```bash
npm install
npm run dev            # http://localhost:5173
npm run dev -- --host  # mở trên điện thoại cùng mạng Wi-Fi
npm test               # unit test (chạy từ C:\project\scan_bai, chữ C hoa)
npm run build          # xuất trang tĩnh ra dist/
```

> Nút **Chia sẻ** và việc mở camera ổn định nhất khi chạy trên HTTPS. Khi thử bằng IP mạng LAN (http://192.168…) có thể nút Chia sẻ không hiện; sau khi deploy lên Cloudflare (HTTPS) thì sẽ có.

## Bật quảng cáo (AdSense / Ezoic)

Vị trí quảng cáo: banner đầu trang (728×90, điện thoại 320×100), hai cột lề 160×600 (chỉ hiện khi màn hình ≥ 1440px), và khung 300×250 trong khung trạng thái "Đang xử lý ảnh…" / "Đã tạo xong PDF". Khi chạy `npm run dev` các vị trí chỉ là **khung xám giả**, không tải quảng cáo thật.

1. **Deploy lên tên miền riêng có HTTPS.** AdSense không nhận tên miền con kiểu `*.netlify.app`. Điền các chỗ `[TÊN MIỀN]`, `[EMAIL LIÊN HỆ]`, `[NGÀY CẬP NHẬT]` trong `chinh-sach-bao-mat.html`, `dieu-khoan.html`, `lien-he.html`.
2. Đăng ký AdSense, rồi sao chép `.env.example` thành `.env.production` và điền:
   - `VITE_SITE_URL=https://ten-mien.vn`
   - `VITE_AD_PROVIDER=adsense`
   - `VITE_ADSENSE_CLIENT=ca-pub-…`
   
   Chưa có mã đơn vị quảng cáo thì cứ để trống các `VITE_AD_SLOT_*`. Khi build, `<head>` của mọi trang đã có mã xác minh AdSense, và `dist/ads.txt`, `robots.txt`, `sitemap.xml` được sinh tự động.
3. `npm run build`, deploy, rồi bấm "Yêu cầu xem xét" trong AdSense. Gửi `sitemap.xml` lên Google Search Console.
4. Khi được duyệt: tạo 4 đơn vị **quảng cáo hiển thị hình ảnh, kích thước cố định** (728×90, 160×600, 300×250, 300×250). Điền mã vào `VITE_AD_SLOT_TOP`, `_RAIL`, `_PROCESSING`, `_RESULT`, rồi build và deploy lại.
5. Trong AdSense:
   - Bật **Quyền riêng tư và thông báo → Quy định của châu Âu** (hộp thoại xin đồng ý cookie bắt buộc cho khách EEA/UK).
   - Nếu bật Auto ads, phải **tắt "Quảng cáo neo" (Anchor ads)**, vì nó che thanh nút Tải PDF trên điện thoại.
6. **Không tự bấm vào quảng cáo trên site của mình**, và không nhờ người khác bấm. Đây là lý do khóa tài khoản phổ biến nhất. Muốn xem bố cục trên site thật mà chưa bật quảng cáo, hãy build với `VITE_AD_PREVIEW=1`.

**Chuyển sang Ezoic:**
- Đặt `VITE_AD_PROVIDER=ezoic`.
- Điền số placeholder vào `VITE_EZOIC_ID_*`. Mỗi vị trí cần một số riêng, kể cả hai cột lề.
- Bỏ các biến AdSense. Ezoic tự quản lý `ads.txt` và nguồn quảng cáo của Google, nên không chạy song song thẻ AdSense riêng.
- Nếu Ezoic yêu cầu thêm script quyền riêng tư (CMP) vào `<head>`, chép nguyên văn từ bảng điều khiển của họ vào các file `*.html`.

Code quảng cáo nằm trong `src/ads/`. `parse.ts` đọc cấu hình, `AdSlot.tsx` là một vị trí quảng cáo, và `vite-plugin-site.ts` chèn thẻ vào `<head>` và sinh `ads.txt`, `sitemap.xml`.

## Deploy lên Cloudflare Workers (miễn phí)

Web chỉ gồm file tĩnh nên không cần server. Cloudflare phục vụ file tĩnh miễn phí, cho phép web có quảng cáo, có HTTPS cho tên miền riêng và có máy chủ tại Việt Nam. File `wrangler.jsonc` khai báo thư mục `dist/` cần đưa lên; dự án không có code chạy phía server.

**Cách 1: tự deploy mỗi lần push lên GitHub (nên dùng)**
1. Đẩy code lên một repo GitHub (private).
2. Vào Cloudflare Dashboard → **Workers & Pages** → **Create** → **Import a repository**, rồi chọn repo.
3. Điền màn hình "Set up your application":
   - Project name: `tao-bai-tap` (phải trùng `name` trong `wrangler.jsonc`)
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Non-production branch deploy command: giữ mặc định
   - Advanced settings → Path: `/`
   - Phiên bản Node lấy từ file `.node-version` (22).
4. **Biến môi trường:** vào Advanced settings → **Build variables**, thêm `VITE_SITE_URL=https://ten-mien.vn`. Khi có mã AdSense thì thêm `VITE_AD_PROVIDER`, `VITE_ADSENSE_CLIENT`, `VITE_AD_SLOT_*` (xem `.env.example`). Sau khi tạo dự án, các biến này nằm ở Settings → Build → **Build variables and secrets**.
   
   Đây phải là biến **lúc build**, không phải "Variables and Secrets" lúc chạy, vì các biến `VITE_*` được ghi thẳng vào file khi build. Đổi biến xong phải deploy lại (push code mới hoặc bấm Retry build) thì mới có hiệu lực.
5. Mỗi lần `git push` lên nhánh `main`, Cloudflare tự build và deploy lại.

**Cách 2: upload thẳng từ máy (không cần GitHub)**
```bash
npm run build          # đọc biến từ .env.production
npx wrangler login     # lần đầu
npx wrangler deploy
```

**Chạy thử giống hệt trên Cloudflare:** `npm run build && npx wrangler dev`, rồi mở http://localhost:8787.

**Gắn tên miền:** vào Worker `tao-bai-tap` → **Settings** → **Domains & Routes** → **Add** → **Custom domain**. Tên miền mua ở Cloudflare thì tự cấu hình. Tên miền `.vn` mua ở nơi khác thì trước tiên thêm tên miền vào Cloudflare và trỏ nameserver về Cloudflare. HTTPS tự bật.

**Đường dẫn:** Cloudflare phục vụ `huong-dan.html` ở `/huong-dan` (cấu hình `html_handling` trong `wrangler.jsonc`). Đường dẫn không tồn tại trả về 404. Link nội bộ, `sitemap.xml` và thẻ canonical đều dùng dạng không đuôi `.html` này. Khi chạy dev/preview trên máy, plugin trong `vite-plugin-site.ts` làm điều tương tự. File `public/_headers` cấu hình cache lâu cho `assets/` và `fonts/`.

## Cấu trúc
- `src/lib/layout.ts`: thuật toán xếp câu lên trang A4 (dùng chung cho xem trước và PDF)
- `src/lib/pdf.ts`: dựng PDF bằng pdf-lib + font Be Vietnam Pro (hiển thị đúng dấu tiếng Việt)
- `src/lib/image.ts`: nén ảnh khi thêm (cạnh dài ≤ 2000px), xoay/cắt bằng canvas
- `src/store/worksheet.ts`: state + tự lưu nháp
- `src/components/`: giao diện
