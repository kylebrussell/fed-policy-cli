import React from 'react';
import { Box, Text } from 'ink';
import { HistoricalAnalogue, EconomicDataPoint } from '../types';
import { FRED_SERIES } from '../constants';

interface PolicySimulatorSimpleProps {
  currentData: EconomicDataPoint[];
  historicalAnalogue: HistoricalAnalogue;
}

interface PolicyScenario {
  name: string;
  totalChange: number;
  description: string;
  projectedOutcomes: {
    indicator: string;
    baseline: number;
    projected: number;
    change: number;
  }[];
}

const PolicySimulatorSimple: React.FC<PolicySimulatorSimpleProps> = ({ currentData, historicalAnalogue }) => {
  // Get current values
  const latestData = currentData[currentData.length - 1];
  const currentUnemployment = latestData.UNRATE as number || 4.1;
  const currentInflation = latestData.CPIAUCSL as number || 2.5;
  const currentGDP = latestData.GDPC1 as number || 2.0;
  const currentFF = latestData.DFF as number || 4.5;

  // Define scenarios
  const scenarios: PolicyScenario[] = [
    {
      name: 'No Policy Change',
      totalChange: 0,
      description: 'Fed maintains current rate at ' + currentFF.toFixed(2) + '%',
      projectedOutcomes: [
        {
          indicator: 'UNRATE',
          baseline: currentUnemployment,
          projected: currentUnemployment,
          change: 0
        },
        {
          indicator: 'CPIAUCSL',
          baseline: currentInflation,
          projected: currentInflation - 0.2, // Slight natural decline
          change: -0.2
        },
        {
          indicator: 'GDPC1',
          baseline: currentGDP,
          projected: currentGDP,
          change: 0
        }
      ]
    },
    {
      name: 'Gradual Easing (-75bps)',
      totalChange: -75,
      description: '3 cuts of 25bps each over 6 months',
      projectedOutcomes: [
        {
          indicator: 'UNRATE',
          baseline: currentUnemployment,
          projected: currentUnemployment - 0.2,
          change: -0.2
        },
        {
          indicator: 'CPIAUCSL',
          baseline: currentInflation,
          projected: currentInflation + 0.1,
          change: 0.1
        },
        {
          indicator: 'GDPC1',
          baseline: currentGDP,
          projected: currentGDP + 0.4,
          change: 0.4
        }
      ]
    },
    {
      name: 'Aggressive Easing (-150bps)',
      totalChange: -150,
      description: 'Front-loaded cuts to support growth',
      projectedOutcomes: [
        {
          indicator: 'UNRATE',
          baseline: currentUnemployment,
          projected: currentUnemployment - 0.5,
          change: -0.5
        },
        {
          indicator: 'CPIAUCSL',
          baseline: currentInflation,
          projected: currentInflation + 0.4,
          change: 0.4
        },
        {
          indicator: 'GDPC1',
          baseline: currentGDP,
          projected: currentGDP + 0.8,
          change: 0.8
        }
      ]
    },
    {
      name: 'Gradual Tightening (+75bps)',
      totalChange: 75,
      description: 'Preemptive inflation control',
      projectedOutcomes: [
        {
          indicator: 'UNRATE',
          baseline: currentUnemployment,
          projected: currentUnemployment + 0.3,
          change: 0.3
        },
        {
          indicator: 'CPIAUCSL',
          baseline: currentInflation,
          projected: currentInflation - 0.5,
          change: -0.5
        },
        {
          indicator: 'GDPC1',
          baseline: currentGDP,
          projected: currentGDP - 0.6,
          change: -0.6
        }
      ]
    }
  ];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} marginTop={1}>
      <Text bold color="magenta">🎮 Fed Policy Simulator - What-If Scenarios</Text>
      <Text color="gray" italic>Based on {historicalAnalogue.startDate.substring(0, 7)} to {historicalAnalogue.endDate.substring(0, 7)} precedent</Text>
      
      {/* Current Conditions */}
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text bold underline>Current Economic Conditions</Text>
        <Text>Unemployment: {currentUnemployment.toFixed(1)}%</Text>
        <Text>Inflation: {currentInflation.toFixed(1)}%</Text>
        <Text>GDP Growth: {currentGDP.toFixed(1)}%</Text>
        <Text>Fed Funds: {currentFF.toFixed(2)}%</Text>
      </Box>

      {/* Policy Scenarios */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Policy Scenarios (6-Month Projections)</Text>
        
        {scenarios.map((scenario, index) => (
          <Box key={index} flexDirection="column" marginTop={1} borderStyle="round" 
               borderColor={scenario.totalChange === 0 ? 'gray' : scenario.totalChange < 0 ? 'green' : 'red'}>
            <Box paddingX={1}>
              <Text bold color={scenario.totalChange === 0 ? 'white' : scenario.totalChange < 0 ? 'green' : 'red'}>
                {scenario.name}
              </Text>
              <Text color="gray"> - {scenario.description}</Text>
            </Box>
            
            <Box paddingX={2} flexDirection="column">
              {scenario.projectedOutcomes.map((outcome, i) => {
                const indicatorName = FRED_SERIES[outcome.indicator]?.name || outcome.indicator;
                return (
                  <Box key={i}>
                    <Text>{indicatorName}: </Text>
                    <Text color={outcome.change === 0 ? 'white' : outcome.change > 0 ? 'red' : 'green'}>
                      {outcome.projected.toFixed(1)}%
                    </Text>
                    {outcome.change !== 0 && (
                      <Text color="gray"> ({outcome.change > 0 ? '+' : ''}{outcome.change.toFixed(1)})</Text>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Analysis Note */}
      <Box marginTop={1} paddingX={1}>
        <Text color="yellow" wrap="wrap">
          💡 These projections use simplified relationships based on historical Fed policy impacts. 
          Actual outcomes depend on many factors including global conditions, fiscal policy, and market expectations.
        </Text>
      </Box>
    </Box>
  );
};

export default PolicySimulatorSimple;