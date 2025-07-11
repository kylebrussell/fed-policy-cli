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

> **Institutional-grade macro trading intelligence from Fed policy analysis**

Transform economic data into actionable trading recommendations with specific entry/exit levels, position sizing, and risk management. Built for macro traders, hedge funds, and institutional investors who need professional-grade Fed policy intelligence.

## Features

### 🎯 **Professional Trading Intelligence**
- **📊 Specific Entry/Exit Levels** - Technical analysis with support/resistance and volatility-based pricing
- **💰 Risk-Adjusted Position Sizing** - Kelly Criterion, volatility-adjusted, and risk parity methodologies
- **🛡️ Comprehensive Hedging Strategies** - Duration, curve, volatility, and cross-asset hedge recommendations
- **📈 Monte Carlo P&L Analysis** - 1000+ simulations with Value-at-Risk calculations
- **🔍 Backtesting Framework** - Historical performance validation with Sharpe ratios and regime analysis

### 🏛️ **Fed Policy Analysis**
- **📊 Historical Analogue Analysis** - Find similar Fed policy periods using weighted economic indicators
- **💹 Market vs Fed Expectations** - Analyze yield curve inversions and rate divergences
- **🌍 Cross-Asset Fed Playbook** - Multi-asset performance during Fed cycles (bonds, equities, commodities, currencies)
- **🎮 Policy Simulator** - What-if scenario modeling for Fed policy changes
- **📈 Trading Signals** - Professional signals with confidence scores and risk analysis

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

### 🎯 **Professional Trading** *(New in v5.1)*
- `trading-recommendations` - Generate institutional-grade trade recommendations with specific levels
- `position-sizing` - Calculate risk-adjusted position sizes using multiple methodologies
- `hedging-strategies` - Generate comprehensive hedge recommendations for Fed scenarios
- `scenario-analysis` - Run Monte Carlo simulations with Value-at-Risk calculations
- `backtest` - Historical performance validation with regime analysis

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

# Generate institutional trading recommendations
npx fed-policy-cli trading-recommendations

# Run backtesting on historical Fed cycles
npx fed-policy-cli backtest --strategy fed-cycle --start-date 2020-01-01
```

## Data Sources

- **FRED (Federal Reserve Economic Data)** - 100+ economic indicators
- **FOMC Projections** - Fed dot plot data
- **Alpha Vantage** - ETF and cross-asset data
- **Treasury Yield Curves** - Daily yield data

## Use Cases

### 🏦 **Institutional Trading**
- **Macro Trading Desks** - Specific trade recommendations with entry/exit levels and position sizing
- **Hedge Fund Strategies** - Fed cycle positioning with comprehensive risk management
- **Asset Management** - Multi-asset portfolio allocation during Fed regime changes
- **Risk Management** - Value-at-Risk analysis, stress testing, and drawdown monitoring

### 📊 **Professional Analysis**
- **Economic Research** - Fed policy impact studies with historical validation
- **Portfolio Construction** - Correlation-adjusted position sizing and sector rotation
- **Trading Strategy Development** - Backtested performance metrics and regime analysis
- **Client Advisory** - Professional-grade Fed policy intelligence and market positioning

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

 🎯  Trading Recommendations - Institutional-grade trade ideas with levels
         $ npx fed-policy-cli trading-recommendations

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

### Professional Trading Recommendations
```bash
$ npx fed-policy-cli trading-recommendations
```

```
═══════════════════════════════════════════════════════════════
═══════════════ TRADING RECOMMENDATIONS ═══════════════════════
═══════════════════════════════════════════════════════════════

1. TLT - BUY (Bonds)
   Expected Return: +12.3%  |  Confidence: 78%  |  Timeframe: 6-12 months
   
   📊 Entry/Exit Strategy:
   Entry Range: $94.50 - $96.20 (WAIT FOR PULLBACK)
   Stop Loss: $91.80
   Profit Target: $107.50
   
   💰 Position Sizing:
   Portfolio Weight: 8.5%  |  Method: VOLATILITY ADJUSTED
   Risk Budget: 1.3%  |  Max Position: $850K
   
   ⚠️ Risk Factors:
   • Interest rate sensitivity - Fed policy changes affect pricing
   • Duration risk - Long-term rate exposure
   
   🎯 Scenario Analysis:
   Most Likely (65%): Fed Easing (+8.2%)
   Range: -4.1% to +18.7% across 4 scenarios
   
   🛡️ Hedging Strategy:
   • TLT Put Options (20% hedge, 1.2% cost)
   • 2s10s Steepener (15% hedge, 0.8% cost)

2. SPY - HOLD (Equities)
   Expected Return: +6.1%  |  Confidence: 62%  |  Timeframe: 3-9 months
   
   📊 Entry/Exit Strategy:
   Entry: $445.20 (IMMEDIATE)
   Stop Loss: $425.80
   Profit Target: $472.60
   
   💰 Position Sizing:
   Portfolio Weight: 12.3%  |  Method: RISK PARITY
   Risk Budget: 2.1%  |  Max Position: $1.23M

═══════════════════════════════════════════════════════════════
═══════════════ PORTFOLIO SUMMARY ═══════════════════════════
═══════════════════════════════════════════════════════════════

Total Allocation: 20.8%  |  Expected Return: +8.4%  |  Avg Confidence: 70%

Asset Class Breakdown:
Bonds: 8.5%
Equities: 12.3%

Risk Metrics:
Portfolio VaR (95%): -2.3%
Max Drawdown: -8.7%
Sharpe Ratio: 1.42
```

## License

MIT

## Support

- GitHub Issues: [fed-policy-cli/issues](https://github.com/kylebrussell/fed-policy-cli/issues)
- Documentation: Run `npx fed-policy-cli help`