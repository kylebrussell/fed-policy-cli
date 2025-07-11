# Fed Scenario Modeling Utility v5.0

A powerful command-line tool for analyzing the U.S. economy and predicting Federal Reserve policy actions. Find historical periods that are statistically similar to the present and use them to understand likely Fed responses based on historical precedent.

## 🚀 What's New in v5.0 - Macro Trading Platform

- **🎯 Market Expectations Dashboard**: Analyze Fed dot plot vs market-implied rates from Treasury yield curve
- **📈 Yield Curve Analysis**: Real-time inversion detection with recession risk warnings  
- **💰 Trading Signals**: Fed vs market divergence scoring with confidence levels and timeframes
- **⚡ Live Market Data**: Treasury yields (3M-30Y) integrated with Fed projections for trading insights
- **🔍 Divergence Detection**: Quantify basis point differences between market expectations and Fed guidance

### Fed Policy Analysis (v4.0)
- **Fed Reaction Function Dashboard**: Real-time policy trigger analysis with pressure gauge and rate change probabilities
- **Policy Impact Scorecard**: Dual mandate scoring system with transmission lag analysis
- **Policy Prescription Summary**: Actionable recommendations with primary path, alternatives, and risk factors
- **Fed Policy Response Analyzer**: Comprehensive analysis of how the Fed responded in similar historical situations
- **Policy Pattern Recognition**: Automatically identifies aggressive vs gradual easing/tightening cycles
- **Response Timing Analysis**: Shows how long the Fed typically waits before acting on economic triggers
- **Policy Playbooks**: Extracts typical Fed response sequences with historical success rates
- **Future Projections**: Projects likely Fed actions for the next 6 months based on historical patterns
- **Interactive Policy Simulator**: What-if scenario modeling to explore different Fed policy paths
- **Enhanced Visualizations**: Improved charts showing meaningful economic variations instead of flat lines
- **Temporal Diversity**: Results now span decades of history, not just recent years

## 🎯 Core Mission

Transform economic data into actionable macro trading insights by:
- Finding genuinely diverse historical analogues to current conditions
- Analyzing how the Fed responded in similar situations
- Detecting market vs Fed expectations divergence for trading opportunities
- Providing real-time yield curve analysis with recession risk warnings
- Projecting likely future Fed actions based on historical patterns
- Delivering trading signals with confidence levels and timeframes

## ✨ Key Features

### Market Expectations Analysis (NEW v5.0)
- **📊 Market Expectations Dashboard**: Compare Fed dot plot projections vs market-implied rates from Treasury yield curve
- **📈 Yield Curve Analysis**: Real-time display of full yield curve (3M-30Y) with inversion detection and recession warnings
- **💰 Trading Signal Generation**: Fed vs market divergence scoring with confidence levels, strength indicators, and timeframes
- **⚡ Live Treasury Data**: Integrated 7-point yield curve (3M, 6M, 1Y, 2Y, 5Y, 10Y, 30Y) updated from FRED API
- **🔍 Divergence Quantification**: Precise basis point calculations between market expectations and Fed projections
- **⚠️ Risk Warnings**: Automatic detection of yield curve inversions with recession risk alerts

### Fed Policy Analysis (v4.0)
- **🎯 Fed Reaction Function Dashboard**: Shows policy triggers, pressure gauge (-100 to +100), and next meeting probabilities
- **📈 Policy Impact Scorecard**: Dual mandate scoring (employment vs price stability) with transmission lag analysis
- **📋 Policy Prescription Summary**: Most likely Fed response with alternatives, thresholds, and communication strategy
- **📊 Policy Response Analyzer**: Automatically categorizes Fed response patterns (aggressive easing, gradual tightening, data-dependent)
- **⏱️ Response Timing Analysis**: Calculates lag between economic triggers and Fed actions
- **📈 Policy Effectiveness Tracking**: Measures how indicators responded to Fed interventions
- **📋 Policy Playbook Generator**: Extracts typical Fed response sequences with success rates
- **🔮 Future Projections**: Projects likely Fed actions for the next 6 months based on historical patterns
- **🎮 Interactive Policy Simulator**: Explore what-if scenarios with different Fed policy paths

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

# 4. Run your first analysis with Fed policy predictions!
npm run dev -- analyze --template balanced-economic -m 3

# 5. Or check market expectations vs Fed projections!
npm run dev -- market-expectations

# 6. Or try the interactive policy simulator!
npm run dev -- simulate
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

### 5. Market Expectations Analysis

Analyze where market expectations diverge from Fed projections using yield curve and dot plot data.

**Example:** Get real-time market vs Fed analysis.
```bash
npm run dev -- market-expectations
```

This shows:
- **Current Yield Curve**: Full 3M-30Y curve with inversion warnings
- **Fed Projections**: Latest FOMC dot plot median and ranges
- **Market Divergence**: Basis point differences with directional bias
- **Trading Signals**: Confidence-scored opportunities with timeframes
- **Risk Warnings**: Recession risk alerts from yield curve inversions

**Example output:**
```
📊 MARKET EXPECTATIONS DASHBOARD

Current Yield Curve
3M: 4.42%   6M: 4.31%   1Y: 4.07%   2Y: 3.86%
2Y-10Y Spread: -4bp | 3M-10Y Spread: -4bp
⚠️  YIELD CURVE INVERTED - RECESSION RISK

Market vs Fed Divergence
Market Implied Rate: 3.86%
Fed Projection: 3.40%
Divergence: +46bp
Market expects HIGHER rates than Fed

🎯 TRADING SIGNALS
YIELD CURVE PLAY - MODERATE (7.72% confidence)
  Yield curve inverted (-4bp). Consider recession protection trades.
  Timeframe: 6-18 months
```

### 6. Interactive Policy Simulator

Explore what-if scenarios by modeling different Fed policy paths and their projected economic impacts.

**Example:** Launch the policy simulator with balanced economic indicators.
```bash
npm run dev -- simulate
```

**Example:** Use a specific template for simulation baseline.
```bash
npm run dev -- simulate --template inflation-regime
```

The simulator shows:
- Current economic conditions from live data
- Historical best match for context
- Four policy scenarios with 6-month projections:
  - No Change: Continue current policy stance
  - Gradual Easing: 25bp cuts at measured pace
  - Aggressive Easing: 50bp cuts to support growth
  - Gradual Tightening: 25bp hikes to control inflation
- Color-coded projections for unemployment, inflation, and GDP
- Confidence levels and historical precedent warnings

**Example simulator output:**
```
🎮 Fed Policy Simulator: What-If Scenarios
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Economic Conditions (Latest Data)
• Unemployment: 4.1%
• Inflation: 2.4%
• GDP Growth: 2.0%
• Fed Funds: 4.3%

Best Historical Match: 1985-01 (Volcker Era)

Policy Scenarios (6-Month Projections)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. No Change (Hold at 4.33%)
   → Unemployment: 4.1% → 4.2%
   → Inflation: 2.4% → 2.3%
   → GDP Growth: 2.0% → 1.9%

2. Gradual Easing (-75bps total)
   → Unemployment: 4.1% → 3.9% ✓
   → Inflation: 2.4% → 2.5%
   → GDP Growth: 2.0% → 2.3% ✓
```

## Example Output

When you run an analysis, you'll see comprehensive results including:

```
🎯 Fed Reaction Function Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Policy Trigger Indicators

Unemployment Rate: 4.10 → NEUTRAL
  Thresholds: 4.5 | 4 | 3.5

CPI Inflation: 2.38 → NEUTRAL
  Thresholds: 1.5 | 2 | 3

GDP Growth: 1.99 → NEUTRAL
  Thresholds: 1 | 2 | 3

Policy Pressure Gauge
Easing ◆◆◆◆◆◈◆◆◆◆◆ Tightening
        Pressure: -4

Next Meeting Probabilities
HOLD         70%    Balanced risks favor patience
-25bps       15%    Insurance against downside risks  
+25bps       15%    Preemptive inflation control

📊 Top Historical Analogues
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#1: 1985-01 to 1985-03                    Score: 0.2342
Volcker Anti-Inflation (1979-1986)

[Economic indicator charts...]

📊 Fed Policy Response Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Policy Pattern
Type: Fed maintained steady policy
Total Adjustment: 0 bps over 0 moves

Policy Playbook
Key Triggers:
• Elevated inflation (>3%)
• Rising unemployment (>5%)

Historical Success Rate: 50%

If Fed Follows This Playbook (Next 6 Months)
2025-08: HOLD - 50% likely
2025-09: HOLD - 50% likely
2025-10: HOLD - 50% likely

📈 Policy Impact Scorecard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dual Mandate Performance
Employment Score:      █████░░░░░ 50/100
Price Stability Score: █████░░░░░ 50/100
Overall Score:         █████░░░░░ 50/100 ✗

Policy Balance: BALANCED

📋 Policy Prescription Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Most Likely Policy Path
  Maintain current policy stance (70%)
  Timeframe: Next 2-3 meetings
  
  Decision Thresholds:
  • CPI Inflation > 2.5
  • Unemployment Rate < 4.5

Alternative Scenarios
  Precautionary 25bp cut (20%)
  Condition: If downside risks materialize

Risk Factors
⚠ Labor market softening could accelerate

Communication Strategy
• Balance dual mandate considerations
• Emphasize meeting-by-meeting approach
• Avoid strong forward guidance
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

### `market-expectations`
Analyze market expectations vs Fed projections for trading insights.
- No additional arguments required - uses latest available data.

### `simulate`
Launch an interactive policy simulator to explore what-if scenarios.
- `-T, --template`: Economic template to use for baseline (default: `balanced-economic`).
- `-m, --months`: Number of recent months for current scenario (default: 12).

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
| `DGS3MO`   | 3-Month Treasury Yield      | Level | Daily → Monthly |
| `DGS6MO`   | 6-Month Treasury Yield      | Level | Daily → Monthly |
| `DGS1`     | 1-Year Treasury Yield       | Level | Daily → Monthly |
| `DGS2`     | 2-Year Treasury Yield       | Level | Daily → Monthly |
| `DGS5`     | 5-Year Treasury Yield       | Level | Daily → Monthly |
| `DGS10`    | 10-Year Treasury Yield      | Level | Daily → Monthly |
| `DGS30`    | 30-Year Treasury Yield      | Level | Daily → Monthly |

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
