import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useRouter }     from 'expo-router';
import { useState }      from 'react';
import { Ionicons }      from '@expo/vector-icons';
import { useMyReports }  from '@/hooks/useReports';
import { useLangStore }  from '@/store/lang.store';
import { Badge }         from '@/components/ui/Badge';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_TABS = ['', 'pending', 'approved', 'rejected'] as const;

export default function HistoryScreen() {
  const router           = useRouter();
  const { t }            = useLangStore();
  const qc               = useQueryClient();
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useMyReports({
    page, limit: 15, status: status || undefined,
  });

  const reports = data?.data ?? [];
  const meta    = data?.meta;

  async function onRefresh() {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['my-reports'] });
    setRefreshing(false);
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('history.title')}</Text>
      </View>

      {/* Status filter tabs */}
      <View style={styles.tabsRow}>
        {STATUS_TABS.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => { setStatus(s); setPage(1); }}
            style={[styles.tab, status === s && styles.tabActive]}
          >
            <Text style={[styles.tabText, status === s && styles.tabTextActive]}>
              {s === '' ? t('status.all') : t(`status.${s}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#73AF6F" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyText}>{t('history.empty')}</Text>
            </View>
          ) : null
        }
        renderItem={({ item: r }: { item: any }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/report/${r.id}` as any)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="leaf" size={18} color="#73AF6F" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{r.category_name}</Text>
              <Text style={styles.cardSub}>
                {t('history.estWeight')}: {r.estimated_weight} kg
                {r.actual_weight ? ` · Actual: ${r.actual_weight} kg` : ''}
              </Text>
              {r.status === 'approved' && r.net_points != null && (
                <Text style={styles.netPoints}>
                  +{r.net_points.toLocaleString('id-ID')} pts
                </Text>
              )}
              {r.status === 'rejected' && r.rejection_reason && (
                <Text style={styles.rejected}>{r.rejection_reason}</Text>
              )}
              <Text style={styles.date}>
                {new Date(r.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Badge status={r.status} />
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginTop: 8 }} />
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          meta && meta.totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                disabled={page <= 1}
                onPress={() => setPage((p) => p - 1)}
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>{t('common.back')}</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>{page} / {meta.totalPages}</Text>
              <TouchableOpacity
                disabled={page >= meta.totalPages}
                onPress={() => setPage((p) => p + 1)}
                style={[styles.pageBtn, page >= meta.totalPages && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#F8FAF8' },
  header:          { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:           { fontSize: 24, fontWeight: '800', color: '#1a2e1a' },
  tabsRow:         { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  tab:             { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E4EDE3' },
  tabActive:       { backgroundColor: '#73AF6F', borderColor: '#73AF6F' },
  tabText:         { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive:   { color: '#fff' },
  list:            { padding: 16, paddingTop: 4, gap: 10 },
  card:            { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardIcon:        { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  cardInfo:        { flex: 1, gap: 3 },
  cardTitle:       { fontSize: 14, fontWeight: '700', color: '#1a2e1a' },
  cardSub:         { fontSize: 12, color: '#9CA3AF' },
  netPoints:       { fontSize: 13, fontWeight: '700', color: '#059669' },
  rejected:        { fontSize: 12, color: '#DC2626' },
  date:            { fontSize: 11, color: '#9CA3AF' },
  cardRight:       { alignItems: 'flex-end' },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText:       { fontSize: 14, color: '#9CA3AF' },
  pagination:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
  pageBtn:         { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E4EDE3' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText:     { fontSize: 13, fontWeight: '600', color: '#4a6b49' },
  pageInfo:        { fontSize: 13, color: '#9CA3AF' },
});