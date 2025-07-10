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
  minTimeGapMonths?: number; // Optional minimum gap between analogues (default: 6 months)
  excludeUnreliableData?: boolean; // Optional flag to exclude pre-1960 data (default: true)
  excludeRecentYears?: number; // Optional number of recent years to exclude from analysis
  focusEras?: string[]; // Optional list of economic eras to focus on (exclude all others)
  excludeEras?: string[]; // Optional list of economic eras to exclude from analysis
  excludeDateRanges?: DateRange[]; // Optional custom date ranges to exclude
}

export interface DateRange {
  start: string; // YYYY-MM-DD format
  end: string; // YYYY-MM-DD format
  description?: string; // Optional description of what this range represents
}

export interface EconomicTemplate {
  id: string; // Unique identifier for the template
  name: string; // Display name for the template
  description: string; // Detailed description of what this template analyzes
  category: 'crisis' | 'policy' | 'inflation' | 'recession' | 'general'; // Category for organization
  indicators: WeightedIndicator[]; // Predefined indicator weights
  defaultParams?: Partial<ScenarioParams>; // Optional default parameters (months, exclusions, etc.)
  focusEras?: string[]; // Recommended eras to focus on
  excludeEras?: string[]; // Recommended eras to exclude
  economicRationale: string; // Explanation of why these indicators and weights make sense
  examples?: string[]; // Example historical periods this template might find
}

export interface HistoricalAnalogue {
  startDate: string;
  endDate: string;
  similarityScore: number;
  data: EconomicDataPoint[];
  fedPolicyActions: FedPolicyAction[];
  dataQuality?: {
    reliability: 'high' | 'medium' | 'low';
    warnings: string[];
  };
}

export interface FedPolicyAction {
  date: string;
  action: 'HIKE' | 'CUT' | 'HOLD';
  changeBps?: number;
}
