// /src/services/tradingRecommendation.ts

import { 
  TradingRecommendation, 
  ScenarioOutcome, 
  HedgingRecommendation,
  PositionSizing,
  BacktestResult,
  PolicyScenario
} from '../types/index.js';
import { PositionSizingService, AssetMetrics, DEFAULT_PORTFOLIO_CONFIG } from './positionSizing.js';
import { HedgingService, HedgeParameters } from './hedgingStrategy.js';
import { ScenarioAnalysisService, ScenarioConfig } from './scenarioAnalysis.js';

export interface TradingSignalInput {
  asset: string;
  assetClass: 'Bonds' | 'Equities' | 'Commodities' | 'Currencies' | 'Credit' | 'Options';
  action: 'BUY' | 'SELL' | 'HOLD' | 'SHORT';
  confidence: number;
  reasoning: string;
  expectedReturn: number;
  timeframe: string;
  historicalData?: {
    avgReturn: number;
    winRate?: number;
    sharpeRatio?: number;
    maxDrawdown?: number;
    sampleSize?: number;
  };
}

export interface MarketData {
  currentPrice: number;
  volatility: number; // Annual volatility %
  correlations?: { [asset: string]: number };
  liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
  technicalLevels?: {
    support: number[];
    resistance: number[];
    movingAverages: { [period: string]: number };
  };
}

export class TradingRecommendationService {
  private positionSizing: PositionSizingService;
  private hedgingService: HedgingService;
  private scenarioAnalysis: ScenarioAnalysisService;
  
  constructor() {
    this.positionSizing = new PositionSizingService(DEFAULT_PORTFOLIO_CONFIG);
    this.hedgingService = new HedgingService();
    this.scenarioAnalysis = new ScenarioAnalysisService();
  }

  /**
   * Generate comprehensive trading recommendation from basic signal
   */
  generateRecommendation(
    signal: TradingSignalInput,
    marketData: MarketData,
    fedScenarios: PolicyScenario[],
    existingPositions: Array<{ asset: string; weight: number; assetClass: string }> = []
  ): TradingRecommendation {
    const id = this.generateRecommendationId(signal);
    
    // Calculate entry/exit levels based on technical analysis
    const recommendation = this.calculateEntryExitLevels(signal, marketData);
    
    // Generate position sizing
    const assetMetrics = this.convertToAssetMetrics(signal, marketData);
    const sizing = this.positionSizing.generatePositionSizing(
      { 
        asset: signal.asset, 
        assetClass: signal.assetClass, 
        confidence: signal.confidence,
        recommendation 
      },
      assetMetrics,
      undefined, // No backtest data for now
      existingPositions
    );
    
    // Generate hedging recommendations
    const hedges = this.generateHedges(signal, marketData, fedScenarios);
    
    // Run scenario analysis
    const tempRecommendation: TradingRecommendation = {
      id,
      asset: signal.asset,
      assetClass: signal.assetClass,
      action: signal.action,
      recommendation,
      sizing,
      confidence: signal.confidence,
      reasoning: signal.reasoning,
      historicalContext: this.enhanceHistoricalContext(signal),
      riskFactors: this.identifyRiskFactors(signal, marketData, fedScenarios),
      hedges,
      scenarioAnalysis: []
    };
    
    const scenarioAnalysis = this.runScenarioAnalysis([tempRecommendation], fedScenarios);
    
    return {
      ...tempRecommendation,
      scenarioAnalysis
    };
  }

  /**
   * Calculate specific entry/exit levels and timing
   */
  private calculateEntryExitLevels(
    signal: TradingSignalInput,
    marketData: MarketData
  ): TradingRecommendation['recommendation'] {
    const currentPrice = marketData.currentPrice;
    const volatility = marketData.volatility;
    const technicals = marketData.technicalLevels;
    
    // Calculate volatility-based levels (2-week expected move)
    const expectedMove = currentPrice * (volatility / 100) * Math.sqrt(2/52); // 2-week move
    
    let entryPrice: number | undefined;
    let entryRange: { min: number; max: number } | undefined;
    let stopLoss: number | undefined;
    let profitTarget: number | undefined;
    let timing: TradingRecommendation['recommendation']['timing'] = 'IMMEDIATE';
    
    switch (signal.action) {
      case 'BUY':
        // Conservative entry: wait for pullback unless high confidence
        if (signal.confidence > 80) {
          entryPrice = currentPrice;
          timing = 'IMMEDIATE';
        } else {
          // Look for pullback to support or moving average
          const pullbackLevel = technicals?.support?.[0] || (currentPrice * 0.98);
          entryRange = { 
            min: Math.max(pullbackLevel, currentPrice - expectedMove), 
            max: currentPrice 
          };
          timing = 'WAIT_FOR_PULLBACK';
        }
        
        // Stop loss: 1.5x expected move or below support
        stopLoss = technicals?.support?.[1] || (currentPrice - expectedMove * 1.5);
        
        // Profit target: historical return or resistance level
        const targetReturn = signal.expectedReturn / 100;
        profitTarget = Math.min(
          currentPrice * (1 + targetReturn),
          technicals?.resistance?.[0] || currentPrice * 1.20
        );
        break;
        
      case 'SELL':
      case 'SHORT':
        // Conservative short entry: wait for bounce to resistance
        if (signal.confidence > 80) {
          entryPrice = currentPrice;
          timing = 'IMMEDIATE';
        } else {
          const bounceLevel = technicals?.resistance?.[0] || (currentPrice * 1.02);
          entryRange = { 
            min: currentPrice, 
            max: Math.min(bounceLevel, currentPrice + expectedMove) 
          };
          timing = 'WAIT_FOR_BREAKOUT';
        }
        
        // Stop loss: above resistance or 1.5x expected move
        stopLoss = technicals?.resistance?.[1] || (currentPrice + expectedMove * 1.5);
        
        // Profit target: support level or expected return
        const shortTargetReturn = Math.abs(signal.expectedReturn) / 100;
        profitTarget = Math.max(
          currentPrice * (1 - shortTargetReturn),
          technicals?.support?.[0] || currentPrice * 0.85
        );
        break;
        
      case 'HOLD':
        // No specific levels for hold
        timing = 'IMMEDIATE';
        break;
    }
    
    return {
      entryPrice,
      entryRange,
      stopLoss,
      profitTarget,
      timeframe: signal.timeframe,
      timing
    };
  }

  /**
   * Convert signal data to AssetMetrics format
   */
  private convertToAssetMetrics(signal: TradingSignalInput, marketData: MarketData): AssetMetrics {
    return {
      asset: signal.asset,
      expectedReturn: signal.expectedReturn,
      volatility: marketData.volatility,
      sharpeRatio: signal.historicalData?.sharpeRatio || (signal.expectedReturn / marketData.volatility),
      maxDrawdown: signal.historicalData?.maxDrawdown || marketData.volatility * 1.5,
      correlation: marketData.correlations,
      liquidity: marketData.liquidity
    };
  }

  /**
   * Enhance historical context with additional metrics
   */
  private enhanceHistoricalContext(signal: TradingSignalInput): TradingRecommendation['historicalContext'] {
    const hist = signal.historicalData;
    
    return {
      avgReturn: hist?.avgReturn || signal.expectedReturn,
      winRate: hist?.winRate || this.estimateWinRate(signal.confidence),
      sharpeRatio: hist?.sharpeRatio || this.estimateSharpeRatio(signal.expectedReturn, signal.confidence),
      maxDrawdown: hist?.maxDrawdown || this.estimateMaxDrawdown(signal.expectedReturn, signal.confidence),
      sampleSize: hist?.sampleSize || this.estimateSampleSize(signal.timeframe)
    };
  }

  /**
   * Estimate win rate based on confidence
   */
  private estimateWinRate(confidence: number): number {
    // Higher confidence should correlate with higher win rate
    // But cap at realistic levels (70% is very good for trading)
    return Math.min(70, 40 + (confidence * 0.3));
  }

  /**
   * Estimate Sharpe ratio based on expected return and confidence
   */
  private estimateSharpeRatio(expectedReturn: number, confidence: number): number {
    // Higher confidence suggests better risk-adjusted returns
    const baseRatio = expectedReturn > 0 ? 0.6 : -0.4;
    const confidenceBoost = (confidence - 50) / 100; // -0.5 to +0.5
    return baseRatio + confidenceBoost;
  }

  /**
   * Estimate maximum drawdown
   */
  private estimateMaxDrawdown(expectedReturn: number, confidence: number): number {
    // Lower confidence = higher potential drawdowns
    const baseDrawdown = Math.abs(expectedReturn) * 1.5;
    const confidencePenalty = (100 - confidence) / 200; // 0 to 0.25
    return baseDrawdown * (1 + confidencePenalty);
  }

  /**
   * Estimate sample size based on timeframe
   */
  private estimateSampleSize(timeframe: string): number {
    const sampleSizes: { [key: string]: number } = {
      'weeks': 20,
      'months': 15,
      'quarters': 12,
      'years': 8
    };
    
    for (const [period, size] of Object.entries(sampleSizes)) {
      if (timeframe.toLowerCase().includes(period)) {
        return size;
      }
    }
    
    return 10; // Default
  }

  /**
   * Generate hedging recommendations
   */
  private generateHedges(
    signal: TradingSignalInput,
    marketData: MarketData,
    fedScenarios: PolicyScenario[]
  ): HedgingRecommendation[] {
    const hedgeParams: HedgeParameters = {
      primaryPosition: {
        asset: signal.asset,
        assetClass: signal.assetClass,
        direction: signal.action === 'BUY' ? 'LONG' : 'SHORT',
        size: 1000000, // $1M default position
        duration: signal.timeframe
      },
      fedScenarios,
      riskTolerance: this.getRiskToleranceFromConfidence(signal.confidence),
      hedgeBudget: this.getHedgeBudget(signal.confidence, marketData.liquidity)
    };
    
    return this.hedgingService.generateHedgingStrategy(hedgeParams);
  }

  /**
   * Run scenario analysis for recommendations
   */
  private runScenarioAnalysis(
    recommendations: TradingRecommendation[],
    fedScenarios: PolicyScenario[]
  ): ScenarioOutcome[] {
    const config: ScenarioConfig = {
      scenarios: fedScenarios,
      timeHorizon: 6, // 6 months
      numSimulations: 1000,
      confidenceLevel: 95
    };
    
    return this.scenarioAnalysis.generateScenarioAnalysis(recommendations, config);
  }

  /**
   * Identify key risk factors
   */
  private identifyRiskFactors(
    signal: TradingSignalInput,
    marketData: MarketData,
    fedScenarios: PolicyScenario[]
  ): string[] {
    const risks: string[] = [];
    
    // Confidence-based risks
    if (signal.confidence < 60) {
      risks.push('Low confidence signal - consider smaller position size');
    }
    
    // Volatility risks
    if (marketData.volatility > 25) {
      risks.push('High volatility asset - significant price swings expected');
    }
    
    // Liquidity risks
    if (marketData.liquidity === 'LOW') {
      risks.push('Low liquidity - may have difficulty exiting position quickly');
    }
    
    // Fed policy risks
    const aggressiveScenarios = fedScenarios.filter(s => s.probability > 20 && s.name.includes('AGGRESSIVE'));
    if (aggressiveScenarios.length > 0) {
      risks.push('Fed policy uncertainty - aggressive rate changes possible');
    }
    
    // Asset-specific risks
    risks.push(...this.getAssetSpecificRisks(signal.asset, signal.assetClass));
    
    // Correlation risks
    if (marketData.correlations) {
      const highCorrelations = Object.values(marketData.correlations).filter(corr => Math.abs(corr) > 0.7);
      if (highCorrelations.length > 2) {
        risks.push('High correlation with other assets - portfolio concentration risk');
      }
    }
    
    return risks.slice(0, 5); // Limit to top 5 risks
  }

  /**
   * Get asset-specific risk factors
   */
  private getAssetSpecificRisks(asset: string, assetClass: string): string[] {
    const risks: string[] = [];
    
    switch (assetClass) {
      case 'Bonds':
        risks.push('Interest rate sensitivity - Fed policy changes affect pricing');
        if (asset.includes('HY') || asset.includes('JNK')) {
          risks.push('Credit risk - economic slowdown could widen spreads');
        }
        break;
        
      case 'Equities':
        risks.push('Market risk - general equity market movements');
        if (asset.includes('XLF')) {
          risks.push('Interest rate sensitivity - banks affected by rate changes');
        }
        break;
        
      case 'Commodities':
        risks.push('Supply/demand shocks - geopolitical events affect pricing');
        risks.push('Dollar strength risk - commodities often inverse to USD');
        break;
        
      case 'Currencies':
        risks.push('Central bank policy divergence affects relative strength');
        risks.push('Geopolitical risk - political events drive currency flows');
        break;
        
      case 'Credit':
        risks.push('Default risk - economic deterioration affects credit quality');
        risks.push('Spread risk - risk premium changes with market sentiment');
        break;
    }
    
    return risks;
  }

  /**
   * Get risk tolerance based on signal confidence
   */
  private getRiskToleranceFromConfidence(confidence: number): 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' {
    if (confidence < 60) return 'CONSERVATIVE';
    if (confidence < 80) return 'MODERATE';
    return 'AGGRESSIVE';
  }

  /**
   * Get hedge budget based on confidence and liquidity
   */
  private getHedgeBudget(confidence: number, liquidity: string): number {
    let baseBudget = 2.0; // 2% base hedge budget
    
    // Lower confidence = higher hedge budget
    if (confidence < 60) baseBudget += 1.0;
    else if (confidence < 80) baseBudget += 0.5;
    
    // Lower liquidity = higher hedge budget
    if (liquidity === 'LOW') baseBudget += 1.0;
    else if (liquidity === 'MEDIUM') baseBudget += 0.5;
    
    return Math.min(5.0, baseBudget); // Cap at 5%
  }

  /**
   * Generate unique recommendation ID
   */
  private generateRecommendationId(signal: TradingSignalInput): string {
    const timestamp = Date.now().toString(36);
    const assetCode = signal.asset.substring(0, 3).toUpperCase();
    const actionCode = signal.action.substring(0, 1);
    return `${assetCode}-${actionCode}-${timestamp}`;
  }

  /**
   * Batch process multiple signals into comprehensive recommendations
   */
  batchGenerateRecommendations(
    signals: TradingSignalInput[],
    marketDataMap: { [asset: string]: MarketData },
    fedScenarios: PolicyScenario[]
  ): TradingRecommendation[] {
    const recommendations: TradingRecommendation[] = [];
    const existingPositions: Array<{ asset: string; weight: number; assetClass: string }> = [];
    
    for (const signal of signals) {
      const marketData = marketDataMap[signal.asset];
      if (!marketData) {
        console.warn(`No market data available for ${signal.asset}`);
        continue;
      }
      
      const recommendation = this.generateRecommendation(
        signal,
        marketData,
        fedScenarios,
        existingPositions
      );
      
      recommendations.push(recommendation);
      
      // Add to existing positions for correlation calculations
      existingPositions.push({
        asset: signal.asset,
        weight: recommendation.sizing.portfolioWeight,
        assetClass: signal.assetClass
      });
    }
    
    return recommendations;
  }
}