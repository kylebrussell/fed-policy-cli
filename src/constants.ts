// /src/constants.ts

// FRED API Series IDs and metadata with economic frequency information
export const FRED_SERIES = {
  UNRATE: { name: 'Unemployment Rate', type: 'level', frequency: 'monthly' },
  CPIAUCSL: { name: 'CPI (Inflation)', type: 'yoy', frequency: 'monthly' },
  DFF: { name: 'Federal Funds Rate', type: 'level', frequency: 'daily' },
  PCEPI: { name: 'PCE (Core Inflation)', type: 'yoy', frequency: 'monthly' },
  GDPC1: { name: 'Real GDP', type: 'yoy_quarterly', frequency: 'quarterly' },
  T10Y2Y: { name: '10-2 Year Treasury Spread', type: 'level', frequency: 'daily' },
  ICSA: { name: 'Initial Claims', type: 'level', frequency: 'weekly' },
  // Treasury yields for market expectations
  DGS3MO: { name: '3-Month Treasury', type: 'level', frequency: 'daily' },
  DGS6MO: { name: '6-Month Treasury', type: 'level', frequency: 'daily' },
  DGS1: { name: '1-Year Treasury', type: 'level', frequency: 'daily' },
  DGS2: { name: '2-Year Treasury', type: 'level', frequency: 'daily' },
};

// FOMC projection series for Fed dot plot data
export const FOMC_PROJECTION_SERIES = {
  FEDTARMD: { name: 'Fed Funds Rate Projection - Median', type: 'projection' },
  FEDTARRM: { name: 'Fed Funds Rate Projection - Range Midpoint', type: 'projection' },
  FEDTARRL: { name: 'Fed Funds Rate Projection - Range Low', type: 'projection' },
  FEDTARRH: { name: 'Fed Funds Rate Projection - Range High', type: 'projection' },
  FEDTARMDLR: { name: 'Fed Funds Rate Projection - Longer Run Median', type: 'projection' },
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

// Period exclusion constants and mappings
export const PERIOD_EXCLUSION = {
  // Economic era identifiers for CLI usage (user-friendly names)
  ERA_ALIASES: {
    'modern': 'MODERN_ERA',
    'post-covid': 'MODERN_ERA',
    'recovery': 'GREAT_RECESSION_RECOVERY',
    'great-recession-recovery': 'GREAT_RECESSION_RECOVERY',
    'financial-crisis': 'FINANCIAL_CRISIS',
    'crisis': 'FINANCIAL_CRISIS',
    'dot-com': 'DOT_COM_ERA',
    'dotcom': 'DOT_COM_ERA',
    'greenspan': 'GREENSPAN_ERA',
    'volcker': 'VOLCKER_INFLATION',
    'stagflation': 'STAGFLATION',
    'golden-age': 'GOLDEN_AGE',
    'post-war': 'GOLDEN_AGE',
    'historical': 'HISTORICAL',
    'early': 'HISTORICAL'
  },
  
  // Common period exclusion presets
  COMMON_EXCLUSIONS: {
    'recent-5-years': { excludeRecentYears: 5, description: 'Exclude last 5 years' },
    'recent-10-years': { excludeRecentYears: 10, description: 'Exclude last 10 years' },
    'post-2000': { 
      excludeDateRanges: [{ start: '2000-01-01', end: '2030-12-31', description: 'Post-2000 period' }],
      description: 'Focus on pre-2000 historical periods'
    },
    'pre-1980': {
      excludeDateRanges: [{ start: '1980-01-01', end: '2030-12-31', description: 'Modern era' }],
      description: 'Focus on pre-1980 historical periods'
    }
  }
};

// Economic Regime Templates
// Pre-built scenarios for common economic research queries
export const ECONOMIC_TEMPLATES = {
  'stagflation-hunt': {
    id: 'stagflation-hunt',
    name: 'Stagflation Hunt',
    description: 'Find periods of high inflation combined with high unemployment - the classic stagflation scenario',
    category: 'inflation' as const,
    indicators: [
      { id: 'UNRATE', weight: 0.4 },        // High unemployment is key
      { id: 'CPIAUCSL', weight: 0.4 },      // High inflation is key
      { id: 'DFF', weight: 0.2 }            // Fed response to stagflation
    ],
    defaultParams: {
      excludeRecentYears: 15, // Focus on historical periods
    },
    focusEras: ['stagflation', 'volcker'],
    economicRationale: 'Stagflation is characterized by simultaneous high unemployment and high inflation, requiring equal weighting of both indicators. Fed policy response is secondary but important for understanding monetary policy constraints.',
    examples: ['1970s Oil Crisis periods', 'Late 1970s Volcker pre-tightening', '1973-1975 recession with inflation']
  },

  'financial-crisis': {
    id: 'financial-crisis',
    name: 'Financial Crisis Patterns',
    description: 'Identify periods of financial stress with unemployment spikes, yield curve inversions, and emergency Fed policy',
    category: 'crisis' as const,
    indicators: [
      { id: 'UNRATE', weight: 0.3 },        // Unemployment spike
      { id: 'T10Y2Y', weight: 0.3 },        // Yield curve inversion
      { id: 'DFF', weight: 0.2 },           // Emergency Fed cuts
      { id: 'ICSA', weight: 0.2 }           // Initial claims surge
    ],
    defaultParams: {
      excludeRecentYears: 5,
    },
    focusEras: ['financial-crisis', 'dot-com', 'modern'],
    economicRationale: 'Financial crises manifest through rapid unemployment increases, yield curve distortions, emergency Fed rate cuts, and surging unemployment claims. This template weights labor market stress and credit market signals equally.',
    examples: ['2008 Great Financial Crisis', '2001 Dot-com crash', '2020 COVID economic shock']
  },

  'policy-tightening': {
    id: 'policy-tightening',
    name: 'Policy Tightening Cycles',
    description: 'Analyze Fed tightening cycles with focus on inflation control and economic cooling',
    category: 'policy' as const,
    indicators: [
      { id: 'DFF', weight: 0.4 },           // Fed policy is primary
      { id: 'CPIAUCSL', weight: 0.3 },      // Inflation target
      { id: 'UNRATE', weight: 0.2 },        // Economic cooling
      { id: 'T10Y2Y', weight: 0.1 }         // Monetary policy transmission
    ],
    defaultParams: {
      excludeRecentYears: 3,
    },
    economicRationale: 'Policy tightening cycles are driven primarily by Fed rate changes in response to inflation, with employment and yield curve effects secondary. Higher Fed funds weight captures the primary policy tool.',
    examples: ['Volcker inflation fight 1979-1982', 'Greenspan rate hikes 1994-1995', 'Powell tightening 2022-2023']
  },

  'recession-early-warning': {
    id: 'recession-early-warning',
    name: 'Recession Early Warning',
    description: 'Detect recession precursors through leading indicators and economic stress signals',
    category: 'recession' as const,
    indicators: [
      { id: 'T10Y2Y', weight: 0.3 },        // Yield curve inversion (leading)
      { id: 'ICSA', weight: 0.25 },         // Claims upturn (leading)
      { id: 'GDPC1', weight: 0.25 },        // GDP slowdown
      { id: 'UNRATE', weight: 0.2 }         // Employment deterioration
    ],
    defaultParams: {
      months: 6, // Shorter window for early signals
    },
    economicRationale: 'Recession early warning relies on leading indicators like yield curve inversion and initial claims increases, combined with real economy slowdown signals. GDP and unemployment provide confirming evidence.',
    examples: ['Pre-2008 yield curve signals', 'Pre-2001 economic deterioration', 'Pre-1991 recession indicators']
  },

  'inflation-regime': {
    id: 'inflation-regime',
    name: 'Inflation Regime Analysis',
    description: 'Focus on inflationary periods and Fed response across different price measures',
    category: 'inflation' as const,
    indicators: [
      { id: 'CPIAUCSL', weight: 0.4 },      // Headline inflation
      { id: 'PCEPI', weight: 0.3 },         // Fed preferred measure
      { id: 'DFF', weight: 0.3 }            // Fed policy response
    ],
    economicRationale: 'Inflation analysis requires dual inflation measures (CPI for public perception, PCE for Fed policy) with significant weight on Fed response. Labor market excluded to focus purely on price dynamics.',
    examples: ['1970s Great Inflation', '1980s disinflation', '2021-2023 post-pandemic inflation']
  },

  'labor-market-stress': {
    id: 'labor-market-stress',
    name: 'Labor Market Stress',
    description: 'Analyze periods of labor market deterioration and unemployment spikes',
    category: 'recession' as const,
    indicators: [
      { id: 'UNRATE', weight: 0.5 },        // Primary unemployment measure
      { id: 'ICSA', weight: 0.3 },          // Leading labor indicator
      { id: 'GDPC1', weight: 0.2 }          // Economic context
    ],
    defaultParams: {
      focusEras: ['financial-crisis', 'stagflation', 'recession-periods'],
    },
    economicRationale: 'Labor market stress is best captured by unemployment rate changes with leading indication from initial claims. GDP provides economic context but employment is the primary focus.',
    examples: ['1982 unemployment peak', '2009 Great Recession joblessness', '2020 pandemic unemployment spike']
  },

  'yield-curve-analysis': {
    id: 'yield-curve-analysis',
    name: 'Yield Curve Analysis',
    description: 'Study yield curve dynamics and their relationship with Fed policy and economic cycles',
    category: 'policy' as const,
    indicators: [
      { id: 'T10Y2Y', weight: 0.5 },        // Primary yield curve measure
      { id: 'DFF', weight: 0.3 },           // Fed policy driver
      { id: 'GDPC1', weight: 0.2 }          // Economic growth context
    ],
    economicRationale: 'Yield curve analysis focuses on the spread as the primary signal, with Fed policy as the key driver and economic growth providing context for interpretation.',
    examples: ['Yield curve inversions before recessions', 'Steepening during recoveries', 'Policy transmission effects']
  },

  'balanced-economic': {
    id: 'balanced-economic',
    name: 'Balanced Economic Analysis',
    description: 'Comprehensive economic analysis with equal weighting across major economic indicators',
    category: 'general' as const,
    indicators: [
      { id: 'UNRATE', weight: 0.2 },        // Labor market
      { id: 'CPIAUCSL', weight: 0.2 },      // Inflation
      { id: 'DFF', weight: 0.2 },           // Monetary policy
      { id: 'GDPC1', weight: 0.2 },         // Economic growth
      { id: 'T10Y2Y', weight: 0.2 }         // Financial markets
    ],
    economicRationale: 'Balanced approach giving equal weight to major economic pillars: employment, inflation, monetary policy, growth, and financial market signals. Suitable for general economic period comparisons.',
    examples: ['Any historical period with similar overall economic conditions']
  }
};