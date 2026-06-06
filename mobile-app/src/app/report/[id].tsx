import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image }           from 'expo-image';
import { useState, useEffect, useRef } from 'react';
import { Ionicons }        from '@expo/vector-icons';
import { useReport, useComments, useAddComment } from '@/hooks/useReports';
import { useLangStore }    from '@/store/lang.store';
import { useAuthStore }    from '@/store/auth.store';
import { Badge }           from '@/components/ui/Badge';
import { Button }          from '@/components/ui/Button';
import { Toast }           from '@/components/ui/Toast';
import { useToast }        from '@/hooks/useToast';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

function toAbsolute(url: string) {
  return url.startsWith('/uploads/') ? `${API_URL}${url}` : url;
}

function relativeTime(dateStr: string): string {
  const diff    = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours   < 24) return `${hours}h ago`;
  if (days    < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function ReportDetailScreen() {
  const { id }     = useLocalSearchParams<{ id: string }>();
  const router     = useRouter();
  const { t }      = useLangStore();
  const { user }   = useAuthStore();
  const reportId   = parseInt(id, 10);

  const { data: report, isLoading } = useReport(reportId);
  const { data: comments = [] }     = useComments(reportId);
  const addComment                  = useAddComment(reportId);
  const { toasts, show, remove }    = useToast();

  const [commentBody,  setCommentBody]  = useState('');
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [, forceUpdate] = useState(0);

  // Auto-update relative timestamps every minute
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Safe photo resolution
  const photos: string[] = (() => {
    if (report?.photo_urls) {
      try {
        const parsed = typeof report.photo_urls === 'string'
          ? JSON.parse(report.photo_urls as string)
          : report.photo_urls;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    if (report?.photo_url) return [report.photo_url];
    return [];
  })();

  async function handleComment() {
    if (!commentBody.trim()) return;
    try {
      await addComment.mutateAsync(commentBody.trim());
      setCommentBody('');
    } catch {
      show('Failed to send comment', 'error');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#73AF6F" />
      </View>
    );
  }

  if (!report) return null;

  const Field = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}

      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1a2e1a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{report.category_name}</Text>
            <Text style={styles.subtitle}>Report #{report.id}</Text>
          </View>
          <Badge status={report.status} />
        </View>

        {/* Photos */}
        {photos.length > 0 && (
          <View style={styles.card}>
            <Image
              source={{ uri: toAbsolute(photos[currentPhoto]) }}
              style={styles.mainPhoto}
              contentFit="cover"
            />
            {photos.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbRow}
              >
                {photos.map((p, i) => (
                  <TouchableOpacity key={i} onPress={() => setCurrentPhoto(i)}>
                    <Image
                      source={{ uri: toAbsolute(p) }}
                      style={[
                        styles.thumb,
                        i === currentPhoto && styles.thumbActive,
                      ]}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Details */}
        <View style={styles.card}>
          <Field label={t('history.estWeight')}  value={`${report.estimated_weight} kg`} />
          {report.actual_weight != null && (
            <Field label={t('history.actWeight')} value={`${report.actual_weight} kg`} />
          )}
          <Field
            label={t('history.submitted')}
            value={new Date(report.created_at).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          />
          {report.validated_at && (
            <Field
              label={t('history.validated')}
              value={new Date(report.validated_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            />
          )}
          {(report as any).pickup_date && (
            <Field
              label="Pickup Date"
              value={new Date((report as any).pickup_date).toLocaleDateString('id-ID', {
                weekday: 'short', day: 'numeric', month: 'long',
              })}
            />
          )}
          {(report as any).pickup_hour && (
            <Field label="Pickup Time" value={(() => {
              const val = String((report as any).pickup_hour);
              if (val.includes(':')) {
                const [h, m] = val.split(':').map(Number);
                const h12    = h % 12 === 0 ? 12 : h % 12;
                return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
              }
              const h = parseInt(val, 10);
              return `${h}:00 ${h < 12 ? 'AM' : 'PM'}`;
            })()} />
          )}
        </View>

        {/* Points breakdown */}
        {report.status === 'approved' && report.net_points != null && (
          <View style={[styles.card, styles.pointsCard]}>
            <Text style={styles.pointsCardTitle}>{t('history.pointsEarned')}</Text>
            {[
              { label: t('history.gross'), value: report.gross_points,  color: '#1a2e1a' },
              { label: t('history.fee'),   value: report.handling_fee,  color: '#D97706' },
              { label: t('history.netPoints'), value: report.net_points, color: '#059669' },
            ].map((p) => (
              <View key={p.label} style={styles.pointsRow}>
                <Text style={styles.pointsLabel}>{p.label}</Text>
                <Text style={[styles.pointsValue, { color: p.color }]}>
                  {p.value?.toLocaleString('id-ID')} pts
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Rejection reason */}
        {report.status === 'rejected' && (
          <View style={[styles.card, styles.rejectedCard]}>
            <Text style={styles.rejectedTitle}>Rejection Reason</Text>
            <Text style={styles.rejectedText}>
              {report.rejection_reason || 'No reason provided'}
            </Text>
          </View>
        )}

        {/* Location */}
        {(report.latitude || report.address_text) && (
          <View style={styles.card}>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color="#73AF6F" />
              <Text style={styles.locationText}>
                {report.address_text || `${report.latitude}, ${report.longitude}`}
              </Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {report.notes && (
          <View style={styles.card}>
            <View style={styles.locationRow}>
              <Ionicons name="document-text-outline" size={16} color="#9CA3AF" />
              <Text style={styles.notesText}>{report.notes}</Text>
            </View>
          </View>
        )}

        {/* Comments */}
        <View style={styles.card}>
          <View style={styles.commentsHeader}>
            <Ionicons name="chatbubbles-outline" size={16} color="#73AF6F" />
            <Text style={styles.commentsTitle}>{t('history.commentsTitle')}</Text>
            <Text style={styles.commentsCount}>
              {(comments as any[]).length}
            </Text>
          </View>

          {(comments as any[]).length === 0 ? (
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubble-outline" size={24} color="#9CA3AF" />
              <Text style={styles.emptyCommentsText}>{t('history.noComments')}</Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {(comments as any[]).map((c: any) => {
                const isMe    = c.author_role === 'warga';
                const isAdmin = c.author_role === 'admin' || c.author_role === 'super_admin';
                return (
                  <View
                    key={c.id}
                    style={[
                      styles.commentRow,
                      isMe ? styles.commentRowRight : styles.commentRowLeft,
                    ]}
                  >
                    {isAdmin && (
                      <View style={styles.adminAvatar}>
                        <Text style={styles.adminAvatarText}>🛡</Text>
                      </View>
                    )}
                    <View style={[
                      styles.bubble,
                      isMe ? styles.bubbleMe : styles.bubbleAdmin,
                    ]}>
                      {isAdmin && (
                        <Text style={styles.bubbleAdminLabel}>Admin</Text>
                      )}
                      <Text style={[
                        styles.bubbleText,
                        isMe && { color: '#fff' },
                      ]}>
                        {c.body}
                      </Text>
                      <Text style={[
                        styles.bubbleTime,
                        isMe && { color: 'rgba(255,255,255,0.6)' },
                      ]}>
                        {relativeTime(c.created_at)}
                      </Text>
                    </View>
                    {isMe && (
                      <View style={styles.meAvatar}>
                        <Text style={{ fontSize: 12 }}>
                          {user?.full_name?.[0]?.toUpperCase() ?? 'W'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Comment input */}
          <View style={styles.commentInput}>
            <TextInput
              style={styles.commentTextInput}
              value={commentBody}
              onChangeText={setCommentBody}
              placeholder={t('history.commentPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              onSubmitEditing={handleComment}
            />
            <TouchableOpacity
              onPress={handleComment}
              disabled={addComment.isPending || !commentBody.trim()}
              style={[
                styles.sendBtn,
                (!commentBody.trim() || addComment.isPending) && styles.sendBtnDisabled,
              ]}
            >
              {addComment.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={16} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: '#F8FAF8' },
  content:           { padding: 16, paddingBottom: 32, gap: 12 },
  loading:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:            { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  backBtn:           { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title:             { fontSize: 18, fontWeight: '800', color: '#1a2e1a' },
  subtitle:          { fontSize: 12, color: '#9CA3AF' },
  card:              { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  mainPhoto:         { width: '100%', height: 200, borderRadius: 14 },
  thumbRow:          { flexDirection: 'row', marginTop: 8 },
  thumb:             { width: 56, height: 56, borderRadius: 10, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  thumbActive:       { borderColor: '#73AF6F' },
  fieldRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F7EF' },
  fieldLabel:        { fontSize: 13, color: '#9CA3AF' },
  fieldValue:        { fontSize: 13, fontWeight: '600', color: '#1a2e1a', textAlign: 'right', flex: 1, marginLeft: 16 },
  pointsCard:        { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5', borderWidth: 1 },
  pointsCardTitle:   { fontSize: 12, fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  pointsRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  pointsLabel:       { fontSize: 13, color: '#4a6b49' },
  pointsValue:       { fontSize: 14, fontWeight: '800' },
  rejectedCard:      { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 },
  rejectedTitle:     { fontSize: 12, fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  rejectedText:      { fontSize: 13, color: '#DC2626' },
  locationRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  locationText:      { fontSize: 13, color: '#4a6b49', flex: 1, lineHeight: 20 },
  notesText:         { fontSize: 13, color: '#9CA3AF', flex: 1, lineHeight: 20 },
  commentsHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  commentsTitle:     { fontSize: 14, fontWeight: '700', color: '#1a2e1a', flex: 1 },
  commentsCount:     { fontSize: 12, color: '#9CA3AF' },
  emptyComments:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyCommentsText: { fontSize: 13, color: '#9CA3AF' },
  commentsList:      { gap: 12, marginBottom: 12 },
  commentRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  commentRowLeft:    { justifyContent: 'flex-start' },
  commentRowRight:   { justifyContent: 'flex-end' },
  adminAvatar:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  adminAvatarText:   { fontSize: 14 },
  meAvatar:          { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F7EF', alignItems: 'center', justifyContent: 'center' },
  bubble:            { maxWidth: '75%', borderRadius: 16, padding: 10, gap: 4 },
  bubbleMe:          { backgroundColor: '#73AF6F', borderBottomRightRadius: 4 },
  bubbleAdmin:       { backgroundColor: '#F0F7EF', borderBottomLeftRadius: 4 },
  bubbleAdminLabel:  { fontSize: 10, fontWeight: '700', color: '#73AF6F', textTransform: 'uppercase' },
  bubbleText:        { fontSize: 14, color: '#1a2e1a', lineHeight: 20 },
  bubbleTime:        { fontSize: 10, color: '#9CA3AF' },
  commentInput:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  commentTextInput:  { flex: 1, backgroundColor: '#F8FAF8', borderWidth: 1, borderColor: '#E4EDE3', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1a2e1a', maxHeight: 100 },
  sendBtn:           { width: 40, height: 40, borderRadius: 12, backgroundColor: '#73AF6F', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:   { opacity: 0.4 },
});