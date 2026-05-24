'use client';

import { useState }             from 'react';
import { MessageSquare, Send }  from 'lucide-react';
import { useComments, useAddComment, Comment } from '@/hooks/useComments';
import { Button }               from '@/components/ui/Button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function CommentBubble({ comment }: { comment: Comment }) {
  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const roleColor: Record<string, string> = {
    super_admin: 'text-purple-300',
    admin:       'text-brand-300',
    warga:       'text-ink-muted',
  };

  const avatarSrc = comment.author_avatar
    ? comment.author_avatar.startsWith('/uploads/')
      ? `${API_URL}${comment.author_avatar}`
      : comment.author_avatar
    : null;

  return (
    <div className="flex items-start gap-3">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-lg bg-brand/15 border border-brand/20 flex items-center justify-center overflow-hidden flex-shrink-0">
        {avatarSrc ? (
          <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[10px] font-medium text-brand">
            {initials(comment.author_name)}
          </span>
        )}
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${roleColor[comment.author_role] ?? 'text-ink-muted'}`}>
            {comment.author_name}
          </span>
          <span className="text-[10px] text-ink-faint capitalize">
            {comment.author_role.replace('_', ' ')}
          </span>
          <span className="text-[10px] text-ink-faint ml-auto">
            {new Date(comment.created_at).toLocaleString('id-ID', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>
        <div className="bg-surface border border-surface-border rounded-xl px-3 py-2.5">
          <p className="text-sm text-ink leading-relaxed">{comment.body}</p>
        </div>
      </div>
    </div>
  );
}

interface Props { reportId: number; }

export function CommentSection({ reportId }: Props) {
  const [body, setBody]     = useState('');
  const { data: comments, isLoading } = useComments(reportId);
  const addComment          = useAddComment(reportId);

  async function handleSubmit() {
    if (!body.trim()) return;
    await addComment.mutateAsync(body.trim());
    setBody('');
  }

  return (
    <div className="bg-surface-raised border border-surface-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2">
        <MessageSquare size={14} className="text-brand" />
        <h3 className="font-display text-base text-ink">Comments</h3>
        <span className="ml-auto text-xs text-ink-muted">
          {comments?.length ?? 0} comment{comments?.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-5 space-y-4 max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton w-7 h-7 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-10 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!comments || comments.length === 0) && (
          <div className="text-center py-6">
            <MessageSquare size={24} className="text-ink-faint mx-auto mb-2" />
            <p className="text-sm text-ink-muted">No comments yet.</p>
            <p className="text-xs text-ink-faint mt-1">
              Be the first to add a note on this report.
            </p>
          </div>
        )}

        {!isLoading && comments?.map((c) => (
          <CommentBubble key={c.id} comment={c} />
        ))}
      </div>

      {/* Input */}
      <div className="px-5 pb-5 border-t border-surface-border pt-4">
        <div className="flex gap-2 items-end">
          <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="What's with this report?"
            className="flex-1 px-3.5 py-2.5 bg-surface border border-surface-border rounded-xl text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 resize-none"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            loading={addComment.isPending}
            disabled={!body.trim()}
          >
            <Send size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}