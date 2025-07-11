
import React from 'react';
import { Box, Text } from 'ink';
import { HistoricalAnalogue, WeightedIndicator, EconomicDataPoint } from '../types';
import { FRED_SERIES } from '../constants';
import { getEconomicEra } from '../services/analysis';
import SimpleLineChart from './charts/SimpleLineChart';
import PolicyResponseAnalyzer from './PolicyResponseAnalyzer';
import PolicyTimeline from './PolicyTimeline';
import FedReactionDashboard from './FedReactionDashboard';

interface Props {
  analogues: HistoricalAnalogue[];
  indicators: WeightedIndicator[];
  currentData?: EconomicDataPoint[];
}

const AnalogueReportView: React.FC<Props> = ({ analogues, indicators, currentData }) => {
  if (!analogues || analogues.length === 0) {
    return <Text color="yellow">No historical analogues found for the given scenario.</Text>;
  }

  return (
    <Box flexDirection="column">
      {/* Show Fed Reaction Dashboard if we have current data */}
      {currentData && currentData.length > 0 && (
        <FedReactionDashboard currentData={currentData} />
      )}
      
      <Text bold color="cyan" marginTop={1}>📊 Top {analogues.length} Historical Analogues</Text>
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

          {/* Enhanced Policy Timeline - show extended view for best match */}
          <PolicyTimeline analogue={analogue} showExtended={index === 0} />

          {/* Add Policy Response Analysis - show projections for best match */}
          <PolicyResponseAnalyzer analogue={analogue} showProjections={index === 0} />
        </Box>
      ))}
    </Box>
  );
};

export default AnalogueReportView;
