// /src/services/analysis.ts
import { EconomicDataPoint, ScenarioParams, HistoricalAnalogue } from '../types';
import { TARIFF_PERIODS } from '../constants';

export const findAnalogues = (allData: EconomicDataPoint[], params: ScenarioParams): HistoricalAnalogue[] => {
  const analogues: HistoricalAnalogue[] = [];
  const { unemployment, inflation, windowMonths, useTariffContext } = params;

  for (let i = 0; i <= allData.length - windowMonths; i++) {
    const window = allData.slice(i, i + windowMonths);
    const avgUnemployment = window.reduce((sum, d) => sum + (d.unemployment_rate || 0), 0) / window.length;
    const avgInflation = window.reduce((sum, d) => sum + (d.cpi_yoy || 0), 0) / window.length;

    if (
      avgUnemployment >= unemployment.min &&
      avgUnemployment <= unemployment.max &&
      avgInflation >= inflation.min &&
      avgInflation <= inflation.max
    ) {
      const startRate = window[0].fed_funds_rate;
      const endRate = window[window.length - 1].fed_funds_rate;
      let outcome: 'HIKE' | 'CUT' | 'HOLD' = 'HOLD';

      if (endRate > startRate) {
        outcome = 'HIKE';
      } else if (endRate < startRate) {
        outcome = 'CUT';
      }

      const analogue: HistoricalAnalogue = {
        startDate: window[0].date,
        endDate: window[window.length - 1].date,
        avgUnemployment: parseFloat(avgUnemployment.toFixed(2)),
        avgInflation: parseFloat(avgInflation.toFixed(2)),
        startRate,
        endRate,
        outcome,
      };

      if (useTariffContext) {
        const windowStart = new Date(window[0].date);
        const windowEnd = new Date(window[window.length - 1].date);

        const inTariffPeriod = TARIFF_PERIODS.some(period => {
          const periodStart = new Date(period.start);
          const periodEnd = period.end ? new Date(period.end) : new Date();
          return windowStart <= periodEnd && windowEnd >= periodStart;
        });

        if (inTariffPeriod) {
          analogues.push(analogue);
        }
      } else {
        analogues.push(analogue);
      }
    }
  }

  return analogues;
};
