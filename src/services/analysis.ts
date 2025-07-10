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
 * Analyzes the fed_funds_rate within a given data period to extract meaningful policy actions.
 * Filters out daily noise and groups consecutive changes to show realistic Fed policy decisions.
 * @param periodData - A slice of economic data for a specific period.
 * @returns An array of FedPolicyAction objects representing significant policy moves.
 */
export function extractFedPolicyActions(periodData: EconomicDataPoint[]): FedPolicyAction[] {
  if (periodData.length < 2) {
    return [];
  }

  // First, identify all rate changes above the minimum threshold
  const MIN_SIGNIFICANT_CHANGE_BPS = 10; // Minimum 10 bps to be considered significant
  const rawChanges: { date: string; changeBps: number; rate: number }[] = [];

  for (let i = 1; i < periodData.length; i++) {
    const prevRate = periodData[i - 1].DFF as number;
    const currRate = periodData[i].DFF as number;

    if (typeof prevRate === 'number' && typeof currRate === 'number') {
      const changeBps = Math.round((currRate - prevRate) * 100);
      if (Math.abs(changeBps) >= MIN_SIGNIFICANT_CHANGE_BPS) {
        rawChanges.push({
          date: periodData[i].date,
          changeBps,
          rate: currRate
        });
      }
    }
  }

  // Group consecutive changes in the same direction within a reasonable timeframe
  const actions: FedPolicyAction[] = [];
  const MAX_GROUPING_DAYS = 30; // Group changes within 30 days

  for (let i = 0; i < rawChanges.length; i++) {
    const currentChange = rawChanges[i];
    let totalChange = currentChange.changeBps;
    let endDate = currentChange.date;
    
    // Look ahead for consecutive changes in the same direction
    let j = i + 1;
    while (j < rawChanges.length) {
      const nextChange = rawChanges[j];
      const daysDiff = Math.abs(new Date(nextChange.date).getTime() - new Date(currentChange.date).getTime()) / (1000 * 60 * 60 * 24);
      
      // If next change is in same direction and within grouping window
      if (daysDiff <= MAX_GROUPING_DAYS && 
          Math.sign(nextChange.changeBps) === Math.sign(currentChange.changeBps)) {
        totalChange += nextChange.changeBps;
        endDate = nextChange.date;
        j++;
      } else {
        break;
      }
    }

    // Only add significant grouped changes
    if (Math.abs(totalChange) >= MIN_SIGNIFICANT_CHANGE_BPS) {
      actions.push({
        date: endDate, // Use the final date of the grouped changes
        action: totalChange > 0 ? 'HIKE' : 'CUT',
        changeBps: totalChange,
      });
    }

    // Skip the changes we've already grouped
    i = j - 1;
  }

  // If no significant changes found, report a HOLD action
  if (actions.length === 0) {
    actions.push({
      date: periodData[Math.floor(periodData.length / 2)].date,
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
 * Defines major economic eras for enhanced temporal diversity scoring.
 * Each era has distinct economic characteristics that provide valuable analogues.
 */
const ECONOMIC_ERAS = {
  MODERN_ERA: { start: 2020, end: 2030, name: 'Modern Era (Post-COVID)', bonus: 1.15 },
  GREAT_RECESSION_RECOVERY: { start: 2010, end: 2019, name: 'Great Recession Recovery', bonus: 1.05 },
  FINANCIAL_CRISIS: { start: 2007, end: 2009, name: 'Financial Crisis', bonus: 0.85 },
  DOT_COM_ERA: { start: 1995, end: 2006, name: 'Dot-Com Era', bonus: 0.90 },
  GREENSPAN_ERA: { start: 1987, end: 1994, name: 'Greenspan Era', bonus: 0.88 },
  VOLCKER_INFLATION: { start: 1979, end: 1986, name: 'Volcker Anti-Inflation', bonus: 0.80 },
  STAGFLATION: { start: 1970, end: 1978, name: 'Stagflation Era', bonus: 0.75 },
  GOLDEN_AGE: { start: 1950, end: 1969, name: 'Post-War Golden Age', bonus: 0.85 },
  HISTORICAL: { start: 1900, end: 1949, name: 'Early Historical', bonus: 0.95 }
};

/**
 * Enhanced temporal diversity bonus that considers economic eras and promotes historical spread.
 * Provides stronger bonuses for historical periods and penalizes recent clustering.
 * @param startDate - The start date of the historical period
 * @returns Diversity multiplier (lower values = better diversity bonus)
 */
function calculateTemporalDiversityBonus(startDate: string): number {
  const date = new Date(startDate);
  const year = date.getFullYear();
  
  // Find which economic era this period belongs to
  const era = Object.values(ECONOMIC_ERAS).find(era => year >= era.start && year <= era.end);
  const baseBonus = era ? era.bonus : 1.0;
  
  // Apply additional recency penalty for very recent periods to encourage historical diversity
  const currentYear = new Date().getFullYear();
  const yearsAgo = currentYear - year;
  
  let recencyPenalty = 1.0;
  if (yearsAgo < 2) {
    recencyPenalty = 1.3; // Strong penalty for very recent periods (last 2 years)
  } else if (yearsAgo < 5) {
    recencyPenalty = 1.2; // Moderate penalty for recent periods (last 5 years)
  } else if (yearsAgo < 10) {
    recencyPenalty = 1.1; // Light penalty for somewhat recent periods
  }
  
  // Calculate final temporal diversity score
  const finalScore = baseBonus * recencyPenalty;
  
  return Math.max(0.5, Math.min(2.0, finalScore)); // Clamp between 0.5 and 2.0
}

/**
 * Gets the economic era name for a given date.
 * Useful for displaying historical context in results.
 * @param startDate - The start date of the historical period
 * @returns Era name and timeframe
 */
export function getEconomicEra(startDate: string): { name: string; timeframe: string } {
  const year = new Date(startDate).getFullYear();
  const era = Object.values(ECONOMIC_ERAS).find(era => year >= era.start && year <= era.end);
  
  if (era) {
    return {
      name: era.name,
      timeframe: `${era.start}-${era.end}`
    };
  }
  
  return {
    name: 'Unknown Era',
    timeframe: `${year}`
  };
}

/**
 * Applies temporal diversity filtering to prevent overlapping periods in results.
 * Ensures minimum time gap between returned analogues for meaningful historical diversity.
 * @param sortedAnalogues - Analogues sorted by similarity score (best first)
 * @param maxResults - Maximum number of results to return
 * @returns Filtered analogues with enforced temporal diversity
 */
function applyTemporalDiversityFilter(
  sortedAnalogues: Omit<HistoricalAnalogue, 'fedPolicyActions'>[],
  maxResults: number,
  minTimeGapMonths: number = 6
): Omit<HistoricalAnalogue, 'fedPolicyActions'>[] {
  const selectedAnalogues: Omit<HistoricalAnalogue, 'fedPolicyActions'>[] = [];
  
  for (const analogue of sortedAnalogues) {
    // Check if this analogue conflicts with any already selected
    const hasOverlap = selectedAnalogues.some(selected => {
      const analogueStart = new Date(analogue.startDate);
      const analogueEnd = new Date(analogue.endDate);
      const selectedStart = new Date(selected.startDate);
      const selectedEnd = new Date(selected.endDate);
      
      // Calculate time gap between periods
      const gapFromEnd = Math.abs(analogueStart.getTime() - selectedEnd.getTime());
      const gapFromStart = Math.abs(selectedStart.getTime() - analogueEnd.getTime());
      const minGap = Math.min(gapFromEnd, gapFromStart);
      
      // Convert milliseconds to months (approximate)
      const gapMonths = minGap / (1000 * 60 * 60 * 24 * 30.44);
      
      return gapMonths < minTimeGapMonths;
    });
    
    if (!hasOverlap) {
      selectedAnalogues.push(analogue);
      
      // Stop when we have enough diverse results
      if (selectedAnalogues.length >= maxResults) {
        break;
      }
    }
  }
  
  return selectedAnalogues;
}

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

  // 2. Iterate through historical windows and calculate weighted DTW distance with enhanced diversity
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

    // Apply enhanced temporal diversity bonus (simplified approach)
    const temporalDiversityScore = calculateTemporalDiversityBonus(historicalWindow[0].date);
    const finalScore = totalWeightedDistance * temporalDiversityScore;

    analogues.push({
      startDate: historicalWindow[0].date,
      endDate: historicalWindow[historicalWindow.length - 1].date,
      similarityScore: finalScore,
      data: historicalWindow,
    });
  }

  // 3. Sort by similarity and apply temporal diversity filtering
  const sortedAnalogues = analogues.sort((a, b) => a.similarityScore - b.similarityScore);
  
  // 4. Apply temporal diversity filter to prevent overlapping periods
  const minGapMonths = params.minTimeGapMonths || 6; // Default to 6 months
  const diverseAnalogues = applyTemporalDiversityFilter(sortedAnalogues, topN, minGapMonths);

  const detailedAnalogues: HistoricalAnalogue[] = diverseAnalogues.map(analogue => {
    const fedPolicyActions = extractFedPolicyActions(analogue.data);
    return { ...analogue, fedPolicyActions };
  });

  return detailedAnalogues;
}
