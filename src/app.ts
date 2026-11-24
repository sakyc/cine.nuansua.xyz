import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import routes from './routes';
import { errorHandler } from './middlewares/error';
import { sanitizeResponse } from './middlewares/sanitizer';
import { config } from './config/env';

const app = express();

if (config.trustProxy) app.set('trust proxy', config.trustProxy);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
// Browsers on other sites only get CORS headers when their origin is listed in CORS_ORIGINS.
// With no list, development allows any origin and production allows same-origin only.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.corsOrigins.length) return callback(null, config.corsOrigins.includes(origin));
    callback(null, config.nodeEnv !== 'production');
  },
}));
app.use(express.json());
app.use(sanitizeResponse);

app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

const swaggerOptions = {
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.min.css',
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-bundle.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-standalone-preset.js'
  ]
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
app.use('/api', routes);
// Legacy clients call the API without the /api prefix; the same limits and auth apply there.
// Skipping /api paths keeps unmatched /api requests from being counted twice by the rate limiter.
app.use('/', (req, res, next) => (req.path === '/api' || req.path.startsWith('/api/') ? next() : routes(req, res, next)));

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use(errorHandler);

export default app;
