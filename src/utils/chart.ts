// /src/utils/chart.ts

/**
 * Renders a simple ASCII bar chart from a series of data.
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

  const minValue = Math.min(...filteredSeries.map(d => d.value));
  const maxValue = Math.max(...filteredSeries.map(d => d.value));
  const range = maxValue - minValue;

  const chart = Array(height)
    .fill(0)
    .map(() => Array(filteredSeries.length).fill(' '));

  for (let i = 0; i < filteredSeries.length; i++) {
    const normalizedValue = range === 0 ? height - 1 : ((filteredSeries[i].value - minValue) / range) * (height - 1);
    const charHeight = Math.round(normalizedValue);

    for (let j = 0; j <= charHeight; j++) {
      chart[height - 1 - j][i] = '█';
    }
  }

  // Add axis labels
  const yAxisLabelMax = `${maxValue.toFixed(2)} -`;
  const yAxisLabelMin = `${minValue.toFixed(2)} -`;
  const chartWithYAxis = chart.map((row, i) => {
    if (i === 0) return `${yAxisLabelMax} ${row.join(' ')}`;
    if (i === height - 1) return `${yAxisLabelMin} ${row.join(' ')}`;
    return `${' '.repeat(yAxisLabelMax.length)}${row.join(' ')}`;
  });


  return chartWithYAxis.join('\n');
}