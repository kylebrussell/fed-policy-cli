# Fed Scenario Modeling Utility

A powerful command-line tool for analyzing the U.S. economy and predicting Federal Reserve policy actions. Find historical periods that are statistically similar to the present and use them to understand likely Fed responses based on historical precedent.

## 🚀 What's New in v4.0

- **Fed Policy Response Analyzer**: Comprehensive analysis of how the Fed responded in similar historical situations
- **Policy Pattern Recognition**: Automatically identifies aggressive vs gradual easing/tightening cycles
- **Response Timing Analysis**: Shows how long the Fed typically waits before acting on economic triggers
- **Policy Playbooks**: Extracts typical Fed response sequences with historical success rates
- **Future Projections**: Projects likely Fed actions for the next 6 months based on historical patterns
- **Enhanced Visualizations**: Improved charts showing meaningful economic variations instead of flat lines
- **Temporal Diversity**: Results now span decades of history, not just recent years

## 🎯 Core Mission

Transform economic data into actionable Fed policy insights by:
- Finding genuinely diverse historical analogues to current conditions
- Analyzing how the Fed responded in similar situations
- Projecting likely future Fed actions based on historical patterns
- Providing policy playbooks with success metrics

## ✨ Key Features

### Fed Policy Analysis (NEW v4.0)
- **📊 Policy Response Analyzer**: Automatically categorizes Fed response patterns (aggressive easing, gradual tightening, data-dependent)
- **⏱️ Response Timing Analysis**: Calculates lag between economic triggers and Fed actions
- **📈 Policy Effectiveness Tracking**: Measures how indicators responded to Fed interventions
- **📋 Policy Playbook Generator**: Extracts typical Fed response sequences with success rates
- **🔮 Future Projections**: Projects likely Fed actions for the next 6 months based on historical patterns

### Intelligent Historical Analysis
- **Temporal Diversity**: Algorithm ensures results span multiple economic eras, not just recent periods
- **Economic Era Context**: Results labeled with era names (e.g., "Stagflation Era", "Volcker Period", "Dot-Com Boom")
- **No Overlapping Periods**: Enforces minimum 6-month gaps between analogues for genuine diversity
- **Data Quality Filtering**: Automatically excludes unreliable pre-1960 data (override with `--include-unreliable`)

### Research Tools
- **Flexible Analysis Engine**: Compare periods using any weighted combination of 7 economic indicators
- **8 Scenario Templates**: Pre-built templates for common research questions (stagflation, financial crisis, policy cycles)
- **Period Controls**: Exclude recent years or focus on specific economic eras
- **Rich Terminal UI**: Interactive charts with meaningful data variation and Fed policy timelines

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <repository-url> && cd fed-scenario-cli && npm install

# 2. Set up your free FRED API key
cp .env.example .env
# Edit .env and add your key from https://fred.stlouisfed.org/docs/api/api_key.html

# 3. Download latest economic data
npm run dev -- update-data

# 4. Run your first analysis!
npm run dev -- analyze --template stagflation-hunt -t 3
```

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

## Example Output

When you run an analysis, you'll see comprehensive results including:

```
📊 Top Historical Analogues

#1: 1984-10 to 1985-09                    Score: 1.3661
Volcker Anti-Inflation (1979-1986)

[Economic indicator charts...]

📊 Fed Policy Response Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Policy Pattern
Type: Aggressive easing cycle
Total Adjustment: -367 bps over 6 moves
Average per Move: -61 bps

Response Timing
Trigger: Inflation crossed 3.0
First Action Lag: 11 months
Full Response Time: 9 months

Policy Playbook
Key Triggers:
• Elevated inflation (>3%)
• Rising unemployment (>5%)

Typical Sequence:
1. Emergency easing response (-383bps over 3 months)
2. Cautious rate normalization (+62bps over 2 months)

Historical Success Rate: 90%

If Fed Follows This Playbook (Next 6 Months)
2025-08: HOLD - 60% likely
2025-09: CUT (-25bps) - 75% likely
2025-10: CUT (-25bps) - 70% likely
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
Lists all available scenario templates with descriptions and indicator weights.

### `update-data`
Fetches the latest economic data from the FRED API.
- `--api-key`: Your FRED API key (if not in `.env`).

## Available Templates

| Template ID | Name | Description | Focus |
|------------|------|-------------|-------|
| `stagflation-hunt` | Stagflation Hunt | Find periods of high inflation + high unemployment | UNRATE:0.4, CPIAUCSL:0.4, DFF:0.2 |
| `financial-crisis` | Financial Crisis Patterns | Identify financial stress periods | UNRATE:0.3, T10Y2Y:0.3, DFF:0.2, ICSA:0.2 |
| `policy-tightening` | Policy Tightening Cycles | Analyze Fed tightening periods | DFF:0.4, CPIAUCSL:0.3, UNRATE:0.2, T10Y2Y:0.1 |
| `recession-early-warning` | Recession Early Warning | Detect recession precursors | T10Y2Y:0.3, ICSA:0.25, GDPC1:0.25, UNRATE:0.2 |
| `inflation-regime` | Inflation Regime Analysis | Focus on inflationary periods | CPIAUCSL:0.4, PCEPI:0.3, DFF:0.3 |
| `labor-market-stress` | Labor Market Stress | Analyze unemployment spikes | UNRATE:0.5, ICSA:0.3, GDPC1:0.2 |
| `yield-curve-analysis` | Yield Curve Analysis | Study yield curve dynamics | T10Y2Y:0.5, DFF:0.3, GDPC1:0.2 |
| `balanced-economic` | Balanced Economic Analysis | Equal weight across indicators | All indicators: 0.2 each |

## Supported Indicators

| ID       | Description                 | Type | Frequency |
| :------- | :-------------------------- | ---- | --------- |
| `UNRATE`   | Unemployment Rate           | Level | Monthly |
| `CPIAUCSL` | CPI (Inflation)             | YoY % | Monthly |
| `DFF`      | Federal Funds Rate          | Level | Daily → Monthly |
| `PCEPI`    | PCE (Core Inflation)        | YoY % | Monthly |
| `GDPC1`    | Real GDP Growth             | YoY % | Quarterly |
| `T10Y2Y`   | 10-2 Year Treasury Spread   | Level | Daily → Monthly |
| `ICSA`     | Initial Jobless Claims      | Level | Weekly → Monthly |

## Economic Eras

The tool recognizes and labels these historical economic periods:

| Era | Years | Key Characteristics |
|-----|-------|-------------------|
| **Modern Era (Post-COVID)** | 2020-2030 | Pandemic recovery, inflation surge, aggressive Fed response |
| **Great Recession Recovery** | 2010-2019 | Slow growth, low inflation, gradual normalization |
| **Financial Crisis** | 2007-2009 | Housing crash, bank failures, emergency Fed action |
| **Great Moderation** | 1995-2006 | Stable growth, low volatility, measured Fed policy |
| **Dot-Com Era** | 1990-1994 | Tech boom, productivity gains, soft landing attempts |
| **Greenspan Era** | 1987-1989 | Post-crash recovery, inflation concerns |
| **Volcker Anti-Inflation** | 1979-1986 | Aggressive rate hikes, recession to break inflation |
| **Stagflation Era** | 1970-1978 | High inflation + unemployment, policy dilemmas |
| **Post-War Golden Age** | 1950-1969 | Strong growth, moderate inflation, Bretton Woods |

## Development

-   **Run tests:** `npm test`
-   **Run dev server:** `npm run dev -- [command]`

## License

MIT
