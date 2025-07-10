# Fed Scenario Modeling Utility

A powerful command-line tool for analyzing the U.S. economy and Federal Reserve policy. Find historical periods that are statistically similar to the present (or any other period) using a flexible, weighted analysis of key economic indicators.

## Key Features

- **Intelligent Historical Analysis**: Goes beyond simple search to find genuinely diverse and meaningful historical analogues, avoiding redundant, overlapping results.
- **Economic Era Awareness**: The algorithm understands different economic periods (e.g., "Stagflation", "Dot-Com Boom", "Financial Crisis") and scores results to ensure you see a broad range of historical contexts.
- **Flexible Analysis Engine**: Compare historical periods using any combination of supported economic indicators with custom weights.
- **Scenario Templates**: Jumpstart your research with pre-built templates for common economic scenarios like "Stagflation Hunt" or "Policy Tightening Cycles".
- **Rich Terminal UI**: Displays detailed reports with meaningful ASCII charts and a clear timeline of Fed policy actions.
- **Data Quality Filtering**: Automatically filters out unreliable early-period data to improve the accuracy of results.

## Installation

1.  **Clone and install dependencies:**
    ```bash
    git clone <repository-url>
    cd fed-scenario-cli
    npm install
    ```

2.  **Get a FRED API key (free):**
    - Visit: https://fred.stlouisfed.org/docs/api/api_key.html
    - Create an account and request an API key.

3.  **Set up your API key** (choose one method):

    -   **A) Environment file (recommended)**
        ```bash
        cp .env.example .env
        # Edit the new .env file and add your API key
        ```

    -   **B) Command-line flag**
        ```bash
        # Use the --api-key flag with the update-data command
        npm run dev -- update-data --api-key your_key_here
        ```

## Usage

### 1. Update Economic Data

First, populate your local database with the latest data from all supported FRED series:

```bash
npm run dev -- update-data
```

This command fetches and processes data for all indicators listed in `src/constants.ts`.

### 2. Basic Analysis

Find historical analogues by defining a weighted basket of indicators. The analysis compares against the most recent data.

**Example:** Find the top 5 historical periods that look most like the last 18 months, with a 60% weight on inflation and 40% on the yield curve.

```bash
npm run dev -- analyze -m 18 -t 5 -i CPIAUCSL:0.6 -i T10Y2Y:0.4
```

### 3. Using Scenario Templates

Use pre-built templates for common research questions.

**List available templates:**
```bash
npm run dev -- list-templates
```

**Use a template:**
```bash
npm run dev -- analyze --template stagflation-hunt
```

### 4. Advanced Historical Analysis

Focus your search on specific timeframes or exclude irrelevant periods.

**Example:** Find analogues, but exclude the last 10 years to find deeper historical parallels.
```bash
npm run dev -- analyze --template balanced-economic --exclude-recent-years 10
```

**Example:** Focus the search specifically on the "Stagflation" and "Volcker" eras.
```bash
npm run dev -- analyze -i UNRATE:1.0 --focus-era stagflation --focus-era volcker
```

## Commands and Arguments

### `analyze`
The main command for running an analysis.

-   `-i, --indicator`: An indicator to include, with a weight (e.g., `UNRATE:0.5`). Can be used multiple times. **Weights must sum to 1.0**.
-   `-m, --months`: The number of recent months to use as the target scenario for comparison (default: 12).
-   `-t, --top`: The number of top analogues to return (default: 5).
-   `--template`: Use a pre-defined scenario template (e.g., `stagflation-hunt`).
-   `--exclude-recent-years`: Exclude a number of recent years from the search.
-   `--focus-era`: Focus the search on a specific economic era. Can be used multiple times.
-   `--exclude-era`: Exclude a specific economic era from the search. Can be used multiple times.
-   `--include-unreliable`: Include pre-1960 data that is filtered out by default.

### `list-templates`
Lists all available scenario templates.

### `update-data`
Fetches the latest economic data from the FRED API.
- `--api-key`: Your FRED API key (if not in `.env`).

## Supported Indicators

| ID       | Description                 |
| :------- | :-------------------------- |
| `UNRATE`   | Unemployment Rate           |
| `CPIAUCSL` | CPI (Inflation)             |
| `DFF`      | Federal Funds Rate          |
| `PCEPI`    | PCE (Core Inflation)        |
| `GDPC1`    | Real GDP Growth             |
| `T10Y2Y`   | 10-2 Year Treasury Spread   |
| `ICSA`     | Initial Jobless Claims      |

## Development

-   **Run tests:** `npm test`
-   **Run dev server:** `npm run dev -- [command]`

## License

MIT
