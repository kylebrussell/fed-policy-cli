// /src/services/scenarioAnalysis.ts

import { ScenarioOutcome, PolicyScenario, TradingRecommendation, BacktestResult, RiskMetrics } from '../types/index.js';

export interface ScenarioConfig {
  scenarios: PolicyScenario[];
  timeHorizon: number; // Months
  numSimulations: number; // Monte Carlo iterations
  confidenceLevel: number; // 95% for VaR calculation
}

export interface MonteCarloResult {
  scenario: string;
  outcomes: number[]; // Array of simulated returns
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    skewness: number;
    kurtosis: number;
    percentiles: { [key: number]: number }; // 5th, 25th, 75th, 95th percentiles
  };
  valueAtRisk: {
    var95: number;
    var99: number;
    expectedShortfall95: number;
  };
}

export interface StressTestResult {
  stressScenario: string;
  description: string;
  portfolioImpact: number; // Total portfolio impact %
  assetImpacts: { [asset: string]: number };
  timeToRecovery: number; // Months
  mitigationStrategies: string[];
}

export class ScenarioAnalysisService {
  private volatilityRegimes: { [asset: string]: { [regime: string]: number } };
  private correlationRegimes: { [regime: string]: { [asset: string]: { [asset: string]: number } } };
  
  constructor() {
    this.volatilityRegimes = this.initVolatilityRegimes();
    this.correlationRegimes = this.initCorrelationRegimes();
  }

  /**
   * Generate comprehensive scenario analysis for trading recommendations
   */
  generateScenarioAnalysis(
    recommendations: TradingRecommendation[],
    config: ScenarioConfig
  ): ScenarioOutcome[] {
    const outcomes: ScenarioOutcome[] = [];
    
    for (const scenario of config.scenarios) {
      // Monte Carlo simulation for each scenario
      const monteCarloResult = this.runMonteCarloSimulation(
        recommendations,
        scenario,
        config
      );
      
      // Convert to ScenarioOutcome format
      outcomes.push({
        scenario: scenario.name,
        probability: scenario.probability,
        expectedReturn: monteCarloResult.statistics.mean,
        variance: Math.pow(monteCarloResult.statistics.standardDeviation, 2),
        timeToTarget: this.estimateTimeToTarget(scenario, config.timeHorizon),
        triggerEvents: scenario.triggers
      });
    }
    
    return outcomes.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Run Monte Carlo simulation for portfolio under specific scenario
   */
  runMonteCarloSimulation(
    recommendations: TradingRecommendation[],
    scenario: PolicyScenario,
    config: ScenarioConfig
  ): MonteCarloResult {
    const outcomes: number[] = [];
    
    for (let i = 0; i < config.numSimulations; i++) {
      let portfolioReturn = 0;
      
      for (const rec of recommendations) {
        const assetReturn = this.simulateAssetReturn(
          rec,
          scenario,
          config.timeHorizon
        );
        
        // Weight by position size
        const weight = rec.sizing.portfolioWeight / 100;
        portfolioReturn += assetReturn * weight;
      }
      
      outcomes.push(portfolioReturn);
    }
    
    const statistics = this.calculateStatistics(outcomes);
    const var95 = this.calculateVaR(outcomes, 0.05);
    const var99 = this.calculateVaR(outcomes, 0.01);
    const expectedShortfall95 = this.calculateExpectedShortfall(outcomes, 0.05);
    
    return {
      scenario: scenario.name,
      outcomes,
      statistics,
      valueAtRisk: {
        var95,
        var99,
        expectedShortfall95
      }
    };
  }

  /**
   * Simulate individual asset return under Fed scenario
   */
  private simulateAssetReturn(
    recommendation: TradingRecommendation,
    scenario: PolicyScenario,
    timeHorizonMonths: number
  ): number {
    const asset = recommendation.asset;
    const assetClass = recommendation.assetClass;
    
    // Base expected return from scenario
    let expectedReturn = this.getScenarioBaseReturn(assetClass, scenario);
    
    // Historical context adjustment
    const historicalReturn = recommendation.historicalContext.avgReturn;
    expectedReturn = (expectedReturn + historicalReturn) / 2; // Blend scenario and historical
    
    // Get volatility for this regime
    const volatility = this.getAssetVolatility(asset, scenario.name);
    
    // Time adjustment (scale to horizon)
    const timeAdjustment = Math.sqrt(timeHorizonMonths / 12);
    const scaledVolatility = volatility * timeAdjustment;
    
    // Generate random return using normal distribution
    const randomShock = this.generateNormalRandom() * scaledVolatility;
    
    // Add regime-specific adjustments
    const regimeAdjustment = this.getRegimeAdjustment(assetClass, scenario);
    
    return expectedReturn * timeAdjustment + randomShock + regimeAdjustment;
  }

  /**
   * Get base return for asset class under Fed scenario
   */
  private getScenarioBaseReturn(assetClass: string, scenario: PolicyScenario): number {
    const scenarioReturns: { [scenario: string]: { [assetClass: string]: number } } = {
      'AGGRESSIVE_EASING': {
        'Bonds': 12,      // Strong bond performance
        'Equities': 15,   // Risk-on behavior
        'Commodities': 8, // Inflation hedge
        'Currencies': -5, // Dollar weakening
        'Credit': 10,     // Credit spreads tighten
        'Options': 20     // Volatility strategies
      },
      'GRADUAL_EASING': {
        'Bonds': 8,
        'Equities': 10,
        'Commodities': 4,
        'Currencies': -2,
        'Credit': 6,
        'Options': 12
      },
      'HOLD_PATTERN': {
        'Bonds': 2,
        'Equities': 6,
        'Commodities': 0,
        'Currencies': 0,
        'Credit': 3,
        'Options': 8
      },
      'GRADUAL_TIGHTENING': {
        'Bonds': -6,
        'Equities': 2,
        'Commodities': -2,
        'Currencies': 3,
        'Credit': -4,
        'Options': 15
      },
      'AGGRESSIVE_TIGHTENING': {
        'Bonds': -12,
        'Equities': -8,
        'Commodities': -5,
        'Currencies': 8,
        'Credit': -10,
        'Options': 25
      }
    };
    
    return scenarioReturns[scenario.name]?.[assetClass] || 0;
  }

  /**
   * Get asset volatility for specific regime
   */
  private getAssetVolatility(asset: string, regime: string): number {
    return this.volatilityRegimes[asset]?.[regime] || this.volatilityRegimes[asset]?.['NORMAL'] || 20;
  }

  /**
   * Get regime-specific adjustment factors
   */
  private getRegimeAdjustment(assetClass: string, scenario: PolicyScenario): number {
    // Additional adjustments based on Fed policy timing and magnitude
    const aggressiveness = scenario.fedActions.reduce((sum, action) => {
      return sum + Math.abs(action.changeBps || 0);
    }, 0);
    
    // More aggressive policy changes create larger tail risks
    const aggressivenessMultiplier = Math.min(2, aggressiveness / 100);
    
    const adjustments: { [assetClass: string]: number } = {
      'Bonds': aggressivenessMultiplier * 2,
      'Equities': aggressivenessMultiplier * 1.5,
      'Commodities': aggressivenessMultiplier * 1,
      'Currencies': aggressivenessMultiplier * 0.8,
      'Credit': aggressivenessMultiplier * 1.2,
      'Options': aggressivenessMultiplier * 3
    };
    
    return (Math.random() - 0.5) * (adjustments[assetClass] || 1);
  }

  /**
   * Calculate comprehensive statistics for simulation results
   */
  private calculateStatistics(outcomes: number[]): MonteCarloResult['statistics'] {
    const sorted = [...outcomes].sort((a, b) => a - b);
    const n = outcomes.length;
    
    const mean = outcomes.reduce((sum, val) => sum + val, 0) / n;
    const median = sorted[Math.floor(n / 2)];
    
    const variance = outcomes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const standardDeviation = Math.sqrt(variance);
    
    // Skewness (third moment)
    const skewness = outcomes.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / standardDeviation, 3);
    }, 0) / n;
    
    // Kurtosis (fourth moment)
    const kurtosis = outcomes.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / standardDeviation, 4);
    }, 0) / n - 3; // Excess kurtosis
    
    const percentiles = {
      5: sorted[Math.floor(n * 0.05)],
      25: sorted[Math.floor(n * 0.25)],
      75: sorted[Math.floor(n * 0.75)],
      95: sorted[Math.floor(n * 0.95)]
    };
    
    return {
      mean,
      median,
      standardDeviation,
      skewness,
      kurtosis,
      percentiles
    };
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  private calculateVaR(outcomes: number[], confidenceLevel: number): number {
    const sorted = [...outcomes].sort((a, b) => a - b);
    const index = Math.floor(outcomes.length * confidenceLevel);
    return sorted[index];
  }

  /**
   * Calculate Expected Shortfall (Conditional VaR)
   */
  private calculateExpectedShortfall(outcomes: number[], confidenceLevel: number): number {
    const sorted = [...outcomes].sort((a, b) => a - b);
    const cutoffIndex = Math.floor(outcomes.length * confidenceLevel);
    const tailValues = sorted.slice(0, cutoffIndex);
    
    return tailValues.reduce((sum, val) => sum + val, 0) / tailValues.length;
  }

  /**
   * Generate stress test scenarios
   */
  generateStressTests(
    recommendations: TradingRecommendation[]
  ): StressTestResult[] {
    const stressTests: StressTestResult[] = [];
    
    // Fed shock scenarios
    stressTests.push(...this.generateFedShockTests(recommendations));
    
    // Market dislocation scenarios
    stressTests.push(...this.generateMarketShockTests(recommendations));
    
    // Credit event scenarios
    stressTests.push(...this.generateCreditShockTests(recommendations));
    
    return stressTests.sort((a, b) => Math.abs(b.portfolioImpact) - Math.abs(a.portfolioImpact));
  }

  /**
   * Generate Fed policy shock stress tests
   */
  private generateFedShockTests(recommendations: TradingRecommendation[]): StressTestResult[] {
    const tests: StressTestResult[] = [];
    
    // Emergency rate hike (100bp surprise)
    tests.push({
      stressScenario: 'EMERGENCY_HIKE',
      description: 'Fed emergency 100bp rate hike due to inflation shock',
      portfolioImpact: this.calculateShockImpact(recommendations, {
        'Bonds': -15,
        'Equities': -12,
        'Credit': -18,
        'Commodities': -8,
        'Currencies': 5,
        'Options': 40
      }),
      assetImpacts: this.calculateAssetShockImpacts(recommendations, 'EMERGENCY_HIKE'),
      timeToRecovery: 8,
      mitigationStrategies: [
        'Reduce duration exposure in bond positions',
        'Increase cash allocation',
        'Add inflation protection hedges',
        'Consider defensive equity sectors'
      ]
    });
    
    // Emergency rate cut (150bp surprise)
    tests.push({
      stressScenario: 'EMERGENCY_CUT',
      description: 'Fed emergency 150bp rate cut due to financial crisis',
      portfolioImpact: this.calculateShockImpact(recommendations, {
        'Bonds': 20,
        'Equities': -15,
        'Credit': 8,
        'Commodities': -10,
        'Currencies': -12,
        'Options': 50
      }),
      assetImpacts: this.calculateAssetShockImpacts(recommendations, 'EMERGENCY_CUT'),
      timeToRecovery: 12,
      mitigationStrategies: [
        'Extend duration in quality bonds',
        'Add credit protection',
        'Increase equity hedges',
        'Consider safe-haven assets'
      ]
    });
    
    return tests;
  }

  /**
   * Generate market dislocation stress tests
   */
  private generateMarketShockTests(recommendations: TradingRecommendation[]): StressTestResult[] {
    return [{
      stressScenario: 'VOLATILITY_SPIKE',
      description: 'VIX spikes to 50+ on policy uncertainty',
      portfolioImpact: this.calculateShockImpact(recommendations, {
        'Bonds': 5,
        'Equities': -20,
        'Credit': -15,
        'Commodities': -5,
        'Currencies': 3,
        'Options': 80
      }),
      assetImpacts: this.calculateAssetShockImpacts(recommendations, 'VOLATILITY_SPIKE'),
      timeToRecovery: 3,
      mitigationStrategies: [
        'Reduce equity beta exposure',
        'Add volatility hedges',
        'Increase quality bond allocation',
        'Consider tail risk protection'
      ]
    }];
  }

  /**
   * Generate credit shock stress tests
   */
  private generateCreditShockTests(recommendations: TradingRecommendation[]): StressTestResult[] {
    return [{
      stressScenario: 'CREDIT_CRISIS',
      description: 'Credit spreads widen 500bp on banking stress',
      portfolioImpact: this.calculateShockImpact(recommendations, {
        'Bonds': 8,  // Flight to quality Treasuries
        'Equities': -25,
        'Credit': -30,
        'Commodities': -12,
        'Currencies': 0,
        'Options': 60
      }),
      assetImpacts: this.calculateAssetShockImpacts(recommendations, 'CREDIT_CRISIS'),
      timeToRecovery: 18,
      mitigationStrategies: [
        'Reduce credit exposure',
        'Add Treasury protection',
        'Hedge equity downside',
        'Consider financial sector shorts'
      ]
    }];
  }

  /**
   * Calculate portfolio impact from shock scenario
   */
  private calculateShockImpact(
    recommendations: TradingRecommendation[],
    shockReturns: { [assetClass: string]: number }
  ): number {
    let totalImpact = 0;
    
    for (const rec of recommendations) {
      const weight = rec.sizing.portfolioWeight / 100;
      const shockReturn = shockReturns[rec.assetClass] || 0;
      totalImpact += weight * shockReturn;
    }
    
    return totalImpact;
  }

  /**
   * Calculate individual asset impacts from shock
   */
  private calculateAssetShockImpacts(
    recommendations: TradingRecommendation[],
    shockType: string
  ): { [asset: string]: number } {
    const impacts: { [asset: string]: number } = {};
    
    // Asset-specific shock multipliers
    const assetMultipliers: { [asset: string]: { [shock: string]: number } } = {
      'TLT': { 'EMERGENCY_HIKE': -2.5, 'EMERGENCY_CUT': 2.2, 'VOLATILITY_SPIKE': 0.8 },
      'SPY': { 'EMERGENCY_HIKE': -1.8, 'EMERGENCY_CUT': -0.5, 'VOLATILITY_SPIKE': -2.0 },
      'HYG': { 'EMERGENCY_HIKE': -2.2, 'EMERGENCY_CUT': 0.5, 'CREDIT_CRISIS': -3.5 },
      'GLD': { 'EMERGENCY_HIKE': -1.0, 'EMERGENCY_CUT': 1.5, 'VOLATILITY_SPIKE': 0.5 },
      'DXY': { 'EMERGENCY_HIKE': 1.8, 'EMERGENCY_CUT': -2.0, 'VOLATILITY_SPIKE': 0.3 }
    };
    
    for (const rec of recommendations) {
      const multiplier = assetMultipliers[rec.asset]?.[shockType] || 1;
      impacts[rec.asset] = (rec.historicalContext.avgReturn || 0) * multiplier;
    }
    
    return impacts;
  }

  /**
   * Estimate time to reach target return
   */
  private estimateTimeToTarget(scenario: PolicyScenario, horizonMonths: number): string {
    // Base time on Fed policy aggressiveness
    const totalBps = scenario.fedActions.reduce((sum, action) => {
      return sum + Math.abs(action.changeBps || 0);
    }, 0);
    
    // More aggressive policy = faster market reaction
    const adjustedTime = horizonMonths * (1 - Math.min(0.5, totalBps / 200));
    
    if (adjustedTime <= 1) return '< 1 month';
    if (adjustedTime <= 3) return '1-3 months';
    if (adjustedTime <= 6) return '3-6 months';
    if (adjustedTime <= 12) return '6-12 months';
    return '> 12 months';
  }

  /**
   * Generate normal random number (Box-Muller transform)
   */
  private generateNormalRandom(): number {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Initialize volatility regimes for different assets
   */
  private initVolatilityRegimes(): { [asset: string]: { [regime: string]: number } } {
    return {
      'TLT': { 'NORMAL': 15, 'CRISIS': 25, 'EASING': 12, 'TIGHTENING': 18 },
      'SPY': { 'NORMAL': 16, 'CRISIS': 35, 'EASING': 14, 'TIGHTENING': 20 },
      'HYG': { 'NORMAL': 12, 'CRISIS': 40, 'EASING': 10, 'TIGHTENING': 15 },
      'GLD': { 'NORMAL': 18, 'CRISIS': 25, 'EASING': 16, 'TIGHTENING': 20 },
      'DXY': { 'NORMAL': 8, 'CRISIS': 15, 'EASING': 12, 'TIGHTENING': 6 },
      'VIX': { 'NORMAL': 80, 'CRISIS': 150, 'EASING': 60, 'TIGHTENING': 90 }
    };
  }

  /**
   * Initialize correlation regimes
   */
  private initCorrelationRegimes(): { [regime: string]: { [asset: string]: { [asset: string]: number } } } {
    return {
      'NORMAL': {
        'TLT': { 'SPY': -0.2, 'HYG': 0.4, 'GLD': 0.1 },
        'SPY': { 'TLT': -0.2, 'HYG': 0.6, 'GLD': -0.1 },
        'HYG': { 'TLT': 0.4, 'SPY': 0.6, 'GLD': 0.0 }
      },
      'CRISIS': {
        'TLT': { 'SPY': 0.7, 'HYG': 0.8, 'GLD': 0.6 },
        'SPY': { 'TLT': 0.7, 'HYG': 0.9, 'GLD': 0.3 },
        'HYG': { 'TLT': 0.8, 'SPY': 0.9, 'GLD': 0.4 }
      }
    };
  }
}