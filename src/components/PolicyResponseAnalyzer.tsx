import React from 'react';
import { Box, Text } from 'ink';
import { HistoricalAnalogue, FedPolicyAction, EconomicDataPoint } from '../types';
import { identifyPolicyRegimes, generatePolicyPlaybook, projectFuturePolicy } from '../services/policyAnalysis';
import { FRED_SERIES } from '../constants';

interface PolicyResponseAnalyzerProps {
  analogue: HistoricalAnalogue;
  showProjections?: boolean;
}

interface PolicyPattern {
  type: 'aggressive-easing' | 'gradual-easing' | 'aggressive-tightening' | 'gradual-tightening' | 'data-dependent' | 'hold';
  description: string;
  totalChange: number;
  actionCount: number;
  avgChangePerAction: number;
}

interface PolicyTiming {
  triggerIndicator: string;
  triggerThreshold: number;
  monthsToFirstAction: number;
  monthsToFullResponse: number;
}

interface PolicyEffectiveness {
  indicator: string;
  prePolicy: number;
  postPolicy: number;
  change: number;
  changePercent: number;
  monthsToEffect: number;
}

const PolicyResponseAnalyzer: React.FC<PolicyResponseAnalyzerProps> = ({ analogue, showProjections = false }) => {
  // Analyze policy pattern
  const analyzePolicyPattern = (actions: FedPolicyAction[]): PolicyPattern => {
    if (!actions || actions.length === 0) {
      return {
        type: 'hold',
        description: 'No policy changes',
        totalChange: 0,
        actionCount: 0,
        avgChangePerAction: 0
      };
    }

    const totalChange = actions.reduce((sum, action) => sum + (action.changeBps || 0), 0);
    const actionCount = actions.filter(a => a.action !== 'HOLD').length;
    const avgChangePerAction = actionCount > 0 ? totalChange / actionCount : 0;

    // Determine pattern type
    let type: PolicyPattern['type'];
    let description: string;

    if (actionCount === 0) {
      type = 'hold';
      description = 'Fed maintained steady policy';
    } else if (totalChange < -150) {
      type = 'aggressive-easing';
      description = 'Aggressive easing cycle';
    } else if (totalChange < -50) {
      type = 'gradual-easing';
      description = 'Gradual easing cycle';
    } else if (totalChange > 150) {
      type = 'aggressive-tightening';
      description = 'Aggressive tightening cycle';
    } else if (totalChange > 50) {
      type = 'gradual-tightening';
      description = 'Gradual tightening cycle';
    } else {
      type = 'data-dependent';
      description = 'Data-dependent adjustments';
    }

    return {
      type,
      description,
      totalChange,
      actionCount,
      avgChangePerAction
    };
  };

  // Calculate response timing
  const calculateResponseTiming = (data: EconomicDataPoint[], actions: FedPolicyAction[]): PolicyTiming | null => {
    if (!actions || actions.length === 0 || !data || data.length < 3) {
      return null;
    }

    const firstAction = actions.find(a => a.action !== 'HOLD');
    if (!firstAction) return null;

    // Find when key indicators crossed thresholds
    let triggerIndicator = '';
    let triggerThreshold = 0;
    let monthsToFirstAction = 0;

    // Check unemployment rise
    const unemploymentData = data.map(d => d.UNRATE as number).filter(v => !isNaN(v));
    if (unemploymentData.length > 0) {
      const minUnemployment = Math.min(...unemploymentData.slice(0, 6));
      const unemploymentBeforeAction = unemploymentData[unemploymentData.length - 6] || unemploymentData[0];
      
      if (unemploymentBeforeAction - minUnemployment > 0.5) {
        triggerIndicator = 'Unemployment';
        triggerThreshold = minUnemployment + 0.5;
        // Find when threshold was crossed
        for (let i = 0; i < unemploymentData.length; i++) {
          if (unemploymentData[i] >= triggerThreshold) {
            monthsToFirstAction = unemploymentData.length - i - 1;
            break;
          }
        }
      }
    }

    // Check inflation spike
    if (!triggerIndicator) {
      const inflationData = data.map(d => d.CPIAUCSL as number).filter(v => !isNaN(v));
      if (inflationData.length > 0 && Math.max(...inflationData) > 3) {
        triggerIndicator = 'Inflation';
        triggerThreshold = 3;
        for (let i = 0; i < inflationData.length; i++) {
          if (inflationData[i] >= triggerThreshold) {
            monthsToFirstAction = inflationData.length - i - 1;
            break;
          }
        }
      }
    }

    const lastAction = actions[actions.length - 1];
    const monthsToFullResponse = Math.max(1, Math.round(
      (new Date(lastAction.date).getTime() - new Date(firstAction.date).getTime()) / (30 * 24 * 60 * 60 * 1000)
    ));

    return {
      triggerIndicator: triggerIndicator || 'Multiple factors',
      triggerThreshold,
      monthsToFirstAction: Math.max(1, monthsToFirstAction),
      monthsToFullResponse
    };
  };

  // Track policy effectiveness
  const trackPolicyEffectiveness = (data: EconomicDataPoint[], actions: FedPolicyAction[]): PolicyEffectiveness[] => {
    if (!data || data.length < 6) return [];

    const results: PolicyEffectiveness[] = [];
    const indicators = ['UNRATE', 'CPIAUCSL', 'GDPC1'];

    for (const indicator of indicators) {
      const values = data.map(d => d[indicator] as number).filter(v => !isNaN(v));
      if (values.length < 6) continue;

      const prePolicy = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const postPolicy = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const change = postPolicy - prePolicy;
      const changePercent = (change / prePolicy) * 100;

      results.push({
        indicator,
        prePolicy,
        postPolicy,
        change,
        changePercent,
        monthsToEffect: Math.round(data.length / 2)
      });
    }

    return results;
  };

  const pattern = analyzePolicyPattern(analogue.fedPolicyActions);
  const timing = calculateResponseTiming(analogue.data, analogue.fedPolicyActions);
  const effectiveness = trackPolicyEffectiveness(analogue.data, analogue.fedPolicyActions);
  
  // Use enhanced analysis
  const regimes = identifyPolicyRegimes(analogue.fedPolicyActions);
  const playbook = generatePolicyPlaybook(analogue);
  const projections = showProjections ? projectFuturePolicy(analogue.data, analogue) : [];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} marginTop={1}>
      <Text bold color="yellow">📊 Fed Policy Response Analysis</Text>
      
      {/* Policy Pattern */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Policy Pattern</Text>
        <Text>
          <Text color="gray">Type: </Text>
          <Text color="cyan" bold>{pattern.description}</Text>
        </Text>
        <Text>
          <Text color="gray">Total Adjustment: </Text>
          <Text color={pattern.totalChange > 0 ? 'red' : pattern.totalChange < 0 ? 'green' : 'white'} bold>
            {pattern.totalChange > 0 ? '+' : ''}{pattern.totalChange} bps
          </Text>
          <Text color="gray"> over {pattern.actionCount} moves</Text>
        </Text>
        {pattern.avgChangePerAction !== 0 && (
          <Text>
            <Text color="gray">Average per Move: </Text>
            <Text>{pattern.avgChangePerAction > 0 ? '+' : ''}{pattern.avgChangePerAction.toFixed(0)} bps</Text>
          </Text>
        )}
      </Box>

      {/* Response Timing */}
      {timing && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline>Response Timing</Text>
          <Text>
            <Text color="gray">Trigger: </Text>
            <Text color="yellow">{timing.triggerIndicator}</Text>
            {timing.triggerThreshold > 0 && (
              <Text color="gray"> crossed {timing.triggerThreshold.toFixed(1)}</Text>
            )}
          </Text>
          <Text>
            <Text color="gray">First Action Lag: </Text>
            <Text color="white" bold>{timing.monthsToFirstAction} months</Text>
          </Text>
          <Text>
            <Text color="gray">Full Response Time: </Text>
            <Text color="white">{timing.monthsToFullResponse} months</Text>
          </Text>
        </Box>
      )}

      {/* Policy Effectiveness */}
      {effectiveness.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline>Policy Impact</Text>
          {effectiveness.map((effect, i) => {
            const indicatorName = FRED_SERIES[effect.indicator]?.name || effect.indicator;
            return (
              <Box key={i} marginLeft={2}>
                <Text>
                  <Text color="gray">{indicatorName}: </Text>
                  <Text color={effect.change > 0 ? 'red' : 'green'}>
                    {effect.change > 0 ? '+' : ''}{effect.change.toFixed(2)}
                  </Text>
                  <Text color="gray"> ({effect.changePercent > 0 ? '+' : ''}{effect.changePercent.toFixed(1)}%)</Text>
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Policy Playbook */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Policy Playbook</Text>
        <Text color="gray">Key Triggers:</Text>
        {playbook.keyTriggers.map((trigger, i) => (
          <Text key={i} marginLeft={2}>• {trigger}</Text>
        ))}
        {playbook.typicalSequence.length > 0 && (
          <>
            <Text color="gray" marginTop={1}>Typical Sequence:</Text>
            {playbook.typicalSequence.map((step, i) => (
              <Text key={i} marginLeft={2}>{i + 1}. {step}</Text>
            ))}
          </>
        )}
        <Text marginTop={1}>
          <Text color="gray">Historical Success Rate: </Text>
          <Text color={playbook.historicalSuccess > 70 ? 'green' : playbook.historicalSuccess > 50 ? 'yellow' : 'red'}>
            {playbook.historicalSuccess}%
          </Text>
        </Text>
      </Box>

      {/* Historical Precedent */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Historical Precedent</Text>
        <Text color="gray" wrap="wrap">
          This {pattern.description.toLowerCase()} during {analogue.startDate.substring(0, 7)} suggests the Fed 
          {pattern.type.includes('easing') ? ' prioritized growth concerns' : 
           pattern.type.includes('tightening') ? ' focused on inflation control' : 
           ' balanced competing objectives'}.
        </Text>
      </Box>

      {/* Future Projections */}
      {projections.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline>If Fed Follows This Playbook (Next 6 Months)</Text>
          {projections.slice(0, 3).map((proj, i) => (
            <Box key={i} marginLeft={2}>
              <Text>
                <Text color="gray">{proj.month}: </Text>
                <Text color={proj.action === 'HIKE' ? 'red' : proj.action === 'CUT' ? 'green' : 'yellow'}>
                  {proj.action}
                </Text>
                {proj.basisPoints !== 0 && (
                  <Text> ({proj.basisPoints > 0 ? '+' : ''}{proj.basisPoints}bps)</Text>
                )}
                <Text color="gray"> - {proj.probability}% likely</Text>
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PolicyResponseAnalyzer;