
import React from 'react';
import { Box, Text } from 'ink';
import { CorrelationMatrix } from '../services/correlation';

interface CorrelationMatrixViewProps {
  matrix: CorrelationMatrix;
}

const CorrelationMatrixView: React.FC<CorrelationMatrixViewProps> = ({ matrix }) => {
  const seriesIds = Object.keys(matrix);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Correlation Matrix</Text>
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
              <Text>{matrix[seriesA][seriesB].toFixed(3)}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default CorrelationMatrixView;
