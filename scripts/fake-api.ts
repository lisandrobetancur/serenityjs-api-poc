import http from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * A tiny local API used to demonstrate behaviour the real API cannot be asked to produce on demand:
 * gateway errors that heal after N attempts, edge rejections, and a resource that changes state while polled.
 *
 * Endpoints (fictitious data only):
 * - `POST /auth/login`               → 200 with a token for `qa@example.test` / `Secret123!`, 401 otherwise
 * - `GET  /orders/{orderId}`         → 200 with an order
 *   - `?fail=502|504|403edge&times=N&key=K` fails N times for key K, then answers 200
 * - `POST /orders`                   → same `fail` options, 201 when it succeeds
 * - `GET  /orders/{orderId}/status?key=K` → `pending`, `processing`, then `confirmed` on the third call per key
 *
 * Start it standalone with `npm run fake-api`, or let the test hooks start one per worker process.
 */
export async function startFakeApi(port = 0): Promise<{ url: string; close: () => Promise<void> }> {
    const attempts = new Map<string, number>();

    const server = http.createServer((request, response) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        const send = (status: number, body: unknown, headers: Record<string, string> = {}) => {
            response.writeHead(status, { 'content-type': 'application/json', ...headers });
            response.end(JSON.stringify(body));
        };

        let raw = '';
        request.on('data', chunk => (raw += chunk));
        request.on('end', () => {
            const key = url.searchParams.get('key') ?? 'default';
            const fail = url.searchParams.get('fail');
            const times = Number(url.searchParams.get('times') ?? '0');
            const counterKey = `${request.method} ${url.pathname} ${fail} ${key}`;

            if (fail) {
                const seen = attempts.get(counterKey) ?? 0;
                attempts.set(counterKey, seen + 1);
                if (seen < times) {
                    if (fail === '403edge') {
                        return send(403, { message: 'Forbidden' }, { 'x-amzn-ErrorType': 'ForbiddenException' });
                    }
                    if (fail === '403app') {
                        return send(403, { detail: 'Not allowed' });
                    }
                    return send(Number(fail), { message: fail === '502' ? 'Bad Gateway' : 'Gateway Timeout' });
                }
            }

            if (request.method === 'POST' && url.pathname === '/auth/login') {
                const body = safeJson(raw) as { email?: string; password?: string };
                return body.email === 'qa@example.test' && body.password === 'Secret123!'
                    ? send(200, { access_token: 'fake.jwt.token', token_type: 'bearer' })
                    : send(401, { error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password' } });
            }

            const status = url.pathname.match(/^\/orders\/([\w-]+)\/status$/);
            if (request.method === 'GET' && status) {
                const calls = (attempts.get(`status ${key}`) ?? 0) + 1;
                attempts.set(`status ${key}`, calls);
                return send(200, {
                    orderId: status[1],
                    status: calls >= 3 ? 'confirmed' : calls === 2 ? 'processing' : 'pending',
                });
            }

            const order = url.pathname.match(/^\/orders\/([\w-]+)$/);
            if (request.method === 'GET' && order) {
                return send(200, {
                    orderId: order[1],
                    status: 'confirmed',
                    total: '125.50',
                    tenant: request.headers['x-tenant'] ?? null,
                });
            }

            if (request.method === 'POST' && url.pathname === '/orders') {
                return send(201, { orderId: '00000000-0000-0000-0000-000000000001', ...(safeJson(raw) as object) });
            }

            return send(404, {
                error: { code: 'NOT_FOUND', message: `${request.method} ${url.pathname} does not exist` },
            });
        });
    });

    await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
    const { port: actualPort } = server.address() as AddressInfo;
    return {
        url: `http://127.0.0.1:${actualPort}`,
        close: () => new Promise<void>(resolve => server.close(() => resolve())),
    };
}

function safeJson(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

if (require.main === module) {
    void startFakeApi(Number(process.env.FAKE_API_PORT ?? 8099)).then(({ url }) => {
        process.stdout.write(`Fake API listening on ${url}\n`);
    });
}
