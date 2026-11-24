const catalogResponses = {
  '200': {
    description: 'Saved catalog data, or a successful upstream fetch. Stale saved data is returned while refreshing.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {},
            meta: { $ref: '#/components/schemas/CatalogMeta' },
          },
        },
      },
    },
  },
  '400': { description: 'Invalid request parameters' },
  '404': { description: 'Content not found at the source and no saved snapshot exists' },
  '502': { description: 'Source unavailable or invalid, with no usable saved snapshot' },
  '503': { description: 'Catalog database unavailable or refresh capacity exhausted' },
};

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Cine API',
    version: '1.0.0',
    description: 'API documentation for LK21 metadata catalog',
  },
  servers: [
    {
      url: '/api',
      description: 'Current Environment'
    }
  ],
  components: {
    schemas: {
      CatalogMeta: {
        type: 'object',
        required: ['source', 'stale', 'updatedAt'],
        properties: {
          source: { type: 'string', enum: ['catalog', 'upstream'] },
          stale: { type: 'boolean', description: 'Snapshot TTL has expired; last successful data is still served.' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    securitySchemes: {
      cronBearer: { type: 'http', scheme: 'bearer' },
    },
  },
  paths: {
    '/subtitles/{type}/{slug}': {
      get: {
        summary: 'Search matching movie subtitles from OpenSubtitles',
        description: 'Requires the server-side OPENSUBTITLES_API_KEY. Returns short-lived candidate tokens; series are not supported.',
        tags: ['Subtitles'],
        parameters: [
          { in: 'path', name: 'type', required: true, schema: { type: 'string', enum: ['movie', 'series'] } },
          { in: 'path', name: 'slug', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'List of matching subtitle candidates; an empty list means none found' },
          '400': { description: 'Invalid slug' },
          '422': { description: 'Series episode identity is not supported' },
          '502': { description: 'Subtitle provider unavailable' },
          '503': { description: 'API key not configured or search capacity reached' },
        },
      },
    },
    '/subtitles/movie/{slug}/{token}': {
      post: {
        summary: 'Download a previously matched subtitle as WebVTT',
        description: 'Consumes provider download quota. Tokens are bound to a title and expire after 20 minutes.',
        tags: ['Subtitles'],
        parameters: [
          { in: 'path', name: 'slug', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'token', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Subtitle in WebVTT format', content: { 'text/vtt': { schema: { type: 'string' } } } },
          '404': { description: 'Candidate expired or not found' },
          '502': { description: 'Subtitle download failed or provider quota exhausted' },
          '503': { description: 'API key not configured' },
        },
      },
    },
    '/home': {
      get: {
        summary: 'Get all home page sliders and navigation links',
        tags: ['Home'],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        filmUnggulan: { type: 'string', example: '/api/home/film-unggulan' },
                        latestMovies: { type: 'string' },
                        navigation: {
                          type: 'object',
                          properties: {
                            genre: { type: 'string' },
                            country: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/home/{slider}': {
      get: {
        summary: 'Get items for a specific home slider',
        tags: ['Home'],
        parameters: [
          {
            in: 'path',
            name: 'slider',
            required: true,
            schema: {
              type: 'string',
              enum: ['film-unggulan', 'latest-movies', 'latest-series', 'series-update', 'top-month', 'recommendations', 'family', 'action', 'drakor', 'horror', 'romance', 'comedy', 'korea', 'thailand', 'india']
            }
          }
        ],
        description: 'Lean cards from a shared persisted home snapshot. Fetch details for synopsis, cast and stream links.',
        responses: catalogResponses,
      }
    },
    '/search': {
      get: {
        summary: 'Search titles in the local PostgreSQL catalog',
        description: 'Case-insensitive word-prefix search. Only indexed titles are searchable; an empty result is successful. Search metadata describes the home snapshot, not every indexed entry.',
        tags: ['Search'],
        parameters: [
          {
            in: 'query',
            name: 'q',
            required: true,
            schema: { type: 'string', minLength: 2, maxLength: 100 }
          },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, maximum: 1000, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
        ],
        responses: {
          ...catalogResponses,
          '200': {
            description: 'Paginated local catalog results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' }, query: { type: 'string' },
                    page: { type: 'integer' }, limit: { type: 'integer' },
                    total: { type: 'integer' }, totalPages: { type: 'integer' },
                    results: { type: 'array', items: { type: 'object' } },
                    meta: { $ref: '#/components/schemas/CatalogMeta' },
                  },
                },
              },
            },
          },
        }
      }
    },
    '/movie/{id}': {
      get: {
        summary: 'Get movie details',
        tags: ['Movie'],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: catalogResponses,
      }
    },
    '/series/{id}': {
      get: {
        summary: 'Get series details',
        tags: ['Series'],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: catalogResponses,
      }
    },
    '/cron': {
      get: {
        summary: 'Refresh the home snapshot and configured popular pages',
        tags: ['Maintenance'],
        security: [{ cronBearer: [] }],
        responses: {
          '200': { description: 'Refresh completed' },
          '401': { description: 'Missing or invalid CRON_SECRET bearer token' },
          '503': { description: 'CRON_SECRET is not configured' },
          '500': { description: 'Refresh failed; saved snapshots retained' },
        },
      },
    },
    '/genre/{slug}/movies': {
      get: {
        summary: 'Get movies by genre',
        tags: ['Genre'],
        parameters: [
          {
            in: 'path',
            name: 'slug',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'List of movies for the genre' }
        }
      }
    }
  }
};
