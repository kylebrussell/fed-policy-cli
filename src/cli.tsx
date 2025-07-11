// /src/cli.tsx
import 'dotenv/config';
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import yargs, { Arguments } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fetchAllEconomicData, fetchFOMCProjections, fetchAllCrossAssetAndETFData } from './services/api';
import { initDatabase, insertData, getAllData, initProjectionsTable, insertProjections, initCrossAssetTable, initETFTable, initETFFundamentalsTable, insertCrossAssetData, insertETFData, insertETFFundamentals } from './services/database';
import { findAnalogues, getLastNMonths, getTargetPeriod } from './services/analysis';
import { calculateCorrelationMatrix, CorrelationMatrix } from './services/correlation';
import { analyzeMarketExpectations, MarketExpectationsAnalysis } from './services/marketExpectations';
import { analyzeCrossAssetPerformance, generateCrossAssetSummary, generateCrossAssetTradingSignals, CrossAssetAnalogue, CrossAssetSummary, CrossAssetTradingSignal } from './services/crossAssetAnalysis';
import { convertETFDataToMonthly } from './services/etfDataService';
import { ScenarioParams, HistoricalAnalogue, WeightedIndicator, EconomicDataPoint } from './types';
import { FRED_SERIES, ECONOMIC_TEMPLATES } from './constants';
import LoadingSpinner from './components/Spinner';
import StatusMessage from './components/StatusMessage';
import AnalogueReportView from './components/AnalogueReportView';
import CorrelationHeatmap from './components/charts/CorrelationHeatmap';
import PolicySimulatorSimple from './components/PolicySimulatorSimple';
import MarketExpectationsDashboard from './components/MarketExpectationsDashboard';
import CrossAssetDashboard from './components/CrossAssetDashboard';

interface AppProps {
  command: string;
  params: Arguments;
  indicators: WeightedIndicator[];
}

const App = ({ command, params, indicators }: AppProps) => {
  const [status, setStatus] = useState('Initializing...');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analogues, setAnalogues] = useState<HistoricalAnalogue[]>([]);
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrix | null>(null);
  const [currentData, setCurrentData] = useState<EconomicDataPoint[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<MarketExpectationsAnalysis | null>(null);
  const [crossAssetAnalogues, setCrossAssetAnalogues] = useState<CrossAssetAnalogue[]>([]);
  const [crossAssetSummary, setCrossAssetSummary] = useState<CrossAssetSummary | null>(null);
  const [crossAssetSignals, setCrossAssetSignals] = useState<CrossAssetTradingSignal[]>([]);

  useEffect(() => {
    const run = async () => {
      if (command === 'update-data') {
        try {
          setLoading(true);
          setStatus('Initializing database...');
          await initDatabase();
          await initProjectionsTable();
          await initCrossAssetTable();
          await initETFTable();
          await initETFFundamentalsTable();
          
          setStatus(`Fetching data for ${Object.keys(FRED_SERIES).length} series from FRED API...`);
          const data = await fetchAllEconomicData(params.apiKey as string);
          setStatus('Inserting economic data into the database...');
          await insertData(data);
          
          setStatus('Fetching FOMC projections (Fed dot plot) data...');
          try {
            const projections = await fetchFOMCProjections(params.apiKey as string);
            if (projections.length > 0) {
              setStatus(`Inserting ${projections.length} FOMC projections...`);
              await insertProjections(projections);
            } else {
              setStatus('No FOMC projections found (this is normal if FRED hasn\'t updated yet)');
            }
          } catch (projError) {
            // FOMC projections might not be available for all periods
            console.warn('Warning: Could not fetch FOMC projections:', projError);
          }
          
          setStatus('Fetching cross-asset and ETF data...');
          try {
            const crossAssetResult = await fetchAllCrossAssetAndETFData(
              params.apiKey as string,
              params.alphaVantageKey as string
            );
            
            if (crossAssetResult.crossAssetData.length > 0) {
              setStatus(`Inserting ${crossAssetResult.crossAssetData.length} cross-asset data points...`);
              await insertCrossAssetData(crossAssetResult.crossAssetData);
            }
            
            if (crossAssetResult.etfData.length > 0) {
              setStatus(`Inserting ${crossAssetResult.etfData.length} ETF data points...`);
              const monthlyETFData = convertETFDataToMonthly(crossAssetResult.etfData);
              await insertETFData(monthlyETFData);
            }
            
            if (crossAssetResult.etfFundamentals.length > 0) {
              setStatus(`Inserting ${crossAssetResult.etfFundamentals.length} ETF fundamentals...`);
              await insertETFFundamentals(crossAssetResult.etfFundamentals);
            }
          } catch (crossAssetError) {
            console.warn('Warning: Could not fetch cross-asset data:', crossAssetError);
          }
          
          setStatus('Data update complete.');
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
        finally {
          setLoading(false);
        }
      } else if (command === 'analyze') {
        try {
          setLoading(true);
          setStatus('Initializing database...');
          await initDatabase();
          setStatus('Loading all historical economic data...');
          const allData = await getAllData();
          
          // Determine target scenario based on user input
          let targetScenario: EconomicDataPoint[];
          let statusMessage: string;
          
          if (params['target-period']) {
            // Use custom target period
            const targetPeriod = params['target-period'] as string;
            const periodRegex = /^(\d{4}-\d{2})\s+to\s+(\d{4}-\d{2})$/;
            const match = targetPeriod.match(periodRegex);
            const [, startDate, endDate] = match!; // Already validated in .check()
            
            targetScenario = getTargetPeriod(allData, startDate, endDate);
            if (targetScenario.length === 0) {
              setError(`No data found for period ${startDate} to ${endDate}. Check date range and run \`update-data\` if needed.`);
              return;
            }
            statusMessage = `Analyzing ${targetScenario.length} months from ${startDate} to ${endDate} using ${indicators.length} indicators...`;
          } else {
            // Use recent months (default behavior)
            targetScenario = getLastNMonths(allData, params.months as number);
            if (targetScenario.length < (params.months as number)) {
              setError(`Not enough monthly data. Need at least ${params.months} months. Found ${targetScenario.length} months. Run \`update-data\` first.`);
              return;
            }
            statusMessage = `Analyzing data against the last ${params.months} months using ${indicators.length} indicators...`;
          }
          
          setStatus(statusMessage);

          const scenarioParams: ScenarioParams = {
            indicators,
            windowMonths: targetScenario.length,
            excludeUnreliableData: !(params['include-unreliable'] as boolean),
            excludeRecentYears: params['exclude-recent-years'] as number | undefined,
            focusEras: params['focus-era'] ? (Array.isArray(params['focus-era']) ? params['focus-era'] : [params['focus-era']]) as string[] : undefined,
            excludeEras: params['exclude-era'] ? (Array.isArray(params['exclude-era']) ? params['exclude-era'] : [params['exclude-era']]) as string[] : undefined,
          };

          const results = findAnalogues(allData, targetScenario, scenarioParams, params.top as number);
          setAnalogues(results);
          setCurrentData(targetScenario);
          setStatus('Analysis complete.');
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
        finally {
          setLoading(false);
        }
      } else if (command === 'correlate') {
        try {
          setLoading(true);
          setStatus('Initializing database...');
          await initDatabase();
          setStatus('Calculating correlation matrix...');
          const seriesIds = (params.indicators as string[]).map(i => i.split(':')[0]);
          const matrix = await calculateCorrelationMatrix(seriesIds);
          setCorrelationMatrix(matrix);
          setStatus('Correlation analysis complete.');
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setLoading(false);
        }
      } else if (command === 'simulate') {
        try {
          setLoading(true);
          setStatus('Initializing database...');
          await initDatabase();
          setStatus('Loading economic data...');
          const allData = await getAllData();
          
          // Get template
          const templateId = params.template as string || 'balanced-economic';
          const template = ECONOMIC_TEMPLATES[templateId];
          if (!template) {
            throw new Error(`Unknown template: ${templateId}`);
          }
          
          // Get current data and find best analogue
          const recentData = getLastNMonths(allData, params.months as number);
          setCurrentData(recentData);
          
          const scenarioParams: ScenarioParams = {
            indicators: template.indicators,
            windowMonths: recentData.length,
            excludeUnreliableData: true
          };
          
          const results = findAnalogues(allData, recentData, scenarioParams, 1);
          if (results.length === 0) {
            setError('No historical analogues found to base simulations on.');
            return;
          }
          
          setAnalogues(results);
          setStatus('Policy simulator ready.');
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setLoading(false);
        }
      } else if (command === 'market-expectations') {
        try {
          setLoading(true);
          setStatus('Initializing database...');
          await initDatabase();
          setStatus('Loading economic data for market analysis...');
          const allData = await getAllData();
          
          if (allData.length === 0) {
            setError('No economic data found. Run `update-data` first.');
            return;
          }
          
          setStatus('Analyzing market expectations vs Fed projections...');
          const analysis = await analyzeMarketExpectations(allData);
          setMarketAnalysis(analysis);
          setStatus('Market expectations analysis complete.');
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setLoading(false);
        }
      } else if (command === 'cross-asset-analysis') {
        try {
          setLoading(true);
          setStatus('Initializing database...');
          await initDatabase();
          setStatus('Loading all historical economic data...');
          const allData = await getAllData();
          
          if (allData.length === 0) {
            setError('No economic data found. Run `update-data` first.');
            return;
          }
          
          // Get template
          const templateId = params.template as string || 'balanced-economic';
          const template = ECONOMIC_TEMPLATES[templateId];
          if (!template) {
            throw new Error(`Unknown template: ${templateId}`);
          }
          
          // Get target scenario
          const targetScenario = getLastNMonths(allData, params.months as number);
          if (targetScenario.length < (params.months as number)) {
            setError(`Not enough monthly data. Need at least ${params.months} months. Found ${targetScenario.length} months. Run \`update-data\` first.`);
            return;
          }
          
          setStatus('Finding historical analogues for cross-asset analysis...');
          const scenarioParams: ScenarioParams = {
            indicators: template.indicators,
            windowMonths: targetScenario.length,
            excludeUnreliableData: true
          };
          
          const results = findAnalogues(allData, targetScenario, scenarioParams, params.top as number);
          if (results.length === 0) {
            setError('No historical analogues found for cross-asset analysis.');
            return;
          }
          
          setStatus('Analyzing cross-asset performance during historical analogues...');
          const crossAssetAnalogues = await analyzeCrossAssetPerformance(results);
          const summary = generateCrossAssetSummary(crossAssetAnalogues);
          const tradingSignals = generateCrossAssetTradingSignals(crossAssetAnalogues);
          
          setCrossAssetAnalogues(crossAssetAnalogues);
          setCrossAssetSummary(summary);
          setCrossAssetSignals(tradingSignals);
          setStatus('Cross-asset analysis complete.');
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setLoading(false);
        }
      }
    };

    run();
  }, [command, params, indicators]);

  if (loading) {
    return <LoadingSpinner message={status} />;
  }

  if (error) {
    return <StatusMessage message={error} type="error" />;
  }

  if (command === 'analyze' && !loading) {
    return (
      <Box flexDirection="column">
        <StatusMessage message={status} type="success" />
        <AnalogueReportView analogues={analogues} indicators={indicators} currentData={currentData} />
      </Box>
    );
  }

  if (command === 'correlate' && !loading && correlationMatrix) {
    return (
      <Box flexDirection="column">
        <StatusMessage message={status} type="success" />
        <CorrelationHeatmap matrix={correlationMatrix} />
      </Box>
    );
  }

  if (command === 'simulate' && !loading && analogues.length > 0) {
    return (
      <Box flexDirection="column">
        <StatusMessage message={status} type="success" />
        <PolicySimulatorSimple currentData={currentData} historicalAnalogue={analogues[0]} />
      </Box>
    );
  }

  if (command === 'market-expectations' && !loading && marketAnalysis) {
    return (
      <Box flexDirection="column">
        <StatusMessage message={status} type="success" />
        <MarketExpectationsDashboard analysis={marketAnalysis} />
      </Box>
    );
  }

  if (command === 'cross-asset-analysis' && !loading && crossAssetSummary) {
    return (
      <Box flexDirection="column">
        <StatusMessage message={status} type="success" />
        <CrossAssetDashboard 
          analogues={crossAssetAnalogues} 
          summary={crossAssetSummary} 
          tradingSignals={crossAssetSignals} 
        />
      </Box>
    );
  }

  return <StatusMessage message={status} type="success" />;
};

yargs(hideBin(process.argv))
  .command('update-data', 'Fetch latest economic data from FRED and optionally ETF data', (yargs) => {
    return yargs
      .option('api-key', { describe: 'FRED API key', type: 'string', alias: 'k' })
      .option('alpha-vantage-key', { describe: 'Alpha Vantage API key for ETF data', type: 'string', alias: 'a' });
  }, (argv) => {
    render(<App command="update-data" params={argv} indicators={[]} />);
  })
  .command('list-templates', 'List available economic analysis templates', () => {}, (argv) => {
    console.log('\nAvailable Economic Analysis Templates:\n');
    Object.values(ECONOMIC_TEMPLATES).forEach(template => {
      console.log(`${template.id}:`);
      console.log(`  Name: ${template.name}`);
      console.log(`  Category: ${template.category}`);
      console.log(`  Description: ${template.description}`);
      console.log(`  Indicators: ${template.indicators.map(i => `${i.id}:${i.weight}`).join(', ')}\n`);
    });
    process.exit(0);
  })
  .command('analyze', 'Find historical analogues using weighted indicators', (yargs) => {
    return yargs
      .option('template', {
        describe: 'Use a predefined economic analysis template (e.g., stagflation-hunt, financial-crisis)',
        type: 'string',
        alias: 'T',
      })
      .option('indicator', {
        describe: 'Indicator to analyze, with weight (e.g., UNRATE:0.4)',
        type: 'string',
        alias: 'i',
      })
      .option('months', {
        describe: 'Number of recent months to use as the target scenario (ignored if --target-period is used)',
        type: 'number',
        default: 12,
        alias: 'm',
      })
      .option('target-period', {
        describe: 'Specific historical period to analyze (format: YYYY-MM to YYYY-MM, e.g., "2008-01 to 2009-12")',
        type: 'string',
        alias: 'p',
      })
      .option('top', {
        describe: 'Number of top analogues to return',
        type: 'number',
        default: 5,
        alias: 't',
      })
      .option('include-unreliable', {
        describe: 'Include pre-1960 data with potentially unreliable Fed policy data',
        type: 'boolean',
        default: false,
        alias: 'u',
      })
      .option('exclude-recent-years', {
        describe: 'Exclude the last N years from analysis (e.g., --exclude-recent-years 5)',
        type: 'number',
        alias: 'x',
      })
      .option('focus-era', {
        describe: 'Focus analysis on specific economic eras only (e.g., --focus-era stagflation --focus-era volcker)',
        type: 'string',
        alias: 'f',
      })
      .option('exclude-era', {
        describe: 'Exclude specific economic eras from analysis (e.g., --exclude-era modern)',
        type: 'string',
        alias: 'e',
      })
      .check((argv) => {
        // Either template or indicator must be specified
        if (!argv.template && !argv.indicator) {
          throw new Error('Either --template or --indicator must be specified');
        }
        if (argv.template && argv.indicator) {
          throw new Error('Cannot use both --template and --indicator options together');
        }
        
        // Validate target period format if provided
        if (argv['target-period']) {
          const targetPeriod = argv['target-period'] as string;
          const periodRegex = /^(\d{4}-\d{2})\s+to\s+(\d{4}-\d{2})$/;
          const match = targetPeriod.match(periodRegex);
          if (!match) {
            throw new Error('Target period must be in format "YYYY-MM to YYYY-MM" (e.g., "2008-01 to 2009-12")');
          }
          
          const [, startDate, endDate] = match;
          if (startDate >= endDate) {
            throw new Error('Target period start date must be before end date');
          }
        }
        
        return true;
      });
  }, (argv) => {
    let indicators: WeightedIndicator[];
    let templateUsed: string | undefined;

    if (argv.template) {
      // Use template
      templateUsed = argv.template as string;
      if (!ECONOMIC_TEMPLATES[templateUsed]) {
        throw new Error(`Unknown template: ${templateUsed}. Use 'list-templates' to see available options.`);
      }
      indicators = ECONOMIC_TEMPLATES[templateUsed].indicators;
    } else {
      // Use manual indicators
      indicators = (Array.isArray(argv.indicator) ? argv.indicator : [argv.indicator]).map(ind => {
        const [id, weightStr] = ind.split(':');
        if (!id || !weightStr || !FRED_SERIES[id]) {
          throw new Error(`Invalid indicator format or ID: ${ind}. Use format like UNRATE:0.5`);
        }
        return { id, weight: parseFloat(weightStr) };
      });

      const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.001) {
        throw new Error(`Indicator weights must sum to 1.0. Current sum: ${totalWeight}`);
      }
    }

    render(<App command="analyze" params={argv} indicators={indicators} />);
  })
  .command('correlate', 'Calculate the correlation matrix for a set of indicators', (yargs) => {
    return yargs
      .option('indicators', {
        describe: 'A list of indicator IDs to correlate (e.g., UNRATE CPIAUCSL)',
        type: 'string',
        array: true,
        demandOption: true,
        alias: 'i',
      });
  }, (argv) => {
    render(<App command="correlate" params={argv} indicators={[]} />);
  })
  .command('simulate', 'Interactive Fed policy simulator for what-if scenarios', (yargs) => {
    return yargs
      .option('template', {
        describe: 'Economic template to use for baseline (default: balanced-economic)',
        type: 'string',
        alias: 'T',
        default: 'balanced-economic'
      })
      .option('months', {
        describe: 'Number of recent months for current scenario',
        type: 'number',
        default: 12,
        alias: 'm'
      });
  }, (argv) => {
    render(<App command="simulate" params={argv} indicators={[]} />);
  })
  .command('market-expectations', 'Analyze market expectations vs Fed projections for trading insights', () => {}, (argv) => {
    render(<App command="market-expectations" params={argv} indicators={[]} />);
  })
  .command('cross-asset-analysis', 'Analyze how different asset classes perform during Fed policy analogues', (yargs) => {
    return yargs
      .option('template', {
        describe: 'Economic template to use for finding analogues (default: balanced-economic)',
        type: 'string',
        alias: 'T',
        default: 'balanced-economic'
      })
      .option('months', {
        describe: 'Number of recent months for current scenario',
        type: 'number',
        default: 12,
        alias: 'm'
      })
      .option('top', {
        describe: 'Number of top analogues to analyze',
        type: 'number',
        default: 5,
        alias: 't'
      });
  }, (argv) => {
    render(<App command="cross-asset-analysis" params={argv} indicators={[]} />);
  })
  .demandCommand(1, 'You need to specify a command: `update-data`, `analyze`, `correlate`, `simulate`, `market-expectations`, `cross-asset-analysis`, or `list-templates`.')
  .help()
  .example('$0 analyze -T stagflation-hunt -m 12', 'Use the stagflation template for analysis.')
  .example('$0 analyze -i UNRATE:0.5 -i CPIAUCSL:0.5 -m 12', 'Analyze with 50/50 weighting on unemployment and inflation.')
  .example('$0 correlate -i UNRATE CPIAUCSL GDPC1', 'Calculate the correlation between unemployment, inflation, and GDP growth.')
  .example('$0 simulate -T balanced-economic', 'Launch interactive policy simulator.')
  .example('$0 market-expectations', 'Analyze yield curve and Fed vs market rate expectations.')
  .example('$0 cross-asset-analysis -T balanced-economic -m 12', 'Analyze cross-asset performance during historical analogues.')
  .example('$0 list-templates', 'Show all available economic analysis templates.')
  .argv;