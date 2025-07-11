import React from 'react';
import { Box, Text } from 'ink';
import { HistoricalAnalogue, EconomicDataPoint } from '../types';
import { generateForwardGuidance } from '../services/policyAnalysis';

interface PolicyPrescriptionSummaryProps {
  analogue: HistoricalAnalogue;
  currentData?: EconomicDataPoint[];
}

interface PolicyOption {
  action: string;
  likelihood: 'MOST_LIKELY' | 'ALTERNATIVE' | 'CONTINGENT';
  probability: number;
  triggers: string[];
  thresholds: {
    indicator: string;
    value: number;
    direction: 'ABOVE' | 'BELOW';
  }[];
  timeframe: string;
  rationale: string;
}

interface PolicyRecommendation {
  primaryPath: PolicyOption;
  alternatives: PolicyOption[];
  riskFactors: string[];
  monitoringPriorities: string[];
}

const PolicyPrescriptionSummary: React.FC<PolicyPrescriptionSummaryProps> = ({ analogue, currentData }) => {
  // Generate policy recommendations based on historical patterns
  const generatePolicyRecommendations = (): PolicyRecommendation => {
    const guidance = generateForwardGuidance(analogue);
    const latestData = currentData?.[currentData.length - 1];
    
    // Analyze current conditions
    const unemployment = latestData?.UNRATE as number || 4.1;
    const inflation = latestData?.CPIAUCSL as number || 2.5;
    const gdpGrowth = latestData?.GDPC1 as number || 2.0;
    const yieldCurve = latestData?.T10Y2Y as number || 0.5;
    const fedFunds = latestData?.DFF as number || 4.5;
    
    // Determine primary policy path
    let primaryPath: PolicyOption;
    const alternatives: PolicyOption[] = [];
    
    // Analyze historical pattern for guidance
    const historicalActions = analogue.fedPolicyActions || [];
    const hasEasing = historicalActions.some(a => a.action === 'CUT');
    const hasTightening = historicalActions.some(a => a.action === 'HIKE');
    const avgChange = historicalActions.reduce((sum, a) => sum + (a.changeBps || 0), 0) / (historicalActions.length || 1);
    
    // Determine primary path based on conditions and historical precedent
    if (unemployment > 4.5 && inflation < 3.0) {
      // Easing scenario
      primaryPath = {
        action: 'Begin easing cycle with 25bp cuts',
        likelihood: 'MOST_LIKELY',
        probability: 65,
        triggers: ['Rising unemployment', 'Moderating inflation'],
        thresholds: [
          { indicator: 'Unemployment Rate', value: 4.5, direction: 'ABOVE' },
          { indicator: 'CPI Inflation', value: 3.0, direction: 'BELOW' }
        ],
        timeframe: 'Next 2-3 meetings',
        rationale: 'Labor market softening with inflation under control supports gradual easing'
      };
      
      alternatives.push({
        action: 'Accelerate to 50bp cuts',
        likelihood: 'ALTERNATIVE',
        probability: 20,
        triggers: ['Rapid unemployment rise', 'Deflationary pressures'],
        thresholds: [
          { indicator: 'Unemployment Rate', value: 5.0, direction: 'ABOVE' },
          { indicator: 'CPI Inflation', value: 1.5, direction: 'BELOW' }
        ],
        timeframe: 'If conditions deteriorate',
        rationale: 'More aggressive easing if labor market weakens sharply'
      });
    } else if (inflation > 3.5 && unemployment < 4.0) {
      // Tightening scenario
      primaryPath = {
        action: 'Maintain restrictive stance, consider additional hikes',
        likelihood: 'MOST_LIKELY',
        probability: 60,
        triggers: ['Persistent inflation', 'Tight labor market'],
        thresholds: [
          { indicator: 'CPI Inflation', value: 3.5, direction: 'ABOVE' },
          { indicator: 'Unemployment Rate', value: 4.0, direction: 'BELOW' }
        ],
        timeframe: 'Next 1-2 meetings',
        rationale: 'Inflation remains above target with limited labor market slack'
      };
      
      alternatives.push({
        action: 'Extended pause at current levels',
        likelihood: 'ALTERNATIVE',
        probability: 30,
        triggers: ['Inflation plateau', 'Growth moderation'],
        thresholds: [
          { indicator: 'CPI Inflation', value: 3.0, direction: 'ABOVE' },
          { indicator: 'GDP Growth', value: 2.0, direction: 'BELOW' }
        ],
        timeframe: 'Next 3-4 meetings',
        rationale: 'Hold rates steady to assess cumulative impact of prior tightening'
      });
    } else {
      // Neutral/Hold scenario
      primaryPath = {
        action: 'Maintain current policy stance',
        likelihood: 'MOST_LIKELY',
        probability: 70,
        triggers: ['Balanced risks', 'Data dependence'],
        thresholds: [
          { indicator: 'CPI Inflation', value: 2.5, direction: 'ABOVE' },
          { indicator: 'Unemployment Rate', value: 4.5, direction: 'BELOW' }
        ],
        timeframe: 'Next 2-3 meetings',
        rationale: 'Economic conditions near equilibrium warrant patience'
      };
      
      alternatives.push({
        action: 'Precautionary 25bp cut',
        likelihood: 'ALTERNATIVE',
        probability: 20,
        triggers: ['Growth concerns', 'Global headwinds'],
        thresholds: [
          { indicator: 'GDP Growth', value: 1.5, direction: 'BELOW' },
          { indicator: '10Y-2Y Spread', value: 0.0, direction: 'BELOW' }
        ],
        timeframe: 'If downside risks materialize',
        rationale: 'Insurance cut to support growth amid uncertainty'
      });
    }
    
    // Add contingent scenarios
    alternatives.push({
      action: 'Emergency policy response',
      likelihood: 'CONTINGENT',
      probability: 10,
      triggers: ['Financial stress', 'Recession signals'],
      thresholds: [
        { indicator: 'Unemployment Rate', value: 5.5, direction: 'ABOVE' },
        { indicator: 'GDP Growth', value: 0.0, direction: 'BELOW' }
      ],
      timeframe: 'If crisis emerges',
      rationale: 'Rapid policy adjustment if economic conditions deteriorate sharply'
    });
    
    // Determine risk factors
    const riskFactors: string[] = [];
    if (yieldCurve < 0) riskFactors.push('Inverted yield curve signals recession risk');
    if (inflation > 3) riskFactors.push('Inflation persistence may require extended restriction');
    if (unemployment > 4) riskFactors.push('Labor market softening could accelerate');
    if (gdpGrowth < 1.5) riskFactors.push('Growth momentum weakening');
    if (fedFunds > 5) riskFactors.push('Cumulative tightening impact still unfolding');
    
    // Set monitoring priorities
    const monitoringPriorities = [
      'Monthly employment reports for labor market momentum',
      'Core inflation trends for underlying price pressures',
      'Financial conditions indices for policy transmission',
      'Consumer spending data for demand resilience'
    ];
    
    return {
      primaryPath,
      alternatives,
      riskFactors,
      monitoringPriorities
    };
  };
  
  // Generate communication guidance
  const generateCommunicationGuidance = (recommendation: PolicyRecommendation): string[] => {
    const guidance: string[] = [];
    
    if (recommendation.primaryPath.action.includes('easing')) {
      guidance.push('Emphasize data dependence and gradual approach');
      guidance.push('Highlight progress on inflation while noting labor market concerns');
      guidance.push('Maintain flexibility for pace adjustment based on incoming data');
    } else if (recommendation.primaryPath.action.includes('restrictive')) {
      guidance.push('Reinforce commitment to price stability mandate');
      guidance.push('Acknowledge economic resilience supporting restrictive stance');
      guidance.push('Signal willingness to maintain rates "higher for longer" if needed');
    } else {
      guidance.push('Balance dual mandate considerations in messaging');
      guidance.push('Emphasize meeting-by-meeting approach');
      guidance.push('Avoid strong forward guidance given uncertainty');
    }
    
    return guidance;
  };
  
  const recommendations = generatePolicyRecommendations();
  const communicationGuidance = generateCommunicationGuidance(recommendations);
  
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} marginTop={1}>
      <Text bold color="magenta">📋 Policy Prescription Summary</Text>
      
      {/* Primary Recommendation */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline color="green">Most Likely Policy Path</Text>
        <Box flexDirection="column" marginTop={1} marginLeft={2}>
          <Box>
            <Text color="white" bold>{recommendations.primaryPath.action}</Text>
            <Text color="green"> ({recommendations.primaryPath.probability}%)</Text>
          </Box>
          <Text color="gray">Timeframe: {recommendations.primaryPath.timeframe}</Text>
          <Text color="gray" wrap="wrap">Rationale: {recommendations.primaryPath.rationale}</Text>
          
          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan">Key Triggers:</Text>
            {recommendations.primaryPath.triggers.map((trigger, i) => (
              <Text key={i} color="gray" marginLeft={2}>• {trigger}</Text>
            ))}
          </Box>
          
          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan">Decision Thresholds:</Text>
            {recommendations.primaryPath.thresholds.map((threshold, i) => (
              <Text key={i} color="gray" marginLeft={2}>
                • {threshold.indicator} {threshold.direction === 'ABOVE' ? '>' : '<'} {threshold.value}
              </Text>
            ))}
          </Box>
        </Box>
      </Box>
      
      {/* Alternative Scenarios */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline color="yellow">Alternative Scenarios</Text>
        {recommendations.alternatives.map((alt, i) => (
          <Box key={i} flexDirection="column" marginTop={1} marginLeft={2}>
            <Box>
              <Text color={alt.likelihood === 'CONTINGENT' ? 'red' : 'yellow'} bold>
                {alt.action}
              </Text>
              <Text color="gray"> ({alt.probability}%)</Text>
            </Box>
            <Text color="gray">Condition: {alt.timeframe}</Text>
            <Text color="gray">Triggers: {alt.triggers.join(', ')}</Text>
          </Box>
        ))}
      </Box>
      
      {/* Risk Factors */}
      {recommendations.riskFactors.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline color="red">Risk Factors</Text>
          {recommendations.riskFactors.map((risk, i) => (
            <Text key={i} color="red" marginLeft={2}>⚠ {risk}</Text>
          ))}
        </Box>
      )}
      
      {/* Monitoring Priorities */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Monitoring Priorities</Text>
        {recommendations.monitoringPriorities.map((priority, i) => (
          <Text key={i} color="gray" marginLeft={2}>• {priority}</Text>
        ))}
      </Box>
      
      {/* Communication Guidance */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Communication Strategy</Text>
        {communicationGuidance.map((guidance, i) => (
          <Text key={i} color="blue" marginLeft={2}>• {guidance}</Text>
        ))}
      </Box>
      
      {/* Historical Context */}
      <Box marginTop={1}>
        <Text color="gray" italic wrap="wrap">
          Based on {analogue.fedPolicyActions?.length || 0} policy actions in the historical analogue period,
          with {analogue.fedPolicyActions?.filter(a => a.action === 'CUT').length || 0} cuts
          and {analogue.fedPolicyActions?.filter(a => a.action === 'HIKE').length || 0} hikes.
        </Text>
      </Box>
    </Box>
  );
};

export default PolicyPrescriptionSummary;