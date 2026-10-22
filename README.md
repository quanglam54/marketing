# Zeno Report – Web báo cáo Marketing

React + Vite + Tailwind, dữ liệu trên Supabase.

## Cài đặt lần đầu

1. Tạo project tại https://supabase.com (gói Free là đủ).
2. Vào **SQL Editor** và chạy `supabase/migrations/001_init.sql` (tạo bảng, hàm báo cáo, phân quyền).
   - Muốn bắt đầu với dữ liệu trống thì dừng ở đây; người dùng tự thêm nguồn trong màn **Nguồn & mục tiêu**.
   - `supabase/seed.sql` chỉ để chạy thử: 4 nguồn + số liệu tháng 10/2026 từ sheet cũ (tên khách đã ẩn).
3. Tài khoản đăng nhập:
   - Vào **Authentication → Sign In / Providers → Email** và tắt **Confirm email**. Khi đó người dùng bấm "Tạo tài khoản" là vào được ngay, không cần xác nhận qua mail.
   - Sau khi mọi người đã tạo xong tài khoản, tắt **Allow new users to sign up** để người lạ có link cũng không đăng ký được. Mọi tài khoản đều xem được toàn bộ dữ liệu.
   - Hoặc tạo tài khoản thủ công trong **Authentication → Users → Add user**.
4. Vào **Project Settings → API**, copy `Project URL` và `anon public key`:
   ```bash
   cp .env.example .env
   # điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY
   ```
5. Chạy:
   ```bash
   npm install
   npm run dev      # http://localhost:5173
   ```

## Đưa lên mạng (Netlify)

1. Đẩy code lên GitHub.
2. Netlify → **Add new site → Import an existing project → GitHub**, chọn repo này. Build command và thư mục publish đã có sẵn trong `netlify.toml`.
3. Thêm 2 biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` (giống file `.env`), rồi bấm **Deploy**.
4. Supabase → **Authentication → URL Configuration** → điền link Netlify vào **Site URL**.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `supabase/migrations/001_init.sql` | Bảng `sources`, `daily_metrics`, `leads`, `goals` và hàm `report_daily()` |
| `src/lib/report.ts` | Cộng tổng, tính tỷ lệ, chi phí / bước, quy đổi mục tiêu (có test: `npm test`) |
| `src/pages/Dashboard.tsx` | Tổng quan + bộ lọc ngày / nguồn |
| `src/pages/DailyEntry.tsx` | Nhập chi phí, tin nhắn hằng ngày |
| `src/pages/Leads.tsx` | Danh sách lead, thêm / sửa / lọc |
| `src/pages/Settings.tsx` | Thêm nguồn, đặt mục tiêu tháng |

## Thêm nguồn mới

Vào **Nguồn & mục tiêu**, nhập tên nguồn và nhóm kênh rồi bấm **Thêm nguồn**. Không cần sửa code.
