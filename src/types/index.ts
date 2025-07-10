// /src/types/index.ts

// A flexible data point that can hold any indicator
export interface EconomicDataPoint {
  date: string; // YYYY-MM-DD
  [indicator: string]: number | string; // e.g., UNRATE: 4.1, CPIAUCSL_yoy: 3.2
}

// Defines a user-selected indicator and its weight
export interface WeightedIndicator {
  id: string; // e.g., 'UNRATE'
  weight: number; // e.g., 0.5
}

export interface ScenarioParams {
  indicators: WeightedIndicator[];
  windowMonths: number;
}

export interface HistoricalAnalogue {
  startDate: string;
  endDate: string;
  similarityScore: number;
  data: EconomicDataPoint[];
  fedPolicyActions: FedPolicyAction[];
}

export interface FedPolicyAction {
  date: string;
  action: 'HIKE' | 'CUT' | 'HOLD';
  changeBps?: number;
}
