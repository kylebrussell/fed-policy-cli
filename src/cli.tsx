// /src/cli.tsx
import 'dotenv/config';
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import yargs, { Arguments } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fetchAllEconomicData } from './services/api';
import { initDatabase, insertData, getAllData } from './services/database';
import { findAnalogues, getLastNMonths, getTargetPeriod } from './services/analysis';
import { ScenarioParams, HistoricalAnalogue, WeightedIndicator, EconomicDataPoint } from './types';
import { FRED_SERIES, ECONOMIC_TEMPLATES } from './constants';
import LoadingSpinner from './components/Spinner';
import StatusMessage from './components/StatusMessage';
import AnalogueReportView from './components/AnalogueReportView';

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

  useEffect(() => {
    const run = async () => {
      if (command === 'update-data') {
        try {
          setLoading(true);
          setStatus('Initializing database...');
          await initDatabase();
          setStatus(`Fetching data for ${Object.keys(FRED_SERIES).length} series from FRED API...`);
          const data = await fetchAllEconomicData(params.apiKey as string);
          setStatus('Inserting data into the database...');
          await insertData(data);
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
          setStatus('Analysis complete.');
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
        finally {
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
        <AnalogueReportView analogues={analogues} indicators={indicators} />
      </Box>
    );
  }

  return <StatusMessage message={status} type="success" />;
};

yargs(hideBin(process.argv))
  .command('update-data', 'Fetch latest economic data from FRED', (yargs) => {
    return yargs.option('api-key', { describe: 'FRED API key', type: 'string', alias: 'k' });
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
  .demandCommand(1, 'You need to specify a command: \`update-data\`, \`analyze\`, or \`list-templates\`.')
  .help()
  .example('$0 analyze -T stagflation-hunt -m 12', 'Use the stagflation template for analysis.')
  .example('$0 analyze -i UNRATE:0.5 -i CPIAUCSL:0.5 -m 12', 'Analyze with 50/50 weighting on unemployment and inflation.')
  .example('$0 list-templates', 'Show all available economic analysis templates.')
  .argv;