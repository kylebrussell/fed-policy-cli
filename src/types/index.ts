// /src/types/index.ts

export interface EconomicDataPoint {
  date: string; // YYYY-MM-DD
  unemployment_rate?: number;
  cpi_yoy?: number;
  fed_funds_rate?: number;
}

export interface ScenarioParams {
  unemployment: { min: number; max: number };
  inflation: { min: number; max: number };
  windowMonths: number;
  useTariffContext: boolean;
}

export interface HistoricalAnalogue {
  startDate: string;
  endDate: string;
  avgUnemployment: number;
  avgInflation: number;
  startRate: number;
  endRate: number;
  outcome: 'HIKE' | 'CUT' | 'HOLD';
}
