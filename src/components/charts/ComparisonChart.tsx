// /src/components/charts/ComparisonChart.tsx
import React from 'react';
import { Text, Box } from 'ink';
import asciichart from 'asciichart';
import { EconomicDataPoint } from '../../types';
import { FRED_SERIES } from '../../constants';

interface ComparisonChartProps {
  currentData: EconomicDataPoint[];
  historicalData: EconomicDataPoint[];
  indicatorId: string;
  title?: string;
  height?: number;
  currentLabel?: string;
  historicalLabel?: string;
  showStats?: boolean;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  currentData,
  historicalData,
  indicatorId,
  title,
  height = 8,
  currentLabel = 'Current Period',
  historicalLabel = 'Historical Period',
  showStats = true
}) => {
  const indicatorName = FRED_SERIES[indicatorId]?.name || indicatorId;
  const chartTitle = title || `${indicatorName}: Current vs Historical Comparison`;

  if (!currentData?.length && !historicalData?.length) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{chartTitle}</Text>
        <Text color="gray">No data available for comparison</Text>
      </Box>
    );
  }

  // Extract values for the specified indicator
  const extractValues = (data: EconomicDataPoint[]) => 
    data?.map(point => point[indicatorId] as number)
        .filter(val => typeof val === 'number' && isFinite(val)) || [];

  const currentValues = extractValues(currentData);
  const historicalValues = extractValues(historicalData);

  if (currentValues.length === 0 && historicalValues.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{chartTitle}</Text>
        <Text color="gray">No valid data for {indicatorId}</Text>
      </Box>
    );
  }

  // Prepare series for multi-line chart
  const series: number[][] = [];
  const seriesLabels: string[] = [];
  const colors = [];

  if (currentValues.length > 0) {
    series.push(currentValues);
    seriesLabels.push(currentLabel);
    colors.push(asciichart.blue);
  }

  if (historicalValues.length > 0) {
    series.push(historicalValues);
    seriesLabels.push(historicalLabel);
    colors.push(asciichart.red);
  }

  // Configure chart options
  const chartConfig = {
    offset: 3,
    height,
    format: (x: number) => (x.toFixed(2) + '      ').slice(0, 6),
    colors
  };

  // Generate the ASCII chart
  let chartOutput: string;
  try {
    if (series.length === 1) {
      chartOutput = asciichart.plot(series[0], chartConfig);
    } else {
      chartOutput = asciichart.plot(series, chartConfig);
    }
  } catch (error) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{chartTitle}</Text>
        <Text color="red">Error generating chart: {error instanceof Error ? error.message : 'Unknown error'}</Text>
      </Box>
    );
  }

  // Calculate statistics for comparison
  const currentStats = currentValues.length > 0 ? {
    min: Math.min(...currentValues),
    max: Math.max(...currentValues),
    avg: currentValues.reduce((sum, val) => sum + val, 0) / currentValues.length,
    latest: currentValues[currentValues.length - 1],
    change: currentValues.length > 1 ? currentValues[currentValues.length - 1] - currentValues[0] : 0
  } : null;

  const historicalStats = historicalValues.length > 0 ? {
    min: Math.min(...historicalValues),
    max: Math.max(...historicalValues),
    avg: historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length,
    latest: historicalValues[historicalValues.length - 1],
    change: historicalValues.length > 1 ? historicalValues[historicalValues.length - 1] - historicalValues[0] : 0
  } : null;

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">{chartTitle}</Text>
      
      {/* Legend */}
      <Box paddingLeft={1}>
        {currentValues.length > 0 && <Text color="blue">■ {currentLabel}</Text>}
        {currentValues.length > 0 && historicalValues.length > 0 && <Text color="gray"> | </Text>}
        {historicalValues.length > 0 && <Text color="red">■ {historicalLabel}</Text>}
      </Box>
      
      {/* Chart */}
      <Box paddingLeft={1}>
        <Text>{chartOutput}</Text>
      </Box>
      
      {/* Statistics Comparison */}
      {showStats && (currentStats || historicalStats) && (
        <Box flexDirection="column" paddingLeft={1} marginTop={1}>
          <Text bold color="gray">Comparison Statistics:</Text>
          
          {/* Current Period Stats */}
          {currentStats && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="blue" bold>{currentLabel}:</Text>
              <Box paddingLeft={2}>
                <Text color="gray">Latest: </Text>
                <Text color="blue" bold>{currentStats.latest.toFixed(2)}</Text>
                <Text color="gray"> | Avg: {currentStats.avg.toFixed(2)} | Range: {currentStats.min.toFixed(2)}-{currentStats.max.toFixed(2)}</Text>
              </Box>
              <Box paddingLeft={2}>
                <Text color="gray">Change: </Text>
                <Text color={currentStats.change >= 0 ? 'green' : 'red'}>
                  {currentStats.change >= 0 ? '+' : ''}{currentStats.change.toFixed(2)}
                </Text>
                <Text color="gray"> ({currentValues.length} data points)</Text>
              </Box>
            </Box>
          )}
          
          {/* Historical Period Stats */}
          {historicalStats && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="red" bold>{historicalLabel}:</Text>
              <Box paddingLeft={2}>
                <Text color="gray">Latest: </Text>
                <Text color="red" bold>{historicalStats.latest.toFixed(2)}</Text>
                <Text color="gray"> | Avg: {historicalStats.avg.toFixed(2)} | Range: {historicalStats.min.toFixed(2)}-{historicalStats.max.toFixed(2)}</Text>
              </Box>
              <Box paddingLeft={2}>
                <Text color="gray">Change: </Text>
                <Text color={historicalStats.change >= 0 ? 'green' : 'red'}>
                  {historicalStats.change >= 0 ? '+' : ''}{historicalStats.change.toFixed(2)}
                </Text>
                <Text color="gray"> ({historicalValues.length} data points)</Text>
              </Box>
            </Box>
          )}
          
          {/* Direct Comparison */}
          {currentStats && historicalStats && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="cyan" bold>Difference Analysis:</Text>
              <Box paddingLeft={2}>
                <Text color="gray">Latest Values Diff: </Text>
                <Text color={currentStats.latest >= historicalStats.latest ? 'green' : 'red'}>
                  {(currentStats.latest - historicalStats.latest).toFixed(2)}
                </Text>
                <Text color="gray"> | Average Diff: </Text>
                <Text color={currentStats.avg >= historicalStats.avg ? 'green' : 'red'}>
                  {(currentStats.avg - historicalStats.avg).toFixed(2)}
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ComparisonChart;