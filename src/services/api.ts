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
  allSeriesData: { [seriesId: string]: FredObservation[] }
): { [date: string]: number } => {
  const { type } = FRED_SERIES[seriesId];
  const transformed: { [date: string]: number } = {};

  const numericObservations = observations.map(obs => ({ date: obs.date, value: parseFloat(obs.value) })).filter(obs => !isNaN(obs.value));

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
  const allData: { [date: string]: EconomicDataPoint } = {};
  const allSeriesData: { [seriesId: string]: FredObservation[] } = {};

  // 1. Fetch all series data in parallel
  const seriesIds = Object.keys(FRED_SERIES);
  const fetchPromises = seriesIds.map(id => fetchSeriesData(id, fredApiKey));
  const results = await Promise.all(fetchPromises);
  seriesIds.forEach((id, index) => {
    allSeriesData[id] = results[index];
  });

  // 2. Process and merge data
  for (const seriesId of seriesIds) {
    const transformedValues = transformData(seriesId, allSeriesData[seriesId], allSeriesData);
    for (const date in transformedValues) {
      if (!allData[date]) {
        allData[date] = { date };
      }
      allData[date][seriesId] = transformedValues[date];
    }
  }

  // 3. Handle quarterly data forward-filling
  const sortedDates = Object.keys(allData).sort();
  const quarterlySeries = seriesIds.filter(id => FRED_SERIES[id].type === 'yoy_quarterly');
  
  quarterlySeries.forEach(id => {
    let lastValue: number | null = null;
    sortedDates.forEach(date => {
      if (allData[date][id] != null) {
        lastValue = allData[date][id] as number;
      } else if (lastValue !== null) {
        allData[date][id] = lastValue;
      }
    });
  });

  return Object.values(allData).sort((a, b) => a.date.localeCompare(b.date));
};