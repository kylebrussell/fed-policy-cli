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
|   |
|   |-- /services         # Logic for data fetching and database interaction
|   |   |-- api.ts
|   |   |-- database.ts
|   |   |-- analysis.ts
|   |
|   |-- /types            # TypeScript type definitions
|   |   |-- index.ts
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

### package.json
Ensure this file includes a `bin` entry to make the CLI command available, and scripts for building and running.

```json
{
  // ... other properties
  "bin": {
    "fed-analyzer": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "npm run build && node dist/cli.js",
    "dev": "ts-node src/cli.tsx"
  }
}
```

### tsconfig.json
A standard configuration for a Node.js + React (Ink) project.

```json
{
  "compilerOptions": {
    "target": "es6",
    "module": "commonjs",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

### /src/constants.ts
Centralize constants for easy management.

```typescript
// /src/constants.ts

// FRED API Series IDs
export const FRED_SERIES = {
  UNEMPLOYMENT: 'UNRATE',
  CPI: 'CPIAUCSL', // Note: Will need to calculate YoY % change
  FED_FUNDS: 'DFF',
};

// FRED API base URL
export const FRED_API_URL = '[https://api.stlouisfed.org/fred/series/observations](https://api.stlouisfed.org/fred/series/observations)';

// IMPORTANT: Get a free API key from the FRED website
export const FRED_API_KEY = 'YOUR_FRED_API_KEY_HERE';

// Path for the local database
export const DB_PATH = './data/economic_data.sqlite';

// Hardcoded list of significant tariff periods for context
export const TARIFF_PERIODS = [
  { name: 'Smoot-Hawley Act', start: '1930-06-17', end: '1934-06-12' },
  { name: '2018-2019 China Tariffs', start: '2018-03-01', end: '2020-01-15' },
  { name: '2025 Liberation Day Tariffs', start: '2025-01-20', end: null },
];
```

### /src/types/index.ts
Define the data structures for type safety.

```typescript
// /src/types/index.ts

export interface EconomicDataPoint {
  date: string; // YYYY-MM-DD
  unemployment_rate?: number;
  cpi_yoy?: number;
  fed_funds_rate?: number;
}

export interface ScenarioParams {
  unemployment: { min: number; max: number };
  inflation: { min: number; max: number };
  windowMonths: number;
  useTariffContext: boolean;
}

export interface HistoricalAnalogue {
  startDate: string;
  endDate: string;
  avgUnemployment: number;
  avgInflation: number;
  startRate: number;
  endRate: number;
  outcome: 'HIKE' | 'CUT' | 'HOLD';
}
```

### /src/services/database.ts
Manages all interactions with the SQLite database.

```typescript
// /src/services/database.ts
import sqlite3 from 'sqlite3';
import { DB_PATH } from '../constants';
import { EconomicDataPoint } from '../types';

// Functions to implement:
// 1. initDatabase(): Connects to the DB and runs CREATE TABLE IF NOT EXISTS.
//    - Table schema: date (PRIMARY KEY), unemployment_rate, cpi_yoy, fed_funds_rate
// 2. insertData(data: EconomicDataPoint[]): Inserts an array of data points, ignoring duplicates.
// 3. queryByDateRange(start: string, end: string): Fetches all data within a date range.
// 4. getAllData(): Fetches all data, ordered by date.
```

### /src/services/api.ts
Handles fetching data from the FRED API.

```typescript
// /src/services/api.ts
import fetch from 'node-fetch';
import { FRED_API_URL, FRED_API_KEY, FRED_SERIES } from '../constants';

// Functions to implement:
// 1. fetchSeriesData(seriesId: string): Fetches all data for a given FRED series ID.
//    - Will need to handle pagination if the dataset is large.
//    - Returns a clean array of { date, value } objects.
// 2. fetchAllEconomicData(): Orchestrates calls to fetch all required series (unemployment, CPI, fed funds).
//    - Processes the raw data (e.g., calculates YoY CPI change from the index).
//    - Merges the data into a single array of EconomicDataPoint objects.
```

### /src/services/analysis.ts
Contains the core logic for finding and analyzing historical analogues.

```typescript
// /src/services/analysis.ts
import { EconomicDataPoint, ScenarioParams, HistoricalAnalogue } from '../types';

// Functions to implement:
// 1. findAnalogues(allData: EconomicDataPoint[], params: ScenarioParams): HistoricalAnalogue[]
//    - This is the main engine.
//    - It will iterate through `allData` in chunks of `params.windowMonths`.
//    - For each chunk, it calculates the average unemployment and inflation.
//    - If the averages match the scenario parameters, it creates a HistoricalAnalogue object.
//    - It determines the 'outcome' (HIKE, CUT, HOLD) by comparing the start and end Fed Funds Rate.
//    - If `params.useTariffContext` is true, it checks if the window overlaps with TARIFF_PERIODS.
```

### /src/cli.tsx
The main application file. It handles command-line arguments and renders the Ink UI.

```typescript
// /src/cli.tsx
import React, { useState, useEffect } from 'react';
import { render, Text, Box } from 'ink';
import yargs from 'yargs/yargs';
// Import your components and service functions

const App = ({ command, params }) => {
  // State for loading, data, results, etc.
  const [status, setStatus] = useState('Initializing...');
  const [results, setResults] = useState(null);

  useEffect(() => {
    // Main logic based on the command from yargs
    if (command === 'update-data') {
      // Call data update service
    } else if (command === 'analyze') {
      // Call analysis service with params
    }
  }, [command, params]);

  // Render different views based on state
  // e.g., show a spinner while loading, then show results
  return (
    <Box>
      {/* Your UI components go here */}
      <Text>{status}</Text>
    </Box>
  );
};

// Use yargs to parse command line arguments
yargs(process.argv.slice(2))
  .command('update-data', 'Fetch latest economic data', () => {}, (argv) => {
    render(<App command="update-data" params={argv} />);
  })
  .command('analyze', 'Analyze a scenario', (yargs) => {
    // Define options for unemployment, inflation, etc.
  }, (argv) => {
    render(<App command="analyze" params={argv} />);
  })
  .demandCommand(1)
  .help()
  .argv;
```

### /src/components/*.tsx
These are the presentational components for the UI.

* **Spinner.tsx:** A simple loading spinner component from `ink-spinner`.
* **StatusMessage.tsx:** A component to display status or error messages with colors.
* **DataTableView.tsx:** A key component that takes an array of objects (like `HistoricalAnalogue[]`) and renders it as a formatted table using `<Box>` and `<Text>` components, similar to `console.table`.

## 4. Development Workflow

1.  **Step 1: Data Backend.** Implement `constants.ts`, `types/index.ts`, `services/database.ts`, and `services/api.ts`. Get your FRED API key. Build and test the `update-data` command first. You need data before you can do anything else.
2.  **Step 2: Analysis Engine.** Implement `services/analysis.ts`. Write the core logic to find matching historical periods. You can test this with a simple script before integrating it with the UI.
3.  **Step 3: Build the UI.** Start with `cli.tsx`. Wire up the `yargs` commands. Create the individual UI components in `/components`.
4.  **Step 4: Integration.** In `cli.tsx`, call the analysis service when the `analyze` command is run. Use `useState` to manage the flow: `idle` -> `loading` -> `results`. Pass the results to your `DataTableView` component for display.
5.  **Step 5: Refinement.** Add color, improve layout, and handle edge cases (e.g., no analogues found, API errors).


