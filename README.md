```
███████╗███████╗██████╗     ██████╗  ██████╗ ██╗     ██╗ ██████╗██╗   ██╗
██╔════╝██╔════╝██╔══██╗    ██╔══██╗██╔═══██╗██║     ██║██╔════╝╚██╗ ██╔╝
█████╗  █████╗  ██║  ██║    ██████╔╝██║   ██║██║     ██║██║      ╚████╔╝
██╔══╝  ██╔══╝  ██║  ██║    ██╔═══╝ ██║   ██║██║     ██║██║       ╚██╔╝
██║     ███████╗██████╔╝    ██║     ╚██████╔╝███████╗██║╚██████╗   ██║
╚═╝     ╚══════╝╚═════╝     ╚═╝      ╚═════╝ ╚══════╝╚═╝ ╚═════╝   ╚═╝

████████╗██████╗  █████╗ ██████╗ ███████╗██████╗
╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗
   ██║   ██████╔╝███████║██║  ██║█████╗  ██████╔╝
   ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝  ██╔══██╗
   ██║   ██║  ██║██║  ██║██████╔╝███████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝
```

# Fed Policy CLI

> Macro trading intelligence from Fed policy analysis

Transform economic data into actionable trading insights by analyzing historical Federal Reserve policy analogues. Built for macro traders, hedge funds, and financial analysts.

## Features

- 📊 **Historical Analogue Analysis** - Find similar Fed policy periods using weighted economic indicators
- 💹 **Market vs Fed Expectations** - Analyze yield curve inversions and rate divergences
- 🌍 **Cross-Asset Fed Playbook** - Multi-asset performance during Fed cycles (bonds, equities, commodities, currencies)
- 🎮 **Policy Simulator** - What-if scenario modeling for Fed policy changes
- 📈 **Trading Signals** - AI-generated signals with confidence scores and risk analysis

## Installation

### Option 1: Run directly with npx (recommended)
```bash
npx fed-policy-cli
```

### Option 2: Install globally
```bash
npm install -g fed-policy-cli
```

## Quick Start

```bash
# Show welcome screen and commands
npx fed-policy-cli

# Fetch latest economic data (required first step)
npx fed-policy-cli update-data --api-key YOUR_FRED_API_KEY

# Analyze current market conditions
npx fed-policy-cli analyze --template balanced-economic

# Market expectations analysis
npx fed-policy-cli market-expectations

# Cross-asset analysis during Fed cycles
npx fed-policy-cli cross-asset-analysis
```

## API Keys Required

- **FRED API Key** (free): Get from [FRED Economic Data](https://fred.stlouisfed.org/docs/api/api_key.html)
- **Alpha Vantage API Key** (optional, for ETF data): Get from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

Store in `.env` file:
```
FRED_API_KEY=your_fred_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
```

## Commands

### Data Management
- `update-data` - Fetch latest economic data from FRED API
- `list-templates` - Show available economic analysis templates

### Analysis
- `analyze` - Find historical Fed policy analogues
- `correlate` - Calculate correlation matrices for economic indicators
- `market-expectations` - Analyze market vs Fed rate expectations
- `cross-asset-analysis` - Multi-asset performance during Fed cycles
- `simulate` - Interactive Fed policy scenario simulator

### Examples
```bash
# Stagflation analysis
npx fed-policy-cli analyze --template stagflation-hunt --months 12

# Custom indicator analysis
npx fed-policy-cli analyze --indicator UNRATE:0.5 --indicator CPIAUCSL:0.5

# Correlation analysis
npx fed-policy-cli correlate --indicators UNRATE CPIAUCSL GDPC1

# Cross-asset analysis with Alpha Vantage data
npx fed-policy-cli cross-asset-analysis --alpha-vantage-key YOUR_KEY
```

## Data Sources

- **FRED (Federal Reserve Economic Data)** - 100+ economic indicators
- **FOMC Projections** - Fed dot plot data
- **Alpha Vantage** - ETF and cross-asset data
- **Treasury Yield Curves** - Daily yield data

## Use Cases

- **Macro Trading** - Position sizing and asset allocation during Fed cycles
- **Risk Management** - Historical drawdown analysis and scenario planning
- **Research** - Economic cycle analysis and policy impact studies
- **Portfolio Management** - Cross-asset rotation strategies

## Available Templates

| Template | Focus | Key Indicators |
|----------|-------|----------------|
| `stagflation-hunt` | High inflation + unemployment | UNRATE, CPIAUCSL, DFF |
| `financial-crisis` | Financial stress periods | UNRATE, T10Y2Y, DFF, ICSA |
| `policy-tightening` | Fed tightening cycles | DFF, CPIAUCSL, UNRATE |
| `recession-early-warning` | Recession precursors | T10Y2Y, ICSA, GDPC1 |
| `inflation-regime` | Inflationary periods | CPIAUCSL, PCEPI, DFF |
| `balanced-economic` | Equal weight analysis | All indicators |

## Supported Indicators

### Economic Data (FRED)
- `UNRATE` - Unemployment Rate
- `CPIAUCSL` - CPI Inflation
- `DFF` - Federal Funds Rate
- `PCEPI` - PCE Core Inflation
- `GDPC1` - Real GDP Growth
- `T10Y2Y` - 10-2 Year Treasury Spread
- `ICSA` - Initial Jobless Claims

### Cross-Asset Data
- `DCOILWTICO` - WTI Crude Oil
- `POILBREUSDM` - Brent Crude Oil
- `DTWEXBGS` - USD Index
- `PCOPPUSDM` - Copper Price

### ETF Data (Alpha Vantage)
- `TLT` - 20+ Year Treasury Bonds
- `SPY` - S&P 500
- `XLF` - Financial Sector
- `HYG` - High Yield Bonds
- `GLD` - Gold

## Example Output

### Welcome Screen
```bash
$ npx fed-policy-cli
```

```
███████╗███████╗██████╗     ██████╗  ██████╗ ██╗     ██╗ ██████╗██╗   ██╗
██╔════╝██╔════╝██╔══██╗    ██╔══██╗██╔═══██╗██║     ██║██╔════╝╚██╗ ██╔╝
█████╗  █████╗  ██║  ██║    ██████╔╝██║   ██║██║     ██║██║      ╚████╔╝
██╔══╝  ██╔══╝  ██║  ██║    ██╔═══╝ ██║   ██║██║     ██║██║       ╚██╔╝
██║     ███████╗██████╔╝    ██║     ╚██████╔╝███████╗██║╚██████╗   ██║
╚═╝     ╚══════╝╚═════╝     ╚═╝      ╚═════╝ ╚══════╝╚═╝ ╚═════╝   ╚═╝

████████╗██████╗  █████╗ ██████╗ ███████╗██████╗
╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗
   ██║   ██████╔╝███████║██║  ██║█████╗  ██████╔╝
   ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝  ██╔══██╗
   ██║   ██║  ██║██║  ██║██████╔╝███████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝  v1.0.2

 Macro Trading Intelligence from Fed Policy Analysis

 Transform economic data into actionable trading insights by analyzing
 historical Fed policy analogues

 Quick Start Commands:

 📊  Analyze Current Conditions - Find historical Fed policy analogues
         $ npx fed-policy-cli analyze --template balanced-economic

 💹  Market vs Fed Expectations - Yield curve & divergence analysis
         $ npx fed-policy-cli market-expectations

 🌍  Cross-Asset Playbook - Multi-asset Fed cycle positioning
         $ npx fed-policy-cli cross-asset-analysis

 🎮  Policy Simulator - What-if Fed scenario modeling
         $ npx fed-policy-cli simulate

 💡 First time? Run npx fed-policy-cli update-data to fetch latest economic data
```

### Market Expectations Analysis
```bash
$ npx fed-policy-cli market-expectations
```

```
═══════════════ MARKET EXPECTATIONS ANALYSIS ═══════════════

════════════════════ EXECUTIVE SUMMARY ═════════════════════

🎯 Market positioning 46bp hawkish vs Fed guidance

Key Takeaways:
  • Significant hawkish divergence creates trading opportunity
  • Yield curve inversion signals recession risk (0.49bp 2s10s)
  • Fed targets 3.40% by 2027

Timeframe: Next 6-18 months
Confidence: ░░░░░░░░░░ 1%
════════════════════════════════════════════════════════════

──── Yield Curve Snapshot ────

3M: 4.42%   2Y: 3.86%   10Y: 4.35%   30Y: 4.86%

2s10s: +0.49bp ⚠️ INVERTED

──── Market vs Fed Divergence ────

Market Rate: 3.86% | Fed Target: 3.40%

📈 +46bp HAWKISH BIAS

──── Trading Signals ────

1. YIELD CURVE PLAY
   Yield curve inverted (0bp). Consider recession protection trades.
   Confidence: ░░░░░░░░ 1%

Last updated: 2025-07-10 | Data: FRED Treasury yields + FOMC dot plot projections
```

## License

MIT

## Support

- GitHub Issues: [fed-policy-cli/issues](https://github.com/kylebrussell/fed-policy-cli/issues)
- Documentation: Run `npx fed-policy-cli help`