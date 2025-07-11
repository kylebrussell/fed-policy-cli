import React from 'react';
import { Box, Text } from 'ink';
import { HistoricalAnalogue, EconomicDataPoint } from '../types';
import { FRED_SERIES } from '../constants';

interface PolicyImpactScorecardProps {
  analogue: HistoricalAnalogue;
  currentData?: EconomicDataPoint[];
}

interface ResponseProfile {
  indicator: string;
  initialValue: number;
  peakImpact: number;
  finalValue: number;
  peakTiming: number; // months to peak impact
  totalChange: number;
  changePercent: number;
  effectiveness: 'HIGH' | 'MODERATE' | 'LOW' | 'ADVERSE';
}

interface LagAnalysis {
  indicator: string;
  firstResponseMonth: number;
  peakResponseMonth: number;
  stabilizationMonth: number;
  totalResponseTime: number;
}

interface DualMandateScore {
  employmentScore: number; // 0-100
  priceStabilityScore: number; // 0-100
  overallScore: number; // 0-100
  balance: 'EMPLOYMENT_FOCUSED' | 'INFLATION_FOCUSED' | 'BALANCED' | 'CONFLICTED';
  success: boolean;
}

const PolicyImpactScorecard: React.FC<PolicyImpactScorecardProps> = ({ analogue, currentData }) => {
  // Calculate response profiles for key indicators
  const calculateResponseProfiles = (): ResponseProfile[] => {
    const profiles: ResponseProfile[] = [];
    const data = analogue.data;
    
    if (!data || data.length < 6) return profiles;
    
    // Key indicators to track
    const indicators = ['UNRATE', 'CPIAUCSL', 'GDPC1', 'DFF'];
    
    for (const indicator of indicators) {
      const values = data.map(d => d[indicator] as number).filter(v => !isNaN(v));
      if (values.length < 6) continue;
      
      const initialValue = values[0];
      const finalValue = values[values.length - 1];
      
      // Find peak impact (max deviation from initial)
      let peakImpact = initialValue;
      let peakTiming = 0;
      let maxDeviation = 0;
      
      for (let i = 0; i < values.length; i++) {
        const deviation = Math.abs(values[i] - initialValue);
        if (deviation > maxDeviation) {
          maxDeviation = deviation;
          peakImpact = values[i];
          peakTiming = i;
        }
      }
      
      const totalChange = finalValue - initialValue;
      const changePercent = (totalChange / initialValue) * 100;
      
      // Determine effectiveness based on indicator and Fed goals
      let effectiveness: ResponseProfile['effectiveness'] = 'MODERATE';
      
      if (indicator === 'UNRATE') {
        // Lower unemployment is good
        if (totalChange < -0.5) effectiveness = 'HIGH';
        else if (totalChange > 0.5) effectiveness = 'LOW';
        else if (totalChange > 1.0) effectiveness = 'ADVERSE';
      } else if (indicator === 'CPIAUCSL') {
        // Getting inflation to 2% is good
        const finalDistance = Math.abs(finalValue - 2.0);
        const initialDistance = Math.abs(initialValue - 2.0);
        if (finalDistance < initialDistance - 0.5) effectiveness = 'HIGH';
        else if (finalDistance > initialDistance + 0.5) effectiveness = 'ADVERSE';
      } else if (indicator === 'GDPC1') {
        // Stable growth around 2-3% is good
        if (finalValue >= 2.0 && finalValue <= 3.0) effectiveness = 'HIGH';
        else if (finalValue < 1.0 || finalValue > 4.0) effectiveness = 'LOW';
      }
      
      profiles.push({
        indicator,
        initialValue,
        peakImpact,
        finalValue,
        peakTiming,
        totalChange,
        changePercent,
        effectiveness
      });
    }
    
    return profiles;
  };
  
  // Analyze policy transmission lags
  const analyzePolicyLags = (): LagAnalysis[] => {
    const lagResults: LagAnalysis[] = [];
    const data = analogue.data;
    
    if (!data || data.length < 6) return lagResults;
    
    // Get Fed funds rate changes to identify policy actions
    const ffValues = data.map(d => d.DFF as number).filter(v => !isNaN(v));
    if (ffValues.length < 6) return lagResults;
    
    // Find first significant policy change (>25bps)
    let policyChangeMonth = 0;
    for (let i = 1; i < ffValues.length; i++) {
      if (Math.abs(ffValues[i] - ffValues[i-1]) > 0.20) {
        policyChangeMonth = i;
        break;
      }
    }
    
    // Track response lags for each indicator
    const indicators = ['UNRATE', 'CPIAUCSL', 'GDPC1'];
    
    for (const indicator of indicators) {
      const values = data.map(d => d[indicator] as number).filter(v => !isNaN(v));
      if (values.length < 6) continue;
      
      const initialValue = values[policyChangeMonth] || values[0];
      const threshold = Math.abs(initialValue) * 0.05; // 5% change threshold
      
      let firstResponseMonth = 0;
      let peakResponseMonth = 0;
      let stabilizationMonth = 0;
      let maxChange = 0;
      
      // Find first response
      for (let i = policyChangeMonth + 1; i < values.length; i++) {
        const change = Math.abs(values[i] - initialValue);
        
        if (firstResponseMonth === 0 && change > threshold) {
          firstResponseMonth = i - policyChangeMonth;
        }
        
        if (change > maxChange) {
          maxChange = change;
          peakResponseMonth = i - policyChangeMonth;
        }
      }
      
      // Find stabilization (when changes become small)
      for (let i = peakResponseMonth + policyChangeMonth; i < values.length - 2; i++) {
        const volatility = Math.abs(values[i+1] - values[i]);
        if (volatility < threshold * 0.5) {
          stabilizationMonth = i - policyChangeMonth;
          break;
        }
      }
      
      lagResults.push({
        indicator,
        firstResponseMonth: firstResponseMonth || 1,
        peakResponseMonth: peakResponseMonth || 3,
        stabilizationMonth: stabilizationMonth || values.length - policyChangeMonth,
        totalResponseTime: stabilizationMonth || values.length - policyChangeMonth
      });
    }
    
    return lagResults;
  };
  
  // Calculate dual mandate score
  const calculateDualMandateScore = (profiles: ResponseProfile[]): DualMandateScore => {
    const unemploymentProfile = profiles.find(p => p.indicator === 'UNRATE');
    const inflationProfile = profiles.find(p => p.indicator === 'CPIAUCSL');
    
    // Employment score (lower unemployment is better)
    let employmentScore = 50;
    if (unemploymentProfile) {
      if (unemploymentProfile.totalChange < -0.5) employmentScore = 80;
      else if (unemploymentProfile.totalChange < 0) employmentScore = 65;
      else if (unemploymentProfile.totalChange > 0.5) employmentScore = 30;
      else if (unemploymentProfile.totalChange > 1.0) employmentScore = 20;
      
      // Bonus for keeping unemployment below 5%
      if (unemploymentProfile.finalValue < 5.0) employmentScore += 10;
    }
    
    // Price stability score (closer to 2% is better)
    let priceStabilityScore = 50;
    if (inflationProfile) {
      const finalDistance = Math.abs(inflationProfile.finalValue - 2.0);
      const initialDistance = Math.abs(inflationProfile.initialValue - 2.0);
      
      if (finalDistance < 0.5) priceStabilityScore = 90;
      else if (finalDistance < 1.0) priceStabilityScore = 70;
      else if (finalDistance < 2.0) priceStabilityScore = 50;
      else priceStabilityScore = 30;
      
      // Bonus for moving toward 2%
      if (finalDistance < initialDistance) priceStabilityScore += 10;
    }
    
    // Overall score and balance assessment
    const overallScore = Math.round((employmentScore + priceStabilityScore) / 2);
    
    let balance: DualMandateScore['balance'] = 'BALANCED';
    const scoreDiff = Math.abs(employmentScore - priceStabilityScore);
    
    if (scoreDiff > 30) {
      if (employmentScore > priceStabilityScore) balance = 'EMPLOYMENT_FOCUSED';
      else balance = 'INFLATION_FOCUSED';
    } else if (employmentScore < 40 && priceStabilityScore < 40) {
      balance = 'CONFLICTED';
    }
    
    return {
      employmentScore: Math.min(100, Math.max(0, employmentScore)),
      priceStabilityScore: Math.min(100, Math.max(0, priceStabilityScore)),
      overallScore,
      balance,
      success: overallScore >= 60
    };
  };
  
  // Create visual score bar
  const renderScoreBar = (score: number, maxScore: number = 100): string => {
    const filled = Math.round((score / maxScore) * 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  };
  
  // Get color for effectiveness
  const getEffectivenessColor = (effectiveness: ResponseProfile['effectiveness']): string => {
    switch (effectiveness) {
      case 'HIGH': return 'green';
      case 'MODERATE': return 'yellow';
      case 'LOW': return 'red';
      case 'ADVERSE': return 'magenta';
      default: return 'white';
    }
  };
  
  const profiles = calculateResponseProfiles();
  const lags = analyzePolicyLags();
  const dualMandate = calculateDualMandateScore(profiles);
  
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" paddingX={1} marginTop={1}>
      <Text bold color="blue">📈 Policy Impact Scorecard</Text>
      
      {/* Response Profiles */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Response Profiles</Text>
        {profiles.map((profile, i) => {
          const indicatorName = FRED_SERIES[profile.indicator]?.name || profile.indicator;
          return (
            <Box key={i} flexDirection="column" marginTop={1}>
              <Box>
                <Text color="gray">{indicatorName}: </Text>
                <Text color={getEffectivenessColor(profile.effectiveness)} bold>
                  {profile.effectiveness}
                </Text>
              </Box>
              <Box marginLeft={2}>
                <Text color="gray">Initial: </Text>
                <Text>{profile.initialValue.toFixed(2)}</Text>
                <Text color="gray"> → Peak: </Text>
                <Text color={profile.peakImpact > profile.initialValue ? 'red' : 'green'}>
                  {profile.peakImpact.toFixed(2)}
                </Text>
                <Text color="gray"> → Final: </Text>
                <Text color={profile.totalChange > 0 ? 'red' : 'green'}>
                  {profile.finalValue.toFixed(2)}
                </Text>
                <Text color="gray"> ({profile.changePercent > 0 ? '+' : ''}{profile.changePercent.toFixed(1)}%)</Text>
              </Box>
            </Box>
          );
        })}
      </Box>
      
      {/* Lag Analysis */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Policy Transmission Lags</Text>
        {lags.map((lag, i) => {
          const indicatorName = FRED_SERIES[lag.indicator]?.name || lag.indicator;
          return (
            <Box key={i} marginTop={1}>
              <Box width={20}>
                <Text color="gray">{indicatorName}:</Text>
              </Box>
              <Text>
                First: {lag.firstResponseMonth}mo → 
                Peak: {lag.peakResponseMonth}mo → 
                Stable: {lag.stabilizationMonth}mo
              </Text>
            </Box>
          );
        })}
        {lags.length > 0 && (
          <Text color="gray" italic marginTop={1}>
            Average transmission lag: {Math.round(lags.reduce((sum, l) => sum + l.firstResponseMonth, 0) / lags.length)} months
          </Text>
        )}
      </Box>
      
      {/* Dual Mandate Score */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>Dual Mandate Performance</Text>
        
        <Box marginTop={1}>
          <Box width={25}>
            <Text>Employment Score:</Text>
          </Box>
          <Text>{renderScoreBar(dualMandate.employmentScore)}</Text>
          <Text color={dualMandate.employmentScore >= 70 ? 'green' : dualMandate.employmentScore >= 50 ? 'yellow' : 'red'}>
            {' '}{dualMandate.employmentScore}/100
          </Text>
        </Box>
        
        <Box>
          <Box width={25}>
            <Text>Price Stability Score:</Text>
          </Box>
          <Text>{renderScoreBar(dualMandate.priceStabilityScore)}</Text>
          <Text color={dualMandate.priceStabilityScore >= 70 ? 'green' : dualMandate.priceStabilityScore >= 50 ? 'yellow' : 'red'}>
            {' '}{dualMandate.priceStabilityScore}/100
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Box width={25}>
            <Text bold>Overall Score:</Text>
          </Box>
          <Text bold>{renderScoreBar(dualMandate.overallScore)}</Text>
          <Text bold color={dualMandate.success ? 'green' : 'red'}>
            {' '}{dualMandate.overallScore}/100 {dualMandate.success ? '✓' : '✗'}
          </Text>
        </Box>
        
        <Text marginTop={1}>
          <Text color="gray">Policy Balance: </Text>
          <Text color={
            dualMandate.balance === 'BALANCED' ? 'green' :
            dualMandate.balance === 'CONFLICTED' ? 'red' : 'yellow'
          } bold>
            {dualMandate.balance.replace(/_/g, ' ')}
          </Text>
        </Text>
      </Box>
      
      {/* Period Assessment */}
      <Box marginTop={1}>
        <Text color="gray" italic wrap="wrap">
          This period shows {dualMandate.balance === 'BALANCED' ? 'balanced pursuit of' : 
                           dualMandate.balance === 'EMPLOYMENT_FOCUSED' ? 'prioritization of employment over' :
                           dualMandate.balance === 'INFLATION_FOCUSED' ? 'prioritization of price stability over' :
                           'challenges in achieving'} the Fed's dual mandate
          {dualMandate.success ? ', with overall successful outcomes.' : ', with mixed results.'}
        </Text>
      </Box>
    </Box>
  );
};

export default PolicyImpactScorecard;