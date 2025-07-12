// /src/components/FOMCVolatilityDashboardRealistic.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { 
  VolAdjustedRecommendation,
  FOMCEvent,
  VolatilityProfile
} from '../types/index.js';

interface Props {
  recommendations: VolAdjustedRecommendation[];
  nextFOMC: FOMCEvent;
  volatilityProfiles: Map<string, VolatilityProfile>;
  dataSourceStatus?: { vixAvailable: boolean; optionsAvailable: boolean };
  title?: string;
}

export function FOMCVolatilityDashboardRealistic({ 
  recommendations, 
  nextFOMC, 
  volatilityProfiles,
  dataSourceStatus = { vixAvailable: false, optionsAvailable: false },
  title = "FOMC VOLATILITY ANALYSIS" 
}: Props) {
  const daysToFOMC = calculateDaysToFOMC(nextFOMC.date);
  
  return (
    <Box flexDirection="column" width={120}>
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color="white" backgroundColor="blue" bold>
          {`═══════════════ ${title} ═══════════════════`}
        </Text>
      </Box>

      {/* Data Source Status */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">
          📊 Data Sources: {getDataSourceText(dataSourceStatus)}
        </Text>
        <Text> </Text>
      </Box>

      {/* FOMC Status Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan" bold>
          🏛️ Next FOMC Meeting: {formatDate(nextFOMC.date)} (T{daysToFOMC >= 0 ? '-' : '+'}{Math.abs(daysToFOMC)} days)
        </Text>
        <Text color="gray">
          Expected Move: ~{nextFOMC.expectedMove.toFixed(1)}% (based on current volatility)
        </Text>
        <Text> </Text>
      </Box>

      {/* Current Volatility Levels - Real Data */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow" bold>──── Current Volatility Levels ────</Text>
        {Array.from(volatilityProfiles.entries()).map(([asset, profile]) => (
          <Box key={asset} flexDirection="row" justifyContent="space-between">
            <Text>{asset} Volatility: </Text>
            <Text color={getVolColor(profile.currentLevel, profile.historicalAverage)}>
              {profile.currentLevel.toFixed(1)}% 
              {renderVolChange(profile.currentLevel, profile.historicalAverage)}
            </Text>
          </Box>
        ))}
        <Text> </Text>
      </Box>

      {/* FOMC Timing Context */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow" bold>──── FOMC Timing Context ────</Text>
        <Text>Days to FOMC: <Text color="cyan">{Math.abs(daysToFOMC)}</Text></Text>
        <Text>Current Phase: <Text color="cyan">{getFOMCPhase(daysToFOMC)}</Text></Text>
        <Text>Vol Regime: <Text color={getVolRegimeColor(volatilityProfiles)}>{getVolRegime(volatilityProfiles)}</Text></Text>
        <Text> </Text>
      </Box>

      {/* Volatility Intelligence */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow" bold>──── Volatility Intelligence ────</Text>
        <Text>Current Environment: <Text color="cyan">{getVolEnvironmentDescription(volatilityProfiles, daysToFOMC)}</Text></Text>
        <Text>FOMC Premium: <Text color={getFOMCPremiumColor(volatilityProfiles)}>{getFOMCPremium(volatilityProfiles).toFixed(1)} vol points</Text></Text>
        <Text>Recommended Focus: <Text color="cyan">{getRecommendedFocus(daysToFOMC, volatilityProfiles)}</Text></Text>
        <Text> </Text>
      </Box>

      {/* Realistic Analysis */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow" bold>──── Market Context ────</Text>
        {recommendations.map((rec, index) => (
          <Box key={index} flexDirection="column">
            <Text>
              {rec.asset} Analysis: <Text color="cyan">{rec.volTiming.reasoning}</Text>
            </Text>
            <Text>
              Timing Window: <Text color="cyan">{rec.volTiming.entryWindow}</Text>
            </Text>
            <Text>
              Strategy: <Text color="cyan">Monitor vol patterns approaching FOMC</Text>
            </Text>
          </Box>
        ))}
        <Text> </Text>
      </Box>

      {/* What's Missing Section */}
      {!dataSourceStatus.optionsAvailable && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="red" bold>⚠️  Limited Analysis Available</Text>
          <Text color="gray">• Options flow data requires premium market data subscription</Text>
          <Text color="gray">• Strategy recommendations need real-time options pricing</Text>
          <Text color="gray">• Historical pattern analysis requires extensive backtesting data</Text>
          <Text color="gray">• Set ALPHA_VANTAGE_API_KEY for enhanced VIX analysis</Text>
          <Text> </Text>
        </Box>
      )}

      {/* Next Steps */}
      <Box flexDirection="column">
        <Text color="yellow" bold>──── Next Steps ────</Text>
        <Text>1. Monitor volatility levels as FOMC approaches</Text>
        <Text>2. Watch for vol expansion/compression patterns</Text>
        <Text>3. Consider volatility protection strategies</Text>
        <Text>4. Prepare for post-FOMC vol normalization</Text>
      </Box>
    </Box>
  );
}

// Helper functions
function calculateDaysToFOMC(fomcDate: string): number {
  const today = new Date();
  const fomc = new Date(fomcDate);
  const diffTime = fomc.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function getVolColor(current: number, historical: number): string {
  const ratio = current / historical;
  if (ratio > 1.2) return 'red';
  if (ratio < 0.8) return 'green';
  return 'cyan';
}

function renderVolChange(current: number, historical: number): string {
  const change = ((current - historical) / historical) * 100;
  const sign = change >= 0 ? '+' : '';
  return ` (${sign}${change.toFixed(1)}% vs 30-day avg)`;
}

function getFOMCPhase(daysToFOMC: number): string {
  if (Math.abs(daysToFOMC) <= 1) return 'FOMC WEEK';
  if (daysToFOMC > 0 && daysToFOMC <= 7) return 'PRE-FOMC';
  if (daysToFOMC < 0 && daysToFOMC >= -7) return 'POST-FOMC';
  return 'NORMAL PERIOD';
}

function getVolRegime(volatilityProfiles: Map<string, VolatilityProfile>): string {
  const avgRatio = Array.from(volatilityProfiles.values())
    .reduce((sum, profile) => sum + (profile.currentLevel / profile.historicalAverage), 0) / volatilityProfiles.size;
  
  if (avgRatio > 1.3) return 'HIGH VOLATILITY';
  if (avgRatio > 1.1) return 'ELEVATED';
  if (avgRatio < 0.9) return 'LOW VOLATILITY';
  return 'NORMAL';
}

function getVolRegimeColor(volatilityProfiles: Map<string, VolatilityProfile>): string {
  const regime = getVolRegime(volatilityProfiles);
  if (regime.includes('HIGH')) return 'red';
  if (regime.includes('ELEVATED')) return 'yellow';
  if (regime.includes('LOW')) return 'green';
  return 'cyan';
}

function getVolEnvironmentDescription(volatilityProfiles: Map<string, VolatilityProfile>, daysToFOMC: number): string {
  const regime = getVolRegime(volatilityProfiles);
  const phase = getFOMCPhase(daysToFOMC);
  
  if (phase === 'PRE-FOMC' && regime.includes('LOW')) {
    return 'Potential vol expansion opportunity';
  } else if (phase === 'PRE-FOMC' && regime.includes('HIGH')) {
    return 'Possible vol compression ahead of FOMC';
  } else if (phase === 'POST-FOMC') {
    return 'Vol normalization period';
  } else {
    return `${regime.toLowerCase()} with ${Math.abs(daysToFOMC)} days to FOMC`;
  }
}

function getFOMCPremium(volatilityProfiles: Map<string, VolatilityProfile>): number {
  return Array.from(volatilityProfiles.values())
    .reduce((sum, profile) => sum + profile.fomcPremium, 0) / volatilityProfiles.size;
}

function getFOMCPremiumColor(volatilityProfiles: Map<string, VolatilityProfile>): string {
  const premium = getFOMCPremium(volatilityProfiles);
  if (premium > 2) return 'red';
  if (premium > 1) return 'yellow';
  if (premium < -1) return 'green';
  return 'cyan';
}

function getRecommendedFocus(daysToFOMC: number, volatilityProfiles: Map<string, VolatilityProfile>): string {
  const regime = getVolRegime(volatilityProfiles);
  
  if (Math.abs(daysToFOMC) <= 3) {
    return 'FOMC event monitoring and vol positioning';
  } else if (regime.includes('HIGH')) {
    return 'Monitor for vol compression opportunities';
  } else if (regime.includes('LOW')) {
    return 'Watch for vol expansion setups';
  } else {
    return 'General volatility monitoring';
  }
}

function getDataSourceText(status: { vixAvailable: boolean; optionsAvailable: boolean }): string {
  const sources = [];
  
  if (status.vixAvailable) {
    sources.push('Real VIX data');
  } else {
    sources.push('Estimated VIX');
  }
  
  sources.push('Fed calendar');
  
  if (!status.optionsAvailable) {
    sources.push('Limited options analysis');
  }
  
  return sources.join(', ');
}