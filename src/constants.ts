// /src/constants.ts

// FRED API Series IDs and metadata
export const FRED_SERIES = {
  UNRATE: { name: 'Unemployment Rate', type: 'level' },
  CPIAUCSL: { name: 'CPI (Inflation)', type: 'yoy' },
  DFF: { name: 'Federal Funds Rate', type: 'level' },
  PCEPI: { name: 'PCE (Core Inflation)', type: 'yoy' },
  GDPC1: { name: 'Real GDP', type: 'yoy_quarterly' },
  T10Y2Y: { name: '10-2 Year Treasury Spread', type: 'level' },
  ICSA: { name: 'Initial Claims', type: 'level' },
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

// Data quality constants
export const DATA_QUALITY = {
  // Cut-off date for reliable Fed Funds Rate data (pre-1960 data shows unrealistic volatility)
  RELIABLE_FED_DATA_START: '1960-01-01',
  
  // Maximum plausible daily Fed policy change in basis points
  MAX_PLAUSIBLE_DAILY_CHANGE_BPS: 75,
  
  // Data quality eras
  QUALITY_ERAS: {
    MODERN_RELIABLE: { start: '1990-01-01', end: '2030-12-31', reliability: 'high' },
    EARLY_RELIABLE: { start: '1960-01-01', end: '1989-12-31', reliability: 'medium' },
    UNRELIABLE: { start: '1948-01-01', end: '1959-12-31', reliability: 'low' }
  }
};