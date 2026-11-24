"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const routes_1 = __importDefault(require("./routes"));
const error_1 = require("./middlewares/error");
const sanitizer_1 = require("./middlewares/sanitizer");
const env_1 = require("./config/env");
const app = (0, express_1.default)();
if (env_1.config.trustProxy)
    app.set('trust proxy', env_1.config.trustProxy);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
// Browsers on other sites only get CORS headers when their origin is listed in CORS_ORIGINS.
// With no list, development allows any origin and production allows same-origin only.
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (env_1.config.corsOrigins.length)
            return callback(null, env_1.config.corsOrigins.includes(origin));
        callback(null, env_1.config.nodeEnv !== 'production');
    },
}));
app.use(express_1.default.json());
app.use(sanitizer_1.sanitizeResponse);
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
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, swaggerOptions));
app.use('/api', routes_1.default);
// Legacy clients call the API without the /api prefix; the same limits and auth apply there.
// Skipping /api paths keeps unmatched /api requests from being counted twice by the rate limiter.
app.use('/', (req, res, next) => (req.path === '/api' || req.path.startsWith('/api/') ? next() : (0, routes_1.default)(req, res, next)));
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
app.use(error_1.errorHandler);
exports.default = app;
