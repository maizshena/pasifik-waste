import { useEffect, useRef }  from 'react';
import { useQueryClient }     from '@tanstack/react-query';
import { useNotifications }   from '@/hooks/useNotifications';

console.log('[DEBUG] notifications data:', JSON.stringify(data));

export function NotificationSync() {
  const qc       = useQueryClient();
  const { data } = useNotifications();
  const seenIds  = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!data || !data.notifications || !Array.isArray(data.notifications)) return;

    data.notifications.forEach((n) => {
      if (!n?.id) return;
      if (seenIds.current.has(n.id)) return;
      seenIds.current.add(n.id);

      switch (n.type) {
        case 'report_validated':
          qc.invalidateQueries({ queryKey: ['me'] });
          qc.invalidateQueries({ queryKey: ['my-reports'] });
          break;
        case 'withdrawal_processed':
          qc.invalidateQueries({ queryKey: ['me'] });
          qc.invalidateQueries({ queryKey: ['my-withdrawals'] });
          break;
        case 'new_comment':
          qc.invalidateQueries({ queryKey: ['comments'] });
          break;
      }
    });
  }, [data, qc]);

  return null;
}