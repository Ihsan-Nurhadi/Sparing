import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Download,
  FileSpreadsheet,
  HardDrive,
  LineChart as LineChartIcon,
  RefreshCw,
  ShieldCheck,
  Table2,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AnalyticsTab,
  Language,
  ParameterKey,
  SensorRecord,
  ThemeMode,
} from '../../types/sparing';
import {
  DAILY_AVERAGE_RECORDS,
  HOURLY_AVERAGE_RECORDS,
  PARAMETERS,
} from '../../data/mockSparingData';
import { translations } from '../../i18n/translations';

interface AnalyticsViewProps {
  lang: Language;
  theme: ThemeMode;
  rawRecords: SensorRecord[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ lang, theme, rawRecords }) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('chart');
  const [interval, setIntervalValue] = useState<'2m' | '1h' | '1d'>('1h');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isFilterApplied, setIsFilterApplied] = useState<boolean>(false);
  const [visibleParams, setVisibleParams] = useState<ParameterKey[]>([
    'ph',
    'cod',
    'tss',
    'nh3n',
    'debit',
  ]);

  // Report state
  const [reportType, setReportType] = useState<'raw' | 'average'>('raw');
  const [usbConnected, setUsbConnected] = useState<boolean>(false);
  const [downloadNotice, setDownloadNotice] = useState<boolean>(false);

  const activeDataset = useMemo(() => {
    let base: SensorRecord[] =
      interval === '2m'
        ? rawRecords
        : interval === '1h'
        ? HOURLY_AVERAGE_RECORDS
        : DAILY_AVERAGE_RECORDS;

    if (isFilterApplied && dateFilter) {
      const filtered = base.filter((r) => r.timestamp.startsWith(dateFilter));
      return filtered.length > 0 ? filtered : base;
    }
    return base;
  }, [interval, rawRecords, isFilterApplied, dateFilter]);

  const chartData = useMemo(() => {
    return [...activeDataset].reverse();
  }, [activeDataset]);

  const toggleParam = (key: ParameterKey) => {
    setVisibleParams((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev
        : [...prev, key]
    );
  };

  const handleExportCsv = () => {
    const source = reportType === 'raw' ? rawRecords : HOURLY_AVERAGE_RECORDS;
    const header = 'TIMESTAMP,pH,COD (mg/L),TSS (mg/L),NH3-N (mg/L),DISCHARGE_RATE (m3/h),STATUS\n';
    const rows = source
      .map(
        (r) =>
          `${r.timestamp},${r.ph.toFixed(2)},${r.cod.toFixed(2)},${r.tss.toFixed(2)},${r.nh3n.toFixed(
            2
          )},${r.debit.toFixed(2)},${r.transmitted ? 'TRANSMITTED' : 'QUEUED'}`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SPARING-01_${reportType}_2026-11-26.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadNotice(true);
    setTimeout(() => setDownloadNotice(false), 3500);
  };

  const tabs: Array<{ id: AnalyticsTab; label: string; icon: React.ReactNode }> = [
    { id: 'chart', label: t.tabChart, icon: <LineChartIcon className="w-3.5 h-3.5" /> },
    { id: 'raw', label: t.tabRaw, icon: <Table2 className="w-3.5 h-3.5" /> },
    { id: 'average', label: t.tabAverage, icon: <Table2 className="w-3.5 h-3.5" /> },
    { id: 'report', label: t.tabReport, icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
    { id: 'performance', label: t.tabPerformance, icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  const gridStroke = theme === 'dark' ? '#242424' : '#e4e7ec';
  const axisStroke = theme === 'dark' ? '#a3a3a3' : '#64748b';

  return (
    <div className="space-y-4">
      {/* Top Filter & Interval Bar (Matching PDF Pages 4, 6, 7) */}
      <div className="rounded-md border border-line bg-surface p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-line bg-canvas text-xs text-muted flex-1 max-w-md">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-ink text-xs focus:outline-none font-mono"
            />
            <span className="truncate text-[11px] text-muted hidden sm:inline">
              {isFilterApplied && dateFilter ? t.activeFilterNotice : t.defaultFilterNotice}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsFilterApplied(Boolean(dateFilter))}
            className="px-3 py-1.5 text-xs font-medium rounded border border-ink bg-ink text-surface hover:opacity-90 transition-opacity"
          >
            {t.filterBtn}
          </button>

          {isFilterApplied && (
            <button
              type="button"
              onClick={() => {
                setDateFilter('');
                setIsFilterApplied(false);
              }}
              className="px-2.5 py-1.5 text-xs font-medium rounded border border-line bg-subtle text-muted hover:text-ink"
            >
              {t.resetFilterBtn}
            </button>
          )}
        </div>

        {/* Interval Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="interval-select" className="text-xs text-muted">
            {t.selectInterval}:
          </label>
          <select
            id="interval-select"
            value={interval}
            onChange={(e) => setIntervalValue(e.target.value as '2m' | '1h' | '1d')}
            className="text-xs font-medium rounded border border-line bg-canvas text-ink px-3 py-1.5 focus:outline-none focus:border-ink"
          >
            <option value="2m">{t.interval2Min}</option>
            <option value="1h">{t.interval1Hour}</option>
            <option value="1d">{t.intervalDaily}</option>
          </select>
        </div>
      </div>

      {/* Segmented Sub-Navigation Tabs */}
      <div className="rounded-md border border-line bg-surface overflow-hidden">
        <div className="flex overflow-x-auto border-b border-line bg-canvas px-2 pt-2 gap-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t border-t border-x transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-surface text-ink border-line -mb-px pb-[11px]'
                    : 'bg-transparent text-muted border-transparent hover:text-ink'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: SENSOR TREND CHART */}
        {activeTab === 'chart' && (
          <div className="p-4 lg:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">
                {t.sensorTrendTitle}
              </h2>
              <span className="text-xs font-mono text-muted">
                SPARING-01 · {interval === '2m' ? t.interval2Min : interval === '1h' ? t.interval1Hour : t.intervalDaily}
              </span>
            </div>

            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={true} />
                  <XAxis
                    dataKey="shortTime"
                    stroke={axisStroke}
                    tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={axisStroke}
                    tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                      borderColor: theme === 'dark' ? '#363636' : '#c7cdd6',
                      borderRadius: '4px',
                      boxShadow: 'none',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  {PARAMETERS.map((param) =>
                    visibleParams.includes(param.key) ? (
                      <Line
                        key={param.key}
                        type="monotone"
                        dataKey={param.key}
                        name={`${param.code} (${param.unit})`}
                        stroke={theme === 'dark' ? param.hexDark : param.hexLight}
                        strokeWidth={2}
                        dot={{ r: 2.5, strokeWidth: 0, fill: theme === 'dark' ? param.hexDark : param.hexLight }}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        isAnimationActive={false}
                      />
                    ) : null
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Interactive 5-Parameter Series Toggle Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-line">
              {PARAMETERS.map((param) => {
                const active = visibleParams.includes(param.key);
                const color = theme === 'dark' ? param.hexDark : param.hexLight;
                return (
                  <button
                    key={param.key}
                    type="button"
                    onClick={() => toggleParam(param.key)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                      active
                        ? 'bg-subtle text-ink border-line-strong'
                        : 'bg-surface text-muted border-line opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span>{param.code}</span>
                    {active && <Check className="w-3 h-3 text-ink" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2 & TAB 3: RAW DATA LOG & AVERAGE DATA TABLE */}
        {(activeTab === 'raw' || activeTab === 'average') && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <th className="py-3 px-4">{t.timestampCol}</th>
                  <th className="py-3 px-4">pH</th>
                  <th className="py-3 px-4">COD (mg/L)</th>
                  <th className="py-3 px-4">TSS (mg/L)</th>
                  <th className="py-3 px-4">NH3-N (mg/L)</th>
                  <th className="py-3 px-4">DISCHARGE RATE (m³/h)</th>
                  <th className="py-3 px-4 text-right">{t.statusCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs font-mono tabular-nums">
                {(activeTab === 'raw'
                  ? rawRecords
                  : interval === '1d'
                  ? DAILY_AVERAGE_RECORDS
                  : HOURLY_AVERAGE_RECORDS
                ).map((row) => (
                  <tr key={row.id} className="hover:bg-canvas transition-colors">
                    <td className="py-3 px-4 text-ink">{row.timestamp}</td>
                    <td className="py-3 px-4 text-ink">{row.ph.toFixed(2)}</td>
                    <td className="py-3 px-4 text-ink">{row.cod.toFixed(2)}</td>
                    <td className="py-3 px-4 text-ink">{row.tss.toFixed(2)}</td>
                    <td className="py-3 px-4 text-ink">{row.nh3n.toFixed(2)}</td>
                    <td className="py-3 px-4 text-ink">{row.debit.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      <span
                        className="inline-block px-2 py-0.5 text-[11px] font-medium rounded border"
                        style={{
                          backgroundColor: 'var(--status-ok-bg)',
                          color: 'var(--status-ok-text)',
                          borderColor: 'var(--status-ok-border)',
                        }}
                      >
                        {t.sentBadge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: REPORT & EXPORT UTILITY (PDF Page 7 Left) */}
        {activeTab === 'report' && (
          <div className="p-5 lg:p-6 max-w-3xl space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink">{t.selectDataType}</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'raw' | 'average')}
                className="w-full text-xs font-medium rounded border border-line bg-canvas text-ink px-3 py-2.5 focus:outline-none focus:border-ink"
              >
                <option value="raw">{t.tabRaw} (5 Parameter)</option>
                <option value="average">{t.tabAverage} — {t.interval1Hour}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink">{t.selectFlashdisk}</label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[240px] flex items-center gap-2.5 px-3 py-2.5 rounded border border-line bg-canvas text-xs">
                  <HardDrive className="w-4 h-4 text-muted shrink-0" />
                  <span className={usbConnected ? 'text-ink font-medium' : 'text-muted'}>
                    {usbConnected ? t.usbDetected : t.noFlashdisk}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUsbConnected((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded border border-line bg-surface text-ink hover:border-line-strong"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.simulateUsb}</span>
                </button>
              </div>
            </div>

            <div
              className="p-3.5 rounded border text-xs"
              style={{
                backgroundColor: 'var(--status-warn-bg)',
                color: 'var(--status-warn-text)',
                borderColor: 'var(--status-warn-border)',
              }}
            >
              {t.dateFilterHint}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded border border-ink bg-ink text-surface text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadCsvBtn}</span>
              </button>

              {downloadNotice && (
                <span
                  className="px-3 py-1.5 rounded border text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--status-ok-bg)',
                    color: 'var(--status-ok-text)',
                    borderColor: 'var(--status-ok-border)',
                  }}
                >
                  {t.downloadSuccess}
                </span>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: TRANSMISSION PERFORMANCE (PDF Page 7 Right) */}
        {activeTab === 'performance' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <th className="py-3 px-4">{t.timestampCol}</th>
                    <th className="py-3 px-4">pH</th>
                    <th className="py-3 px-4">COD</th>
                    <th className="py-3 px-4">TSS</th>
                    <th className="py-3 px-4">NH3-N</th>
                    <th className="py-3 px-4">DISCHARGE RATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs font-mono tabular-nums">
                  {HOURLY_AVERAGE_RECORDS.map((row) => (
                    <tr key={row.id} className="hover:bg-canvas">
                      <td className="py-2.5 px-4 text-ink">{row.timestamp}</td>
                      <td className="py-2.5 px-4 text-ink">{row.ph.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-ink">{row.cod.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-ink">{row.tss.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-ink">{row.nh3n.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-ink">{row.debit.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary SLA KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-line border-t border-line bg-canvas">
              <div className="p-3.5 text-center">
                <span className="block text-[11px] text-muted">{t.totalData}</span>
                <span className="mt-1 block text-base font-mono font-semibold text-ink">24</span>
              </div>
              <div className="p-3.5 text-center">
                <span className="block text-[11px] text-muted">{t.dataSent}</span>
                <span className="mt-1 block text-base font-mono font-semibold text-ink">24</span>
              </div>
              <div className="p-3.5 text-center">
                <span className="block text-[11px] text-muted">{t.dataLoss}</span>
                <span className="mt-1 block text-base font-mono font-semibold text-ink">0</span>
              </div>
              <div className="p-3.5 text-center">
                <span className="block text-[11px] text-muted">{t.percentSent}</span>
                <span
                  className="mt-1 block text-base font-mono font-semibold"
                  style={{ color: 'var(--status-ok-text)' }}
                >
                  100.00%
                </span>
              </div>
              <div className="p-3.5 text-center">
                <span className="block text-[11px] text-muted">{t.percentLoss}</span>
                <span className="mt-1 block text-base font-mono font-semibold text-muted">
                  0.00%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
