'use client';

import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open:      boolean;
  onStay:    () => void;
  onLeave:   () => void;
}

export function UnsavedModal({ open, onStay, onLeave }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-ink">Leave this page?</h3>
            <p className="text-sm text-ink-muted mt-1">
              You have unsaved report data. If you leave now, everything
              you typed will be lost.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button full variant="outline" onClick={onStay}>
            Stay
          </Button>
          <Button full variant="danger" onClick={onLeave}>
            Leave anyway
          </Button>
        </div>
      </div>
    </div>
  );
}