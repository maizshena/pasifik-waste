'use client';

import { useState, useRef }    from 'react';
import Link                    from 'next/link';
import { usePathname }         from 'next/navigation';
import {
  LayoutDashboard, FileText, Wallet, Tag, Users, Leaf,
  ChevronRight, PanelLeft,
} from 'lucide-react';
import { useAuthStore }        from '@/store/auth.store';
import { useSidebarStore, SidebarMode } from '@/store/sidebar.store';
import { useLangStore } from '@/store/lang.store';


interface NavItem {
  labelKey: string;
  href:     string;
  icon:     typeof LayoutDashboard;
  minRole?: 'super_admin';
}

const NAV: NavItem[] = [
  { labelKey: 'nav.dashboard',   href: '/dashboard',   icon: LayoutDashboard },
  { labelKey: 'nav.reports',     href: '/reports',     icon: FileText        },
  { labelKey: 'nav.withdrawals', href: '/withdrawals', icon: Wallet          },
  { labelKey: 'nav.categories',  href: '/categories',  icon: Tag             },
  { labelKey: 'nav.users',       href: '/users',       icon: Users, minRole: 'super_admin' },
];

const MODE_CYCLE: SidebarMode[] = ['expanded', 'hover', 'collapsed'];
const MODE_LABEL: Record<SidebarMode, string> = {
  expanded:  'Expanded',
  hover:     'Expand on hover',
  collapsed: 'Collapsed',
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
function NavTooltip({ label, visible }: { label: string; visible: boolean }) {
  return (
    <div className={`
      absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium
      bg-surface-overlay border border-surface-border text-ink shadow-modal
      whitespace-nowrap pointer-events-none z-50
      transition-all duration-150
      ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}
    `}>
      {label}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-surface-border" />
    </div>
  );
}

// ── Nav item — extracted into its own component so useState is legal ──────────
function NavItem({ item, isExpanded, active }: {
  item: NavItem; isExpanded: boolean; active: boolean;
}) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const { t } = useLangStore();
  const label = t(item.labelKey);

  return (
    <div
      className="relative"
      onMouseEnter={() => !isExpanded && setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <Link
        href={item.href}
        className={`
          flex items-center rounded-lg transition-all duration-150
          ${isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'}
          ${active
            ? 'bg-brand/15 text-brand-300 border border-brand/20'
            : 'text-ink-muted hover:text-ink hover:bg-surface-overlay border border-transparent'
          }
        `}
      >
        <item.icon size={16} className={`flex-shrink-0 ${active ? 'text-brand' : ''}`} />
        <span className={`
          text-sm font-medium whitespace-nowrap overflow-hidden
          transition-all duration-200
          ${isExpanded ? 'max-w-full opacity-100' : 'max-w-0 opacity-0'}
        `}>
          {label}
        </span>
        {active && isExpanded && (
          <span className="ml-auto w-1 h-1 rounded-full bg-brand flex-shrink-0" />
        )}
      </Link>
      {!isExpanded && <NavTooltip label={label} visible={tooltipVisible} />}
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname          = usePathname();
  const { user }          = useAuthStore();
  const { mode, setMode } = useSidebarStore();

  const [hovered,      setHovered]      = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  const isExpanded =
    mode === 'expanded' ||
    (mode === 'hover' && hovered);

  const visible = NAV.filter((n) =>
    !n.minRole || user?.role === n.minRole
  );

  function cycleMode() {
    const idx  = MODE_CYCLE.indexOf(mode);
    const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
    setMode(next);
  }

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setModeMenuOpen(false); }}
      className={`
        relative flex-shrink-0 flex flex-col
        bg-surface-raised border-r border-surface-border
        h-screen sticky top-0 overflow-hidden
        transition-[width] duration-200 ease-in-out
        ${isExpanded ? 'w-60' : 'w-14'}
      `}
    >
      {/* Logo */}
      <div className={`
        flex items-center border-b border-surface-border flex-shrink-0
        transition-all duration-200
        ${isExpanded ? 'px-4 h-14 gap-2.5' : 'px-0 h-14 justify-center'}
      `}>
        {/* change this into your own logo */}
        {/* <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shadow-glow flex-shrink-0">
          <Leaf size={14} className="text-white" />
        </div> */}
        <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
          <span className="font-display text-base text-ink tracking-tight whitespace-nowrap">
            Pasifik
          </span>
          <p className="text-[9px] text-ink-faint uppercase tracking-widest -mt-0.5 whitespace-nowrap">
            Admin Console
          </p>
        </div>
      </div>

      {/* Section label */}
      <div className={`
        transition-all duration-200 overflow-hidden flex-shrink-0
        ${isExpanded ? 'max-h-8 opacity-100 px-4 pt-4 pb-1' : 'max-h-0 opacity-0'}
      `}>
        <p className="text-[9px] font-medium text-ink-faint uppercase tracking-widest whitespace-nowrap">
          Insights &amp; Management
        </p>
      </div>

      {/* Nav items */}
      <nav className={`
        flex-1 overflow-y-auto overflow-x-hidden py-2
        ${isExpanded ? 'px-3 space-y-0.5' : 'px-1.5 space-y-1'}
      `}>
        {visible.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isExpanded={isExpanded}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      {/* Bottom — mode toggle */}
      <div className={`
        flex-shrink-0 border-t border-surface-border
        transition-all duration-200
        ${isExpanded ? 'p-3' : 'p-1.5'}
      `}>

        {/* Mode menu */}
        {modeMenuOpen && isExpanded && (
          <div className="mb-2 bg-surface border border-surface-border rounded-xl overflow-hidden animate-fade-in">
            <p className="px-3 py-2 text-[10px] font-medium text-ink-faint uppercase tracking-widest border-b border-surface-border">
              Sidebar control
            </p>
            {MODE_CYCLE.map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setModeMenuOpen(false); }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2.5 text-sm
                  transition-colors hover:bg-surface-overlay
                  ${mode === m ? 'text-ink' : 'text-ink-muted'}
                `}
              >
                <span className={`
                  w-1.5 h-1.5 rounded-full flex-shrink-0
                  ${mode === m ? 'bg-brand' : 'bg-transparent'}
                `} />
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => isExpanded ? setModeMenuOpen(!modeMenuOpen) : cycleMode()}
          className={`
            flex items-center rounded-lg text-ink-muted
            hover:text-ink hover:bg-surface-overlay
            transition-all duration-150
            ${isExpanded ? 'w-full gap-3 px-3 py-2.5' : 'w-full justify-center p-2.5'}
          `}
        >
          <PanelLeft
            size={16}
            className={`flex-shrink-0 transition-transform duration-200 ${
              !isExpanded ? 'rotate-180' : ''
            }`}
          />
          <span className={`
            text-sm font-medium whitespace-nowrap overflow-hidden
            transition-all duration-200
            ${isExpanded ? 'max-w-full opacity-100' : 'max-w-0 opacity-0'}
          `}>
            {MODE_LABEL[mode]}
          </span>
          {isExpanded && (
            <ChevronRight
              size={12}
              className={`ml-auto flex-shrink-0 transition-transform duration-200 ${
                modeMenuOpen ? 'rotate-90' : ''
              }`}
            />
          )}
        </button>
      </div>
    </aside>
  );
}