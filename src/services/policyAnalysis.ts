import { HistoricalAnalogue, FedPolicyAction, EconomicDataPoint } from '../types';

export interface PolicyRegime {
  type: 'easing' | 'tightening' | 'neutral' | 'mixed';
  startDate: string;
  endDate: string;
  totalChange: number;
  duration: number;
  context: string;
}

export interface PolicyProjection {
  month: string;
  action: 'HIKE' | 'CUT' | 'HOLD';
  probability: number;
  basisPoints?: number;
  rationale: string;
}

export interface PolicyPlaybook {
  pattern: string;
  keyTriggers: string[];
  typicalSequence: string[];
  expectedDuration: number;
  historicalSuccess: number;
}

/**
 * Identify policy regimes within a period
 */
export function identifyPolicyRegimes(actions: FedPolicyAction[]): PolicyRegime[] {
  if (!actions || actions.length === 0) return [];

  const regimes: PolicyRegime[] = [];
  let currentRegime: PolicyRegime | null = null;
  let regimeActions: FedPolicyAction[] = [];

  for (const action of actions) {
    const isEasing = action.action === 'CUT';
    const isTightening = action.action === 'HIKE';

    if (!currentRegime) {
      // Start new regime
      currentRegime = {
        type: isEasing ? 'easing' : isTightening ? 'tightening' : 'neutral',
        startDate: action.date,
        endDate: action.date,
        totalChange: action.changeBps || 0,
        duration: 1,
        context: ''
      };
      regimeActions = [action];
    } else {
      // Check if regime continues or changes
      const sameDirection = 
        (currentRegime.type === 'easing' && isEasing) ||
        (currentRegime.type === 'tightening' && isTightening) ||
        (currentRegime.type === 'neutral' && action.action === 'HOLD');

      if (sameDirection || Math.abs(action.changeBps || 0) < 25) {
        // Continue current regime
        currentRegime.endDate = action.date;
        currentRegime.totalChange += action.changeBps || 0;
        currentRegime.duration++;
        regimeActions.push(action);
      } else {
        // End current regime and start new one
        currentRegime.context = generateRegimeContext(currentRegime, regimeActions);
        regimes.push(currentRegime);

        currentRegime = {
          type: isEasing ? 'easing' : isTightening ? 'tightening' : 'neutral',
          startDate: action.date,
          endDate: action.date,
          totalChange: action.changeBps || 0,
          duration: 1,
          context: ''
        };
        regimeActions = [action];
      }
    }
  }

  // Add final regime
  if (currentRegime) {
    currentRegime.context = generateRegimeContext(currentRegime, regimeActions);
    regimes.push(currentRegime);
  }

  return regimes;
}

/**
 * Generate context description for a policy regime
 */
function generateRegimeContext(regime: PolicyRegime, actions: FedPolicyAction[]): string {
  const avgChange = regime.totalChange / regime.duration;
  
  if (regime.type === 'easing') {
    if (regime.totalChange < -200) {
      return 'Emergency easing response';
    } else if (regime.totalChange < -100) {
      return 'Aggressive easing cycle';
    } else {
      return 'Gradual accommodation';
    }
  } else if (regime.type === 'tightening') {
    if (regime.totalChange > 200) {
      return 'Aggressive inflation fight';
    } else if (regime.totalChange > 100) {
      return 'Steady tightening cycle';
    } else {
      return 'Cautious rate normalization';
    }
  }
  
  return 'Wait-and-see approach';
}

/**
 * Project future Fed actions based on historical patterns
 */
export function projectFuturePolicy(
  currentData: EconomicDataPoint[],
  historicalAnalogue: HistoricalAnalogue
): PolicyProjection[] {
  const projections: PolicyProjection[] = [];
  
  // Analyze the pattern from the historical analogue
  const regimes = identifyPolicyRegimes(historicalAnalogue.fedPolicyActions);
  if (regimes.length === 0) return projections;

  // Get current economic conditions
  const latestData = currentData[currentData.length - 1];
  const inflation = latestData.CPIAUCSL as number || 0;
  const unemployment = latestData.UNRATE as number || 0;
  const gdp = latestData.GDPC1 as number || 0;

  // Project next 6 months based on historical pattern
  const monthsAhead = 6;
  const currentDate = new Date();

  for (let i = 1; i <= monthsAhead; i++) {
    const projectedDate = new Date(currentDate);
    projectedDate.setMonth(projectedDate.getMonth() + i);
    const monthStr = projectedDate.toISOString().substring(0, 7);

    // Determine likely action based on conditions and historical pattern
    let action: PolicyProjection['action'] = 'HOLD';
    let probability = 50;
    let basisPoints = 0;
    let rationale = '';

    if (inflation > 3 && unemployment < 4.5) {
      // Inflationary pressure scenario
      action = 'HIKE';
      probability = 70;
      basisPoints = 25;
      rationale = 'Inflation above target with tight labor market';
    } else if (unemployment > 4.5 && inflation < 2) {
      // Recessionary pressure scenario
      action = 'CUT';
      probability = 75;
      basisPoints = -25;
      rationale = 'Rising unemployment with low inflation';
    } else if (gdp < 1) {
      // Growth concern scenario
      action = 'CUT';
      probability = 60;
      basisPoints = -25;
      rationale = 'Weak economic growth';
    }

    // Adjust based on historical pattern
    const dominantRegime = regimes[0];
    if (dominantRegime.type === 'easing' && action !== 'HIKE') {
      probability += 10;
    } else if (dominantRegime.type === 'tightening' && action !== 'CUT') {
      probability += 10;
    }

    projections.push({
      month: monthStr,
      action,
      probability,
      basisPoints,
      rationale
    });
  }

  return projections;
}

/**
 * Generate a policy playbook based on historical patterns
 */
export function generatePolicyPlaybook(analogue: HistoricalAnalogue): PolicyPlaybook {
  const regimes = identifyPolicyRegimes(analogue.fedPolicyActions);
  const actions = analogue.fedPolicyActions.filter(a => a.action !== 'HOLD');
  
  // Identify key triggers from the data
  const keyTriggers: string[] = [];
  const data = analogue.data;
  
  if (data.length > 0) {
    const avgInflation = data.reduce((sum, d) => sum + (d.CPIAUCSL as number || 0), 0) / data.length;
    const avgUnemployment = data.reduce((sum, d) => sum + (d.UNRATE as number || 0), 0) / data.length;
    
    if (avgInflation > 3) keyTriggers.push('Elevated inflation (>3%)');
    if (avgUnemployment > 5) keyTriggers.push('Rising unemployment (>5%)');
    if (avgInflation < 2) keyTriggers.push('Below-target inflation (<2%)');
  }

  // Build typical sequence
  const typicalSequence = regimes.map(r => {
    const change = r.totalChange > 0 ? `+${r.totalChange}` : `${r.totalChange}`;
    return `${r.context} (${change}bps over ${r.duration} months)`;
  });

  // Calculate success metrics
  const totalDuration = regimes.reduce((sum, r) => sum + r.duration, 0);
  const historicalSuccess = calculatePolicySuccess(analogue);

  return {
    pattern: regimes[0]?.context || 'No clear pattern',
    keyTriggers,
    typicalSequence,
    expectedDuration: totalDuration,
    historicalSuccess
  };
}

/**
 * Calculate how successful the Fed policy was in achieving objectives
 */
function calculatePolicySuccess(analogue: HistoricalAnalogue): number {
  const data = analogue.data;
  if (data.length < 6) return 50; // Not enough data

  // Compare start vs end conditions
  const startInflation = data[0].CPIAUCSL as number || 0;
  const endInflation = data[data.length - 1].CPIAUCSL as number || 0;
  const startUnemployment = data[0].UNRATE as number || 0;
  const endUnemployment = data[data.length - 1].UNRATE as number || 0;

  let score = 50; // Base score

  // Inflation control
  if (startInflation > 3 && endInflation < startInflation) {
    score += 20; // Successfully reduced high inflation
  } else if (startInflation < 2 && endInflation > startInflation && endInflation < 3) {
    score += 15; // Successfully raised low inflation toward target
  }

  // Employment
  if (startUnemployment > 5 && endUnemployment < startUnemployment) {
    score += 20; // Successfully reduced unemployment
  } else if (startUnemployment < 4 && endUnemployment < 5) {
    score += 10; // Maintained low unemployment
  }

  // Stability
  const inflationVolatility = Math.abs(endInflation - startInflation);
  if (inflationVolatility < 1) {
    score += 15; // Maintained price stability
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Generate forward guidance projections based on historical patterns
 */
export function generateForwardGuidance(analogue: HistoricalAnalogue): PolicyProjection[] {
  const projections: PolicyProjection[] = [];
  const actions = analogue.fedPolicyActions || [];
  const data = analogue.data;
  
  if (data.length === 0) return projections;
  
  // Get latest economic conditions
  const latestData = data[data.length - 1];
  const inflation = latestData.CPIAUCSL as number || 2.5;
  const unemployment = latestData.UNRATE as number || 4.0;
  const gdpGrowth = latestData.GDPC1 as number || 2.0;
  
  // Identify current regime
  const regimes = identifyPolicyRegimes(actions);
  const currentRegime = regimes[regimes.length - 1];
  
  // Project next 6 months based on historical patterns and current conditions
  const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
  
  for (let i = 0; i < months.length; i++) {
    let action: PolicyProjection['action'] = 'HOLD';
    let probability = 50;
    let basisPoints = 0;
    let rationale = 'Data-dependent approach';
    
    // Determine likely action based on conditions
    if (inflation > 3.5 && unemployment < 4.5) {
      // Inflationary pressure
      if (i < 2) {
        action = 'HIKE';
        basisPoints = 25;
        probability = 60 + (inflation - 3.5) * 20;
        rationale = 'Persistent inflation requires continued tightening';
      } else {
        action = 'HOLD';
        probability = 70;
        rationale = 'Assessing cumulative impact of rate hikes';
      }
    } else if (unemployment > 4.5 && inflation < 3.0) {
      // Economic weakness
      if (i < 3) {
        action = 'CUT';
        basisPoints = 25;
        probability = 55 + (unemployment - 4.5) * 20;
        rationale = 'Labor market softening warrants easing';
      } else {
        action = 'HOLD';
        probability = 60;
        rationale = 'Monitoring policy transmission';
      }
    } else if (gdpGrowth < 1.0) {
      // Growth concerns
      action = 'CUT';
      basisPoints = 25;
      probability = 65;
      rationale = 'Preemptive easing to support growth';
    } else {
      // Balanced conditions
      action = 'HOLD';
      probability = 75;
      rationale = 'Economic conditions near equilibrium';
    }
    
    // Adjust based on historical pattern
    if (currentRegime && i < 3) {
      if (currentRegime.type === 'easing' && action !== 'HIKE') {
        probability += 10;
        rationale += '; continuing easing cycle';
      } else if (currentRegime.type === 'tightening' && action !== 'CUT') {
        probability += 10;
        rationale += '; maintaining restrictive stance';
      }
    }
    
    projections.push({
      month: months[i],
      action,
      probability: Math.min(90, Math.max(10, probability)),
      basisPoints: action === 'HOLD' ? undefined : basisPoints,
      rationale
    });
  }
  
  return projections;
}