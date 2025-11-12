import serverless from 'serverless-http';
import type { Handler } from '@netlify/functions';

let cachedHandler: Handler | null = null;

const getHandler = async (): Promise<Handler> => {
  if (cachedHandler) return cachedHandler;
  
  const { app } = await import('../server/index.js');
  
  // Configure serverless-http - no basePath since Netlify redirects handle it
  cachedHandler = serverless(app, {
    provider: 'aws',
  }) as Handler;
  
  return cachedHandler;
};

export const handler: Handler = async (event, context) => {
  const h = await getHandler();
  return h(event, context);
};
