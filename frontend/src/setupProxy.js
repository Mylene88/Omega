const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
    console.log('🔧 setupProxy.js is loading...');

    app.use(
        '/api',
        createProxyMiddleware({
            target: 'http://localhost:3000',
            changeOrigin: true,
            logLevel: 'debug',
            onProxyReq: (proxyReq, req, res) => {
                console.log('🚀 Proxying:', req.method, req.url, '→', req.headers.host);
            },
            onProxyRes: (proxyRes, req, res) => {
                console.log('✅ Response:', proxyRes.statusCode, req.url);
            },
            onError: (err, req, res) => {
                console.error('❌ Proxy Error:', err.message);
            }
        })
    );

    console.log('✅ Proxy configured for /api → http://localhost:3000');
};