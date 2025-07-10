// /src/services/analysis.ts
import {
  EconomicDataPoint,
  ScenarioParams,
  HistoricalAnalogue,
  FedPolicyAction,
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
    const prevRate = prev.fed_funds_rate;
    const currRate = curr.fed_funds_rate;

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

/**
 * Finds the most similar historical periods to a target scenario using DTW.
 * @param allData - The entire historical dataset.
 * @param targetScenario - The recent data slice to compare against.
 * @param params - Parameters for the analysis.
 * @param topN - The number of top analogues to return.
 * @returns A ranked array of HistoricalAnalogue objects.
 */
export function findAnalogues(
  allData: EconomicDataPoint[],
  targetScenario: EconomicDataPoint[],
  params: ScenarioParams, // Keep params for future use (e.g., weighting)
  topN: number = 5
): HistoricalAnalogue[] {
  const analogues: Omit<HistoricalAnalogue, 'fedPolicyActions'>[] = [];
  const targetSeries = targetScenario.map(d => d.cpi_yoy || 0); // Using CPI for now

  const windowSize = targetScenario.length;
  if (windowSize === 0) {
    return [];
  }

  for (let i = 0; i <= allData.length - windowSize; i++) {
    const historicalWindow = allData.slice(i, i + windowSize);
    const historicalSeries = historicalWindow.map(d => d.cpi_yoy || 0);

    // Avoid comparing the target scenario with itself
    if (historicalWindow[0].date === targetScenario[0].date) {
      continue;
    }

    const distance = calculateDtwDistance(targetSeries, historicalSeries);

    analogues.push({
      startDate: historicalWindow[0].date,
      endDate: historicalWindow[historicalWindow.length - 1].date,
      similarityScore: distance,
      data: historicalWindow,
    });
  }

  // Sort by similarity score (lower is better) and take the top N
  const topAnalogues = analogues
    .sort((a, b) => a.similarityScore - b.similarityScore)
    .slice(0, topN);

  // Now, enrich the top analogues with policy action details
  const detailedAnalogues: HistoricalAnalogue[] = topAnalogues.map(analogue => {
    const fedPolicyActions = extractFedPolicyActions(analogue.data);
    return { ...analogue, fedPolicyActions };
  });

  return detailedAnalogues;
}