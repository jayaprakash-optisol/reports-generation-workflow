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

export class HTMLGenerator {
  /**
   * Generate complete HTML report
   */
  generateReport(
    report: Report,
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    dataProfile: DataProfile,
    branding?: Branding
  ): string {
    const styleConfig = applyBrandingToStyle(getStyleConfig(report.style), branding);

    const sections = this.buildSections(styleConfig, report, narrative, charts, dataProfile);

    const html = this.wrapInDocument(report.title, styleConfig, sections, branding);

    logger.info(`Generated HTML report: ${report.title}`);
    return html;
  }

  /**
   * Build all report sections
   */
  private buildSections(
    styleConfig: StyleConfig,
    report: Report,
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    dataProfile: DataProfile
  ): string {
    // Executive summary / Abstract
    const summaryTitle = report.style === 'research' ? 'Abstract' : 'Executive Summary';

    // Generated narrative sections with charts
    let chartIndex = 0;
    const narrativeSections = narrative.sections.map(section => {
      const sectionCharts = charts.slice(chartIndex, chartIndex + 2);
      chartIndex += 2;
      return this.generateMixedSection(section, sectionCharts);
    });

    const sections = [
      // Cover page
      this.generateCoverPage(report, styleConfig),
      // Table of contents
      this.generateTableOfContents(styleConfig, narrative),
      // Executive summary / Abstract
      this.generateTextSection(summaryTitle, narrative.executiveSummary, 'executive-summary'),
      // Key findings
      ...(narrative.keyFindings.length > 0
        ? [this.generateKeyFindings(narrative.keyFindings)]
        : []),
      // Generated narrative sections with charts
      ...narrativeSections,
      // Recommendations
      ...(narrative.recommendations.length > 0
        ? [this.generateRecommendations(narrative.recommendations)]
        : []),
      // Summary statistics table
      ...(dataProfile.columns.length > 0 ? [this.generateStatisticsTable(dataProfile)] : []),
    ];

    return sections.join('\n');
  }

  /**
   * Generate cover page
   */
  private generateCoverPage(report: Report, _styleConfig: StyleConfig): string {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <div class="cover-page">
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
   * Generate table of contents
   */
  private generateTableOfContents(styleConfig: StyleConfig, narrative: GeneratedNarrative): string {
    const items = styleConfig.sections
      .filter(s => s.required || narrative.sections.some(ns => ns.sectionId === s.id))
      .map(
        (section, index) => `
        <div class="toc-item">
          <span>${section.title}</span>
          <span>${index + 1}</span>
        </div>
      `
      )
      .join('');

    return `
      <div class="section toc">
        <h2>Table of Contents</h2>
        ${items}
      </div>
    `;
  }

  /**
   * Generate text-only section
   */
  private generateTextSection(title: string, content: string, className = ''): string {
    return `
      <div class="section ${className}">
        <h2>${this.escapeHtml(title)}</h2>
        ${this.formatParagraphs(content)}
      </div>
    `;
  }

  /**
   * Generate key findings section
   */
  private generateKeyFindings(findings: string[]): string {
    const cards = findings
      .map(finding => `<div class="finding-card">${this.escapeHtml(finding)}</div>`)
      .join('');

    return `
      <div class="section">
        <h2>Key Findings</h2>
        <div class="key-findings">
          ${cards}
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
      <div class="section">
        <h2>${this.escapeHtml(section.sectionTitle)}</h2>
        ${this.formatParagraphs(section.content)}
        ${chartsHtml}
      </div>
    `;
  }

  /**
   * Generate chart embed
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
   * Generate recommendations section
   */
  private generateRecommendations(recommendations: string[]): string {
    const items = recommendations.map(rec => `<li>${this.escapeHtml(rec)}</li>`).join('');

    return `
      <div class="section">
        <h2>Recommendations</h2>
        <ol class="recommendations-list">
          ${items}
        </ol>
      </div>
    `;
  }

  /**
   * Generate statistics table
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
          <td>${this.escapeHtml(col.name)}</td>
          <td>${col.min?.toLocaleString() ?? 'N/A'}</td>
          <td>${col.max?.toLocaleString() ?? 'N/A'}</td>
          <td>${col.mean?.toFixed(2) ?? 'N/A'}</td>
          <td>${col.stdDev?.toFixed(2) ?? 'N/A'}</td>
        </tr>
      `
      )
      .join('');

    return `
      <div class="section appendix">
        <h2>Statistical Summary</h2>
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
        <p><em>Data quality score: ${dataProfile.dataQualityScore}/100</em></p>
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
      <table>
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
        ${tableData.caption ? `<caption>${this.escapeHtml(tableData.caption)}</caption>` : ''}
      </table>
    `;
  }

  /**
   * Wrap content in full HTML document
   */
  private wrapInDocument(
    title: string,
    styleConfig: StyleConfig,
    content: string,
    branding?: Branding
  ): string {
    const css = generateCSS(styleConfig);

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
  <div class="report-container">
    ${content}
  </div>
  <div class="page-footer">
    <span>${branding?.companyName ?? 'AI Report Generator'}</span>
    <span>Generated ${new Date().toISOString()}</span>
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
    // Replace & first to avoid double-encoding
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
