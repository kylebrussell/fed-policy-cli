import React from 'react';
import { Box, Text } from 'ink';
import { HistoricalAnalogue } from '../types';

interface DataTableViewProps {
  data: HistoricalAnalogue[];
  title?: string;
}

const DataTableView: React.FC<DataTableViewProps> = ({ data, title = 'Historical Analogues' }) => {
  if (data.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold>{title}</Text>
        <Text color="yellow">No analogues found matching the specified criteria.</Text>
      </Box>
    );
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'HIKE':
        return 'red';
      case 'CUT':
        return 'green';
      case 'HOLD':
        return 'yellow';
      default:
        return 'white';
    }
  };

  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      <Text></Text>
      
      {/* Header */}
      <Box>
        <Text bold color="cyan">{'Start Date'.padEnd(12)}</Text>
        <Text bold color="cyan">{'End Date'.padEnd(12)}</Text>
        <Text bold color="cyan">{'Unemployment'.padEnd(12)}</Text>
        <Text bold color="cyan">{'Inflation'.padEnd(10)}</Text>
        <Text bold color="cyan">{'Start Rate'.padEnd(11)}</Text>
        <Text bold color="cyan">{'End Rate'.padEnd(9)}</Text>
        <Text bold color="cyan">{'Outcome'.padEnd(8)}</Text>
      </Box>
      
      {/* Separator */}
      <Text color="gray">{'-'.repeat(80)}</Text>
      
      {/* Data rows */}
      {data.map((analogue, index) => (
        <Box key={index}>
          <Text>{analogue.startDate.padEnd(12)}</Text>
          <Text>{analogue.endDate.padEnd(12)}</Text>
          <Text>{`${(analogue.avgUnemployment || 0).toFixed(1)}%`.padEnd(12)}</Text>
          <Text>{`${(analogue.avgInflation || 0).toFixed(1)}%`.padEnd(10)}</Text>
          <Text>{`${(analogue.startRate || 0).toFixed(2)}%`.padEnd(11)}</Text>
          <Text>{`${(analogue.endRate || 0).toFixed(2)}%`.padEnd(9)}</Text>
          <Text color={getOutcomeColor(analogue.outcome)}>
            {analogue.outcome.padEnd(8)}
          </Text>
        </Box>
      ))}
      
      <Text></Text>
      <Text color="gray">Found {data.length} historical analogue{data.length !== 1 ? 's' : ''}</Text>
    </Box>
  );
};

export default DataTableView;