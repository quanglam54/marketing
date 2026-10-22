export interface LeadStatus {
  code: string;
  label: string;
  dot: string;
  bg: string;
  fg: string;
  /** Giá trị mặc định cho các bước phễu khi chọn trạng thái này. */
  implies: { reached: boolean; consulted: boolean; closed: boolean };
}

export const LEAD_STATUSES: LeadStatus[] = [
  { code: 'new', label: 'Mới', dot: '#2357D9', bg: '#EAF0FD', fg: '#1A43AD', implies: { reached: false, consulted: false, closed: false } },
  { code: 'consulting', label: 'Đang tư vấn', dot: '#1F8A4C', bg: '#E7F5EC', fg: '#155E34', implies: { reached: true, consulted: true, closed: false } },
  { code: 'won', label: 'Đã chốt', dot: '#0E7A6D', bg: '#E2F5F2', fg: '#0B5A51', implies: { reached: true, consulted: true, closed: true } },
  { code: 'reference', label: 'Tham khảo', dot: '#5B6470', bg: '#EEF0F3', fg: '#3D444C', implies: { reached: true, consulted: false, closed: false } },
  { code: 'affiliate', label: 'Tiếp thị liên kết', dot: '#7A5AF8', bg: '#F0EDFE', fg: '#4A2BB8', implies: { reached: false, consulted: false, closed: false } },
  { code: 'unreachable', label: 'Chưa TV được / tắt ngang', dot: '#E07B24', bg: '#FFF4E5', fg: '#7A3E00', implies: { reached: false, consulted: false, closed: false } },
  { code: 'no_answer', label: 'Thuê bao / KNM', dot: '#8A94A0', bg: '#F1F2F4', fg: '#3D444C', implies: { reached: false, consulted: false, closed: false } },
  { code: 'cancelled', label: 'Huỷ / không hỗ trợ được', dot: '#D92D20', bg: '#FDECEA', fg: '#8F1A12', implies: { reached: false, consulted: false, closed: false } },
];

const BY_CODE = new Map(LEAD_STATUSES.map((s) => [s.code, s]));

export function statusOf(code: string): LeadStatus {
  return BY_CODE.get(code) ?? LEAD_STATUSES[0];
}
