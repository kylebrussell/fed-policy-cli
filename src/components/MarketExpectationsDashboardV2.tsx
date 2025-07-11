// /src/components/MarketExpectationsDashboardV2.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { MarketExpectationsAnalysis } from '../services/marketExpectations';
import {
  formatSectionHeader,
  formatSubheader,
  formatPercentage,
  formatBasisPoints,
  formatConfidenceBar,
  formatExecutiveSummary,
  ExecutiveSummary
} from '../utils/displayUtils';

interface MarketExpectationsDashboardV2Props {
  analysis: MarketExpectationsAnalysis;
}

const MarketExpectationsDashboardV2: React.FC<MarketExpectationsDashboardV2Props> = ({ analysis }) => {
  const { latestYieldCurve, fedProjections, marketVsFedDivergence, tradingSignals } = analysis;
  
  // Generate executive summary
  const getExecutiveSummary = (): ExecutiveSummary => {
    const divergence = marketVsFedDivergence[marketVsFedDivergence.length - 1];
    const divergenceBp = divergence?.divergence ? divergence.divergence * 100 : 0;
    const isInverted = latestYieldCurve.isInverted;
    
    let mainInsight = 'Analyzing market expectations vs Fed projections';
    const keyTakeaways = [];
    
    // Main insight based on divergence
    if (Math.abs(divergenceBp) > 25) {
      const direction = divergenceBp > 0 ? 'hawkish' : 'dovish';
      mainInsight = `Market positioning ${Math.abs(divergenceBp).toFixed(0)}bp ${direction} vs Fed guidance`;
      keyTakeaways.push(`Significant ${direction} divergence creates trading opportunity`);
    }
    
    // Yield curve insight
    if (isInverted) {
      keyTakeaways.push(`Yield curve inversion signals recession risk (${latestYieldCurve.slope2Y10Y}bp 2s10s)`);
    } else if (latestYieldCurve.slope2Y10Y > 100) {
      keyTakeaways.push(`Steep yield curve (${latestYieldCurve.slope2Y10Y}bp) suggests growth optimism`);
    }
    
    // Fed projection insight
    if (fedProjections.length > 0) {
      const latestProj = fedProjections[0];
      keyTakeaways.push(`Fed targets ${latestProj.median_rate?.toFixed(2)}% by ${latestProj.projection_year}`);
    }
    
    // Trading signal insight
    const strongSignals = tradingSignals.filter(s => s.confidence > 70);
    if (strongSignals.length > 0) {
      keyTakeaways.push(`${strongSignals.length} high-confidence trading signals identified`);
    }
    
    const avgConfidence = tradingSignals.reduce((sum, s) => sum + s.confidence, 0) / (tradingSignals.length || 1);
    
    return {
      mainInsight,
      keyTakeaways,
      timeframe: 'Next 6-18 months',
      confidence: Math.round(avgConfidence)
    };
  };
  
  // Format yield curve display
  const formatYieldCurve = () => {
    const curve = latestYieldCurve.curve;
    const keyPoints = ['3M', '2Y', '10Y', '30Y'];
    const filtered = curve.filter(p => keyPoints.includes(p.maturity));
    
    return (
      <Box flexDirection="column">
        <Text>{formatSubheader('Yield Curve Snapshot')}</Text>
        <Box marginTop={1}>
          {filtered.map((point, i) => (
            <Box key={i} marginRight={3}>
              <Text color="gray">{point.maturity}: </Text>
              <Text color={point.yield > 4.5 ? 'red' : point.yield < 3.5 ? 'green' : 'yellow'}>
                {point.yield.toFixed(2)}%
              </Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text>
            2s10s: <Text color={latestYieldCurve.slope2Y10Y < 0 ? 'red' : 'green'}>
              {formatBasisPoints(latestYieldCurve.slope2Y10Y)}
            </Text>
            {latestYieldCurve.isInverted && <Text color="red" bold> ⚠️ INVERTED</Text>}
          </Text>
        </Box>
      </Box>
    );
  };
  
  // Format divergence analysis
  const formatDivergenceAnalysis = () => {
    const latest = marketVsFedDivergence[marketVsFedDivergence.length - 1];
    if (!latest?.divergence) return null;
    
    const divergenceBp = latest.divergence * 100;
    const isDivergent = Math.abs(divergenceBp) > 25;
    
    return (
      <Box flexDirection="column">
        <Text>{formatSubheader('Market vs Fed Divergence')}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>
            Market Rate: {latest.impliedRate?.toFixed(2)}% | 
            Fed Target: {latest.fedProjection?.toFixed(2)}%
          </Text>
          <Box marginTop={1}>
            <Text bold color={isDivergent ? (divergenceBp > 0 ? 'red' : 'green') : 'yellow'}>
              {divergenceBp > 0 ? '📈' : '📉'} {formatBasisPoints(Math.abs(divergenceBp))} 
              {divergenceBp > 0 ? ' HAWKISH' : ' DOVISH'} BIAS
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };
  
  // Format key trading signals
  const formatKeySignals = () => {
    const topSignals = tradingSignals
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
    
    if (topSignals.length === 0) return null;
    
    return (
      <Box flexDirection="column">
        <Text>{formatSubheader('Trading Signals')}</Text>
        {topSignals.map((signal, i) => (
          <Box key={i} marginTop={1} flexDirection="column">
            <Text>
              {i + 1}. <Text bold color={signal.strength === 'STRONG' ? 'green' : 'yellow'}>
                {signal.type.replace(/_/g, ' ')}
              </Text>
            </Text>
            <Box marginLeft={3}>
              <Text color="gray">{signal.description}</Text>
            </Box>
            <Box marginLeft={3}>
              <Text>
                Confidence: {formatConfidenceBar(signal.confidence, 8)} {signal.confidence.toFixed(0)}%
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };
  
  const executiveSummary = getExecutiveSummary();
  
  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan" bold>
        {formatSectionHeader('MARKET EXPECTATIONS ANALYSIS')}
      </Text>
      
      <Box marginTop={2} marginBottom={2}>
        <Text>{formatExecutiveSummary(executiveSummary)}</Text>
      </Box>
      
      <Box marginBottom={2}>
        {formatYieldCurve()}
      </Box>
      
      <Box marginBottom={2}>
        {formatDivergenceAnalysis()}
      </Box>
      
      <Box marginBottom={2}>
        {formatKeySignals()}
      </Box>
      
      <Box>
        <Text color="gray">
          Last updated: {latestYieldCurve.date} | 
          Data: FRED Treasury yields + FOMC dot plot projections
        </Text>
      </Box>
    </Box>
  );
};

export default MarketExpectationsDashboardV2;