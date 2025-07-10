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

const calculateCpiYoy = (cpiData: FredObservation[]): { [date: string]: number } => {
  const cpiYoy: { [date: string]: number } = {};
  const cpiMap: { [date: string]: number } = {};

  cpiData.forEach(point => {
    if (point.value !== ".") {
      cpiMap[point.date] = parseFloat(point.value);
    }
  });

  Object.keys(cpiMap).forEach(date => {
    const [year, month, day] = date.split('-').map(Number);
    const prevYearDate = `${year - 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (cpiMap[prevYearDate]) {
      const prevYearValue = cpiMap[prevYearDate];
      const yoy = ((cpiMap[date] - prevYearValue) / prevYearValue) * 100;
      cpiYoy[date] = parseFloat(yoy.toFixed(2));
    }
  });

  return cpiYoy;
};


export const fetchAllEconomicData = async (apiKey?: string): Promise<EconomicDataPoint[]> => {
  const fredApiKey = getFredApiKey(apiKey);
  
  const unemploymentData = await fetchSeriesData(FRED_SERIES.UNEMPLOYMENT, fredApiKey);
  const cpiData = await fetchSeriesData(FRED_SERIES.CPI, fredApiKey);
  const fedFundsData = await fetchSeriesData(FRED_SERIES.FED_FUNDS, fredApiKey);

  const cpiYoy = calculateCpiYoy(cpiData);

  const allData: { [date: string]: EconomicDataPoint } = {};

  unemploymentData.forEach(point => {
    if (point.value !== ".") {
      allData[point.date] = { ...allData[point.date], date: point.date, unemployment_rate: parseFloat(point.value) };
    }
  });

  Object.keys(cpiYoy).forEach(date => {
    allData[date] = { ...allData[date], date, cpi_yoy: cpiYoy[date] };
  });

  fedFundsData.forEach(point => {
    if (point.value !== ".") {
      allData[point.date] = { ...allData[point.date], date: point.date, fed_funds_rate: parseFloat(point.value) };
    }
  });

  return Object.values(allData).sort((a, b) => a.date.localeCompare(b.date));
};
