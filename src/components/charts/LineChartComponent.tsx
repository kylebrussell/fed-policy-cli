// /src/components/charts/LineChartComponent.tsx
import React from 'react';
import { Text, Box } from 'ink';
import asciichart from 'asciichart';
import { EconomicDataPoint } from '../../types';

interface LineChartProps {
  data: EconomicDataPoint[];
  indicatorId: string;
  title: string;
  color?: 'blue' | 'green' | 'red' | 'magenta' | 'cyan' | 'yellow';
  height?: number;
  width?: number;
  showValues?: boolean;
}

const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  indicatorId,
  title,
  color = 'blue',
  height = 8,
  width,
  showValues = true
}) => {
  if (!data || data.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{title}</Text>
        <Text color="gray">No data available</Text>
      </Box>
    );
  }

  // Extract values for the specified indicator
  const values = data
    .map(point => point[indicatorId] as number)
    .filter(val => typeof val === 'number' && isFinite(val));

  if (values.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{title}</Text>
        <Text color="gray">No valid data for {indicatorId}</Text>
      </Box>
    );
  }

  // Configure chart options
  const chartConfig = {
    offset: 2,
    height,
    format: (x: number) => (x.toFixed(2) + '    ').slice(0, 6), // Fixed width formatting
    colors: color === 'blue' ? [asciichart.blue] :
            color === 'green' ? [asciichart.green] :
            color === 'red' ? [asciichart.red] :
            color === 'magenta' ? [asciichart.magenta] :
            color === 'cyan' ? [asciichart.cyan] :
            color === 'yellow' ? [asciichart.yellow] :
            [asciichart.default]
  };

  // Generate the ASCII chart
  let chartOutput: string;
  try {
    chartOutput = asciichart.plot(values, chartConfig);
    
    // Ensure output is properly formatted for Ink - split into lines
    if (!chartOutput || typeof chartOutput !== 'string') {
      throw new Error('Chart output is invalid');
    }
    
  } catch (error) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{title}</Text>
        <Text color="red">Error generating chart: {error instanceof Error ? error.message : 'Unknown error'}</Text>
      </Box>
    );
  }

  // Calculate statistics
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const latest = values[values.length - 1];
  const change = values.length > 1 ? latest - values[0] : 0;

  return (
    <Box flexDirection="column">
      <Text bold color={color}>{title}</Text>
      
      {/* Chart */}
      <Box paddingLeft={1} flexDirection="column">
        {chartOutput.split('\n').map((line, index) => (
          <Text key={index}>{line}</Text>
        ))}
      </Box>
      
      {/* Statistics */}
      {showValues && (
        <Box flexDirection="column" paddingLeft={1} marginTop={1}>
          <Box>
            <Text color="gray">Latest: </Text>
            <Text color={color} bold>{latest.toFixed(2)}</Text>
            <Text color="gray"> | Min: {min.toFixed(2)} | Max: {max.toFixed(2)} | Avg: {avg.toFixed(2)}</Text>
          </Box>
          <Box>
            <Text color="gray">Change: </Text>
            <Text color={change >= 0 ? 'green' : 'red'}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}
            </Text>
            <Text color="gray"> ({values.length} data points)</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default LineChartComponent;