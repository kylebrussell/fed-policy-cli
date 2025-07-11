// /src/services/volAdjustedTrading.ts

import { 
  VolAdjustedRecommendation,
  TradingRecommendation,
  FOMCEvent,
  VolatilityProfile,
  OptionsFlow
} from '../types/index.js';
import { VolatilitySurfaceService } from './volatilitySurface.js';
import { OptionsPositioningService } from './optionsPositioning.js';
import { FOMCReactionService } from './fomcReactions.js';

export interface VolTimingStrategy {
  strategy: 'BUY_VOL_PRE_FOMC' | 'SELL_VOL_POST_FOMC' | 'VOLATILITY_ARBITRAGE' | 'VOL_HEDGE';
  entryTiming: string; // Relative to FOMC
  exitTiming: string;
  expectedReturn: number;
  winRate: number;
  maxRisk: number;
}

export interface OptionsStrategyAnalysis {
  strategy: VolAdjustedRecommendation['optionsStrategy'];
  cost: number;
  maxProfit: number;
  maxLoss: number;
  breakEvenPoints: number[];
  probability: number; // Success probability
  riskRewardRatio: number;
}

export class VolAdjustedTradingService {
  private volSurfaceService: VolatilitySurfaceService;
  private optionsService: OptionsPositioningService;
  private fomcService: FOMCReactionService;

  constructor(
    volSurfaceService: VolatilitySurfaceService,
    optionsService: OptionsPositioningService,
    fomcService: FOMCReactionService
  ) {
    this.volSurfaceService = volSurfaceService;
    this.optionsService = optionsService;
    this.fomcService = fomcService;
  }

  /**
   * Generate volatility-adjusted trading recommendations
   */
  generateVolAdjustedRecommendation(
    baseRecommendation: TradingRecommendation,
    nextFOMC: FOMCEvent,
    volatilityProfile: VolatilityProfile,
    optionsFlow: OptionsFlow
  ): VolAdjustedRecommendation {
    const daysToFOMC = this.calculateDaysToFOMC(nextFOMC.date);
    
    // Enhance base recommendation with volatility context
    const volatilityContext = {
      currentIV: volatilityProfile.currentLevel,
      historicalAverage: volatilityProfile.historicalAverage,
      fomcPremium: volatilityProfile.fomcPremium,
      decayRate: this.calculateDecayRate(volatilityProfile),
      nextFOMC: nextFOMC.date,
      daysToFOMC
    };

    // Determine optimal options strategy based on vol environment
    const optionsStrategy = this.selectOptimalOptionsStrategy(
      baseRecommendation,
      volatilityContext,
      optionsFlow,
      nextFOMC
    );

    // Calculate optimal entry/exit timing relative to FOMC
    const volTiming = this.calculateVolTiming(
      baseRecommendation,
      volatilityContext,
      nextFOMC
    );

    // Adjust position sizing for volatility
    const adjustedSizing = this.adjustPositionSizing(
      baseRecommendation.sizing,
      volatilityContext
    );

    return {
      ...baseRecommendation,
      sizing: adjustedSizing,
      volatilityContext,
      optionsStrategy,
      volTiming
    };
  }

  /**
   * Select optimal options strategy based on volatility environment
   */
  private selectOptimalOptionsStrategy(
    baseRec: TradingRecommendation,
    volContext: VolAdjustedRecommendation['volatilityContext'],
    optionsFlow: OptionsFlow,
    fomcEvent: FOMCEvent
  ): VolAdjustedRecommendation['optionsStrategy'] {
    const asset = baseRec.asset;
    const currentPrice = baseRec.recommendation.entryPrice || 100; // Fallback price
    
    // Determine strategy based on volatility conditions
    if (volContext.currentIV > volContext.historicalAverage * 1.2) {
      // High vol environment - sell strategies
      if (volContext.daysToFOMC <= 2) {
        return this.createStraddleStrategy(asset, currentPrice, 'SELL', volContext);
      } else {
        return this.createVolatilityPlayStrategy(asset, currentPrice, 'SELL_HIGH_VOL', volContext);
      }
    } else if (volContext.currentIV < volContext.historicalAverage * 0.8) {
      // Low vol environment - buy strategies
      if (volContext.daysToFOMC <= 5) {
        return this.createStraddleStrategy(asset, currentPrice, 'BUY', volContext);
      } else {
        return this.createCalendarStrategy(asset, currentPrice, volContext);
      }
    } else if (volContext.daysToFOMC <= 3 && Math.abs(fomcEvent.surpriseFactor) > 0.5) {
      // High surprise potential - directional vol play
      return this.createStrangleStrategy(asset, currentPrice, baseRec.action, volContext);
    } else {
      // Neutral vol environment - hedging strategy
      return this.createHedgeStrategy(asset, currentPrice, baseRec, volContext);
    }
  }

  /**
   * Create straddle strategy (buy or sell vol)
   */
  private createStraddleStrategy(
    asset: string,
    spotPrice: number,
    direction: 'BUY' | 'SELL',
    volContext: VolAdjustedRecommendation['volatilityContext']
  ): VolAdjustedRecommendation['optionsStrategy'] {
    const atmStrike = Math.round(spotPrice);
    const expiration = this.getOptimalExpiration(volContext.daysToFOMC);
    
    // Estimate straddle cost (simplified)
    const straddleCost = spotPrice * (volContext.currentIV / 100) * Math.sqrt(volContext.daysToFOMC / 365) * 2;
    
    const expectedVolMove = this.calculateExpectedVolMove(volContext);
    const breakEvenMove = (straddleCost / spotPrice) * 100; // Percentage
    
    return {
      strategy: 'STRADDLE',
      strikes: [atmStrike],
      expiration,
      expectedVolMove,
      breakEvenMoves: { upper: breakEvenMove, lower: -breakEvenMove },
      cost: direction === 'BUY' ? straddleCost : -straddleCost,
      maxProfit: direction === 'BUY' ? Infinity : straddleCost,
      maxLoss: direction === 'BUY' ? straddleCost : Infinity
    };
  }

  /**
   * Create strangle strategy for directional bias with vol protection
   */
  private createStrangleStrategy(
    asset: string,
    spotPrice: number,
    direction: 'BUY' | 'SELL',
    volContext: VolAdjustedRecommendation['volatilityContext']
  ): VolAdjustedRecommendation['optionsStrategy'] {
    const callStrike = Math.round(spotPrice * 1.02); // 2% OTM call
    const putStrike = Math.round(spotPrice * 0.98); // 2% OTM put
    const expiration = this.getOptimalExpiration(volContext.daysToFOMC);
    
    const strangleCost = spotPrice * (volContext.currentIV / 100) * Math.sqrt(volContext.daysToFOMC / 365) * 1.5;
    const expectedVolMove = this.calculateExpectedVolMove(volContext);
    
    return {
      strategy: 'STRANGLE',
      strikes: [putStrike, callStrike],
      expiration,
      expectedVolMove,
      breakEvenMoves: { upper: 3.5, lower: -3.5 }, // Approximate break-evens
      cost: strangleCost,
      maxProfit: Infinity,
      maxLoss: strangleCost
    };
  }

  /**
   * Create volatility play strategy
   */
  private createVolatilityPlayStrategy(
    asset: string,
    spotPrice: number,
    type: 'BUY_LOW_VOL' | 'SELL_HIGH_VOL',
    volContext: VolAdjustedRecommendation['volatilityContext']
  ): VolAdjustedRecommendation['optionsStrategy'] {
    const strikes = [Math.round(spotPrice * 0.95), Math.round(spotPrice * 1.05)]; // Wing strikes
    const expiration = this.getOptimalExpiration(volContext.daysToFOMC);
    
    const expectedVolMove = this.calculateExpectedVolMove(volContext);
    const cost = spotPrice * 0.02; // Approximate cost
    
    return {
      strategy: 'VOL_PLAY',
      strikes,
      expiration,
      expectedVolMove,
      breakEvenMoves: { upper: 4.0, lower: -4.0 },
      cost: type === 'BUY_LOW_VOL' ? cost : -cost,
      maxProfit: type === 'BUY_LOW_VOL' ? spotPrice * 0.1 : cost,
      maxLoss: type === 'BUY_LOW_VOL' ? cost : spotPrice * 0.1
    };
  }

  /**
   * Create calendar spread strategy
   */
  private createCalendarStrategy(
    asset: string,
    spotPrice: number,
    volContext: VolAdjustedRecommendation['volatilityContext']
  ): VolAdjustedRecommendation['optionsStrategy'] {
    const strike = Math.round(spotPrice);
    const nearExpiration = this.getOptimalExpiration(Math.min(volContext.daysToFOMC + 7, 30));
    
    const expectedVolMove = this.calculateExpectedVolMove(volContext);
    const cost = spotPrice * 0.015; // Calendar spread cost
    
    return {
      strategy: 'CALENDAR',
      strikes: [strike],
      expiration: nearExpiration,
      expectedVolMove,
      breakEvenMoves: { upper: 2.0, lower: -2.0 },
      cost,
      maxProfit: spotPrice * 0.03,
      maxLoss: cost
    };
  }

  /**
   * Create hedging strategy
   */
  private createHedgeStrategy(
    asset: string,
    spotPrice: number,
    baseRec: TradingRecommendation,
    volContext: VolAdjustedRecommendation['volatilityContext']
  ): VolAdjustedRecommendation['optionsStrategy'] {
    // Hedge based on base recommendation direction
    const hedgeDirection = baseRec.action === 'BUY' ? 'PUT' : 'CALL';
    const hedgeStrike = hedgeDirection === 'PUT' ? 
      Math.round(spotPrice * 0.95) : Math.round(spotPrice * 1.05);
    
    const expiration = this.getOptimalExpiration(volContext.daysToFOMC + 14);
    const cost = spotPrice * 0.01; // Hedge cost
    const expectedVolMove = this.calculateExpectedVolMove(volContext);
    
    return {
      strategy: 'HEDGE',
      strikes: [hedgeStrike],
      expiration,
      expectedVolMove,
      breakEvenMoves: { upper: 1.0, lower: -1.0 },
      cost,
      maxProfit: spotPrice * 0.05,
      maxLoss: cost
    };
  }

  /**
   * Calculate optimal volatility timing around FOMC
   */
  private calculateVolTiming(
    baseRec: TradingRecommendation,
    volContext: VolAdjustedRecommendation['volatilityContext'],
    fomcEvent: FOMCEvent
  ): VolAdjustedRecommendation['volTiming'] {
    const daysToFOMC = volContext.daysToFOMC;
    
    if (volContext.currentIV > volContext.historicalAverage * 1.15) {
      // High vol - sell before FOMC
      return {
        entryWindow: `T-${Math.min(daysToFOMC, 3)} to T-1 days`,
        exitWindow: 'T+0 to T+1 (day of/after FOMC)',
        reasoning: 'High IV suggests vol crush opportunity post-FOMC'
      };
    } else if (volContext.currentIV < volContext.historicalAverage * 0.9) {
      // Low vol - buy before FOMC
      return {
        entryWindow: `T-${Math.min(daysToFOMC, 5)} to T-2 days`,
        exitWindow: 'T+0 within 2 hours of statement',
        reasoning: 'Low IV suggests vol expansion opportunity during FOMC'
      };
    } else if (Math.abs(fomcEvent.surpriseFactor) > 0.6) {
      // High surprise potential
      return {
        entryWindow: 'T-1 to T-0 (day before to day of)',
        exitWindow: 'T+0 to T+2 (intraday to 2 days post)',
        reasoning: 'High surprise potential suggests sustained volatility'
      };
    } else {
      // Neutral environment
      return {
        entryWindow: baseRec.recommendation.timing === 'IMMEDIATE' ? 'Immediate' : 'T-2 to T-1',
        exitWindow: 'T+0 to T+1',
        reasoning: 'Standard FOMC vol pattern expected'
      };
    }
  }

  /**
   * Adjust position sizing for volatility environment
   */
  private adjustPositionSizing(
    baseSizing: TradingRecommendation['sizing'],
    volContext: VolAdjustedRecommendation['volatilityContext']
  ): TradingRecommendation['sizing'] {
    // Reduce size in high vol environments, increase in low vol
    const volAdjustment = volContext.currentIV > volContext.historicalAverage * 1.2 ? 0.8 :
                         volContext.currentIV < volContext.historicalAverage * 0.8 ? 1.2 : 1.0;
    
    // Additional FOMC proximity adjustment
    const fomcAdjustment = volContext.daysToFOMC <= 2 ? 0.75 : 
                          volContext.daysToFOMC <= 7 ? 0.9 : 1.0;
    
    const totalAdjustment = volAdjustment * fomcAdjustment;
    
    return {
      ...baseSizing,
      portfolioWeight: baseSizing.portfolioWeight * totalAdjustment,
      riskBudget: baseSizing.riskBudget * totalAdjustment,
      maxPosition: baseSizing.maxPosition * totalAdjustment
    };
  }

  /**
   * Generate pre-FOMC volatility timing strategies
   */
  generateVolTimingStrategies(
    daysToFOMC: number,
    volContext: VolAdjustedRecommendation['volatilityContext']
  ): VolTimingStrategy[] {
    const strategies: VolTimingStrategy[] = [];
    
    // Strategy 1: Buy vol before FOMC (if low)
    if (volContext.currentIV < volContext.historicalAverage * 0.9) {
      strategies.push({
        strategy: 'BUY_VOL_PRE_FOMC',
        entryTiming: `T-${Math.min(daysToFOMC, 3)} days`,
        exitTiming: 'T+0 (within 2 hours of statement)',
        expectedReturn: 15.8, // Historical average
        winRate: 0.68,
        maxRisk: 8.5
      });
    }
    
    // Strategy 2: Sell vol after FOMC (if high)
    if (volContext.currentIV > volContext.historicalAverage * 1.1) {
      strategies.push({
        strategy: 'SELL_VOL_POST_FOMC',
        entryTiming: 'T+0 (15-30 minutes post-statement)',
        exitTiming: 'T+1 to T+3 days',
        expectedReturn: 12.3,
        winRate: 0.72,
        maxRisk: 6.2
      });
    }
    
    // Strategy 3: Vol arbitrage (term structure play)
    if (volContext.fomcPremium > 2.0) {
      strategies.push({
        strategy: 'VOLATILITY_ARBITRAGE',
        entryTiming: `T-${daysToFOMC} to T-1`,
        exitTiming: 'T+1 to T+5',
        expectedReturn: 8.9,
        winRate: 0.58,
        maxRisk: 4.1
      });
    }
    
    // Strategy 4: Vol hedge for existing positions
    strategies.push({
      strategy: 'VOL_HEDGE',
      entryTiming: `T-${Math.min(daysToFOMC, 7)} days`,
      exitTiming: 'T+2 to T+7 days',
      expectedReturn: 5.2, // Hedging cost reduction
      winRate: 0.75, // High success as hedge
      maxRisk: 2.8
    });
    
    return strategies;
  }

  /**
   * Helper methods
   */
  private calculateDaysToFOMC(fomcDate: string): number {
    const today = new Date();
    const fomc = new Date(fomcDate);
    const diffTime = fomc.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateDecayRate(volProfile: VolatilityProfile): number {
    // Calculate expected vol decay rate post-FOMC
    const elevatedVol = volProfile.currentLevel;
    const normalVol = volProfile.historicalAverage;
    
    if (elevatedVol > normalVol) {
      // Elevated vol decays at ~20% per day typically
      return 0.20;
    } else {
      // Below-normal vol mean-reverts slower
      return 0.12;
    }
  }

  private calculateExpectedVolMove(volContext: VolAdjustedRecommendation['volatilityContext']): number {
    // Estimate expected volatility move around FOMC
    const baseFOMCMove = 1.8; // Average 1.8% move
    const volMultiplier = volContext.currentIV / volContext.historicalAverage;
    const proximityMultiplier = Math.max(0.5, (7 - volContext.daysToFOMC) / 7);
    
    return baseFOMCMove * volMultiplier * proximityMultiplier;
  }

  private getOptimalExpiration(daysToEvent: number): string {
    // Select optimal option expiration based on days to FOMC
    if (daysToEvent <= 7) {
      return this.getNextWeeklyExpiration();
    } else if (daysToEvent <= 21) {
      return this.getNextMonthlyExpiration();
    } else {
      return this.getSecondMonthlyExpiration();
    }
  }

  private getNextWeeklyExpiration(): string {
    // Return next Friday (weekly expiration)
    const today = new Date();
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    const nextFriday = new Date(today.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
    return nextFriday.toISOString().split('T')[0];
  }

  private getNextMonthlyExpiration(): string {
    // Return third Friday of current/next month
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const thirdFriday = this.getThirdFriday(nextMonth);
    return thirdFriday.toISOString().split('T')[0];
  }

  private getSecondMonthlyExpiration(): string {
    // Return third Friday of month after next
    const today = new Date();
    const secondMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    const thirdFriday = this.getThirdFriday(secondMonth);
    return thirdFriday.toISOString().split('T')[0];
  }

  private getThirdFriday(date: Date): Date {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstFriday = new Date(firstDay.getTime() + (5 - firstDay.getDay() + 7) % 7 * 24 * 60 * 60 * 1000);
    return new Date(firstFriday.getTime() + 14 * 24 * 60 * 60 * 1000); // Third Friday
  }
}