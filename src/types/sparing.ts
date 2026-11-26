export type Language = 'id' | 'en';
export type ThemeMode = 'light' | 'dark';

export type ParameterKey = 'ph' | 'cod' | 'tss' | 'nh3n' | 'debit';

export type NavSection = 'overview' | 'analytics' | 'system' | 'location';
export type AnalyticsTab = 'chart' | 'raw' | 'average' | 'report' | 'performance';

export type SubsystemId =
  | 'all'
  | 'solar'
  | 'instrument'
  | 'cabinet'
  | 'sampling'
  | 'debit'
  | 'gate';

export type IndustryPresetId = 'all_5' | 'agro_4' | 'oilgas_4' | 'mining_3';

export interface ParameterMeta {
  key: ParameterKey;
  code: string;
  nameId: string;
  nameEn: string;
  fullNameId: string;
  fullNameEn: string;
  unit: string;
  minSafe?: number;
  maxSafe: number;
  scaleMax: number;
  decimals: number;
  colorVar: string;
  hexLight: string;
  hexDark: string;
  probeNameId: string;
  probeNameEn: string;
  methodId: string;
  methodEn: string;
}

export interface SensorRecord {
  id: string;
  timestamp: string;
  shortTime: string;
  ph: number;
  cod: number;
  tss: number;
  nh3n: number;
  debit: number;
  transmitted: boolean;
}

export interface IndustryPreset {
  id: IndustryPresetId;
  labelId: string;
  labelEn: string;
  sectorsId: string;
  sectorsEn: string;
  parameters: ParameterKey[];
}

export interface DiagnosticItem {
  id: string;
  titleId: string;
  titleEn: string;
  detailPrefixId: string;
  detailPrefixEn: string;
  lastChecked: string;
  status: 'ok' | 'warning';
  scope: 'local' | 'server';
}
