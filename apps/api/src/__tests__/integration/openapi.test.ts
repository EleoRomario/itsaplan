import { beforeEach, describe, expect, it } from 'bun:test';
import pkg from '../../../../../package.json';
import { app } from '../helpers/app';
import { signUpTestUser } from '../helpers/auth';
import { resetDb } from '../helpers/db';

type Operation = {
  description?: string;
  security?: Array<Record<string, string[]>>;
  tags?: string[];
  requestBody?: { content?: Record<string, unknown> };
  responses?: Record<string, { content?: Record<string, unknown> }>;
};

type Document = {
  info: { version: string; description?: string };
  servers?: Array<{ url: string }>;
  paths: Record<string, Record<string, Operation>>;
};

beforeEach(resetDb);

async function document(): Promise<Document> {
  const god = await signUpTestUser({ team: false });
  const response = await app.handle(
    new Request('http://localhost/docs/json', {
      headers: { cookie: god.cookie },
    }),
  );
  expect(response.status).toBe(200);
  return (await response.json()) as Document;
}

describe('OpenAPI document', () => {
  it('requires the instance owner (god) for /docs and /docs/json', async () => {
    const anonDocs = await app.handle(new Request('http://localhost/docs'));
    expect(anonDocs.status).toBe(401);
    const anonSpec = await app.handle(new Request('http://localhost/docs/json'));
    expect(anonSpec.status).toBe(401);

    await signUpTestUser({ team: false });
    const member = await signUpTestUser({ team: false });
    const memberDocs = await app.handle(
      new Request('http://localhost/docs', { headers: { cookie: member.cookie } }),
    );
    expect(memberDocs.status).toBe(403);
    const memberSpec = await app.handle(
      new Request('http://localhost/docs/json', { headers: { cookie: member.cookie } }),
    );
    expect(memberSpec.status).toBe(403);
  });
  it('uses the configured public origin and current product version', async () => {
    const doc = await document();

    expect(doc.servers?.[0]?.url).toBe(process.env.API_URL);
    expect(doc.info.version).toBe(pkg.version);
    expect(doc.info.description).toContain('/account/api-keys');
    expect(doc.info.description).toContain('/mcp');
  });

  it('documents each authentication surface accurately', async () => {
    const doc = await document();

    expect(doc.paths['/projects']!.get!.security).toBeUndefined();
    expect(doc.paths['/']!.get!.security).toEqual([]);
    expect(doc.paths['/me']!.get!.security).toEqual([{}, { apiKey: [] }]);
    expect(doc.paths['/share/issue/{token}']!.get!.security).toEqual([]);
    expect(doc.paths['/scim/v2/Users']!.post!.security).toEqual([{ scimBearer: [] }]);
    expect(doc.paths['/webhooks/git/{webhookId}']!.post!.security).toContainEqual({
      gitLabToken: [],
    });
  });

  it('documents only the media types each surface accepts', async () => {
    const doc = await document();
    const genericMediaTypes = ['application/json', 'multipart/form-data', 'text/plain'];

    expect(Object.keys(doc.paths['/teams/{teamId}/projects']!.post!.requestBody!.content!)).toEqual(
      ['application/json'],
    );
    expect(
      Object.keys(doc.paths['/issues/{issueId}/attachments']!.post!.requestBody!.content!),
    ).toEqual(['multipart/form-data']);
    expect(
      Object.keys(doc.paths['/webhooks/git/{webhookId}']!.post!.requestBody!.content!),
    ).toEqual(['application/json']);
    expect(Object.keys(doc.paths['/scim/v2/Users']!.post!.requestBody!.content!)).toEqual([
      'application/scim+json',
    ]);
    expect(Object.keys(doc.paths['/scim/v2/Users']!.post!.responses!['201']!.content!)).toEqual([
      'application/scim+json',
    ]);

    for (const path of Object.values(doc.paths)) {
      for (const operation of Object.values(path)) {
        if (!operation || typeof operation !== 'object' || !('responses' in operation)) continue;
        const requestTypes = Object.keys(operation.requestBody?.content ?? {}).filter((mediaType) =>
          genericMediaTypes.includes(mediaType),
        );
        expect(requestTypes.length).toBeLessThanOrEqual(1);
        for (const response of Object.values(operation.responses ?? {})) {
          const responseTypes = Object.keys(response.content ?? {}).filter((mediaType) =>
            genericMediaTypes.includes(mediaType),
          );
          expect(responseTypes.length).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('groups SCIM and gives every operation a description', async () => {
    const doc = await document();
    const operations = Object.values(doc.paths).flatMap((path) =>
      Object.values(path).filter((operation): operation is Operation =>
        Boolean(operation && typeof operation === 'object' && 'responses' in operation),
      ),
    );

    expect(doc.paths['/scim/v2/Users']!.post!.tags).toEqual(['SCIM']);
    expect(operations.length).toBeGreaterThan(300);
    expect(operations.every((operation) => Boolean(operation.description))).toBe(true);
  });
});

describe('API CORS', () => {
  it('allows personal API keys from the web app', async () => {
    const origin = process.env.APP_URL?.split(',')[0]?.trim();
    if (!origin) throw new Error('APP_URL is required for the CORS test');
    const response = await app.handle(
      new Request('http://localhost/projects', {
        method: 'OPTIONS',
        headers: {
          origin,
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'x-api-key',
        },
      }),
    );

    expect(response.status).toBe(204);
    const allowed = response.headers.get('access-control-allow-headers')?.toLowerCase();
    expect(allowed).toContain('x-api-key');
  });
});
