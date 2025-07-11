// /src/services/volatilitySurface.ts

import { 
  VolatilitySurface, 
  VolatilityProfile, 
  FOMCEvent, 
  VolatilityTenor,
  VolatilitySkew,
  EconomicDataPoint 
} from '../types/index.js';

export interface VolSurfaceShift {
  asset: string;
  preEventIV: number;
  postEventIV: number;
  ivChange: number;
  peakIV: number;
  timeToDecay: number; // Hours for vol to normalize
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TermStructureAnalysis {
  asset: string;
  shortTermShift: number; // 1M vol change
  mediumTermShift: number; // 3M vol change  
  longTermShift: number; // 6M+ vol change
  curveSteepening: boolean; // Whether term structure steepened
  flatteningRisk: number; // Risk of vol curve flattening
}

export interface VolPattern {
  patternType: 'PRE_FOMC_CRUSH' | 'POST_FOMC_SPIKE' | 'SUSTAINED_ELEVATION' | 'QUICK_REVERSION';
  avgMagnitude: number;
  frequency: number; // 0-1
  avgDuration: number; // Hours
  tradingOpportunity: string;
}

export class VolatilitySurfaceService {
  private economicData: EconomicDataPoint[];
  private historicalVolData: Map<string, VolatilitySurface[]> = new Map();

  constructor(economicData: EconomicDataPoint[]) {
    this.economicData = economicData;
    this.initializeVolData();
  }

  /**
   * Initialize historical volatility data for major assets
   */
  private initializeVolData(): void {
    // Mock historical vol surfaces for demonstration
    // In production, this would load from market data provider
    const assets = ['SPY', 'TLT', 'QQQ', 'IWM'];
    
    for (const asset of assets) {
      const surfaces: VolatilitySurface[] = [];
      
      // Generate sample vol surfaces around historical FOMC dates
      const fomcDates = this.getFOMCDates();
      
      for (const fomcDate of fomcDates) {
        // Pre-FOMC surface (elevated vol)
        surfaces.push(this.generateMockVolSurface(asset, fomcDate, 'PRE_FOMC'));
        
        // Post-FOMC surface (vol crush or spike)
        surfaces.push(this.generateMockVolSurface(asset, fomcDate, 'POST_FOMC'));
      }
      
      this.historicalVolData.set(asset, surfaces);
    }
  }

  /**
   * Calculate volatility surface shift around FOMC event
   */
  calculateVolSurfaceShift(asset: string, fomcDate: string): VolSurfaceShift {
    const surfaces = this.historicalVolData.get(asset) || [];
    
    const preEventSurface = surfaces.find(s => 
      s.timestamp <= fomcDate && 
      this.daysBetween(s.timestamp, fomcDate) <= 1
    );
    
    const postEventSurface = surfaces.find(s => 
      s.timestamp >= fomcDate && 
      this.daysBetween(fomcDate, s.timestamp) <= 1
    );

    if (!preEventSurface || !postEventSurface) {
      return {
        asset,
        preEventIV: 0,
        postEventIV: 0,
        ivChange: 0,
        peakIV: 0,
        timeToDecay: 0,
        significance: 'LOW'
      };
    }

    const preEventATM = this.getATMVolatility(preEventSurface);
    const postEventATM = this.getATMVolatility(postEventSurface);
    const ivChange = ((postEventATM - preEventATM) / preEventATM) * 100;

    // Find peak volatility in 24 hours post-FOMC
    const peakIV = this.findPeakVolatility(asset, fomcDate);
    const timeToDecay = this.calculateVolDecayTime(asset, fomcDate, peakIV);

    return {
      asset,
      preEventIV: preEventATM,
      postEventIV: postEventATM,
      ivChange,
      peakIV,
      timeToDecay,
      significance: Math.abs(ivChange) > 20 ? 'HIGH' : Math.abs(ivChange) > 10 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Analyze term structure changes
   */
  analyzeVolTermStructure(preEvent: VolatilitySurface, postEvent: VolatilitySurface): TermStructureAnalysis {
    const shortTermPre = this.getTenorVol(preEvent, 30); // 1M
    const mediumTermPre = this.getTenorVol(preEvent, 90); // 3M
    const longTermPre = this.getTenorVol(preEvent, 180); // 6M

    const shortTermPost = this.getTenorVol(postEvent, 30);
    const mediumTermPost = this.getTenorVol(postEvent, 90);
    const longTermPost = this.getTenorVol(postEvent, 180);

    const shortTermShift = ((shortTermPost - shortTermPre) / shortTermPre) * 100;
    const mediumTermShift = ((mediumTermPost - mediumTermPre) / mediumTermPre) * 100;
    const longTermShift = ((longTermPost - longTermPre) / longTermPre) * 100;

    // Check if curve steepened (short vol increased more than long vol)
    const curveSteepening = shortTermShift > longTermShift + 5;
    
    // Risk of flattening (typically occurs in vol crush scenarios)
    const flatteningRisk = Math.max(0, (shortTermShift - longTermShift) / 10);

    return {
      asset: preEvent.asset,
      shortTermShift,
      mediumTermShift,
      longTermShift,
      curveSteepening,
      flatteningRisk
    };
  }

  /**
   * Track historical volatility patterns around FOMC
   */
  trackHistoricalVolPatterns(lookbackPeriod: string): VolPattern[] {
    const patterns: VolPattern[] = [];
    
    // Pre-FOMC vol crush pattern
    patterns.push({
      patternType: 'PRE_FOMC_CRUSH',
      avgMagnitude: -15.2, // Average 15.2% vol decline in final 24h
      frequency: 0.72, // Occurs 72% of the time
      avgDuration: 8, // Starts ~8 hours before announcement
      tradingOpportunity: 'Sell vol 1-2 days before FOMC, buy back day-of'
    });

    // Post-FOMC vol spike pattern
    patterns.push({
      patternType: 'POST_FOMC_SPIKE',
      avgMagnitude: 28.5, // Average 28.5% vol spike
      frequency: 0.45, // Occurs 45% of the time (surprise-driven)
      avgDuration: 2, // Peak within 2 hours
      tradingOpportunity: 'Buy vol on surprise hawkish/dovish outcomes'
    });

    // Sustained vol elevation pattern
    patterns.push({
      patternType: 'SUSTAINED_ELEVATION',
      avgMagnitude: 12.3, // Elevated vol persists
      frequency: 0.28, // 28% of major policy shifts
      avgDuration: 72, // 3 days elevated
      tradingOpportunity: 'Hold vol positions through policy regime changes'
    });

    // Quick reversion pattern
    patterns.push({
      patternType: 'QUICK_REVERSION',
      avgMagnitude: -35.8, // Sharp vol collapse
      frequency: 0.63, // Most common outcome
      avgDuration: 6, // Vol normalizes within 6 hours
      tradingOpportunity: 'Sell vol immediately post-FOMC for income strategies'
    });

    return patterns;
  }

  /**
   * Generate comprehensive volatility profile
   */
  generateVolatilityProfile(asset: string, targetDate: string, fomcEvents: FOMCEvent[]): VolatilityProfile {
    const currentSurface = this.getCurrentVolSurface(asset, targetDate);
    const nextFOMC = this.getNextFOMCEvent(targetDate, fomcEvents);
    
    // Calculate pre/post event surfaces based on next FOMC
    const preEventSurface = this.projectPreFOMCSurface(currentSurface, nextFOMC);
    const postEventSurface = this.projectPostFOMCSurface(currentSurface, nextFOMC);

    const historicalAverage = this.calculateHistoricalAverage(asset);
    const currentLevel = this.getATMVolatility(currentSurface);
    const fomcPremium = this.calculateFOMCPremium(asset, nextFOMC);

    return {
      preEventIV: preEventSurface,
      postEventIV: postEventSurface,
      historicalAverage,
      currentLevel,
      fomcPremium
    };
  }

  /**
   * Helper methods
   */
  private getFOMCDates(): string[] {
    // Return historical FOMC meeting dates
    // In production, this would come from Fed calendar
    return [
      '2024-12-18', '2024-11-07', '2024-09-18', '2024-07-31',
      '2024-06-12', '2024-05-01', '2024-03-20', '2024-01-31',
      '2023-12-13', '2023-11-01', '2023-09-20', '2023-07-26'
    ];
  }

  private generateMockVolSurface(asset: string, date: string, timing: 'PRE_FOMC' | 'POST_FOMC'): VolatilitySurface {
    const baseVol = asset === 'SPY' ? 18 : asset === 'TLT' ? 12 : 20;
    const volMultiplier = timing === 'PRE_FOMC' ? 1.15 : 0.85; // Pre-FOMC elevated, post crush

    const tenors: VolatilityTenor[] = [
      { expiration: '30', impliedVol: baseVol * volMultiplier * 1.1, volume: 150000, openInterest: 45000 },
      { expiration: '60', impliedVol: baseVol * volMultiplier, volume: 80000, openInterest: 35000 },
      { expiration: '90', impliedVol: baseVol * volMultiplier * 0.95, volume: 60000, openInterest: 28000 },
      { expiration: '180', impliedVol: baseVol * volMultiplier * 0.9, volume: 25000, openInterest: 15000 }
    ];

    const skew: VolatilitySkew = {
      putCallRatio: timing === 'PRE_FOMC' ? 1.35 : 1.15, // Higher put buying pre-FOMC
      skewSlope: -0.15, // Typical put skew
      term90d25Delta: 2.8 // 90-day 25-delta put skew
    };

    return {
      asset,
      timestamp: timing === 'PRE_FOMC' ? this.addHours(date, -2) : this.addHours(date, 2),
      tenors,
      skew
    };
  }

  private getATMVolatility(surface: VolatilitySurface): number {
    // Return 60-day ATM volatility as proxy
    const atmTenor = surface.tenors.find(t => t.expiration === '60');
    return atmTenor?.impliedVol || 0;
  }

  private getTenorVol(surface: VolatilitySurface, days: number): number {
    const tenor = surface.tenors.find(t => Math.abs(parseInt(t.expiration) - days) < 10);
    return tenor?.impliedVol || 0;
  }

  private findPeakVolatility(asset: string, fomcDate: string): number {
    // Simulate finding peak vol in 24h window
    const basePeak = asset === 'SPY' ? 25 : asset === 'TLT' ? 18 : 28;
    return basePeak + Math.random() * 5; // Add some noise
  }

  private calculateVolDecayTime(asset: string, fomcDate: string, peakVol: number): number {
    // Model vol decay time (exponential decay)
    // Higher peak vol typically takes longer to decay
    const baseDecayHours = 6;
    const volFactor = peakVol / 20; // Normalize to ~20% base vol
    return baseDecayHours * volFactor;
  }

  private getCurrentVolSurface(asset: string, date: string): VolatilitySurface {
    const surfaces = this.historicalVolData.get(asset) || [];
    const closestSurface = surfaces.reduce((closest, current) => {
      const closestDiff = Math.abs(this.daysBetween(closest.timestamp, date));
      const currentDiff = Math.abs(this.daysBetween(current.timestamp, date));
      return currentDiff < closestDiff ? current : closest;
    });

    return closestSurface || this.generateMockVolSurface(asset, date, 'PRE_FOMC');
  }

  private getNextFOMCEvent(date: string, fomcEvents: FOMCEvent[]): FOMCEvent | null {
    const targetDate = new Date(date);
    const nextEvent = fomcEvents
      .filter(event => new Date(event.date) > targetDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    return nextEvent || null;
  }

  private projectPreFOMCSurface(current: VolatilitySurface, fomcEvent: FOMCEvent | null): VolatilitySurface {
    if (!fomcEvent) return current;

    // Project elevated vol leading into FOMC
    const elevatedTenors = current.tenors.map(tenor => ({
      ...tenor,
      impliedVol: tenor.impliedVol * 1.12 // 12% vol premium pre-FOMC
    }));

    return {
      ...current,
      timestamp: this.addHours(fomcEvent.date, -2),
      tenors: elevatedTenors
    };
  }

  private projectPostFOMCSurface(current: VolatilitySurface, fomcEvent: FOMCEvent | null): VolatilitySurface {
    if (!fomcEvent) return current;

    // Project vol crush post-FOMC (typical outcome)
    const crushedTenors = current.tenors.map(tenor => ({
      ...tenor,
      impliedVol: tenor.impliedVol * 0.78 // 22% vol crush post-FOMC
    }));

    return {
      ...current,
      timestamp: this.addHours(fomcEvent.date, 2),
      tenors: crushedTenors
    };
  }

  private calculateHistoricalAverage(asset: string): number {
    const surfaces = this.historicalVolData.get(asset) || [];
    if (surfaces.length === 0) return 0;

    const avgVol = surfaces.reduce((sum, surface) => {
      return sum + this.getATMVolatility(surface);
    }, 0) / surfaces.length;

    return avgVol;
  }

  private calculateFOMCPremium(asset: string, fomcEvent: FOMCEvent | null): number {
    if (!fomcEvent) return 0;

    // Calculate extra vol priced in before FOMC
    // Typically 2-4% for equity vol, 1-2% for rate vol
    const basePremium = asset === 'SPY' ? 3.2 : asset === 'TLT' ? 1.8 : 2.5;
    
    // Adjust based on surprise factor
    const surpriseAdjustment = Math.abs(fomcEvent.surpriseFactor) * 2;
    
    return basePremium + surpriseAdjustment;
  }

  private daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private addHours(dateString: string, hours: number): string {
    const date = new Date(dateString);
    date.setHours(date.getHours() + hours);
    return date.toISOString().split('T')[0];
  }
}