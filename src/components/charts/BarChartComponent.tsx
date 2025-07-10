// /src/components/charts/BarChartComponent.tsx
import React from 'react';
import { Text, Box } from 'ink';
import Chartscii from 'chartscii';
import { HistoricalAnalogue } from '../../types';
import { getEconomicEra } from '../../services/analysis';

interface BarChartProps {
  analogues: HistoricalAnalogue[];
  title?: string;
  orientation?: 'horizontal' | 'vertical';
  height?: number;
  width?: number;
  showLabels?: boolean;
  showValues?: boolean;
  colorTheme?: 'default' | 'gradient' | 'era-based';
}

// Era-based color mapping
const ERA_COLORS = {
  'Modern Era': 'blue',
  'Great Recession Recovery': 'cyan',
  'Financial Crisis': 'red',
  'Dot-Com Era': 'magenta',
  'Greenspan Era': 'yellow',
  'Volcker Anti-Inflation': 'green',
  'Stagflation Era': 'red',
  'Post-War Golden Age': 'green',
  'Early Historical': 'gray'
} as const;

const BarChartComponent: React.FC<BarChartProps> = ({
  analogues,
  title = 'Historical Analogues Similarity Scores',
  orientation = 'vertical',
  height = 8,
  width = 50,
  showLabels = true,
  showValues = true,
  colorTheme = 'default'
}) => {
  if (!analogues || analogues.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{title}</Text>
        <Text color="gray">No analogues data available</Text>
      </Box>
    );
  }

  // Prepare data for chartscii
  const chartData = analogues.map((analogue, index) => {
    const era = getEconomicEra(analogue.startDate);
    const label = `${analogue.startDate.substring(0, 7)} (${era.name.split(' ')[0]})`;
    
    let color: string | undefined;
    if (colorTheme === 'era-based') {
      color = ERA_COLORS[era.name as keyof typeof ERA_COLORS] || 'white';
    } else if (colorTheme === 'gradient') {
      // Color gradient from green (best) to red (worst)
      const position = index / Math.max(analogues.length - 1, 1);
      color = position < 0.33 ? 'green' : position < 0.66 ? 'yellow' : 'red';
    }

    return {
      label: showLabels ? label : `#${index + 1}`,
      value: analogue.similarityScore,
      color
    };
  });

  // Configure chart options
  const chartOptions = {
    orientation,
    width,
    height,
    colorLabels: colorTheme !== 'default',
    valueLabels: showValues,
    barSize: orientation === 'horizontal' ? 1 : 2,
    padding: 1,
    theme: 'default' as const
  };

  // Generate the chart
  let chartOutput: string;
  try {
    const chart = new Chartscii(chartData, chartOptions);
    chartOutput = chart.create();
    
    // Ensure output is properly formatted for Ink
    if (!chartOutput || typeof chartOutput !== 'string') {
      throw new Error('Chart output is invalid');
    }
    
    // Remove any empty string artifacts that might cause Ink issues
    chartOutput = chartOutput.trim();
    
  } catch (error) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{title}</Text>
        <Text color="red">Error generating chart: {error instanceof Error ? error.message : 'Unknown error'}</Text>
        <Text color="gray">Data: {JSON.stringify(chartData.slice(0, 2))}...</Text>
      </Box>
    );
  }

  // Calculate statistics
  const scores = analogues.map(a => a.similarityScore);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">{title}</Text>
      <Text color="gray" italic>  (Lower scores = more similar to target scenario)</Text>
      
      {/* Chart */}
      <Box paddingLeft={1} marginTop={1}>
        <Text>{chartOutput}</Text>
      </Box>
      
      {/* Statistics */}
      <Box flexDirection="column" paddingLeft={1} marginTop={1}>
        <Text bold color="gray">Score Statistics:</Text>
        <Box>
          <Text color="green">Best: {minScore.toFixed(4)}</Text>
          <Text color="gray"> | </Text>
          <Text color="red">Worst: {maxScore.toFixed(4)}</Text>
          <Text color="gray"> | </Text>
          <Text color="cyan">Average: {avgScore.toFixed(4)}</Text>
        </Box>
      </Box>

      {/* Era breakdown if using era-based coloring */}
      {colorTheme === 'era-based' && (
        <Box flexDirection="column" paddingLeft={1} marginTop={1}>
          <Text bold color="gray">Economic Eras:</Text>
          {analogues.map((analogue, index) => {
            const era = getEconomicEra(analogue.startDate);
            const eraColor = ERA_COLORS[era.name as keyof typeof ERA_COLORS] || 'white';
            return (
              <Box key={index}>
                <Text color={eraColor}>■ </Text>
                <Text color="gray">{analogue.startDate.substring(0, 7)}: {era.name}</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default BarChartComponent;