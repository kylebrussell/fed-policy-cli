import React from 'react';
import { Box, Text } from 'ink';
import { HistoricalAnalogue, FedPolicyAction, EconomicDataPoint } from '../types';
import { identifyPolicyRegimes } from '../services/policyAnalysis';

interface PolicyTimelineProps {
  analogue: HistoricalAnalogue;
  showExtended?: boolean;
}

interface PolicyEvent {
  date: string;
  type: 'action' | 'meeting' | 'regime-change';
  description: string;
  details?: string;
  cumulativeChange?: number;
  preContext?: {
    unemployment: number;
    inflation: number;
    gdp: number;
  };
}

const PolicyTimeline: React.FC<PolicyTimelineProps> = ({ analogue, showExtended = false }) => {
  // Generate comprehensive timeline events
  const generateTimelineEvents = (): PolicyEvent[] => {
    const events: PolicyEvent[] = [];
    const actions = analogue.fedPolicyActions;
    const data = analogue.data;
    
    // Add policy regime changes
    const regimes = identifyPolicyRegimes(actions);
    regimes.forEach((regime, index) => {
      if (index > 0 || regime.type !== 'neutral') {
        events.push({
          date: regime.startDate,
          type: 'regime-change',
          description: `${regime.type.charAt(0).toUpperCase() + regime.type.slice(1)} regime begins`,
          details: regime.context
        });
      }
    });

    // Add policy actions with pre-decision context
    let cumulativeChange = 0;
    actions.forEach((action, index) => {
      cumulativeChange += action.changeBps || 0;
      
      // Get economic context 3 months before action
      const actionDate = new Date(action.date);
      const contextDate = new Date(actionDate);
      contextDate.setMonth(contextDate.getMonth() - 3);
      
      const contextData = data.find(d => {
        const dDate = new Date(d.date);
        return dDate.getFullYear() === contextDate.getFullYear() && 
               dDate.getMonth() === contextDate.getMonth();
      });

      const event: PolicyEvent = {
        date: action.date,
        type: 'action',
        description: formatPolicyAction(action),
        cumulativeChange
      };

      if (contextData) {
        event.preContext = {
          unemployment: contextData.UNRATE as number || 0,
          inflation: contextData.CPIAUCSL as number || 0,
          gdp: contextData.GDPC1 as number || 0
        };
      }

      events.push(event);
    });

    // Add FOMC meeting markers (simplified - normally would use actual meeting dates)
    const startDate = new Date(analogue.startDate);
    const endDate = new Date(analogue.endDate);
    let meetingDate = new Date(startDate);
    
    while (meetingDate <= endDate) {
      // FOMC meets roughly every 6 weeks
      meetingDate.setDate(meetingDate.getDate() + 42);
      
      const hasAction = actions.some(a => {
        const actionDate = new Date(a.date);
        return Math.abs(actionDate.getTime() - meetingDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
      });

      if (!hasAction && meetingDate <= endDate) {
        events.push({
          date: meetingDate.toISOString().split('T')[0],
          type: 'meeting',
          description: 'FOMC Meeting (no action)'
        });
      }
    }

    // Sort events by date
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const formatPolicyAction = (action: FedPolicyAction): string => {
    if (action.action === 'HOLD') return 'Fed holds rates steady';
    const direction = action.action === 'HIKE' ? 'raises' : 'cuts';
    return `Fed ${direction} rates by ${Math.abs(action.changeBps || 0)}bps`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const events = generateTimelineEvents();
  const displayEvents = showExtended ? events : events.filter(e => e.type !== 'meeting').slice(0, 8);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginTop={1}>
      <Text bold color="cyan">📅 Enhanced Fed Policy Timeline</Text>
      
      {/* Summary Stats */}
      <Box marginY={1}>
        <Text color="gray">Period: </Text>
        <Text>{formatDate(analogue.startDate)} - {formatDate(analogue.endDate)}</Text>
        <Text color="gray"> | Total Change: </Text>
        <Text color={
          events.find(e => e.type === 'action')?.cumulativeChange || 0 > 0 ? 'red' : 
          events.find(e => e.type === 'action')?.cumulativeChange || 0 < 0 ? 'green' : 
          'white'
        }>
          {events.filter(e => e.type === 'action').slice(-1)[0]?.cumulativeChange || 0}bps
        </Text>
      </Box>

      {/* Timeline Events */}
      <Box flexDirection="column">
        {displayEvents.map((event, index) => (
          <Box key={index} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color={
                event.type === 'action' ? 'yellow' :
                event.type === 'regime-change' ? 'magenta' :
                'gray'
              }>
                {event.type === 'action' ? '●' : 
                 event.type === 'regime-change' ? '▶' : '○'}
              </Text>
              <Text> {formatDate(event.date)}: </Text>
              <Text color={event.type === 'action' ? 'white' : 'gray'}>
                {event.description}
              </Text>
            </Box>
            
            {/* Pre-decision context */}
            {event.preContext && (
              <Box marginLeft={3}>
                <Text color="gray" italic>
                  3mo prior: U={event.preContext.unemployment.toFixed(1)}% 
                  I={event.preContext.inflation.toFixed(1)}% 
                  GDP={event.preContext.gdp.toFixed(1)}%
                </Text>
              </Box>
            )}
            
            {/* Cumulative tracking */}
            {event.cumulativeChange !== undefined && event.cumulativeChange !== 0 && (
              <Box marginLeft={3}>
                <Text color="gray" italic>
                  Cumulative: {event.cumulativeChange > 0 ? '+' : ''}{event.cumulativeChange}bps
                </Text>
              </Box>
            )}
            
            {/* Regime details */}
            {event.details && (
              <Box marginLeft={3}>
                <Text color="gray" italic>{event.details}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {!showExtended && events.length > displayEvents.length && (
        <Text color="gray" italic>
          ... and {events.length - displayEvents.length} more events
        </Text>
      )}

      {/* Policy Regime Summary */}
      {identifyPolicyRegimes(analogue.fedPolicyActions).length > 0 && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold underline>Policy Regimes</Text>
          {identifyPolicyRegimes(analogue.fedPolicyActions).map((regime, i) => (
            <Text key={i}>
              <Text color="cyan">{regime.type}</Text>
              <Text color="gray">: {regime.totalChange}bps over {regime.duration}mo</Text>
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PolicyTimeline;