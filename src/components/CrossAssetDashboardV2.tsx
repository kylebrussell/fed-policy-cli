// /src/components/CrossAssetDashboardV2.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { 
  CrossAssetAnalogue, 
  CrossAssetSummary, 
  CrossAssetTradingSignal 
} from '../services/crossAssetAnalysis';
import {
  formatSectionHeader,
  formatSubheader,
  formatPercentage,
  formatConfidenceBar,
  getSignalEmoji,
  formatExecutiveSummary,
  formatAssetClassSummary,
  formatTradingSignals,
  formatHistoricalContext,
  formatRiskWarnings,
  ExecutiveSummary,
  AssetClassSummary,
  TradingSignalSummary,
  HistoricalContext,
  RiskWarning
} from '../utils/displayUtils';

interface CrossAssetDashboardV2Props {
  analogues: CrossAssetAnalogue[];
  summary: CrossAssetSummary;
  tradingSignals: CrossAssetTradingSignal[];
}

const CrossAssetDashboardV2: React.FC<CrossAssetDashboardV2Props> = ({ 
  analogues, 
  summary, 
  tradingSignals 
}) => {
  // Generate executive summary
  const getExecutiveSummary = (): ExecutiveSummary => {
    const topPerformer = summary.bestPerformers[0];
    const worstPerformer = summary.worstPerformers[0];
    const avgConfidence = tradingSignals.reduce((sum, s) => sum + s.confidence, 0) / tradingSignals.length;
    
    let mainInsight = 'Analyzing cross-asset performance during Fed policy analogues';
    
    if (topPerformer && worstPerformer) {
      if (topPerformer.assetClass === 'Precious Metals' && worstPerformer.assetClass === 'Commodities') {
        mainInsight = 'During similar Fed cycles, defensive positioning in precious metals outperformed risk assets';
      } else if (summary.currencyStrength.dollarDirection === 'strengthening') {
        mainInsight = 'Historical pattern shows USD strength during similar Fed policy periods';
      } else if (worstPerformer.totalReturn < -10) {
        mainInsight = 'Risk-off environment characterized similar historical Fed policy periods';
      }
    }
    
    const keyTakeaways = [];
    
    // Add asset class insights
    if (summary.bestPerformers.length > 0) {
      const bestClass = summary.bestPerformers[0].assetClass;
      const avgReturn = summary.bestPerformers
        .filter(p => p.assetClass === bestClass)
        .reduce((sum, p) => sum + p.totalReturn, 0) / summary.bestPerformers.length;
      keyTakeaways.push(`${bestClass} averaged ${formatPercentage(avgReturn)} returns`);
    }
    
    // Add currency insight
    if (summary.currencyStrength.magnitude > 2) {
      keyTakeaways.push(`USD ${summary.currencyStrength.dollarDirection} by ${summary.currencyStrength.magnitude.toFixed(1)}%`);
    }
    
    // Add rotation insight
    if (summary.sectorRotation.intoSectors.length > 0) {
      keyTakeaways.push(`Rotation into ${summary.sectorRotation.intoSectors.join(', ')}`);
    }
    
    // Add risk insight
    if (summary.worstPerformers[0]?.totalReturn < -15) {
      keyTakeaways.push('Significant downside risk in commodities/cyclicals');
    }
    
    return {
      mainInsight,
      keyTakeaways,
      timeframe: `Based on ${analogues.length} historical periods`,
      confidence: Math.round(avgConfidence)
    };
  };
  
  // Generate asset class summary
  const getAssetClassSummary = (): AssetClassSummary[] => {
    const assetClassMap = new Map<string, { returns: number[], count: number }>();
    
    analogues.forEach(analogue => {
      analogue.assetPerformance.forEach(perf => {
        if (!assetClassMap.has(perf.assetClass)) {
          assetClassMap.set(perf.assetClass, { returns: [], count: 0 });
        }
        const data = assetClassMap.get(perf.assetClass)!;
        data.returns.push(perf.totalReturn);
        data.count++;
      });
    });
    
    const summaries: AssetClassSummary[] = [];
    
    assetClassMap.forEach((data, assetClass) => {
      const avgReturn = data.returns.reduce((sum, r) => sum + r, 0) / data.returns.length;
      const signal = avgReturn > 5 ? 'positive' : avgReturn < -5 ? 'negative' : 'neutral';
      const volatility = Math.sqrt(
        data.returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / data.returns.length
      );
      const confidence = Math.max(0, Math.min(100, 100 - volatility * 2));
      
      summaries.push({
        name: assetClass,
        performance: avgReturn,
        signal,
        confidence: Math.round(confidence)
      });
    });
    
    return summaries;
  };
  
  // Generate trading signal summary
  const getTradingSignalSummary = (): TradingSignalSummary[] => {
    return tradingSignals.map(signal => ({
      action: signal.type,
      asset: signal.asset,
      expectedReturn: signal.expectedReturn,
      confidence: signal.confidence,
      reasoning: signal.reasoning
    }));
  };
  
  // Generate historical context
  const getHistoricalContext = (): HistoricalContext[] => {
    return analogues.slice(0, 3).map(analogue => ({
      period: `${analogue.startDate} to ${analogue.endDate}`,
      description: analogue.fedAction || 'Fed policy period',
      similarity: Math.round(100 - analogue.distance * 100)
    }));
  };
  
  // Generate risk warnings
  const getRiskWarnings = (): RiskWarning[] => {
    const warnings: RiskWarning[] = [];
    
    // Check for extreme losses
    const extremeLosses = summary.worstPerformers.filter(p => p.totalReturn < -20);
    if (extremeLosses.length > 0) {
      warnings.push({
        level: 'high',
        message: `${extremeLosses.length} assets showed >20% losses in similar periods`
      });
    }
    
    // Check for low confidence
    const lowConfidenceSignals = tradingSignals.filter(s => s.confidence < 50);
    if (lowConfidenceSignals.length > tradingSignals.length / 2) {
      warnings.push({
        level: 'medium',
        message: 'Low confidence in signals - consider smaller position sizes'
      });
    }
    
    // Check for concentration risk
    const assetClasses = new Set(summary.bestPerformers.map(p => p.assetClass));
    if (assetClasses.size === 1) {
      warnings.push({
        level: 'medium',
        message: 'Performance concentrated in single asset class - diversification recommended'
      });
    }
    
    return warnings;
  };
  
  const executiveSummary = getExecutiveSummary();
  const assetClassSummary = getAssetClassSummary();
  const signalSummary = getTradingSignalSummary();
  const historicalContext = getHistoricalContext();
  const riskWarnings = getRiskWarnings();
  
  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan" bold>
        {formatSectionHeader('CROSS-ASSET FED PLAYBOOK')}
      </Text>
      
      <Box marginTop={2} marginBottom={2}>
        <Text>{formatExecutiveSummary(executiveSummary)}</Text>
      </Box>
      
      <Box marginBottom={2}>
        <Text>{formatAssetClassSummary(assetClassSummary)}</Text>
      </Box>
      
      <Box marginBottom={2}>
        <Text>{formatTradingSignals(signalSummary, 5)}</Text>
      </Box>
      
      <Box marginBottom={2}>
        <Text>{formatHistoricalContext(historicalContext)}</Text>
      </Box>
      
      <Text>{formatRiskWarnings(riskWarnings)}</Text>
      
      <Box marginTop={2}>
        <Text color="gray">
          💡 Analysis based on {analogues.length} historical periods with similar Fed policy conditions
        </Text>
      </Box>
    </Box>
  );
};

export default CrossAssetDashboardV2;