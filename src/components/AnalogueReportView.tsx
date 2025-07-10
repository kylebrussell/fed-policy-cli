// /src/components/AnalogueReportView.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { HistoricalAnalogue, WeightedIndicator } from '../types';
import { FRED_SERIES } from '../constants';
import { getEconomicEra } from '../services/analysis';
import SimpleLineChart from './charts/SimpleLineChart';

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
      {/* Similarity Scores Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">📊 Top {analogues.length} Historical Analogues - Similarity Scores</Text>
        {analogues.slice(0, 3).map((analogue, index) => {
          const era = getEconomicEra(analogue.startDate);
          // Simple visual bar representation
          const score = analogue.similarityScore;
          const barLength = Math.max(5, Math.min(30, Math.round(20 / score)));
          const bar = '▓'.repeat(barLength);
          const color = index === 0 ? 'green' : index === 1 ? 'yellow' : 'red';
          
          return (
            <Text key={index}>
              <Text color="gray">{analogue.startDate.substring(0, 7)}: </Text>
              <Text color={color}>{bar}</Text>
              <Text color="gray"> {score.toFixed(4)} ({era.name.split(' ')[0]})</Text>
            </Text>
          );
        })}
      </Box>
      
      <Text bold color="cyan">📈 Detailed Historical Analogues:</Text>
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

          {indicators.map(indicator => {
            // Color mapping for different indicators
            const indicatorColors = {
              'UNRATE': 'blue',      // Unemployment - Blue
              'CPIAUCSL': 'red',     // Inflation - Red  
              'DFF': 'green',        // Fed Funds Rate - Green
              'PCEPI': 'magenta',    // PCE Inflation - Magenta
              'GDPC1': 'cyan',       // GDP - Cyan
              'T10Y2Y': 'yellow',    // Yield Spread - Yellow
              'ICSA': 'blue'         // Initial Claims - Blue
            } as const;
            
            const indicatorColor = indicatorColors[indicator.id as keyof typeof indicatorColors] || 'blue';
            
            return (
              <Box flexDirection="column" marginTop={1} key={indicator.id}>
                <SimpleLineChart
                  data={analogue.data}
                  indicatorId={indicator.id}
                  title={`${FRED_SERIES[indicator.id]?.name || indicator.id} (Weight: ${indicator.weight})`}
                  color={indicatorColor}
                  height={4}
                  width={35}
                />
              </Box>
            );
          })}

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