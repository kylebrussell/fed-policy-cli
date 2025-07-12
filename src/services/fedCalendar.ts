// /src/services/fedCalendar.ts

import { FOMCEvent } from '../types/index.js';

export interface RawFOMCMeeting {
  date: string;
  time?: string;
  type: 'meeting' | 'minutes' | 'speech';
  description?: string;
}

/**
 * Service for fetching real FOMC calendar data
 * Uses Federal Reserve's public data and calendar information
 */
export class FedCalendarService {
  
  /**
   * Get the next FOMC meeting date
   * For now, uses known 2024-2025 FOMC schedule from Fed website
   */
  async getNextFOMC(): Promise<FOMCEvent> {
    const meetings = await this.getFOMCSchedule();
    const now = new Date();
    
    // Find next meeting after today
    const nextMeeting = meetings.find(meeting => new Date(meeting.date) > now);
    
    if (!nextMeeting) {
      // Fallback to last known meeting if we're past the schedule
      const lastMeeting = meetings[meetings.length - 1];
      return this.convertToFOMCEvent(lastMeeting);
    }
    
    return this.convertToFOMCEvent(nextMeeting);
  }
  
  /**
   * Get historical and upcoming FOMC meetings
   * Based on Federal Reserve's official schedule
   */
  async getFOMCSchedule(): Promise<RawFOMCMeeting[]> {
    // Real FOMC meeting dates from Federal Reserve official calendar
    // https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
    return [
      // 2024 meetings
      { date: '2024-01-31', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2024-03-20', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2024-05-01', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2024-06-12', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2024-07-31', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2024-09-18', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2024-11-07', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2024-12-18', type: 'meeting', description: 'FOMC Meeting' },
      
      // 2025 meetings (tentative schedule)
      { date: '2025-01-29', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2025-03-19', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2025-04-30', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2025-06-11', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2025-07-30', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2025-09-17', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2025-11-05', type: 'meeting', description: 'FOMC Meeting' },
      { date: '2025-12-17', type: 'meeting', description: 'FOMC Meeting' },
    ];
  }
  
  /**
   * Get days until next FOMC meeting
   */
  async getDaysToFOMC(): Promise<number> {
    const nextFOMC = await this.getNextFOMC();
    const now = new Date();
    const fomcDate = new Date(nextFOMC.date);
    const diffTime = fomcDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Get recent FOMC meetings (for historical analysis)
   */
  async getRecentFOMCMeetings(count: number = 8): Promise<FOMCEvent[]> {
    const meetings = await this.getFOMCSchedule();
    const now = new Date();
    
    // Get past meetings
    const pastMeetings = meetings
      .filter(meeting => new Date(meeting.date) < now)
      .slice(-count)
      .map(meeting => this.convertToFOMCEvent(meeting));
    
    return pastMeetings;
  }
  
  /**
   * Convert raw meeting to FOMCEvent with basic estimates
   */
  private convertToFOMCEvent(meeting: RawFOMCMeeting): FOMCEvent {
    return {
      date: meeting.date,
      type: 'RATE_DECISION',
      surpriseFactor: 0.0, // We can't estimate this without market data
      expectedMove: 0.0, // We can't estimate this without vol data
      marketExpectations: {
        cutProbability: 0.33,
        holdProbability: 0.34,
        hikeProbability: 0.33
      }
    };
  }
  
  /**
   * Check if a given date is within FOMC blackout period
   * (typically 10 days before meeting)
   */
  async isInFOMCBlackout(date: Date = new Date()): Promise<boolean> {
    const nextFOMC = await this.getNextFOMC();
    const fomcDate = new Date(nextFOMC.date);
    const diffTime = fomcDate.getTime() - date.getTime();
    const daysDiff = diffTime / (1000 * 60 * 60 * 24);
    
    return daysDiff > 0 && daysDiff <= 10;
  }
  
  /**
   * Get FOMC timing context for volatility analysis
   */
  async getFOMCTimingContext(): Promise<{
    daysToNext: number;
    isBlackout: boolean;
    phase: 'PRE_FOMC' | 'FOMC_WEEK' | 'POST_FOMC' | 'NORMAL';
  }> {
    const daysToNext = await this.getDaysToFOMC();
    const isBlackout = await this.isInFOMCBlackout();
    
    let phase: 'PRE_FOMC' | 'FOMC_WEEK' | 'POST_FOMC' | 'NORMAL';
    
    if (Math.abs(daysToNext) <= 1) {
      phase = 'FOMC_WEEK';
    } else if (daysToNext > 0 && daysToNext <= 7) {
      phase = 'PRE_FOMC';
    } else if (daysToNext < 0 && daysToNext >= -7) {
      phase = 'POST_FOMC';
    } else {
      phase = 'NORMAL';
    }
    
    return {
      daysToNext,
      isBlackout,
      phase
    };
  }
}