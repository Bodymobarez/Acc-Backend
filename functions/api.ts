import serverless from 'serverless-http';
import type { Handler } from '@netlify/functions';

let handler: any = null;

const getHandler = async () => {
  if (handler) return handler;
  
  const { default: app } = await import('../server/index.js');
  handler = serverless(app);
  return handler;
};

export const handler: Handler = async (event, context) => {
  const h = await getHandler();
  return h(event, context);
};
