import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Radio, Wifi, X } from 'lucide-react';
import {
  IndustryPresetId,
  Language,
  NavSection,
  ParameterKey,
  SensorRecord,
  SubsystemId,
  ThemeMode,
} from './types/sparing';
import { RAW_SENSOR_RECORDS } from './data/mockSparingData';
import { translations } from './i18n/translations';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewView } from './components/overview/OverviewView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SystemView } from './components/system/SystemView';
import { LocationWeatherView } from './components/location/LocationWeatherView';

export const App: React.FC = () => {
  // Default language ID with switch to EN; Default theme Matte Light with switch to Matte Dark
  const [lang, setLang] = useState<Language>('id');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [activeNav, setActiveNav] = useState<NavSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // 3D Tower & Parameter Interactive State (aligned with reference sample)
  const [industryPreset, setIndustryPreset] = useState<IndustryPresetId>('all_5');
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemId>('all');
  const [selectedParam, setSelectedParam] = useState<ParameterKey>('cod');

  // Live sensor simulation (gentle, realistic industrial drift)
  const [rawRecords, setRawRecords] = useState<SensorRecord[]>(RAW_SENSOR_RECORDS);
  const [liveValues, setLiveValues] = useState<Record<ParameterKey, number>>({
    ph: 7.25,
    cod: 58.4,
    tss: 46.0,
    nh3n: 1.35,
    debit: 21.01,
  });
  const [clockText, setClockText] = useState<string>('09:12:49');

  // Operator Auth Modal
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [isOperatorLoggedIn, setIsOperatorLoggedIn] = useState<boolean>(false);
  const [operatorId, setOperatorId] = useState<string>('OP-SPARING-01');
  const [password, setPassword] = useState<string>('');

  // Sync dark class on root html element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Gentle live telemetry tick every 3 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setClockText(`${hh}:${mm}:${ss}`);

      setLiveValues((prev) => {
        const next = {
          ph: Number(
            Math.min(8.4, Math.max(6.5, prev.ph + (Math.random() - 0.5) * 0.05)).toFixed(2)
          ),
          cod: Number(
            Math.min(78, Math.max(44, prev.cod + (Math.random() - 0.5) * 1.1)).toFixed(1)
          ),
          tss: Number(
            Math.min(75, Math.max(32, prev.tss + (Math.random() - 0.5) * 1.2)).toFixed(1)
          ),
          nh3n: Number(
            Math.min(1.75, Math.max(0.95, prev.nh3n + (Math.random() - 0.5) * 0.05)).toFixed(2)
          ),
          debit: Number(
            Math.min(32, Math.max(15, prev.debit + (Math.random() - 0.5) * 0.4)).toFixed(2)
          ),
        };

        setRawRecords((old) => [
          {
            id: `live-${Date.now()}`,
            timestamp: `2026-11-26 ${hh}:${mm}:${ss}`,
            shortTime: `${hh}:${mm}`,
            ...next,
            transmitted: true,
          },
          ...old.slice(0, 19),
        ]);

        return next;
      });
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  const t = translations[lang];

  const handleConfirmLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOperatorLoggedIn(true);
    setLoginModalOpen(false);
    setPassword('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <TopBar
        lang={lang}
        theme={theme}
        isOperatorLoggedIn={isOperatorLoggedIn}
        onChangeLang={setLang}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={() => setIsOperatorLoggedIn(false)}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          lang={lang}
          activeNav={activeNav}
          collapsed={sidebarCollapsed}
          onSelectNav={setActiveNav}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-4 lg:p-5 overflow-y-auto">
            {activeNav === 'overview' && (
              <OverviewView
                lang={lang}
                theme={theme}
                liveValues={liveValues}
                historyRecords={rawRecords}
                industryPreset={industryPreset}
                selectedSubsystem={selectedSubsystem}
                selectedParam={selectedParam}
                onChangePreset={setIndustryPreset}
                onSelectSubsystem={setSelectedSubsystem}
                onSelectParam={setSelectedParam}
              />
            )}

            {activeNav === 'analytics' && (
              <AnalyticsView lang={lang} theme={theme} rawRecords={rawRecords} />
            )}

            {activeNav === 'system' && <SystemView lang={lang} />}

            {activeNav === 'location' && <LocationWeatherView lang={lang} />}
          </main>

          {/* Bottom Station Status Footer */}
          <footer className="h-9 px-4 lg:px-6 border-t border-line bg-surface flex flex-wrap items-center justify-between text-[11px] text-muted shrink-0">
            <div className="flex items-center gap-2 font-mono font-medium text-ink">
              <Radio className="w-3.5 h-3.5 text-muted" />
              <span>{t.stationId}</span>
              {isOperatorLoggedIn && (
                <span className="px-1.5 py-0.2 rounded border border-line bg-subtle text-[10px]">
                  {t.operatorActive}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 font-mono">
              <span className="hidden sm:inline-flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                <span>{lang === 'id' ? 'Kamis, 26 November 2026' : 'Thursday, 26 November 2026'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Clock className="w-3 h-3" />
                <span>{clockText}</span>
              </span>
              <span
                className="inline-flex items-center gap-1.5 font-sans font-medium"
                style={{ color: 'var(--status-ok-text)' }}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>{t.connectedEthernet}</span>
              </span>
            </div>
          </footer>
        </div>
      </div>

      {/* Crisp Matte Operator Login Modal */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-md border border-line-strong bg-surface p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-ink">{t.loginModalTitle}</h2>
                <p className="text-xs text-muted mt-0.5">{t.loginModalDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                className="p-1 text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">{t.usernameLabel}</label>
                <input
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded border border-line bg-canvas text-ink focus:outline-none focus:border-ink"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">{t.passwordLabel}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs font-mono rounded border border-line bg-canvas text-ink focus:outline-none focus:border-ink"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-line bg-canvas text-muted hover:text-ink"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded border border-ink bg-ink text-surface hover:opacity-90"
                >
                  {t.confirmLoginBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
