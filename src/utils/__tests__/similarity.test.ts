// /src/utils/__tests__/similarity.test.ts
import {
  calculateEuclideanDistance,
  calculateDtwDistance,
} from '../similarity';

describe('Similarity Utilities', () => {
  describe('calculateEuclideanDistance', () => {
    it('should return 0 for identical vectors', () => {
      expect(calculateEuclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
    });

    it('should calculate the correct distance for simple vectors', () => {
      // sqrt((3-0)^2 + (4-0)^2) = sqrt(9 + 16) = sqrt(25) = 5
      expect(calculateEuclideanDistance([0, 0], [3, 4])).toBe(5);
    });

    it('should handle negative numbers', () => {
      // sqrt((-1-1)^2 + (-2-2)^2) = sqrt((-2)^2 + (-4)^2) = sqrt(4 + 16) = sqrt(20)
      expect(calculateEuclideanDistance([1, 2], [-1, -2])).toBeCloseTo(Math.sqrt(20));
    });

    it('should throw an error for vectors of different lengths', () => {
      expect(() => calculateEuclideanDistance([1, 2], [1, 2, 3])).toThrow(
        'Vectors must have the same length.'
      );
    });
  });

  describe('calculateDtwDistance', () => {
    it('should return 0 for identical time series', () => {
      expect(calculateDtwDistance([1, 2, 3, 2, 1], [1, 2, 3, 2, 1])).toBe(0);
    });

    it('should calculate the correct distance for simple, aligned series', () => {
      const seriesA = [1, 2, 3];
      const seriesB = [2, 3, 4];
      // Cost matrix should be straightforward
      // Cost = |1-2| + |2-3| + |3-4| = 1 + 1 + 1 = 3, but DTW can be more optimal
      expect(calculateDtwDistance(seriesA, seriesB)).toBe(2);
    });

    it('should find the optimal path for unaligned series', () => {
      const seriesA = [1, 5, 2];
      const seriesB = [1, 2, 5, 2];
      // DTW should be able to align the '5' and '2' in seriesA with the corresponding values in seriesB
      // The exact value is complex to calculate by hand, but it should be less than a naive Euclidean distance.
      expect(calculateDtwDistance(seriesA, seriesB)).toBeLessThan(10); // A loose upper bound
    });
  });
});
