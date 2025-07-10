// /src/cli.tsx
import 'dotenv/config';
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import yargs, { Arguments } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fetchAllEconomicData } from './services/api';
import { initDatabase, insertData, getAllData } from './services/database';
import { findAnalogues } from './services/analysis';
import { ScenarioParams, HistoricalAnalogue } from './types';
import LoadingSpinner from './components/Spinner';
import StatusMessage from './components/StatusMessage';
import DataTableView from './components/DataTableView';

interface AppProps {
  command: string;
  params: Arguments;
}

const App = ({ command, params }: AppProps) => {
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
          setStatus('Fetching economic data from FRED API...');
          const data = await fetchAllEconomicData(params.apiKey as string);
          setStatus('Inserting data into the database...');
          await insertData(data);
          setStatus('Data update complete.');
        } catch (error) {
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError('An unknown error occurred');
          }
        } finally {
          setLoading(false);
        }
      } else if (command === 'analyze') {
        try {
          setLoading(true);
          setStatus('Loading economic data...');
          const data = await getAllData();
          
          if (data.length === 0) {
            setError('No economic data found. Please run "fed-analyzer update-data" first.');
            return;
          }

          setStatus('Analyzing historical analogues...');
          const scenarioParams: ScenarioParams = {
            unemployment: { 
              min: params.unemploymentMin as number, 
              max: params.unemploymentMax as number 
            },
            inflation: { 
              min: params.inflationMin as number, 
              max: params.inflationMax as number 
            },
            windowMonths: params.windowMonths as number || 12,
            useTariffContext: params.tariffContext as boolean || false,
          };

          const results = findAnalogues(data, scenarioParams);
          setAnalogues(results);
          setStatus('Analysis complete.');
        } catch (error) {
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError('An unknown error occurred');
          }
        } finally {
          setLoading(false);
        }
      }
    };

    run();
  }, [command, params]);

  if (loading) {
    return <LoadingSpinner message={status} />;
  }

  if (error) {
    return <StatusMessage message={error} type="error" />;
  }

  if (command === 'analyze') {
    return (
      <Box flexDirection="column">
        <StatusMessage message={status} type="success" />
        <Text></Text>
        <DataTableView data={analogues} />
      </Box>
    );
  }

  return <StatusMessage message={status} type="success" />;
};

yargs(hideBin(process.argv))
  .command('update-data', 'Fetch latest economic data', (yargs) => {
    return yargs
      .option('api-key', {
        describe: 'FRED API key (alternatively set FRED_API_KEY environment variable)',
        type: 'string',
        alias: 'k'
      });
  }, (argv) => {
    render(<App command="update-data" params={argv} />);
  })
  .command('analyze', 'Analyze historical analogues for a scenario', (yargs) => {
    return yargs
      .option('unemployment-min', {
        describe: 'Minimum unemployment rate (%)',
        type: 'number',
        demandOption: true,
        alias: 'umin'
      })
      .option('unemployment-max', {
        describe: 'Maximum unemployment rate (%)',
        type: 'number',
        demandOption: true,
        alias: 'umax'
      })
      .option('inflation-min', {
        describe: 'Minimum inflation rate (%)',
        type: 'number',
        demandOption: true,
        alias: 'imin'
      })
      .option('inflation-max', {
        describe: 'Maximum inflation rate (%)',
        type: 'number',
        demandOption: true,
        alias: 'imax'
      })
      .option('window-months', {
        describe: 'Analysis window in months',
        type: 'number',
        default: 12,
        alias: 'w'
      })
      .option('tariff-context', {
        describe: 'Only include periods with tariff context',
        type: 'boolean',
        default: false,
        alias: 't'
      })
      .option('api-key', {
        describe: 'FRED API key (alternatively set FRED_API_KEY environment variable)',
        type: 'string',
        alias: 'k'
      })
      .example('$0 analyze --umin 3 --umax 5 --imin 2 --imax 4', 'Find analogues with 3-5% unemployment and 2-4% inflation')
      .example('$0 analyze --umin 6 --umax 8 --imin 1 --imax 3 --window-months 6 --tariff-context', 'Find 6-month analogues with tariff context');
  }, (argv) => {
    render(<App command="analyze" params={argv} />);
  })
  .demandCommand(1)
  .help()
  .argv;