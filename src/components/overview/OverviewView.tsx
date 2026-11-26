import React from 'react';
import { Cpu, SlidersHorizontal } from 'lucide-react';
import {
  IndustryPresetId,
  Language,
  ParameterKey,
  SensorRecord,
  SubsystemId,
  ThemeMode,
} from '../../types/sparing';
import {
  INDUSTRY_PRESETS,
  PARAMETERS,
  SUBSYSTEM_SPECS,
} from '../../data/mockSparingData';
import { translations } from '../../i18n/translations';
import { SparingStage3D } from '../three/SparingStage3D';

interface OverviewViewProps {
  lang: Language;
  theme: ThemeMode;
  liveValues: Record<ParameterKey, number>;
  historyRecords: SensorRecord[];
  industryPreset: IndustryPresetId;
  selectedSubsystem: SubsystemId;
  selectedParam: ParameterKey;
  onChangePreset: (preset: IndustryPresetId) => void;
  onSelectSubsystem: (sub: SubsystemId) => void;
  onSelectParam: (param: ParameterKey) => void;
}

const AreaSparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo < 1e-6 ? 1 : hi - lo;

  const pts = values.map((v, idx) => [
    (idx / (values.length - 1)) * 100,
    27 - ((v - lo) / span) * 23,
  ]);
  const linePath = 'M' + pts.map((q) => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(' L');
  const areaPath = `${linePath} L100 30 L0 30 Z`;
  const last = pts[pts.length - 1];

  return (
    <div className="relative h-6 w-full mt-1">
      <svg
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <path d={areaPath} fill={color} fillOpacity="0.14" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full border-2 border-surface"
        style={{
          backgroundColor: color,
          left: `${last[0]}%`,
          top: `${(last[1] / 30) * 100}%`,
        }}
      />
    </div>
  );
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  lang,
  theme,
  liveValues,
  historyRecords,
  industryPreset,
  selectedSubsystem,
  selectedParam,
  onChangePreset,
  onSelectSubsystem,
  onSelectParam,
}) => {
  const t = translations[lang];
  const currentPreset =
    INDUSTRY_PRESETS.find((p) => p.id === industryPreset) || INDUSTRY_PRESETS[0];

  const selectedParamMeta =
    PARAMETERS.find((p) => p.key === selectedParam) || PARAMETERS[0];

  return (
    <div className="space-y-4">
      {/* ============================================================
          TOP HERO ROW: WIDE 3D TOWER STAGE + 5 PARAMETER STACK
      ============================================================ */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-stretch">
        {/* Left: Sample-Matched 3D SPARING Stage */}
        <section
          className="rounded-lg border border-line bg-surface overflow-hidden h-[clamp(520px,76vh,730px)]"
          aria-label="SPARING-01 3D Stage"
        >
          <SparingStage3D
            lang={lang}
            theme={theme}
            liveValues={liveValues}
            enabledParams={currentPreset.parameters}
            selectedSubsystem={selectedSubsystem}
            selectedParam={selectedParam}
            onSelectSubsystem={onSelectSubsystem}
            onSelectParam={(param) => {
              if (param) onSelectParam(param);
            }}
          />
        </section>

        {/* Right: Industry Config + 5 Live Parameter Cards */}
        <aside className="flex flex-col gap-2.5 xl:h-[clamp(520px,76vh,730px)]">
          {/* Compact Industry Category Selector */}
          <div className="rounded-lg border border-line bg-surface px-3 py-2.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted" />
                <span>{t.industryConfig}</span>
              </div>
              <select
                value={industryPreset}
                onChange={(e) => onChangePreset(e.target.value as IndustryPresetId)}
                aria-label={t.industryConfig}
                className="text-xs font-medium rounded border border-line bg-canvas text-ink px-2 py-1 focus:outline-none focus:border-accent max-w-[195px] truncate"
              >
                {INDUSTRY_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {lang === 'id' ? preset.labelId : preset.labelEn}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-muted mt-1 truncate">
              {lang === 'id' ? currentPreset.sectorsId : currentPreset.sectorsEn}
            </p>
          </div>

          {/* 5 Parameter Cards matching reference stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 xl:grid-rows-5 gap-2.5 flex-1 min-h-0">
            {PARAMETERS.map((param) => {
              const isEnabled = currentPreset.parameters.includes(param.key);
              const isSelected = selectedParam === param.key;
              const value = liveValues[param.key];
              const color = theme === 'dark' ? param.hexDark : param.hexLight;

              const sparkValues = [...historyRecords]
                .slice(0, 12)
                .reverse()
                .map((r) => r[param.key]);

              const isWarn =
                (param.minSafe !== undefined &&
                  (value < param.minSafe + 0.25 || value > param.maxSafe - 0.25)) ||
                (param.minSafe === undefined && value > param.maxSafe * 0.8);

              const rangeLabel =
                param.minSafe !== undefined
                  ? `${t.safeRangeLabel}: ${param.minSafe.toFixed(1)} – ${param.maxSafe.toFixed(1)}${
                      param.key !== 'ph' ? ` ${param.unit}` : ''
                    }`
                  : `${t.thresholdLabel}: maks. ${param.maxSafe} ${param.unit}`;

              return (
                <button
                  key={param.key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    onSelectParam(param.key);
                    onSelectSubsystem(param.key === 'debit' ? 'debit' : 'sampling');
                  }}
                  className={`flex flex-col justify-between text-left px-3.5 py-2.5 rounded-lg border transition-colors min-h-0 ${
                    isSelected
                      ? 'border-accent bg-accent-soft'
                      : 'border-line bg-surface hover:border-line-strong'
                  } ${!isEnabled ? 'opacity-45' : ''}`}
                >
                  {/* Top row: color swatch, name, status dot */}
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[13px] font-semibold text-ink flex-1 truncate">
                      {lang === 'id' ? param.nameId : param.nameEn}
                    </span>
                    {isEnabled ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-medium"
                        style={{
                          color: isWarn ? 'var(--status-warn-text)' : 'var(--status-ok-text)',
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {isWarn ? t.warningStatus : t.normalStatus}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-muted">OFF</span>
                    )}
                  </div>

                  {/* Value + Unit */}
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <b className="font-mono font-medium text-2xl leading-none tabular-nums text-ink">
                      {value.toFixed(param.decimals)}
                    </b>
                    {param.key !== 'ph' && (
                      <span className="text-xs text-muted">{param.unit}</span>
                    )}
                  </div>

                  {/* Sparkline */}
                  <AreaSparkline values={sparkValues} color={color} />

                  {/* Safe range / limit caption */}
                  <span className="text-[11px] text-muted mt-0.5 truncate">{rangeLabel}</span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* ============================================================
          BOTTOM HARDWARE & PROBE TECHNICAL INSPECTOR STRIP
      ============================================================ */}
      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {t.hardwareInspector}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted">
            <span>{t[`sub_${selectedSubsystem}_title`]}</span>
            <span>·</span>
            <span className="text-ink font-medium">
              {lang === 'id' ? selectedParamMeta.probeNameId : selectedParamMeta.probeNameEn}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {SUBSYSTEM_SPECS[selectedSubsystem].map((spec, idx) => (
            <div key={idx} className="p-2.5 rounded border border-line bg-canvas">
              <span className="block text-[10.5px] text-muted">
                {lang === 'id' ? spec.labelId : spec.labelEn}
              </span>
              <span className="mt-0.5 block text-xs font-mono font-medium text-ink truncate">
                {spec.value}
              </span>
            </div>
          ))}
          <div className="p-2.5 rounded border border-line bg-canvas col-span-2">
            <span className="block text-[10.5px] text-muted">
              {lang === 'id' ? 'Metode Pengukuran Sensor Aktif' : 'Active Sensor Measurement Method'}
            </span>
            <span className="mt-0.5 block text-xs font-medium text-ink truncate">
              {lang === 'id' ? selectedParamMeta.methodId : selectedParamMeta.methodEn}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
