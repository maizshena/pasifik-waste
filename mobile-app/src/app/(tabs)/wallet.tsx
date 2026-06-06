import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useState }              from 'react';
import { Ionicons }              from '@expo/vector-icons';
import { useMe, useMyWithdrawals, useRequestWithdrawal } from '@/hooks/useWallet';
import { useLangStore }          from '@/store/lang.store';
import { useToast }              from '@/hooks/useToast';
import { Toast }                 from '@/components/ui/Toast';
import { Button }                from '@/components/ui/Button';
import { Badge }                 from '@/components/ui/Badge';
import { useQueryClient }        from '@tanstack/react-query';

const EMPTY_FORM = { amount: '', bank_name: '', account_number: '', account_holder: '' };

export default function WalletScreen() {
  const { t }                               = useLangStore();
  const { data: me, isLoading: meLoading }  = useMe();
  const { data: withdrawals = [] }          = useMyWithdrawals();
  const requestWithdrawal                   = useRequestWithdrawal();
  const { toasts, show, remove }            = useToast();
  const qc                                  = useQueryClient();

  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [refreshing, setRefreshing] = useState(false);

  const balance = me?.balance        ?? 0;
  const locked  = me?.locked_balance ?? 0;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['me'] }),
      qc.invalidateQueries({ queryKey: ['my-withdrawals'] }),
    ]);
    setRefreshing(false);
  }

  async function handleWithdraw() {
    const amt = parseInt(form.amount, 10);
    if (!form.amount || isNaN(amt) || amt <= 0) { show(t('wallet.validAmount') || 'Enter valid amount', 'error'); return; }
    if (amt > balance)                           { show(t('wallet.insufficientBalance'), 'error'); return; }
    if (!form.bank_name || !form.account_number || !form.account_holder) {
      show(t('wallet.allRequired') || 'All fields required', 'error'); return;
    }
    try {
      await requestWithdrawal.mutateAsync({
        amount:         amt,
        bank_name:      form.bank_name,
        account_number: form.account_number,
        account_holder: form.account_holder,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      show(t('wallet.submitted'), 'success');
    } catch (e: any) {
      show(e.response?.data?.message || t('common.error'), 'error');
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}

      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#73AF6F" />
        }
      >
        <Text style={styles.title}>{t('wallet.title')}</Text>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Ionicons name="wallet-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.balanceLabel}>{t('wallet.available')}</Text>
          {meLoading ? (
            <View style={styles.balanceSkeleton} />
          ) : (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmt}>{balance.toLocaleString('id-ID')}</Text>
              <Text style={styles.balanceUnit}>pts</Text>
            </View>
          )}
          {locked > 0 && (
            <View style={styles.lockedRow}>
              <Ionicons name="lock-closed-outline" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.lockedText}>
                {locked.toLocaleString('id-ID')} pts {t('wallet.locked')}
              </Text>
            </View>
          )}
        </View>

        {/* Zero balance state */}
        {!meLoading && balance === 0 && (
          <View style={styles.emptyBalance}>
            <Ionicons name="trending-up-outline" size={28} color="#9CA3AF" />
            <Text style={styles.emptyBalanceTitle}>No balance yet</Text>
            <Text style={styles.emptyBalanceSub}>
              Submit waste reports to earn points
            </Text>
          </View>
        )}

        {/* Withdraw button / form */}
        {balance > 0 && (
          !showForm ? (
            <Button
              onPress={() => { setForm(EMPTY_FORM); setShowForm(true); }}
              variant="soft"
              full
              style={{ marginBottom: 16 }}
            >
              {t('wallet.withdraw')}
            </Button>
          ) : (
            <View style={styles.form}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>{t('wallet.withdraw')}</Text>
                <TouchableOpacity onPress={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                  <Text style={{ color: '#9CA3AF' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>

              {[
                { label: t('wallet.amount'),        key: 'amount',         keyboard: 'numeric'       as const, placeholder: `max ${balance.toLocaleString('id-ID')}` },
                { label: t('wallet.eWallet'),       key: 'bank_name',      keyboard: 'default'       as const, placeholder: 'GoPay / OVO / Dana…' },
                { label: t('wallet.accountNumber'), key: 'account_number', keyboard: 'phone-pad'     as const, placeholder: '08xxxxxxxxxx' },
                { label: t('wallet.accountHolder'), key: 'account_holder', keyboard: 'default'       as const, placeholder: 'Full name on account' },
              ].map((f) => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={(form as any)[f.key]}
                    onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                    placeholder={f.placeholder}
                    placeholderTextColor="#9CA3AF"
                    keyboardType={f.keyboard}
                  />
                </View>
              ))}

              <Button onPress={handleWithdraw} loading={requestWithdrawal.isPending} full size="lg">
                {t('wallet.submitRequest')}
              </Button>
            </View>
          )
        )}

        {/* Withdrawal history */}
        <Text style={styles.sectionTitle}>{t('wallet.myWithdrawals')}</Text>

        {(withdrawals as any[]).length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="receipt-outline" size={28} color="#9CA3AF" />
            <Text style={styles.emptyHistoryText}>{t('wallet.noWithdrawals')}</Text>
          </View>
        ) : (
          (withdrawals as any[]).map((w) => (
            <View key={w.id} style={styles.wdCard}>
              <View style={styles.wdCardTop}>
                <View>
                  <Text style={styles.wdBank}>{w.bank_name}</Text>
                  <Text style={styles.wdAccount}>{w.account_number} · {w.account_holder}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.wdAmount}>{w.amount.toLocaleString('id-ID')} pts</Text>
                  <Badge status={w.status} />
                </View>
              </View>
              {w.transfer_ref && (
                <Text style={styles.wdRef}>Ref: {w.transfer_ref}</Text>
              )}
              {w.rejection_reason && (
                <Text style={styles.wdRejected}>{w.rejection_reason}</Text>
              )}
              <Text style={styles.wdDate}>
                {new Date(w.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: '#F8FAF8' },
  content:           { padding: 16, paddingBottom: 32 },
  title:             { fontSize: 24, fontWeight: '800', color: '#1a2e1a', marginBottom: 16 },
  balanceCard:       { backgroundColor: '#73AF6F', borderRadius: 24, padding: 24, marginBottom: 16, gap: 4 },
  balanceLabel:      { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  balanceSkeleton:   { height: 44, width: 160, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  balanceRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  balanceAmt:        { fontSize: 40, fontWeight: '800', color: '#fff' },
  balanceUnit:       { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  lockedRow:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lockedText:        { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  emptyBalance:      { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 8, marginBottom: 16 },
  emptyBalanceTitle: { fontSize: 15, fontWeight: '700', color: '#1a2e1a' },
  emptyBalanceSub:   { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  form:              { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  formHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle:         { fontSize: 16, fontWeight: '700', color: '#1a2e1a' },
  field:             { gap: 6 },
  fieldLabel:        { fontSize: 12, fontWeight: '600', color: '#4a6b49', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:             { backgroundColor: '#F8FAF8', borderWidth: 1, borderColor: '#E4EDE3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a2e1a' },
  sectionTitle:      { fontSize: 13, fontWeight: '700', color: '#4a6b49', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  emptyHistory:      { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 8 },
  emptyHistoryText:  { fontSize: 13, color: '#9CA3AF' },
  wdCard:            { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8, gap: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  wdCardTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  wdBank:            { fontSize: 14, fontWeight: '700', color: '#1a2e1a' },
  wdAccount:         { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  wdAmount:          { fontSize: 14, fontWeight: '800', color: '#059669' },
  wdRef:             { fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' },
  wdRejected:        { fontSize: 12, color: '#DC2626' },
  wdDate:            { fontSize: 11, color: '#9CA3AF' },
});