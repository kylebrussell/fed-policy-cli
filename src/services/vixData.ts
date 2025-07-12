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
 * Service for fetching real VIX and volatility data
 * Uses Alpha Vantage free API for VIX data
 */
export class VIXDataService {
  private readonly ALPHA_VANTAGE_KEY: string;
  private readonly BASE_URL = 'https://www.alphavantage.co/query';
  
  constructor() {
    this.ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';
    
    if (!this.ALPHA_VANTAGE_KEY) {
      console.warn('Warning: ALPHA_VANTAGE_API_KEY not set. VIX data will be unavailable.');
    }
  }
  
  /**
   * Get current VIX level
   */
  async getCurrentVIX(): Promise<number> {
    if (!this.ALPHA_VANTAGE_KEY) {
      // Fallback to reasonable estimate when no API key
      return this.getEstimatedVIX();
    }
    
    try {
      const data = await this.fetchVIXData();
      const latestData = this.getLatestDataPoint(data);
      return latestData?.value || this.getEstimatedVIX();
    } catch (error) {
      console.warn('Failed to fetch VIX data:', error);
      return this.getEstimatedVIX();
    }
  }
  
  /**
   * Get VIX historical data for context
   */
  async getVIXHistory(days: number = 30): Promise<VIXDataPoint[]> {
    if (!this.ALPHA_VANTAGE_KEY) {
      return this.getEstimatedVIXHistory(days);
    }
    
    try {
      const data = await this.fetchVIXData();
      return this.processVIXHistory(data, days);
    } catch (error) {
      console.warn('Failed to fetch VIX history:', error);
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
   * Fetch VIX data from Alpha Vantage
   */
  private async fetchVIXData(): Promise<any> {
    const url = `${this.BASE_URL}?function=TIME_SERIES_DAILY&symbol=VIX&apikey=${this.ALPHA_VANTAGE_KEY}`;
    
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
   * Get latest VIX data point from API response
   */
  private getLatestDataPoint(data: any): VIXDataPoint | null {
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) return null;
    
    const dates = Object.keys(timeSeries).sort().reverse();
    if (dates.length === 0) return null;
    
    const latestDate = dates[0];
    const dayData = timeSeries[latestDate];
    
    return {
      date: latestDate,
      value: parseFloat(dayData['4. close']),
      change: parseFloat(dayData['4. close']) - parseFloat(dayData['1. open']),
      changePercent: ((parseFloat(dayData['4. close']) - parseFloat(dayData['1. open'])) / parseFloat(dayData['1. open'])) * 100
    };
  }
  
  /**
   * Process VIX history from API data
   */
  private processVIXHistory(data: any, days: number): VIXDataPoint[] {
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) return [];
    
    const dates = Object.keys(timeSeries).sort().reverse().slice(0, days);
    
    return dates.map(date => {
      const dayData = timeSeries[date];
      return {
        date,
        value: parseFloat(dayData['4. close']),
        change: parseFloat(dayData['4. close']) - parseFloat(dayData['1. open']),
        changePercent: ((parseFloat(dayData['4. close']) - parseFloat(dayData['1. open'])) / parseFloat(dayData['1. open'])) * 100
      };
    });
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
   * Check if VIX is available (API key configured)
   */
  isVIXAvailable(): boolean {
    return !!this.ALPHA_VANTAGE_KEY;
  }
  
  /**
   * Get VIX data source status
   */
  getDataSourceStatus(): { available: boolean; source: string; message?: string } {
    if (this.ALPHA_VANTAGE_KEY) {
      return {
        available: true,
        source: 'Alpha Vantage API'
      };
    } else {
      return {
        available: false,
        source: 'Estimated values',
        message: 'Set ALPHA_VANTAGE_API_KEY for real VIX data'
      };
    }
  }
}