import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Request, Response } from 'express';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

const router = Router();

// Get the project root directory
// From src/modules/swagger/swagger.routes.ts -> project root
const currentFile = fileURLToPath(import.meta.url);
const currentDir = join(currentFile, '..');
const projectRoot = join(currentDir, '..', '..', '..');

/**
 * Load OpenAPI spec from separate file
 */
function loadOpenAPISpec(): object {
  try {
    const specPath = join(projectRoot, 'swagger', 'openapi.yaml');
    const fileContents = readFileSync(specPath, 'utf-8');
    return parse(fileContents);
  } catch (error) {
    throw new Error(`Failed to load OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Serve Swagger UI
const swaggerSpec = loadOpenAPISpec();

router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AI Report Generator API Documentation',
    customfavIcon: '/favicon.ico',
  })
);

/**
 * GET /swagger.json - Get OpenAPI spec as JSON
 */
router.get('/json', (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});

/**
 * GET /swagger.yaml - Get OpenAPI spec as YAML
 */
router.get('/yaml', (_req: Request, res: Response) => {
  try {
    const specPath = join(projectRoot, 'swagger', 'openapi.yaml');
    const fileContents = readFileSync(specPath, 'utf-8');
    res.setHeader('Content-Type', 'text/yaml');
    res.send(fileContents);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load OpenAPI spec',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

