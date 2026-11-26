import React from 'react';
import {
  BarChart3,
  Box,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Language, NavSection } from '../../types/sparing';
import { translations } from '../../i18n/translations';

interface SidebarProps {
  lang: Language;
  activeNav: NavSection;
  collapsed: boolean;
  onSelectNav: (nav: NavSection) => void;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  lang,
  activeNav,
  collapsed,
  onSelectNav,
  onToggleCollapse,
}) => {
  const t = translations[lang];

  const items: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
    {
      id: 'overview',
      label: t.navOverview,
      icon: <Box className="w-4 h-4 stroke-[1.75] shrink-0" />,
    },
    {
      id: 'analytics',
      label: t.navAnalytics,
      icon: <BarChart3 className="w-4 h-4 stroke-[1.75] shrink-0" />,
    },
    {
      id: 'system',
      label: t.navSystem,
      icon: <RefreshCw className="w-4 h-4 stroke-[1.75] shrink-0" />,
    },
    {
      id: 'location',
      label: t.navLocation,
      icon: <MapPin className="w-4 h-4 stroke-[1.75] shrink-0" />,
    },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-14' : 'w-56'
      } border-r border-line bg-surface flex flex-col justify-between shrink-0 transition-[width] duration-200`}
    >
      <nav className="p-2 space-y-1">
        {items.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNav(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-subtle text-ink border-line-strong'
                  : 'bg-transparent text-muted border-transparent hover:bg-canvas hover:text-ink'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              {item.icon}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-line space-y-1">
        {!collapsed && (
          <div className="px-2.5 py-2 rounded bg-canvas border border-line flex items-center gap-2 text-[11px] text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-ink shrink-0" />
            <span className="truncate font-mono">SLA 100% · IP65</span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center py-2 rounded text-muted hover:text-ink hover:bg-canvas transition-colors"
          aria-label="Toggle Sidebar"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
