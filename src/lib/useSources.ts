import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Source } from './types';

export function useSources(includeInactive = false) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('sources').select('*').order('sort_order').order('name');
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error: err } = await query;
    setError(err ? err.message : null);
    setSources((data as Source[]) ?? []);
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { sources, loading, error, reload };
}

/** Nhóm nguồn theo channel_group, giữ thứ tự sort_order. */
export function groupSources(sources: Source[]): { name: string; items: Source[] }[] {
  const groups: { name: string; items: Source[] }[] = [];
  for (const s of sources) {
    let g = groups.find((x) => x.name === s.channel_group);
    if (!g) {
      g = { name: s.channel_group, items: [] };
      groups.push(g);
    }
    g.items.push(s);
  }
  return groups;
}
