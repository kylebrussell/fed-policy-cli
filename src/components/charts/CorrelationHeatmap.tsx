
import React from 'react';
import { Box, Text } from 'ink';
import { CorrelationMatrix } from '../../services/correlation';

interface CorrelationHeatmapProps {
  matrix: CorrelationMatrix;
}

// A simple green-to-red color scale
const getColor = (value: number) => {
  if (value > 0.7) return 'green';
  if (value > 0.3) return 'yellow';
  if (value < -0.7) return 'red';
  if (value < -0.3) return 'magenta';
  return 'gray';
};

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ matrix }) => {
  const seriesIds = Object.keys(matrix);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Correlation Heatmap</Text>
      <Box>
        <Box width={12} />
        {seriesIds.map(id => (
          <Box key={id} width={10} justifyContent="center">
            <Text bold>{id}</Text>
          </Box>
        ))}
      </Box>
      {seriesIds.map(seriesA => (
        <Box key={seriesA}>
          <Box width={12} justifyContent="flex-end">
            <Text bold>{seriesA}</Text>
          </Box>
          {seriesIds.map(seriesB => (
            <Box key={seriesB} width={10} justifyContent="center">
              <Text color={getColor(matrix[seriesA][seriesB])}>
                {matrix[seriesA][seriesB].toFixed(2)}
              </Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default CorrelationHeatmap;
