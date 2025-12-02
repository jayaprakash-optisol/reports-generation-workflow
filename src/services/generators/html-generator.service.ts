import { createModuleLogger, type IHTMLGenerator } from '../../core/index.js';
import type {
  Branding,
  DataProfile,
  GeneratedChart,
  GeneratedNarrative,
  Report,
  ReportStyle,
  TableData,
} from '../../shared/types/index.js';

import type { StyleConfig } from './styles.js';
import { applyBrandingToStyle, getStyleConfig } from './styles.js';

const logger = createModuleLogger('html-generator');

// Infographic color palettes
const COLOR_PALETTES = {
  business: {
    primary: '#1a365d',
    secondary: '#3182ce',
    accent: '#ed8936',
    gradient: ['#667eea', '#764ba2'],
    bars: ['#e91e8b', '#9c27b0', '#00bcd4', '#4caf50'],
    bg: '#f0f9ff',
  },
  research: {
    primary: '#0891b2',
    secondary: '#06b6d4',
    accent: '#f472b6',
    gradient: ['#06b6d4', '#0891b2'],
    bars: ['#e91e63', '#9c27b0', '#00bcd4', '#8bc34a'],
    bg: '#ecfeff',
  },
  technical: {
    primary: '#312e81',
    secondary: '#6366f1',
    accent: '#f59e0b',
    gradient: ['#312e81', '#6366f1'],
    bars: ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981'],
    bg: '#f5f3ff',
  },
};

export class HTMLGenerator implements IHTMLGenerator {
  /**
   * Generate infographic-style HTML report
   */
  generateReport(
    report: Report,
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    dataProfile: DataProfile,
    branding?: Branding
  ): string {
    const styleConfig = applyBrandingToStyle(getStyleConfig(report.style), branding);
    const palette = COLOR_PALETTES[report.style];

    const html = this.buildInfographicReport(
      report,
      narrative,
      charts,
      dataProfile,
      styleConfig,
      palette,
      branding
    );

    logger.info(`Generated infographic report: ${report.title}`);
    return html;
  }

  /**
   * Generate generic table
   */
  generateTable(tableData: TableData): string {
    const headers = tableData.headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('');
    const rows = tableData.rows
      .map(row => `<tr>${row.map(cell => `<td>${this.escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('');

    return `
      <div class="table-wrapper">
        <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
      </div>
    `;
  }

  /**
   * Build infographic-style report
   */
  private buildInfographicReport(
    report: Report,
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    dataProfile: DataProfile,
    styleConfig: StyleConfig,
    palette: (typeof COLOR_PALETTES)[keyof typeof COLOR_PALETTES],
    branding?: Branding
  ): string {
    const companyName = branding?.companyName ?? 'AI Report Generator';
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Page 1: Cover
    const coverPage = this.generateCoverPage(report, companyName, date, palette);

    // Page 2: Summary with metrics
    const summaryPage = this.generateSummaryPage(narrative, dataProfile, report.style, palette);

    // Page 3: Key Findings with visuals
    const findingsPage = this.generateFindingsPage(narrative, charts.slice(0, 2), palette);

    // Page 4: Analysis with charts
    const analysisPage = this.generateAnalysisPage(
      narrative,
      charts.slice(2, 4),
      dataProfile,
      palette
    );

    // Page 5: Recommendations
    const recommendationsPage = this.generateRecommendationsPage(
      narrative,
      dataProfile,
      companyName,
      palette
    );

    const css = this.generateInfographicCSS(palette, styleConfig);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(report.title)}</title>
  <style>${css}</style>
</head>
<body>
  ${coverPage}
  ${summaryPage}
  ${findingsPage}
  ${analysisPage}
  ${recommendationsPage}
</body>
</html>`;
  }

  /**
   * Generate infographic cover page
   */
  private generateCoverPage(
    report: Report,
    companyName: string,
    date: string,
    palette: (typeof COLOR_PALETTES)[keyof typeof COLOR_PALETTES]
  ): string {
    const styleLabel = this.getStyleLabel(report.style);

    return `
    <div class="page cover-page">
      <div class="wave-top"></div>
      <div class="wave-bottom"></div>

      <div class="cover-content">
        <div class="cover-header">
          <span class="company-badge">${this.escapeHtml(companyName)}</span>
        </div>

        <h1 class="cover-title">${this.escapeHtml(report.title)}</h1>

        <div class="cover-meta-cards">
          <div class="meta-card">
            <div class="meta-icon">${this.getSvgIcon('calendar')}</div>
            <div class="meta-text">
              <span class="meta-label">Date</span>
              <span class="meta-value">${date}</span>
            </div>
          </div>
          <div class="meta-card">
            <div class="meta-icon">${this.getSvgIcon('document')}</div>
            <div class="meta-text">
              <span class="meta-label">Type</span>
              <span class="meta-value">${styleLabel}</span>
            </div>
          </div>
          <div class="meta-card">
            <div class="meta-icon">${this.getSvgIcon('chart')}</div>
            <div class="meta-text">
              <span class="meta-label">Report ID</span>
              <span class="meta-value">${report.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        <div class="decorative-circles">
          <div class="circle c1"></div>
          <div class="circle c2"></div>
          <div class="circle c3"></div>
        </div>
      </div>

      <div class="cover-footer">
        <span>AI-Generated Analysis Report</span>
      </div>
    </div>
    `;
  }

  /**
   * Generate summary page with infographic elements
   */
  private generateSummaryPage(
    narrative: GeneratedNarrative,
    dataProfile: DataProfile,
    style: ReportStyle,
    palette: (typeof COLOR_PALETTES)[keyof typeof COLOR_PALETTES]
  ): string {
    const summaryTitle = style === 'research' ? 'Abstract' : 'Executive Summary';
    const completeness = this.calculateCompleteness(dataProfile);

    // Generate progress bars for key metrics
    const metricsHtml = `
      <div class="metrics-visual">
        <div class="metric-bar-item">
          <div class="bar-header">
            <span class="bar-label">Data Quality</span>
            <span class="bar-value">${dataProfile.dataQualityScore}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill bar-1" style="width: ${dataProfile.dataQualityScore}%"></div>
          </div>
        </div>

        <div class="metric-bar-item">
          <div class="bar-header">
            <span class="bar-label">Completeness</span>
            <span class="bar-value">${completeness}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill bar-2" style="width: ${completeness}%"></div>
          </div>
        </div>

        <div class="metric-bar-item">
          <div class="bar-header">
            <span class="bar-label">Analysis Coverage</span>
            <span class="bar-value">${Math.min(100, dataProfile.suggestedCharts.length * 20)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill bar-3" style="width: ${Math.min(100, dataProfile.suggestedCharts.length * 20)}%"></div>
          </div>
        </div>
      </div>
    `;

    // Stats badges
    const statsBadges = `
      <div class="stats-badges">
        <div class="stat-badge">
          <span class="badge-number">${dataProfile.rowCount.toLocaleString()}</span>
          <span class="badge-label">Records</span>
        </div>
        <div class="stat-badge">
          <span class="badge-number">${dataProfile.columnCount}</span>
          <span class="badge-label">Data Points</span>
        </div>
        <div class="stat-badge">
          <span class="badge-number">${dataProfile.suggestedCharts.length}</span>
          <span class="badge-label">Visualizations</span>
        </div>
      </div>
    `;

    return `
    <div class="page content-page">
      <div class="page-wave"></div>

      <div class="section-header">
        <span class="section-num">01</span>
        <h2 class="section-title">${summaryTitle}</h2>
      </div>

      <div class="infographic-layout">
        <div class="content-column">
          <div class="summary-box">
            ${this.formatParagraphs(narrative.executiveSummary)}
          </div>
        </div>

        <div class="visual-column">
          ${metricsHtml}
          ${statsBadges}
        </div>
      </div>

      <div class="page-number">Page 2</div>
    </div>
    `;
  }

  /**
   * Generate findings page with timeline and visuals
   */
  private generateFindingsPage(
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    palette: (typeof COLOR_PALETTES)[keyof typeof COLOR_PALETTES]
  ): string {
    // Timeline-style findings
    const findingsTimeline = narrative.keyFindings
      .slice(0, 5)
      .map(
        (finding, index) => `
        <div class="timeline-item">
          <div class="timeline-dot" style="background: ${palette.bars[index % palette.bars.length]}"></div>
          <div class="timeline-content">
            <span class="timeline-number">${String(index + 1).padStart(2, '0')}</span>
            <p>${this.escapeHtml(finding)}</p>
          </div>
        </div>
      `
      )
      .join('');

    // Charts if available
    const chartsHtml =
      charts.length > 0
        ? `
      <div class="charts-grid">
        ${charts.map(chart => this.generateChartCard(chart)).join('')}
      </div>
    `
        : '';

    return `
    <div class="page content-page">
      <div class="page-wave"></div>

      <div class="section-header">
        <span class="section-num">02</span>
        <h2 class="section-title">Key Findings</h2>
      </div>

      <div class="findings-layout">
        <div class="timeline-section">
          <div class="timeline-line"></div>
          ${findingsTimeline}
        </div>

        ${chartsHtml}
      </div>

      <div class="page-number">Page 3</div>
    </div>
    `;
  }

  /**
   * Generate analysis page with data visualizations
   */
  private generateAnalysisPage(
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    dataProfile: DataProfile,
    palette: (typeof COLOR_PALETTES)[keyof typeof COLOR_PALETTES]
  ): string {
    // Analysis sections as numbered cards
    const sectionsHtml = narrative.sections
      .slice(0, 3)
      .map(
        (section, index) => `
        <div class="analysis-card">
          <div class="card-header">
            <span class="card-num" style="background: linear-gradient(135deg, ${palette.bars[index % palette.bars.length]}, ${palette.bars[(index + 1) % palette.bars.length]})">${String(index + 3).padStart(2, '0')}</span>
            <h3>${this.escapeHtml(section.sectionTitle)}</h3>
          </div>
          <div class="card-body">
            ${this.formatParagraphs(section.content.slice(0, 300) + (section.content.length > 300 ? '...' : ''))}
          </div>
        </div>
      `
      )
      .join('');

    // Data distribution bars
    const numericCols = dataProfile.columns.filter(c => c.type === 'numeric').slice(0, 4);
    const distributionHtml =
      numericCols.length > 0
        ? `
      <div class="distribution-panel">
        <h4>Data Distribution</h4>
        <div class="distribution-bars">
          ${numericCols
            .map(
              (col, i) => `
            <div class="dist-item">
              <span class="dist-label">${this.escapeHtml(col.name.slice(0, 15))}</span>
              <div class="dist-bar">
                <div class="dist-fill" style="width: ${Math.min(100, ((col.mean ?? 0) / Math.max(col.max as number, 1)) * 100)}%; background: ${palette.bars[i % palette.bars.length]}"></div>
              </div>
              <span class="dist-value">${col.mean?.toFixed(1) ?? 'N/A'}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
        : '';

    // Charts
    const chartHtml = charts.length > 0 ? this.generateChartCard(charts[0]) : '';

    return `
    <div class="page content-page">
      <div class="page-wave"></div>

      <div class="section-header">
        <span class="section-num">03</span>
        <h2 class="section-title">Analysis</h2>
      </div>

      <div class="analysis-grid">
        ${sectionsHtml}
      </div>

      <div class="data-visuals">
        ${distributionHtml}
        ${chartHtml ? `<div class="chart-area">${chartHtml}</div>` : ''}
      </div>

      <div class="page-number">Page 4</div>
    </div>
    `;
  }

  /**
   * Generate recommendations page
   */
  private generateRecommendationsPage(
    narrative: GeneratedNarrative,
    dataProfile: DataProfile,
    companyName: string,
    palette: (typeof COLOR_PALETTES)[keyof typeof COLOR_PALETTES]
  ): string {
    // Numbered recommendations with icons
    const recsHtml = narrative.recommendations
      .slice(0, 5)
      .map(
        (rec, index) => `
        <div class="rec-item">
          <div class="rec-badge" style="background: linear-gradient(135deg, ${palette.bars[index % palette.bars.length]}, ${palette.bars[(index + 1) % palette.bars.length]})">
            ${String(index + 1).padStart(2, '0')}
          </div>
          <p>${this.escapeHtml(rec)}</p>
        </div>
      `
      )
      .join('');

    // Statistics summary
    const numericCols = dataProfile.columns.filter(c => c.type === 'numeric').slice(0, 4);
    const statsTable =
      numericCols.length > 0
        ? `
      <div class="stats-summary">
        <h4>Statistical Summary</h4>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Min</th>
              <th>Max</th>
              <th>Mean</th>
            </tr>
          </thead>
          <tbody>
            ${numericCols
              .map(
                col => `
              <tr>
                <td>${this.escapeHtml(col.name)}</td>
                <td>${col.min?.toLocaleString() ?? 'N/A'}</td>
                <td>${col.max?.toLocaleString() ?? 'N/A'}</td>
                <td>${col.mean?.toFixed(2) ?? 'N/A'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
        : '';

    return `
    <div class="page content-page">
      <div class="page-wave"></div>

      <div class="section-header">
        <span class="section-num">04</span>
        <h2 class="section-title">Recommendations</h2>
      </div>

      <div class="recommendations-grid">
        ${recsHtml}
      </div>

      ${statsTable}

      <div class="report-footer">
        <div class="footer-brand">
          <div class="brand-circle">${companyName[0]}</div>
          <span>${this.escapeHtml(companyName)}</span>
        </div>
        <div class="footer-meta">
          Generated on ${new Date().toLocaleDateString()} • AI Report Generator
        </div>
      </div>

      <div class="page-number">Page 5</div>
    </div>
    `;
  }

  /**
   * Generate chart card
   */
  private generateChartCard(chart: GeneratedChart): string {
    const imgSrc = chart.imageBase64
      ? `data:image/png;base64,${chart.imageBase64}`
      : chart.imagePath;

    return `
      <div class="chart-card">
        <img src="${imgSrc}" alt="${this.escapeHtml(chart.config.title)}" />
        <span class="chart-label">${this.escapeHtml(chart.config.title)}</span>
      </div>
    `;
  }

  /**
   * Get style label
   */
  private getStyleLabel(style: ReportStyle): string {
    const labels: Record<ReportStyle, string> = {
      business: 'Business Report',
      research: 'Research Analysis',
      technical: 'Technical Report',
    };
    return labels[style];
  }

  /**
   * Calculate completeness
   */
  private calculateCompleteness(dataProfile: DataProfile): number {
    const totalCells = dataProfile.rowCount * dataProfile.columnCount;
    if (totalCells === 0) return 100;
    const nullCells = dataProfile.columns.reduce((sum, col) => sum + col.nullCount, 0);
    return Math.round(((totalCells - nullCells) / totalCells) * 100);
  }

  /**
   * Get SVG icons
   */
  private getSvgIcon(name: string): string {
    const icons: Record<string, string> = {
      calendar:
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
      document:
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
      chart:
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
    };
    return icons[name] ?? '';
  }

  /**
   * Format paragraphs
   */
  private formatParagraphs(text: string): string {
    return text
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${this.escapeHtml(p.trim())}</p>`)
      .join('');
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  /**
   * Generate infographic CSS
   */
  private generateInfographicCSS(
    palette: (typeof COLOR_PALETTES)[keyof typeof COLOR_PALETTES],
    styleConfig: StyleConfig
  ): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');

      :root {
        --primary: ${palette.primary};
        --secondary: ${palette.secondary};
        --accent: ${palette.accent};
        --bg: ${palette.bg};
        --bar-1: ${palette.bars[0]};
        --bar-2: ${palette.bars[1]};
        --bar-3: ${palette.bars[2]};
        --bar-4: ${palette.bars[3]};
        --text: #1e293b;
        --text-light: #64748b;
        --white: #ffffff;
        --font-heading: 'Poppins', sans-serif;
        --font-body: 'Inter', sans-serif;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: var(--font-body);
        font-size: 14px;
        color: var(--text);
        background: #e2e8f0;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
      }

      /* Page Layout */
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 20px auto;
        background: var(--white);
        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        position: relative;
        overflow: hidden;
        page-break-after: always;
      }

      @media print {
        body { background: white; }
        .page { box-shadow: none; margin: 0; }
      }

      /* Decorative Waves */
      .wave-top, .wave-bottom, .page-wave {
        position: absolute;
        width: 100%;
        height: 120px;
        background: linear-gradient(135deg, ${palette.gradient[0]}, ${palette.gradient[1]});
      }

      .wave-top {
        top: 0;
        border-radius: 0 0 50% 50% / 0 0 100% 100%;
      }

      .wave-bottom {
        bottom: 0;
        border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        height: 80px;
      }

      .page-wave {
        top: 0;
        height: 60px;
        border-radius: 0 0 0 100px;
      }

      /* Cover Page */
      .cover-page {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 60px 40px;
        background: var(--bg);
      }

      .cover-content {
        text-align: center;
        position: relative;
        z-index: 2;
        padding: 40px;
      }

      .cover-header {
        margin-bottom: 40px;
      }

      .company-badge {
        display: inline-block;
        padding: 8px 24px;
        background: linear-gradient(135deg, ${palette.gradient[0]}, ${palette.gradient[1]});
        color: white;
        border-radius: 30px;
        font-size: 14px;
        font-weight: 600;
        font-family: var(--font-heading);
        letter-spacing: 0.02em;
      }

      .cover-title {
        font-family: var(--font-heading);
        font-size: 48px;
        font-weight: 800;
        color: var(--primary);
        line-height: 1.2;
        margin-bottom: 50px;
        max-width: 600px;
        letter-spacing: -0.02em;
      }

      .cover-meta-cards {
        display: flex;
        justify-content: center;
        gap: 24px;
        margin-bottom: 40px;
      }

      .meta-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 24px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      }

      .meta-icon {
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, ${palette.gradient[0]}, ${palette.gradient[1]});
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      .meta-text {
        text-align: left;
      }

      .meta-label {
        display: block;
        font-size: 11px;
        color: var(--text-light);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
      }

      .meta-value {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
      }

      .decorative-circles {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1;
        pointer-events: none;
      }

      .circle {
        position: absolute;
        border-radius: 50%;
        border: 2px solid;
        opacity: 0.1;
      }

      .c1 { width: 400px; height: 400px; border-color: ${palette.bars[0]}; top: -200px; left: -200px; }
      .c2 { width: 300px; height: 300px; border-color: ${palette.bars[1]}; top: -150px; left: 50px; }
      .c3 { width: 200px; height: 200px; border-color: ${palette.bars[2]}; top: -100px; left: -50px; }

      .cover-footer {
        position: absolute;
        bottom: 30px;
        left: 0;
        right: 0;
        text-align: center;
        color: var(--text-light);
        font-size: 12px;
        font-weight: 500;
      }

      /* Content Pages */
      .content-page {
        padding: 80px 40px 60px;
        background: var(--white);
      }

      .section-header {
        display: flex;
        align-items: baseline;
        gap: 16px;
        margin-bottom: 32px;
        padding-left: 20px;
      }

      .section-num {
        font-family: var(--font-heading);
        font-size: 48px;
        font-weight: 800;
        background: linear-gradient(135deg, ${palette.gradient[0]}, ${palette.gradient[1]});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1;
      }

      .section-title {
        font-family: var(--font-heading);
        font-size: 28px;
        font-weight: 700;
        color: var(--text);
      }

      /* Infographic Layout */
      .infographic-layout {
        display: grid;
        grid-template-columns: 1fr 280px;
        gap: 30px;
        padding: 0 20px;
      }

      .content-column {}
      .visual-column {}

      .summary-box {
        background: var(--bg);
        border-radius: 20px;
        padding: 28px;
        border-left: 5px solid var(--primary);
      }

      .summary-box p {
        color: var(--text-light);
        margin-bottom: 14px;
        line-height: 1.7;
      }

      .summary-box p:last-child { margin-bottom: 0; }

      /* Progress Bars */
      .metrics-visual {
        background: var(--bg);
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 20px;
      }

      .metric-bar-item {
        margin-bottom: 20px;
      }

      .metric-bar-item:last-child { margin-bottom: 0; }

      .bar-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .bar-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text);
      }

      .bar-value {
        font-size: 14px;
        font-weight: 700;
        color: var(--primary);
      }

      .progress-bar {
        height: 12px;
        background: #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        border-radius: 6px;
        transition: width 0.5s ease;
      }

      .bar-1 { background: linear-gradient(90deg, var(--bar-1), var(--bar-2)); }
      .bar-2 { background: linear-gradient(90deg, var(--bar-2), var(--bar-3)); }
      .bar-3 { background: linear-gradient(90deg, var(--bar-3), var(--bar-4)); }

      /* Stats Badges */
      .stats-badges {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .stat-badge {
        background: white;
        border-radius: 16px;
        padding: 16px 12px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      }

      .badge-number {
        display: block;
        font-size: 24px;
        font-weight: 800;
        font-family: var(--font-heading);
        color: var(--primary);
        line-height: 1;
        margin-bottom: 4px;
      }

      .badge-label {
        font-size: 10px;
        color: var(--text-light);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
      }

      /* Timeline Findings */
      .findings-layout {
        padding: 0 20px;
      }

      .timeline-section {
        position: relative;
        padding-left: 40px;
        margin-bottom: 30px;
      }

      .timeline-line {
        position: absolute;
        left: 15px;
        top: 0;
        bottom: 0;
        width: 3px;
        background: linear-gradient(180deg, var(--bar-1), var(--bar-2), var(--bar-3), var(--bar-4));
        border-radius: 2px;
      }

      .timeline-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 20px;
        position: relative;
      }

      .timeline-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        flex-shrink: 0;
        margin-left: -47px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }

      .timeline-content {
        flex: 1;
        background: var(--bg);
        border-radius: 16px;
        padding: 18px 20px;
      }

      .timeline-number {
        display: inline-block;
        font-family: var(--font-heading);
        font-size: 11px;
        font-weight: 700;
        color: var(--primary);
        background: white;
        padding: 4px 10px;
        border-radius: 20px;
        margin-bottom: 8px;
      }

      .timeline-content p {
        margin: 0;
        color: var(--text);
        font-size: 13px;
        line-height: 1.5;
      }

      /* Charts Grid */
      .charts-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
      }

      .chart-card {
        background: var(--bg);
        border-radius: 16px;
        padding: 16px;
        text-align: center;
      }

      .chart-card img {
        width: 100%;
        height: auto;
        border-radius: 12px;
        margin-bottom: 12px;
      }

      .chart-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text);
      }

      /* Analysis Grid */
      .analysis-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        padding: 0 20px;
        margin-bottom: 24px;
      }

      .analysis-card {
        background: var(--bg);
        border-radius: 16px;
        padding: 20px;
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .card-num {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: 700;
        font-family: var(--font-heading);
        flex-shrink: 0;
      }

      .card-header h3 {
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
        line-height: 1.3;
      }

      .card-body p {
        font-size: 12px;
        color: var(--text-light);
        line-height: 1.5;
        margin: 0;
      }

      /* Data Visuals */
      .data-visuals {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        padding: 0 20px;
      }

      .distribution-panel {
        background: var(--bg);
        border-radius: 16px;
        padding: 20px;
      }

      .distribution-panel h4 {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 16px;
        font-family: var(--font-heading);
      }

      .dist-item {
        display: grid;
        grid-template-columns: 80px 1fr 50px;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .dist-label {
        font-size: 11px;
        color: var(--text-light);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dist-bar {
        height: 8px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
      }

      .dist-fill {
        height: 100%;
        border-radius: 4px;
      }

      .dist-value {
        font-size: 12px;
        font-weight: 600;
        color: var(--text);
        text-align: right;
      }

      .chart-area {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Recommendations */
      .recommendations-grid {
        display: grid;
        gap: 14px;
        padding: 0 20px;
        margin-bottom: 30px;
      }

      .rec-item {
        display: flex;
        gap: 16px;
        padding: 18px 20px;
        background: var(--bg);
        border-radius: 16px;
        align-items: flex-start;
      }

      .rec-badge {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: 700;
        font-family: var(--font-heading);
        flex-shrink: 0;
      }

      .rec-item p {
        margin: 0;
        color: var(--text);
        font-size: 13px;
        line-height: 1.5;
        padding-top: 8px;
      }

      /* Stats Table */
      .stats-summary {
        padding: 0 20px;
        margin-bottom: 30px;
      }

      .stats-summary h4 {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 12px;
        font-family: var(--font-heading);
      }

      .stats-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        background: var(--bg);
        border-radius: 12px;
        overflow: hidden;
      }

      .stats-table th {
        padding: 14px 16px;
        text-align: left;
        background: linear-gradient(90deg, ${palette.gradient[0]}, ${palette.gradient[1]});
        color: white;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .stats-table td {
        padding: 12px 16px;
        border-bottom: 1px solid #e2e8f0;
      }

      .stats-table tr:last-child td { border-bottom: none; }

      /* Report Footer */
      .report-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        margin: 0 20px;
        background: var(--bg);
        border-radius: 16px;
      }

      .footer-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .brand-circle {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, ${palette.gradient[0]}, ${palette.gradient[1]});
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18px;
        font-weight: 800;
        font-family: var(--font-heading);
      }

      .footer-brand span {
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
      }

      .footer-meta {
        font-size: 11px;
        color: var(--text-light);
      }

      /* Page Number */
      .page-number {
        position: absolute;
        bottom: 20px;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 11px;
        color: var(--text-light);
        font-weight: 500;
      }

      /* Print */
      @media print {
        .page { page-break-after: always; }
        .wave-top, .wave-bottom, .page-wave, .decorative-circles {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
  }
}
