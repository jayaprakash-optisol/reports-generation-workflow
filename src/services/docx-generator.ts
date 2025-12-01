import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import type {
  Branding,
  DataProfile,
  GeneratedChart,
  GeneratedNarrative,
  Report,
  ReportStyle,
} from '../types/index.js';
import { createModuleLogger } from '../utils/logger.js';
import { storage } from '../utils/storage.js';

const logger = createModuleLogger('docx-generator');

// Style configurations for DOCX
const STYLE_COLORS: Record<ReportStyle, { primary: string; secondary: string; accent: string }> = {
  business: { primary: '1a365d', secondary: '2b6cb0', accent: 'ed8936' },
  research: { primary: '2d3748', secondary: '4a5568', accent: '3182ce' },
  technical: { primary: '0d1117', secondary: '161b22', accent: '58a6ff' },
};

export class DOCXGenerator {
  /**
   * Generate DOCX document from report data
   */
  async generateReport(
    report: Report,
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    dataProfile: DataProfile,
    _branding?: Branding
  ): Promise<{ path: string; size: number }> {
    const colors = STYLE_COLORS[report.style];

    const doc = new Document({
      creator: 'AI Report Generator',
      title: report.title,
      description: `${report.style} report generated automatically`,
      styles: {
        paragraphStyles: [
          {
            id: 'Normal',
            name: 'Normal',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: {
              font: 'Arial',
              size: 24,
            },
            paragraph: {
              spacing: { after: 200, line: 276 },
            },
          },
        ],
      },
      sections: [
        // Cover page section
        {
          properties: {},
          headers: {
            default: new Header({
              children: [],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: 'Page ', size: 20 }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 20,
                    }),
                    new TextRun({ text: ' of ', size: 20 }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          },
          children: [
            // Cover page content
            ...this.generateCoverPage(report, colors),

            // Page break after cover
            new Paragraph({
              children: [new PageBreak()],
            }),

            // Table of contents placeholder
            ...this.generateTableOfContents(narrative),

            // Page break
            new Paragraph({
              children: [new PageBreak()],
            }),

            // Executive Summary
            ...this.generateSection(
              report.style === 'research' ? 'Abstract' : 'Executive Summary',
              narrative.executiveSummary,
              colors
            ),

            // Key Findings
            ...(narrative.keyFindings.length > 0
              ? this.generateKeyFindings(narrative.keyFindings, colors)
              : []),

            // Narrative sections with charts
            ...this.generateNarrativeSections(narrative, charts, colors),

            // Recommendations
            ...(narrative.recommendations.length > 0
              ? this.generateRecommendations(narrative.recommendations, colors)
              : []),

            // Statistics table
            ...(dataProfile.columns.length > 0
              ? this.generateStatisticsTable(dataProfile, colors)
              : []),
          ],
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Save to storage
    const filename = `${report.id}.docx`;
    const path = await storage.saveOutputFile(report.id, filename, buffer);
    const size = buffer.length;

    logger.info(`Generated DOCX: ${filename} (${(size / 1024).toFixed(1)} KB)`);

    return { path, size };
  }

  /**
   * Generate cover page
   */
  private generateCoverPage(
    report: Report,
    colors: { primary: string; secondary: string }
  ): Paragraph[] {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return [
      // Spacer
      ...new Array(8).fill(null).map(() => new Paragraph({ text: '' })),

      // Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: report.title,
            bold: true,
            size: 72,
            color: colors.primary,
          }),
        ],
      }),

      // Spacer
      new Paragraph({ text: '' }),
      new Paragraph({ text: '' }),

      // Subtitle
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `AI-Generated ${this.capitalize(report.style)} Report`,
            size: 32,
            color: colors.secondary,
          }),
        ],
      }),

      // More spacer
      ...new Array(6).fill(null).map(() => new Paragraph({ text: '' })),

      // Date
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Generated on ${date}`,
            size: 24,
            color: '666666',
          }),
        ],
      }),

      // Report ID
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Report ID: ${report.id}`,
            size: 20,
            color: '999999',
          }),
        ],
      }),
    ];
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(narrative: GeneratedNarrative): Paragraph[] {
    const items = [
      'Executive Summary',
      ...(narrative.keyFindings.length > 0 ? ['Key Findings'] : []),
      ...narrative.sections.map(s => s.sectionTitle),
      ...(narrative.recommendations.length > 0 ? ['Recommendations'] : []),
      'Statistical Summary',
    ];

    return [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: 'Table of Contents',
            bold: true,
            size: 36,
          }),
        ],
      }),
      new Paragraph({ text: '' }),
      ...items.map(
        (item, index) =>
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. ${item}`,
                size: 24,
              }),
            ],
            spacing: { after: 120 },
          })
      ),
    ];
  }

  /**
   * Generate a section with title and content
   */
  private generateSection(
    title: string,
    content: string,
    colors: { primary: string }
  ): Paragraph[] {
    const paragraphs = content.split('\n\n').filter(p => p.trim());

    return [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 32,
            color: colors.primary,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      ...paragraphs.map(
        p =>
          new Paragraph({
            children: [
              new TextRun({
                text: p.trim(),
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          })
      ),
    ];
  }

  /**
   * Generate key findings section
   */
  private generateKeyFindings(
    findings: string[],
    colors: { primary: string; accent: string }
  ): Paragraph[] {
    return [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: 'Key Findings',
            bold: true,
            size: 32,
            color: colors.primary,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      ...findings.map(
        (finding, index) =>
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. `,
                bold: true,
                size: 24,
                color: colors.accent,
              }),
              new TextRun({
                text: finding,
                size: 24,
              }),
            ],
            spacing: { after: 150 },
          })
      ),
    ];
  }

  /**
   * Generate narrative sections with charts
   */
  private generateNarrativeSections(
    narrative: GeneratedNarrative,
    charts: GeneratedChart[],
    colors: { primary: string }
  ): Paragraph[] {
    const elements: Paragraph[] = [];
    let chartIndex = 0;

    for (const section of narrative.sections) {
      // Section title
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: section.sectionTitle,
              bold: true,
              size: 32,
              color: colors.primary,
            }),
          ],
          spacing: { before: 400, after: 200 },
        })
      );

      // Section content
      const paragraphs = section.content.split('\n\n').filter(p => p.trim());
      for (const p of paragraphs) {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: p.trim(),
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }

      // Add charts for this section
      const sectionCharts = charts.slice(chartIndex, chartIndex + 2);
      chartIndex += 2;

      for (const chart of sectionCharts) {
        if (chart.imageBase64) {
          try {
            elements.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: Buffer.from(chart.imageBase64, 'base64'),
                    transformation: {
                      width: 500,
                      height: 300,
                    },
                    type: 'png',
                  }),
                ],
                spacing: { before: 200, after: 100 },
              })
            );

            // Chart caption
            elements.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: chart.config.title,
                    italics: true,
                    size: 20,
                    color: '666666',
                  }),
                ],
                spacing: { after: 300 },
              })
            );
          } catch (error) {
            logger.warn(`Could not embed chart: ${chart.id}`, { error });
          }
        }
      }
    }

    return elements;
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendations(
    recommendations: string[],
    colors: { primary: string; accent: string }
  ): Paragraph[] {
    return [
      new Paragraph({
        children: [new PageBreak()],
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: 'Recommendations',
            bold: true,
            size: 32,
            color: colors.primary,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      ...recommendations.map(
        (rec, index) =>
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. `,
                bold: true,
                size: 24,
                color: colors.accent,
              }),
              new TextRun({
                text: rec,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          })
      ),
    ];
  }

  /**
   * Generate statistics table
   */
  private generateStatisticsTable(
    dataProfile: DataProfile,
    colors: { primary: string }
  ): (Paragraph | Table)[] {
    const numericColumns = dataProfile.columns.filter(col => col.type === 'numeric');

    if (numericColumns.length === 0) {
      return [];
    }

    const headers = ['Metric', 'Minimum', 'Maximum', 'Mean', 'Std Dev'];

    const headerRow = new TableRow({
      children: headers.map(
        header =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: header,
                    bold: true,
                    size: 22,
                    color: 'FFFFFF',
                  }),
                ],
              }),
            ],
            shading: { fill: colors.primary },
          })
      ),
    });

    const dataRows = numericColumns.map(
      col =>
        new TableRow({
          children: [
            col.name,
            col.min?.toLocaleString() ?? 'N/A',
            col.max?.toLocaleString() ?? 'N/A',
            col.mean?.toFixed(2) ?? 'N/A',
            col.stdDev?.toFixed(2) ?? 'N/A',
          ].map(
            value =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: String(value),
                        size: 20,
                      }),
                    ],
                  }),
                ],
              })
          ),
        })
    );

    return [
      new Paragraph({
        children: [new PageBreak()],
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: 'Statistical Summary',
            bold: true,
            size: 32,
            color: colors.primary,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [headerRow, ...dataRows],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Data quality score: ${dataProfile.dataQualityScore}/100`,
            italics: true,
            size: 20,
            color: '666666',
          }),
        ],
        spacing: { before: 200 },
      }),
    ];
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const docxGenerator = new DOCXGenerator();
