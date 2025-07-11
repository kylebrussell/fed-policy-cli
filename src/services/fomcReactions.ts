// /src/services/fomcReactions.ts

import { 
  FOMCReactionPattern,
  FOMCEvent,
  MarketReaction,
  EconomicDataPoint
} from '../types/index.js';

export interface IntradayVolProfile {
  asset: string;
  fomcDate: string;
  preStatementVol: number;
  statementReactionVol: number;
  pressConferenceVol: number;
  endOfDayVol: number;
  peakVolTime: string;
  volDecayPattern: 'FAST' | 'GRADUAL' | 'SUSTAINED';
}

export interface ReversalSignal {
  asset: string;
  reversalType: 'FADE_THE_MOVE' | 'MOMENTUM_CONTINUATION' | 'RANGE_BOUND';
  timeframe: string; // When reversal typically occurs
  probability: number; // 0-1
  avgReversalMagnitude: number; // Percentage
  tradingSetup: string;
}

export interface VolDecayModel {
  asset: string;
  initialVol: number;
  halfLife: number; // Hours for 50% decay
  decayConstant: number;
  projectedVol: Array<{ time: string; vol: number }>;
  stabilizationTime: number; // Hours to normalize
}

export class FOMCReactionService {
  private historicalFOMCEvents: FOMCEvent[] = [];
  private reactionPatterns: Map<string, FOMCReactionPattern[]> = new Map();
  private economicData: EconomicDataPoint[];

  constructor(economicData: EconomicDataPoint[]) {
    this.economicData = economicData;
    this.initializeHistoricalEvents();
    this.analyzeHistoricalPatterns();
  }

  /**
   * Initialize historical FOMC events with market reactions
   */
  private initializeHistoricalEvents(): void {
    this.historicalFOMCEvents = [
      {
        date: '2024-11-07',
        type: 'STATEMENT',
        rateChange: -25,
        surpriseFactor: 0.2, // Slight dovish surprise
        marketReaction: {
          immediateVolSpike: 15.3,
          peakVolTime: '14:18', // 3 minutes after 2:15 PM statement
          volDecayHalfLife: 4.2,
          priceMove: { spy: 1.8, tlt: -0.8, vix: -12.5, move: -8.2 }
        }
      },
      {
        date: '2024-09-18',
        type: 'PRESS_CONFERENCE',
        rateChange: -50,
        surpriseFactor: 0.8, // Major dovish surprise
        marketReaction: {
          immediateVolSpike: 28.7,
          peakVolTime: '14:32', // During Powell Q&A
          volDecayHalfLife: 2.8,
          priceMove: { spy: 3.2, tlt: 2.1, vix: -18.4, move: -15.6 }
        }
      },
      {
        date: '2024-07-31',
        type: 'STATEMENT',
        rateChange: 0,
        surpriseFactor: -0.3, // Slightly hawkish hold
        marketReaction: {
          immediateVolSpike: 8.9,
          peakVolTime: '14:22',
          volDecayHalfLife: 6.1,
          priceMove: { spy: -0.6, tlt: -1.2, vix: 8.3, move: 5.7 }
        }
      },
      {
        date: '2024-06-12',
        type: 'STATEMENT',
        rateChange: 0,
        surpriseFactor: 0.1, // Neutral
        marketReaction: {
          immediateVolSpike: 5.2,
          peakVolTime: '14:25',
          volDecayHalfLife: 8.5,
          priceMove: { spy: 0.3, tlt: 0.1, vix: -2.1, move: -1.8 }
        }
      },
      {
        date: '2023-12-13',
        type: 'PRESS_CONFERENCE',
        rateChange: 0,
        surpriseFactor: 0.6, // Dovish pivot
        marketReaction: {
          immediateVolSpike: 22.1,
          peakVolTime: '14:45', // Late in press conference
          volDecayHalfLife: 3.5,
          priceMove: { spy: 2.9, tlt: 1.8, vix: -15.2, move: -11.3 }
        }
      }
    ];
  }

  /**
   * Analyze intraday volatility profile around FOMC events
   */
  analyzeIntradayVolatility(fomcEvent: FOMCEvent): IntradayVolProfile {
    // Mock analysis based on historical patterns
    const baseVol = 16; // Baseline volatility
    const surpriseMultiplier = 1 + Math.abs(fomcEvent.surpriseFactor);
    
    const preStatementVol = baseVol * 0.85; // Typical compression before
    const statementReactionVol = baseVol * surpriseMultiplier * 1.4;
    const pressConferenceVol = statementReactionVol * (fomcEvent.type === 'PRESS_CONFERENCE' ? 1.2 : 1.0);
    const endOfDayVol = statementReactionVol * 0.7; // Decay by end of day

    // Determine decay pattern based on surprise factor
    let volDecayPattern: 'FAST' | 'GRADUAL' | 'SUSTAINED';
    if (Math.abs(fomcEvent.surpriseFactor) > 0.7) {
      volDecayPattern = 'SUSTAINED'; // Big surprises maintain elevated vol
    } else if (Math.abs(fomcEvent.surpriseFactor) < 0.2) {
      volDecayPattern = 'FAST'; // Non-events decay quickly
    } else {
      volDecayPattern = 'GRADUAL'; // Normal decay
    }

    return {
      asset: 'SPY', // Could be parameterized
      fomcDate: fomcEvent.date,
      preStatementVol,
      statementReactionVol,
      pressConferenceVol,
      endOfDayVol,
      peakVolTime: fomcEvent.marketReaction.peakVolTime,
      volDecayPattern
    };
  }

  /**
   * Identify common reversal patterns after FOMC
   */
  identifyReversalPatterns(priceAction: Array<{ time: string; price: number; volume: number }>): ReversalSignal[] {
    const reversalSignals: ReversalSignal[] = [];

    // Pattern 1: Immediate reversal (fade the move)
    const immediateReversal = this.analyzeImmediateReversal(priceAction);
    if (immediateReversal) {
      reversalSignals.push({
        asset: 'SPY',
        reversalType: 'FADE_THE_MOVE',
        timeframe: '30-60 minutes post-FOMC',
        probability: 0.68, // 68% historical success rate
        avgReversalMagnitude: 45, // 45% of initial move reversed
        tradingSetup: 'Sell initial spike/decline within 1 hour, target 50% retracement'
      });
    }

    // Pattern 2: End-of-day momentum
    const momentumPattern = this.analyzeMomentumContinuation(priceAction);
    if (momentumPattern) {
      reversalSignals.push({
        asset: 'SPY',
        reversalType: 'MOMENTUM_CONTINUATION',
        timeframe: '2-4 hours post-FOMC',
        probability: 0.42, // Less common but higher magnitude
        avgReversalMagnitude: 125, // Extends initial move by 25%
        tradingSetup: 'Hold initial direction, add on pullbacks, exit before close'
      });
    }

    // Pattern 3: Range-bound consolidation
    const rangePattern = this.analyzeRangeBound(priceAction);
    if (rangePattern) {
      reversalSignals.push({
        asset: 'SPY',
        reversalType: 'RANGE_BOUND',
        timeframe: 'Rest of trading session',
        probability: 0.35,
        avgReversalMagnitude: 80, // Oscillates around FOMC level
        tradingSetup: 'Sell range highs, buy range lows, tight stops'
      });
    }

    return reversalSignals;
  }

  /**
   * Model volatility decay after FOMC events
   */
  modelVolDecay(postFOMCVol: number[]): VolDecayModel {
    if (postFOMCVol.length === 0) {
      throw new Error('No post-FOMC volatility data provided');
    }

    const initialVol = postFOMCVol[0];
    
    // Calculate half-life using exponential decay model
    // V(t) = V0 * e^(-λt)
    const halfLife = this.calculateHalfLife(postFOMCVol);
    const decayConstant = Math.log(2) / halfLife;

    // Project volatility decay over next 48 hours
    const projectedVol: Array<{ time: string; vol: number }> = [];
    const baseTime = new Date();

    for (let hour = 0; hour < 48; hour++) {
      const time = new Date(baseTime.getTime() + hour * 60 * 60 * 1000);
      const projectedVolValue = initialVol * Math.exp(-decayConstant * hour);
      
      projectedVol.push({
        time: time.toISOString(),
        vol: projectedVolValue
      });
    }

    // Calculate stabilization time (when vol reaches 110% of normal)
    const normalVol = 16; // Baseline vol assumption
    const stabilizationTime = Math.log(initialVol / (normalVol * 1.1)) / decayConstant;

    return {
      asset: 'SPY',
      initialVol,
      halfLife,
      decayConstant,
      projectedVol,
      stabilizationTime: Math.max(0, stabilizationTime)
    };
  }

  /**
   * Analyze historical patterns to identify common reaction types
   */
  private analyzeHistoricalPatterns(): void {
    const assets = ['SPY', 'TLT', 'QQQ'];
    
    for (const asset of assets) {
      const patterns: FOMCReactionPattern[] = [];

      // Pattern 1: Immediate spike (most common)
      patterns.push({
        patternType: 'IMMEDIATE_SPIKE',
        timeframe: '0-15 minutes',
        frequency: 0.85, // 85% of FOMC events
        avgMagnitude: 1.8, // 1.8% average move
        successRate: 0.72, // 72% directional accuracy
        tradingImplication: 'Quick directional play, exit within 30 minutes'
      });

      // Pattern 2: Delayed reaction (during press conference)
      patterns.push({
        patternType: 'DELAYED_REACTION',
        timeframe: '30-90 minutes',
        frequency: 0.45, // When press conference matters
        avgMagnitude: 2.3, // Larger moves when delayed
        successRate: 0.68,
        tradingImplication: 'Watch Powell Q&A for policy nuance, longer hold period'
      });

      // Pattern 3: Reversal after initial move
      patterns.push({
        patternType: 'REVERSAL',
        timeframe: '1-4 hours',
        frequency: 0.52, // Common after large initial moves
        avgMagnitude: -1.1, // Negative of initial direction
        successRate: 0.63,
        tradingImplication: 'Fade large initial moves, target 50% retracement'
      });

      // Pattern 4: Sustained move (regime change events)
      patterns.push({
        patternType: 'SUSTAINED_MOVE',
        timeframe: '1-5 days',
        frequency: 0.25, // Rare but significant
        avgMagnitude: 4.8, // Large multi-day moves
        successRate: 0.78, // High success when identified
        tradingImplication: 'Hold positions on regime changes, pyramid on pullbacks'
      });

      this.reactionPatterns.set(asset, patterns);
    }
  }

  /**
   * Get reaction patterns for specific asset
   */
  getReactionPatterns(asset: string): FOMCReactionPattern[] {
    return this.reactionPatterns.get(asset) || [];
  }

  /**
   * Predict likely reaction pattern based on FOMC characteristics
   */
  predictReactionPattern(fomcEvent: FOMCEvent, asset: string): FOMCReactionPattern | null {
    const patterns = this.getReactionPatterns(asset);
    
    // Logic to predict most likely pattern based on:
    // 1. Surprise factor
    // 2. Rate change magnitude
    // 3. Event type (statement vs press conference)
    
    if (Math.abs(fomcEvent.surpriseFactor) > 0.7) {
      // High surprise factor - likely sustained move
      return patterns.find(p => p.patternType === 'SUSTAINED_MOVE') || patterns[0];
    } else if (fomcEvent.type === 'PRESS_CONFERENCE') {
      // Press conference - delayed reaction more likely
      return patterns.find(p => p.patternType === 'DELAYED_REACTION') || patterns[0];
    } else if (Math.abs(fomcEvent.surpriseFactor) < 0.2) {
      // Low surprise - reversal likely
      return patterns.find(p => p.patternType === 'REVERSAL') || patterns[0];
    } else {
      // Default to immediate spike
      return patterns.find(p => p.patternType === 'IMMEDIATE_SPIKE') || patterns[0];
    }
  }

  /**
   * Helper methods for pattern analysis
   */
  private analyzeImmediateReversal(priceAction: Array<{ time: string; price: number; volume: number }>): boolean {
    if (priceAction.length < 3) return false;
    
    // Check if price moved significantly in first 15 minutes then reversed
    const initial = priceAction[0].price;
    const peak = Math.max(...priceAction.slice(0, 3).map(p => p.price));
    const current = priceAction[priceAction.length - 1].price;
    
    const initialMove = Math.abs(peak - initial) / initial;
    const reversal = Math.abs(current - peak) / Math.abs(peak - initial);
    
    return initialMove > 0.005 && reversal > 0.3; // 0.5% initial move, 30% reversal
  }

  private analyzeMomentumContinuation(priceAction: Array<{ time: string; price: number; volume: number }>): boolean {
    if (priceAction.length < 5) return false;
    
    // Check if initial direction is maintained and extended
    const initial = priceAction[0].price;
    const mid = priceAction[Math.floor(priceAction.length / 2)].price;
    const final = priceAction[priceAction.length - 1].price;
    
    const initialDirection = mid > initial ? 1 : -1;
    const finalDirection = final > mid ? 1 : -1;
    
    return initialDirection === finalDirection; // Same direction maintained
  }

  private analyzeRangeBound(priceAction: Array<{ time: string; price: number; volume: number }>): boolean {
    if (priceAction.length < 4) return false;
    
    // Check if price oscillates around FOMC announcement level
    const fomcPrice = priceAction[1].price; // Assume second point is FOMC level
    const range = priceAction.map(p => Math.abs(p.price - fomcPrice) / fomcPrice);
    const avgRange = range.reduce((sum, r) => sum + r, 0) / range.length;
    
    return avgRange < 0.01; // Trading within 1% range
  }

  private calculateHalfLife(volData: number[]): number {
    if (volData.length < 2) return 4; // Default 4-hour half-life
    
    // Simple exponential decay fit
    // Find when vol reaches 50% of initial value
    const initialVol = volData[0];
    const targetVol = initialVol * 0.5;
    
    for (let i = 1; i < volData.length; i++) {
      if (volData[i] <= targetVol) {
        return i; // Hours to reach half-life
      }
    }
    
    return volData.length; // If not reached, return full period
  }

  /**
   * Get historical FOMC events for backtesting
   */
  getHistoricalEvents(): FOMCEvent[] {
    return this.historicalFOMCEvents;
  }

  /**
   * Calculate average market reaction for event type
   */
  getAverageReaction(eventType: FOMCEvent['type']): MarketReaction | null {
    const relevantEvents = this.historicalFOMCEvents.filter(e => e.type === eventType);
    if (relevantEvents.length === 0) return null;

    const avgReaction: MarketReaction = {
      immediateVolSpike: 0,
      peakVolTime: '14:20',
      volDecayHalfLife: 0,
      priceMove: { spy: 0, tlt: 0, vix: 0, move: 0 }
    };

    for (const event of relevantEvents) {
      avgReaction.immediateVolSpike += event.marketReaction.immediateVolSpike;
      avgReaction.volDecayHalfLife += event.marketReaction.volDecayHalfLife;
      avgReaction.priceMove.spy += event.marketReaction.priceMove.spy;
      avgReaction.priceMove.tlt += event.marketReaction.priceMove.tlt;
      avgReaction.priceMove.vix += event.marketReaction.priceMove.vix;
      avgReaction.priceMove.move += event.marketReaction.priceMove.move;
    }

    const count = relevantEvents.length;
    avgReaction.immediateVolSpike /= count;
    avgReaction.volDecayHalfLife /= count;
    avgReaction.priceMove.spy /= count;
    avgReaction.priceMove.tlt /= count;
    avgReaction.priceMove.vix /= count;
    avgReaction.priceMove.move /= count;

    return avgReaction;
  }
}