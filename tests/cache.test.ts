import express from 'express';
import request from 'supertest';
import { cache } from '../src/middlewares/cache';
import { redis } from '../src/config/redis';

jest.mock('../src/config/redis', () => ({ redis: { status: 'ready', get: jest.fn(), set: jest.fn() } }));
jest.mock('../src/config/logger', () => ({ logger: { warn: jest.fn() } }));

const client = jest.mocked(redis);
const entries = new Map<string, string>();

beforeEach(() => {
  entries.clear();
  client.status = 'ready';
  client.get.mockReset().mockImplementation(async key => entries.get(key) || null);
  client.set.mockReset().mockImplementation(async (key, value) => { entries.set(key, value); return 'OK'; });
});

it('does not cache an upstream error or replay it as HTTP 200', async () => {
  const app = express();
  let status = 502;
  app.get('/', cache(60), (_, res) => res.status(status).json({ success: status === 200 }));
  expect((await request(app).get('/')).status).toBe(502);
  expect(client.set).not.toHaveBeenCalled();
  status = 200;
  expect((await request(app).get('/')).body.success).toBe(true);
});

it('reuses successful JSON responses', async () => {
  const app = express();
  const handler = jest.fn((_: express.Request, res: express.Response) => res.json({ success: true, data: [1] }));
  app.get('/', cache(60), handler);
  await request(app).get('/');
  const hit = await request(app).get('/');
  expect(hit.status).toBe(200);
  expect(hit.body).toEqual({ success: true, data: [1] });
  expect(handler).toHaveBeenCalledTimes(1);
});

it('does not cache a failure envelope even when status is 200', async () => {
  const app = express();
  app.get('/', cache(60), (_, res) => res.json({ success: false }));
  await request(app).get('/');
  expect(client.set).not.toHaveBeenCalled();
});

it.each(['read', 'write', 'invalid'])('remains usable when cache has a %s failure', async mode => {
  if (mode === 'read') client.get.mockRejectedValue(new Error('Offline'));
  if (mode === 'write') client.set.mockRejectedValue(new Error('Offline'));
  if (mode === 'invalid') client.get.mockResolvedValue('invalid JSON');
  const app = express();
  app.get('/', cache(60), (_, res) => res.json({ success: true }));
  expect((await request(app).get('/')).status).toBe(200);
});

it('bypasses Redis when it is not ready', async () => {
  client.status = 'end';
  const app = express();
  app.get('/', cache(60), (_, res) => res.json({ success: true }));
  await request(app).get('/');
  expect(client.get).not.toHaveBeenCalled();
});
