import { z } from 'zod';

// ============================================================================
// Chart Types
// ============================================================================

export const ChartTypeSchema = z.enum([
  'line',
  'bar',
  'stacked_bar',
  'pie',
  'donut',
  'table',
  'area',
]);
export type ChartType = z.infer<typeof ChartTypeSchema>;

export interface ChartSuggestion {
  type: ChartType;
  title: string;
  xAxis?: string;
  yAxis?: string | string[];
  reason: string;
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  data: ChartData;
  options?: ChartOptions;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }>;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export interface GeneratedChart {
  id: string;
  config: ChartConfig;
  imagePath: string;
  imageBase64?: string;
}
