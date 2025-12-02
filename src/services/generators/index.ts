import {
  createSingleton,
  type IChartGenerator,
  type IDOCXGenerator,
  type IHTMLGenerator,
  type IPDFGenerator,
} from '../../core/index.js';

import { ChartGenerator } from './chart-generator.service.js';
import { DOCXGenerator } from './docx-generator.service.js';
import { HTMLGenerator } from './html-generator.service.js';
import { PDFGenerator } from './pdf-generator.service.js';

/**
 * Get the singleton chart generator instance
 */
export const getChartGenerator = createSingleton<IChartGenerator>(() => new ChartGenerator());

/**
 * Get the singleton HTML generator instance
 */
export const getHTMLGenerator = createSingleton<IHTMLGenerator>(() => new HTMLGenerator());

/**
 * Get the singleton PDF generator instance
 */
export const getPDFGenerator = createSingleton<IPDFGenerator>(() => new PDFGenerator());

/**
 * Get the singleton DOCX generator instance
 */
export const getDOCXGenerator = createSingleton<IDOCXGenerator>(() => new DOCXGenerator());

// Convenience exports for backward compatibility
export const chartGenerator = getChartGenerator();
export const htmlGenerator = getHTMLGenerator();
export const pdfGenerator = getPDFGenerator();
export const docxGenerator = getDOCXGenerator();

// Export classes
export { ChartGenerator } from './chart-generator.service.js';
export { DOCXGenerator } from './docx-generator.service.js';
export { HTMLGenerator } from './html-generator.service.js';
export { PDFGenerator } from './pdf-generator.service.js';

// Export styles
export * from './styles.js';
