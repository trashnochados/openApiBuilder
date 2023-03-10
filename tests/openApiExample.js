export const openApiSpecs= {
  basic: {
    openapi: '3.0.3',
    servers: [
      {
        url: 'http://api.jusmundi.com/',
        description: 'production environnement',
      },
      {
        url: 'http://uat-api.jusmundi.com/',
        description: 'uat environnement',
      },
      {
        url: 'http://dev-api.jusmundi.com/',
        description: 'development environnement',
      },
    ],
    info: {
      description: 'CRUD for original PDF and allow to retrieve Jus Mundi PDF',
      version: '1.0.0',
      title: 'PDF Manager',
      contact: {
        email: 't.latterner@jusmundi.com',
      },
    },
    tags: [
      {
        name: 'pdf',
      },
    ],
    paths: {
      '/api/documents/{type}/{id}': {
        parameters: [
          {
            $ref: '#/components/parameters/id',
          },
          {
            $ref: '#/components/parameters/type',
          },
          {
            $ref: '#/components/parameters/locale',
          },
        ],
        get: {
          tags: [
            'pdf',
          ],
          summary: 'Get a document PDF by type, id and locale',
          description: 'To retrieve an exsting PDF',
          operationId: 'getDocument',
          parameters: [
            {
              $ref: '#/components/parameters/pdfType',
            },
          ],
          responses: {
            200: {
              description: 'PDF found and returned',
              content: {
                'application/pdf': {
                  schema: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
            '4xx': {
              $ref: '#/components/responses/error',
            },
            '5xx': {
              $ref: '#/components/responses/error',
            },
          },
        },
        post: {
          tags: [
            'pdf',
          ],
          summary: 'Add or replace a new PDF',
          description: 'To add a new PDF',
          operationId: 'addDocument',
          requestBody: {
            description: 'PDF to add or replace',
            required: true,
            content: {
              'application/pdf': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'PDF replaced',
            },
            201: {
              description: 'PDF added',
            },
            '4xx': {
              $ref: '#/components/responses/error',
            },
            '5xx': {
              $ref: '#/components/responses/error',
            },
          },
        },
        delete: {
          tags: [
            'pdf',
          ],
          summary: 'Delete a document PDF by type, id and locale',
          description: 'To delete a PDF',
          operationId: 'deleteDocument',
          responses: {
            203: {
              description: 'PDF deleted',
            },
            '4xx': {
              $ref: '#/components/responses/error',
            },
            '5xx': {
              $ref: '#/components/responses/error',
            },
          },
        },
      },
    },
    components: {
      parameters: {
        id: {
          in: 'path',
          name: 'id',
          schema: {
            type: 'integer',
          },
          required: true,
          description: 'The document ID',
        },
        type: {
          in: 'path',
          name: 'type',
          schema: {
            type: 'string',
            enum: [
              'decision',
              'opinion',
              'other',
              'treaty',
              'rule',
              'publication',
            ],
          },
          required: true,
          description: 'The document type',
        },
        locale: {
          in: 'query',
          name: 'locale',
          schema: {
            type: 'string',
            pattern: '^[a-z]{2}(_[a-z]{2})?$',
          },
          required: true,
          description: 'The document locale',
        },
        pdfType: {
          in: 'query',
          name: 'pdf-type',
          schema: {
            type: 'string',
            enum: [
              'original',
              'jusmundi',
            ],
          },
          required: true,
          description: 'The type of PDF.',
        },
      },
      responses: {
        error: {
          description: 'An error occurred',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/error',
              },
            },
          },
        },
      },
      schemas: {
        error: {
          type: 'object',
          properties: {
            statusCode: {
              type: 'integer',
              description: 'The status code',
            },
            error: {
              type: 'string',
              description: 'The name of the error',
            },
            message: {
              type: 'string',
              description: 'The description of the error',
            },
          },
          required: ['statusCode', 'error', 'message'],
        },
      },
    },    
  }
}