# Fed Scenario Modeling Utility

A command-line tool for analyzing Federal Reserve policy scenarios by finding historical analogues based on unemployment and inflation conditions.

## Features

- **Historical Analysis**: Find periods with similar economic conditions
- **Tariff Context**: Filter results to periods with significant tariff policies
- **Real-time Data**: Fetches the latest economic data from FRED API
- **Rich Output**: Color-coded results with tabular display
- **Flexible Input**: Multiple ways to provide API credentials

## Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd fed-scenario-cli
   npm install
   ```

2. **Get a FRED API key (free):**
   - Visit: https://fred.stlouisfed.org/docs/api/api_key.html
   - Create a free account
   - Request an API key (instant approval)

3. **Set up your API key** (choose one method):

   **Option A: Environment file (recommended)**
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```

   **Option B: Command line flag**
   ```bash
   # Use --api-key flag with each command
   npm run dev -- update-data --api-key your_key_here
   ```

## Usage

### 1. Update Economic Data

First, fetch the latest data from FRED:

```bash
# Using environment variable
npm run dev -- update-data

# Using command line flag
npm run dev -- update-data --api-key your_key_here
```

This downloads ~70 years of:
- Unemployment rates (UNRATE)
- Consumer Price Index with YoY calculation (CPIAUCSL)
- Federal Funds Rate (DFF)

### 2. Analyze Scenarios

Find historical analogues for specific economic conditions:

```bash
# Basic analysis: 3-5% unemployment, 2-4% inflation
npm run dev -- analyze --umin 3 --umax 5 --imin 2 --imax 4

# Include tariff context and custom window
npm run dev -- analyze --umin 6 --umax 8 --imin 1 --imax 3 --window-months 6 --tariff-context

# Using short flags
npm run dev -- analyze -umin 4 -umax 6 -imin 3 -imax 5 -w 12 -t
```

### Command Options

**analyze command:**
- `--unemployment-min, -umin`: Minimum unemployment rate (%)
- `--unemployment-max, -umax`: Maximum unemployment rate (%)
- `--inflation-min, -imin`: Minimum inflation rate (%)
- `--inflation-max, -imax`: Maximum inflation rate (%)
- `--window-months, -w`: Analysis window in months (default: 12)
- `--tariff-context, -t`: Only include periods with tariff policies
- `--api-key, -k`: FRED API key (if not in environment)

## Output

The tool displays results in a formatted table:

```
Historical Analogues

Start Date   End Date     Unemployment Inflation   Start Rate  End Rate  Outcome
----------------------------------------------------------------------------
1990-03-01   1991-03-01   6.2%         4.1%        8.25%       6.00%     CUT
2008-09-01   2009-09-01   6.1%         3.8%        2.00%       0.25%     CUT
```

**Color coding:**
- 🟢 **CUT**: Federal funds rate decreased
- 🔴 **HIKE**: Federal funds rate increased  
- 🟡 **HOLD**: Federal funds rate remained stable

## Development

### Run Tests
```bash
npm test
```

### Build (Note: ES module configuration needs fixes)
```bash
npm run build
```

### Manual Testing
```bash
# Run analysis test with mock data
node --loader ts-node/esm src/testAnalysis.ts
```

## Data Sources

- **Federal Reserve Economic Data (FRED)**: https://fred.stlouisfed.org
- **Unemployment Rate**: UNRATE series
- **Consumer Price Index**: CPIAUCSL series (converted to YoY %)
- **Federal Funds Rate**: DFF series

## Security

- ✅ API keys are never committed to version control
- ✅ `.env` files are ignored by git
- ✅ Multiple secure ways to provide credentials
- ✅ Clear error messages guide proper setup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm test`
4. Submit a pull request

## License

ISC License - see package.json for details.