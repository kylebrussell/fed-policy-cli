// /src/utils/displayUtils.ts

import { Text } from 'ink';
import React from 'react';

export const FED_ANALYZER_ASCII = `
 ███████╗███████╗██████╗     ██████╗  ██████╗ ██╗     ██╗ ██████╗██╗   ██╗
 ██╔════╝██╔════╝██╔══██╗    ██╔══██╗██╔═══██╗██║     ██║██╔════╝╚██╗ ██╔╝
 █████╗  █████╗  ██║  ██║    ██████╔╝██║   ██║██║     ██║██║      ╚████╔╝ 
 ██╔══╝  ██╔══╝  ██║  ██║    ██╔═══╝ ██║   ██║██║     ██║██║       ╚██╔╝  
 ██║     ███████╗██████╔╝    ██║     ╚██████╔╝███████╗██║╚██████╗   ██║   
 ╚═╝     ╚══════╝╚═════╝     ╚═╝      ╚═════╝ ╚══════╝╚═╝ ╚═════╝   ╚═╝   
                                                                            
 ████████╗██████╗  █████╗ ██████╗ ███████╗██████╗                          
 ╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗                         
    ██║   ██████╔╝███████║██║  ██║█████╗  ██████╔╝                         
    ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝  ██╔══██╗                         
    ██║   ██║  ██║██║  ██║██████╔╝███████╗██║  ██║                         
    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝  v5.1                  
`;

export const QUICK_START_TIPS = [
  {
    icon: '📊',
    title: 'Analyze Current Conditions',
    command: 'analyze --template balanced-economic',
    description: 'Find historical Fed policy analogues'
  },
  {
    icon: '💹',
    title: 'Market vs Fed Expectations',
    command: 'market-expectations',
    description: 'Yield curve & divergence analysis'
  },
  {
    icon: '🌍',
    title: 'Cross-Asset Playbook',
    command: 'cross-asset-analysis',
    description: 'Multi-asset Fed cycle positioning'
  },
  {
    icon: '🎮',
    title: 'Policy Simulator',
    command: 'simulate',
    description: 'What-if Fed scenario modeling'
  }
];

export const formatSectionHeader = (title: string, width: number = 60): string => {
  const padding = Math.max(0, width - title.length - 2);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return `${'═'.repeat(leftPad)} ${title} ${'═'.repeat(rightPad)}`;
};

export const formatSubheader = (title: string): string => {
  return `──── ${title} ────`;
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  const formatted = value.toFixed(decimals);
  return value >= 0 ? `+${formatted}%` : `${formatted}%`;
};

export const formatBasisPoints = (value: number): string => {
  return value >= 0 ? `+${value}bp` : `${value}bp`;
};

export const formatConfidenceBar = (confidence: number, width: number = 10): string => {
  const filled = Math.round((confidence / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
};

export const getSignalEmoji = (type: 'BUY' | 'SELL' | 'HOLD'): string => {
  switch (type) {
    case 'BUY': return '🟢';
    case 'SELL': return '🔴';
    case 'HOLD': return '🟡';
  }
};

export const getConfidenceLevel = (confidence: number): string => {
  if (confidence >= 80) return 'HIGH';
  if (confidence >= 60) return 'MEDIUM';
  return 'LOW';
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Executive summary formatter
export interface ExecutiveSummary {
  mainInsight: string;
  keyTakeaways: string[];
  timeframe: string;
  confidence: number;
}

export const formatExecutiveSummary = (summary: ExecutiveSummary): string => {
  const lines = [
    formatSectionHeader('EXECUTIVE SUMMARY'),
    '',
    `🎯 ${summary.mainInsight}`,
    '',
    'Key Takeaways:',
    ...summary.keyTakeaways.map(t => `  • ${t}`),
    '',
    `Timeframe: ${summary.timeframe}`,
    `Confidence: ${formatConfidenceBar(summary.confidence)} ${summary.confidence}%`,
    '═'.repeat(60)
  ];
  
  return lines.join('\n');
};

// Asset class performance formatter
export interface AssetClassSummary {
  name: string;
  performance: number;
  signal: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export const formatAssetClassSummary = (assets: AssetClassSummary[]): string => {
  const lines = [formatSubheader('Asset Class Performance')];
  
  const sorted = [...assets].sort((a, b) => b.performance - a.performance);
  
  sorted.forEach(asset => {
    const emoji = asset.signal === 'positive' ? '🟢' : 
                  asset.signal === 'negative' ? '🔴' : '🟡';
    const perf = formatPercentage(asset.performance);
    const conf = formatConfidenceBar(asset.confidence, 5);
    
    lines.push(`${emoji} ${asset.name.padEnd(15)} ${perf.padStart(8)} ${conf}`);
  });
  
  return lines.join('\n');
};

// Trading signal formatter
export interface TradingSignalSummary {
  action: 'BUY' | 'SELL' | 'HOLD';
  asset: string;
  expectedReturn: number;
  confidence: number;
  reasoning: string;
}

export const formatTradingSignals = (signals: TradingSignalSummary[], maxSignals: number = 3): string => {
  const lines = [formatSubheader('Top Trading Signals')];
  
  const topSignals = signals
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxSignals);
  
  topSignals.forEach((signal, i) => {
    const emoji = getSignalEmoji(signal.action);
    const ret = formatPercentage(signal.expectedReturn);
    
    lines.push('');
    lines.push(`${i + 1}. ${emoji} ${signal.action} ${signal.asset}`);
    lines.push(`   Expected: ${ret} | Confidence: ${signal.confidence}%`);
    lines.push(`   ${truncateText(signal.reasoning, 60)}`);
  });
  
  return lines.join('\n');
};

// Historical context formatter
export interface HistoricalContext {
  period: string;
  description: string;
  similarity: number;
}

export const formatHistoricalContext = (contexts: HistoricalContext[]): string => {
  const lines = [formatSubheader('Historical Analogues')];
  
  contexts.forEach((ctx, i) => {
    lines.push(`${i + 1}. ${ctx.period} - ${ctx.description}`);
    lines.push(`   Similarity: ${formatConfidenceBar(ctx.similarity, 8)} ${ctx.similarity}%`);
  });
  
  return lines.join('\n');
};

// Risk warning formatter
export interface RiskWarning {
  level: 'high' | 'medium' | 'low';
  message: string;
}

export const formatRiskWarnings = (warnings: RiskWarning[]): string => {
  if (warnings.length === 0) return '';
  
  const lines = ['', formatSubheader('Risk Warnings')];
  
  warnings.forEach(warning => {
    const emoji = warning.level === 'high' ? '🚨' :
                  warning.level === 'medium' ? '⚠️' : 'ℹ️';
    lines.push(`${emoji} ${warning.message}`);
  });
  
  return lines.join('\n');
};

// Progress indicator for loading states
export const getProgressIndicator = (progress: number): string => {
  const width = 30;
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${progress}%`;
};