import { View, Text, StyleSheet } from 'react-native';

type Status = 'pending' | 'approved' | 'rejected' | 'success' | string;

const MAP: Record<string, { bg: string; text: string; dot: string }> = {
  pending:  { bg: '#FEF3C7', text: '#D97706', dot: '#F59E0B' },
  approved: { bg: '#ECFDF5', text: '#059669', dot: '#10B981' },
  success:  { bg: '#ECFDF5', text: '#059669', dot: '#10B981' },
  rejected: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
};

export function Badge({ status }: { status: Status }) {
  const s = MAP[status] ?? MAP['pending'];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <Text style={[styles.text, { color: s.text }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            5,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:   20,
  },
  dot:  { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '600' },
});