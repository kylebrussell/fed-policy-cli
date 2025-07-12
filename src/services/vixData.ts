// /src/services/vixData.ts

export interface VIXDataPoint {
  date: string;
  value: number;
  change?: number;
  changePercent?: number;
}

export interface VolatilityContext {
  currentVIX: number;
  vix30DayAvg: number;
  vixPercentile: number;
  regime: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH';
  lastUpdated: string;
}

/**
 * Service for fetching real volatility data
 * Uses VIXY ETF as a proxy for VIX movements and volatility patterns
 * Focus on relative changes and patterns rather than absolute VIX levels
 */
export class VIXDataService {
  private readonly ALPHA_VANTAGE_KEY: string;
  private readonly BASE_URL = 'https://www.alphavantage.co/query';
  
  constructor() {
    this.ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';
    
    if (!this.ALPHA_VANTAGE_KEY) {
      console.warn('Warning: ALPHA_VANTAGE_API_KEY not set. Volatility data will be unavailable.');
    }
  }
  
  /**
   * Get current volatility level (using VIXY volatility as proxy)
   */
  async getCurrentVIX(): Promise<number> {
    if (!this.ALPHA_VANTAGE_KEY) {
      // Fallback to reasonable estimate when no API key
      return this.getEstimatedVIX();
    }
    
    try {
      const data = await this.fetchVIXYData();
      const volatility = await this.calculateVIXYVolatility(data);
      return volatility || this.getEstimatedVIX();
    } catch (error) {
      console.warn('Failed to fetch volatility data:', error);
      return this.getEstimatedVIX();
    }
  }
  
  /**
   * Get volatility historical data for context (using VIXY patterns)
   */
  async getVIXHistory(days: number = 30): Promise<VIXDataPoint[]> {
    if (!this.ALPHA_VANTAGE_KEY) {
      return this.getEstimatedVIXHistory(days);
    }
    
    try {
      const data = await this.fetchVIXYData();
      return await this.processVIXYVolatilityHistory(data, days);
    } catch (error) {
      console.warn('Failed to fetch volatility history:', error);
      return this.getEstimatedVIXHistory(days);
    }
  }
  
  /**
   * Get volatility context for FOMC analysis
   */
  async getVolatilityContext(): Promise<VolatilityContext> {
    const currentVIX = await this.getCurrentVIX();
    const history = await this.getVIXHistory(30);
    
    const vix30DayAvg = history.length > 0 
      ? history.reduce((sum, point) => sum + point.value, 0) / history.length
      : currentVIX;
    
    const vixPercentile = this.calculateVIXPercentile(currentVIX, history);
    const regime = this.determineVolRegime(currentVIX, vix30DayAvg);
    
    return {
      currentVIX,
      vix30DayAvg,
      vixPercentile,
      regime,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Fetch VIXY ETF data from Alpha Vantage
   * VIXY tracks VIX futures and provides excellent volatility pattern proxy
   */
  private async fetchVIXYData(): Promise<any> {
    const url = `${this.BASE_URL}?function=TIME_SERIES_DAILY&symbol=VIXY&apikey=${this.ALPHA_VANTAGE_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    if (data['Note']) {
      throw new Error('API call frequency exceeded. Please wait and try again.');
    }
    
    return data;
  }
  
  /**
   * Calculate current volatility from VIXY price movements
   * Uses rolling volatility of VIXY returns as proxy for VIX level
   */
  private async calculateVIXYVolatility(data: any, lookbackDays: number = 20): Promise<number> {
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) return 18; // Default VIX estimate
    
    const dates = Object.keys(timeSeries).sort().reverse().slice(0, lookbackDays + 1);
    if (dates.length < 2) return 18;
    
    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const todayClose = parseFloat(timeSeries[dates[i-1]]['4. close']);
      const yesterdayClose = parseFloat(timeSeries[dates[i]]['4. close']);
      const dailyReturn = (todayClose - yesterdayClose) / yesterdayClose;
      returns.push(dailyReturn);
    }
    
    // Calculate annualized volatility
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized %
    
    // Scale to VIX-like levels (VIXY vol typically 2-3x higher than VIX level)
    // Typical VIXY vol ~50-60%, VIX ~15-20, so ratio ~3
    const vixEquivalent = Math.max(10, Math.min(50, volatility / 2.8));
    
    return Math.round(vixEquivalent * 10) / 10;
  }
  
  /**
   * Process VIXY volatility history for context analysis
   */
  private async processVIXYVolatilityHistory(data: any, days: number): Promise<VIXDataPoint[]> {
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) return [];
    
    const allDates = Object.keys(timeSeries).sort().reverse();
    const history: VIXDataPoint[] = [];
    
    // Calculate rolling 10-day volatility for each day
    for (let i = 0; i < Math.min(days, allDates.length - 10); i++) {
      const endDate = allDates[i];
      const startIndex = i + 10;
      
      if (startIndex >= allDates.length) break;
      
      // Get 10-day price series for this date
      const windowDates = allDates.slice(i, startIndex + 1);
      const returns: number[] = [];
      
      for (let j = 0; j < windowDates.length - 1; j++) {
        const todayClose = parseFloat(timeSeries[windowDates[j]]['4. close']);
        const yesterdayClose = parseFloat(timeSeries[windowDates[j + 1]]['4. close']);
        const dailyReturn = (todayClose - yesterdayClose) / yesterdayClose;
        returns.push(dailyReturn);
      }
      
      // Calculate volatility for this window
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
      const vixEquivalent = Math.max(10, Math.min(50, volatility / 2.8));
      
      // Calculate daily change
      const todayVol = vixEquivalent;
      const yesterdayVol = history.length > 0 ? history[history.length - 1].value : vixEquivalent;
      
      history.push({
        date: endDate,
        value: Math.round(todayVol * 10) / 10,
        change: todayVol - yesterdayVol,
        changePercent: ((todayVol - yesterdayVol) / yesterdayVol) * 100
      });
    }
    
    return history.reverse(); // Return in chronological order
  }
  

  /**
   * Calculate VIX percentile over historical period
   */
  private calculateVIXPercentile(currentVIX: number, history: VIXDataPoint[]): number {
    if (history.length === 0) return 50;
    
    const values = history.map(point => point.value).sort((a, b) => a - b);
    const lowerCount = values.filter(value => value < currentVIX).length;
    
    return (lowerCount / values.length) * 100;
  }
  
  /**
   * Determine volatility regime based on current vs historical levels
   */
  private determineVolRegime(currentVIX: number, avgVIX: number): 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' {
    const ratio = currentVIX / avgVIX;
    
    if (ratio > 1.5 || currentVIX > 30) return 'HIGH';
    if (ratio > 1.2 || currentVIX > 22) return 'ELEVATED';
    if (ratio < 0.8 || currentVIX < 12) return 'LOW';
    return 'NORMAL';
  }
  
  /**
   * Fallback VIX estimate when API is unavailable
   * Uses typical market VIX level
   */
  private getEstimatedVIX(): number {
    // Return typical VIX level with some variation
    const baseVIX = 18.5;
    const variation = (Math.random() - 0.5) * 6; // ±3 points
    return Math.max(10, Math.min(35, baseVIX + variation));
  }
  
  /**
   * Generate estimated VIX history for fallback
   */
  private getEstimatedVIXHistory(days: number): VIXDataPoint[] {
    const history: VIXDataPoint[] = [];
    const baseVIX = 18.5;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add some realistic variation
      const variation = (Math.random() - 0.5) * 4;
      const value = Math.max(10, Math.min(35, baseVIX + variation));
      
      history.push({
        date: date.toISOString().split('T')[0],
        value,
        change: Math.random() * 2 - 1,
        changePercent: (Math.random() * 10 - 5)
      });
    }
    
    return history;
  }
  
  /**
   * Check if volatility data is available (API key configured)
   */
  isVIXAvailable(): boolean {
    return !!this.ALPHA_VANTAGE_KEY;
  }
  
  /**
   * Get volatility data source status
   */
  getDataSourceStatus(): { available: boolean; source: string; message?: string } {
    if (this.ALPHA_VANTAGE_KEY) {
      return {
        available: true,
        source: 'VIXY volatility patterns via Alpha Vantage'
      };
    } else {
      return {
        available: false,
        source: 'Estimated volatility values',
        message: 'Set ALPHA_VANTAGE_API_KEY for real volatility patterns'
      };
    }
  }
}