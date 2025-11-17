# 🎨 Mermaid Diagram Quick Reference

## 📊 Diagram Types Used in API_DATABASE_FLOW_DIAGRAM.md

### 1. Flowchart (System Architecture)
**Syntax:**
```mermaid
graph TB
    A[Node A] --> B[Node B]
    B --> C[Node C]
```

**Used for:**
- System architecture
- Data flow
- Process flows
- Component relationships

### 2. ER Diagram (Database Schema)
**Syntax:**
```mermaid
erDiagram
    TABLE1 {
        int id PK
        string name
        int foreign_id FK
    }
    
    TABLE2 {
        int id PK
        string title
    }
    
    TABLE1 ||--o{ TABLE2 : "relationship"
```

**Used for:**
- Database schema
- Table relationships
- Entity relationships

### 3. Sequence Diagram (API Flows)
**Syntax:**
```mermaid
sequenceDiagram
    participant A
    participant B
    A->>B: Request
    B-->>A: Response
```

**Used for:**
- API request/response flows
- User interactions
- Service communications

---

## 🔧 Common Patterns from Your Documentation

### Pattern 1: Multi-Layer Architecture
```mermaid
graph TB
    subgraph "Layer 1"
        A1[Component A1]
        A2[Component A2]
    end
    
    subgraph "Layer 2"
        B1[Component B1]
        B2[Component B2]
    end
    
    A1 --> B1
    A2 --> B2
```

### Pattern 2: Database Relationships
```mermaid
erDiagram
    PARENT {
        int id PK
        string name
    }
    
    CHILD {
        int id PK
        int parent_id FK
        string value
    }
    
    PARENT ||--o{ CHILD : "has many"
```

### Pattern 3: External Service Integration
```mermaid
graph LR
    App[Your App] --> API[Your API]
    API --> Service[Your Service]
    Service --> External[External API]
    External --> Service
    Service --> DB[(Database)]
```

---

## 🎯 How to Create Similar Documentation

### Step 1: Analyze Your Code
```bash
# Find all routes
grep -r "router\." . --include="*.ts" --include="*.js"

# Find all services
find . -name "*service*.ts" -o -name "*service*.js"

# Find database tables
find . -name "*.sql" | xargs grep "CREATE TABLE"
```

### Step 2: Create the Flowchart
1. List all frontend components
2. List all API endpoints
3. List all services
4. List database tables
5. List external services
6. Connect them with arrows

### Step 3: Create the ER Diagram
1. List all tables
2. For each table, list:
   - Primary key (PK)
   - Foreign keys (FK)
   - Unique keys (UK)
   - Important columns
3. Show relationships between tables

### Step 4: Document API Endpoints
Organize by feature:
- Authentication
- User Management
- Data Operations
- etc.

---

## 💡 Pro Tips

1. **Use Subgraphs** to group related components
2. **Use Descriptive Names** for nodes
3. **Show Direction** with arrows (--> for one-way, <--> for bidirectional)
4. **Add Styling** for important nodes
5. **Keep It Simple** - don't overcrowd diagrams
6. **Update Regularly** - keep docs in sync with code

---

## 🔗 Resources

- **Mermaid Live Editor**: https://mermaid.live/ (test your diagrams here)
- **Mermaid Docs**: https://mermaid.js.org/
- **GitHub Support**: Mermaid works natively in GitHub markdown files

