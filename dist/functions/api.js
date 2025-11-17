import serverless from 'serverless-http';
let cachedHandler = null;
const getHandler = async () => {
    if (cachedHandler)
        return cachedHandler;
    const { app } = await import('../server/index.js');
    // Configure serverless-http - no basePath since Netlify redirects handle it
    cachedHandler = serverless(app, {
        provider: 'aws',
    });
    return cachedHandler;
};
export const handler = async (event, context) => {
    const h = await getHandler();
    return h(event, context);
};
