// /src/components/AnalogueReportView.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { HistoricalAnalogue } from '../types';
import { renderAsciiChart } from '../utils/chart';

interface Props {
  analogues: HistoricalAnalogue[];
}

const AnalogueReportView: React.FC<Props> = ({ analogues }) => {
  if (!analogues || analogues.length === 0) {
    return <Text color="yellow">No historical analogues found for the given scenario.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Top {analogues.length} Historical Analogues Found:</Text>
      {analogues.map((analogue, index) => (
        <Box
          key={index}
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          padding={1}
          marginY={1}
        >
          <Text bold>
            Analogue #{index + 1}: {analogue.startDate} to {analogue.endDate}
          </Text>
          <Text color="gray">Similarity Score: {analogue.similarityScore.toFixed(4)} (lower is more similar)</Text>

          <Box flexDirection="column" marginTop={1}>
            <Text bold>Inflation (CPI YoY %):</Text>
            <Box paddingLeft={2}>
                <Text>{renderAsciiChart(analogue.data.map(d => ({value: d.cpi_yoy, label: d.date})), 5)}</Text>
            </Box>
          </Box>

          <Box flexDirection="column" marginTop={1}>
            <Text bold>Unemployment Rate:</Text>
            <Box paddingLeft={2}>
                <Text>{renderAsciiChart(analogue.data.map(d => ({value: d.unemployment_rate, label: d.date})), 5)}</Text>
            </Box>
          </Box>

          <Box flexDirection="column" marginTop={1}>
            <Text bold>Fed Policy Action Timeline:</Text>
            {analogue.fedPolicyActions.map((action, actionIndex) => {
                let color = 'yellow';
                let symbol = '—';
                if (action.action === 'HIKE') {
                    color = 'red';
                    symbol = '▲';
                } else if (action.action === 'CUT') {
                    color = 'green';
                    symbol = '▼';
                }
                const change = action.changeBps !== 0 ? `(${action.changeBps > 0 ? '+' : ''}${action.changeBps} bps)` : '';

                return (
                    <Text key={actionIndex} color={color}>
                        {'  '}{action.date}: {symbol} {action.action} {change}
                    </Text>
                );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default AnalogueReportView;
