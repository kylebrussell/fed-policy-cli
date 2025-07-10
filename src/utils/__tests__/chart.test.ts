// /src/utils/__tests__/chart.test.ts
import { renderAsciiChart } from '../chart';

describe('Chart Utilities', () => {
  describe('renderAsciiChart', () => {
    it('should return a message for no data', () => {
      expect(renderAsciiChart([])).toBe('No data to display.');
      expect(renderAsciiChart(null)).toBe('No data to display.');
    });

    it('should return a message for only invalid data', () => {
        const invalidData = [{value: NaN, label: 'A'}, {value: Infinity, label: 'B'}];
        expect(renderAsciiChart(invalidData)).toBe('No valid data to display.');
    });

    it('should render a simple chart correctly', () => {
      const data = [
        { value: 10, label: 'A' },
        { value: 20, label: 'B' },
        { value: 30, label: 'C' },
      ];
      const chart = renderAsciiChart(data, 3);
      const lines = chart.split('\n');
      
      // Expected output structure:
      // 30.00 -   █
      //         █ █
      // 10.00 - █ █ █

      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain('30.00');
      expect(lines[0].trim().endsWith('█')).toBe(true);
      expect(lines[2]).toContain('10.00');
      expect(lines[2].trim().endsWith('█ █ █')).toBe(true);
    });

    it('should handle a flat line of data', () => {
        const data = [
          { value: 5, label: 'A' },
          { value: 5, label: 'B' },
          { value: 5, label: 'C' },
        ];
        const chart = renderAsciiChart(data, 3);
        const lines = chart.split('\n');
        // All bars should be at the max height
        expect(lines[0].trim().endsWith('█ █ █')).toBe(true);
      });

    it('should handle negative values', () => {
        const data = [
            { value: -10, label: 'A' },
            { value: 0, label: 'B' },
            { value: 10, label: 'C' },
          ];
          const chart = renderAsciiChart(data, 5);
          const lines = chart.split('\n');

          expect(lines).toHaveLength(5);
          expect(lines[0]).toContain('10.00'); // Max value
          expect(lines[4]).toContain('-10.00'); // Min value
          // The bar for 'A' should be at the bottom, 'C' at the top, 'B' in the middle
          expect(lines[4].includes('█')).toBe(true);
          expect(lines[0].includes('█')).toBe(true);
      });
  });
});
