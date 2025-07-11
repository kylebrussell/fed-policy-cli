// /src/components/WelcomeScreen.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { FED_ANALYZER_ASCII, QUICK_START_TIPS } from '../utils/displayUtils';

const WelcomeScreen: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text color="cyan">{FED_ANALYZER_ASCII}</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="yellow" bold>
          Macro Trading Intelligence from Fed Policy Analysis
        </Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray">
          Transform economic data into actionable trading insights by analyzing historical Fed policy analogues
        </Text>
      </Box>
      
      <Box marginTop={1} marginBottom={1}>
        <Text color="white" bold>Quick Start Commands:</Text>
      </Box>
      
      <Box flexDirection="column">
        {QUICK_START_TIPS.map((tip, i) => (
          <Box key={i} marginBottom={1}>
            <Box width={4}>
              <Text>{tip.icon}</Text>
            </Box>
            <Box flexDirection="column" flexGrow={1}>
              <Box>
                <Text color="cyan" bold>{tip.title}</Text>
                <Text color="gray"> - {tip.description}</Text>
              </Box>
              <Box marginLeft={4}>
                <Text color="green">$ npm run dev -- {tip.command}</Text>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
      
      <Box marginTop={2}>
        <Text color="gray">
          💡 First time? Run <Text color="yellow">npm run dev -- update-data</Text> to fetch latest economic data
        </Text>
      </Box>
      
      <Box marginTop={1}>
        <Text color="gray">
          📚 Documentation: <Text color="cyan">npm run dev -- help</Text> | List templates: <Text color="cyan">npm run dev -- list-templates</Text>
        </Text>
      </Box>
    </Box>
  );
};

export default WelcomeScreen;