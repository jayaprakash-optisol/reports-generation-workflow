// Re-export all services with singleton getters

// AI Services
export { getOpenAIService, openaiService, OpenAIService } from './ai/index.js';

// Data Services
export { dataProfiler, DataProfiler, getDataProfiler } from './data/index.js';

// Generator Services
export {
  chartGenerator,
  ChartGenerator,
  docxGenerator,
  DOCXGenerator,
  getChartGenerator,
  getDOCXGenerator,
  getHTMLGenerator,
  getPDFGenerator,
  htmlGenerator,
  HTMLGenerator,
  pdfGenerator,
  PDFGenerator,
} from './generators/index.js';

// Storage Services
export {
  getStorageService,
  LocalStorageService,
  MinioStorageService,
  storage,
} from './storage/index.js';
