// /src/utils/similarity.ts
import { EconomicDataPoint } from '../types';

/**
 * Calculates the Euclidean distance between two vectors (arrays of numbers).
 * The vectors must be of the same length.
 * @param vectorA - The first vector.
 * @param vectorB - The second vector.
 * @returns The Euclidean distance.
 */
export function calculateEuclideanDistance(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same length.');
  }

  let sum = 0;
  for (let i = 0; i < vectorA.length; i++) {
    sum += (vectorA[i] - vectorB[i]) ** 2;
  }

  return Math.sqrt(sum);
}

/**
 * Calculates the distance between two time series using Dynamic Time Warping (DTW).
 * @param seriesA - The first time series (array of numbers).
 * @param seriesB - The second time series (array of numbers).
 * @returns The DTW distance.
 */
export function calculateDtwDistance(seriesA: number[], seriesB: number[]): number {
  const n = seriesA.length;
  const m = seriesB.length;
  const dtw = Array(n + 1)
    .fill(0)
    .map(() => Array(m + 1).fill(Infinity));

dtw[0][0] = 0;

for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(seriesA[i - 1] - seriesB[j - 1]);
      const lastMin = Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
      dtw[i][j] = cost + lastMin;
    }
  }

  return dtw[n][m];
}
