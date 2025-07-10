// /src/services/__tests__/dataQuality.test.ts
import { assessDataQuality, filterDataQuality } from '../analysis';
import { EconomicDataPoint } from '../../types';

describe('Data Quality Functions', () => {
  describe('assessDataQuality', () => {
    it('should identify high reliability for modern periods', () => {
      const result = assessDataQuality('2020-01-01');
      expect(result.reliability).toBe('high');
      expect(result.warnings).toHaveLength(0);
      expect(result.shouldExclude).toBe(false);
    });

    it('should identify medium reliability for early reliable periods', () => {
      const result = assessDataQuality('1975-01-01');
      expect(result.reliability).toBe('medium');
      expect(result.warnings).toContain('Early Fed data (1960s-1980s) may have some quality issues');
      expect(result.shouldExclude).toBe(false);
    });

    it('should identify low reliability for pre-1960 periods', () => {
      const result = assessDataQuality('1955-01-01');
      expect(result.reliability).toBe('low');
      expect(result.warnings).toContain('Pre-1960 data may contain unrealistic Fed policy volatility');
      expect(result.warnings).toContain('Period predates reliable Fed Funds Rate data (1960+)');
      expect(result.shouldExclude).toBe(true);
    });

    it('should handle edge case at reliability boundary', () => {
      const result = assessDataQuality('1960-01-01');
      expect(result.reliability).toBe('medium');
      expect(result.shouldExclude).toBe(false);
    });
  });

  describe('filterDataQuality', () => {
    const testData: EconomicDataPoint[] = [
      { date: '1955-01-01', DFF: 1.5, UNRATE: 4.0 },
      { date: '1965-01-01', DFF: 4.0, UNRATE: 4.2 },
      { date: '1985-01-01', DFF: 8.0, UNRATE: 7.2 },
      { date: '2020-01-01', DFF: 0.25, UNRATE: 3.5 },
    ];

    it('should filter out unreliable data by default', () => {
      const filtered = filterDataQuality(testData);
      expect(filtered).toHaveLength(3);
      expect(filtered[0].date).toBe('1965-01-01');
      expect(filtered.every(d => d.date >= '1960-01-01')).toBe(true);
    });

    it('should include all data when excludeUnreliable is false', () => {
      const filtered = filterDataQuality(testData, false);
      expect(filtered).toHaveLength(4);
      expect(filtered[0].date).toBe('1955-01-01');
    });

    it('should handle empty data array', () => {
      const filtered = filterDataQuality([]);
      expect(filtered).toHaveLength(0);
    });

    it('should preserve data order after filtering', () => {
      const filtered = filterDataQuality(testData);
      for (let i = 1; i < filtered.length; i++) {
        expect(new Date(filtered[i].date).getTime()).toBeGreaterThan(new Date(filtered[i-1].date).getTime());
      }
    });
  });
});