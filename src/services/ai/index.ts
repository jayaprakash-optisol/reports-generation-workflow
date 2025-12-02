import { createSingleton, type ILLMService } from '../../core/index.js';

import { OpenAIService } from './openai.service.js';

/**
 * Get the singleton OpenAI service instance
 */
export const getOpenAIService = createSingleton<ILLMService>(() => new OpenAIService());

/**
 * Convenience export for backward compatibility
 */
export const openaiService = getOpenAIService();

export { OpenAIService } from './openai.service.js';
