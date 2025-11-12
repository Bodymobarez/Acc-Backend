import serverless from 'serverless-http';
import type { Handler } from '@netlify/functions';

let cachedHandler: Handler | null = null;

const getHandler = async (): Promise<Handler> => {
  if (cachedHandler) return cachedHandler;
  
  const { app } = await import('../server/index.js');
  
  // Configure serverless-http with explicit options
  cachedHandler = serverless(app, {
    provider: 'aws',
    basePath: '/api',
  }) as Handler;
  
  return cachedHandler;
};

export const handler: Handler = async (event, context) => {
  const h = await getHandler();
  return h(event, context);
};
