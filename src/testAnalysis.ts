// /src/testAnalysis.ts
import { findAnalogues } from './services/analysis';
import { EconomicDataPoint, ScenarioParams } from './types';

const mockData: EconomicDataPoint[] = [
  { date: '2020-01-01', unemployment_rate: 3.5, cpi_yoy: 2.0, fed_funds_rate: 1.5 },
  { date: '2020-02-01', unemployment_rate: 3.6, cpi_yoy: 2.1, fed_funds_rate: 1.5 },
  { date: '2020-03-01', unemployment_rate: 4.4, cpi_yoy: 2.2, fed_funds_rate: 1.0 },
  { date: '2020-04-01', unemployment_rate: 14.7, cpi_yoy: 0.3, fed_funds_rate: 0.25 },
  { date: '2020-05-01', unemployment_rate: 13.3, cpi_yoy: 0.1, fed_funds_rate: 0.25 },
  { date: '2020-06-01', unemployment_rate: 11.1, cpi_yoy: 0.6, fed_funds_rate: 0.25 },
  { date: '2021-01-01', unemployment_rate: 6.3, cpi_yoy: 1.4, fed_funds_rate: 0.25 },
  { date: '2021-02-01', unemployment_rate: 6.2, cpi_yoy: 1.7, fed_funds_rate: 0.25 },
  { date: '2021-03-01', unemployment_rate: 6.0, cpi_yoy: 2.6, fed_funds_rate: 0.25 },
  { date: '2021-04-01', unemployment_rate: 6.1, cpi_yoy: 4.2, fed_funds_rate: 0.25 },
  { date: '2021-05-01', unemployment_rate: 5.8, cpi_yoy: 5.0, fed_funds_rate: 0.25 },
  { date: '2021-06-01', unemployment_rate: 5.9, cpi_yoy: 5.4, fed_funds_rate: 0.25 },
  { date: '2022-01-01', unemployment_rate: 4.0, cpi_yoy: 7.5, fed_funds_rate: 0.25 },
  { date: '2022-02-01', unemployment_rate: 3.8, cpi_yoy: 7.9, fed_funds_rate: 0.25 },
  { date: '2022-03-01', unemployment_rate: 3.6, cpi_yoy: 8.5, fed_funds_rate: 0.50 },
  { date: '2022-04-01', unemployment_rate: 3.6, cpi_yoy: 8.3, fed_funds_rate: 0.75 },
  { date: '2022-05-01', unemployment_rate: 3.6, cpi_yoy: 8.6, fed_funds_rate: 1.00 },
  { date: '2022-06-01', unemployment_rate: 3.6, cpi_yoy: 9.1, fed_funds_rate: 1.75 },
  { date: '2023-01-01', unemployment_rate: 3.4, cpi_yoy: 6.4, fed_funds_rate: 4.50 },
  { date: '2023-02-01', unemployment_rate: 3.6, cpi_yoy: 6.0, fed_funds_rate: 4.75 },
  { date: '2023-03-01', unemployment_rate: 3.5, cpi_yoy: 5.0, fed_funds_rate: 5.00 },
  { date: '2023-04-01', unemployment_rate: 3.4, cpi_yoy: 4.9, fed_funds_rate: 5.25 },
  { date: '2023-05-01', unemployment_rate: 3.7, cpi_yoy: 4.0, fed_funds_rate: 5.25 },
  { date: '2023-06-01', unemployment_rate: 3.6, cpi_yoy: 3.0, fed_funds_rate: 5.25 },
];

// Test Case 1: High Unemployment, Low Inflation, 3-month window, no tariff context
const params1: ScenarioParams = {
  unemployment: { min: 10, max: 15 },
  inflation: { min: 0, max: 1 },
  windowMonths: 3,
  useTariffContext: false,
};

console.log('\n--- Test Case 1: High Unemployment, Low Inflation (3-month window) ---');
const analogues1 = findAnalogues(mockData, params1);
console.log(analogues1);

// Test Case 2: Moderate Unemployment, High Inflation, 6-month window, no tariff context
const params2: ScenarioParams = {
  unemployment: { min: 5, max: 7 },
  inflation: { min: 4, max: 6 },
  windowMonths: 6,
  useTariffContext: false,
};

console.log('\n--- Test Case 2: Moderate Unemployment, High Inflation (6-month window) ---');
const analogues2 = findAnalogues(mockData, params2);
console.log(analogues2);

// Test Case 3: Low Unemployment, Moderate Inflation, 3-month window, with tariff context
const params3: ScenarioParams = {
  unemployment: { min: 3, max: 4 },
  inflation: { min: 2, max: 5 },
  windowMonths: 3,
  useTariffContext: true,
};

console.log('\n--- Test Case 3: Low Unemployment, Moderate Inflation (3-month window, with tariff context) ---');
const analogues3 = findAnalogues(mockData, params3);
console.log(analogues3);
