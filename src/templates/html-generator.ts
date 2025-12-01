import type {
  Branding,
  DataProfile,
  GeneratedChart,
  GeneratedNarrative,
  Report,
  TableData,
} from '../types/index.js';
import { createModuleLogger } from '../utils/logger.js';

import type { StyleConfig } from './styles.js';
import { applyBrandingToStyle, generateCSS, getStyleConfig } from './styles.js';

const logger = createModuleLogger('html-generator');

// Modern gradient configurations for metric cards
const METRIC_GRADIENTS = [
  { id: 'purple', colors: ['#667eea', '#764ba2'] },
  { id: 'blue', colors: ['#4facfe', '#00f2fe'] },
  { id: 'pink', colors: ['#f093fb', '#f5576c'] },
  { id: 'teal', colors: ['#11998e', '#38ef7d'] },
  { id: 'orange', colors: ['#fa709a', '#fee140'] },
];

export class HTMLGenerator {
  /**
   * Generate complete HTML report with modern dashboard UI
   */
  generateReport(
    report: Report,
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    dataProfile: DataProfile,
    branding?: Branding
  ): string {
    const styleConfig = applyBrandingToStyle(getStyleConfig(report.style), branding);

    const mainContent = this.buildDashboardContent(
      styleConfig,
      report,
      narrative,
      charts,
      dataProfile
    );

    const html = this.wrapInDashboardDocument(
      report.title,
      styleConfig,
      mainContent,
      narrative,
      branding
    );

    logger.info(`Generated HTML report: ${report.title}`);
    return html;
  }

  /**
   * Build dashboard main content
   */
  private buildDashboardContent(
    styleConfig: StyleConfig,
    report: Report,
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    dataProfile: DataProfile
  ): string {
    const summaryTitle = report.style === 'research' ? 'Abstract' : 'Executive Summary';

    // Build metric cards from data profile
    const metricsSection = this.generateMetricsSection(dataProfile);

    // Build narrative sections with charts
    let chartIndex = 0;
    const narrativeSections = narrative.sections.map(section => {
      const sectionCharts = charts.slice(chartIndex, chartIndex + 2);
      chartIndex += 2;
      return this.generateMixedSection(section, sectionCharts);
    });

    const sections = [
      // Metrics dashboard cards
      metricsSection,
      // Executive summary / Abstract
      this.generateTextSection(summaryTitle, narrative.executiveSummary, 'executive-summary'),
      // Key findings
      ...(narrative.keyFindings.length > 0
        ? [this.generateKeyFindings(narrative.keyFindings)]
        : []),
      // Narrative sections with charts
      ...narrativeSections,
      // Recommendations
      ...(narrative.recommendations.length > 0
        ? [this.generateRecommendations(narrative.recommendations)]
        : []),
      // Statistics table
      ...(dataProfile.columns.length > 0 ? [this.generateStatisticsTable(dataProfile)] : []),
    ];

    return sections.join('\n');
  }

  /**
   * Generate metrics dashboard section with circular progress indicators
   */
  private generateMetricsSection(dataProfile: DataProfile): string {
    const metrics = [
      {
        label: 'Data Quality',
        value: dataProfile.dataQualityScore,
        title: 'Quality Score',
        description: 'Overall data quality assessment',
        gradient: 'purple',
      },
      {
        label: 'Completeness',
        value: this.calculateCompleteness(dataProfile),
        title: 'Completeness',
        description: 'Percentage of non-null values',
        gradient: 'blue',
      },
      {
        label: 'Columns Analyzed',
        value: Math.min(100, (dataProfile.columnCount / 20) * 100),
        title: `${dataProfile.columnCount} Columns`,
        description: `${dataProfile.rowCount.toLocaleString()} total rows`,
        gradient: 'pink',
      },
    ];

    const cards = metrics
      .map(
        metric => `
      <div class="metric-card">
        <span class="label">${metric.label}</span>
        ${this.generateCircularProgress(metric.value, metric.gradient)}
        <span class="metric-title">${metric.title}</span>
        <span class="metric-description">${metric.description}</span>
        <a href="#details" class="btn-primary">Read More</a>
      </div>
    `
      )
      .join('');

    return `
      <div class="metrics-grid">
        ${cards}
      </div>
    `;
  }

  /**
   * Generate SVG circular progress indicator
   */
  private generateCircularProgress(value: number, gradient: string): string {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return `
      <div class="circular-progress">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle class="progress-bg" cx="60" cy="60" r="${radius}" />
          <circle
            class="progress-fill ${gradient}"
            cx="60" cy="60" r="${radius}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${strokeDashoffset}"
          />
        </svg>
        <span class="value">${Math.round(value)}%</span>
      </div>
    `;
  }

  /**
   * Calculate data completeness percentage
   */
  private calculateCompleteness(dataProfile: DataProfile): number {
    const totalCells = dataProfile.rowCount * dataProfile.columnCount;
    if (totalCells === 0) return 100;

    const nullCells = dataProfile.columns.reduce((sum, col) => sum + col.nullCount, 0);
    return Math.round(((totalCells - nullCells) / totalCells) * 100);
  }

  /**
   * Generate cover page with modern gradient design
   */
  private generateCoverPage(report: Report): string {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <div class="cover-page">
        <div class="cover-logo">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </div>
        <h1>${this.escapeHtml(report.title)}</h1>
        <p class="subtitle">AI-Generated ${this.capitalize(report.style)} Report</p>
        <div class="meta">
          <p>Generated on ${date}</p>
          <p>Report ID: ${report.id}</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate sidebar navigation
   */
  private generateSidebar(
    narrative: GeneratedNarrative,
    branding?: Branding,
    title?: string
  ): string {
    const navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: 'grid', active: true },
      { id: 'summary', label: 'Summary', icon: 'file-text', active: false },
      { id: 'findings', label: 'Key Findings', icon: 'search', active: false },
      ...narrative.sections.slice(0, 4).map((s, i) => ({
        id: `section-${i}`,
        label: s.sectionTitle.length > 20 ? `${s.sectionTitle.slice(0, 20)}...` : s.sectionTitle,
        icon: 'bookmark',
        active: false,
      })),
      { id: 'recommendations', label: 'Recommendations', icon: 'star', active: false },
      { id: 'statistics', label: 'Statistics', icon: 'bar-chart-2', active: false },
    ];

    const navItemsHtml = navItems
      .map(
        item => `
      <li class="nav-item">
        <a href="#${item.id}" class="nav-link ${item.active ? 'active' : ''}">
          ${this.getSvgIcon(item.icon)}
          <span>${item.label}</span>
        </a>
      </li>
    `
      )
      .join('');

    const logoLetter = branding?.companyName?.[0] ?? title?.[0] ?? 'R';

    return `
      <aside class="dashboard-sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">${logoLetter.toUpperCase()}</div>
          <span class="logo-text">${branding?.companyName ?? 'Report'}</span>
        </div>
        <nav>
          <ul class="nav-menu">
            ${navItemsHtml}
          </ul>
        </nav>
        <div class="sidebar-footer">
          <a href="#" class="social-link">${this.getSvgIcon('facebook')}</a>
          <a href="#" class="social-link">${this.getSvgIcon('instagram')}</a>
          <a href="#" class="social-link">${this.getSvgIcon('twitter')}</a>
        </div>
      </aside>
    `;
  }

  /**
   * Get SVG icon by name
   */
  private getSvgIcon(name: string): string {
    const icons: Record<string, string> = {
      grid: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
      'file-text':
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
      search:
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
      bookmark:
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',
      star: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
      'bar-chart-2':
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
      facebook:
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>',
      instagram:
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
      twitter:
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>',
      check:
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    };
    return icons[name] ?? '';
  }

  /**
   * Generate text-only section with card styling
   */
  private generateTextSection(title: string, content: string, className = ''): string {
    const cardClass = className === 'executive-summary' ? 'executive-summary' : 'section-card';
    return `
      <div class="section ${className}" id="${className || 'section'}">
        <div class="${cardClass}">
          <h2>${this.escapeHtml(title)}</h2>
          ${this.formatParagraphs(content)}
        </div>
      </div>
    `;
  }

  /**
   * Generate key findings section with modern cards
   */
  private generateKeyFindings(findings: string[]): string {
    const cards = findings
      .map(
        finding => `
      <div class="finding-card">
        <div class="finding-icon">${this.getSvgIcon('check')}</div>
        <span class="finding-text">${this.escapeHtml(finding)}</span>
      </div>
    `
      )
      .join('');

    return `
      <div class="section" id="findings">
        <div class="section-card">
          <h2>Key Findings</h2>
          <div class="key-findings">
            ${cards}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate mixed section with text and charts
   */
  private generateMixedSection(
    section: { sectionTitle: string; content: string },
    charts: GeneratedChart[]
  ): string {
    const chartsHtml = charts.map(chart => this.generateChartEmbed(chart)).join('');

    return `
      <div class="section" id="${section.sectionTitle.toLowerCase().replaceAll(' ', '-')}">
        <div class="section-card">
          <h2>${this.escapeHtml(section.sectionTitle)}</h2>
          ${this.formatParagraphs(section.content)}
        </div>
        ${chartsHtml}
      </div>
    `;
  }

  /**
   * Generate chart embed with modern card styling
   */
  private generateChartEmbed(chart: GeneratedChart): string {
    const imgSrc = chart.imageBase64
      ? `data:image/png;base64,${chart.imageBase64}`
      : chart.imagePath;

    return `
      <div class="chart-container">
        <img src="${imgSrc}" alt="${this.escapeHtml(chart.config.title)}" />
        <p class="chart-caption">${this.escapeHtml(chart.config.title)}</p>
      </div>
    `;
  }

  /**
   * Generate recommendations section with modern styling
   */
  private generateRecommendations(recommendations: string[]): string {
    const items = recommendations.map(rec => `<li>${this.escapeHtml(rec)}</li>`).join('');

    return `
      <div class="section" id="recommendations">
        <div class="recommendations-section">
          <h2>Recommendations</h2>
          <ol class="recommendations-list">
            ${items}
          </ol>
        </div>
      </div>
    `;
  }

  /**
   * Generate statistics table with modern styling
   */
  private generateStatisticsTable(dataProfile: DataProfile): string {
    const numericColumns = dataProfile.columns.filter(col => col.type === 'numeric');

    if (numericColumns.length === 0) {
      return '';
    }

    const rows = numericColumns
      .map(
        col => `
        <tr>
          <td><strong>${this.escapeHtml(col.name)}</strong></td>
          <td>${col.min?.toLocaleString() ?? 'N/A'}</td>
          <td>${col.max?.toLocaleString() ?? 'N/A'}</td>
          <td>${col.mean?.toFixed(2) ?? 'N/A'}</td>
          <td>${col.stdDev?.toFixed(2) ?? 'N/A'}</td>
        </tr>
      `
      )
      .join('');

    return `
      <div class="section appendix" id="statistics">
        <div class="section-card">
          <h2>Statistical Summary</h2>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Minimum</th>
                  <th>Maximum</th>
                  <th>Mean</th>
                  <th>Std Dev</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
          <p style="margin-top: 1rem; color: var(--color-text-light);">
            <em>Data quality score: ${dataProfile.dataQualityScore}/100</em>
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Generate generic table
   */
  generateTable(tableData: TableData): string {
    const headers = tableData.headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('');

    const rows = tableData.rows
      .map(row => {
        const cells = row.map(cell => `<td>${this.escapeHtml(cell)}</td>`).join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    return `
      <div class="table-container">
        <table>
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
          ${tableData.caption ? `<caption>${this.escapeHtml(tableData.caption)}</caption>` : ''}
        </table>
      </div>
    `;
  }

  /**
   * Generate SVG gradient definitions for circular progress
   */
  private generateSvgDefs(): string {
    const gradients = METRIC_GRADIENTS.map(
      g => `
      <linearGradient id="gradient${this.capitalize(g.id)}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${g.colors[0]}" />
        <stop offset="100%" style="stop-color:${g.colors[1]}" />
      </linearGradient>
    `
    ).join('');

    return `
      <svg class="svg-defs">
        <defs>
          ${gradients}
        </defs>
      </svg>
    `;
  }

  /**
   * Wrap content in dashboard document with sidebar
   */
  private wrapInDashboardDocument(
    title: string,
    styleConfig: StyleConfig,
    content: string,
    narrative: GeneratedNarrative,
    branding?: Branding
  ): string {
    const css = generateCSS(styleConfig);
    const sidebar = this.generateSidebar(narrative, branding, title);
    const svgDefs = this.generateSvgDefs();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="AI Report Generator">
  <title>${this.escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>
  ${svgDefs}
  <div class="dashboard-layout">
    ${sidebar}
    <main class="dashboard-main">
      <header style="margin-bottom: 2rem;">
        <h1>${this.escapeHtml(title)}</h1>
        <p style="color: var(--color-text-light);">AI-Generated ${this.capitalize(styleConfig.name)} Report • ${new Date().toLocaleDateString()}</p>
      </header>
      ${content}
      <div class="page-footer">
        <span>${branding?.companyName ?? 'AI Report Generator'}</span>
        <span>Generated ${new Date().toISOString().split('T')[0]}</span>
      </div>
    </main>
  </div>
</body>
</html>`;
  }

  /**
   * Format text into paragraphs
   */
  private formatParagraphs(text: string): string {
    return text
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${this.escapeHtml(p.trim())}</p>`)
      .join('\n');
  }

  /**
   * Escape HTML special characters
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
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const htmlGenerator = new HTMLGenerator();
