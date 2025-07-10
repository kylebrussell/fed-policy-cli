# Fed Scenario Modeling Utility

A powerful command-line tool for analyzing the U.S. economy and Federal Reserve policy. Find historical periods that are statistically similar to the present (or any other period) using a flexible, weighted analysis of key economic indicators.

## Features

- **Flexible Analysis Engine**: Compare historical periods using any combination of supported economic indicators.
- **Weighted Scenarios**: Assign weights to each indicator to define your analytical priorities.
- **Similarity Search**: Uses Dynamic Time Warping (DTW) to find historical analogues based on the *shape* and *trajectory* of the data, not just absolute values.
- **Rich Terminal UI**: Displays detailed reports with ASCII charts for each indicator and a concise timeline of Fed policy actions.
- **Broad Economic Dataset**: Fetches and stores data for a wide range of key indicators from the FRED API.

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

### 2. Analyze Scenarios

Find historical analogues by defining a weighted basket of indicators. The analysis always compares against the most recent data for the specified number of months.

**Example:** Find the top 5 historical periods that look most like the last 18 months, with a 60% weight on inflation and 40% on the yield curve.

```bash
npm run dev -- analyze -m 18 -t 5 -i CPIAUCSL:0.6 -i T10Y2Y:0.4
```

**Example:** Find the period most similar to the last 3 years, based only on Real GDP growth.

```bash
npm run dev -- analyze -m 36 -t 1 -i GDPC1:1.0
```

### Command-Line Arguments

**`analyze` command:**

-   `-i, --indicator`: An indicator to include, with a weight (e.g., `UNRATE:0.5`). Can be used multiple times. **Weights must sum to 1.0**.
-   `-m, --months`: The number of recent months to use as the target scenario for comparison (default: 12).
-   `-t, --top`: The number of top analogues to return (default: 5).

**Supported Indicators:**

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
