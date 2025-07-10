
import React from 'react';
import { Text, Box } from 'ink';
import { EconomicDataPoint } from '../../types';

interface SimpleLineChartProps {
  data: EconomicDataPoint[];
  indicatorId: string;
  title: string;
  color?: string;
  width?: number;
}

const SPARKLINE_CHARS = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  indicatorId,
  title,
  color = 'cyan',
  width = 50,
}) => {
  if (!data || data.length === 0) {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={color}>{title}</Text>
        <Text color="gray">No data available</Text>
      </Box>
    );
  }

  const values = data
    .map(point => point[indicatorId] as number)
    .filter(val => typeof val === 'number' && isFinite(val));

  if (values.length === 0) {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={color}>{title}</Text>
        <Text color="gray">No valid data for {indicatorId}</Text>
      </Box>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Data sampling
  const step = Math.max(1, Math.floor(values.length / width));
  const sampledValues = values.filter((_, i) => i % step === 0).slice(0, width);

  const sparkline = sampledValues
    .map(value => {
      if (range === 0) return SPARKLINE_CHARS[4]; // Middle block for flat line
      const normalized = (value - min) / range;
      const charIndex = Math.floor(normalized * (SPARKLINE_CHARS.length - 1));
      return SPARKLINE_CHARS[charIndex];
    })
    .join('');

  const latest = values[values.length - 1];
  const change = values.length > 1 ? latest - values[0] : 0;
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={color}>{title}</Text>
      <Box>
        <Text color={color}>{sparkline}</Text>
        <Box flexDirection="column" marginLeft={2}>
          <Text>
            <Text color="gray">Latest: </Text>
            <Text bold>{latest.toFixed(2)}</Text>
          </Text>
          <Text>
            <Text color="gray">Avg: </Text>
            <Text>{avg.toFixed(2)}</Text>
          </Text>
          <Text>
            <Text color="gray">Change: </Text>
            <Text color={change >= 0 ? 'green' : 'red'}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}
            </Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default SimpleLineChart;
