import React, { useState } from 'react';
import {
  Cloud,
  CloudSun,
  Compass,
  Crosshair,
  Droplets,
  Eye,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  Sun,
  Wind,
} from 'lucide-react';
import { Language } from '../../types/sparing';
import { STATION_LOCATION } from '../../data/mockSparingData';
import { translations } from '../../i18n/translations';

interface LocationWeatherViewProps {
  lang: Language;
}

export const LocationWeatherView: React.FC<LocationWeatherViewProps> = ({ lang }) => {
  const t = translations[lang];
  const [subTab, setSubTab] = useState<'location' | 'weather'>('location');
  const [zoom, setZoom] = useState<number>(1);
  const [refreshTime, setRefreshTime] = useState<string>(STATION_LOCATION.gpsUpdatedAt);

  const handleRefresh = () => {
    const now = new Date();
    setRefreshTime(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
        2,
        '0'
      )}:${String(now.getSeconds()).padStart(2, '0')}`
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Sub-navigation bar */}
      <div className="rounded-md border border-line bg-surface p-3.5 flex items-center justify-between gap-3">
        <div className="inline-flex rounded border border-line bg-canvas p-0.5">
          <button
            type="button"
            onClick={() => setSubTab('location')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${
              subTab === 'location'
                ? 'bg-surface text-ink border border-line'
                : 'text-muted hover:text-ink border border-transparent'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{t.locationTab}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('weather')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${
              subTab === 'weather'
                ? 'bg-surface text-ink border border-line'
                : 'text-muted hover:text-ink border border-transparent'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{t.weatherTab}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-line bg-canvas text-xs font-medium text-ink hover:border-line-strong"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t.reloadBtn}</span>
        </button>
      </div>

      {subTab === 'location' ? (
        <div className="space-y-4">
          {/* Latitude & Longitude Matte Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-md border border-line bg-surface p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t.latitude}
              </span>
              <p className="mt-1.5 text-2xl font-mono font-semibold tabular-nums text-ink">
                {STATION_LOCATION.latitude}
              </p>
            </div>
            <div className="rounded-md border border-line bg-surface p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t.longitude}
              </span>
              <p className="mt-1.5 text-2xl font-mono font-semibold tabular-nums text-ink">
                {STATION_LOCATION.longitude}
              </p>
            </div>
          </div>

          {/* GPS Status Strip */}
          <div
            className="rounded-md border p-3.5 flex items-center justify-between"
            style={{
              backgroundColor: 'var(--status-ok-bg)',
              color: 'var(--status-ok-text)',
              borderColor: 'var(--status-ok-border)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4" />
              <div>
                <p className="text-xs font-semibold">{t.gpsConnected}</p>
                <p className="text-[11px] font-mono opacity-90">
                  {t.lastUpdated}: {refreshTime}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-medium">{STATION_LOCATION.stationId}</span>
          </div>

          {/* Minimalist Architectural Topographic Vector Map */}
          <div className="relative rounded-md border border-line bg-surface overflow-hidden h-[420px]">
            <svg
              viewBox="0 0 800 340"
              className="w-full h-full bg-canvas transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            >
              {/* Subtle Coordinate Grid */}
              {[100, 200, 300, 400, 500, 600, 700].map((x) => (
                <line
                  key={`vx-${x}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={340}
                  stroke="var(--border-line)"
                  strokeWidth="1"
                />
              ))}
              {[68, 136, 204, 272].map((y) => (
                <line
                  key={`hy-${y}`}
                  x1={0}
                  y1={y}
                  x2={800}
                  y2={y}
                  stroke="var(--border-line)"
                  strokeWidth="1"
                />
              ))}

              {/* Minimal Topographic Contour Lines */}
              <path
                d="M 0 90 Q 220 130 420 75 T 800 110"
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <path
                d="M 0 250 Q 260 210 490 265 T 800 230"
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Effluent / River Monitoring Channel Path */}
              <path
                d="M 40 285 C 190 245, 310 185, 400 170 C 510 152, 630 165, 770 120"
                fill="none"
                stroke="var(--param-ph)"
                strokeWidth="12"
                strokeLinecap="round"
                opacity="0.22"
              />
              <path
                d="M 40 285 C 190 245, 310 185, 400 170 C 510 152, 630 165, 770 120"
                fill="none"
                stroke="var(--param-ph)"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Station Marker Pin at Center (400, 170) */}
              <circle cx="400" cy="170" r="16" fill="var(--param-nh3n)" opacity="0.18" />
              <circle cx="400" cy="170" r="6" fill="var(--param-nh3n)" />
              <rect
                x="354"
                y="130"
                width="92"
                height="24"
                rx="4"
                fill="var(--bg-surface)"
                stroke="var(--border-strong)"
              />
              <text
                x="400"
                y="146"
                textAnchor="middle"
                fill="var(--text-ink)"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                SPARING-01
              </text>
            </svg>

            {/* Bottom-Left Location Metadata */}
            <div className="absolute left-3 bottom-3 px-3 py-2 rounded border border-line bg-surface text-xs">
              <p className="font-semibold text-ink">
                {lang === 'id' ? STATION_LOCATION.villageId : STATION_LOCATION.villageEn}
              </p>
              <p className="text-[11px] text-muted">
                {lang === 'id' ? STATION_LOCATION.districtId : STATION_LOCATION.districtEn}
              </p>
            </div>

            {/* Bottom-Right Zoom Controls */}
            <div className="absolute right-3 bottom-3 flex flex-col rounded border border-line bg-surface overflow-hidden">
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-2 text-muted hover:text-ink border-b border-line"
                title="Center"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.2).toFixed(1)))}
                className="p-2 text-muted hover:text-ink border-b border-line"
                title="Zoom In"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.2).toFixed(1)))}
                className="p-2 text-muted hover:text-ink"
                title="Zoom Out"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* WEATHER SCREEN (Matching PDF Page 11 without pastel gradients) */
        <div className="space-y-4">
          {/* Site Header Card */}
          <div className="rounded-md border border-line bg-surface p-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded border border-line bg-canvas flex items-center justify-center text-ink mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  {lang === 'id' ? STATION_LOCATION.villageId : STATION_LOCATION.villageEn}
                </h3>
                <p className="text-xs text-muted">
                  {lang === 'id' ? STATION_LOCATION.districtId : STATION_LOCATION.districtEn} ·{' '}
                  {t.distanceFromStation}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-muted">
              {t.lastUpdated}: {STATION_LOCATION.weatherUpdatedAt}
            </span>
          </div>

          {/* Current Weather Matte Card */}
          <div className="rounded-md border border-line bg-surface p-5">
            <span className="text-xs font-medium text-muted">{t.currentWeather}</span>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-md border border-line bg-canvas flex items-center justify-center text-ink">
                  <Sun className="w-7 h-7 stroke-[1.5]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-mono font-semibold text-ink">
                      {STATION_LOCATION.tempC}
                    </span>
                    <span className="text-lg font-mono text-muted">°C</span>
                  </div>
                  <p className="text-sm font-medium text-ink">{t.sunny}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded border border-line bg-canvas">
                  <div className="flex items-center gap-1.5 text-muted">
                    <Droplets className="w-3.5 h-3.5" />
                    <span>{t.humidity}</span>
                  </div>
                  <p className="mt-1 font-mono font-semibold text-ink">
                    {STATION_LOCATION.humidity}
                  </p>
                </div>
                <div className="p-2.5 rounded border border-line bg-canvas">
                  <div className="flex items-center gap-1.5 text-muted">
                    <Wind className="w-3.5 h-3.5" />
                    <span>{t.wind}</span>
                  </div>
                  <p className="mt-1 font-mono font-semibold text-ink">{STATION_LOCATION.wind}</p>
                </div>
                <div className="p-2.5 rounded border border-line bg-canvas">
                  <div className="flex items-center gap-1.5 text-muted">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.visibility}</span>
                  </div>
                  <p className="mt-1 font-mono font-semibold text-ink">
                    {STATION_LOCATION.visibility}
                  </p>
                </div>
                <div className="p-2.5 rounded border border-line bg-canvas">
                  <div className="flex items-center gap-1.5 text-muted">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>{t.cloudCover}</span>
                  </div>
                  <p className="mt-1 font-mono font-semibold text-ink">
                    {STATION_LOCATION.cloudCover}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Hour Weather Forecast Strip */}
          <div className="rounded-md border border-line bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">{t.weatherForecast}</h3>
              <span className="text-xs text-muted">{t.todayLabel}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {STATION_LOCATION.forecasts.map((f) => (
                <div
                  key={f.time}
                  className="p-3.5 rounded border border-line bg-canvas text-center space-y-2"
                >
                  <span className="block text-xs font-mono text-muted">{f.time}</span>
                  <div className="flex justify-center text-ink">
                    {f.condition === 'sunny' ? (
                      <Sun className="w-5 h-5 stroke-[1.5]" />
                    ) : (
                      <CloudSun className="w-5 h-5 stroke-[1.5]" />
                    )}
                  </div>
                  <span className="block text-sm font-mono font-semibold text-ink">{f.temp}°C</span>
                  <span className="block text-[11px] text-muted">
                    {f.condition === 'sunny' ? t.sunny : t.partlyCloudy}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
