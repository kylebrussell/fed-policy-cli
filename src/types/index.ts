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
  similarityScore: number; // New field for ranking
  data: EconomicDataPoint[]; // The actual data for the period
  fedPolicyActions: FedPolicyAction[]; // Timeline of Fed actions
}

export interface FedPolicyAction {
  date: string;
  action: 'HIKE' | 'CUT' | 'HOLD';
  changeBps?: number; // Basis points change
}