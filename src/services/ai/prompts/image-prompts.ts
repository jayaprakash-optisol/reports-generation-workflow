/**
 * Prompts for AI image generation
 */

import type { ReportStyle } from '../../../shared/types/index.js';

/**
 * Generate image prompt with professional styling
 */
export function getImageGenerationPrompt(prompt: string): string {
  return `Professional business illustration: ${prompt}. Clean, modern, corporate style.`;
}

/**
 * Generate cover page image description
 */
export function getCoverImagePrompt(title: string, style: ReportStyle): string {
  const styleDescriptions: Record<ReportStyle, string> = {
    business: 'corporate, professional, clean lines, blue tones',
    research: 'academic, scientific, data visualization elements',
    technical: 'technology, engineering, circuit patterns, modern',
  };

  return `Abstract ${styleDescriptions[style]} illustration representing "${title}".
No text in image. Suitable as report cover background.`;
}
