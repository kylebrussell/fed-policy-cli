// /src/utils/chart.ts

/**
 * Renders a simple ASCII bar chart from a series of data with intelligent range handling.
 * For small variations, uses enhanced scaling to show meaningful differences.
 * @param series - An array of objects, each with a `value` and a `label`.
 * @param height - The maximum height of the chart in characters.
 * @returns A string containing the multi-line ASCII chart.
 */
export function renderAsciiChart(
  series: { value: number; label: string }[],
  height: number = 5
): string {
  if (!series || series.length === 0) {
    return 'No data to display.';
  }

  const filteredSeries = series.filter(d => typeof d.value === 'number' && isFinite(d.value));

  if (filteredSeries.length === 0) {
    return 'No valid data to display.';
  }

  const values = filteredSeries.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;

  // Enhanced range handling for small variations
  let effectiveMin = minValue;
  let effectiveMax = maxValue;
  let enhancedRange = range;

  // If the range is very small relative to the values (less than 5% of mean), 
  // expand the range to show meaningful variation
  const meanValue = values.reduce((sum, val) => sum + val, 0) / values.length;
  const relativeRange = range / Math.abs(meanValue);
  
  if (relativeRange < 0.05 && range > 0) {
    // Expand the range to 10% of the mean value centered around the actual range
    const targetRange = Math.abs(meanValue) * 0.1;
    const centerValue = (minValue + maxValue) / 2;
    effectiveMin = centerValue - targetRange / 2;
    effectiveMax = centerValue + targetRange / 2;
    enhancedRange = effectiveMax - effectiveMin;
  }

  const chart = Array(height)
    .fill(0)
    .map(() => Array(filteredSeries.length).fill(' '));

  for (let i = 0; i < filteredSeries.length; i++) {
    let normalizedValue: number;
    
    if (enhancedRange === 0) {
      // All values are identical
      normalizedValue = height - 1;
    } else {
      // Use enhanced range for better visualization
      normalizedValue = ((filteredSeries[i].value - effectiveMin) / enhancedRange) * (height - 1);
      // Clamp to valid range in case of enhanced scaling
      normalizedValue = Math.max(0, Math.min(height - 1, normalizedValue));
    }
    
    const charHeight = Math.round(normalizedValue);

    for (let j = 0; j <= charHeight; j++) {
      chart[height - 1 - j][i] = '█';
    }
  }

  // Add axis labels - always show actual data range, not enhanced range
  const yAxisLabelMax = `${maxValue.toFixed(2)} -`;
  const yAxisLabelMin = `${minValue.toFixed(2)} -`;
  const chartWithYAxis = chart.map((row, i) => {
    if (i === 0) return `${yAxisLabelMax} ${row.join(' ')}`;
    if (i === height - 1) return `${yAxisLabelMin} ${row.join(' ')}`;
    return `${' '.repeat(yAxisLabelMax.length)}${row.join(' ')}`;
  });

  return chartWithYAxis.join('\n');
}