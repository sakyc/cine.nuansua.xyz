import request from 'supertest';

jest.setTimeout(30000);

jest.mock('../src/config/redis', () => ({ redis: { status: 'disabled' } }));
jest.mock('../src/config/prisma', () => ({ prisma: {} }));
jest.mock('../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../src/services/catalog', () => ({ __esModule: true, catalog: {} }));

type Settings = Partial<{ cronSecret: string; corsOrigins: string[]; nodeEnv: string; rateLimitPerMinute: number; playbackEnabled: boolean }>;

/** Loads a fresh app with its own config and rate-limit stores. */
function appWith(settings: Settings = {}) {
  let app: import('express').Express;
  jest.isolateModules(() => {
    jest.doMock('../src/config/env', () => ({
      config: {
        lk21BaseUrl: 'https://catalog.example', lk21BaseUrls: ['https://catalog.example'], proxyUrl: '',
        cronSecret: 'secret', corsOrigins: [], nodeEnv: 'development', trustProxy: 0,
        rateLimitPerMinute: 1000, playbackEnabled: true, playbackSessionsPerIp: 3, ...settings,
      },
    }));
    app = require('../src/app').default;
  });
  return app!;
}

describe('admin endpoints', () => {
  it('hides upstream diagnostics without the admin secret', async () => {
    const app = appWith();
    expect((await request(app).get('/api/debug/upstream')).status).toBe(401);
    expect((await request(app).get('/api/debug/upstream').set('Authorization', 'Bearer wrong')).status).toBe(401);
  });
  it('disables diagnostics when no secret is configured', async () => {
    expect((await request(appWith({ cronSecret: '' })).get('/api/debug/upstream')).status).toBe(503);
  });
});

describe('legacy root routes', () => {
  it('apply the same admin protection without the /api prefix', async () => {
    expect((await request(appWith()).get('/debug/upstream')).status).toBe(401);
  });
});

describe('rate limiting', () => {
  it('returns 429 after the per-minute budget is spent', async () => {
    const app = appWith({ rateLimitPerMinute: 10 });
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await request(app).get('/api/nope')).status);
    expect(statuses.slice(0, 10).every(status => status !== 429)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });
  it('limits detail requests that can reach the upstream more tightly', async () => {
    const app = appWith({ rateLimitPerMinute: 20 });
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await request(app).get('/api/movie/bad%2Fslug')).status);
    expect(statuses.slice(0, 10).every(status => status === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
  it('does not limit requests carrying the admin secret', async () => {
    const app = appWith({ rateLimitPerMinute: 10 });
    for (let i = 0; i < 12; i++) {
      expect((await request(app).get('/api/nope').set('Authorization', 'Bearer secret')).status).toBe(404);
    }
  });
});

describe('CORS', () => {
  const origin = 'https://other-site.example';
  it('allows any origin in development when no list is set', async () => {
    const res = await request(appWith()).get('/api/nope').set('Origin', origin);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
  });
  it('sends no CORS headers to foreign origins in production', async () => {
    const res = await request(appWith({ nodeEnv: 'production' })).get('/api/nope').set('Origin', origin);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('allows only listed origins', async () => {
    const app = appWith({ nodeEnv: 'production', corsOrigins: ['https://my-frontend.example'] });
    expect((await request(app).get('/api/nope').set('Origin', 'https://my-frontend.example')).headers['access-control-allow-origin']).toBe('https://my-frontend.example');
    expect((await request(app).get('/api/nope').set('Origin', origin)).headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('playback switch', () => {
  it('returns 404 for every playback route when playback is disabled', async () => {
    const app = appWith({ playbackEnabled: false });
    expect((await request(app).post('/api/playback/movie/example')).status).toBe(404);
    expect((await request(app).get(`/api/playback/${'a'.repeat(48)}/playlist.m3u8`)).status).toBe(404);
  });
});
