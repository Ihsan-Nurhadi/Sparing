import React from 'react';
import { Activity, LogIn, LogOut, Moon, Sun } from 'lucide-react';
import { Language, ThemeMode } from '../../types/sparing';
import { translations } from '../../i18n/translations';

interface TopBarProps {
  lang: Language;
  theme: ThemeMode;
  isOperatorLoggedIn: boolean;
  onChangeLang: (lang: Language) => void;
  onToggleTheme: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  lang,
  theme,
  isOperatorLoggedIn,
  onChangeLang,
  onToggleTheme,
  onOpenLogin,
  onLogout,
}) => {
  const t = translations[lang];

  return (
    <header className="h-14 px-4 lg:px-6 border-b border-line bg-surface flex items-center justify-between shrink-0">
      {/* Device Title Only — Zero Company Name */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded border border-line-strong bg-subtle flex items-center justify-center text-ink">
          <Activity className="w-4 h-4 stroke-[1.75]" />
        </div>
        <div className="flex items-center gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-ink">SPARING</span>
              <span className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded border border-line bg-subtle text-muted">
                {t.stationId}
              </span>
            </div>
            <p className="text-[11px] text-muted leading-none mt-0.5 hidden sm:block">
              {t.systemSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Controls: Language ID/EN, Matte Theme Light/Dark, Operator Login */}
      <div className="flex items-center gap-2">
        {/* Bilingual ID / EN Switcher */}
        <div
          className="inline-flex items-center rounded border border-line bg-subtle p-0.5"
          role="group"
          aria-label="Language Switch"
        >
          <button
            type="button"
            onClick={() => onChangeLang('id')}
            className={`px-2 py-1 text-xs font-medium rounded-sm transition-colors ${
              lang === 'id'
                ? 'bg-surface text-ink border border-line'
                : 'text-muted hover:text-ink border border-transparent'
            }`}
          >
            ID
          </button>
          <button
            type="button"
            onClick={() => onChangeLang('en')}
            className={`px-2 py-1 text-xs font-medium rounded-sm transition-colors ${
              lang === 'en'
                ? 'bg-surface text-ink border border-line'
                : 'text-muted hover:text-ink border border-transparent'
            }`}
          >
            EN
          </button>
        </div>

        {/* Matte Light / Matte Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border border-line bg-surface text-muted hover:text-ink hover:border-line-strong transition-colors"
          title={theme === 'light' ? t.themeDark : t.themeLight}
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-3.5 h-3.5 stroke-[1.75]" />
              <span className="hidden md:inline">{t.themeDark}</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 stroke-[1.75]" />
              <span className="hidden md:inline">{t.themeLight}</span>
            </>
          )}
        </button>

        {/* Operator Login / Logout */}
        {isOperatorLoggedIn ? (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-line-strong bg-subtle text-ink hover:bg-canvas transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>{t.logoutBtn}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-ink bg-ink text-surface hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>{t.loginBtn}</span>
          </button>
        )}
      </div>
    </header>
  );
};
