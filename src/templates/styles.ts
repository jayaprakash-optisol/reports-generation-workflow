/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// Branding fields are optional, so nullish coalescing is needed for optional Zod fields
import type { Branding, ReportStyle } from '../types/index.js';

export interface StyleConfig {
  name: string;
  description: string;
  sections: SectionTemplate[];
  colors: ColorPalette;
  fonts: FontConfig;
  spacing: SpacingConfig;
}

export interface SectionTemplate {
  id: string;
  title: string;
  type: 'text' | 'chart' | 'table' | 'mixed';
  required: boolean;
  order: number;
  promptHint?: string;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textLight: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface FontConfig {
  heading: string;
  body: string;
  code: string;
  sizes: {
    h1: string;
    h2: string;
    h3: string;
    body: string;
    small: string;
  };
}

export interface SpacingConfig {
  sectionGap: string;
  paragraphGap: string;
  chartMargin: string;
  pageMargin: string;
}

// Business Style Configuration
const businessStyle: StyleConfig = {
  name: 'business',
  description: 'Executive-friendly, concise, KPI-focused',
  sections: [
    { id: 'cover', title: 'Cover Page', type: 'mixed', required: true, order: 0 },
    { id: 'toc', title: 'Table of Contents', type: 'text', required: true, order: 1 },
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      type: 'text',
      required: true,
      order: 2,
      promptHint: 'Concise overview for executives',
    },
    {
      id: 'key-metrics',
      title: 'Key Performance Indicators',
      type: 'mixed',
      required: true,
      order: 3,
      promptHint: 'Critical KPIs and metrics',
    },
    {
      id: 'trends',
      title: 'Trends & Analysis',
      type: 'mixed',
      required: true,
      order: 4,
      promptHint: 'Trend analysis with visualizations',
    },
    {
      id: 'risks',
      title: 'Risks & Challenges',
      type: 'text',
      required: false,
      order: 5,
      promptHint: 'Identified risks and mitigation',
    },
    {
      id: 'opportunities',
      title: 'Opportunities',
      type: 'text',
      required: false,
      order: 6,
      promptHint: 'Growth opportunities and potential',
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      type: 'text',
      required: true,
      order: 7,
      promptHint: 'Actionable recommendations',
    },
    { id: 'appendix', title: 'Appendix', type: 'table', required: false, order: 8 },
  ],
  colors: {
    primary: '#1a365d',
    secondary: '#2b6cb0',
    accent: '#ed8936',
    background: '#ffffff',
    text: '#1a202c',
    textLight: '#4a5568',
    border: '#e2e8f0',
    success: '#48bb78',
    warning: '#ed8936',
    error: '#e53e3e',
  },
  fonts: {
    heading: "'Montserrat', 'Helvetica Neue', sans-serif",
    body: "'Inter', 'Segoe UI', sans-serif",
    code: "'Fira Code', 'Consolas', monospace",
    sizes: {
      h1: '2.5rem',
      h2: '1.75rem',
      h3: '1.25rem',
      body: '1rem',
      small: '0.875rem',
    },
  },
  spacing: {
    sectionGap: '3rem',
    paragraphGap: '1.5rem',
    chartMargin: '2rem',
    pageMargin: '2.5cm',
  },
};

// Research Style Configuration
const researchStyle: StyleConfig = {
  name: 'research',
  description: 'Formal, academic, methodology-focused',
  sections: [
    { id: 'cover', title: 'Cover Page', type: 'mixed', required: true, order: 0 },
    { id: 'toc', title: 'Table of Contents', type: 'text', required: true, order: 1 },
    {
      id: 'abstract',
      title: 'Abstract',
      type: 'text',
      required: true,
      order: 2,
      promptHint: 'Formal research abstract',
    },
    {
      id: 'introduction',
      title: 'Introduction',
      type: 'text',
      required: true,
      order: 3,
      promptHint: 'Background and research context',
    },
    {
      id: 'methodology',
      title: 'Methodology',
      type: 'text',
      required: true,
      order: 4,
      promptHint: 'Data collection and analysis methods',
    },
    {
      id: 'results',
      title: 'Results',
      type: 'mixed',
      required: true,
      order: 5,
      promptHint: 'Key findings with supporting data',
    },
    {
      id: 'discussion',
      title: 'Discussion',
      type: 'text',
      required: true,
      order: 6,
      promptHint: 'Interpretation and implications',
    },
    {
      id: 'limitations',
      title: 'Limitations',
      type: 'text',
      required: false,
      order: 7,
      promptHint: 'Study limitations and caveats',
    },
    {
      id: 'conclusion',
      title: 'Conclusion',
      type: 'text',
      required: true,
      order: 8,
      promptHint: 'Summary and future directions',
    },
    { id: 'references', title: 'References', type: 'text', required: false, order: 9 },
    { id: 'appendix', title: 'Appendix', type: 'table', required: false, order: 10 },
  ],
  colors: {
    primary: '#2d3748',
    secondary: '#4a5568',
    accent: '#3182ce',
    background: '#ffffff',
    text: '#1a202c',
    textLight: '#718096',
    border: '#cbd5e0',
    success: '#38a169',
    warning: '#d69e2e',
    error: '#c53030',
  },
  fonts: {
    heading: "'Merriweather', 'Georgia', serif",
    body: "'Source Sans Pro', 'Arial', sans-serif",
    code: "'Source Code Pro', 'Courier New', monospace",
    sizes: {
      h1: '2.25rem',
      h2: '1.5rem',
      h3: '1.125rem',
      body: '1rem',
      small: '0.875rem',
    },
  },
  spacing: {
    sectionGap: '2.5rem',
    paragraphGap: '1.25rem',
    chartMargin: '1.5rem',
    pageMargin: '3cm',
  },
};

// Technical Style Configuration
const technicalStyle: StyleConfig = {
  name: 'technical',
  description: 'Detailed, engineering-focused, system metrics',
  sections: [
    { id: 'cover', title: 'Cover Page', type: 'mixed', required: true, order: 0 },
    { id: 'toc', title: 'Table of Contents', type: 'text', required: true, order: 1 },
    {
      id: 'overview',
      title: 'Overview',
      type: 'text',
      required: true,
      order: 2,
      promptHint: 'System/project overview',
    },
    {
      id: 'metrics',
      title: 'System Metrics',
      type: 'mixed',
      required: true,
      order: 3,
      promptHint: 'Performance and operational metrics',
    },
    {
      id: 'performance',
      title: 'Performance Analysis',
      type: 'mixed',
      required: true,
      order: 4,
      promptHint: 'Detailed performance breakdown',
    },
    {
      id: 'errors',
      title: 'Error Analysis',
      type: 'mixed',
      required: false,
      order: 5,
      promptHint: 'Error types and distributions',
    },
    {
      id: 'incidents',
      title: 'Incidents & Issues',
      type: 'text',
      required: false,
      order: 6,
      promptHint: 'Incident summaries and resolutions',
    },
    {
      id: 'architecture',
      title: 'Architecture Notes',
      type: 'text',
      required: false,
      order: 7,
      promptHint: 'Technical architecture details',
    },
    {
      id: 'recommendations',
      title: 'Technical Recommendations',
      type: 'text',
      required: true,
      order: 8,
      promptHint: 'Engineering recommendations',
    },
    { id: 'appendix', title: 'Technical Appendix', type: 'table', required: false, order: 9 },
  ],
  colors: {
    primary: '#0d1117',
    secondary: '#161b22',
    accent: '#58a6ff',
    background: '#ffffff',
    text: '#24292f',
    textLight: '#57606a',
    border: '#d0d7de',
    success: '#2da44e',
    warning: '#bf8700',
    error: '#cf222e',
  },
  fonts: {
    heading: "'JetBrains Mono', 'SF Mono', monospace",
    body: "'Inter', 'Roboto', sans-serif",
    code: "'Fira Code', 'Monaco', monospace",
    sizes: {
      h1: '2rem',
      h2: '1.5rem',
      h3: '1.125rem',
      body: '0.9375rem',
      small: '0.8125rem',
    },
  },
  spacing: {
    sectionGap: '2rem',
    paragraphGap: '1rem',
    chartMargin: '1.5rem',
    pageMargin: '2cm',
  },
};

const styleConfigs: Record<ReportStyle, StyleConfig> = {
  business: businessStyle,
  research: researchStyle,
  technical: technicalStyle,
};

export function getStyleConfig(style: ReportStyle): StyleConfig {
  return styleConfigs[style];
}

export function applyBrandingToStyle(styleConfig: StyleConfig, branding?: Branding): StyleConfig {
  if (!branding) return styleConfig;

  return {
    ...styleConfig,
    colors: {
      ...styleConfig.colors,
      primary: branding.primaryColor ?? styleConfig.colors.primary,
      secondary: branding.secondaryColor ?? styleConfig.colors.secondary,
      accent: branding.accentColor ?? styleConfig.colors.accent,
    },
    fonts: {
      ...styleConfig.fonts,
      body: branding.fontFamily ?? styleConfig.fonts.body,
    },
  };
}

export function generateCSS(styleConfig: StyleConfig): string {
  const { colors, fonts, spacing } = styleConfig;

  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&family=Merriweather:wght@400;700&family=JetBrains+Mono:wght@400;600&family=Source+Sans+Pro:wght@400;600&display=swap');

    :root {
      --color-primary: ${colors.primary};
      --color-secondary: ${colors.secondary};
      --color-accent: ${colors.accent};
      --color-background: ${colors.background};
      --color-text: ${colors.text};
      --color-text-light: ${colors.textLight};
      --color-border: ${colors.border};
      --color-success: ${colors.success};
      --color-warning: ${colors.warning};
      --color-error: ${colors.error};

      --font-heading: ${fonts.heading};
      --font-body: ${fonts.body};
      --font-code: ${fonts.code};

      --size-h1: ${fonts.sizes.h1};
      --size-h2: ${fonts.sizes.h2};
      --size-h3: ${fonts.sizes.h3};
      --size-body: ${fonts.sizes.body};
      --size-small: ${fonts.sizes.small};

      --spacing-section: ${spacing.sectionGap};
      --spacing-paragraph: ${spacing.paragraphGap};
      --spacing-chart: ${spacing.chartMargin};
      --spacing-page: ${spacing.pageMargin};
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-body);
      font-size: var(--size-body);
      color: var(--color-text);
      background-color: var(--color-background);
      line-height: 1.7;
    }

    .report-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: var(--spacing-page);
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-heading);
      color: var(--color-primary);
      margin-bottom: 1rem;
      line-height: 1.3;
    }

    h1 { font-size: var(--size-h1); font-weight: 700; }
    h2 { font-size: var(--size-h2); font-weight: 600; border-bottom: 2px solid var(--color-accent); padding-bottom: 0.5rem; margin-top: var(--spacing-section); }
    h3 { font-size: var(--size-h3); font-weight: 600; color: var(--color-secondary); }

    p {
      margin-bottom: var(--spacing-paragraph);
    }

    .cover-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
      color: white;
      padding: 4rem;
      page-break-after: always;
    }

    .cover-page h1 {
      color: white;
      font-size: 3rem;
      margin-bottom: 1.5rem;
    }

    .cover-page .subtitle {
      font-size: 1.25rem;
      opacity: 0.9;
      margin-bottom: 3rem;
    }

    .cover-page .meta {
      font-size: var(--size-small);
      opacity: 0.8;
    }

    .cover-logo {
      max-width: 200px;
      margin-bottom: 2rem;
    }

    .toc {
      page-break-after: always;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px dotted var(--color-border);
    }

    .toc-item:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }

    .section {
      margin-bottom: var(--spacing-section);
      page-break-inside: avoid;
    }

    .executive-summary {
      background: linear-gradient(to right, rgba(var(--color-primary-rgb), 0.05), transparent);
      border-left: 4px solid var(--color-accent);
      padding: 1.5rem;
      margin-bottom: var(--spacing-section);
    }

    .key-findings {
      display: grid;
      gap: 1rem;
      margin: 1.5rem 0;
    }

    .finding-card {
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1rem 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .finding-card::before {
      content: '→';
      color: var(--color-accent);
      font-weight: bold;
      margin-right: 0.5rem;
    }

    .chart-container {
      margin: var(--spacing-chart) 0;
      text-align: center;
    }

    .chart-container img {
      max-width: 100%;
      height: auto;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .chart-caption {
      font-size: var(--size-small);
      color: var(--color-text-light);
      margin-top: 0.75rem;
      font-style: italic;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      font-size: var(--size-small);
    }

    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border: 1px solid var(--color-border);
    }

    th {
      background: var(--color-primary);
      color: white;
      font-weight: 600;
    }

    tr:nth-child(even) {
      background-color: rgba(0, 0, 0, 0.02);
    }

    tr:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }

    .recommendations-list {
      list-style: none;
      counter-reset: recommendation;
    }

    .recommendations-list li {
      counter-increment: recommendation;
      padding: 1rem;
      margin-bottom: 1rem;
      background: linear-gradient(to right, rgba(var(--color-accent-rgb), 0.1), transparent);
      border-radius: 8px;
      position: relative;
      padding-left: 3rem;
    }

    .recommendations-list li::before {
      content: counter(recommendation);
      position: absolute;
      left: 1rem;
      top: 1rem;
      width: 24px;
      height: 24px;
      background: var(--color-accent);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: bold;
    }

    .appendix {
      page-break-before: always;
    }

    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 1rem var(--spacing-page);
      font-size: var(--size-small);
      color: var(--color-text-light);
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
    }

    @media print {
      .report-container {
        max-width: none;
        padding: 0;
      }

      .cover-page {
        min-height: 100vh;
      }

      h2 {
        page-break-after: avoid;
      }

      .section {
        page-break-inside: avoid;
      }

      .chart-container {
        page-break-inside: avoid;
      }
    }
  `;
}
