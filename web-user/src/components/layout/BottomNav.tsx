'use client';

import { useState }      from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home, PlusCircle, ClipboardList, Wallet, User,
} from 'lucide-react';
import { useLangStore }   from '@/store/lang.store';
import { UnsavedModal }   from '@/components/ui/UnsavedModal';
import { useSubmitStore } from '@/store/submit.store';

const NAV = [
  { href: '/home',    icon: Home,          labelKey: 'nav.home'    },
  { href: '/history', icon: ClipboardList, labelKey: 'nav.history' },
  { href: '/submit',  icon: PlusCircle,    labelKey: 'nav.submit',  primary: true },
  { href: '/wallet',  icon: Wallet,        labelKey: 'nav.wallet'  },
  { href: '/profile', icon: User,          labelKey: 'nav.profile' },
];

export function BottomNav() {
  const pathname      = usePathname();
  const router        = useRouter();
  const { t }         = useLangStore();
  const { isDirty, clearDirty } = useSubmitStore();

  const [pendingHref, setPendingHref] = useState<string | null>(null);

  function handleNav(href: string) {
    if (pathname === '/submit' && isDirty && href !== '/submit') {
      setPendingHref(href);
      return;
    }
    router.push(href);
  }

  function handleLeave() {
    clearDirty();
    if (pendingHref) router.push(pendingHref);
    setPendingHref(null);
  }

  return (
    <>
      <UnsavedModal
        open={!!pendingHref}
        onStay={() => setPendingHref(null)}
        onLeave={handleLeave}
      />

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-surface-border">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);

            if (item.primary) {
              return (
                <button
                  key={item.href}
                  onClick={() => handleNav(item.href)}
                  className="flex flex-col items-center -mt-5"
                >
                  <div className={`
                    w-14 h-14 rounded-2xl flex items-center justify-center
                    shadow-float transition-all duration-150 active:scale-95
                    ${active ? 'bg-brand-600' : 'bg-brand'}
                  `}>
                    <item.icon size={24} className="text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-brand mt-1">
                    {t(item.labelKey)}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl"
              >
                <item.icon
                  size={20}
                  className={active ? 'text-brand' : 'text-ink-faint'}
                />
                <span className={`text-[10px] font-medium ${
                  active ? 'text-brand' : 'text-ink-faint'
                }`}>
                  {t(item.labelKey)}
                </span>
                {active && (
                  <span className="w-1 h-1 rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}