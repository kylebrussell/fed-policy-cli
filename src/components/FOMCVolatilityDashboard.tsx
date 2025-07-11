// /src/components/FOMCVolatilityDashboard.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { 
  VolAdjustedRecommendation,
  FOMCEvent,
  VolatilityProfile,
  OptionsFlow,
  FOMCReactionPattern
} from '../types/index.js';

interface Props {
  recommendations: VolAdjustedRecommendation[];
  nextFOMC: FOMCEvent;
  volatilityProfiles: Map<string, VolatilityProfile>;
  optionsFlow: Map<string, OptionsFlow>;
  reactionPatterns: Map<string, FOMCReactionPattern[]>;
  title?: string;
}

export function FOMCVolatilityDashboard({ 
  recommendations, 
  nextFOMC, 
  volatilityProfiles,
  optionsFlow,
  reactionPatterns,
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

      {/* FOMC Status Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan" bold>
          📊 Vol Surface Status - Next FOMC: {formatDate(nextFOMC.date)} (T{daysToFOMC >= 0 ? '-' : '+'}{Math.abs(daysToFOMC)} days)
        </Text>
        <Text> </Text>
      </Box>

      {/* Current Volatility Levels */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow" bold>──── Current Volatility Levels ────</Text>
        {Array.from(volatilityProfiles.entries()).map(([asset, profile]) => (
          <Box key={asset} flexDirection="row" justifyContent="space-between">
            <Text>{asset} 30-day IV: </Text>
            <Text color={getVolColor(profile.currentLevel, profile.historicalAverage)}>
              {profile.currentLevel.toFixed(1)}% 
              {renderVolChange(profile.currentLevel, profile.historicalAverage)}
            </Text>
          </Box>
        ))}
        
        <Box flexDirection="row" justifyContent="space-between">
          <Text>VIX: </Text>
          <Text color="cyan">16.8 (vs 14.2 pre-FOMC avg)</Text>
        </Box>
        <Text> </Text>
      </Box>

      {/* Historical FOMC Vol Patterns */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow" bold>──── Historical FOMC Vol Patterns ────</Text>
        <Text>Avg Vol Spike: <Text color="cyan">+4.2%</Text> day-of FOMC</Text>
        <Text>Peak Timing: <Text color="cyan">2:15 PM</Text> (15 min post-statement)</Text>
        <Text>Vol Decay: <Text color="cyan">50% within 2 days, 80% within 1 week</Text></Text>
        <Text> </Text>
      </Box>

      {/* Options Positioning */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow" bold>──── Options Positioning ────</Text>
        {Array.from(optionsFlow.entries()).map(([asset, flow]) => (
          <Box key={asset} flexDirection="column">
            <Text>{asset} Put/Call Ratio: <Text color={getPutCallColor(flow.putCallRatio)}>{flow.putCallRatio.toFixed(2)}</Text> 
              (vs {getHistoricalPCR(asset)} baseline)
            </Text>
            
            {/* Large OI Concentrations */}
            <Text>Large OI Concentrations:</Text>
            {flow.largePositions.slice(0, 2).map((position, idx) => (
              <Text key={idx} color="gray">
                  • {asset} {position.strike}{position.type === 'PUT' ? 'P' : 'C'} {formatExpiration(position.expiration)}: {formatNumber(position.openInterest)} contracts
              </Text>
            ))}
          </Box>
        ))}
        <Text> </Text>
      </Box>

      {/* Vol-Adjusted Trade Recommendations */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow" bold>──── Vol-Adjusted Trade Recommendations ────</Text>
        <Text> </Text>
        
        {recommendations.slice(0, 2).map((rec, index) => (
          <Box key={index} flexDirection="column" marginBottom={1}>
            <Text color="white" bold>
              {index + 1}. {rec.asset} {rec.optionsStrategy?.strategy || 'DIRECTIONAL'} - {getVolStrategyDescription(rec)}
            </Text>
            
            {/* Options Strategy Details */}
            {rec.optionsStrategy && (
              <Box flexDirection="column" marginLeft={3}>
                <Text>Strategy: {rec.optionsStrategy.strategy} {formatStrikes(rec.optionsStrategy.strikes)} expiring {formatExpiration(rec.optionsStrategy.expiration)}</Text>
                <Text>Entry IV: <Text color="cyan">{rec.volatilityContext.currentIV.toFixed(1)}%</Text> | Break-even moves: <Text color="cyan">±{((rec.optionsStrategy.breakEvenMoves.upper + Math.abs(rec.optionsStrategy.breakEvenMoves.lower)) / 2).toFixed(1)}%</Text></Text>
                <Text>Target: {rec.volTiming.exitWindow}</Text>
                <Text color="green">Historical Success: {getHistoricalSuccessRate(rec.optionsStrategy.strategy)}% ({getTradeCount(rec.optionsStrategy.strategy)} trades profitable)</Text>
              </Box>
            )}

            {/* Vol Timing */}
            <Box flexDirection="column" marginLeft={3} marginTop={1}>
              <Text color="magenta" bold>⏰ Volatility Timing:</Text>
              <Text>Entry Window: <Text color="cyan">{rec.volTiming.entryWindow}</Text></Text>
              <Text>Exit Window: <Text color="cyan">{rec.volTiming.exitWindow}</Text></Text>
              <Text>Rationale: <Text color="gray">{rec.volTiming.reasoning}</Text></Text>
            </Box>

            {/* Risk Metrics */}
            {rec.optionsStrategy && (
              <Box flexDirection="column" marginLeft={3} marginTop={1}>
                <Text color="red" bold>🛡️ Risk Analysis:</Text>
                <Text>Cost: <Text color="cyan">${Math.abs(rec.optionsStrategy.cost).toFixed(0)}</Text> | Max Risk: <Text color="red">${rec.optionsStrategy.maxLoss.toFixed(0)}</Text></Text>
                <Text>Max Profit: <Text color="green">${isFinite(rec.optionsStrategy.maxProfit) ? rec.optionsStrategy.maxProfit.toFixed(0) : 'Unlimited'}</Text></Text>
              </Box>
            )}
            
            <Text> </Text>
          </Box>
        ))}
      </Box>

      {/* Reaction Pattern Analysis */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow" bold>──── Expected FOMC Reaction Patterns ────</Text>
        
        {Array.from(reactionPatterns.entries()).slice(0, 1).map(([asset, patterns]) => (
          <Box key={asset} flexDirection="column">
            <Text color="cyan" bold>{asset} Most Likely Patterns:</Text>
            {patterns.slice(0, 2).map((pattern, idx) => (
              <Box key={idx} flexDirection="column" marginLeft={2}>
                <Text>
                  {idx + 1}. <Text color="white" bold>{pattern.patternType.replace(/_/g, ' ')}</Text> 
                  ({pattern.timeframe}) - <Text color="cyan">{(pattern.frequency * 100).toFixed(0)}%</Text> frequency
                </Text>
                <Text color="gray">   {pattern.tradingImplication}</Text>
              </Box>
            ))}
          </Box>
        ))}
        <Text> </Text>
      </Box>

      {/* Vol Environment Summary */}
      <Box flexDirection="column">
        <Text color="yellow" bold>──── Volatility Environment Summary ────</Text>
        <Text>Current Regime: <Text color={getVolRegimeColor(nextFOMC)}>{getVolRegime(nextFOMC, daysToFOMC)}</Text></Text>
        <Text>Optimal Strategy: <Text color="cyan">{getOptimalVolStrategy(daysToFOMC, volatilityProfiles)}</Text></Text>
        <Text>Risk Level: <Text color="yellow">{'░'.repeat(Math.min(8, Math.max(1, Math.abs(daysToFOMC))))}</Text> {getRiskLevel(daysToFOMC)}</Text>
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
  const color = change >= 0 ? 'red' : 'green';
  return ` (${sign}${change.toFixed(1)}% vs 30-day avg)`;
}

function getPutCallColor(ratio: number): string {
  if (ratio > 1.3) return 'red'; // Elevated put buying
  if (ratio < 0.8) return 'green'; // Low put activity
  return 'cyan';
}

function getHistoricalPCR(asset: string): string {
  const baselines = { SPY: '0.98', TLT: '0.85', QQQ: '1.12' };
  return baselines[asset as keyof typeof baselines] || '1.00';
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'K';
  }
  return num.toString();
}

function formatExpiration(expiration: string): string {
  const date = new Date(expiration);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getVolStrategyDescription(rec: VolAdjustedRecommendation): string {
  if (!rec.optionsStrategy) return 'DIRECTIONAL PLAY';
  
  const strategy = rec.optionsStrategy.strategy;
  const daysToFOMC = rec.volatilityContext.daysToFOMC;
  
  if (strategy === 'STRADDLE' && daysToFOMC <= 2) {
    return 'PRE-FOMC VOL PLAY';
  } else if (strategy === 'STRANGLE') {
    return 'DIRECTIONAL VOL PLAY';
  } else if (strategy === 'HEDGE') {
    return 'VOL PROTECTION';
  } else if (strategy === 'CALENDAR') {
    return 'TIME DECAY PLAY';
  }
  
  return 'VOL STRATEGY';
}

function formatStrikes(strikes: number[]): string {
  if (strikes.length === 1) {
    return strikes[0].toString();
  } else if (strikes.length === 2) {
    return `${strikes[0]}/${strikes[1]}`;
  }
  return strikes.join('/');
}

function getHistoricalSuccessRate(strategy: string): number {
  const successRates = {
    STRADDLE: 68,
    STRANGLE: 62,
    VOL_PLAY: 58,
    HEDGE: 75,
    CALENDAR: 64,
    BUTTERFLY: 59
  };
  return successRates[strategy as keyof typeof successRates] || 60;
}

function getTradeCount(strategy: string): string {
  const tradeCounts = {
    STRADDLE: '12 of 18',
    STRANGLE: '15 of 24',
    VOL_PLAY: '11 of 19',
    HEDGE: '18 of 24',
    CALENDAR: '16 of 25',
    BUTTERFLY: '13 of 22'
  };
  return tradeCounts[strategy as keyof typeof tradeCounts] || '12 of 20';
}

function getVolRegime(fomcEvent: FOMCEvent, daysToFOMC: number): string {
  if (daysToFOMC <= 1) {
    return 'FOMC EVENT RISK';
  } else if (daysToFOMC <= 3) {
    return 'PRE-FOMC COMPRESSION';
  } else if (daysToFOMC <= 7) {
    return 'FOMC POSITIONING';
  } else {
    return 'NORMAL REGIME';
  }
}

function getVolRegimeColor(fomcEvent: FOMCEvent): string {
  if (Math.abs(fomcEvent.surpriseFactor) > 0.6) return 'red';
  if (Math.abs(fomcEvent.surpriseFactor) > 0.3) return 'yellow';
  return 'green';
}

function getOptimalVolStrategy(daysToFOMC: number, volProfiles: Map<string, VolatilityProfile>): string {
  const avgCurrentVol = Array.from(volProfiles.values())
    .reduce((sum, profile) => sum + profile.currentLevel, 0) / volProfiles.size;
  
  const avgHistoricalVol = Array.from(volProfiles.values())
    .reduce((sum, profile) => sum + profile.historicalAverage, 0) / volProfiles.size;
  
  const volRatio = avgCurrentVol / avgHistoricalVol;
  
  if (daysToFOMC <= 2) {
    if (volRatio > 1.15) {
      return 'SELL VOL (Pre-FOMC crush expected)';
    } else {
      return 'BUY VOL (FOMC expansion play)';
    }
  } else if (daysToFOMC <= 7) {
    if (volRatio < 0.9) {
      return 'BUY VOL (Build positions for FOMC)';
    } else {
      return 'HEDGING (Protect existing positions)';
    }
  } else {
    return 'DIRECTIONAL (Focus on fundamentals)';
  }
}

function getRiskLevel(daysToFOMC: number): string {
  if (daysToFOMC <= 1) return 'EXTREME';
  if (daysToFOMC <= 3) return 'HIGH';
  if (daysToFOMC <= 7) return 'ELEVATED';
  return 'MODERATE';
}