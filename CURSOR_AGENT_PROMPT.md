# 📋 Single Prompt for Cursor Agent - API & Database Documentation Generator

## Copy this entire prompt and paste it to Cursor Agent:

---

**Create comprehensive API Flow & Database Relationships documentation for this project, similar to the structure in `https://github.com/wetechforu23/MarketingBy_web_app_react/blob/dev/API_DATABASE_FLOW_DIAGRAM.md`**

**Requirements:**

1. **System Architecture Overview**
   - Analyze all frontend components, API routes, services, and database connections
   - Create a Mermaid flowchart showing:
     - Frontend Layer (UI components, pages, widgets)
     - API Layer (all REST/GraphQL endpoints organized by feature)
     - Service Layer (business logic services)
     - Database Layer (PostgreSQL/MySQL/MongoDB/etc)
     - External Services (third-party APIs, webhooks, integrations)
   - Show data flow with arrows connecting layers

2. **Database Schema Relationships**
   - Analyze all database tables from migration files, schema files, or models
   - Create a Mermaid ER diagram showing:
     - All tables with key columns
     - Primary keys (PK), Foreign keys (FK), Unique keys (UK)
     - Data types for important columns
     - Relationships between tables (one-to-many, many-to-many, etc.)
   - Include indexes and constraints if relevant

3. **API Endpoints Map**
   - Scan all route files and document:
     - HTTP method (GET, POST, PUT, DELETE, PATCH)
     - Endpoint path
     - Request body structure (if any)
     - Response format
     - Authentication requirements (public, auth required, role-based)
     - Organize by feature/module (Auth, Users, Data, etc.)

4. **Data Flow Examples**
   - Create Mermaid sequence diagrams for key flows:
     - User registration/login
     - Data creation/update
     - External API integrations
     - Webhook handling
   - Show: User → Frontend → API → Service → Database → External Service

5. **Feature Version History**
   - Document major features with:
     - Version number and date
     - Feature description
     - Database migrations (if any)
     - Breaking changes
     - Rollback procedures

6. **Additional Sections** (if applicable):
   - Security & Credential Management
   - API Quota Tracking
   - Deployment Procedures
   - Environment Configuration

**Format:**
- Create a file named `API_DATABASE_FLOW_DIAGRAM.md` in the project root
- Use Mermaid syntax for all diagrams (GitHub renders these automatically)
- Include clear section headers with emojis for visual organization
- Add code examples for API requests/responses where helpful
- Document any special patterns, conventions, or architectural decisions

**Mermaid Syntax Reference:**
- Flowchart: `graph TB` (top-bottom) or `graph LR` (left-right)
- ER Diagram: `erDiagram` with `TABLE { columns }` and `TABLE1 ||--o{ TABLE2 : "relationship"`
- Sequence: `sequenceDiagram` with `participant` and `->>` arrows

**Output:**
Generate a complete, production-ready documentation file that serves as the single source of truth for the project's architecture, API structure, and database schema.

---

