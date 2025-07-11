import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { HistoricalAnalogue, EconomicDataPoint } from '../types';
import { FRED_SERIES } from '../constants';

interface PolicySimulatorProps {
  currentData: EconomicDataPoint[];
  historicalAnalogue: HistoricalAnalogue;
}

interface PolicyScenario {
  name: string;
  actions: PolicyAction[];
  projectedOutcomes: ProjectedOutcome[];
}

interface PolicyAction {
  month: number;
  type: 'HIKE' | 'CUT' | 'HOLD';
  basisPoints: number;
}

interface ProjectedOutcome {
  indicator: string;
  baseline: number;
  projected: number;
  change: number;
  confidence: number;
}

const PolicySimulator: React.FC<PolicySimulatorProps> = ({ currentData, historicalAnalogue }) => {
  const [scenarios, setScenarios] = useState<PolicyScenario[]>([
    {
      name: 'Baseline (No Action)',
      actions: Array(6).fill(null).map((_, i) => ({ month: i + 1, type: 'HOLD', basisPoints: 0 })),
      projectedOutcomes: []
    },
    {
      name: 'Gradual Easing',
      actions: [
        { month: 1, type: 'CUT', basisPoints: -25 },
        { month: 2, type: 'HOLD', basisPoints: 0 },
        { month: 3, type: 'CUT', basisPoints: -25 },
        { month: 4, type: 'HOLD', basisPoints: 0 },
        { month: 5, type: 'CUT', basisPoints: -25 },
        { month: 6, type: 'HOLD', basisPoints: 0 }
      ],
      projectedOutcomes: []
    },
    {
      name: 'Aggressive Easing',
      actions: [
        { month: 1, type: 'CUT', basisPoints: -50 },
        { month: 2, type: 'CUT', basisPoints: -50 },
        { month: 3, type: 'CUT', basisPoints: -25 },
        { month: 4, type: 'HOLD', basisPoints: 0 },
        { month: 5, type: 'HOLD', basisPoints: 0 },
        { month: 6, type: 'HOLD', basisPoints: 0 }
      ],
      projectedOutcomes: []
    }
  ]);

  const [selectedScenario, setSelectedScenario] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editMonth, setEditMonth] = useState(0);

  // Calculate projected outcomes based on historical relationships
  const calculateProjections = (scenario: PolicyScenario): ProjectedOutcome[] => {
    const outcomes: ProjectedOutcome[] = [];
    const totalBasisPoints = scenario.actions.reduce((sum, action) => sum + action.basisPoints, 0);
    
    // Get current values
    const latestData = currentData[currentData.length - 1];
    
    // Project based on historical relationships
    const indicators = ['UNRATE', 'CPIAUCSL', 'GDPC1'];
    
    for (const indicatorId of indicators) {
      const baseline = latestData[indicatorId] as number || 0;
      let projected = baseline;
      let confidence = 70;
      
      // Simple projection model based on typical Fed impact
      if (indicatorId === 'UNRATE') {
        // Unemployment typically rises with tightening, falls with easing
        projected = baseline + (totalBasisPoints / 100) * 0.3;
        confidence = totalBasisPoints === 0 ? 90 : 65;
      } else if (indicatorId === 'CPIAUCSL') {
        // Inflation typically falls with tightening, rises with easing
        projected = baseline - (totalBasisPoints / 100) * 0.4;
        confidence = totalBasisPoints === 0 ? 85 : 70;
      } else if (indicatorId === 'GDPC1') {
        // GDP typically falls with tightening, rises with easing
        projected = baseline - (totalBasisPoints / 100) * 0.5;
        confidence = totalBasisPoints === 0 ? 80 : 60;
      }
      
      outcomes.push({
        indicator: indicatorId,
        baseline,
        projected,
        change: projected - baseline,
        confidence
      });
    }
    
    return outcomes;
  };

  // Update projections when scenarios change
  useEffect(() => {
    setScenarios(prev => prev.map(scenario => ({
      ...scenario,
      projectedOutcomes: calculateProjections(scenario)
    })));
  }, [currentData]);

  // Keyboard navigation - only use if stdin supports raw mode
  useInput((input, key) => {
    if (!editMode) {
      if (key.upArrow && selectedScenario > 0) {
        setSelectedScenario(prev => prev - 1);
      } else if (key.downArrow && selectedScenario < scenarios.length - 1) {
        setSelectedScenario(prev => prev + 1);
      } else if (key.return) {
        setEditMode(true);
        setEditMonth(0);
      }
    } else {
      if (key.escape) {
        setEditMode(false);
      } else if (key.leftArrow && editMonth > 0) {
        setEditMonth(prev => prev - 1);
      } else if (key.rightArrow && editMonth < 5) {
        setEditMonth(prev => prev + 1);
      } else if (input === '+' || input === '-') {
        // Adjust the policy action
        const newScenarios = [...scenarios];
        const action = newScenarios[selectedScenario].actions[editMonth];
        
        if (input === '+') {
          if (action.basisPoints <= 75) {
            action.basisPoints += 25;
            action.type = action.basisPoints > 0 ? 'HIKE' : action.basisPoints < 0 ? 'CUT' : 'HOLD';
          }
        } else {
          if (action.basisPoints >= -75) {
            action.basisPoints -= 25;
            action.type = action.basisPoints > 0 ? 'HIKE' : action.basisPoints < 0 ? 'CUT' : 'HOLD';
          }
        }
        
        newScenarios[selectedScenario].projectedOutcomes = calculateProjections(newScenarios[selectedScenario]);
        setScenarios(newScenarios);
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} marginTop={1}>
      <Text bold color="magenta">🎮 Interactive Policy Simulator</Text>
      <Text color="gray" italic>Use ↑↓ to select scenario, Enter to edit, +/- to adjust rates, Esc to exit edit mode</Text>
      
      {/* Scenario Selection */}
      <Box flexDirection="column" marginTop={1}>
        {scenarios.map((scenario, index) => (
          <Box key={index} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color={selectedScenario === index ? 'cyan' : 'white'}>
                {selectedScenario === index ? '▶ ' : '  '}
                {scenario.name}
              </Text>
              {selectedScenario === index && editMode && (
                <Text color="yellow"> (Edit Mode)</Text>
              )}
            </Box>
            
            {/* Policy Actions Timeline */}
            {selectedScenario === index && (
              <Box marginLeft={3} marginTop={1} flexDirection="row">
                <Text color="gray">Actions: </Text>
                {scenario.actions.map((action, monthIndex) => (
                  <Box key={`action-${index}-${monthIndex}`} marginRight={1}>
                    <Box borderStyle={editMode && editMonth === monthIndex ? 'single' : undefined}
                         borderColor="yellow">
                      <Text color={
                        action.type === 'HIKE' ? 'red' : 
                        action.type === 'CUT' ? 'green' : 
                        'gray'
                      }>
                        M{action.month}: {action.basisPoints > 0 ? '+' : ''}{action.basisPoints}
                      </Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Projected Outcomes Comparison */}
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text bold underline>Projected Outcomes (6-Month Horizon)</Text>
        
        {/* Side-by-side comparison */}
        <Box marginTop={1}>
          <Box width={25}>
            <Text bold color="cyan">{scenarios[0].name}</Text>
          </Box>
          <Box width={25}>
            <Text bold color="cyan">{scenarios[selectedScenario].name}</Text>
          </Box>
        </Box>

        {['UNRATE', 'CPIAUCSL', 'GDPC1'].map(indicatorId => {
          const baseline = scenarios[0].projectedOutcomes.find(o => o.indicator === indicatorId);
          const selected = scenarios[selectedScenario].projectedOutcomes.find(o => o.indicator === indicatorId);
          const indicatorName = FRED_SERIES[indicatorId]?.name || indicatorId;

          return (
            <Box key={indicatorId} marginTop={1}>
              <Box width={25}>
                <Text color="gray">{indicatorName}:</Text>
                <Text> {baseline?.projected.toFixed(2)}%</Text>
              </Box>
              <Box width={25}>
                <Text color="gray">{indicatorName}:</Text>
                <Text color={
                  selected?.change && selected.change > 0 ? 'red' : 
                  selected?.change && selected.change < 0 ? 'green' : 
                  'white'
                }>
                  {' '}{selected?.projected.toFixed(2)}%
                </Text>
                {selected?.change !== 0 && (
                  <Text color="gray">
                    {' '}({selected?.change && selected.change > 0 ? '+' : ''}{selected?.change.toFixed(2)})
                  </Text>
                )}
              </Box>
            </Box>
          );
        })}

        {/* Confidence Level */}
        <Box marginTop={1}>
          <Text color="gray">Confidence: </Text>
          <Text color={
            scenarios[selectedScenario].projectedOutcomes[0]?.confidence > 70 ? 'green' :
            scenarios[selectedScenario].projectedOutcomes[0]?.confidence > 50 ? 'yellow' :
            'red'
          }>
            {scenarios[selectedScenario].projectedOutcomes[0]?.confidence || 0}%
          </Text>
        </Box>
      </Box>

      {/* Historical Precedent Note */}
      <Box marginTop={1}>
        <Text color="gray" italic wrap="wrap">
          Based on {historicalAnalogue.startDate.substring(0, 7)} to {historicalAnalogue.endDate.substring(0, 7)} precedent
        </Text>
      </Box>
    </Box>
  );
};

export default PolicySimulator;