// /src/services/api.ts
import fetch from 'node-fetch';
import { FRED_API_URL, getFredApiKey, FRED_SERIES, FOMC_PROJECTION_SERIES } from '../constants';
import { EconomicDataPoint } from '../types';
import { FOMCProjection } from './database';

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

// Fetch FOMC projection data (Fed dot plot)
export const fetchFOMCProjections = async (apiKey?: string): Promise<FOMCProjection[]> => {
  const fredApiKey = getFredApiKey(apiKey);
  const projections: FOMCProjection[] = [];
  
  // Fetch all projection series
  const seriesData: { [key: string]: FredObservation[] } = {};
  
  const fetchPromises = Object.entries(FOMC_PROJECTION_SERIES).map(async ([seriesId, info]) => {
    try {
      const observations = await fetchSeriesData(seriesId, fredApiKey);
      seriesData[seriesId] = observations;
    } catch (error) {
      console.warn(`Warning: Could not fetch ${info.name}: ${error.message}`);
      seriesData[seriesId] = [];
    }
  });
  
  await Promise.all(fetchPromises);
  
  // Process the data to extract projections by meeting date and year
  // FOMC projections are released quarterly and project rates for specific years
  const projectionMap = new Map<string, FOMCProjection>();
  
  // Helper to extract projection year from the series data
  const processProjectionSeries = (seriesId: string, observations: FredObservation[]) => {
    observations.forEach(obs => {
      const meetingDate = obs.date;
      const value = parseFloat(obs.value);
      
      if (isNaN(value)) return;
      
      // FOMC projections typically project for current year, next 2-3 years
      // We'll need to parse the actual projection years from the data
      // For now, we'll use a simple approach based on the meeting date
      const meetingYear = parseInt(meetingDate.substring(0, 4));
      
      // Create projections for current year + next 3 years
      for (let yearOffset = 0; yearOffset <= 3; yearOffset++) {
        const projectionYear = (meetingYear + yearOffset).toString();
        const key = `${meetingDate}_${projectionYear}`;
        
        if (!projectionMap.has(key)) {
          projectionMap.set(key, {
            meeting_date: meetingDate,
            projection_year: projectionYear
          });
        }
        
        const projection = projectionMap.get(key)!;
        
        // Map the series to the appropriate field
        switch (seriesId) {
          case 'FEDTARMD':
            projection.median_rate = value;
            break;
          case 'FEDTARRM':
            projection.range_midpoint = value;
            break;
          case 'FEDTARRL':
            projection.range_low = value;
            break;
          case 'FEDTARRH':
            projection.range_high = value;
            break;
          case 'FEDTARMDLR':
            projection.longer_run_median = value;
            break;
        }
      }
    });
  };
  
  // Process each series
  Object.entries(seriesData).forEach(([seriesId, observations]) => {
    if (observations.length > 0) {
      processProjectionSeries(seriesId, observations);
    }
  });
  
  // Convert map to array
  projections.push(...projectionMap.values());
  
  // Sort by meeting date and projection year
  projections.sort((a, b) => {
    const dateCompare = a.meeting_date.localeCompare(b.meeting_date);
    if (dateCompare !== 0) return dateCompare;
    return a.projection_year.localeCompare(b.projection_year);
  });
  
  return projections;
};
