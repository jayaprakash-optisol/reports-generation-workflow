import type { ChartConfiguration, ChartType as ChartJSType } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { nanoid } from 'nanoid';

import { createModuleLogger, type IChartGenerator } from '../../core/index.js';
import type {
  ChartConfig,
  ChartSuggestion,
  ChartType,
  DataProfile,
  GeneratedChart,
} from '../../shared/types/index.js';
import { storage } from '../storage/index.js';

const logger = createModuleLogger('chart-generator');

// Color palette for charts
const CHART_COLORS = {
  primary: ['#3182ce', '#2b6cb0', '#2c5282', '#1a365d'],
  secondary: ['#48bb78', '#38a169', '#2f855a', '#276749'],
  accent: ['#ed8936', '#dd6b20', '#c05621', '#9c4221'],
  neutral: ['#718096', '#4a5568', '#2d3748', '#1a202c'],
  full: [
    '#3182ce',
    '#48bb78',
    '#ed8936',
    '#e53e3e',
    '#805ad5',
    '#38b2ac',
    '#d69e2e',
    '#dd6b20',
    '#3182ce',
    '#718096',
  ],
};

export class ChartGenerator implements IChartGenerator {
  private readonly chartJSNodeCanvas: ChartJSNodeCanvas;

  constructor(width = 800, height = 500) {
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width,
      height,
      backgroundColour: 'white',
    });
  }

  /**
   * Generate all suggested charts from data
   */
  async generateCharts(
    suggestions: ChartSuggestion[],
    parsedData: Record<string, unknown>[],
    reportId: string,
    dataProfile: DataProfile
  ): Promise<GeneratedChart[]> {
    const charts: GeneratedChart[] = [];

    for (const suggestion of suggestions) {
      try {
        const config = this.buildChartConfig(suggestion, parsedData, dataProfile);
        if (config) {
          const imageBuffer = await this.renderChart(config);
          const imagePath = await storage.saveChart(reportId, config.id, imageBuffer);

          charts.push({
            id: config.id,
            config,
            imagePath,
            imageBase64: imageBuffer.toString('base64'),
          });

          logger.debug(`Generated chart: ${config.title}`);
        }
      } catch (error) {
        logger.error(`Failed to generate chart: ${suggestion.title}`, { error });
      }
    }

    logger.info(`Generated ${charts.length} charts for report ${reportId}`);
    return charts;
  }

  /**
   * Generate summary statistics table data
   */
  generateSummaryTable(profile: DataProfile): { headers: string[]; rows: string[][] } {
    const numericColumns = profile.columns.filter(col => col.type === 'numeric');

    const headers = ['Metric', 'Min', 'Max', 'Mean', 'Std Dev'];
    const rows = numericColumns.map(col => [
      col.name,
      col.min?.toString() ?? 'N/A',
      col.max?.toString() ?? 'N/A',
      col.mean?.toFixed(2) ?? 'N/A',
      col.stdDev?.toFixed(2) ?? 'N/A',
    ]);

    return { headers, rows };
  }

  /**
   * Build chart configuration from suggestion
   */
  private buildChartConfig(
    suggestion: ChartSuggestion,
    data: Record<string, unknown>[],
    profile: DataProfile
  ): ChartConfig | null {
    const id = nanoid(10);

    switch (suggestion.type) {
      case 'line':
        return this.buildLineChartConfig(id, suggestion, data, profile);
      case 'bar':
        return this.buildBarChartConfig(id, suggestion, data, profile);
      case 'stacked_bar':
        return this.buildStackedBarConfig(id, suggestion, data, profile);
      case 'pie':
      case 'donut':
        return this.buildPieChartConfig(id, suggestion, data, profile);
      case 'area':
        return this.buildAreaChartConfig(id, suggestion, data, profile);
      case 'table':
        return null; // Tables handled separately
      default:
        return null;
    }
  }

  /**
   * Build line chart configuration
   */
  private buildLineChartConfig(
    id: string,
    suggestion: ChartSuggestion,
    data: Record<string, unknown>[],
    _profile: DataProfile
  ): ChartConfig {
    const xAxis = suggestion.xAxis ?? '';
    const yAxis = Array.isArray(suggestion.yAxis) ? suggestion.yAxis[0] : (suggestion.yAxis ?? '');

    const sortedData = [...data].sort((a, b) => {
      const aVal = new Date(a[xAxis] as string).getTime();
      const bVal = new Date(b[xAxis] as string).getTime();
      return aVal - bVal;
    });

    const labels = sortedData.map(row => this.formatLabel(row[xAxis]));
    const values = sortedData.map(row => Number(row[yAxis]) || 0);

    return {
      id,
      type: 'line',
      title: suggestion.title,
      data: {
        labels,
        datasets: [
          {
            label: yAxis,
            data: values,
            borderColor: CHART_COLORS.primary[0],
            backgroundColor: `${CHART_COLORS.primary[0]}20`,
          },
        ],
      },
      options: {
        xAxisLabel: xAxis,
        yAxisLabel: yAxis,
        showLegend: true,
        showGrid: true,
      },
    };
  }

  /**
   * Build bar chart configuration
   */
  private buildBarChartConfig(
    id: string,
    suggestion: ChartSuggestion,
    data: Record<string, unknown>[],
    _profile: DataProfile
  ): ChartConfig {
    const xAxis = suggestion.xAxis ?? '';
    const yAxis = Array.isArray(suggestion.yAxis) ? suggestion.yAxis[0] : (suggestion.yAxis ?? '');

    // Aggregate data by category
    const aggregated = this.aggregateByCategory(data, xAxis, yAxis);

    return {
      id,
      type: 'bar',
      title: suggestion.title,
      data: {
        labels: aggregated.labels,
        datasets: [
          {
            label: yAxis,
            data: aggregated.values,
            backgroundColor: CHART_COLORS.full.slice(0, aggregated.labels.length),
          },
        ],
      },
      options: {
        xAxisLabel: xAxis,
        yAxisLabel: yAxis,
        showLegend: false,
        showGrid: true,
      },
    };
  }

  /**
   * Build stacked bar chart configuration
   */
  private buildStackedBarConfig(
    id: string,
    suggestion: ChartSuggestion,
    data: Record<string, unknown>[],
    _profile: DataProfile
  ): ChartConfig {
    const xAxis = suggestion.xAxis ?? '';
    const yAxes = Array.isArray(suggestion.yAxis) ? suggestion.yAxis : [suggestion.yAxis ?? ''];

    const categories = [...new Set(data.map(row => String(row[xAxis])))];

    const datasets = yAxes.map((yAxis, index) => {
      const values = categories.map(cat => {
        const rows = data.filter(row => String(row[xAxis]) === cat);
        return rows.reduce((sum, row) => sum + (Number(row[yAxis]) || 0), 0);
      });

      return {
        label: yAxis,
        data: values,
        backgroundColor: CHART_COLORS.full[index % CHART_COLORS.full.length],
      };
    });

    return {
      id,
      type: 'stacked_bar',
      title: suggestion.title,
      data: {
        labels: categories,
        datasets,
      },
      options: {
        xAxisLabel: xAxis,
        showLegend: true,
        showGrid: true,
      },
    };
  }

  /**
   * Build pie/donut chart configuration
   */
  private buildPieChartConfig(
    id: string,
    suggestion: ChartSuggestion,
    data: Record<string, unknown>[],
    _profile: DataProfile
  ): ChartConfig {
    const xAxis = suggestion.xAxis ?? '';

    // Count occurrences
    const counts = new Map<string, number>();
    for (const row of data) {
      const key = String(row[xAxis]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const sortedEntries = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      id,
      type: suggestion.type === 'donut' ? 'donut' : 'pie',
      title: suggestion.title,
      data: {
        labels: sortedEntries.map(([label]) => label),
        datasets: [
          {
            label: 'Distribution',
            data: sortedEntries.map(([, count]) => count),
            backgroundColor: CHART_COLORS.full.slice(0, sortedEntries.length),
          },
        ],
      },
      options: {
        showLegend: true,
      },
    };
  }

  /**
   * Build area chart configuration
   */
  private buildAreaChartConfig(
    id: string,
    suggestion: ChartSuggestion,
    data: Record<string, unknown>[],
    profile: DataProfile
  ): ChartConfig {
    const config = this.buildLineChartConfig(id, suggestion, data, profile);
    config.type = 'area';
    if (config.data.datasets[0]) {
      config.data.datasets[0].backgroundColor = `${CHART_COLORS.primary[0]}40`;
    }
    return config;
  }

  /**
   * Render chart to PNG buffer
   */
  private async renderChart(config: ChartConfig): Promise<Buffer> {
    const chartJSConfig = this.toChartJSConfig(config);
    return await this.chartJSNodeCanvas.renderToBuffer(chartJSConfig);
  }

  /**
   * Convert internal config to Chart.js config
   */
  private toChartJSConfig(config: ChartConfig): ChartConfiguration {
    const chartTypeMap: Record<ChartType, ChartJSType> = {
      line: 'line',
      bar: 'bar',
      stacked_bar: 'bar',
      pie: 'pie',
      donut: 'doughnut',
      area: 'line',
      table: 'bar',
    };

    const chartType = chartTypeMap[config.type];

    const chartConfig: ChartConfiguration = {
      type: chartType,
      data: {
        labels: config.data.labels,
        datasets: config.data.datasets.map(ds => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.backgroundColor,
          borderColor: ds.borderColor ?? ds.backgroundColor,
          borderWidth: chartType === 'line' ? 2 : 1,
          fill: config.type === 'area',
          tension: 0.3,
        })),
      },
      options: {
        responsive: false,
        maintainAspectRatio: true,
        plugins: {
          title: {
            display: true,
            text: config.title,
            font: { size: 16, weight: 'bold' },
            padding: 20,
          },
          legend: {
            display: config.options?.showLegend ?? true,
            position: 'bottom',
          },
        },
        scales:
          chartType === 'pie' || chartType === 'doughnut'
            ? undefined
            : {
                x: {
                  title: {
                    display: !!config.options?.xAxisLabel,
                    text: config.options?.xAxisLabel ?? '',
                  },
                  grid: {
                    display: config.options?.showGrid ?? true,
                  },
                  stacked: config.type === 'stacked_bar',
                },
                y: {
                  title: {
                    display: !!config.options?.yAxisLabel,
                    text: config.options?.yAxisLabel ?? '',
                  },
                  grid: {
                    display: config.options?.showGrid ?? true,
                  },
                  stacked: config.type === 'stacked_bar',
                  beginAtZero: true,
                },
              },
      },
    };

    return chartConfig;
  }

  /**
   * Aggregate data by category
   */
  private aggregateByCategory(
    data: Record<string, unknown>[],
    categoryKey: string,
    valueKey: string
  ): { labels: string[]; values: number[] } {
    const aggregated = new Map<string, number>();

    for (const row of data) {
      const category = String(row[categoryKey]);
      const value = Number(row[valueKey]) || 0;
      aggregated.set(category, (aggregated.get(category) ?? 0) + value);
    }

    const sorted = Array.from(aggregated.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      labels: sorted.map(([label]) => label),
      values: sorted.map(([, value]) => value),
    };
  }

  /**
   * Format label for display
   */
  private formatLabel(value: unknown): string {
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
      return new Date(value).toLocaleDateString();
    }
    return String(value);
  }
}

