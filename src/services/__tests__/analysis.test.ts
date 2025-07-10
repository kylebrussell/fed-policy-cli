import { findAnalogues } from '../analysis';
import { EconomicDataPoint, ScenarioParams } from '../../types';

describe('Analysis Service', () => {
  const mockData: EconomicDataPoint[] = [
    { date: '2020-01-01', unemployment_rate: 3.5, cpi_yoy: 2.0, fed_funds_rate: 1.5 },
    { date: '2020-02-01', unemployment_rate: 3.6, cpi_yoy: 2.1, fed_funds_rate: 1.5 },
    { date: '2020-03-01', unemployment_rate: 4.4, cpi_yoy: 2.2, fed_funds_rate: 1.0 },
    { date: '2020-04-01', unemployment_rate: 14.7, cpi_yoy: 0.3, fed_funds_rate: 0.25 },
    { date: '2020-05-01', unemployment_rate: 13.3, cpi_yoy: 0.1, fed_funds_rate: 0.25 },
    { date: '2020-06-01', unemployment_rate: 11.1, cpi_yoy: 0.6, fed_funds_rate: 0.25 },
    { date: '2021-01-01', unemployment_rate: 6.3, cpi_yoy: 1.4, fed_funds_rate: 0.25 },
    { date: '2021-02-01', unemployment_rate: 6.2, cpi_yoy: 1.7, fed_funds_rate: 0.25 },
    { date: '2021-03-01', unemployment_rate: 6.0, cpi_yoy: 2.6, fed_funds_rate: 0.25 },
    { date: '2022-01-01', unemployment_rate: 4.0, cpi_yoy: 7.5, fed_funds_rate: 0.25 },
    { date: '2022-02-01', unemployment_rate: 3.8, cpi_yoy: 7.9, fed_funds_rate: 0.25 },
    { date: '2022-03-01', unemployment_rate: 3.6, cpi_yoy: 8.5, fed_funds_rate: 0.50 },
    { date: '2022-04-01', unemployment_rate: 3.6, cpi_yoy: 8.3, fed_funds_rate: 0.75 },
    { date: '2022-05-01', unemployment_rate: 3.6, cpi_yoy: 8.6, fed_funds_rate: 1.00 },
    { date: '2022-06-01', unemployment_rate: 3.6, cpi_yoy: 9.1, fed_funds_rate: 1.75 },
  ];

  describe('findAnalogues', () => {
    it('should find analogues for high unemployment and low inflation', () => {
      const params: ScenarioParams = {
        unemployment: { min: 10, max: 15 },
        inflation: { min: 0, max: 1 },
        windowMonths: 3,
        useTariffContext: false,
      };

      const analogues = findAnalogues(mockData, params);
      expect(analogues.length).toBeGreaterThan(0);
      
      analogues.forEach(analogue => {
        expect(analogue.avgUnemployment).toBeGreaterThanOrEqual(10);
        expect(analogue.avgUnemployment).toBeLessThanOrEqual(15);
        expect(analogue.avgInflation).toBeGreaterThanOrEqual(0);
        expect(analogue.avgInflation).toBeLessThanOrEqual(1);
      });
    });

    it('should find analogues for moderate unemployment and high inflation', () => {
      const params: ScenarioParams = {
        unemployment: { min: 3, max: 5 },
        inflation: { min: 7, max: 9 },
        windowMonths: 3,
        useTariffContext: false,
      };

      const analogues = findAnalogues(mockData, params);
      expect(analogues.length).toBeGreaterThan(0);
      
      analogues.forEach(analogue => {
        expect(analogue.avgUnemployment).toBeGreaterThanOrEqual(3);
        expect(analogue.avgUnemployment).toBeLessThanOrEqual(5);
        expect(analogue.avgInflation).toBeGreaterThanOrEqual(7);
        expect(analogue.avgInflation).toBeLessThanOrEqual(9);
      });
    });

    it('should determine correct Fed funds rate outcomes', () => {
      const testData: EconomicDataPoint[] = [
        { date: '2020-01-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.0 },
        { date: '2020-02-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.5 }, // HIKE
        { date: '2020-03-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.5 },
        { date: '2020-04-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.0 }, // CUT
        { date: '2020-05-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.0 },
        { date: '2020-06-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.0 }, // HOLD
      ];

      const params: ScenarioParams = {
        unemployment: { min: 3, max: 5 },
        inflation: { min: 1, max: 3 },
        windowMonths: 2,
        useTariffContext: false,
      };

      const analogues = findAnalogues(testData, params);
      expect(analogues.length).toBeGreaterThan(0);
      
      // Test that we get different outcomes
      const outcomes = analogues.map(a => a.outcome);
      expect(outcomes).toContain('HIKE');
      expect(outcomes).toContain('CUT');
      expect(outcomes).toContain('HOLD');
    });

    it('should handle tariff context filtering', () => {
      // Use dates that overlap with tariff periods
      const tariffData: EconomicDataPoint[] = [
        { date: '2018-03-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.0 },
        { date: '2018-04-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.0 },
        { date: '2018-05-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.0 },
        { date: '2021-01-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.0 },
        { date: '2021-02-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.0 },
        { date: '2021-03-01', unemployment_rate: 4.0, cpi_yoy: 2.0, fed_funds_rate: 1.0 },
      ];

      const params: ScenarioParams = {
        unemployment: { min: 3, max: 5 },
        inflation: { min: 1, max: 3 },
        windowMonths: 3,
        useTariffContext: true,
      };

      const analogues = findAnalogues(tariffData, params);
      expect(analogues.length).toBeGreaterThan(0);
      
      // All analogues should be within tariff periods
      analogues.forEach(analogue => {
        expect(analogue.avgUnemployment).toBeGreaterThanOrEqual(3);
        expect(analogue.avgUnemployment).toBeLessThanOrEqual(5);
        expect(analogue.avgInflation).toBeGreaterThanOrEqual(1);
        expect(analogue.avgInflation).toBeLessThanOrEqual(3);
      });
    });

    it('should return empty array when no analogues found', () => {
      const params: ScenarioParams = {
        unemployment: { min: 50, max: 60 }, // Impossible range
        inflation: { min: 1, max: 3 },
        windowMonths: 3,
        useTariffContext: false,
      };

      const analogues = findAnalogues(mockData, params);
      expect(analogues).toHaveLength(0);
    });

    it('should handle empty data gracefully', () => {
      const params: ScenarioParams = {
        unemployment: { min: 3, max: 5 },
        inflation: { min: 1, max: 3 },
        windowMonths: 3,
        useTariffContext: false,
      };

      const analogues = findAnalogues([], params);
      expect(analogues).toHaveLength(0);
    });

    it('should handle missing data fields gracefully', () => {
      const incompleteData: EconomicDataPoint[] = [
        { date: '2020-01-01', unemployment_rate: 4.0, cpi_yoy: 2.0 }, // Missing fed_funds_rate
        { date: '2020-02-01', unemployment_rate: 4.0, fed_funds_rate: 1.0 }, // Missing cpi_yoy
        { date: '2020-03-01', cpi_yoy: 2.0, fed_funds_rate: 1.0 }, // Missing unemployment_rate
      ];

      const params: ScenarioParams = {
        unemployment: { min: 3, max: 5 },
        inflation: { min: 1, max: 3 },
        windowMonths: 3,
        useTariffContext: false,
      };

      const analogues = findAnalogues(incompleteData, params);
      expect(analogues).toHaveLength(0); // Should handle missing data gracefully
    });

    it('should round averages to 2 decimal places', () => {
      const testData: EconomicDataPoint[] = [
        { date: '2020-01-01', unemployment_rate: 4.123, cpi_yoy: 2.456, fed_funds_rate: 1.0 },
        { date: '2020-02-01', unemployment_rate: 4.789, cpi_yoy: 2.111, fed_funds_rate: 1.0 },
        { date: '2020-03-01', unemployment_rate: 4.333, cpi_yoy: 2.999, fed_funds_rate: 1.0 },
      ];

      const params: ScenarioParams = {
        unemployment: { min: 4, max: 5 },
        inflation: { min: 2, max: 3 },
        windowMonths: 3,
        useTariffContext: false,
      };

      const analogues = findAnalogues(testData, params);
      expect(analogues).toHaveLength(1);
      expect(analogues[0].avgUnemployment).toBe(4.42);
      expect(analogues[0].avgInflation).toBe(2.52);
    });
  });
});