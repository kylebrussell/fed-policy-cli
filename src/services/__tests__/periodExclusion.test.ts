// /src/services/__tests__/periodExclusion.test.ts
import { applyPeriodExclusions } from '../analysis';
import { EconomicDataPoint, ScenarioParams } from '../../types';

describe('Period Exclusion Functions', () => {
  // Sample test data spanning multiple eras
  const testData: EconomicDataPoint[] = [
    { date: '1955-01-01', DFF: 1.5, UNRATE: 4.0 }, // Golden Age (1950-1969)
    { date: '1965-01-01', DFF: 4.0, UNRATE: 4.2 }, // Golden Age
    { date: '1975-01-01', DFF: 6.0, UNRATE: 8.5 }, // Stagflation
    { date: '1985-01-01', DFF: 8.0, UNRATE: 7.2 }, // Volcker
    { date: '1992-01-01', DFF: 4.0, UNRATE: 7.5 }, // Greenspan
    { date: '2000-01-01', DFF: 5.5, UNRATE: 4.0 }, // Dot-Com
    { date: '2008-01-01', DFF: 2.0, UNRATE: 5.0 }, // Financial Crisis
    { date: '2015-01-01', DFF: 0.25, UNRATE: 5.6 }, // Recovery
    { date: '2022-01-01', DFF: 0.5, UNRATE: 3.9 },  // Modern
  ];

  const baseParams: ScenarioParams = {
    indicators: [{ id: 'DFF', weight: 1.0 }],
    windowMonths: 6,
  };

  describe('excludeRecentYears', () => {
    it('should exclude last 5 years from analysis', () => {
      const params = { ...baseParams, excludeRecentYears: 5 };
      const filtered = applyPeriodExclusions(testData, params);
      
      // Should exclude data from approximately 2020 onwards
      const currentYear = new Date().getFullYear();
      const cutoffYear = currentYear - 5;
      
      const hasRecentData = filtered.some(point => 
        new Date(point.date).getFullYear() >= cutoffYear
      );
      expect(hasRecentData).toBe(false);
    });

    it('should include all data when excludeRecentYears is not set', () => {
      const filtered = applyPeriodExclusions(testData, baseParams);
      expect(filtered).toHaveLength(testData.length);
    });

    it('should handle excludeRecentYears of 0', () => {
      const params = { ...baseParams, excludeRecentYears: 0 };
      const filtered = applyPeriodExclusions(testData, params);
      expect(filtered).toHaveLength(testData.length);
    });
  });

  describe('focusEras', () => {
    it('should focus on stagflation era only', () => {
      const params = { ...baseParams, focusEras: ['stagflation'] };
      const filtered = applyPeriodExclusions(testData, params);
      
      // Should only include data from 1970-1978 (Stagflation Era)
      expect(filtered).toHaveLength(1);
      expect(filtered[0].date).toBe('1975-01-01');
    });

    it('should focus on multiple eras', () => {
      const params = { ...baseParams, focusEras: ['stagflation', 'volcker'] };
      const filtered = applyPeriodExclusions(testData, params);
      
      // Should include data from Stagflation (1970-1978) and Volcker (1979-1986)
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.date)).toContain('1975-01-01');
      expect(filtered.map(d => d.date)).toContain('1985-01-01');
    });

    it('should handle era aliases', () => {
      const params = { ...baseParams, focusEras: ['post-war'] }; // Alias for golden-age
      const filtered = applyPeriodExclusions(testData, params);
      
      // Should include both 1955 and 1965 as they're both in Golden Age (1950-1969)
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.date)).toContain('1955-01-01');
      expect(filtered.map(d => d.date)).toContain('1965-01-01');
    });

    it('should handle unknown era names gracefully', () => {
      const params = { ...baseParams, focusEras: ['unknown-era'] };
      const filtered = applyPeriodExclusions(testData, params);
      
      // Should return empty array as no data matches unknown era
      expect(filtered).toHaveLength(0);
    });
  });

  describe('excludeEras', () => {
    it('should exclude modern era', () => {
      const params = { ...baseParams, excludeEras: ['modern'] };
      const filtered = applyPeriodExclusions(testData, params);
      
      // Should exclude 2022 data point (Modern Era)
      const modernData = filtered.find(d => d.date === '2022-01-01');
      expect(modernData).toBeUndefined();
      expect(filtered.length).toBe(testData.length - 1);
    });

    it('should exclude multiple eras', () => {
      const params = { ...baseParams, excludeEras: ['modern', 'recovery'] };
      const filtered = applyPeriodExclusions(testData, params);
      
      // Should exclude Modern (2022) and Recovery (2015) data
      expect(filtered.length).toBe(testData.length - 2);
      expect(filtered.find(d => d.date === '2022-01-01')).toBeUndefined();
      expect(filtered.find(d => d.date === '2015-01-01')).toBeUndefined();
    });
  });

  describe('excludeDateRanges', () => {
    it('should exclude custom date range', () => {
      const params = { 
        ...baseParams, 
        excludeDateRanges: [
          { start: '2000-01-01', end: '2030-12-31', description: 'Post-2000' }
        ]
      };
      const filtered = applyPeriodExclusions(testData, params);
      
      // Should exclude all data from 2000 onwards
      const post2000Data = filtered.filter(d => new Date(d.date) >= new Date('2000-01-01'));
      expect(post2000Data).toHaveLength(0);
      
      // Should keep pre-2000 data
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(d => new Date(d.date) < new Date('2000-01-01'))).toBe(true);
    });

    it('should handle multiple date ranges', () => {
      const params = { 
        ...baseParams, 
        excludeDateRanges: [
          { start: '1970-01-01', end: '1980-01-01', description: 'Stagflation+Early Volcker' },
          { start: '2020-01-01', end: '2030-12-31', description: 'Modern Era' }
        ]
      };
      const filtered = applyPeriodExclusions(testData, params);
      
      // Should exclude 1975, 1985 (partial overlap), and 2022 data
      expect(filtered.find(d => d.date === '1975-01-01')).toBeUndefined();
      expect(filtered.find(d => d.date === '2022-01-01')).toBeUndefined();
    });
  });

  describe('combined exclusions', () => {
    it('should apply multiple exclusion criteria together', () => {
      const params = { 
        ...baseParams,
        excludeRecentYears: 10,
        excludeEras: ['stagflation'],
        excludeDateRanges: [
          { start: '1990-01-01', end: '1995-01-01', description: 'Early 90s' }
        ]
      };
      const filtered = applyPeriodExclusions(testData, params);
      
      // Should exclude: recent 10 years, stagflation era, and early 90s
      expect(filtered.find(d => d.date === '1975-01-01')).toBeUndefined(); // Stagflation
      expect(filtered.find(d => d.date === '1992-01-01')).toBeUndefined(); // Early 90s exclusion
      
      // Recent years (varies by current date) should also be excluded
      const currentYear = new Date().getFullYear();
      const recentCutoff = currentYear - 10;
      const hasRecentData = filtered.some(d => new Date(d.date).getFullYear() >= recentCutoff);
      expect(hasRecentData).toBe(false);
    });

    it('should prioritize focusEras over excludeEras', () => {
      const params = { 
        ...baseParams,
        focusEras: ['volcker'],
        excludeEras: ['volcker'] // This should be ignored due to focus taking precedence
      };
      const filtered = applyPeriodExclusions(testData, params);
      
      // focusEras should take precedence, so we should get Volcker era data
      expect(filtered).toHaveLength(1);
      expect(filtered[0].date).toBe('1985-01-01');
    });
  });

  describe('edge cases', () => {
    it('should handle empty data array', () => {
      const filtered = applyPeriodExclusions([], baseParams);
      expect(filtered).toHaveLength(0);
    });

    it('should handle data with no exclusions', () => {
      const filtered = applyPeriodExclusions(testData, baseParams);
      expect(filtered).toEqual(testData);
    });

    it('should preserve data order after filtering', () => {
      const params = { ...baseParams, excludeEras: ['modern'] };
      const filtered = applyPeriodExclusions(testData, params);
      
      // Check that remaining data is still in chronological order
      for (let i = 1; i < filtered.length; i++) {
        expect(new Date(filtered[i].date).getTime())
          .toBeGreaterThan(new Date(filtered[i-1].date).getTime());
      }
    });
  });
});