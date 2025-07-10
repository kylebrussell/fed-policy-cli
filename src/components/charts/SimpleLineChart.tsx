// /src/components/charts/SimpleLineChart.tsx
import React from 'react';
import { Text, Box } from 'ink';
import { EconomicDataPoint } from '../../types';

interface SimpleLineChartProps {
  data: EconomicDataPoint[];
  indicatorId: string;
  title: string;
  color?: 'blue' | 'green' | 'red' | 'magenta' | 'cyan' | 'yellow';
  height?: number;
  width?: number;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  indicatorId,
  title,
  color = 'blue',
  height = 4,
  width = 40
}) => {
  if (!data || data.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color={color}>{title}</Text>
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
        <Text bold color={color}>{title}</Text>
        <Text color="gray">No valid data for {indicatorId}</Text>
      </Box>
    );
  }

  // Create a simple line chart using ASCII characters
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  // Sample data to fit chart width
  const sampleStep = Math.max(1, Math.floor(values.length / width));
  const sampledValues = values.filter((_, index) => index % sampleStep === 0).slice(0, width);
  
  // Create chart lines
  const chartLines: string[] = [];
  
  for (let row = 0; row < height; row++) {
    let line = '';
    const threshold = min + (range * (height - row - 1)) / (height - 1);
    
    for (let col = 0; col < sampledValues.length; col++) {
      const value = sampledValues[col];
      if (range === 0) {
        line += '─';
      } else if (Math.abs(value - threshold) < range / (height * 2)) {
        line += '●';
      } else if (value >= threshold) {
        line += '│';
      } else {
        line += ' ';
      }
    }
    chartLines.push(line);
  }

  // Calculate statistics
  const latest = values[values.length - 1];
  const change = values.length > 1 ? latest - values[0] : 0;
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

  return (
    <Box flexDirection="column">
      <Text bold color={color}>{title}</Text>
      
      {/* Chart */}
      <Box flexDirection="column" paddingLeft={1}>
        <Text color="gray">{max.toFixed(2)} ┤</Text>
        {chartLines.map((line, index) => (
          <Text key={index} color={color}>
            {index === Math.floor(height / 2) ? `${avg.toFixed(2)} ┤` : '        '}
            {line}
          </Text>
        ))}
        <Text color="gray">{min.toFixed(2)} ┤</Text>
      </Box>
      
      {/* Statistics */}
      <Box paddingLeft={1} marginTop={1}>
        <Text color="gray">Latest: </Text>
        <Text color={color} bold>{latest.toFixed(2)}</Text>
        <Text color="gray"> | Change: </Text>
        <Text color={change >= 0 ? 'green' : 'red'}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}
        </Text>
        <Text color="gray"> | Points: {values.length}</Text>
      </Box>
    </Box>
  );
};

export default SimpleLineChart;