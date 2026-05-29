import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Legal CAG API',
      version: '1.0.0',
      description: 'Cache Augmented Generation system for legal contract analysis',
      contact: {
        name: 'CAG Demo Team',
        email: 'demo@cag-legal.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.cag-legal.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT session token for authentication'
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Session-Token',
          description: 'Session token for authentication'
        }
      },
      schemas: {
        Session: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              format: 'uuid',
              description: 'Unique session identifier'
            },
            token: {
              type: 'string',
              description: 'JWT authentication token'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Session expiration time'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Session creation time'
            }
          }
        },
        Document: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              format: 'uuid',
              description: 'Unique document identifier'
            },
            originalName: {
              type: 'string',
              description: 'Original filename'
            },
            pages: {
              type: 'integer',
              description: 'Number of pages in document'
            },
            uploadedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Upload timestamp'
            },
            metadata: {
              $ref: '#/components/schemas/DocumentMetadata'
            },
            statistics: {
              $ref: '#/components/schemas/DocumentStatistics'
            }
          }
        },
        DocumentMetadata: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Document title'
            },
            parties: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of parties involved'
            },
            dates: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Important dates in document'
            },
            clauses: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Legal clauses identified'
            },
            risks: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Risk'
              },
              description: 'Risk factors identified'
            },
            jurisdiction: {
              type: 'string',
              description: 'Governing jurisdiction'
            }
          }
        },
        Risk: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Risk keyword identified'
            },
            context: {
              type: 'string',
              description: 'Context around risk keyword'
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Risk severity level'
            }
          }
        },
        DocumentStatistics: {
          type: 'object',
          properties: {
            textLength: {
              type: 'integer',
              description: 'Length of extracted text'
            },
            chunkCount: {
              type: 'integer',
              description: 'Number of text chunks'
            },
            partiesCount: {
              type: 'integer',
              description: 'Number of parties identified'
            },
            clausesCount: {
              type: 'integer',
              description: 'Number of clauses identified'
            },
            risksCount: {
              type: 'integer',
              description: 'Number of risks identified'
            }
          }
        },
        Query: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              minLength: 10,
              maxLength: 1000,
              description: 'Legal analysis query'
            },
            documentId: {
              type: 'string',
              format: 'uuid',
              description: 'Document ID to analyze (optional)'
            },
            includeComparison: {
              type: 'boolean',
              description: 'Include RAG vs CAG comparison'
            }
          }
        },
        QueryResponse: {
          type: 'object',
          properties: {
            response: {
              type: 'string',
              description: 'AI-generated legal analysis'
            },
            metadata: {
              type: 'object',
              properties: {
                queryHash: {
                  type: 'string',
                  description: 'Query hash for caching'
                },
                fromCache: {
                  type: 'boolean',
                  description: 'Response from cache'
                },
                processedAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Processing timestamp'
                },
                model: {
                  type: 'string',
                  description: 'AI model used'
                },
                tokens: {
                  type: 'object',
                  properties: {
                    input: {
                      type: 'integer',
                      description: 'Input tokens used'
                    },
                    output: {
                      type: 'integer',
                      description: 'Output tokens generated'
                    },
                    total: {
                      type: 'integer',
                      description: 'Total tokens'
                    }
                  }
                },
                cost: {
                  $ref: '#/components/schemas/CostBreakdown'
                }
              }
            }
          }
        },
        CostBreakdown: {
          type: 'object',
          properties: {
            currency: {
              type: 'string',
              enum: ['USD'],
              description: 'Currency code'
            },
            breakdown: {
              type: 'object',
              properties: {
                input: {
                  type: 'object',
                  properties: {
                    tokens: {
                      type: 'integer'
                    },
                    cost: {
                      type: 'number'
                    },
                    rate: {
                      type: 'number'
                    }
                  }
                },
                output: {
                  type: 'object',
                  properties: {
                    tokens: {
                      type: 'integer'
                    },
                    cost: {
                      type: 'number'
                    },
                    rate: {
                      type: 'number'
                    }
                  }
                },
                total: {
                  type: 'object',
                  properties: {
                    tokens: {
                      type: 'integer'
                    },
                    cost: {
                      type: 'number'
                    }
                  }
                }
              }
            }
          }
        },
        ROI: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                totalMonthlyImpact: {
                  type: 'number',
                  description: 'Total monthly financial impact'
                },
                totalAnnualImpact: {
                  type: 'number',
                  description: 'Total annual financial impact'
                },
                roiPercentage: {
                  type: 'number',
                  description: 'Return on investment percentage'
                },
                paybackPeriodMonths: {
                  type: 'integer',
                  description: 'Payback period in months'
                }
              }
            },
            categories: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ROICategory'
              },
              description: 'ROI analysis by category'
            }
          }
        },
        ROICategory: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: [
                'Billable Hour Recovery',
                'Risk Mitigation',
                'Client Service Velocity',
                'Competitive Advantage',
                'Knowledge Management',
                'Operational Efficiency'
              ]
            },
            metrics: {
              type: 'object',
              description: 'Category-specific metrics'
            },
            impact: {
              type: 'object',
              description: 'Financial impact calculations'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              enum: [false]
            },
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'string',
              description: 'Detailed error information'
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code'
            }
          }
        },
        Health: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy', 'degraded']
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            services: {
              type: 'object',
              properties: {
                redis: {
                  type: 'object',
                  properties: {
                    connected: {
                      type: 'boolean'
                    },
                    stats: {
                      type: 'object'
                    }
                  }
                },
                anthropic: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string'
                    },
                    model: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Session',
        description: 'Session management operations'
      },
      {
        name: 'Documents',
        description: 'Document upload and management'
      },
      {
        name: 'CAG',
        description: 'Cache Augmented Generation queries'
      },
      {
        name: 'ROI',
        description: 'Return on Investment calculations'
      },
      {
        name: 'Health',
        description: 'System health and status'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/app.js'
  ]
};

const specs = swaggerJsdoc(options);

export default specs;
