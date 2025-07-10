// /src/services/analysis.ts
import {
  EconomicDataPoint,
  ScenarioParams,
  HistoricalAnalogue,
  FedPolicyAction,
  WeightedIndicator,
} from '../types';
import { calculateDtwDistance } from '../utils/similarity';

/**
 * Analyzes the fed_funds_rate within a given data period to extract policy actions.
 * @param periodData - A slice of economic data for a specific period.
 * @returns An array of FedPolicyAction objects.
 */
export function extractFedPolicyActions(periodData: EconomicDataPoint[]): FedPolicyAction[] {
  const actions: FedPolicyAction[] = [];
  if (periodData.length < 2) {
    return [];
  }

  for (let i = 1; i < periodData.length; i++) {
    const prev = periodData[i - 1];
    const curr = periodData[i];
    const prevRate = prev.DFF as number;
    const currRate = curr.DFF as number;

    if (typeof prevRate === 'number' && typeof currRate === 'number') {
      const changeBps = Math.round((currRate - prevRate) * 100);
      let action: 'HIKE' | 'CUT' | 'HOLD' = 'HOLD';

      if (changeBps > 0) {
        action = 'HIKE';
      } else if (changeBps < 0) {
        action = 'CUT';
      }

      actions.push({
        date: curr.date,
        action,
        changeBps,
      });
    }
  }
  return actions;
}

// Helper to normalize a single series (0 to 1 scale)
const normalizeSeries = (series: number[]): number[] => {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min;
  if (range === 0) return series.map(() => 0.5); // All values are the same
  return series.map(val => (val - min) / range);
};

/**
 * Finds the most similar historical periods to a target scenario using weighted DTW.
 * @param allData - The entire historical dataset.
 * @param targetScenario - The recent data slice to compare against.
 * @param params - Parameters for the analysis, including weighted indicators.
 * @param topN - The number of top analogues to return.
 * @returns A ranked array of HistoricalAnalogue objects.
 */
export function findAnalogues(
  allData: EconomicDataPoint[],
  targetScenario: EconomicDataPoint[],
  params: ScenarioParams,
  topN: number = 5
): HistoricalAnalogue[] {
  const { indicators } = params;
  const windowSize = targetScenario.length;

  if (windowSize === 0 || indicators.length === 0) {
    return [];
  }

  // 1. Normalize all relevant series across the entire dataset
  const normalizedData: { [indicatorId: string]: number[] } = {};
  for (const indicator of indicators) {
    const fullSeries = allData.map(d => d[indicator.id] as number);
    normalizedData[indicator.id] = normalizeSeries(fullSeries);
  }

  // 2. Create the normalized target vector
  const targetStartIndex = allData.length - windowSize;
  const getNormalizedWindow = (startIndex: number, indicatorId: string) => {
    return normalizedData[indicatorId].slice(startIndex, startIndex + windowSize);
  };

  // 3. Iterate through historical windows and calculate weighted DTW distance
  const analogues: Omit<HistoricalAnalogue, 'fedPolicyActions'>[] = [];
  for (let i = 0; i <= allData.length - windowSize; i++) {
    // Avoid comparing the scenario with itself
    if (i === targetStartIndex) {
      continue;
    }

    let totalWeightedDistance = 0;
    for (const indicator of indicators) {
      const targetSeries = getNormalizedWindow(targetStartIndex, indicator.id);
      const historicalSeries = getNormalizedWindow(i, indicator.id);
      
      const distance = calculateDtwDistance(targetSeries, historicalSeries);
      totalWeightedDistance += distance * indicator.weight;
    }

    const historicalWindow = allData.slice(i, i + windowSize);
    analogues.push({
      startDate: historicalWindow[0].date,
      endDate: historicalWindow[historicalWindow.length - 1].date,
      similarityScore: totalWeightedDistance,
      data: historicalWindow,
    });
  }

  // 4. Sort by similarity and enrich with policy actions
  const topAnalogues = analogues
    .sort((a, b) => a.similarityScore - b.similarityScore)
    .slice(0, topN);

  const detailedAnalogues: HistoricalAnalogue[] = topAnalogues.map(analogue => {
    const fedPolicyActions = extractFedPolicyActions(analogue.data);
    return { ...analogue, fedPolicyActions };
  });

  return detailedAnalogues;
}
