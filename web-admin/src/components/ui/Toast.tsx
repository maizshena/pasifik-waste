'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface Props {
  message:  string;
  type:     ToastType;
  onClose:  () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`
        fixed top-5 right-5 z-[100] flex items-center gap-3 px-4 py-3
        rounded-xl border shadow-modal max-w-sm transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        ${type === 'success'
          ? 'bg-surface-raised border-brand/30 text-brand-300'
          : 'bg-surface-raised border-red-500/30 text-red-400'
        }
      `}
    >
      {type === 'success'
        ? <CheckCircle2 size={15} className="flex-shrink-0" />
        : <XCircle      size={15} className="flex-shrink-0" />
      }
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="text-ink-faint hover:text-ink transition-colors flex-shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  );
}