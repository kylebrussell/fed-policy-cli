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
import { VolatilitySurfaceService } from './services/volatilitySurface';
import { OptionsPositioningService } from './services/optionsPositioning';
import { FOMCReactionService } from './services/fomcReactions';
import { VolAdjustedTradingService } from './services/volAdjustedTrading';
import { FedCalendarService } from './services/fedCalendar';
import { VIXDataService } from './services/vixData';
import { ScenarioParams, HistoricalAnalogue, WeightedIndicator, EconomicDataPoint, VolAdjustedRecommendation, FOMCEvent, VolatilityProfile, OptionsFlow, FOMCReactionPattern } from './types';
import { FRED_SERIES, ECONOMIC_TEMPLATES } from './constants';
import LoadingSpinner from './components/Spinner';
import StatusMessage from './components/StatusMessage';
import AnalogueReportView from './components/AnalogueReportView';
import CorrelationHeatmap from './components/charts/CorrelationHeatmap';
import PolicySimulatorSimple from './components/PolicySimulatorSimple';
import MarketExpectationsDashboard from './components/MarketExpectationsDashboard';
import MarketExpectationsDashboardV2 from './components/MarketExpectationsDashboardV2';
import CrossAssetDashboard from './components/CrossAssetDashboard';
import CrossAssetDashboardV2 from './components/CrossAssetDashboardV2';
import { FOMCVolatilityDashboard } from './components/FOMCVolatilityDashboard';
import { FOMCVolatilityDashboardRealistic } from './components/FOMCVolatilityDashboardRealistic';
import WelcomeScreen from './components/WelcomeScreen';

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
  const [volRecommendations, setVolRecommendations] = useState<VolAdjustedRecommendation[]>([]);
  const [nextFOMC, setNextFOMC] = useState<FOMCEvent | null>(null);
  const [volatilityProfiles, setVolatilityProfiles] = useState<Map<string, VolatilityProfile>>(new Map());
  const [optionsFlow, setOptionsFlow] = useState<Map<string, OptionsFlow>>(new Map());
  const [reactionPatterns, setReactionPatterns] = useState<Map<string, FOMCReactionPattern[]>>(new Map());

  useEffect(() => {
    const run = async () => {
      if (command === 'welcome' || !command) {
        setLoading(false);
        return;
      } else if (command === 'update-data') {
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
      } else if (command === 'fomc-volatility') {
        try {
          setLoading(true);
          setStatus('Fetching FOMC calendar and volatility data...');
          
          // Initialize real data services
          const fedCalendarService = new FedCalendarService();
          const vixService = new VIXDataService();
          
          // Get real FOMC and VIX data
          setStatus('Getting next FOMC meeting...');
          const nextFOMC = await fedCalendarService.getNextFOMC();
          const daysToFOMC = await fedCalendarService.getDaysToFOMC();
          const fomcTiming = await fedCalendarService.getFOMCTimingContext();
          
          setStatus('Fetching VIX and volatility context...');
          const volContext = await vixService.getVolatilityContext();
          const vixDataStatus = vixService.getDataSourceStatus();
          
          // Update FOMC with real timing data
          nextFOMC.surpriseFactor = 0.0; // Can't estimate without Fed funds futures
          nextFOMC.expectedMove = volContext.currentVIX * 0.1; // Rough estimate: VIX/10 for 1-day move
          
          // Create basic volatility profiles using real VIX data
          const assets = ['SPY', 'TLT'];
          const volProfiles = new Map<string, VolatilityProfile>();
          
          for (const asset of assets) {
            // Use VIX as proxy for SPY vol, estimate TLT vol as ~60% of VIX
            const baseVol = asset === 'SPY' ? volContext.currentVIX : volContext.currentVIX * 0.6;
            const historicalVol = asset === 'SPY' ? volContext.vix30DayAvg : volContext.vix30DayAvg * 0.6;
            
            volProfiles.set(asset, {
              currentLevel: baseVol,
              historicalAverage: historicalVol,
              fomcPremium: Math.max(0, baseVol - historicalVol),
              termStructure: [baseVol * 0.9, baseVol, baseVol * 1.1, baseVol * 1.15], // Rough estimate
              lastUpdated: volContext.lastUpdated
            });
          }
          
          // Create realistic but limited recommendations
          const recommendations: VolAdjustedRecommendation[] = [{
            asset: 'SPY',
            action: 'HOLD',
            confidence: 50, // Lower confidence without real options data
            timeframe: `${Math.abs(daysToFOMC)} days to FOMC`,
            expectedReturn: 0,
            recommendation: {
              entryPrice: 0,
              stopLoss: 0,
              profitTarget: 0,
              timing: 'MONITOR_FOMC'
            },
            sizing: {
              portfolioWeight: 0,
              riskBudget: 0,
              maxPosition: 0
            },
            volatilityContext: {
              currentIV: volContext.currentVIX,
              historicalAverage: volContext.vix30DayAvg,
              fomcPremium: Math.max(0, volContext.currentVIX - volContext.vix30DayAvg),
              decayRate: 0.20,
              nextFOMC: nextFOMC.date,
              daysToFOMC
            },
            volTiming: {
              entryWindow: `Monitor ${Math.abs(daysToFOMC)} days to FOMC`,
              exitWindow: 'Post-FOMC analysis',
              reasoning: `${fomcTiming.phase} phase - ${volContext.regime} vol regime`
            }
          }];
          
          // Note: Strip out options flow and reaction patterns - they need real data
          setVolRecommendations(recommendations);
          setNextFOMC(nextFOMC);
          setVolatilityProfiles(volProfiles);
          setOptionsFlow(new Map()); // Empty - no real options data
          setReactionPatterns(new Map()); // Empty - no real pattern data
          
          if (!vixDataStatus.available) {
            setStatus(`FOMC volatility analysis complete (using ${vixDataStatus.source})`);
          } else {
            setStatus('FOMC volatility analysis complete with real data');
          }
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
    const useV2 = params.v2 !== false; // Default to v2
    return (
      <Box flexDirection="column">
        <StatusMessage message={status} type="success" />
        {useV2 ? (
          <MarketExpectationsDashboardV2 analysis={marketAnalysis} />
        ) : (
          <MarketExpectationsDashboard analysis={marketAnalysis} />
        )}
      </Box>
    );
  }

  if (command === 'cross-asset-analysis' && !loading && crossAssetSummary) {
    const useV2 = params.v2 !== false; // Default to v2
    return (
      <Box flexDirection="column">
        <StatusMessage message={status} type="success" />
        {useV2 ? (
          <CrossAssetDashboardV2 
            analogues={crossAssetAnalogues} 
            summary={crossAssetSummary} 
            tradingSignals={crossAssetSignals} 
          />
        ) : (
          <CrossAssetDashboard 
            analogues={crossAssetAnalogues} 
            summary={crossAssetSummary} 
            tradingSignals={crossAssetSignals} 
          />
        )}
      </Box>
    );
  }

  if (command === 'fomc-volatility' && !loading && nextFOMC && volRecommendations.length > 0) {
    // Check if we have real data to determine which dashboard to use
    const hasRealOptionsData = optionsFlow.size > 0 && reactionPatterns.size > 0;
    
    return (
      <Box flexDirection="column">
        <StatusMessage message={status} type="success" />
        {hasRealOptionsData ? (
          <FOMCVolatilityDashboard 
            recommendations={volRecommendations}
            nextFOMC={nextFOMC}
            volatilityProfiles={volatilityProfiles}
            optionsFlow={optionsFlow}
            reactionPatterns={reactionPatterns}
          />
        ) : (
          <FOMCVolatilityDashboardRealistic 
            recommendations={volRecommendations}
            nextFOMC={nextFOMC}
            volatilityProfiles={volatilityProfiles}
            dataSourceStatus={{ 
              vixAvailable: status.includes('real data'),
              optionsAvailable: false 
            }}
          />
        )}
      </Box>
    );
  }

  if (command === 'welcome' || !command) {
    return <WelcomeScreen />;
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
  .command('fomc-volatility', 'Professional volatility analysis with options strategies and timing', (yargs) => {
    return yargs
      .option('asset', {
        describe: 'Asset to analyze (SPY, TLT, QQQ, etc.)',
        type: 'string',
        default: 'SPY',
        alias: 'a'
      })
      .option('days-to-fomc', {
        describe: 'Days until next FOMC meeting',
        type: 'number',
        default: 14,
        alias: 'd'
      });
  }, (argv) => {
    render(<App command="fomc-volatility" params={argv} indicators={[]} />);
  })
  .command('vol-surface', 'Analyze volatility surfaces around FOMC events with pattern recognition', (yargs) => {
    return yargs
      .option('asset', {
        describe: 'Asset to analyze volatility surface for',
        type: 'string',
        default: 'SPY',
        alias: 'a'
      })
      .option('days-to-fomc', {
        describe: 'Days until next FOMC meeting',
        type: 'number',
        default: 14,
        alias: 'd'
      });
  }, (argv) => {
    render(<App command="fomc-volatility" params={argv} indicators={[]} />);
  })
  .command('options-flow', 'Track dealer positioning, skew, and unusual options activity', (yargs) => {
    return yargs
      .option('unusual-activity', {
        describe: 'Filter for unusual options activity only',
        type: 'boolean',
        default: false,
        alias: 'u'
      })
      .option('asset', {
        describe: 'Asset to analyze options flow for',
        type: 'string',
        default: 'SPY',
        alias: 'a'
      });
  }, (argv) => {
    render(<App command="fomc-volatility" params={argv} indicators={[]} />);
  })
  .command('vol-strategies', 'Generate automated straddle/strangle recommendations with optimal timing', (yargs) => {
    return yargs
      .option('strategy-type', {
        describe: 'Type of volatility strategy to focus on',
        type: 'string',
        choices: ['straddle', 'strangle', 'calendar', 'hedge', 'all'],
        default: 'all',
        alias: 's'
      })
      .option('asset', {
        describe: 'Asset for volatility strategies',
        type: 'string',
        default: 'SPY',
        alias: 'a'
      });
  }, (argv) => {
    render(<App command="fomc-volatility" params={argv} indicators={[]} />);
  })
  .demandCommand(0, 'Available commands: `update-data`, `analyze`, `correlate`, `simulate`, `market-expectations`, `cross-asset-analysis`, `fomc-volatility`, `vol-surface`, `options-flow`, `vol-strategies`, or `list-templates`.')
  .help()
  .example('$0 analyze -T stagflation-hunt -m 12', 'Use the stagflation template for analysis.')
  .example('$0 analyze -i UNRATE:0.5 -i CPIAUCSL:0.5 -m 12', 'Analyze with 50/50 weighting on unemployment and inflation.')
  .example('$0 correlate -i UNRATE CPIAUCSL GDPC1', 'Calculate the correlation between unemployment, inflation, and GDP growth.')
  .example('$0 simulate -T balanced-economic', 'Launch interactive policy simulator.')
  .example('$0 market-expectations', 'Analyze yield curve and Fed vs market rate expectations.')
  .example('$0 cross-asset-analysis -T balanced-economic -m 12', 'Analyze cross-asset performance during historical analogues.')
  .example('$0 fomc-volatility', 'FOMC volatility analysis with options strategies.')
  .example('$0 vol-surface --asset SPY --days-to-fomc 5', 'Analyze SPY volatility surface 5 days before FOMC.')
  .example('$0 options-flow --unusual-activity', 'Track unusual options activity.')
  .example('$0 vol-strategies --strategy-type straddle --asset TLT', 'Generate TLT straddle recommendations.')
  .example('$0 list-templates', 'Show all available economic analysis templates.')
  .argv;

// If no command was specified, show welcome screen
if (process.argv.length <= 2) {
  render(<App command="welcome" params={{}} indicators={[]} />);
}