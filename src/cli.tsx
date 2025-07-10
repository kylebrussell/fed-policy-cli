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
import AnalogueReportView from './components/AnalogueReportView'; // New component

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
          setStatus('Initializing database...');
          await initDatabase();
          setStatus('Loading all historical economic data...');
          const allData = await getAllData();
          
          if (allData.length < (params.months as number)) {
            setError(`Not enough data to analyze. Need at least ${params.months} months of data. Run \`update-data\` first.`);
            return;
          }

          // The "target scenario" is the most recent N months of data
          const targetScenario = allData.slice(-(params.months as number));
          setStatus(`Analyzing historical data against the last ${params.months} months...`);

          // Note: ScenarioParams might be deprecated or repurposed for weighting in the future
          const scenarioParams: ScenarioParams = {
            unemployment: { min: 0, max: 100 }, // Not used in DTW analysis
            inflation: { min: 0, max: 100 }, // Not used in DTW analysis
            windowMonths: params.months as number,
            useTariffContext: false, // Not used in DTW analysis
          };

          const results = findAnalogues(allData, targetScenario, scenarioParams, params.top as number);
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

  if (command === 'analyze' && !loading) {
    return (
      <Box flexDirection="column">
        <StatusMessage message={status} type="success" />
        <AnalogueReportView analogues={analogues} />
      </Box>
    );
  }

  return <StatusMessage message={status} type="success" />;
};

yargs(hideBin(process.argv))
  .command('update-data', 'Fetch latest economic data from FRED', (yargs) => {
    return yargs
      .option('api-key', {
        describe: 'FRED API key (or set FRED_API_KEY in .env)',
        type: 'string',
        alias: 'k'
      });
  }, (argv) => {
    render(<App command="update-data" params={argv} />);
  })
  .command('analyze', 'Find historical analogues based on recent economic data', (yargs) => {
    return yargs
      .option('months', {
        describe: 'Number of recent months to use as the target scenario',
        type: 'number',
        default: 12,
        alias: 'm',
      })
      .option('top', {
        describe: 'Number of top analogues to return',
        type: 'number',
        default: 5,
        alias: 't',
      })
      .example('$0 analyze -m 24 -t 10', 'Find the top 10 historical analogues to the last 24 months of data.');
  }, (argv) => {
    render(<App command="analyze" params={argv} />);
  })
  .demandCommand(1, 'You need to specify a command: `update-data` or `analyze`.')
  .help()
  .argv;