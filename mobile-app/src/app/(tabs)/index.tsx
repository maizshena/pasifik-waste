import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useRouter }       from 'expo-router';
import { Ionicons }        from '@expo/vector-icons';
import { useState }        from 'react';
import { useMe }           from '@/hooks/useWallet';
import { useMyReports }    from '@/hooks/useReports';
import { useLangStore }    from '@/store/lang.store';
import { useAuthStore }    from '@/store/auth.store';
import { Badge }           from '@/components/ui/Badge';
import { useQueryClient }  from '@tanstack/react-query';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export default function HomeScreen() {
  const router            = useRouter();
  const { t }             = useLangStore();
  const { user }          = useAuthStore();
  const qc                = useQueryClient();

  const { data: me,      isLoading: meLoading }      = useMe();
  const { data: reports, isLoading: reportsLoading } = useMyReports({ limit: 3 });

  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['me'] }),
      qc.invalidateQueries({ queryKey: ['my-reports'] }),
    ]);
    setRefreshing(false);
  }

  const balance   = me?.balance        ?? 0;
  const locked    = me?.locked_balance ?? 0;
  const firstName = user?.full_name?.split(' ')[0] ?? 'Warga';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

  const recentReports = reports?.data ?? [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#73AF6F" />
      }
    >
      {/* ── Balance hero card ─────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        <View style={styles.heroBg} />
        <Text style={styles.heroGreeting}>
          {greeting} {t('home.greeting')}, {firstName}!
        </Text>

        <Text style={styles.heroLabel}>{t('home.balance')}</Text>
        {meLoading ? (
          <View style={styles.balanceSkeleton} />
        ) : (
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>
              {balance.toLocaleString('id-ID')}
            </Text>
            <Text style={styles.balanceUnit}>pts</Text>
          </View>
        )}

        {locked > 0 && (
          <View style={styles.lockedRow}>
            <Ionicons name="lock-closed-outline" size={12} color="rgba(255,255,255,0.6)" />
            <Text style={styles.lockedText}>
              {locked.toLocaleString('id-ID')} pts {t('home.locked')}
            </Text>
          </View>
        )}
      </View>

      {/* ── Quick actions ──────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/submit')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="add-circle-outline" size={24} color="#73AF6F" />
            </View>
            <Text style={styles.actionLabel}>{t('home.submitWaste')}</Text>
            <Text style={styles.actionSub}>{t('home.earnPoints')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/wallet')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="wallet-outline" size={24} color="#73AF6F" />
            </View>
            <Text style={styles.actionLabel}>{t('home.viewWallet')}</Text>
            <Text style={styles.actionSub}>{t('home.withdrawPoints')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Recent reports ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.recentReports')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.seeAll}>{t('home.seeAll')} →</Text>
          </TouchableOpacity>
        </View>

        {reportsLoading ? (
          [1, 2, 3].map((i) => (
            <View key={i} style={styles.reportSkeleton} />
          ))
        ) : recentReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="leaf-outline" size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>{t('home.noReports')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/submit')}>
              <Text style={styles.emptyLink}>Submit your first report →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentReports.map((r: any) => (
            <TouchableOpacity
              key={r.id}
              style={styles.reportCard}
              onPress={() => router.push(`/report/${r.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.reportIcon}>
                <Ionicons name="leaf" size={18} color="#73AF6F" />
              </View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportTitle}>{r.category_name}</Text>
                <Text style={styles.reportSub}>
                  {r.estimated_weight} kg ·{' '}
                  {new Date(r.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short',
                  })}
                </Text>
              </View>
              <Badge status={r.status} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#F8FAF8' },
  content:          { paddingBottom: 24 },
  heroCard:         { margin: 16, borderRadius: 24, padding: 24, backgroundColor: '#73AF6F', overflow: 'hidden' },
  heroBg:           { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroGreeting:     { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  heroLabel:        { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  balanceSkeleton:  { height: 44, width: 160, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 8 },
  balanceRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 8 },
  balanceAmount:    { fontSize: 40, fontWeight: '800', color: '#fff' },
  balanceUnit:      { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  lockedRow:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lockedText:       { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  section:          { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:     { fontSize: 13, fontWeight: '700', color: '#4a6b49', textTransform: 'uppercase', letterSpacing: 0.5 },
  seeAll:           { fontSize: 12, color: '#73AF6F', fontWeight: '600' },
  actionsRow:       { flexDirection: 'row', gap: 12 },
  actionCard:       { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  actionIcon:       { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionLabel:      { fontSize: 13, fontWeight: '700', color: '#1a2e1a', marginBottom: 2 },
  actionSub:        { fontSize: 11, color: '#9CA3AF' },
  reportCard:       { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  reportIcon:       { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  reportInfo:       { flex: 1 },
  reportTitle:      { fontSize: 14, fontWeight: '600', color: '#1a2e1a' },
  reportSub:        { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  reportSkeleton:   { height: 64, backgroundColor: '#F0F7EF', borderRadius: 16, marginBottom: 8 },
  emptyCard:        { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 8 },
  emptyText:        { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  emptyLink:        { fontSize: 13, color: '#73AF6F', fontWeight: '600', marginTop: 4 },
});