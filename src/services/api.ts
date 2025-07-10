// /src/services/api.ts
import fetch from 'node-fetch';
import { FRED_API_URL, getFredApiKey, FRED_SERIES } from '../constants';
import { EconomicDataPoint } from '../types';

interface FredObservation {
  date: string;
  value: string;
}

const fetchSeriesData = async (seriesId: string, apiKey: string): Promise<FredObservation[]> => {
  const url = `${FRED_API_URL}?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data for series ${seriesId}: ${response.statusText}`);
  }
  const data: any = await response.json();
  return data.observations.map((obs: any) => ({ date: obs.date, value: obs.value }));
};

const transformData = (
  seriesId: string,
  observations: FredObservation[],
): { [date: string]: number } => {
  const { type } = FRED_SERIES[seriesId];
  const transformed: { [date: string]: number } = {};

  const numericObservations = observations
    .map(obs => ({ date: obs.date, value: parseFloat(obs.value) }))
    .filter(obs => !isNaN(obs.value));

  switch (type) {
    case 'yoy':
    case 'yoy_quarterly':
      const valueMap: { [date: string]: number } = {};
      numericObservations.forEach(point => {
        valueMap[point.date] = point.value;
      });

      numericObservations.forEach(point => {
        const [year, month, day] = point.date.split('-').map(Number);
        const prevYearDate = `${year - 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (valueMap[prevYearDate]) {
          const prevYearValue = valueMap[prevYearDate];
          const yoy = ((point.value - prevYearValue) / prevYearValue) * 100;
          transformed[point.date] = parseFloat(yoy.toFixed(2));
        }
      });
      break;

    case 'level':
    default:
      numericObservations.forEach(point => {
        transformed[point.date] = point.value;
      });
      break;
  }

  return transformed;
};

export const fetchAllEconomicData = async (apiKey?: string): Promise<EconomicDataPoint[]> => {
  const fredApiKey = getFredApiKey(apiKey);
  const allSeriesData: { [seriesId: string]: { [date: string]: number } } = {};

  // 1. Fetch and transform all series data in parallel
  const seriesIds = Object.keys(FRED_SERIES);
  const fetchPromises = seriesIds.map(async (id) => {
    const observations = await fetchSeriesData(id, fredApiKey);
    allSeriesData[id] = transformData(id, observations);
  });
  await Promise.all(fetchPromises);

  // 2. Create a master set of all dates
  const allDates = new Set<string>();
  seriesIds.forEach(id => {
    Object.keys(allSeriesData[id]).forEach(date => allDates.add(date));
  });
  const sortedDates = Array.from(allDates).sort();

  // 3. Upsample all series to a daily frequency by forward-filling
  const finalData: EconomicDataPoint[] = [];
  const lastValues: { [seriesId: string]: number | null } = {};
  seriesIds.forEach(id => (lastValues[id] = null));

  for (const date of sortedDates) {
    const dataPoint: EconomicDataPoint = { date };
    for (const id of seriesIds) {
      if (allSeriesData[id][date] != null) {
        lastValues[id] = allSeriesData[id][date];
      }
      if (lastValues[id] !== null) {
        dataPoint[id] = lastValues[id];
      }
    }
    finalData.push(dataPoint);
  }

  return finalData;
};
