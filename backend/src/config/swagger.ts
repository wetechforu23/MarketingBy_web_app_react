import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MarketingBy Healthcare Platform API',
      version: '1.0.0',
      description: 'Complete API documentation for the MarketingBy Healthcare Marketing Platform',
      contact: {
        name: 'WeTechForU',
        email: 'info@wetechforu.com',
        url: 'https://wetechforu.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server (local)'
      },
      {
        url: 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api',
        description: 'Production server (Heroku)'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session cookie for authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', example: 'user@example.com' },
            username: { type: 'string', example: 'johndoe' },
            role: { type: 'string', example: 'client_admin' },
            client_id: { type: 'integer', example: 199 },
            is_admin: { type: 'boolean', example: false }
          }
        },
        Client: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 199 },
            client_name: { type: 'string', example: 'Demo-2' },
            email: { type: 'string', example: 'demo2@abc.com' },
            phone: { type: 'string', example: '+1234567890' },
            contact_name: { type: 'string', example: 'John Doe' },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        FacebookData: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            connected: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                pageViews: { type: 'integer', example: 0 },
                followers: { type: 'integer', example: 1 },
                engagement: { type: 'integer', example: 17 },
                reach: { type: 'integer', example: 26 },
                impressions: { type: 'integer', example: 181 },
                connected: { type: 'boolean', example: true },
                status: { type: 'string', example: 'Connected' }
              }
            }
          }
        },
        FacebookPost: {
          type: 'object',
          properties: {
            post_id: { type: 'string', example: '123456789_123456789' },
            message: { type: 'string', example: 'From the flawless sparkle...' },
            created_time: { type: 'string', format: 'date-time' },
            permalink_url: { type: 'string', example: 'https://facebook.com/...' },
            post_impressions: { type: 'integer', example: 8 },
            post_reach: { type: 'integer', example: 8 },
            post_engaged_users: { type: 'integer', example: 0 },
            comments_count: { type: 'integer', example: 0 },
            shares_count: { type: 'integer', example: 0 },
            reactions_like: { type: 'integer', example: 0 },
            reactions_love: { type: 'integer', example: 0 }
          }
        },
        GoogleAnalyticsData: {
          type: 'object',
          properties: {
            users: { type: 'integer', example: 150 },
            sessions: { type: 'integer', example: 200 },
            pageViews: { type: 'integer', example: 500 },
            bounceRate: { type: 'number', example: 45.5 },
            avgSessionDuration: { type: 'number', example: 120.5 }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
            details: { type: 'string', example: 'Detailed error information' }
          }
        }
      }
    },
    security: [
      {
        cookieAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'Facebook',
        description: 'Facebook integration and analytics'
      },
      {
        name: 'Google Analytics',
        description: 'Google Analytics integration and reports'
      },
      {
        name: 'Clients',
        description: 'Client management operations'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Leads',
        description: 'Lead management and scraping'
      },
      {
        name: 'SEO',
        description: 'SEO analysis and audit tools'
      },
      {
        name: 'Email',
        description: 'Email sending and template management'
      },
      {
        name: 'Dashboard',
        description: 'Dashboard data and analytics'
      }
    ]
  },
  // Path to the API routes files
  apis: [
    './src/routes/*.ts',
    './src/server.ts'
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

