import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MarketingBy API Documentation',
      version: '1.0.0',
      description: 'Complete API documentation for WeTechForU Healthcare Marketing Platform',
      contact: {
        name: 'WeTechForU',
        email: 'info@wetechforu.com'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api',
        description: 'Production Server'
      },
      {
        url: 'http://localhost:3001/api',
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'marketingby.sid',
          description: 'Session cookie named "marketingby.sid". Look in browser DevTools → Application → Cookies to find the cookie value. Copy the entire value (long string) and paste it in the Authorize modal.'
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Chat Widget', description: 'Chat widget public and admin APIs' },
      { name: 'WhatsApp', description: 'WhatsApp integration endpoints' },
      { name: 'Agent Handover', description: 'Agent handover management' },
      { name: 'Credentials', description: 'Encrypted credentials management' },
      { name: 'Leads', description: 'Lead management APIs' },
      { name: 'Admin', description: 'Super admin APIs' },
      { name: 'System', description: 'System architecture and schema APIs' }
    ]
  },
  apis: ['./src/routes/*.ts'], // Path to the API files
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
