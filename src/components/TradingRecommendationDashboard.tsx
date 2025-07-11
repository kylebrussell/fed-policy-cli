// /src/components/TradingRecommendationDashboard.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { TradingRecommendation, ScenarioOutcome } from '../types/index.js';

interface Props {
  recommendations: TradingRecommendation[];
  title?: string;
}

export function TradingRecommendationDashboard({ recommendations, title = "TRADING RECOMMENDATIONS" }: Props) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="yellow">⚠️  No trading recommendations available</Text>
      </Box>
    );
  }

  // Sort by confidence and expected return
  const sortedRecs = [...recommendations].sort((a, b) => {
    if (Math.abs(a.confidence - b.confidence) > 10) {
      return b.confidence - a.confidence;
    }
    return Math.abs(b.historicalContext.avgReturn) - Math.abs(a.historicalContext.avgReturn);
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="cyan">
        {'═'.repeat(Math.max(60, title.length + 10))}
      </Text>
      <Text bold color="cyan" textAlign="center">
        {` ${'═'.repeat(Math.floor((60 - title.length) / 2))} ${title} ${'═'.repeat(Math.floor((60 - title.length) / 2))} `}
      </Text>
      <Text bold color="cyan">
        {'═'.repeat(Math.max(60, title.length + 10))}
      </Text>

      {sortedRecs.map((rec, index) => (
        <RecommendationCard key={rec.id} recommendation={rec} index={index + 1} />
      ))}

      <PortfolioSummary recommendations={sortedRecs} />
    </Box>
  );
}

function RecommendationCard({ recommendation: rec, index }: { recommendation: TradingRecommendation; index: number }) {
  const confidenceColor = rec.confidence >= 75 ? 'green' : rec.confidence >= 60 ? 'yellow' : 'red';
  const actionColor = rec.action === 'BUY' ? 'green' : rec.action === 'SELL' || rec.action === 'SHORT' ? 'red' : 'blue';
  const returnColor = rec.historicalContext.avgReturn >= 0 ? 'green' : 'red';

  return (
    <Box flexDirection="column" marginTop={1} paddingLeft={1}>
      <Text bold color="white">
        {`${index}. ${rec.asset} - `}
        <Text color={actionColor} bold>{rec.action}</Text>
        {` (${rec.assetClass})`}
      </Text>
      
      {/* Key metrics row */}
      <Box marginLeft={3}>
        <Text color="gray">Expected Return: </Text>
        <Text color={returnColor} bold>
          {rec.historicalContext.avgReturn > 0 ? '+' : ''}{rec.historicalContext.avgReturn.toFixed(1)}%
        </Text>
        <Text color="gray"> | Confidence: </Text>
        <Text color={confidenceColor} bold>{rec.confidence}%</Text>
        <Text color="gray"> | Timeframe: </Text>
        <Text color="white">{rec.recommendation.timeframe}</Text>
      </Box>

      {/* Entry/Exit levels */}
      <EntryExitLevels recommendation={rec} />

      {/* Position sizing */}
      <PositionSizing recommendation={rec} />

      {/* Risk factors */}
      <RiskFactors recommendation={rec} />

      {/* Scenario analysis summary */}
      <ScenarioSummary scenarios={rec.scenarioAnalysis} />

      {/* Hedging recommendations */}
      {rec.hedges && rec.hedges.length > 0 && <HedgingSummary hedges={rec.hedges} />}

      <Text color="gray">{'─'.repeat(65)}</Text>
    </Box>
  );
}

function EntryExitLevels({ recommendation: rec }: { recommendation: TradingRecommendation }) {
  const levels = rec.recommendation;
  
  return (
    <Box flexDirection="column" marginLeft={3}>
      <Text color="cyan" bold>📊 Entry/Exit Strategy:</Text>
      
      <Box marginLeft={2}>
        {levels.entryPrice && (
          <Text color="gray">
            Entry: <Text color="white" bold>${levels.entryPrice.toFixed(2)}</Text>
            {levels.timing !== 'IMMEDIATE' && (
              <Text color="yellow"> ({levels.timing.replace(/_/g, ' ')})</Text>
            )}
          </Text>
        )}
        
        {levels.entryRange && (
          <Text color="gray">
            Entry Range: <Text color="white" bold>
              ${levels.entryRange.min.toFixed(2)} - ${levels.entryRange.max.toFixed(2)}
            </Text>
            <Text color="yellow"> ({levels.timing.replace(/_/g, ' ')})</Text>
          </Text>
        )}
      </Box>

      <Box marginLeft={2}>
        {levels.stopLoss && (
          <Text color="gray">
            Stop Loss: <Text color="red" bold>${levels.stopLoss.toFixed(2)}</Text>
          </Text>
        )}
        
        {levels.profitTarget && (
          <Text color="gray">
            Profit Target: <Text color="green" bold>${levels.profitTarget.toFixed(2)}</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}

function PositionSizing({ recommendation: rec }: { recommendation: TradingRecommendation }) {
  const sizing = rec.sizing;
  const methodColor = sizing.methodology === 'KELLY_CRITERION' ? 'green' : 
                     sizing.methodology === 'VOLATILITY_ADJUSTED' ? 'blue' : 'yellow';

  return (
    <Box flexDirection="column" marginLeft={3}>
      <Text color="magenta" bold>💰 Position Sizing:</Text>
      
      <Box marginLeft={2}>
        <Text color="gray">
          Portfolio Weight: <Text color="white" bold>{sizing.portfolioWeight.toFixed(1)}%</Text>
          <Text color="gray"> | Method: </Text>
          <Text color={methodColor}>{sizing.methodology.replace(/_/g, ' ')}</Text>
        </Text>
      </Box>
      
      <Box marginLeft={2}>
        <Text color="gray">
          Risk Budget: <Text color="white" bold>{sizing.riskBudget.toFixed(1)}%</Text>
          <Text color="gray"> | Max Position: </Text>
          <Text color="white" bold>${(sizing.maxPosition / 1000000).toFixed(1)}M</Text>
        </Text>
      </Box>
    </Box>
  );
}

function RiskFactors({ recommendation: rec }: { recommendation: TradingRecommendation }) {
  if (!rec.riskFactors || rec.riskFactors.length === 0) return null;

  return (
    <Box flexDirection="column" marginLeft={3}>
      <Text color="red" bold>⚠️  Risk Factors:</Text>
      {rec.riskFactors.slice(0, 3).map((risk, i) => (
        <Box key={i} marginLeft={2}>
          <Text color="yellow">• </Text>
          <Text color="gray">{risk}</Text>
        </Box>
      ))}
    </Box>
  );
}

function ScenarioSummary({ scenarios }: { scenarios: ScenarioOutcome[] }) {
  if (!scenarios || scenarios.length === 0) return null;

  const bestCase = scenarios.reduce((best, current) => 
    current.expectedReturn > best.expectedReturn ? current : best
  );
  
  const worstCase = scenarios.reduce((worst, current) => 
    current.expectedReturn < worst.expectedReturn ? current : worst
  );

  const mostLikely = scenarios.reduce((likely, current) => 
    current.probability > likely.probability ? current : likely
  );

  return (
    <Box flexDirection="column" marginLeft={3}>
      <Text color="blue" bold>🎯 Scenario Analysis:</Text>
      
      <Box marginLeft={2}>
        <Text color="gray">
          Most Likely ({mostLikely.probability.toFixed(0)}%): <Text color="white" bold>{mostLikely.scenario}</Text>
          <Text color={mostLikely.expectedReturn >= 0 ? 'green' : 'red'}>
            {' '}({mostLikely.expectedReturn > 0 ? '+' : ''}{mostLikely.expectedReturn.toFixed(1)}%)
          </Text>
        </Text>
      </Box>
      
      <Box marginLeft={2} flexDirection="column">
        <Text color="gray">
          Range: <Text color="red" bold>{worstCase.expectedReturn.toFixed(1)}%</Text>
          <Text color="gray"> to </Text>
          <Text color="green" bold>+{bestCase.expectedReturn.toFixed(1)}%</Text>
          <Text color="gray"> across {scenarios.length} scenarios</Text>
        </Text>
      </Box>
    </Box>
  );
}

function HedgingSummary({ hedges }: { hedges: Array<{ hedgeType: string; instrument: string; hedgeRatio: number; cost: number }> }) {
  const topHedges = hedges.slice(0, 2); // Show top 2 hedges

  return (
    <Box flexDirection="column" marginLeft={3}>
      <Text color="cyan" bold>🛡️  Hedging Strategy:</Text>
      
      {topHedges.map((hedge, i) => (
        <Box key={i} marginLeft={2}>
          <Text color="yellow">• </Text>
          <Text color="white" bold>{hedge.instrument}</Text>
          <Text color="gray"> ({hedge.hedgeRatio}% hedge, {hedge.cost.toFixed(1)}% cost)</Text>
        </Box>
      ))}
    </Box>
  );
}

function PortfolioSummary({ recommendations }: { recommendations: TradingRecommendation[] }) {
  const totalWeight = recommendations.reduce((sum, rec) => sum + rec.sizing.portfolioWeight, 0);
  const weightedReturn = recommendations.reduce((sum, rec) => {
    return sum + (rec.historicalContext.avgReturn * rec.sizing.portfolioWeight / 100);
  }, 0);
  
  const assetClassBreakdown: { [key: string]: number } = {};
  recommendations.forEach(rec => {
    assetClassBreakdown[rec.assetClass] = (assetClassBreakdown[rec.assetClass] || 0) + rec.sizing.portfolioWeight;
  });

  const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="cyan">
        {'═'.repeat(65)}
      </Text>
      <Text bold color="cyan" textAlign="center">
        {` ${'═'.repeat(15)} PORTFOLIO SUMMARY ${'═'.repeat(15)} `}
      </Text>
      <Text bold color="cyan">
        {'═'.repeat(65)}
      </Text>

      <Box marginTop={1} marginLeft={1}>
        <Text color="gray">Total Allocation: </Text>
        <Text color={totalWeight > 95 ? 'red' : totalWeight > 80 ? 'yellow' : 'green'} bold>
          {totalWeight.toFixed(1)}%
        </Text>
        <Text color="gray"> | Expected Return: </Text>
        <Text color={weightedReturn >= 0 ? 'green' : 'red'} bold>
          {weightedReturn > 0 ? '+' : ''}{weightedReturn.toFixed(1)}%
        </Text>
        <Text color="gray"> | Avg Confidence: </Text>
        <Text color={avgConfidence >= 75 ? 'green' : avgConfidence >= 60 ? 'yellow' : 'red'} bold>
          {avgConfidence.toFixed(0)}%
        </Text>
      </Box>

      <Box marginTop={1} marginLeft={1} flexDirection="column">
        <Text color="cyan" bold>Asset Class Breakdown:</Text>
        {Object.entries(assetClassBreakdown).map(([assetClass, weight]) => (
          <Box key={assetClass} marginLeft={2}>
            <Text color="white" bold>{assetClass}:</Text>
            <Text color="gray"> {weight.toFixed(1)}%</Text>
            {weight > 40 && <Text color="yellow"> ⚠️ High concentration</Text>}
          </Box>
        ))}
      </Box>

      {totalWeight > 100 && (
        <Box marginTop={1} marginLeft={1}>
          <Text color="red" bold>⚠️ WARNING: Portfolio allocation exceeds 100% - consider reducing position sizes</Text>
        </Box>
      )}
    </Box>
  );
}