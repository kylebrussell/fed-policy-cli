
import React from 'react';
import { Box, Text } from 'ink';
import { HistoricalAnalogue, WeightedIndicator } from '../types';
import { FRED_SERIES } from '../constants';
import { getEconomicEra } from '../services/analysis';
import SimpleLineChart from './charts/SimpleLineChart';
import PolicyResponseAnalyzer from './PolicyResponseAnalyzer';

interface Props {
  analogues: HistoricalAnalogue[];
  indicators: WeightedIndicator[];
}

const AnalogueReportView: React.FC<Props> = ({ analogues, indicators }) => {
  if (!analogues || analogues.length === 0) {
    return <Text color="yellow">No historical analogues found for the given scenario.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">📊 Top {analogues.length} Historical Analogues</Text>
      {analogues.map((analogue, index) => (
        <Box
          key={index}
          flexDirection="column"
          borderStyle="round"
          borderColor={index === 0 ? 'green' : 'gray'}
          paddingX={2}
          paddingY={1}
          marginY={1}
        >
          <Box justifyContent="space-between">
            <Text bold color={index === 0 ? 'green' : 'white'}>
              #{index + 1}: {analogue.startDate} to {analogue.endDate}
            </Text>
            <Text>
              <Text bold>Score: </Text>
              <Text color="yellow">{analogue.similarityScore.toFixed(4)}</Text>
            </Text>
          </Box>
          <Text color="cyan" italic>
            {getEconomicEra(analogue.startDate).name} ({getEconomicEra(analogue.startDate).timeframe})
          </Text>

          <Box flexDirection="column" marginTop={1}>
            {indicators.map(indicator => (
              <SimpleLineChart
                key={indicator.id}
                data={analogue.data}
                indicatorId={indicator.id}
                title={`${FRED_SERIES[indicator.id]?.name || indicator.id} (w: ${indicator.weight})`}
                color={FRED_SERIES[indicator.id]?.color || 'cyan'}
              />
            ))}
          </Box>

          <Box flexDirection="column" marginTop={1} borderTopStyle="round" borderTopColor="gray">
            <Text bold>Fed Policy Timeline</Text>
            <Box flexWrap="wrap">
              {analogue.fedPolicyActions.map((action, i) => (
                <Text key={i} marginRight={2}>
                  <Text color={action.action === 'HIKE' ? 'red' : 'green'}>
                    {action.action === 'HIKE' ? '▲' : '▼'}
                  </Text>
                  <Text> {action.date.substring(0, 7)} ({action.changeBps}bps)</Text>
                </Text>
              ))}
            </Box>
          </Box>

          {/* Add Policy Response Analysis - show projections for best match */}
          <PolicyResponseAnalyzer analogue={analogue} showProjections={index === 0} />
        </Box>
      ))}
    </Box>
  );
};

export default AnalogueReportView;
