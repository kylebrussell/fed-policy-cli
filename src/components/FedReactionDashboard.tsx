import React from 'react';
import { Box, Text } from 'ink';
import { EconomicDataPoint } from '../types';
import { FRED_SERIES } from '../constants';

interface FedReactionDashboardProps {
  currentData: EconomicDataPoint[];
  historicalData?: EconomicDataPoint[];
}

interface PolicyTrigger {
  indicator: string;
  currentValue: number;
  thresholds: {
    easingStrong: number;
    easingModerate: number;
    neutral: number;
    tighteningModerate: number;
    tighteningStrong: number;
  };
  signal: 'STRONG_EASING' | 'MODERATE_EASING' | 'NEUTRAL' | 'MODERATE_TIGHTENING' | 'STRONG_TIGHTENING';
  pressure: number; // -100 to +100
}

interface RateChangeProbability {
  action: 'CUT_50' | 'CUT_25' | 'HOLD' | 'HIKE_25' | 'HIKE_50';
  probability: number;
  rationale: string;
}

const FedReactionDashboard: React.FC<FedReactionDashboardProps> = ({ currentData, historicalData }) => {
  // Get latest values
  const latestData = currentData[currentData.length - 1];
  const previousData = currentData.length > 1 ? currentData[currentData.length - 2] : latestData;
  
  // Calculate policy triggers
  const calculatePolicyTriggers = (): PolicyTrigger[] => {
    const triggers: PolicyTrigger[] = [];
    
    // Unemployment trigger
    const unemployment = latestData.UNRATE as number || 4.1;
    const unemploymentChange = unemployment - (previousData.UNRATE as number || unemployment);
    
    triggers.push({
      indicator: 'Unemployment Rate',
      currentValue: unemployment,
      thresholds: {
        easingStrong: 5.5,
        easingModerate: 4.5,
        neutral: 4.0,
        tighteningModerate: 3.5,
        tighteningStrong: 3.0
      },
      signal: unemployment >= 5.5 ? 'STRONG_EASING' :
              unemployment >= 4.5 ? 'MODERATE_EASING' :
              unemployment <= 3.0 ? 'STRONG_TIGHTENING' :
              unemployment <= 3.5 ? 'MODERATE_TIGHTENING' : 'NEUTRAL',
      pressure: Math.min(100, Math.max(-100, 
        unemployment >= 4.0 ? (unemployment - 4.0) * 40 : (unemployment - 4.0) * 30
      ))
    });
    
    // Inflation trigger
    const inflation = latestData.CPIAUCSL as number || 2.5;
    triggers.push({
      indicator: 'CPI Inflation',
      currentValue: inflation,
      thresholds: {
        easingStrong: 1.0,
        easingModerate: 1.5,
        neutral: 2.0,
        tighteningModerate: 3.0,
        tighteningStrong: 4.0
      },
      signal: inflation <= 1.0 ? 'STRONG_EASING' :
              inflation <= 1.5 ? 'MODERATE_EASING' :
              inflation >= 4.0 ? 'STRONG_TIGHTENING' :
              inflation >= 3.0 ? 'MODERATE_TIGHTENING' : 'NEUTRAL',
      pressure: Math.min(100, Math.max(-100,
        inflation >= 2.0 ? -(inflation - 2.0) * 30 : -(inflation - 2.0) * 20
      ))
    });
    
    // GDP Growth trigger
    const gdp = latestData.GDPC1 as number || 2.0;
    triggers.push({
      indicator: 'GDP Growth',
      currentValue: gdp,
      thresholds: {
        easingStrong: 0.0,
        easingModerate: 1.0,
        neutral: 2.0,
        tighteningModerate: 3.0,
        tighteningStrong: 4.0
      },
      signal: gdp <= 0.0 ? 'STRONG_EASING' :
              gdp <= 1.0 ? 'MODERATE_EASING' :
              gdp >= 4.0 ? 'STRONG_TIGHTENING' :
              gdp >= 3.0 ? 'MODERATE_TIGHTENING' : 'NEUTRAL',
      pressure: Math.min(100, Math.max(-100,
        gdp >= 2.0 ? -(gdp - 2.0) * 25 : (gdp - 2.0) * 35
      ))
    });
    
    // Yield Curve trigger
    const yieldCurve = latestData.T10Y2Y as number || 0.5;
    triggers.push({
      indicator: 'Yield Curve (10Y-2Y)',
      currentValue: yieldCurve,
      thresholds: {
        easingStrong: -0.5,
        easingModerate: 0.0,
        neutral: 0.5,
        tighteningModerate: 1.5,
        tighteningStrong: 2.5
      },
      signal: yieldCurve <= -0.5 ? 'STRONG_EASING' :
              yieldCurve <= 0.0 ? 'MODERATE_EASING' :
              yieldCurve >= 2.5 ? 'STRONG_TIGHTENING' :
              yieldCurve >= 1.5 ? 'MODERATE_TIGHTENING' : 'NEUTRAL',
      pressure: Math.min(100, Math.max(-100,
        yieldCurve < 0 ? yieldCurve * 60 : -yieldCurve * 20
      ))
    });
    
    return triggers;
  };
  
  // Calculate rate change probabilities
  const calculateRateChangeProbabilities = (triggers: PolicyTrigger[]): RateChangeProbability[] => {
    const avgPressure = triggers.reduce((sum, t) => sum + t.pressure, 0) / triggers.length;
    const strongEasingCount = triggers.filter(t => t.signal === 'STRONG_EASING').length;
    const moderateEasingCount = triggers.filter(t => t.signal === 'MODERATE_EASING').length;
    const strongTighteningCount = triggers.filter(t => t.signal === 'STRONG_TIGHTENING').length;
    const moderateTighteningCount = triggers.filter(t => t.signal === 'MODERATE_TIGHTENING').length;
    
    const probabilities: RateChangeProbability[] = [];
    
    // Calculate probabilities based on pressure and signals
    if (avgPressure > 50) {
      probabilities.push({
        action: 'CUT_50',
        probability: Math.min(70, 30 + strongEasingCount * 20),
        rationale: 'Multiple indicators signal strong easing needed'
      });
      probabilities.push({
        action: 'CUT_25',
        probability: 25,
        rationale: 'Moderate easing as alternative'
      });
      probabilities.push({
        action: 'HOLD',
        probability: 5,
        rationale: 'Wait for more data'
      });
    } else if (avgPressure > 20) {
      probabilities.push({
        action: 'CUT_25',
        probability: Math.min(65, 40 + moderateEasingCount * 10),
        rationale: 'Economic weakness warrants easing'
      });
      probabilities.push({
        action: 'HOLD',
        probability: 30,
        rationale: 'Data-dependent approach'
      });
      probabilities.push({
        action: 'CUT_50',
        probability: 5,
        rationale: 'Insurance cut if conditions worsen'
      });
    } else if (avgPressure < -50) {
      probabilities.push({
        action: 'HIKE_50',
        probability: Math.min(60, 25 + strongTighteningCount * 15),
        rationale: 'Aggressive action to control inflation'
      });
      probabilities.push({
        action: 'HIKE_25',
        probability: 35,
        rationale: 'Gradual tightening preferred'
      });
      probabilities.push({
        action: 'HOLD',
        probability: 5,
        rationale: 'Assess impact of previous hikes'
      });
    } else if (avgPressure < -20) {
      probabilities.push({
        action: 'HIKE_25',
        probability: Math.min(60, 35 + moderateTighteningCount * 10),
        rationale: 'Inflation concerns dominate'
      });
      probabilities.push({
        action: 'HOLD',
        probability: 35,
        rationale: 'Monitor incoming data'
      });
      probabilities.push({
        action: 'HIKE_50',
        probability: 5,
        rationale: 'Front-load if inflation accelerates'
      });
    } else {
      probabilities.push({
        action: 'HOLD',
        probability: 70,
        rationale: 'Balanced risks favor patience'
      });
      probabilities.push({
        action: 'CUT_25',
        probability: 15,
        rationale: 'Insurance against downside risks'
      });
      probabilities.push({
        action: 'HIKE_25',
        probability: 15,
        rationale: 'Preemptive inflation control'
      });
    }
    
    // Normalize probabilities to sum to 100
    const totalProb = probabilities.reduce((sum, p) => sum + p.probability, 0);
    probabilities.forEach(p => p.probability = Math.round((p.probability / totalProb) * 100));
    
    return probabilities.sort((a, b) => b.probability - a.probability);
  };
  
  // Create pressure gauge visualization
  const renderPressureGauge = (pressure: number): string => {
    const normalized = Math.round((pressure + 100) / 20); // 0-10 scale
    const gauge = ['◆', '◆', '◆', '◆', '◆', '◇', '◆', '◆', '◆', '◆', '◆'];
    gauge[5] = '◇'; // Neutral marker
    gauge[normalized] = '◈'; // Current position
    return gauge.join('');
  };
  
  const triggers = calculatePolicyTriggers();
  const probabilities = calculateRateChangeProbabilities(triggers);
  const overallPressure = triggers.reduce((sum, t) => sum + t.pressure, 0) / triggers.length;
  
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginTop={1}>
      <Text bold color="cyan">🎯 Fed Reaction Function Dashboard</Text>
      
      {/* Policy Triggers Section */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Policy Trigger Indicators</Text>
        {triggers.map((trigger, i) => (
          <Box key={i} flexDirection="column" marginTop={1}>
            <Box>
              <Text color="gray">{trigger.indicator}: </Text>
              <Text color={
                trigger.signal.includes('EASING') ? 'green' :
                trigger.signal.includes('TIGHTENING') ? 'red' : 'white'
              } bold>
                {trigger.currentValue.toFixed(2)}
              </Text>
              <Text color="gray"> → </Text>
              <Text color={
                trigger.signal.includes('STRONG') ? 'magenta' : 
                trigger.signal.includes('MODERATE') ? 'yellow' : 'gray'
              }>
                {trigger.signal.replace(/_/g, ' ')}
              </Text>
            </Box>
            <Box marginLeft={2}>
              <Text color="gray">Thresholds: </Text>
              <Text color="green">{trigger.thresholds.easingModerate}</Text>
              <Text color="gray"> | </Text>
              <Text color="white">{trigger.thresholds.neutral}</Text>
              <Text color="gray"> | </Text>
              <Text color="red">{trigger.thresholds.tighteningModerate}</Text>
            </Box>
          </Box>
        ))}
      </Box>
      
      {/* Policy Pressure Gauge */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Policy Pressure Gauge</Text>
        <Box marginTop={1}>
          <Text color="green">Easing </Text>
          <Text>{renderPressureGauge(overallPressure)}</Text>
          <Text color="red"> Tightening</Text>
        </Box>
        <Text color="gray" marginLeft={8}>
          Pressure: {overallPressure > 0 ? '+' : ''}{overallPressure.toFixed(0)}
        </Text>
      </Box>
      
      {/* Rate Change Probabilities */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Next Meeting Probabilities</Text>
        {probabilities.map((prob, i) => {
          const actionText = prob.action.replace(/_/g, ' ').replace('CUT', '-').replace('HIKE', '+');
          return (
            <Box key={i} marginTop={1}>
              <Box width={15}>
                <Text color={
                  prob.action.includes('CUT') ? 'green' :
                  prob.action.includes('HIKE') ? 'red' : 'yellow'
                } bold>
                  {actionText}bps
                </Text>
              </Box>
              <Box width={10}>
                <Text color={prob.probability > 50 ? 'cyan' : 'white'}>
                  {prob.probability}%
                </Text>
              </Box>
              <Text color="gray" wrap="wrap">
                {prob.rationale}
              </Text>
            </Box>
          );
        })}
      </Box>
      
      {/* Current Fed Funds Rate */}
      <Box marginTop={1}>
        <Text color="gray">Current Fed Funds Rate: </Text>
        <Text bold>{(latestData.DFF as number || 4.5).toFixed(2)}%</Text>
      </Box>
    </Box>
  );
};

export default FedReactionDashboard;