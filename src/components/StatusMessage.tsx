import React from 'react';
import { Text } from 'ink';

interface StatusMessageProps {
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
}

const StatusMessage: React.FC<StatusMessageProps> = ({ message, type = 'info' }) => {
  const getColor = () => {
    switch (type) {
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      case 'warning':
        return 'yellow';
      default:
        return 'blue';
    }
  };

  const getPrefix = () => {
    switch (type) {
      case 'success':
        return '✓ ';
      case 'error':
        return '✗ ';
      case 'warning':
        return '⚠ ';
      default:
        return 'ℹ ';
    }
  };

  return (
    <Text color={getColor()}>
      {getPrefix()}{message}
    </Text>
  );
};

export default StatusMessage;