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

A command-line tool for analyzing Federal Reserve policy patterns and their market impact. Find historical analogues to current economic conditions, track FOMC meeting timing, and explore how different assets have performed during similar Fed policy periods.

**What it's good at**: Historical pattern matching, Fed meeting tracking, seeing what happened before  
**What it's not**: Real-time trading system, guaranteed predictions, professional trading advice

## What it does

**📈 Historical Pattern Matching**: Compare current economic conditions to past periods and see what the Fed did next

**📊 FOMC Meeting Tracker**: See when the next Fed meeting is and get context on volatility patterns around Fed events

**💹 Market Expectations**: Compare what markets are pricing vs what the Fed has projected

**🎯 Cross-Asset Analysis**: See how bonds, stocks, and other assets performed during similar Fed policy periods

**📉 Trading Ideas**: Get specific trade recommendations with entry/exit levels based on historical patterns

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

## Setup (Optional API Keys)

The tool works without any setup, but you can get more data with free API keys:

- **FRED API Key** (free): Get from [FRED Economic Data](https://fred.stlouisfed.org/docs/api/api_key.html) for economic data
- **Alpha Vantage API Key** (free): Get from [Alpha Vantage](https://www.alphavantage.co/support/#api-key) for real VIX data

Put them in a `.env` file:
```
FRED_API_KEY=your_fred_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
```

## Commands

**Getting Started**
- `update-data` - Download latest economic data (do this first)
- `list-templates` - See available economic analysis templates

**Main Analysis**
- `analyze` - Find historical periods similar to today
- `market-expectations` - See what markets expect vs Fed projections
- `cross-asset-analysis` - How assets performed in similar periods
- `correlate` - See how economic indicators relate to each other

**FOMC & Volatility**
- `fomc-volatility` - When's the next Fed meeting and what's volatility doing
- `trading-recommendations` - Get specific trade ideas based on historical patterns

**Advanced**
- `simulate` - Interactive what-if scenario modeling
- `backtest` - See how strategies performed historically

## Example Usage

```bash
# Find periods similar to high inflation + unemployment (stagflation)
npx fed-policy-cli analyze --template stagflation-hunt

# See what the market expects vs Fed projections
npx fed-policy-cli market-expectations

# When's the next FOMC meeting and what's volatility doing?
npx fed-policy-cli fomc-volatility

# How did assets perform during similar Fed policy periods?
npx fed-policy-cli cross-asset-analysis

# Get specific trade ideas based on historical patterns
npx fed-policy-cli trading-recommendations
```

## Data Sources

- **Federal Reserve** - Economic data and FOMC meeting schedule
- **Alpha Vantage** - Market data including VIX (with free API key)
- **Treasury Department** - Yield curve data

## Who might find this useful

- **Traders** - See what happened to assets during similar Fed policy periods
- **Researchers** - Explore historical Fed policy patterns and market reactions  
- **Students** - Learn about Fed policy through historical examples
- **Anyone curious** about Fed policy and market relationships

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

### Getting Started

```bash
$ npx fed-policy-cli
```

Shows you the main commands and quick start options. Try:

- `npx fed-policy-cli analyze --template stagflation-hunt` - Find periods similar to high inflation
- `npx fed-policy-cli market-expectations` - See market vs Fed expectations  
- `npx fed-policy-cli fomc-volatility` - When's the next Fed meeting?

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

### FOMC Meeting Tracker

See when the next Fed meeting is and get context on volatility:

```bash
$ npx fed-policy-cli fomc-volatility
```

```
🏛️ Next FOMC Meeting: Dec 17, 2024 (T-14 days)
Expected Move: ~1.8% (based on current volatility)

──── Current Volatility Levels ────
SPY Volatility: 18.2% (+2.1% vs 30-day avg)
TLT Volatility: 10.9% (+1.3% vs 30-day avg)

──── FOMC Timing Context ────
Days to FOMC: 14
Current Phase: PRE-FOMC  
Vol Regime: NORMAL

Recommended Focus: General volatility monitoring

Note: Enhanced options analysis available with market data subscriptions
```

### Trading Ideas

Get specific trade ideas based on historical patterns:

```bash
$ npx fed-policy-cli trading-recommendations
```

```
──── TRADING RECOMMENDATIONS ────

1. TLT - BUY (Bonds)
   Expected Return: +12.3% | Confidence: 78% | 6-12 months
   
   Entry: $94.50 - $96.20 (wait for pullback)
   Stop Loss: $91.80
   Target: $107.50
   
   Why: Similar Fed easing periods showed 8.2% avg returns
   Risk: Duration sensitivity to rate changes

2. SPY - HOLD (Equities)  
   Expected Return: +6.1% | Confidence: 62% | 3-9 months
   
   Entry: $445.20 (immediate)
   Stop Loss: $425.80
   Target: $472.60
   
   Why: Mixed signals in current environment
```

## License

MIT

## Support

- GitHub Issues: [fed-policy-cli/issues](https://github.com/kylebrussell/fed-policy-cli/issues)
- Documentation: Run `npx fed-policy-cli help`