// /src/components/charts/MultiSeriesChart.tsx
import React from 'react';
import { Text, Box } from 'ink';
import asciichart from 'asciichart';
import { EconomicDataPoint, WeightedIndicator } from '../../types';
import { FRED_SERIES } from '../../constants';

interface MultiSeriesChartProps {
  data: EconomicDataPoint[];
  indicators: WeightedIndicator[];
  title?: string;
  height?: number;
  showLegend?: boolean;
  showStats?: boolean;
  normalizeValues?: boolean;
}

// Color mapping for different indicators
const INDICATOR_COLORS = {
  'UNRATE': asciichart.blue,      // Unemployment - Blue
  'CPIAUCSL': asciichart.red,     // Inflation - Red  
  'DFF': asciichart.green,        // Fed Funds Rate - Green
  'PCEPI': asciichart.magenta,    // PCE Inflation - Magenta
  'GDPC1': asciichart.cyan,       // GDP - Cyan
  'T10Y2Y': asciichart.yellow,    // Yield Spread - Yellow
  'ICSA': asciichart.default      // Initial Claims - Default
} as const;

const INDICATOR_COLOR_NAMES = {
  'UNRATE': 'blue',
  'CPIAUCSL': 'red',
  'DFF': 'green',
  'PCEPI': 'magenta',
  'GDPC1': 'cyan',
  'T10Y2Y': 'yellow',
  'ICSA': 'white'
} as const;

const MultiSeriesChart: React.FC<MultiSeriesChartProps> = ({
  data,
  indicators,
  title = 'Economic Indicators',
  height = 10,
  showLegend = true,
  showStats = true,
  normalizeValues = false
}) => {
  if (!data || data.length === 0 || !indicators || indicators.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{title}</Text>
        <Text color="gray">No data or indicators available</Text>
      </Box>
    );
  }

  // Extract and prepare series data
  const seriesData: number[][] = [];
  const validIndicators: WeightedIndicator[] = [];
  const seriesStats: Array<{
    min: number;
    max: number;
    avg: number;
    latest: number;
    change: number;
  }> = [];

  for (const indicator of indicators) {
    const values = data
      .map(point => point[indicator.id] as number)
      .filter(val => typeof val === 'number' && isFinite(val));

    if (values.length > 0) {
      let processedValues = values;
      
      // Normalize values if requested (0-1 scale)
      if (normalizeValues) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        if (range > 0) {
          processedValues = values.map(val => (val - min) / range);
        }
      }

      seriesData.push(processedValues);
      validIndicators.push(indicator);
      
      // Calculate statistics (always use original values for stats)
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const latest = values[values.length - 1];
      const change = values.length > 1 ? latest - values[0] : 0;
      
      seriesStats.push({ min, max, avg, latest, change });
    }
  }

  if (seriesData.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{title}</Text>
        <Text color="gray">No valid data for any indicators</Text>
      </Box>
    );
  }

  // Configure chart colors based on indicators
  const colors = validIndicators.map(indicator => 
    INDICATOR_COLORS[indicator.id as keyof typeof INDICATOR_COLORS] || asciichart.default
  );

  // Configure chart options
  const chartConfig = {
    offset: 3,
    height,
    format: (x: number) => normalizeValues ? 
      (x.toFixed(3) + '      ').slice(0, 6) : 
      (x.toFixed(2) + '      ').slice(0, 6),
    colors
  };

  // Generate the ASCII chart
  let chartOutput: string;
  try {
    chartOutput = asciichart.plot(seriesData, chartConfig);
  } catch (error) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{title}</Text>
        <Text color="red">Error generating chart: {error instanceof Error ? error.message : 'Unknown error'}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">{title}</Text>
      {normalizeValues && (
        <Text color="gray" italic>  (Values normalized 0-1 for comparison)</Text>
      )}
      
      {/* Chart */}
      <Box paddingLeft={1}>
        <Text>{chartOutput}</Text>
      </Box>
      
      {/* Legend */}
      {showLegend && (
        <Box flexDirection="column" paddingLeft={1} marginTop={1}>
          <Text bold color="gray">Legend:</Text>
          {validIndicators.map((indicator, index) => {
            const colorName = INDICATOR_COLOR_NAMES[indicator.id as keyof typeof INDICATOR_COLOR_NAMES] || 'white';
            const seriesName = FRED_SERIES[indicator.id]?.name || indicator.id;
            return (
              <Box key={indicator.id}>
                <Text color={colorName}>■ </Text>
                <Text color="gray">{seriesName} (weight: {indicator.weight})</Text>
              </Box>
            );
          })}
        </Box>
      )}
      
      {/* Statistics */}
      {showStats && (
        <Box flexDirection="column" paddingLeft={1} marginTop={1}>
          <Text bold color="gray">Latest Values:</Text>
          {validIndicators.map((indicator, index) => {
            const stats = seriesStats[index];
            const colorName = INDICATOR_COLOR_NAMES[indicator.id as keyof typeof INDICATOR_COLOR_NAMES] || 'white';
            const seriesName = FRED_SERIES[indicator.id]?.name || indicator.id;
            
            return (
              <Box key={indicator.id}>
                <Text color={colorName}>■ </Text>
                <Text color="gray">{seriesName}: </Text>
                <Text color={colorName} bold>{stats.latest.toFixed(2)}</Text>
                <Text color="gray"> (</Text>
                <Text color={stats.change >= 0 ? 'green' : 'red'}>
                  {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(2)}
                </Text>
                <Text color="gray">)</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default MultiSeriesChart;