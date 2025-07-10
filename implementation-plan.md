# Implementation Plan: Fed Scenario Modeling Utility

This plan details the file structure and logic for building the CLI tool as specified in the PRD.

## 1. Project Setup & Dependencies

First, initialize the project and install the necessary dependencies.

```bash
# Initialize a Node.js project
npm init -y

# Install dependencies
npm install react ink sqlite3 yargs node-fetch

# Install development dependencies for TypeScript
npm install -D typescript @types/react @types/node @types/yargs ts-node nodemon
```

## 2. Directory Structure

A well-organized directory structure is key.

```
/fed-scenario-cli
|
|-- /dist                 # Compiled JavaScript output
|-- /src                  # TypeScript source code
|   |
|   |-- /components       # Reusable Ink UI components
|   |   |-- DataTableView.tsx
|   |   |-- Spinner.tsx
|   |   |-- StatusMessage.tsx
|   |   |-- AnalogueReportView.tsx # New component for rich reports
|   |
|   |-- /services         # Logic for data fetching and database interaction
|   |   |-- api.ts
|   |   |-- database.ts
|   |   |-- analysis.ts
|   |
|   |-- /types            # TypeScript type definitions
|   |   |-- index.ts
|   |
|   |-- /utils            # New folder for utility/helper functions
|   |   |-- similarity.ts   # Similarity algorithm implementations
|   |   |-- chart.ts        # Terminal chart rendering logic
|   |
|   |-- cli.tsx           # Main application entry point and Ink UI logic
|   |-- constants.ts      # Hardcoded values like API keys, URLs, tariff dates
|
|-- /data                 # Location for the SQLite database file
|   |-- economic_data.sqlite
|
|-- package.json          # Project manifest
|-- tsconfig.json         # TypeScript compiler options
```

## 3. File-by-File Implementation Details

### /src/constants.ts
Centralize constants for easy management. The `FRED_SERIES` object will be expanded.

```typescript
// /src/constants.ts

// FRED API Series IDs
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
export const FRED_API_URL = '[https://api.stlouisfed.org/fred/series/observations](https://api.stlouisfed.org/fred/series/observations)';

// IMPORTANT: Get a free API key from the FRED website
export const FRED_API_KEY = 'YOUR_FRED_API_KEY_HERE';

// Path for the local database
export const DB_PATH = './data/economic_data.sqlite';
```

### /src/types/index.ts
Update types to support flexible indicators.

```typescript
// /src/types/index.ts

// A flexible data point that can hold any indicator
export interface EconomicDataPoint {
  date: string; // YYYY-MM-DD
  [indicator: string]: number | string; // e.g., UNRATE: 4.1, CPIAUCSL_yoy: 3.2
}

// Defines a user-selected indicator and its weight
export interface WeightedIndicator {
  id: string; // e.g., 'UNRATE'
  weight: number; // e.g., 0.5
}

export interface ScenarioParams {
  indicators: WeightedIndicator[];
  windowMonths: number;
}

export interface HistoricalAnalogue {
  startDate: string;
  endDate: string;
  similarityScore: number;
  data: EconomicDataPoint[];
  fedPolicyActions: FedPolicyAction[];
}

export interface FedPolicyAction {
  date: string;
  action: 'HIKE' | 'CUT' | 'HOLD';
  changeBps?: number;
}
```

### /src/services/database.ts
The database schema needs to be more flexible.

```typescript
// /src/services/database.ts

// Key change: The table will now have a column for each indicator ID from constants.ts.
// The initDatabase function will dynamically build the CREATE TABLE statement.
// The insertData function will dynamically build the INSERT statement.

// Functions to implement:
// 1. initDatabase(): Dynamically creates a table with a column for 'date' and each FRED series ID.
// 2. insertData(data: EconomicDataPoint[]): Inserts data, mapping object keys to table columns.
// 3. getAllData(): Fetches all data, ordered by date.
```

### /src/services/api.ts
Update the API service to handle different calculation types (YoY, etc.).

```typescript
// /src/services/api.ts

// Key change: The fetchAllEconomicData function will iterate over the FRED_SERIES constant.
// It will check the 'type' of each series and apply the correct transformation (e.g., year-over-year calculation for CPI, PCE, GDP).
// It will need to handle quarterly data (GDP) by forward-filling the value for the months in that quarter.

// Functions to implement:
// 1. fetchSeriesData(seriesId: string): Fetches data for a FRED series.
// 2. fetchAllEconomicData(): Orchestrates fetching all series defined in constants.ts, performs necessary calculations (YoY, quarterly fill), and merges them into an array of EconomicDataPoint objects.
```

### /src/services/analysis.ts
The core analysis logic must be updated for weighted, multi-indicator scenarios.

```typescript
// /src/services/analysis.ts

// Key change: The findAnalogues function will be the main focus.

// Functions to implement:
// 1. findAnalogues(allData: EconomicDataPoint[], targetScenario: EconomicDataPoint[], params: ScenarioParams, topN: number): HistoricalAnalogue[]
//    - For each historical window, it will construct a vector of values based on the indicators specified in `params.indicators`.
//    - It will apply the weights from `params.indicators` to these vectors.
//    - It will normalize the data for each indicator across the entire dataset to ensure fair comparison (e.g., a 1% change in unemployment isn't treated the same as a 1% change in the Fed Funds Rate).
//    - It will use `calculateDtwDistance` on the final weighted, normalized vectors.
//    - It will rank by similarity and return the top N results, enriched with policy actions.
// 2. extractFedPolicyActions(periodData: EconomicDataPoint[]): FedPolicyAction[]
//    - No changes needed here.
```

### /src/cli.tsx
The main CLI entry point needs to parse the new `--indicator` flag.

```typescript
// /src/cli.tsx

// Key change: Update yargs configuration for the 'analyze' command.
// It will now use a repeatable 'indicator' option.

yargs(hideBin(process.argv))
  .command('analyze', 'Find historical analogues', (yargs) => {
    return yargs
      .option('indicator', {
        describe: 'Indicator to include in analysis, with weight (e.g., UNRATE:0.5)',
        type: 'string',
        demandOption: true,
        alias: 'i',
      })
      // ... other options like 'months' and 'top'
  }, (argv) => {
    // The code will need to parse the 'indicator' strings into WeightedIndicator objects.
    // It will also need to validate that the sum of weights equals 1.0.
    render(<App command="analyze" params={argv} />);
  })
```

### /src/components/AnalogueReportView.tsx
The report view must dynamically render charts for all selected indicators.

```typescript
// /src/components/AnalogueReportView.tsx

// Key change: The component will receive the list of indicators used in the analysis as a prop.
// It will iterate over this list to render a chart for each one, pulling the correct data from the `analogue.data` array.

const AnalogueReportView: React.FC<Props> = ({ analogues, indicators }) => {
  // ...
  {indicators.map(indicator => (
    <Box key={indicator.id}>
      <Text>{FRED_SERIES[indicator.id].name}:</Text>
      <Text>{renderAsciiChart(/* ... */)}</Text>
    </Box>
  ))}
  // ...
}
```

## 4. Development Workflow

1.  **Step 1: Refactor Data Layer.** Update `constants.ts`, `types/index.ts`, `services/database.ts`, and `services/api.ts` to support the new, flexible set of indicators. This is the most critical step.
2.  **Step 2: Update Analysis Engine.** Modify `services/analysis.ts` to perform weighted, multi-indicator analysis, including data normalization.
3.  **Step 3: Update CLI.** Change the `yargs` configuration in `cli.tsx` to use the new `--indicator` flag and add the necessary parsing and validation logic.
4.  **Step 4: Update UI.** Make the `AnalogueReportView.tsx` component dynamic, so it can render charts for any combination of indicators.
5.  **Step 5: Testing.** Update all relevant unit and integration tests to cover the new flexible indicator functionality.

---

## 5. Post-v3.0 Enhancement Plan

Following the successful implementation of flexible indicator analysis, the following improvements have been identified through user evaluation:

### Phase 7: Bug Fixes & Technical Debt (High Priority)

**7.1: Fix Fed Policy Action Analysis** (`src/services/analysis.ts:16`)
- Problem: Currently showing unrealistic daily Fed policy changes
- Solution: Implement minimum threshold filtering (>10-25 bps) and consecutive change grouping
- Files to modify: `src/services/analysis.ts`
- Testing: Update `src/services/__tests__/analysis.test.ts`

**7.2: Resolve Node.js Deprecations** (`package.json:12`)
- Problem: Using deprecated `--experimental-loader` flag and `fs.Stats` constructor
- Solution: Update to `--import` syntax and fix SQLite3 usage
- Files to modify: `package.json`, potentially `tsconfig.json`

**7.3: Fix Test Suite** (`src/services/__tests__/analysis.test.ts`)
- Problem: 3 failing tests in analysis service
- Solution: Update test expectations to match current analysis logic
- Impact: Ensures code reliability and prevents regressions

### Phase 8: Data Quality Improvements (Medium Priority)

**8.1: Data Validation Framework**
- Add validation for FRED API responses
- Implement data quality checks (missing values, outliers)
- Add error recovery for corrupted data

**8.2: Enhanced API Handling**
- Implement exponential backoff for rate limiting
- Add caching layer for API responses
- Better error messages for API failures

**8.3: Incremental Data Updates**
- Support partial data updates instead of full refresh
- Track data update timestamps
- Optimize database operations for large datasets

### Phase 9: User Experience Enhancements (Medium Priority)

**9.1: Export Functionality**
- Add CSV export for analysis results
- JSON export for programmatic usage
- Include metadata (analysis parameters, timestamps)

**9.2: Custom Date Range Analysis**
- Support analysis of specific historical periods
- Allow comparison between any two time periods
- Add date range validation

**9.3: Better Duplicate Handling**
- Implement minimum time gap between similar periods
- Improve similarity scoring to reduce near-duplicates
- Add user option to control result filtering

### Phase 10: Advanced Features (Low Priority)

**10.1: Performance Optimizations**
- Cache DTW calculations for repeated analysis
- Optimize database schema and queries
- Add progress bars for long-running operations

**10.2: Additional Indicators**
- Expand FRED series based on user feedback
- Support user-defined indicator combinations
- Add sector-specific economic indicators

**10.3: Statistical Enhancements**
- Add confidence intervals for similarity scores
- Implement Monte Carlo simulation for policy outcomes
- Add regime detection algorithms

## 6. Priority Implementation Order

1. **Immediate (Next Sprint)**: Fix Fed policy analysis and Node.js deprecations
2. **Short-term (1-2 months)**: Fix test suite and improve data validation
3. **Medium-term (3-6 months)**: Add export functionality and custom date ranges
4. **Long-term (6+ months)**: Advanced analytics and performance optimizations
