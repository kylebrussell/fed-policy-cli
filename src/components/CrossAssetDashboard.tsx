// /src/components/CrossAssetDashboard.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { 
  CrossAssetAnalogue, 
  CrossAssetSummary, 
  CrossAssetTradingSignal, 
  AssetPerformance 
} from '../services/crossAssetAnalysis';

interface CrossAssetDashboardProps {
  analogues: CrossAssetAnalogue[];
  summary: CrossAssetSummary;
  tradingSignals: CrossAssetTradingSignal[];
}

const PerformanceColor = ({ return: returnValue }: { return: number }) => {
  const color = returnValue > 5 ? 'green' : returnValue < -5 ? 'red' : 'yellow';
  const symbol = returnValue > 0 ? '+' : '';
  return <Text color={color}>{symbol}{returnValue.toFixed(1)}%</Text>;
};

const SignalTypeColor = ({ type }: { type: 'BUY' | 'SELL' | 'HOLD' }) => {
  const color = type === 'BUY' ? 'green' : type === 'SELL' ? 'red' : 'yellow';
  return <Text color={color} bold>{type}</Text>;
};

const ConfidenceBar = ({ confidence }: { confidence: number }) => {
  const bars = Math.round(confidence / 10);
  const filled = '█'.repeat(bars);
  const empty = '░'.repeat(10 - bars);
  const color = confidence > 75 ? 'green' : confidence > 50 ? 'yellow' : 'red';
  
  return (
    <Box>
      <Text color={color}>{filled}</Text>
      <Text color="gray">{empty}</Text>
      <Text> {confidence}%</Text>
    </Box>
  );
};

const AssetPerformanceTable = ({ assets, title }: { assets: AssetPerformance[]; title: string }) => {
  if (assets.length === 0) return null;
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="blue">{title}</Text>
      <Box flexDirection="column" marginTop={1}>
        {assets.slice(0, 5).map((asset, i) => (
          <Box key={i} justifyContent="space-between">
            <Box width={25}>
              <Text>{asset.symbol}: {asset.name.substring(0, 20)}</Text>
            </Box>
            <Box width={15}>
              <Text color="gray">{asset.assetClass}</Text>
            </Box>
            <Box width={10}>
              <PerformanceColor return={asset.totalReturn} />
            </Box>
            <Box width={10}>
              <Text color="gray">Sharpe: {asset.sharpeRatio.toFixed(2)}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const SectorRotationDisplay = ({ rotation }: { rotation: { intoSectors: string[]; outOfSectors: string[] } }) => {
  return (
    <Box flexDirection="column">
      <Text bold color="blue">Sector Rotation Signals</Text>
      <Box marginTop={1} flexDirection="column">
        {rotation.intoSectors.length > 0 && (
          <Box>
            <Text color="green">Into: </Text>
            <Text>{rotation.intoSectors.join(', ')}</Text>
          </Box>
        )}
        {rotation.outOfSectors.length > 0 && (
          <Box>
            <Text color="red">Out of: </Text>
            <Text>{rotation.outOfSectors.join(', ')}</Text>
          </Box>
        )}
        {rotation.intoSectors.length === 0 && rotation.outOfSectors.length === 0 && (
          <Text color="gray">No clear sector rotation pattern</Text>
        )}
      </Box>
    </Box>
  );
};

const CommodityTrendsDisplay = ({ trends }: { trends: { rising: string[]; falling: string[] } }) => {
  return (
    <Box flexDirection="column">
      <Text bold color="blue">Commodity Trends</Text>
      <Box marginTop={1} flexDirection="column">
        {trends.rising.length > 0 && (
          <Box>
            <Text color="green">Rising: </Text>
            <Text>{trends.rising.slice(0, 3).join(', ')}</Text>
          </Box>
        )}
        {trends.falling.length > 0 && (
          <Box>
            <Text color="red">Falling: </Text>
            <Text>{trends.falling.slice(0, 3).join(', ')}</Text>
          </Box>
        )}
        {trends.rising.length === 0 && trends.falling.length === 0 && (
          <Text color="gray">No clear commodity trends</Text>
        )}
      </Box>
    </Box>
  );
};

const CurrencyStrengthDisplay = ({ strength }: { strength: { dollarDirection: string; magnitude: number } }) => {
  const directionColor = strength.dollarDirection === 'strengthening' ? 'green' : 
                        strength.dollarDirection === 'weakening' ? 'red' : 'yellow';
  
  return (
    <Box flexDirection="column">
      <Text bold color="blue">USD Strength</Text>
      <Box marginTop={1}>
        <Text>Dollar: </Text>
        <Text color={directionColor} bold>
          {strength.dollarDirection.toUpperCase()}
        </Text>
        <Text> ({strength.magnitude.toFixed(1)}% magnitude)</Text>
      </Box>
    </Box>
  );
};

const TradingSignalsTable = ({ signals }: { signals: CrossAssetTradingSignal[] }) => {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">🎯 CROSS-ASSET TRADING SIGNALS</Text>
      {signals.length === 0 ? (
        <Box marginTop={1}>
          <Text color="gray">No significant trading signals detected</Text>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          {signals.slice(0, 8).map((signal, i) => (
            <Box key={i} flexDirection="column" marginBottom={1}>
              <Box>
                <SignalTypeColor type={signal.type} />
                <Text> {signal.asset} - {signal.assetClass}</Text>
                <Text color="gray"> | Expected: </Text>
                <PerformanceColor return={signal.expectedReturn} />
              </Box>
              <Box marginLeft={2}>
                <Text color="gray">{signal.reasoning}</Text>
              </Box>
              <Box marginLeft={2}>
                <Text color="gray">Confidence: </Text>
                <ConfidenceBar confidence={signal.confidence} />
              </Box>
              <Box marginLeft={2}>
                <Text color="gray">Timeframe: {signal.timeframe}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

const AnaloguePerformanceOverview = ({ analogues }: { analogues: CrossAssetAnalogue[] }) => {
  if (analogues.length === 0) return null;
  
  // Calculate average performance by asset class
  const assetClassPerformance = new Map<string, { returns: number[]; count: number }>();
  
  for (const analogue of analogues) {
    for (const performance of analogue.assetPerformance) {
      if (!assetClassPerformance.has(performance.assetClass)) {
        assetClassPerformance.set(performance.assetClass, { returns: [], count: 0 });
      }
      const classData = assetClassPerformance.get(performance.assetClass)!;
      classData.returns.push(performance.totalReturn);
      classData.count++;
    }
  }
  
  const classAverages = Array.from(assetClassPerformance.entries()).map(([assetClass, data]) => ({
    assetClass,
    avgReturn: data.returns.reduce((sum, r) => sum + r, 0) / data.returns.length,
    count: data.count
  }));
  
  classAverages.sort((a, b) => b.avgReturn - a.avgReturn);
  
  return (
    <Box flexDirection="column">
      <Text bold color="blue">Asset Class Performance During Historical Analogues</Text>
      <Box marginTop={1} flexDirection="column">
        {classAverages.map((classData, i) => (
          <Box key={i} justifyContent="space-between">
            <Box width={20}>
              <Text>{classData.assetClass}</Text>
            </Box>
            <Box width={12}>
              <PerformanceColor return={classData.avgReturn} />
            </Box>
            <Box width={15}>
              <Text color="gray">({classData.count} assets)</Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const CrossAssetDashboard: React.FC<CrossAssetDashboardProps> = ({ 
  analogues, 
  summary, 
  tradingSignals 
}) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan" underline>
        📊 CROSS-ASSET FED PLAYBOOK
      </Text>
      
      <Box marginTop={1}>
        <Text color="gray">
          Analysis Period: {summary.period} | {analogues.length} Historical Analogues
        </Text>
      </Box>

      <Box marginTop={2} flexDirection="row">
        <Box flexDirection="column" width="50%">
          <AnaloguePerformanceOverview analogues={analogues} />
        </Box>
        <Box flexDirection="column" width="50%" marginLeft={4}>
          <SectorRotationDisplay rotation={summary.sectorRotation} />
          <Box marginTop={2}>
            <CommodityTrendsDisplay trends={summary.commodityTrends} />
          </Box>
          <Box marginTop={2}>
            <CurrencyStrengthDisplay strength={summary.currencyStrength} />
          </Box>
        </Box>
      </Box>

      <Box marginTop={2} flexDirection="row">
        <Box flexDirection="column" width="50%">
          <AssetPerformanceTable 
            assets={summary.bestPerformers} 
            title="🚀 Best Performers" 
          />
        </Box>
        <Box flexDirection="column" width="50%" marginLeft={4}>
          <AssetPerformanceTable 
            assets={summary.worstPerformers} 
            title="📉 Worst Performers" 
          />
        </Box>
      </Box>

      <Box marginTop={2}>
        <TradingSignalsTable signals={tradingSignals} />
      </Box>

      <Box marginTop={2}>
        <Text color="gray">
          💡 Playbook based on {analogues.length} historical periods with similar Fed policy conditions
        </Text>
      </Box>
    </Box>
  );
};

export default CrossAssetDashboard;