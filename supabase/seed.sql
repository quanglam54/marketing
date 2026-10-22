-- Dữ liệu mẫu tháng 10/2026 lấy từ Google Sheet cũ (tên khách đã ẩn).
-- Chạy SAU 001_init.sql. Có thể bỏ qua nếu muốn bắt đầu trống.

insert into public.sources (code, name, channel_group, has_cost, sort_order) values
  ('fb_ads', 'Facebook Ads', 'Facebook', true, 10),
  ('fb_organic', 'Facebook Organic', 'Facebook', false, 20),
  ('tiktok_ads', 'TikTok Ads', 'TikTok', true, 30),
  ('tiktok_organic', 'TikTok Organic', 'TikTok', false, 40)
on conflict (code) do nothing;

insert into public.daily_metrics (metric_date, source_id, spend, messages)
select v.d::date, s.id, v.spend, v.msg from (values
  ('2026-10-03', 351540, 0),
  ('2026-10-04', 277918, 0),
  ('2026-10-05', 301255, 0),
  ('2026-10-06', 322440, 0),
  ('2026-10-07', 304697, 0),
  ('2026-10-08', 210168, 0),
  ('2026-10-09', 240348, 0),
  ('2026-10-10', 729328, 0),
  ('2026-10-11', 547058, 0),
  ('2026-10-12', 58690, 0)
) as v(d, spend, msg)
join public.sources s on s.code = 'tiktok_ads'
on conflict (metric_date, source_id) do nothing;

insert into public.leads (lead_date, name, phone, service, source_id, sale, status, reached, consulted)
select v.d::date, v.name, v.phone, v.service, s.id, v.sale, v.status, v.reached, v.consulted from (values
  ('2026-10-01', 'Khách 01', null, null, 'fb_ads', null, 'new', false, false),
  ('2026-10-01', 'Khách 02', null, null, 'fb_ads', null, 'new', false, false),
  ('2026-10-01', 'Khách 03', null, null, 'fb_ads', null, 'new', false, false),
  ('2026-10-01', 'Khách 04', null, null, 'fb_ads', null, 'new', false, false),
  ('2026-10-01', 'Khách 05', null, null, 'fb_ads', null, 'new', false, false),
  ('2026-10-03', 'Khách 06', null, 'Vận hành toàn diện TikTok Shop', 'tiktok_ads', 'Huyền Vân', 'cancelled', false, false),
  ('2026-10-03', 'Khách 07', null, 'Vận hành toàn diện TikTok Shop', 'tiktok_ads', 'Huyền Vân', 'cancelled', false, false),
  ('2026-10-03', 'Khách 08', null, 'Vận hành toàn diện TikTok Shop', 'tiktok_ads', 'Vũ Trang', 'unreachable', false, false),
  ('2026-10-04', 'Khách 09', null, 'Vận hành toàn diện TikTok Shop', 'tiktok_ads', 'Vũ Trang', 'unreachable', false, false),
  ('2026-10-04', 'Khách 10', null, 'Vận hành toàn diện TikTok Shop', 'tiktok_ads', 'Phương Anh', 'no_answer', false, false),
  ('2026-10-04', 'Khách 11', null, 'Vận hành toàn diện TikTok Shop', 'tiktok_ads', 'Phương Anh', 'no_answer', false, false),
  ('2026-10-04', 'Khách 12', null, 'Vận hành toàn diện TikTok Shop', 'tiktok_ads', 'Hồng Nhung', 'consulting', true, true),
  ('2026-10-05', 'Khách 13', null, 'Vận hành toàn diện TikTok Shop', 'tiktok_ads', 'Hồng Nhung', 'no_answer', false, false),
  ('2026-10-05', 'Khách 14', null, 'Vận hành toàn diện TikTok Shop', 'tiktok_ads', 'Hồng Nhung', 'affiliate', false, false),
  ('2026-10-05', 'Khách 15', null, 'Phụ kiện điện thoại', 'tiktok_ads', 'Vũ Trang', 'unreachable', false, false),
  ('2026-10-05', 'Khách 16', null, 'Kinh doanh đồ gỗ thờ', 'tiktok_ads', 'Phương Anh', 'consulting', true, true),
  ('2026-10-05', 'Khách 17', null, 'giay dep', 'tiktok_ads', 'Hồng Nhung', 'affiliate', false, false),
  ('2026-10-05', 'Khách 18', null, 'ko cs', 'tiktok_ads', 'Huyền Vân', 'no_answer', false, false),
  ('2026-10-05', 'Khách 19', null, 'hiện chưa có sản phẩm nào', 'tiktok_ads', 'Vũ Trang', 'no_answer', false, false),
  ('2026-10-06', 'Khách 20', null, 'Các hạt đậu', 'tiktok_ads', 'Phương Anh', 'no_answer', false, false),
  ('2026-10-06', 'Khách 21', null, 'Hàng hóa', 'tiktok_ads', 'Hồng Nhung', 'no_answer', false, false),
  ('2026-10-06', 'Khách 22', null, 'Đồ gia dụng', 'tiktok_ads', 'Huyền Vân', 'unreachable', false, false),
  ('2026-10-06', 'Khách 23', null, 'Quần áo', 'tiktok_ads', 'Huyền Vân', 'cancelled', false, false),
  ('2026-10-06', 'Khách 24', null, 'Kem dưỡng Teashcll,', 'tiktok_ads', 'Vũ Trang', 'affiliate', false, false),
  ('2026-10-06', 'Khách 25', null, 'Sữa hạt dinh dưỡng', 'tiktok_ads', 'Phương Anh', 'unreachable', false, false),
  ('2026-10-06', 'Khách 26', null, 'Đồ gia dụng', 'tiktok_ads', 'Hồng Nhung', 'unreachable', false, false),
  ('2026-10-07', 'Khách 27', null, 'giày dép túi xách', 'tiktok_ads', 'Huyền Vân', 'reference', false, false),
  ('2026-10-07', 'Khách 28', null, 'Nông sản vùng cao', 'tiktok_ads', 'Vũ Trang', 'consulting', true, true),
  ('2026-10-07', 'Khách 29', null, 'tiếp thị liên kết', 'tiktok_ads', 'Phương Anh', 'cancelled', false, false),
  ('2026-10-07', 'Khách 30', null, 'Nhiều loại sản phẩm', 'tiktok_ads', 'Hồng Nhung', 'affiliate', false, false),
  ('2026-10-08', 'Khách 31', null, 'Sạc dự phòng', 'tiktok_ads', 'Huyền Vân', 'cancelled', false, false),
  ('2026-10-08', 'Khách 32', null, 'Ăn vặt', 'tiktok_ads', 'Vũ Trang', 'affiliate', false, false),
  ('2026-10-08', 'Khách 33', null, 'sữa tắm', 'tiktok_ads', 'Phương Anh', 'cancelled', false, false),
  ('2026-10-08', 'Khách 34', null, 'Đồ gia dụng', 'tiktok_ads', 'Hồng Nhung', 'cancelled', false, false),
  ('2026-10-09', 'Khách 35', null, 'Thời trang', 'tiktok_ads', 'Hồng Nhung', 'affiliate', false, false),
  ('2026-10-09', 'Khách 36', null, 'TÔI KINH DOANH ĐỦ LOẠI SẢN PHẨM TRÊN TIK TOK VÌ TIẾP THỊ LIÊN KẾT', 'tiktok_ads', 'Huyền Vân', 'affiliate', false, false),
  ('2026-10-10', 'Khách 37', null, 'quan áo', 'tiktok_ads', 'Huyền Vân', 'consulting', true, true),
  ('2026-10-10', 'Khách 38', null, 'Tiếp thọ liên kết', 'tiktok_ads', 'Vũ Trang', 'affiliate', false, false),
  ('2026-10-10', 'Khách 39', null, 'Đồ gia dụng', 'tiktok_ads', 'Phương Anh', 'consulting', true, true),
  ('2026-10-10', 'Khách 40', null, 'Vận hành tiktok shop', 'tiktok_ads', 'Huyền Vân', 'cancelled', false, false),
  ('2026-10-10', 'Khách 41', null, 'Vận hành tiktok shop', 'tiktok_ads', 'Huyền Vân', 'affiliate', false, false),
  ('2026-10-10', 'Khách 42', null, 'Vận hành tiktok shop', 'tiktok_ads', 'Vũ Trang', 'cancelled', false, false),
  ('2026-10-10', 'Khách 43', null, 'Vận hành tiktok shop', 'tiktok_ads', 'Phương Anh', 'cancelled', false, false),
  ('2026-10-11', 'Khách 44', null, 'Vận hành tiktok shop', 'tiktok_ads', 'Vũ Trang', 'affiliate', false, false),
  ('2026-10-11', 'Khách 45', null, 'Vận hành tiktok shop', 'tiktok_ads', 'Phương Anh', 'cancelled', false, false),
  ('2026-10-11', 'Khách 46', null, 'Vận hành tiktok shop', 'tiktok_ads', 'Hồng Nhung', 'consulting', true, true),
  ('2026-10-11', 'Khách 47', null, 'Vận hành tiktok shop', 'tiktok_ads', 'Hồng Nhung', 'consulting', true, true),
  ('2026-10-11', 'Khách 48', null, 'Vận hành tiktok shop', 'tiktok_ads', 'Phương Anh', 'cancelled', false, false)
) as v(d, name, phone, service, code, sale, status, reached, consulted)
join public.sources s on s.code = v.code;

insert into public.goals (month, source_id, metric, target)
select '2026-10-01', s.id, g.metric, g.target
from (values ('spend', 4000000), ('lead', 30)) as g(metric, target)
join public.sources s on s.code = 'tiktok_ads'
on conflict do nothing;

insert into public.goals (month, source_id, metric, target) values
  ('2026-10-01', null, 'cpl', 150000),
  ('2026-10-01', null, 'consult_rate', 0.30),
  ('2026-10-01', null, 'close_rate', 0.04)
on conflict do nothing;
