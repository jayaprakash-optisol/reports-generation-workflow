/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// Branding fields are optional, so nullish coalescing is needed for optional Zod fields
import type { Branding, ReportStyle } from '../../shared/types/index.js';

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
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

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

      /* Modern gradient colors */
      --gradient-purple: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --gradient-blue: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      --gradient-pink: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      --gradient-orange: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      --gradient-teal: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      --gradient-dark: linear-gradient(180deg, #1a1f35 0%, #0d1117 100%);

      /* Dashboard colors */
      --sidebar-bg: #1a1f35;
      --sidebar-text: #a0aec0;
      --sidebar-active: #667eea;
      --card-bg: #ffffff;
      --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      --page-bg: #f0f4f8;

      --font-heading: 'Plus Jakarta Sans', 'Inter', sans-serif;
      --font-body: 'DM Sans', 'Inter', sans-serif;
      --font-code: 'JetBrains Mono', 'Fira Code', monospace;

      --size-h1: ${fonts.sizes.h1};
      --size-h2: ${fonts.sizes.h2};
      --size-h3: ${fonts.sizes.h3};
      --size-body: ${fonts.sizes.body};
      --size-small: ${fonts.sizes.small};

      --spacing-section: ${spacing.sectionGap};
      --spacing-paragraph: ${spacing.paragraphGap};
      --spacing-chart: ${spacing.chartMargin};
      --spacing-page: ${spacing.pageMargin};

      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-xl: 24px;
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
      background: var(--page-bg);
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .report-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Modern Dashboard Layout */
    .dashboard-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 100vh;
      gap: 0;
    }

    .dashboard-sidebar {
      background: var(--gradient-dark);
      padding: 2rem;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 3rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: var(--gradient-purple);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 800;
      color: white;
    }

    .logo-text {
      color: white;
      font-size: 1.25rem;
      font-weight: 700;
      font-family: var(--font-heading);
    }

    .nav-menu {
      list-style: none;
    }

    .nav-item {
      margin-bottom: 0.5rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      color: var(--sidebar-text);
      text-decoration: none;
      border-radius: var(--radius-md);
      transition: all 0.2s ease;
      font-weight: 500;
    }

    .nav-link:hover, .nav-link.active {
      background: rgba(102, 126, 234, 0.15);
      color: white;
    }

    .nav-link.active {
      background: var(--gradient-purple);
    }

    .nav-icon {
      width: 20px;
      height: 20px;
      opacity: 0.7;
    }

    .sidebar-footer {
      position: absolute;
      bottom: 2rem;
      left: 2rem;
      right: 2rem;
      display: flex;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .social-link {
      color: var(--sidebar-text);
      transition: color 0.2s;
    }

    .social-link:hover {
      color: white;
    }

    .dashboard-main {
      background: var(--page-bg);
      padding: 2rem;
      overflow-y: auto;
    }

    /* Header Styles */
    h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-heading);
      color: var(--color-text);
      margin-bottom: 1rem;
      line-height: 1.3;
      letter-spacing: -0.02em;
    }

    h1 { font-size: 2.5rem; font-weight: 800; }
    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-top: 2rem;
      margin-bottom: 1.25rem;
      color: var(--color-text);
    }
    h3 { font-size: 1.125rem; font-weight: 600; color: var(--color-text-light); }

    p {
      margin-bottom: var(--spacing-paragraph);
      color: var(--color-text-light);
    }

    /* Modern Cover Page */
    .cover-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: var(--gradient-purple);
      color: white;
      padding: 4rem;
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }

    .cover-page::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1) 0%, transparent 50%),
                  radial-gradient(circle at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 40%);
      animation: float 20s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      50% { transform: translate(2%, 2%) rotate(2deg); }
    }

    .cover-page > * {
      position: relative;
      z-index: 1;
    }

    .cover-page h1 {
      color: white;
      font-size: 3.5rem;
      margin-bottom: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .cover-page .subtitle {
      font-size: 1.375rem;
      opacity: 0.9;
      margin-bottom: 3rem;
      font-weight: 500;
      max-width: 600px;
    }

    .cover-page .meta {
      font-size: var(--size-small);
      opacity: 0.75;
      font-weight: 500;
    }

    .cover-logo {
      width: 80px;
      height: 80px;
      background: rgba(255,255,255,0.2);
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2rem;
      backdrop-filter: blur(10px);
    }

    /* Card Components */
    .card {
      background: var(--card-bg);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(0,0,0,0.04);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
    }

    .card-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-light);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Metric Cards Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: var(--card-bg);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      border: 1px solid rgba(0,0,0,0.04);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .metric-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    .metric-card .label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-light);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 1rem;
    }

    /* Circular Progress Indicator */
    .circular-progress {
      position: relative;
      width: 120px;
      height: 120px;
      margin-bottom: 1rem;
    }

    .circular-progress svg {
      transform: rotate(-90deg);
    }

    .circular-progress .progress-bg {
      fill: none;
      stroke: #e2e8f0;
      stroke-width: 8;
    }

    .circular-progress .progress-fill {
      fill: none;
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 1s ease;
    }

    .circular-progress .progress-fill.purple { stroke: url(#gradientPurple); }
    .circular-progress .progress-fill.blue { stroke: url(#gradientBlue); }
    .circular-progress .progress-fill.pink { stroke: url(#gradientPink); }
    .circular-progress .progress-fill.teal { stroke: url(#gradientTeal); }

    .circular-progress .value {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2rem;
      font-weight: 800;
      font-family: var(--font-heading);
      color: var(--color-text);
    }

    .metric-card .metric-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 0.5rem;
    }

    .metric-card .metric-description {
      font-size: 0.875rem;
      color: var(--color-text-light);
      max-width: 200px;
      line-height: 1.5;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--gradient-purple);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      text-decoration: none;
      margin-top: 1rem;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    /* Table of Contents */
    .toc {
      page-break-after: always;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: var(--card-bg);
      border-radius: var(--radius-md);
      margin-bottom: 0.75rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      border: 1px solid rgba(0,0,0,0.04);
      transition: all 0.2s ease;
    }

    .toc-item:hover {
      transform: translateX(8px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }

    .toc-item .section-name {
      font-weight: 600;
      color: var(--color-text);
    }

    .toc-item .page-num {
      color: var(--color-text-light);
      font-weight: 500;
    }

    /* Sections */
    .section {
      margin-bottom: var(--spacing-section);
      page-break-inside: avoid;
    }

    .section-card {
      background: var(--card-bg);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      padding: 2rem;
      margin-bottom: 2rem;
      border: 1px solid rgba(0,0,0,0.04);
    }

    .executive-summary {
      background: var(--card-bg);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      padding: 2rem;
      margin-bottom: 2rem;
      border-left: 4px solid;
      border-image: var(--gradient-purple) 1;
    }

    .executive-summary h2 {
      margin-top: 0;
    }

    /* Key Findings Cards */
    .key-findings {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.25rem;
      margin: 1.5rem 0;
    }

    .finding-card {
      background: var(--card-bg);
      border-radius: var(--radius-md);
      padding: 1.25rem 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0,0,0,0.04);
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      transition: all 0.2s ease;
    }

    .finding-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }

    .finding-icon {
      width: 36px;
      height: 36px;
      background: var(--gradient-teal);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .finding-icon svg {
      width: 18px;
      height: 18px;
      color: white;
    }

    .finding-text {
      color: var(--color-text);
      font-weight: 500;
      line-height: 1.5;
    }

    /* Chart Container */
    .chart-container {
      margin: var(--spacing-chart) 0;
      background: var(--card-bg);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(0,0,0,0.04);
    }

    .chart-container img {
      max-width: 100%;
      height: auto;
      border-radius: var(--radius-md);
    }

    .chart-caption {
      font-size: var(--size-small);
      color: var(--color-text-light);
      margin-top: 1rem;
      text-align: center;
      font-weight: 500;
    }

    /* Modern Tables */
    .table-container {
      background: var(--card-bg);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      overflow: hidden;
      margin: 1.5rem 0;
      border: 1px solid rgba(0,0,0,0.04);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    th, td {
      padding: 1rem 1.25rem;
      text-align: left;
    }

    th {
      background: linear-gradient(to right, var(--color-primary), var(--color-secondary));
      color: white;
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    td {
      border-bottom: 1px solid var(--color-border);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background-color: rgba(102, 126, 234, 0.04);
    }

    /* Recommendations List */
    .recommendations-section {
      background: var(--card-bg);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      padding: 2rem;
      margin-bottom: 2rem;
      border: 1px solid rgba(0,0,0,0.04);
    }

    .recommendations-list {
      list-style: none;
      counter-reset: recommendation;
    }

    .recommendations-list li {
      counter-increment: recommendation;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1rem;
      background: linear-gradient(to right, rgba(102, 126, 234, 0.08), transparent);
      border-radius: var(--radius-md);
      position: relative;
      padding-left: 4rem;
      color: var(--color-text);
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .recommendations-list li:hover {
      background: linear-gradient(to right, rgba(102, 126, 234, 0.12), transparent);
      transform: translateX(4px);
    }

    .recommendations-list li::before {
      content: counter(recommendation);
      position: absolute;
      left: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      background: var(--gradient-purple);
      color: white;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 700;
    }

    /* Statistics Dashboard */
    .stats-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
      margin: 2rem 0;
    }

    .stats-chart-card {
      background: var(--card-bg);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      padding: 1.5rem;
      border: 1px solid rgba(0,0,0,0.04);
    }

    .stats-chart-card h3 {
      margin-bottom: 1rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--color-text);
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    /* Appendix */
    .appendix {
      page-break-before: always;
    }

    /* Page Footer */
    .page-footer {
      margin-top: 4rem;
      padding: 2rem;
      background: var(--card-bg);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--size-small);
      color: var(--color-text-light);
      border: 1px solid rgba(0,0,0,0.04);
    }

    /* Print Styles */
    @media print {
      body {
        background: white;
      }

      .report-container {
        max-width: none;
        padding: 0;
      }

      .dashboard-layout {
        display: block;
      }

      .dashboard-sidebar {
        display: none;
      }

      .card, .section-card, .metric-card, .chart-container, .table-container {
        box-shadow: none;
        border: 1px solid var(--color-border);
        break-inside: avoid;
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

    /* SVG Gradient Definitions */
    .svg-defs {
      position: absolute;
      width: 0;
      height: 0;
    }
  `;
}
