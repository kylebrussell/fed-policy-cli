// /src/services/marketExpectations.ts
import { EconomicDataPoint } from '../types';
import { FOMCProjection, getLatestProjections } from './database';

export interface YieldCurvePoint {
  maturity: string;
  yield: number;
  maturityMonths: number;
}

export interface MarketExpectation {
  date: string;
  impliedRate: number;
  fedProjection?: number;
  divergence?: number;
  signal: 'HAWKISH' | 'DOVISH' | 'NEUTRAL';
}

export interface YieldCurveAnalysis {
  date: string;
  curve: YieldCurvePoint[];
  slope2Y10Y: number;
  slope3M10Y: number;
  isInverted: boolean;
  inversionSignal: 'RECESSION_RISK' | 'NORMAL' | 'STEEP';
}

export interface MarketExpectationsAnalysis {
  latestYieldCurve: YieldCurveAnalysis;
  fedProjections: FOMCProjection[];
  marketVsFedDivergence: MarketExpectation[];
  tradingSignals: TradingSignal[];
}

export interface TradingSignal {
  type: 'RATE_CUT_OPPORTUNITY' | 'RATE_HIKE_RISK' | 'YIELD_CURVE_PLAY' | 'FED_PIVOT';
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  description: string;
  confidence: number;
  timeframe: string;
}

// Extract latest yield curve from economic data
export const extractYieldCurve = (data: EconomicDataPoint[]): YieldCurveAnalysis | null => {
  if (data.length === 0) return null;
  
  const latestData = data[data.length - 1];
  const curve: YieldCurvePoint[] = [];
  
  // Map Treasury series to yield curve points
  const yieldMapping = [
    { series: 'DGS3MO', maturity: '3M', months: 3 },
    { series: 'DGS6MO', maturity: '6M', months: 6 },
    { series: 'DGS1', maturity: '1Y', months: 12 },
    { series: 'DGS2', maturity: '2Y', months: 24 },
    { series: 'DGS5', maturity: '5Y', months: 60 },
    { series: 'DGS10', maturity: '10Y', months: 120 },
    { series: 'DGS30', maturity: '30Y', months: 360 }
  ];
  
  yieldMapping.forEach(({ series, maturity, months }) => {
    if (latestData[series] != null) {
      curve.push({
        maturity,
        yield: latestData[series],
        maturityMonths: months
      });
    }
  });
  
  if (curve.length < 3) return null;
  
  // Calculate key slopes
  const find = (maturity: string) => curve.find(p => p.maturity === maturity)?.yield;
  const slope2Y10Y = (find('10Y') || 0) - (find('2Y') || 0);
  const slope3M10Y = (find('10Y') || 0) - (find('3M') || 0);
  
  // Determine inversion status
  const isInverted = slope2Y10Y < 0 || slope3M10Y < 0;
  let inversionSignal: 'RECESSION_RISK' | 'NORMAL' | 'STEEP' = 'NORMAL';
  
  if (isInverted) {
    inversionSignal = 'RECESSION_RISK';
  } else if (slope2Y10Y > 200) { // 200 basis points = very steep
    inversionSignal = 'STEEP';
  }
  
  return {
    date: latestData.date,
    curve: curve.sort((a, b) => a.maturityMonths - b.maturityMonths),
    slope2Y10Y,
    slope3M10Y,
    isInverted,
    inversionSignal
  };
};

// Calculate market-implied rate expectations from yield curve
export const calculateMarketImpliedRates = (yieldCurve: YieldCurveAnalysis): MarketExpectation[] => {
  const expectations: MarketExpectation[] = [];
  
  // Use short-term yields as proxy for market rate expectations
  const shortTermYield = yieldCurve.curve.find(p => p.maturity === '2Y')?.yield;
  const currentFedFunds = yieldCurve.curve.find(p => p.maturity === '3M')?.yield;
  
  if (shortTermYield && currentFedFunds) {
    // 2Y yield implies market expectations for average Fed rate over 2 years
    const impliedRate = shortTermYield;
    
    let signal: 'HAWKISH' | 'DOVISH' | 'NEUTRAL' = 'NEUTRAL';
    const rateDiff = impliedRate - currentFedFunds;
    
    if (rateDiff > 50) { // 50 basis points
      signal = 'HAWKISH';
    } else if (rateDiff < -50) {
      signal = 'DOVISH';
    }
    
    expectations.push({
      date: yieldCurve.date,
      impliedRate,
      signal
    });
  }
  
  return expectations;
};

// Compare market expectations with Fed projections
export const analyzeFedMarketDivergence = (
  marketExpectations: MarketExpectation[],
  fedProjections: FOMCProjection[]
): MarketExpectation[] => {
  if (fedProjections.length === 0 || marketExpectations.length === 0) {
    return marketExpectations;
  }
  
  // Get latest Fed projection for current/next year
  const latestProjection = fedProjections
    .filter(p => p.median_rate != null)
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date))[0];
  
  return marketExpectations.map(expectation => {
    if (latestProjection?.median_rate) {
      const divergence = expectation.impliedRate - latestProjection.median_rate;
      
      return {
        ...expectation,
        fedProjection: latestProjection.median_rate,
        divergence
      };
    }
    return expectation;
  });
};

// Generate trading signals based on analysis
export const generateTradingSignals = (analysis: {
  yieldCurve: YieldCurveAnalysis;
  divergence: MarketExpectation[];
}): TradingSignal[] => {
  const signals: TradingSignal[] = [];
  const { yieldCurve, divergence } = analysis;
  
  // Signal 1: Yield curve inversion
  if (yieldCurve.isInverted) {
    signals.push({
      type: 'YIELD_CURVE_PLAY',
      strength: yieldCurve.slope2Y10Y < -100 ? 'STRONG' : 'MODERATE',
      description: `Yield curve inverted (${yieldCurve.slope2Y10Y.toFixed(0)}bp). Consider recession protection trades.`,
      confidence: Math.min(95, Math.abs(yieldCurve.slope2Y10Y) * 2),
      timeframe: '6-18 months'
    });
  }
  
  // Signal 2: Fed vs Market divergence
  const latestDivergence = divergence[divergence.length - 1];
  if (latestDivergence?.divergence) {
    const absDivergence = Math.abs(latestDivergence.divergence);
    
    if (absDivergence > 75) { // 75 basis points
      const type = latestDivergence.divergence > 0 ? 'RATE_HIKE_RISK' : 'RATE_CUT_OPPORTUNITY';
      signals.push({
        type,
        strength: absDivergence > 150 ? 'STRONG' : 'MODERATE',
        description: `Market expects ${latestDivergence.divergence > 0 ? 'higher' : 'lower'} rates than Fed (${latestDivergence.divergence.toFixed(0)}bp divergence).`,
        confidence: Math.min(90, absDivergence),
        timeframe: '3-12 months'
      });
    }
  }
  
  // Signal 3: Fed pivot detection
  if (yieldCurve.slope2Y10Y > 100 && latestDivergence?.signal === 'DOVISH') {
    signals.push({
      type: 'FED_PIVOT',
      strength: 'MODERATE',
      description: 'Steepening curve + dovish market signals potential Fed pivot.',
      confidence: 70,
      timeframe: '6-12 months'
    });
  }
  
  return signals.sort((a, b) => b.confidence - a.confidence);
};

// Main analysis function
export const analyzeMarketExpectations = async (economicData: EconomicDataPoint[]): Promise<MarketExpectationsAnalysis> => {
  // Extract yield curve
  const latestYieldCurve = extractYieldCurve(economicData);
  if (!latestYieldCurve) {
    throw new Error('Insufficient yield curve data for analysis');
  }
  
  // Get Fed projections
  const fedProjections = await getLatestProjections();
  
  // Calculate market expectations
  const marketExpectations = calculateMarketImpliedRates(latestYieldCurve);
  
  // Analyze divergence
  const marketVsFedDivergence = analyzeFedMarketDivergence(marketExpectations, fedProjections);
  
  // Generate trading signals
  const tradingSignals = generateTradingSignals({
    yieldCurve: latestYieldCurve,
    divergence: marketVsFedDivergence
  });
  
  return {
    latestYieldCurve,
    fedProjections,
    marketVsFedDivergence,
    tradingSignals
  };
};