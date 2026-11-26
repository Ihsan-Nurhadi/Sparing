import React, { useState } from 'react';
import { CheckCircle2, Database, RefreshCw, RotateCcw, Server } from 'lucide-react';
import { Language } from '../../types/sparing';
import { DIAGNOSTIC_ITEMS } from '../../data/mockSparingData';
import { translations } from '../../i18n/translations';

interface SystemViewProps {
  lang: Language;
}

export const SystemView: React.FC<SystemViewProps> = ({ lang }) => {
  const t = translations[lang];
  const [scope, setScope] = useState<'local' | 'server'>('local');
  const [testing, setTesting] = useState(false);
  const [lastCheckOverride, setLastCheckOverride] = useState<string | null>(null);
  const [resetBanner, setResetBanner] = useState(false);

  const items = DIAGNOSTIC_ITEMS.filter((item) => item.scope === scope);

  const handleRetest = () => {
    setTesting(true);
    setTimeout(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setLastCheckOverride(`${hh}:${mm}:${ss}`);
      setTesting(false);
    }, 650);
  };

  const handleResetSync = () => {
    setResetBanner(true);
    setTimeout(() => setResetBanner(false), 3500);
  };

  return (
    <div className="w-full space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-3.5">
        {/* Local / Server Segmented Switch */}
        <div className="inline-flex rounded border border-line bg-canvas p-0.5">
          <button
            type="button"
            onClick={() => setScope('local')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${
              scope === 'local'
                ? 'bg-surface text-ink border border-line'
                : 'text-muted hover:text-ink border border-transparent'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t.localTab}</span>
          </button>
          <button
            type="button"
            onClick={() => setScope('server')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${
              scope === 'server'
                ? 'bg-surface text-ink border border-line'
                : 'text-muted hover:text-ink border border-transparent'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>{t.serverTab}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRetest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-ink bg-ink text-surface text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? t.retesting : t.retestConnection}</span>
          </button>

          <button
            type="button"
            onClick={handleResetSync}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-line-strong bg-subtle text-ink text-xs font-medium hover:bg-canvas transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetTransmission}</span>
          </button>
        </div>
      </div>

      {resetBanner && (
        <div
          className="p-3 rounded border text-xs font-medium"
          style={{
            backgroundColor: 'var(--status-ok-bg)',
            color: 'var(--status-ok-text)',
            borderColor: 'var(--status-ok-border)',
          }}
        >
          {t.resetSuccessMsg}
        </div>
      )}

      {/* Flat Matte Diagnostic Cards (Zero Pastel Gloss) */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-md border border-line bg-surface p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div
                className="w-8 h-8 rounded border flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  backgroundColor: 'var(--status-ok-bg)',
                  color: 'var(--status-ok-text)',
                  borderColor: 'var(--status-ok-border)',
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  {lang === 'id' ? item.titleId : item.titleEn}
                </h3>
                <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--status-ok-text)' }}>
                  {t.statusSuccess}
                </p>
                <p className="text-xs text-muted mt-0.5 font-mono">
                  {lang === 'id' ? item.detailPrefixId : item.detailPrefixEn}{' '}
                  {lastCheckOverride || item.lastChecked}
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-block px-2.5 py-1 rounded border border-line bg-canvas text-[11px] font-mono text-muted">
              OK · 200
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
