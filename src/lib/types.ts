export interface Source {
  id: string;
  code: string;
  name: string;
  channel_group: string;
  has_cost: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface DailyMetric {
  id?: string;
  metric_date: string;
  source_id: string;
  spend: number;
  messages: number;
  impressions: number;
  clicks: number;
}

export interface Lead {
  id: string;
  lead_date: string;
  name: string;
  phone: string | null;
  service: string | null;
  source_id: string;
  sale: string | null;
  status: string;
  reached: boolean;
  consulted: boolean;
  closed: boolean;
  note: string | null;
}

export type CountMetric = 'spend' | 'messages' | 'lead' | 'reached' | 'consulted' | 'closed';
export type RateMetric = 'cpl' | 'consult_rate' | 'close_rate';

export interface Goal {
  id?: string;
  month: string;
  source_id: string | null;
  metric: CountMetric | RateMetric;
  target: number;
}

/** One row returned by the `report_daily` SQL function. */
export interface ReportRow {
  day: string;
  source_id: string;
  spend: number;
  messages: number;
  impressions: number;
  clicks: number;
  leads: number;
  reached: number;
  consulted: number;
  closed: number;
}
