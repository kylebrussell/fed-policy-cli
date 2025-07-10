import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface SpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<SpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <Box>
      <Text color="blue">
        <Spinner type="dots" />
      </Text>
      <Text> {message}</Text>
    </Box>
  );
};

export default LoadingSpinner;