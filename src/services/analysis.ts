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
    const prevRate = periodData[i - 1].DFF as number;
    const currRate = periodData[i].DFF as number;

    if (typeof prevRate === 'number' && typeof currRate === 'number') {
      const changeBps = Math.round((currRate - prevRate) * 100);
      if (changeBps !== 0) {
        actions.push({
          date: periodData[i].date,
          action: changeBps > 0 ? 'HIKE' : 'CUT',
          changeBps,
        });
      }
    }
  }
  // If there were no changes at all, report a single HOLD action for the period.
  if (actions.length === 0) {
    actions.push({
        date: periodData[Math.floor(periodData.length / 2)].date, // Middle of the period
        action: 'HOLD',
        changeBps: 0,
    });
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
 * Finds the most similar historical periods to a target scenario using weighted DTW with windowed normalization.
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

  // 1. Pre-extract the series for the target window for each indicator
  const targetSeriesByIndicator: { [id: string]: number[] } = {};
  for (const indicator of indicators) {
    targetSeriesByIndicator[indicator.id] = targetScenario.map(d => d[indicator.id] as number);
  }

  // 2. Iterate through historical windows and calculate weighted DTW distance
  const analogues: Omit<HistoricalAnalogue, 'fedPolicyActions'>[] = [];
  for (let i = 0; i <= allData.length - windowSize; i++) {
    const historicalWindow = allData.slice(i, i + windowSize);

    // Avoid comparing the scenario with itself by checking the start date
    if (historicalWindow[0].date === targetScenario[0].date) {
      continue;
    }

    let totalWeightedDistance = 0;
    for (const indicator of indicators) {
      const targetSeries = targetSeriesByIndicator[indicator.id];
      const historicalSeries = historicalWindow.map(d => d[indicator.id] as number);

      // ** CRITICAL CHANGE: Normalize each window independently **
      const normalizedTarget = normalizeSeries(targetSeries);
      const normalizedHistorical = normalizeSeries(historicalSeries);

      const distance = calculateDtwDistance(normalizedTarget, normalizedHistorical);
      totalWeightedDistance += distance * indicator.weight;
    }

    analogues.push({
      startDate: historicalWindow[0].date,
      endDate: historicalWindow[historicalWindow.length - 1].date,
      similarityScore: totalWeightedDistance,
      data: historicalWindow,
    });
  }

  // 3. Sort by similarity and enrich with policy actions
  const topAnalogues = analogues
    .sort((a, b) => a.similarityScore - b.similarityScore)
    .slice(0, topN);

  const detailedAnalogues: HistoricalAnalogue[] = topAnalogues.map(analogue => {
    const fedPolicyActions = extractFedPolicyActions(analogue.data);
    return { ...analogue, fedPolicyActions };
  });

  return detailedAnalogues;
}
