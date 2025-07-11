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

Following the successful implementation of flexible indicator analysis and comprehensive query testing, the following improvements have been identified:

### Phase 7: ~~Bug Fixes & Technical Debt~~ - **COMPLETED ✅**

~~**7.1: Fix Fed Policy Action Analysis** (`src/services/analysis.ts:16`)~~ **[COMPLETED]**
~~**7.2: Resolve Node.js Deprecations** (`package.json:12`)~~ **[COMPLETED]**  
~~**7.3: Fix Test Suite** (`src/services/__tests__/analysis.test.ts`)~~ **[COMPLETED]**

### Phase 8: **CRITICAL ALGORITHM FIXES** (High Priority - Core Product Issues)

**8.1: Fix Overlapping Period Problem** (`src/services/analysis.ts:66`)
- **Issue Discovered**: Queries return overlapping periods (e.g., multiple 1954 or 2025 windows) instead of diverse historical analogues
- **Root Cause**: Algorithm lacks minimum time separation enforcement between results
- **Solution**: Implement minimum 6-month gap between returned analogues
- **Files**: `src/services/analysis.ts`, `src/types/index.ts`
- **Impact**: Transforms tool from showing redundant results to providing genuinely diverse historical perspectives

**8.2: Fix Chart Normalization Issues** (`src/utils/chart.ts`, `src/services/analysis.ts:50`)
- **Issue Discovered**: All charts display as flat lines, removing meaningful data variation
- **Root Cause**: Windowed normalization is collapsing data ranges to identical values
- **Solution**: Revise normalization to preserve relative variation while enabling comparison
- **Files**: `src/services/analysis.ts`, `src/utils/chart.ts`
- **Impact**: Restores visual utility of economic indicator charts

**8.3: Add Historical Diversity Scoring** (`src/services/analysis.ts:66`)
- **Issue Discovered**: Tool preferentially returns recent periods rather than spanning historical dataset
- **Solution**: Add temporal diversity bonus to similarity scoring algorithm
- **Algorithm**: Boost scores for results from different decades/economic eras
- **Files**: `src/services/analysis.ts`
- **Impact**: Ensures results span multiple economic regimes and time periods

**8.4: Implement Data Quality Filtering** (`src/services/analysis.ts`, `src/constants.ts`)
- **Issue Discovered**: Early FRED data (1950s) shows unrealistic Fed policy volatility (100+ bps daily moves)
- **Solution**: Add data quality filters and date range restrictions
- **Implementation**: Exclude pre-1960 data or add quality warnings
- **Files**: `src/services/analysis.ts`, `src/constants.ts`
- **Impact**: Improves reliability of historical analogues

### Phase 9: **USER EXPERIENCE BREAKTHROUGHS** (High Priority - Product Value)

**9.1: Period Exclusion Controls** (`src/cli.tsx`, `src/services/analysis.ts`)
- **Feature**: Allow users to exclude recent periods or focus on specific eras
- **Implementation**: Add CLI flags like `--exclude-recent-years 5` or `--focus-era 1970s-1990s`
- **Files**: `src/cli.tsx`, `src/services/analysis.ts`
- **Impact**: Enables discovery of truly historical analogues rather than recent patterns

**9.2: Economic Regime Templates** (`src/constants.ts`, `src/cli.tsx`)
- **Feature**: Pre-built scenarios like "Stagflation Hunt", "Financial Crisis Patterns", "Policy Tightening Cycles"
- **Implementation**: Predefined indicator weights and parameters for common economic research queries
- **Files**: `src/constants.ts`, `src/cli.tsx`, new `src/templates/` directory
- **Impact**: Makes tool accessible to users without deep economic modeling knowledge

**9.3: Interactive Target Period Selection** (`src/cli.tsx`, `src/services/analysis.ts`)
- **Feature**: Analyze any historical period, not just recent months
- **Implementation**: Add `--target-period` flag accepting date ranges
- **Files**: `src/cli.tsx`, `src/services/analysis.ts`
- **Impact**: Enables "what if" analysis and historical period comparisons

**9.4: Historical Context Enrichment** (`src/components/AnalogueReportView.tsx`, `src/constants.ts`)
- **Feature**: Overlay recession dates, major policy shifts, and crisis markers on timelines
- **Implementation**: Add economic event database and visualization layers
- **Files**: `src/constants.ts`, `src/components/AnalogueReportView.tsx`
- **Impact**: Provides crucial context for interpreting historical analogues

### Phase 10: **ADVANCED ANALYTICAL CAPABILITIES** (Medium Priority - Power Users)

**10.1: Regime Detection Engine** (`src/services/regime-detection.ts`)
- **Feature**: Automatically identify distinct economic periods
- **Algorithm**: Clustering analysis to detect regime changes in economic indicators
- **Files**: New `src/services/regime-detection.ts`, `src/services/analysis.ts`
- **Impact**: Enables automatic categorization of economic eras

**10.2: Multi-Period Regime Comparison** (`src/services/analysis.ts`, `src/components/`)
- **Feature**: Compare current conditions against multiple distinct historical eras simultaneously
- **Implementation**: Extend analysis to return regime-based categories of results
- **Files**: `src/services/analysis.ts`, `src/components/AnalogueReportView.tsx`
- **Impact**: Provides broader economic context and multiple historical perspectives

**10.3: Scenario Persistence & Sharing** (`src/services/scenarios.ts`)
- **Feature**: Save/load/export scenario definitions for research collaboration
- **Implementation**: JSON-based scenario files with metadata
- **Files**: New `src/services/scenarios.ts`, `src/cli.tsx`
- **Impact**: Enables reproducible research and knowledge sharing

### Phase 11: **TECHNICAL INFRASTRUCTURE** (Lower Priority)

**11.1: Performance & Caching**
- Cache DTW calculations for repeated analysis
- Optimize database queries for large datasets
- Add progress indicators for long operations

**11.2: Export & Integration**
- CSV/JSON export with analysis metadata
- API for programmatic access
- Integration with research databases

**11.3: Data Pipeline Enhancements**
- Incremental data updates
- Extended historical coverage (pre-1950s sources)
- Real-time economic data integration

## 6. Updated Priority Implementation Order

### **Phase 7** ✅ **COMPLETED** 
~~Fix critical bugs (Fed policy analysis, Node.js deprecations, test suite)~~

### **Phase 8** 🎯 **IMMEDIATE PRIORITY** (Fed Policy Analysis Enhancements)

These enhancements directly address the core value proposition of understanding Fed policy responses:

1. **Week 1-2**: **Fed Policy Response Analyzer** (`src/components/PolicyResponseAnalyzer.tsx`)
   - Implement policy pattern recognition (aggressive/gradual/data-dependent)
   - Calculate response timing lags between triggers and actions
   - Track policy effectiveness on indicators
   - Files: New component `PolicyResponseAnalyzer.tsx`, update `AnalogueReportView.tsx`

2. **Week 3-4**: **Enhanced Policy Timeline Visualization** (`src/components/PolicyTimeline.tsx`)
   - Show 3-6 months pre-decision context
   - Add cumulative impact tracking
   - Auto-label policy regimes (easing/tightening/neutral)
   - Implement FOMC meeting markers
   - Files: New component `PolicyTimeline.tsx`, enhance existing timeline display

3. **Week 5-6**: **Policy Playbook Generator** (`src/services/policyAnalysis.ts`)
   - Extract Fed response patterns from analogues
   - Generate step-by-step playbooks
   - Identify policy rationale and key concerns
   - Files: New service `policyAnalysis.ts`, update `AnalogueReportView.tsx`

4. **Week 7-8**: **Forward Guidance Analyzer** (`src/components/ForwardGuidance.tsx`)
   - Project 6-12 month Fed actions based on precedent
   - Calculate probability distributions
   - Highlight key data dependencies
   - Files: New component `ForwardGuidance.tsx`, enhance `analysis.ts`

### **Phase 9** 🔥 **HIGH PRIORITY** (Interactive Policy Features)

1. **Month 3**: **Interactive Policy Simulator** (`src/components/PolicySimulator.tsx`)
   - What-if scenario modeling
   - Side-by-side policy comparison
   - Real-time projection updates
   - Files: New interactive component using Ink's `useInput` hook

2. **Month 4**: **Fed Reaction Function Dashboard** (`src/components/FedDashboard.tsx`)
   - Policy trigger indicators visualization
   - Rate change probability calculator
   - Policy pressure gauge
   - Files: New dashboard component with real-time updates

3. **Month 5**: **Policy Impact Scorecard** (`src/components/PolicyScorecard.tsx`)
   - Indicator response profiles
   - Lag analysis visualization
   - Dual mandate scoring
   - Files: New scorecard component

### **Phase 10** 🔧 **CORE ALGORITHM FIXES** (Foundation Improvements)

1. **Month 6**: Fix overlapping period problem and add minimum time gap enforcement
2. **Month 7**: Resolve chart normalization issues causing flat displays  
3. **Month 8**: Implement historical diversity scoring for temporal spread
4. **Month 9**: Add data quality filtering for unreliable early periods

### **Phase 11** ⚡ **USER EXPERIENCE ENHANCEMENTS** (Usability)

1. **Month 10**: Period exclusion controls and historical era focusing
2. **Month 11**: Economic regime templates for common use cases
3. **Month 12**: Interactive target period selection capabilities

### **Phase 12** 💹 **MARKET EXPECTATIONS DASHBOARD** (Trading Integration - v5.0)

**Core Mission**: Transform from Fed policy analysis tool into professional macro trading platform with market integration.

**Implementation Approach**: Hybrid database design with FRED-only MVP escalating to paid market data.

1. **Month 13-14**: **FRED-Only Market Expectations MVP** (`src/services/marketExpectations.ts`)
   - **Database Updates**:
     - Add Treasury yields (DGS3MO, DGS6MO, DGS1, DGS2) to existing economic_data table
     - Create new `fomc_projections` table for dot plot data (FEDTARMD series)
     - Files: Update `database.ts`, `constants.ts`, `api.ts`
   
   - **Market Expectations Service**:
     - Fetch FOMC projections (median, high, low) for 2025-2027
     - Calculate rough implied rates from Treasury yield curve
     - Compare model predictions vs Fed dot plot
     - Files: New `marketExpectations.ts` service
   
   - **Dashboard Component** (`src/components/MarketExpectationsDashboard.tsx`):
     ```
     Fed Policy Expectations vs Model
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     Current Fed Funds Rate: 4.33%
     
     FOMC Projections (Dot Plot):
     2025: 3.9% (3.4%-4.4% range)
     2026: 2.9% (2.4%-3.9% range)
     
     Model Prediction: 3.83% (-10bps)
     Yield Curve Signal: Inverted
     ```

2. **Month 15-16**: **Enhanced Analytics & Trading Signals**
   - Forward rate calculations from Treasury curve
   - Historical divergence analysis (Fed vs Model accuracy)
   - Basic trading signal generation
   - Confidence intervals and probability distributions

3. **Month 17-18**: **Professional Market Data Integration** ($25/month upgrade)
   - CME FedWatch API integration for true market probabilities
   - Meeting-by-meeting probability distributions
   - Real-time dislocation scoring
   - Professional divergence analysis

### **Phase 13** 🌐 **CROSS-ASSET FED PLAYBOOK** (Multi-Asset Trading)

1. **Month 19-20**: Track USD, bonds, equities during historical analogues
2. **Month 21-22**: Sector rotation analysis and credit spread behavior
3. **Month 23-24**: Commodity responses and volatility patterns

### **Phase 14** 🚀 **ADVANCED FEATURES** (Future Vision)

1. **Year 2+**: Machine learning integration for pattern recognition
2. **Year 2+**: Natural language query interface
3. **Year 2+**: Real-time alert system for policy-relevant conditions

**Success Metrics by Phase:**
- **Phase 8**: Clear Fed policy insights, actionable playbooks, forward guidance projections
- **Phase 9**: Interactive policy exploration, real-time simulations, comprehensive dashboards
- **Phase 10**: No overlapping results, meaningful chart variation, diverse historical coverage
- **Phase 11**: 50% increase in query diversity, user-friendly templates, historical context integration
- **Phase 12**: Market expectations integration, trading signals, Fed vs market divergence analysis
- **Phase 13**: Cross-asset performance tracking, systematic positioning framework
- **Phase 14**: AI-enhanced predictions, conversational interface, proactive alerts
