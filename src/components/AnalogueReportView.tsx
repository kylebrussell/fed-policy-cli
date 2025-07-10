// /src/components/AnalogueReportView.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { HistoricalAnalogue, WeightedIndicator } from '../types';
import { renderAsciiChart } from '../utils/chart';
import { FRED_SERIES } from '../constants';
import { getEconomicEra } from '../services/analysis';

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
          <Text color="cyan" italic>
            Economic Era: {getEconomicEra(analogue.startDate).name} ({getEconomicEra(analogue.startDate).timeframe})
          </Text>
          
          {analogue.dataQuality && analogue.dataQuality.warnings.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="yellow" bold>Data Quality:</Text>
              <Text color="yellow">
                Reliability: {analogue.dataQuality.reliability.toUpperCase()}
              </Text>
              {analogue.dataQuality.warnings.map((warning, idx) => (
                <Text key={idx} color="yellow" italic>
                  ⚠ {warning}
                </Text>
              ))}
            </Box>
          )}

          {indicators.map(indicator => (
            <Box flexDirection="column" marginTop={1} key={indicator.id}>
              <Text bold>{FRED_SERIES[indicator.id]?.name || indicator.id}:</Text>
              <Box paddingLeft={2}>
                <Text>
                  {renderAsciiChart(
                    // Sample data monthly (1st of each month) to show meaningful variation
                    analogue.data
                      .filter((d, index) => index === 0 || new Date(d.date).getDate() === 1)
                      .map(d => ({ 
                        value: d[indicator.id] as number, 
                        label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                      })),
                    5
                  )}
                </Text>
              </Box>
            </Box>
          ))}

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