// /src/components/MarketExpectationsDashboard.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { MarketExpectationsAnalysis, TradingSignal, YieldCurvePoint } from '../services/marketExpectations';

interface MarketExpectationsDashboardProps {
  analysis: MarketExpectationsAnalysis;
}

const SignalStrengthColor = ({ strength }: { strength: 'STRONG' | 'MODERATE' | 'WEAK' }) => {
  const color = strength === 'STRONG' ? 'red' : strength === 'MODERATE' ? 'yellow' : 'gray';
  return <Text color={color}>{strength}</Text>;
};

const TradingSignalRow = ({ signal }: { signal: TradingSignal }) => {
  const typeColor = signal.type.includes('RISK') ? 'red' : 
                   signal.type.includes('OPPORTUNITY') ? 'green' : 'blue';
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={typeColor} bold>{signal.type.replace(/_/g, ' ')}</Text>
        <Text> - </Text>
        <SignalStrengthColor strength={signal.strength} />
        <Text> ({signal.confidence}% confidence)</Text>
      </Box>
      <Box marginLeft={2}>
        <Text>{signal.description}</Text>
      </Box>
      <Box marginLeft={2}>
        <Text color="gray">Timeframe: {signal.timeframe}</Text>
      </Box>
    </Box>
  );
};

const YieldCurveDisplay = ({ curve, slope2Y10Y, slope3M10Y, isInverted }: {
  curve: YieldCurvePoint[];
  slope2Y10Y: number;
  slope3M10Y: number;
  isInverted: boolean;
}) => {
  return (
    <Box flexDirection="column">
      <Text bold color="blue">Current Yield Curve</Text>
      <Box marginTop={1}>
        {curve.map((point, i) => (
          <Box key={point.maturity} marginRight={3}>
            <Text>{point.maturity}: </Text>
            <Text color={point.yield > 4 ? 'red' : 'white'}>
              {point.yield.toFixed(2)}%
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text>2Y-10Y Spread: </Text>
        <Text color={slope2Y10Y < 0 ? 'red' : 'green'}>
          {slope2Y10Y.toFixed(0)}bp
        </Text>
        <Text> | 3M-10Y Spread: </Text>
        <Text color={slope3M10Y < 0 ? 'red' : 'green'}>
          {slope3M10Y.toFixed(0)}bp
        </Text>
      </Box>
      {isInverted && (
        <Box marginTop={1}>
          <Text color="red" bold>⚠️  YIELD CURVE INVERTED - RECESSION RISK</Text>
        </Box>
      )}
    </Box>
  );
};

const FedProjectionsDisplay = ({ projections }: { projections: any[] }) => {
  if (projections.length === 0) {
    return (
      <Box>
        <Text color="gray">No Fed projections available</Text>
      </Box>
    );
  }

  const latest = projections
    .filter(p => p.median_rate != null)
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date))[0];

  if (!latest) {
    return (
      <Box>
        <Text color="gray">No median rate projections available</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="blue">Latest Fed Projections</Text>
      <Box marginTop={1}>
        <Text>Meeting Date: {latest.meeting_date}</Text>
      </Box>
      <Box>
        <Text>Projection Year: {latest.projection_year}</Text>
      </Box>
      <Box>
        <Text>Median Rate: </Text>
        <Text color="yellow">{latest.median_rate?.toFixed(2)}%</Text>
      </Box>
      {latest.range_low && latest.range_high && (
        <Box>
          <Text>Range: {latest.range_low?.toFixed(2)}% - {latest.range_high?.toFixed(2)}%</Text>
        </Box>
      )}
    </Box>
  );
};

const DivergenceAnalysis = ({ divergence }: { divergence: any[] }) => {
  if (divergence.length === 0) return null;

  const latest = divergence[divergence.length - 1];
  if (!latest.divergence) return null;

  const divergenceBp = latest.divergence * 100; // Convert to basis points
  const isDivergent = Math.abs(divergenceBp) > 25; // 25bp threshold

  return (
    <Box flexDirection="column">
      <Text bold color="blue">Market vs Fed Divergence</Text>
      <Box marginTop={1}>
        <Text>Market Implied Rate: </Text>
        <Text color="white">{latest.impliedRate?.toFixed(2)}%</Text>
      </Box>
      <Box>
        <Text>Fed Projection: </Text>
        <Text color="yellow">{latest.fedProjection?.toFixed(2)}%</Text>
      </Box>
      <Box>
        <Text>Divergence: </Text>
        <Text color={isDivergent ? (divergenceBp > 0 ? 'red' : 'green') : 'gray'}>
          {divergenceBp > 0 ? '+' : ''}{divergenceBp.toFixed(0)}bp
        </Text>
      </Box>
      {isDivergent && (
        <Box marginTop={1}>
          <Text color={divergenceBp > 0 ? 'red' : 'green'}>
            Market expects {divergenceBp > 0 ? 'HIGHER' : 'LOWER'} rates than Fed
          </Text>
        </Box>
      )}
    </Box>
  );
};

const MarketExpectationsDashboard: React.FC<MarketExpectationsDashboardProps> = ({ analysis }) => {
  const { latestYieldCurve, fedProjections, marketVsFedDivergence, tradingSignals } = analysis;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan" underline>
        📊 MARKET EXPECTATIONS DASHBOARD
      </Text>
      
      <Box marginTop={2}>
        <YieldCurveDisplay 
          curve={latestYieldCurve.curve}
          slope2Y10Y={latestYieldCurve.slope2Y10Y}
          slope3M10Y={latestYieldCurve.slope3M10Y}
          isInverted={latestYieldCurve.isInverted}
        />
      </Box>

      <Box marginTop={2}>
        <FedProjectionsDisplay projections={fedProjections} />
      </Box>

      <Box marginTop={2}>
        <DivergenceAnalysis divergence={marketVsFedDivergence} />
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text bold color="cyan">🎯 TRADING SIGNALS</Text>
        {tradingSignals.length === 0 ? (
          <Box marginTop={1}>
            <Text color="gray">No significant trading signals detected</Text>
          </Box>
        ) : (
          <Box marginTop={1} flexDirection="column">
            {tradingSignals.map((signal, i) => (
              <TradingSignalRow key={i} signal={signal} />
            ))}
          </Box>
        )}
      </Box>

      <Box marginTop={2}>
        <Text color="gray">
          Last updated: {latestYieldCurve.date}
        </Text>
      </Box>
    </Box>
  );
};

export default MarketExpectationsDashboard;