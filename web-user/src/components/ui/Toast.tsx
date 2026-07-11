'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface Props {
  message:   string;
  type:      ToastType;
  onClose:   () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  return (
    <div className={`
      fixed top-16 right-4 left-4 sm:left-auto sm:w-80 z-[100]
      flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-modal
      transition-all duration-300
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      ${type === 'success'
        ? 'bg-white border-brand/20 text-brand-600'
        : 'bg-white border-red-200 text-red-500'
      }
    `}>
      {type === 'success'
        ? <CheckCircle2 size={16} className="flex-shrink-0" />
        : <XCircle      size={16} className="flex-shrink-0" />
      }
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="text-ink-faint hover:text-ink transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}