import { errorResponse, withCors } from './cors.ts';

Deno.test('withCors replaces wildcard response origins', async () => {
  const handler = withCors(() => errorResponse(400, 'BAD_REQUEST', 'invalid'));
  const response = await handler(
    new Request('http://localhost/functions/test', {
      headers: { Origin: 'http://localhost:5173' },
    }),
  );

  if (response.headers.get('Access-Control-Allow-Origin') !== 'http://localhost:5173') {
    throw new Error('Expected the configured local origin');
  }
});

Deno.test('withCors rejects an unlisted origin through the CORS header', async () => {
  const handler = withCors(() => errorResponse(200, 'OK', 'ok'));
  const response = await handler(
    new Request('http://localhost/functions/test', {
      headers: { Origin: 'https://attacker.example' },
    }),
  );

  if (response.headers.get('Access-Control-Allow-Origin') !== 'http://localhost:5173') {
    throw new Error('Expected the configured origin fallback');
  }
});
