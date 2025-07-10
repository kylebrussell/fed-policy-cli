// /src/services/__tests__/analysis.test.ts
import {
  findAnalogues,
  extractFedPolicyActions,
} from '../analysis';
import { EconomicDataPoint, ScenarioParams, FedPolicyAction } from '../../types';

// Mock the similarity utility so we can control the distance for testing
jest.mock('../../utils/similarity', () => ({
  calculateDtwDistance: jest.fn((a, b) => {
    // Simple sum of absolute differences for predictable testing
    return a.reduce((sum, val, i) => sum + Math.abs(val - b[i]), 0);
  }),
}));

describe('Analysis Service V2', () => {
  const mockData: EconomicDataPoint[] = [
    // Period 1 (Target)
    { date: '2023-01-01', unemployment_rate: 4.0, cpi_yoy: 7.0, fed_funds_rate: 4.5 },
    { date: '2023-02-01', unemployment_rate: 3.9, cpi_yoy: 6.5, fed_funds_rate: 4.75 }, // Hike
    { date: '2023-03-01', unemployment_rate: 3.8, cpi_yoy: 6.0, fed_funds_rate: 5.0 },  // Hike

    // Period 2 (Most Similar)
    { date: '2008-01-01', unemployment_rate: 4.1, cpi_yoy: 7.1, fed_funds_rate: 3.0 },
    { date: '2008-02-01', unemployment_rate: 4.0, cpi_yoy: 6.6, fed_funds_rate: 2.5 },
    { date: '2008-03-01', unemployment_rate: 3.9, cpi_yoy: 6.1, fed_funds_rate: 2.0 },

    // Period 3 (Less Similar - make it very distinct)
    { date: '1995-01-01', unemployment_rate: 15.5, cpi_yoy: 10.0, fed_funds_rate: 5.5 },
    { date: '1995-02-01', unemployment_rate: 15.4, cpi_yoy: 10.1, fed_funds_rate: 5.5 },
    { date: '1995-03-01', unemployment_rate: 15.4, cpi_yoy: 10.2, fed_funds_rate: 5.5 },

     // Period 4 (Least Similar)
     { date: '2015-01-01', unemployment_rate: 5.7, cpi_yoy: 0.5, fed_funds_rate: 0.25 },
     { date: '2015-02-01', unemployment_rate: 5.5, cpi_yoy: 0.4, fed_funds_rate: 0.25 },
     { date: '2015-03-01', unemployment_rate: 5.5, cpi_yoy: 0.3, fed_funds_rate: 0.25 },
  ];

  describe('extractFedPolicyActions', () => {
    it('should correctly identify HIKE, CUT, and HOLD actions', () => {
      const periodData: EconomicDataPoint[] = [
        { date: '2022-01-01', fed_funds_rate: 1.0 },
        { date: '2022-02-01', fed_funds_rate: 1.25 }, // +25bps HIKE
        { date: '2022-03-01', fed_funds_rate: 1.25 }, // HOLD
        { date: '2022-04-01', fed_funds_rate: 1.0 },  // -25bps CUT
      ];
      const actions = extractFedPolicyActions(periodData);
      expect(actions).toHaveLength(3);
      expect(actions[0]).toEqual({ date: '2022-02-01', action: 'HIKE', changeBps: 25 });
      expect(actions[1]).toEqual({ date: '2022-03-01', action: 'HOLD', changeBps: 0 });
      expect(actions[2]).toEqual({ date: '2022-04-01', action: 'CUT', changeBps: -25 });
    });

    it('should return an empty array for periods with less than 2 data points', () => {
      expect(extractFedPolicyActions([mockData[0]])).toEqual([]);
      expect(extractFedPolicyActions([])).toEqual([]);
    });
  });

  describe('findAnalogues', () => {
    const targetScenario = mockData.slice(0, 3);
    const allData = mockData.slice(3); // The rest is historical data
    const params: ScenarioParams = { // Mostly unused but needed for type
        windowMonths: 3, unemployment: {min:0, max:100}, inflation: {min:0, max:100}, useTariffContext: false
    };

    it('should find and rank analogues based on similarity score', () => {
      const analogues = findAnalogues(allData, targetScenario, params, 2);
      expect(analogues).toHaveLength(2);

      // Period 2 should be the most similar (lowest score)
      // The top analogue should be the one starting 2008-01-01
      expect(analogues[0].startDate).toBe('2008-01-01');
      // The next most similar will be the overlapping window starting 2008-02-01
      expect(analogues[1].startDate).toBe('2008-02-01');
    });

    it('should include the correct data and policy actions for each analogue', () => {
        const analogues = findAnalogues(allData, targetScenario, params, 1);
        const topAnalogue = analogues[0];

        expect(topAnalogue.startDate).toBe('2008-01-01');
        expect(topAnalogue.data).toHaveLength(3);
        expect(topAnalogue.data[0].date).toBe('2008-01-01');

        expect(topAnalogue.fedPolicyActions).toHaveLength(2);
        expect(topAnalogue.fedPolicyActions[0].action).toBe('CUT');
        expect(topAnalogue.fedPolicyActions[1].action).toBe('CUT');
    });

    it('should return the correct number of analogues based on topN', () => {
        const analogues = findAnalogues(allData, targetScenario, params, 3);
        expect(analogues).toHaveLength(3);
        expect(analogues[2].startDate).toBe('2008-03-01');
      });

    it('should return an empty array if there is no historical data', () => {
        const analogues = findAnalogues([], targetScenario, params, 5);
        expect(analogues).toHaveLength(0);
    });
  });
});
