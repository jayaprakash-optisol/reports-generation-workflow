import { parse } from 'csv-parse/sync';

import { createModuleLogger, type IDataProfiler } from '../../core/index.js';
import type {
  ChartSuggestion,
  ChartType,
  ColumnProfile,
  ColumnType,
  DataProfile,
  InputData,
  StructuredData,
  UnstructuredData,
} from '../../shared/types/index.js';

const logger = createModuleLogger('data-profiler');

export class DataProfiler implements IDataProfiler {
  /**
   * Profile input data and generate insights about structure
   */
  async profileData(inputData: InputData[]): Promise<{
    profile: DataProfile;
    parsedData: Record<string, unknown>[];
    textContent: string[];
  }> {
    let allRecords: Record<string, unknown>[] = [];
    const textContent: string[] = [];

    for (const input of inputData) {
      if (input.type === 'structured') {
        const records = this.parseStructuredData(input);
        allRecords = allRecords.concat(records);
      } else {
        textContent.push(this.parseUnstructuredData(input));
      }
    }

    const profile = this.generateProfile(allRecords);
    logger.info(`Data profiled: ${profile.rowCount} rows, ${profile.columnCount} columns`);

    return { profile, parsedData: allRecords, textContent };
  }

  /**
   * Parse structured data (JSON or CSV)
   */
  private parseStructuredData(input: StructuredData): Record<string, unknown>[] {
    if (input.format === 'csv') {
      const csvString = typeof input.data === 'string' ? input.data : '';
      return parse(csvString, {
        columns: true,
        skip_empty_lines: true,
        cast: true,
        cast_date: true,
      });
    }

    // JSON format
    if (typeof input.data === 'string') {
      return JSON.parse(input.data);
    }
    return input.data;
  }

  /**
   * Parse unstructured data
   */
  private parseUnstructuredData(input: UnstructuredData): string {
    return input.content;
  }

  /**
   * Generate comprehensive data profile
   */
  private generateProfile(records: Record<string, unknown>[]): DataProfile {
    if (records.length === 0) {
      return {
        rowCount: 0,
        columnCount: 0,
        columns: [],
        dataQualityScore: 0,
        suggestedCharts: [],
      };
    }

    const columns = this.profileColumns(records);
    const suggestedCharts = this.suggestCharts(columns, records);
    const dataQualityScore = this.calculateDataQualityScore(columns, records.length);

    return {
      rowCount: records.length,
      columnCount: columns.length,
      columns,
      dataQualityScore,
      suggestedCharts,
    };
  }

  /**
   * Profile each column in the dataset
   */
  private profileColumns(records: Record<string, unknown>[]): ColumnProfile[] {
    const columnNames = Object.keys(records[0] || {});

    return columnNames.map(name => {
      const values = records.map(r => r[name]);
      const type = this.inferColumnType(values);
      const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

      const profile: ColumnProfile = {
        name,
        type,
        nullCount: values.length - nonNullValues.length,
        uniqueCount: new Set(nonNullValues.map(String)).size,
      };

      if (type === 'numeric') {
        const numbers = nonNullValues.map(Number).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          profile.min = Math.min(...numbers);
          profile.max = Math.max(...numbers);
          profile.mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
          profile.median = this.calculateMedian(numbers);
          profile.stdDev = this.calculateStdDev(numbers, profile.mean);
        }
      } else if (type === 'categorical' || type === 'text') {
        profile.topValues = this.getTopValues(nonNullValues.map(String), 5);
      } else if (type === 'datetime') {
        const dates = nonNullValues.filter((v): v is Date => v instanceof Date);
        if (dates.length > 0) {
          profile.min = dates.reduce((a, b) => (a < b ? a : b)).toISOString();
          profile.max = dates.reduce((a, b) => (a > b ? a : b)).toISOString();
        }
      }

      return profile;
    });
  }

  /**
   * Infer the type of a column based on its values
   */
  private inferColumnType(values: unknown[]): ColumnType {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

    if (nonNullValues.length === 0) return 'unknown';

    // Check for dates
    const dateCount = nonNullValues.filter(v => v instanceof Date || this.isDateString(v)).length;
    if (dateCount / nonNullValues.length > 0.8) return 'datetime';

    // Check for booleans
    const boolCount = nonNullValues.filter(v => typeof v === 'boolean').length;
    if (boolCount / nonNullValues.length > 0.8) return 'boolean';

    // Check for numbers
    const numCount = nonNullValues.filter(
      v => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '')
    ).length;
    if (numCount / nonNullValues.length > 0.8) return 'numeric';

    // Check for categorical (low cardinality strings)
    const uniqueRatio = new Set(nonNullValues.map(String)).size / nonNullValues.length;
    if (uniqueRatio < 0.5 && nonNullValues.length > 10) return 'categorical';

    return 'text';
  }

  /**
   * Check if a value is a date string
   */
  private isDateString(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && value.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/) !== null;
  }

  /**
   * Calculate median of numeric array
   */
  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(numbers: number[], mean: number): number {
    const variance =
      numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  /**
   * Get top N most frequent values
   */
  private getTopValues(values: string[], n: number): Array<{ value: string; count: number }> {
    const counts = new Map<string, number>();
    for (const v of values) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([value, count]) => ({ value, count }));
  }

  /**
   * Suggest appropriate charts based on data profile
   */
  private suggestCharts(
    columns: ColumnProfile[],
    records: Record<string, unknown>[]
  ): ChartSuggestion[] {
    const suggestions: ChartSuggestion[] = [];

    const dateColumns = columns.filter(c => c.type === 'datetime');
    const numericColumns = columns.filter(c => c.type === 'numeric');
    const categoricalColumns = columns.filter(c => c.type === 'categorical');

    // Time series charts
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      for (const numCol of numericColumns.slice(0, 3)) {
        suggestions.push({
          type: 'line' as ChartType,
          title: `${numCol.name} Over Time`,
          xAxis: dateColumns[0].name,
          yAxis: numCol.name,
          reason: 'Time-series data detected - line chart recommended for trend visualization',
        });
      }
    }

    // Category comparisons
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      for (const catCol of categoricalColumns.slice(0, 2)) {
        for (const numCol of numericColumns.slice(0, 2)) {
          suggestions.push({
            type: 'bar' as ChartType,
            title: `${numCol.name} by ${catCol.name}`,
            xAxis: catCol.name,
            yAxis: numCol.name,
            reason: 'Categorical grouping detected - bar chart recommended for comparison',
          });
        }
      }
    }

    // Distribution charts
    if (categoricalColumns.length > 0) {
      for (const catCol of categoricalColumns.slice(0, 2)) {
        if (catCol.uniqueCount <= 8) {
          suggestions.push({
            type: 'pie' as ChartType,
            title: `${catCol.name} Distribution`,
            xAxis: catCol.name,
            reason: 'Low-cardinality categorical data - pie chart recommended for distribution',
          });
        }
      }
    }

    // Multi-metric comparison
    if (numericColumns.length >= 2 && categoricalColumns.length > 0) {
      suggestions.push({
        type: 'stacked_bar' as ChartType,
        title: 'Multi-Metric Comparison',
        xAxis: categoricalColumns[0].name,
        yAxis: numericColumns.slice(0, 3).map(c => c.name),
        reason: 'Multiple numeric metrics with categories - stacked bar recommended',
      });
    }

    // Summary table
    if (records.length > 0) {
      suggestions.push({
        type: 'table' as ChartType,
        title: 'Key Metrics Summary',
        reason: 'Tabular summary of key statistics',
      });
    }

    return suggestions.slice(0, 8); // Limit to 8 suggestions
  }

  /**
   * Calculate data quality score (0-100)
   */
  private calculateDataQualityScore(columns: ColumnProfile[], rowCount: number): number {
    if (columns.length === 0 || rowCount === 0) return 0;

    let score = 100;

    // Penalize for null values
    const totalCells = columns.length * rowCount;
    const totalNulls = columns.reduce((sum, col) => sum + col.nullCount, 0);
    const nullRate = totalNulls / totalCells;
    score -= nullRate * 30;

    // Penalize for low uniqueness in non-categorical columns
    const nonCatColumns = columns.filter(c => c.type !== 'categorical');
    if (nonCatColumns.length > 0) {
      const avgUniqueness =
        nonCatColumns.reduce((sum, col) => sum + col.uniqueCount / rowCount, 0) /
        nonCatColumns.length;
      if (avgUniqueness < 0.1) score -= 20;
    }

    // Penalize for unknown column types
    const unknownCount = columns.filter(c => c.type === 'unknown').length;
    score -= (unknownCount / columns.length) * 20;

    return Math.max(0, Math.round(score));
  }
}
