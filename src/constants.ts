// /src/constants.ts

// FRED API Series IDs
export const FRED_SERIES = {
  UNEMPLOYMENT: 'UNRATE',
  CPI: 'CPIAUCSL', // Note: Will need to calculate YoY % change
  FED_FUNDS: 'DFF',
};

// FRED API base URL
export const FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';

// Get API key from environment variable or CLI argument
export const getFredApiKey = (cliApiKey?: string): string => {
  const apiKey = cliApiKey || process.env.FRED_API_KEY || '';
  
  if (!apiKey || apiKey === 'YOUR_FRED_API_KEY_HERE') {
    throw new Error(
      'FRED API key is required. Please:\n' +
      '1. Get a free API key from: https://fred.stlouisfed.org/docs/api/api_key.html\n' +
      '2. Set it in a .env file: FRED_API_KEY=your_key_here\n' +
      '3. Or use the --api-key flag: fed-analyzer update-data --api-key your_key_here'
    );
  }
  
  return apiKey;
};

// Path for the local database
export const DB_PATH = './data/economic_data.sqlite';

// Hardcoded list of significant tariff periods for context
export const TARIFF_PERIODS = [
  { name: 'Smoot-Hawley Act', start: '1930-06-17', end: '1934-06-12' },
  { name: '2018-2019 China Tariffs', start: '2018-03-01', end: '2020-01-15' },
  { name: '2025 Liberation Day Tariffs', start: '2025-01-20', end: null },
];
