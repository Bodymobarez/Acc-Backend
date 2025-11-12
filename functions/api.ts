import serverless from 'serverless-http';
import type { Handler } from '@netlify/functions';

let cachedHandler: any = null;

const getHandler = async () => {
  if (cachedHandler) return cachedHandler;
  
  const { default: app } = await import('../server/index.js');
  cachedHandler = serverless(app);
  return cachedHandler;
};

export const handler: Handler = async (event, context) => {
  const h = await getHandler();
  return h(event, context);
};
