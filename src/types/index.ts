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
  volatilityContext?: VolatilityContext; // Optional FOMC volatility analysis
}

export interface FedPolicyAction {
  date: string;
  action: 'HIKE' | 'CUT' | 'HOLD';
  changeBps?: number;
}

export interface PolicyScenario {
  name: string;
  description: string;
  fedActions: FedPolicyAction[];
  marketImpact: {
    bonds: number; // Expected return %
    equities: number;
    dollar: number;
    gold: number;
    volatility: number;
  };
  probability: number;
  timeframe: string;
  triggers: string[];
}

export interface FredSeriesMetadata {
  name: string;
  type: 'level' | 'yoy' | 'yoy_quarterly';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

// Trading Recommendation System Interfaces

export interface TradingRecommendation {
  id: string;
  asset: string;
  assetClass: 'Bonds' | 'Equities' | 'Commodities' | 'Currencies' | 'Credit' | 'Options';
  action: 'BUY' | 'SELL' | 'HOLD' | 'SHORT';
  recommendation: {
    entryPrice?: number;
    entryRange?: { min: number; max: number };
    stopLoss?: number;
    profitTarget?: number;
    timeframe: string; // e.g., '3-6 months', '1-2 weeks'
    timing: 'IMMEDIATE' | 'WAIT_FOR_PULLBACK' | 'WAIT_FOR_BREAKOUT' | 'ON_FED_EVENT';
  };
  sizing: PositionSizing;
  confidence: number; // 0-100%
  reasoning: string;
  historicalContext: {
    avgReturn: number;
    winRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
    sampleSize: number;
  };
  riskFactors: string[];
  hedges?: HedgingRecommendation[];
  scenarioAnalysis: ScenarioOutcome[];
}

export interface PositionSizing {
  portfolioWeight: number; // Percentage of portfolio (0-100)
  maxPosition: number; // Maximum position size in dollars
  riskBudget: number; // Risk allocation in percentage
  methodology: 'FIXED_WEIGHT' | 'VOLATILITY_ADJUSTED' | 'KELLY_CRITERION' | 'RISK_PARITY';
  volatilityAdjustment?: number;
  correlationAdjustment?: number;
  riskLimits: {
    maxSinglePosition: number;
    maxSectorExposure: number;
    maxDrawdownLimit: number;
  };
}

export interface HedgingRecommendation {
  hedgeType: 'DURATION_HEDGE' | 'CURVE_HEDGE' | 'VOLATILITY_HEDGE' | 'CROSS_ASSET_HEDGE';
  instrument: string;
  hedgeRatio: number; // 0-100% of primary position
  description: string;
  scenario: string; // When this hedge activates
  cost: number; // Cost in basis points or percentage
}

export interface ScenarioOutcome {
  scenario: string;
  probability: number; // 0-100%
  expectedReturn: number; // Percentage return
  variance: number;
  timeToTarget: string;
  triggerEvents: string[];
}

export interface RiskMetrics {
  valueAtRisk: { 
    oneDay: number;
    oneWeek: number;
    oneMonth: number;
  };
  expectedShortfall: number;
  maxDrawdown: number;
  correlationRisk: number;
  concentrationRisk: number;
  liquidityRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface BacktestResult {
  strategy: string;
  period: { start: string; end: string };
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  trades: TradeResult[];
  benchmarkComparison?: {
    benchmark: string;
    alpha: number;
    beta: number;
    informationRatio: number;
  };
}

export interface TradeResult {
  entryDate: string;
  exitDate: string;
  asset: string;
  action: 'BUY' | 'SELL' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  return: number;
  duration: number; // days
  fedEventContext?: string;
}

// FOMC Volatility Analysis Types
export interface VolatilityContext {
  fomcEvents: FOMCEvent[];
  volatilityProfile: VolatilityProfile;
  optionsFlow: OptionsFlow;
  reactionPatterns: FOMCReactionPattern[];
}

export interface FOMCEvent {
  date: string;
  type: 'STATEMENT' | 'PRESS_CONFERENCE' | 'MINUTES' | 'SPEECH';
  rateChange?: number; // Basis points
  surpriseFactor: number; // -1 to 1 scale
  marketReaction: MarketReaction;
}

export interface MarketReaction {
  immediateVolSpike: number; // Percentage
  peakVolTime: string; // Minutes after announcement
  volDecayHalfLife: number; // Hours for vol to decay 50%
  priceMove: {
    spy: number;
    tlt: number;
    vix: number;
    move: number;
  };
}

export interface VolatilityProfile {
  preEventIV: VolatilitySurface;
  postEventIV: VolatilitySurface;
  historicalAverage: number;
  currentLevel: number;
  fomcPremium: number; // Extra vol priced in before FOMC
}

export interface VolatilitySurface {
  asset: string;
  timestamp: string;
  tenors: VolatilityTenor[];
  skew: VolatilitySkew;
}

export interface VolatilityTenor {
  expiration: string; // Days to expiration
  impliedVol: number;
  volume: number;
  openInterest: number;
}

export interface VolatilitySkew {
  putCallRatio: number;
  skewSlope: number; // Put skew vs call skew
  term90d25Delta: number; // 90-day 25-delta put skew
}

export interface OptionsFlow {
  putCallRatio: number;
  unusualActivity: UnusualOptionsActivity[];
  dealerPositioning: DealerPositioning;
  largePositions: LargePosition[];
}

export interface UnusualOptionsActivity {
  asset: string;
  strike: number;
  expiration: string;
  type: 'CALL' | 'PUT';
  volume: number;
  openInterest: number;
  impliedVol: number;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DealerPositioning {
  totalGamma: number;
  gammaFlipLevel: number; // Price level where dealer gamma flips
  hedgingPressure: 'BUYING' | 'SELLING' | 'NEUTRAL';
  estimatedFlow: number; // Expected hedging flow in millions
}

export interface LargePosition {
  asset: string;
  strike: number;
  expiration: string;
  type: 'CALL' | 'PUT';
  openInterest: number;
  estimatedNotional: number;
  significance: string;
}

export interface FOMCReactionPattern {
  patternType: 'IMMEDIATE_SPIKE' | 'DELAYED_REACTION' | 'REVERSAL' | 'SUSTAINED_MOVE';
  timeframe: string; // e.g., '30min', '2hours', '1day'
  frequency: number; // How often this pattern occurs (0-1)
  avgMagnitude: number; // Average size of move
  successRate: number; // Historical success rate
  tradingImplication: string;
}

// Vol-Adjusted Trading Recommendation
export interface VolAdjustedRecommendation extends TradingRecommendation {
  volatilityContext: {
    currentIV: number;
    historicalAverage: number;
    fomcPremium: number;
    decayRate: number;
    nextFOMC: string;
    daysToFOMC: number;
  };
  optionsStrategy?: {
    strategy: 'STRADDLE' | 'STRANGLE' | 'VOL_PLAY' | 'HEDGE' | 'CALENDAR' | 'BUTTERFLY';
    strikes: number[];
    expiration: string;
    expectedVolMove: number;
    breakEvenMoves: { upper: number; lower: number };
    cost: number;
    maxProfit: number;
    maxLoss: number;
  };
  volTiming: {
    entryWindow: string; // When to enter relative to FOMC
    exitWindow: string; // When to exit relative to FOMC
    reasoning: string;
  };
}
