// src/services/export.ts

import { HistoricalAnalogue, WeightedIndicator, EconomicDataPoint } from '../types';
import { FRED_SERIES } from '../constants';
import fs from 'fs/promises';
import path from 'path';

export interface ExportMetadata {
  exportDate: string;
  toolVersion: string;
  analysisType: 'historical-analogues';
  parameters: {
    targetPeriod?: string;
    months?: number;
    indicators: WeightedIndicator[];
    topN: number;
    template?: string;
  };
  dataSource: 'FRED';
}

export interface AnalysisExport {
  metadata: ExportMetadata;
  targetScenario: {
    startDate: string;
    endDate: string;
    data: EconomicDataPoint[];
  };
  analogues: HistoricalAnalogue[];
}

export class ExportService {
  /**
   * Export analysis results to CSV format
   */
  async exportToCSV(
    analogues: HistoricalAnalogue[],
    indicators: WeightedIndicator[],
    targetScenario: EconomicDataPoint[],
    filePath: string,
    metadata: Partial<ExportMetadata['parameters']>
  ): Promise<void> {
    const headers = [
      'Rank',
      'Period',
      'Start Date',
      'End Date',
      'Similarity Score',
      'Fed Policy Actions',
      'Total Policy Change (bps)',
      ...indicators.map(ind => `${FRED_SERIES[ind.id].name} (Weight: ${ind.weight})`)
    ];

    const rows: string[][] = [];
    
    // Add header row
    rows.push(headers);
    
    // Add data rows
    analogues.forEach((analogue, index) => {
      const policyActions = analogue.fedPolicyActions
        .map(action => `${action.date}: ${action.action}${action.changeBps ? ` ${action.changeBps}bps` : ''}`)
        .join('; ');
      
      const totalPolicyChange = analogue.fedPolicyActions
        .reduce((sum, action) => sum + (action.changeBps || 0), 0);
      
      const row = [
        (index + 1).toString(),
        `${analogue.startDate} to ${analogue.endDate}`,
        analogue.startDate,
        analogue.endDate,
        analogue.similarityScore.toFixed(4),
        policyActions || 'No actions',
        totalPolicyChange.toString()
      ];
      
      // Add indicator values (average over the period)
      indicators.forEach(ind => {
        const values = analogue.data
          .map(d => d[ind.id])
          .filter(v => v !== undefined && v !== null)
          .map(v => Number(v));
        
        const avg = values.length > 0 
          ? (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2)
          : 'N/A';
        
        row.push(avg);
      });
      
      rows.push(row);
    });
    
    // Add metadata section
    rows.push([]);
    rows.push(['Analysis Metadata']);
    rows.push(['Export Date', new Date().toISOString()]);
    rows.push(['Tool Version', 'fed-policy-cli v5.2.3']);
    
    if (metadata.targetPeriod) {
      rows.push(['Target Period', metadata.targetPeriod]);
    } else if (metadata.months) {
      rows.push(['Analysis Window', `Last ${metadata.months} months`]);
    }
    
    if (metadata.template) {
      rows.push(['Template Used', metadata.template]);
    }
    
    rows.push(['Indicators', indicators.map(ind => `${ind.id}:${ind.weight}`).join(', ')]);
    
    // Convert to CSV format
    const csvContent = rows
      .map(row => row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma or newline
        const escaped = String(cell).replace(/"/g, '""');
        return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(','))
      .join('\n');
    
    await fs.writeFile(filePath, csvContent, 'utf-8');
  }

  /**
   * Export analysis results to JSON format
   */
  async exportToJSON(
    analogues: HistoricalAnalogue[],
    indicators: WeightedIndicator[],
    targetScenario: EconomicDataPoint[],
    filePath: string,
    metadata: Partial<ExportMetadata['parameters']>
  ): Promise<void> {
    const exportData: AnalysisExport = {
      metadata: {
        exportDate: new Date().toISOString(),
        toolVersion: 'fed-policy-cli v5.2.3',
        analysisType: 'historical-analogues',
        dataSource: 'FRED',
        parameters: {
          ...metadata,
          indicators,
          topN: analogues.length
        }
      },
      targetScenario: {
        startDate: targetScenario[0]?.date || '',
        endDate: targetScenario[targetScenario.length - 1]?.date || '',
        data: targetScenario
      },
      analogues: analogues.map((analogue, index) => ({
        ...analogue,
        rank: index + 1,
        indicatorAverages: indicators.reduce((acc, ind) => {
          const values = analogue.data
            .map(d => d[ind.id])
            .filter(v => v !== undefined && v !== null)
            .map(v => Number(v));
          
          acc[ind.id] = {
            name: FRED_SERIES[ind.id].name,
            weight: ind.weight,
            average: values.length > 0 
              ? values.reduce((sum, v) => sum + v, 0) / values.length
              : null,
            min: values.length > 0 ? Math.min(...values) : null,
            max: values.length > 0 ? Math.max(...values) : null
          };
          
          return acc;
        }, {} as Record<string, any>)
      }))
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    await fs.writeFile(filePath, jsonContent, 'utf-8');
  }

  /**
   * Generate default export filename
   */
  generateFilename(format: 'csv' | 'json'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `fed-policy-analysis-${timestamp}.${format}`;
  }

  /**
   * Ensure export directory exists
   */
  async ensureExportDirectory(exportPath: string): Promise<void> {
    const dir = path.dirname(exportPath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}