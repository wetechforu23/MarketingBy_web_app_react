import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/http';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  ConnectionMode,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom Node Component for Database Tables
const TableNode = ({ data, selected }: any) => {
  const isHighlighted = data.highlighted || selected;
  return (
    <div style={{
      background: data.color || '#e3f2fd',
      border: isHighlighted ? `3px solid #ff5722` : `2px solid ${data.borderColor || '#2E86AB'}`,
      borderRadius: '8px',
      padding: '12px',
      minWidth: '220px',
      maxWidth: '280px',
      boxShadow: isHighlighted 
        ? '0 4px 12px rgba(255, 87, 34, 0.4)' 
        : '0 2px 8px rgba(0,0,0,0.1)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      cursor: 'move',
      transition: 'all 0.2s ease',
      transform: isHighlighted ? 'scale(1.02)' : 'scale(1)'
    }}>
      <div style={{
        fontWeight: 'bold',
        fontSize: '14px',
        marginBottom: '8px',
        color: data.borderColor || '#1976d2',
        borderBottom: `1px solid ${data.borderColor || '#1976d2'}`,
        paddingBottom: '4px'
      }}>
        {data.label}
      </div>
      <div style={{ fontSize: '11px', color: '#333', lineHeight: '1.5' }}>
        {data.columns?.slice(0, 6).map((col: any, idx: number) => (
          <div key={idx} style={{ marginBottom: '3px', padding: '2px 0' }}>
            <span style={{ fontWeight: '600', color: '#2c3e50' }}>
              {col.pk && '🔑 '}
              {col.uk && !col.pk && '✨ '}
              {col.fk && '🔗 '}
              {col.name}
            </span>
            <span style={{ color: '#666', marginLeft: '6px', fontSize: '10px', fontFamily: 'monospace' }}>
              ({col.type})
            </span>
          </div>
        ))}
        {data.columns?.length > 6 && (
          <div style={{ color: '#999', fontStyle: 'italic', marginTop: '4px', fontSize: '10px' }}>
            +{data.columns.length - 6} more columns...
          </div>
        )}
      </div>
      {data.description && (
        <div style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #e0e0e0',
          fontSize: '10px',
          color: '#666',
          fontStyle: 'italic'
        }}>
          {data.description}
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
};

export default function SystemArchitecture() {
  const [activeTab, setActiveTab] = useState<'erd' | 'dictionary' | 'apis' | 'flow' | 'swagger'>('erd');
  const [schemaData, setSchemaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Store original nodes/edges for filtering
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);

  // Color scheme for different table types
  const tableColors: { [key: string]: { bg: string; border: string } } = {
    core: { bg: '#e3f2fd', border: '#2E86AB' },
    widget: { bg: '#fff3e0', border: '#ff9800' },
    conversation: { bg: '#f3e5f5', border: '#9c27b0' },
    message: { bg: '#e8f5e9', border: '#4caf50' },
    credential: { bg: '#ffebee', border: '#f44336' },
    usage: { bg: '#e0f2f1', border: '#009688' },
    lead: { bg: '#fff9c4', border: '#fbc02d' },
    seo: { bg: '#e1f5fe', border: '#00acc1' },
  };

  const getTableCategory = (tableName: string): string => {
    const name = tableName.toLowerCase();
    if (name.includes('user') || name.includes('client')) return 'core';
    if (name.includes('widget') && name.includes('conversation')) return 'conversation';
    if (name.includes('widget') && name.includes('message')) return 'message';
    if (name.includes('widget')) return 'widget';
    if (name.includes('credential')) return 'credential';
    if (name.includes('whatsapp') || name.includes('llm') || name.includes('usage')) return 'usage';
    if (name.includes('lead')) return 'lead';
    if (name.includes('seo')) return 'seo';
    return 'core';
  };

  const fetchSchema = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await api.get('/system/schema');
      setSchemaData(response.data);
      
      // Generate nodes and edges from schema
      generateERD(response.data.tables);
    } catch (err: any) {
      console.error('Failed to fetch schema:', err);
      setError(err.response?.data?.error || 'Failed to fetch database schema');
      // Fallback to static data if available
      if (!schemaData) {
        generateERD(staticTables as any);
        setLoading(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchema();
  }, []);

  const generateERD = (tables: any[]) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodeMap: { [key: string]: Node } = {};

    // Calculate positions in a grid layout
    const cols = Math.ceil(Math.sqrt(tables.length));
    let row = 0, col = 0;
    const spacingX = 300;
    const spacingY = 250;

    tables.forEach((table, index) => {
      const category = getTableCategory(table.name);
      const colors = tableColors[category] || tableColors.core;
      
      const nodeId = table.name;
      const position = { x: col * spacingX + 50, y: row * spacingY + 50 };

      // Get columns for display
      const displayColumns = (table.columns || []).map((col: any) => ({
        name: col.name,
        type: col.type || col.data_type || 'unknown',
        pk: col.pk || false,
        uk: col.uk || false,
        fk: col.fk || null
      })).slice(0, 8);

      const node: Node = {
        id: nodeId,
        type: 'tableNode',
        position,
        data: {
          label: table.name.toUpperCase().replace(/_/g, ' '),
          columns: displayColumns,
          color: colors.bg,
          borderColor: colors.border,
          fullColumns: table.columns || [],
          description: table.description
        },
        draggable: true,
      };

      newNodes.push(node);
      nodeMap[nodeId] = node;

      // Move to next position
      col++;
      if (col >= cols) {
        col = 0;
        row++;
      }
    });

    // Generate edges from foreign keys
    tables.forEach((table) => {
      (table.columns || []).forEach((col: any) => {
        if (col.fk) {
          // Handle different FK formats
          let sourceTable: string;
          let targetTable: string = table.name;
          let fkColumnName: string = col.name;
          let referencedColumn: string = '';
          
          if (typeof col.fk === 'string') {
            // Format: "table.column" or just "table"
            const parts = col.fk.split('.');
            sourceTable = parts[0];
            if (parts.length > 1) {
              referencedColumn = parts[1];
            }
          } else if (col.fk && typeof col.fk === 'object' && col.fk.table) {
            // Backend format: { table: "referenced_table", column: "referenced_column" }
            sourceTable = col.fk.table;
            if (col.fk.column) {
              referencedColumn = col.fk.column;
            }
          } else {
            return; // Skip if FK format is invalid
          }
          
          const sourceId = sourceTable;
          const targetId = targetTable;

          // Only create edge if both tables exist
          if (nodeMap[sourceId] && nodeMap[targetId] && sourceId !== targetId) {
            // Create unique edge ID
            const edgeId = `e${sourceId}-${targetId}-${col.name}`;
            
            // Check if edge already exists (avoid duplicates)
            if (!newEdges.find(e => e.id === edgeId)) {
              // Build label: FK column name, optionally showing referenced column
              const edgeLabel = referencedColumn 
                ? `${col.name} → ${referencedColumn}`
                : col.name;
              
              const edge: Edge = {
                id: edgeId,
                source: sourceId,
                target: targetId,
                label: edgeLabel,
                type: 'smoothstep',
                animated: false,
                style: { 
                  stroke: '#2E86AB', 
                  strokeWidth: 3,
                },
                markerEnd: {
                  type: 'arrowclosed',
                  color: '#2E86AB',
                  width: 24,
                  height: 24,
                },
                labelStyle: { 
                  fontSize: '12px', 
                  fontWeight: '700',
                  fill: '#155a8a',
                  background: 'white',
                  padding: '4px 8px',
                  border: '1px solid #2E86AB',
                  borderRadius: '4px',
                },
                labelBgStyle: {
                  fill: 'white',
                  fillOpacity: 0.95,
                },
              };

              newEdges.push(edge);
            }
          }
        }
      });
    });

    // Store all nodes and edges for filtering
    setAllNodes(newNodes);
    setAllEdges(newEdges);
    
    // Apply initial filter if search query exists
    if (searchQuery) {
      filterERD(searchQuery, newNodes, newEdges);
    } else {
      setNodes(newNodes);
      setEdges(newEdges);
    }
  };
  
  // Filter ERD based on search query - show only connected tables
  const filterERD = (query: string, nodesToFilter: Node[] = allNodes, edgesToFilter: Edge[] = allEdges) => {
    if (!query.trim()) {
      setNodes(allNodes);
      setEdges(allEdges);
      return;
    }
    
    const queryLower = query.toLowerCase().trim();
    
    // Find matching nodes (tables that match search)
    const matchingNodeIds = new Set<string>();
    nodesToFilter.forEach(node => {
      const tableName = (node.data?.label || node.id || '').toLowerCase();
      const tableNameClean = tableName.replace(/\s+/g, '_'); // Also match underscore format
      if (tableName.includes(queryLower) || tableNameClean.includes(queryLower) || node.id.toLowerCase().includes(queryLower)) {
        matchingNodeIds.add(node.id);
      }
    });
    
    if (matchingNodeIds.size === 0) {
      // No matches - show empty
      setNodes([]);
      setEdges([]);
      return;
    }
    
    // Find all connected nodes (via edges) - BFS traversal
    const connectedNodeIds = new Set<string>(matchingNodeIds);
    const queue = Array.from(matchingNodeIds);
    const visited = new Set<string>(matchingNodeIds);
    
    // BFS to find all connected tables
    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      
      // Find all edges connected to this node
      edgesToFilter.forEach(edge => {
        // Check if edge connects to current node
        if (edge.source === currentNodeId && !visited.has(edge.target)) {
          connectedNodeIds.add(edge.target);
          visited.add(edge.target);
          queue.push(edge.target);
        }
        if (edge.target === currentNodeId && !visited.has(edge.source)) {
          connectedNodeIds.add(edge.source);
          visited.add(edge.source);
          queue.push(edge.source);
        }
      });
    }
    
    // Filter nodes to only connected ones
    const filteredNodes = nodesToFilter.filter(node => connectedNodeIds.has(node.id));
    
    // Filter edges to only those between filtered nodes
    const filteredEdges = edgesToFilter.filter(edge => 
      connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target)
    );
    
    // Highlight matching nodes (search results get orange border via TableNode component)
    const highlightedNodes = filteredNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        highlighted: matchingNodeIds.has(node.id) // TableNode will use this to show orange border
      }
    }));
    
    setNodes(highlightedNodes);
    setEdges(filteredEdges);
  };
  
  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterERD(query);
  };

  // Core Database Tables with relationships (fallback static data)
  const staticTables = [
    {
      name: 'users',
      description: 'System users with role-based access control',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'email', type: 'VARCHAR(255)', uk: true, description: 'Unique email address' },
        { name: 'password_hash', type: 'VARCHAR(255)', description: 'Encrypted password' },
        { name: 'role', type: 'VARCHAR(50)', description: 'User role' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Associated client' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Account creation date' }
      ]
    },
    {
      name: 'clients',
      description: 'Client organizations',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_name', type: 'VARCHAR(255)', description: 'Client company name' },
        { name: 'email', type: 'VARCHAR(255)', uk: true, description: 'Primary contact email' },
        { name: 'status', type: 'VARCHAR(50)', description: 'Client status' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Registration date' }
      ]
    },
    {
      name: 'widget_configs',
      description: 'Chat widget configurations',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Owning client' },
        { name: 'widget_key', type: 'VARCHAR(255)', uk: true, description: 'Unique widget identifier' },
        { name: 'widget_name', type: 'VARCHAR(255)', description: 'Widget display name' },
        { name: 'is_active', type: 'BOOLEAN', description: 'Widget active status' }
      ]
    },
    {
      name: 'widget_conversations',
      description: 'Chat widget conversation sessions',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Associated widget' },
        { name: 'visitor_session_id', type: 'VARCHAR(255)', description: 'Persistent visitor ID' },
        { name: 'status', type: 'VARCHAR(50)', description: 'Conversation status' },
        { name: 'message_count', type: 'INTEGER', description: 'Total messages' }
      ]
    },
    {
      name: 'widget_messages',
      description: 'Individual messages in conversations',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'conversation_id', type: 'INTEGER', fk: 'widget_conversations.id', description: 'Parent conversation' },
        { name: 'message_type', type: 'VARCHAR(50)', description: 'Message type' },
        { name: 'message_text', type: 'TEXT', description: 'Message content' }
      ]
    },
    {
      name: 'encrypted_credentials',
      description: 'Securely stored API keys',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'service_name', type: 'VARCHAR(255)', description: 'Service identifier' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client-specific credential' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget-specific credential' },
        { name: 'encrypted_value', type: 'TEXT', description: 'AES-256 encrypted value' }
      ]
    },
    {
      name: 'whatsapp_messages',
      description: 'WhatsApp message tracking',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client owner' },
        { name: 'conversation_id', type: 'INTEGER', fk: 'widget_conversations.id', description: 'Associated conversation' },
        { name: 'twilio_price', type: 'DECIMAL(10,4)', description: 'Actual Twilio charge' }
      ]
    },
    {
      name: 'whatsapp_usage',
      description: 'WhatsApp usage statistics',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client owner' },
        { name: 'messages_sent_this_month', type: 'INTEGER', description: 'Messages sent this month' },
        { name: 'actual_cost_this_month', type: 'DECIMAL(10,4)', description: 'Actual cost this month' }
      ]
    },
    {
      name: 'client_llm_usage',
      description: 'LLM usage tracking',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client owner' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget source' },
        { name: 'tokens_used_this_month', type: 'BIGINT', description: 'Tokens used this month' }
      ]
    },
    {
      name: 'handover_requests',
      description: 'Agent handover requests',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'conversation_id', type: 'INTEGER', fk: 'widget_conversations.id', description: 'Source conversation' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget source' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client owner' },
        { name: 'requested_method', type: 'VARCHAR(50)', description: 'Handover method' }
      ]
    },
    {
      name: 'widget_visitor_sessions',
      description: 'Visitor session tracking',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget source' },
        { name: 'session_id', type: 'VARCHAR(100)', uk: true, description: 'Unique session identifier' },
        { name: 'conversation_id', type: 'INTEGER', fk: 'widget_conversations.id', description: 'Associated conversation' }
      ]
    },
    {
      name: 'widget_knowledge_base',
      description: 'Chat widget knowledge base',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget owner' },
        { name: 'question', type: 'TEXT', description: 'Question text' },
        { name: 'answer', type: 'TEXT', description: 'Answer text' }
      ]
    },
    {
      name: 'leads',
      description: 'Sales leads and prospects',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Associated client' },
        { name: 'name', type: 'VARCHAR(255)', description: 'Lead name' },
        { name: 'email', type: 'VARCHAR(255)', description: 'Lead email' },
        { name: 'status', type: 'VARCHAR(50)', description: 'Lead status' }
      ]
    }
  ];

  // Use static tables if schema fetch failed
  useEffect(() => {
    if (!schemaData && !loading && !refreshing) {
      generateERD(staticTables as any);
    }
  }, [schemaData, loading, refreshing]);

  // API Endpoints
  const apiEndpoints = [
    {
      category: 'Authentication',
      endpoints: [
        { method: 'POST', path: '/api/auth/login', description: 'User login', auth: false },
        { method: 'POST', path: '/api/auth/logout', description: 'User logout', auth: true },
        { method: 'GET', path: '/api/auth/me', description: 'Get current user', auth: true }
      ]
    },
    {
      category: 'Chat Widget (Public)',
      endpoints: [
        { method: 'GET', path: '/api/chat-widget/public/widget/:widgetKey/config', description: 'Get widget configuration', auth: false },
        { method: 'POST', path: '/api/chat-widget/public/widget/:widgetKey/message', description: 'Send message', auth: false },
        { method: 'GET', path: '/api/chat-widget/public/widget/:widgetKey/conversation/by-visitor/:visitorSessionId', description: 'Find conversation by visitor ID', auth: false }
      ]
    },
    {
      category: 'Chat Widget (Admin)',
      endpoints: [
        { method: 'GET', path: '/api/chat-widget/widgets', description: 'List widgets', auth: true },
        { method: 'GET', path: '/api/chat-widget/widgets/:id', description: 'Get widget details', auth: true },
        { method: 'PUT', path: '/api/chat-widget/widgets/:id', description: 'Update widget', auth: true },
        { method: 'GET', path: '/api/chat-widget/widgets/:id/conversations', description: 'List conversations', auth: true }
      ]
    },
    {
      category: 'WhatsApp',
      endpoints: [
        { method: 'POST', path: '/api/whatsapp/incoming', description: 'Twilio webhook for incoming messages', auth: false },
        { method: 'GET', path: '/api/whatsapp/settings/:clientId', description: 'Get WhatsApp settings', auth: true },
        { method: 'POST', path: '/api/whatsapp/settings', description: 'Save WhatsApp settings', auth: true }
      ]
    },
    {
      category: 'Agent Handover',
      endpoints: [
        { method: 'POST', path: '/api/handover/request', description: 'Request agent handover', auth: false },
        { method: 'GET', path: '/api/handover/config/:widgetKey', description: 'Get handover configuration', auth: false }
      ]
    },
    {
      category: 'Credentials',
      endpoints: [
        { method: 'GET', path: '/api/credentials', description: 'List credentials', auth: true },
        { method: 'POST', path: '/api/credentials', description: 'Create credential', auth: true },
        { method: 'PUT', path: '/api/credentials/:id', description: 'Update credential', auth: true }
      ]
    },
    {
      category: 'System',
      endpoints: [
        { method: 'GET', path: '/api/system/schema', description: 'Get database schema (Super Admin only)', auth: true }
      ]
    }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0', color: '#333', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="fas fa-sitemap" style={{ fontSize: '2rem', color: '#2E86AB' }}></i>
            System Architecture & Database
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '1rem' }}>
            Interactive ERD diagram, data dictionary, and API documentation
          </p>
        </div>
        {activeTab === 'erd' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsFullscreen(true)}
              style={{
                padding: '12px 24px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-expand"></i>
              Fullscreen
            </button>
            <button
              onClick={fetchSchema}
              disabled={refreshing}
              style={{
                padding: '12px 24px',
                background: refreshing ? '#ccc' : '#2E86AB',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <i className={`fas ${refreshing ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
              {refreshing ? 'Refreshing...' : 'Refresh Schema'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '2rem',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'erd', label: 'ERD Diagram', icon: '🔗' },
          { id: 'dictionary', label: 'Data Dictionary', icon: '📚' },
          { id: 'apis', label: 'API Endpoints', icon: '🔌' },
          { id: 'flow', label: 'Architecture Flow', icon: '🔄' },
          { id: 'swagger', label: 'API Tester (Swagger)', icon: '🧪' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.id ? '#2E86AB' : '#f5f5f5',
              color: activeTab === tab.id ? 'white' : '#333',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minHeight: '600px' }}>
        {/* ERD Diagram Tab */}
        {activeTab === 'erd' && (
          <div style={{ height: '800px', width: '100%', position: 'relative' }}>
            {/* Search Bar */}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 10,
              width: '300px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-search" style={{ color: '#666' }}></i>
              <input
                type="text"
                placeholder="Search table (shows connected tables)..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  border: 'none',
                  outline: 'none',
                  flex: 1,
                  fontSize: '14px',
                  color: '#333'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setNodes(allNodes);
                    setEdges(allEdges);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '4px'
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            
            {error && (
              <div style={{
                padding: '1rem',
                background: '#fee',
                border: '2px solid #c33',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: '#c33'
              }}>
                ⚠️ {error} (Using static data)
              </div>
            )}
            {schemaData?.fetchedAt && (
              <div style={{
                padding: '0.5rem 1rem',
                background: '#e8f5e9',
                border: '1px solid #4caf50',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '13px',
                color: '#2e7d32'
              }}>
                ✅ Schema loaded at {new Date(schemaData.fetchedAt).toLocaleString()}
              </div>
            )}
            {searchQuery && (
              <div style={{
                padding: '0.5rem 1rem',
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '13px',
                color: '#856404'
              }}>
                🔍 Showing {nodes.length} connected table{nodes.length !== 1 ? 's' : ''} for "{searchQuery}"
              </div>
            )}
            {loading && !schemaData ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #2E86AB',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                  }} />
                  <p style={{ textAlign: 'center', color: '#666' }}>Loading database schema...</p>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
                attributionPosition="bottom-left"
                minZoom={0.2}
                maxZoom={2}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  animated: false,
                  style: { 
                    stroke: '#2E86AB', 
                    strokeWidth: 3,
                  },
                  markerEnd: {
                    type: 'arrowclosed',
                    color: '#2E86AB',
                    width: 24,
                    height: 24,
                  },
                  labelStyle: { 
                    fontSize: '12px', 
                    fontWeight: '700',
                    fill: '#155a8a',
                    background: 'white',
                    padding: '4px 8px',
                    border: '1px solid #2E86AB',
                    borderRadius: '4px',
                  },
                  labelBgStyle: {
                    fill: 'white',
                    fillOpacity: 0.95,
                  },
                }}
              >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                <Controls showInteractive={false} />
                <MiniMap
                  nodeColor={(node) => {
                    const category = getTableCategory(node.data?.label || '');
                    return tableColors[category]?.border || '#2E86AB';
                  }}
                  style={{ backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0' }}
                  maskColor="rgba(0, 0, 0, 0.05)"
                />
              </ReactFlow>
            )}
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f9f9f9',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              <strong>💡 Tips:</strong> Drag nodes to rearrange • Use mouse wheel to zoom • Use controls in bottom-left corner • Use minimap for navigation • Click refresh to get latest schema from database
            </div>
          </div>
        )}

        {/* Data Dictionary Tab */}
        {activeTab === 'dictionary' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>
              📚 Data Dictionary
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Complete table definitions with columns, data types, and relationships
            </p>
            
            {(schemaData?.tables || staticTables).map((table: any, idx: number) => (
              <div key={idx} style={{
                marginBottom: '2rem',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #2E86AB 0%, #1e5a7a 100%)',
                  padding: '1rem',
                  color: 'white'
                }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-table"></i>
                    {table.name.toUpperCase()}
                  </h3>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                    {table.description || 'No description available'}
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Column Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Data Type</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Constraints</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(table.columns || []).map((col: any, colIdx: number) => (
                        <tr key={colIdx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0' }}>
                            <strong>{col.name}</strong>
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0', fontFamily: 'monospace', fontSize: '13px' }}>
                            {col.type || col.data_type || 'unknown'}
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0' }}>
                            {col.pk && <span style={{ background: '#4caf50', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>PK</span>}
                            {col.uk && <span style={{ background: '#2196f3', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>UK</span>}
                            {col.fk && <span style={{ background: '#ff9800', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>FK: {typeof col.fk === 'string' ? col.fk : col.fk?.table || 'N/A'}</span>}
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0', color: '#666', fontSize: '13px' }}>
                            {col.description || 'No description'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API Endpoints Tab */}
        {activeTab === 'apis' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>
              🔌 API Endpoints
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Complete REST API documentation with methods, paths, and descriptions
            </p>
            
            {apiEndpoints.map((category, idx) => (
              <div key={idx} style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px 8px 0 0',
                  margin: 0
                }}>
                  {category.category}
                </h3>
                <div style={{ border: '1px solid #e0e0e0', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600', width: '100px' }}>Method</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Path</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Description</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600', width: '100px' }}>Auth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.endpoints.map((endpoint, epIdx) => (
                        <tr key={epIdx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0' }}>
                            <span style={{
                              background: endpoint.method === 'GET' ? '#4caf50' : 
                                        endpoint.method === 'POST' ? '#2196f3' :
                                        endpoint.method === 'PUT' ? '#ff9800' :
                                        endpoint.method === 'DELETE' ? '#f44336' : '#9e9e9e',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {endpoint.method}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0', fontFamily: 'monospace', fontSize: '13px' }}>
                            {endpoint.path}
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0', color: '#666' }}>
                            {endpoint.description}
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                            {endpoint.auth ? (
                              <span style={{ color: '#f44336', fontSize: '12px' }}>🔒 Required</span>
                            ) : (
                              <span style={{ color: '#4caf50', fontSize: '12px' }}>🌐 Public</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Architecture Flow Tab */}
        {activeTab === 'flow' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>
              🔄 System Architecture Flow
            </h2>
            <div style={{
              background: '#f9f9f9',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#2E86AB', marginBottom: '1rem' }}>Frontend Layer</h3>
                <div style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '2px solid #2E86AB',
                  marginBottom: '1rem'
                }}>
                  <strong>React Application (Netlify)</strong>
                  <ul style={{ marginTop: '0.5rem', color: '#666' }}>
                    <li>User Interface Components</li>
                    <li>Chat Widget (Embedded on client websites)</li>
                    <li>Admin Dashboard</li>
                    <li>Client Portal</li>
                  </ul>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#ff9800', marginBottom: '1rem' }}>API Layer (Express.js - Heroku)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  {['Authentication', 'Chat Widget', 'WhatsApp', 'Agent Handover', 'Credentials', 'Leads', 'Admin'].map(api => (
                    <div key={api} style={{
                      background: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '2px solid #ff9800'
                    }}>
                      <strong>{api} API</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#4caf50', marginBottom: '1rem' }}>Service Layer</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {['ConversationFlowService', 'HandoverService', 'WhatsAppService', 'LLMService', 'EmailService', 'ConversationInactivityService'].map(svc => (
                    <div key={svc} style={{
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #4caf50',
                      fontSize: '13px'
                    }}>
                      {svc}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#9c27b0', marginBottom: '1rem' }}>Database Layer (PostgreSQL - Heroku)</h3>
                <div style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '2px solid #9c27b0'
                }}>
                  <strong>Heroku PostgreSQL Database</strong>
                  <ul style={{ marginTop: '0.5rem', color: '#666' }}>
                    <li>All tables defined in Data Dictionary</li>
                    <li>AES-256 encrypted credentials storage</li>
                    <li>Session and conversation tracking</li>
                    <li>Usage and billing analytics</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 style={{ color: '#f44336', marginBottom: '1rem' }}>External Services</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {['Twilio (WhatsApp)', 'Google AI (Gemini)', 'Email Service', 'Stripe'].map(ext => (
                    <div key={ext} style={{
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #f44336',
                      fontSize: '13px'
                    }}>
                      {ext}
                    </div>
                  ))}
                </div>
              </div>

              {/* Flow Diagram */}
              <div style={{ marginTop: '3rem', padding: '2rem', background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Chat Widget Flow</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '8px', textAlign: 'center', minWidth: '150px' }}>
                    <strong>Visitor Opens Widget</strong>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: '#2E86AB', fontSize: '1.5rem' }}></i>
                  <div style={{ padding: '1rem', background: '#fff3e0', borderRadius: '8px', textAlign: 'center', minWidth: '150px' }}>
                    <strong>Welcome Message</strong>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: '#2E86AB', fontSize: '1.5rem' }}></i>
                  <div style={{ padding: '1rem', background: '#f3e5f5', borderRadius: '8px', textAlign: 'center', minWidth: '150px' }}>
                    <strong>Intro Form</strong>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: '#2E86AB', fontSize: '1.5rem' }}></i>
                  <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center', minWidth: '150px' }}>
                    <strong>Knowledge Base</strong>
                    <br />
                    <small>↓</small>
                    <br />
                    <small>AI Response</small>
                    <br />
                    <small>↓</small>
                    <br />
                    <small>Agent Handover</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Swagger API Tester Tab */}
        {activeTab === 'swagger' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>
              🧪 API Tester (Swagger UI)
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Interactive API documentation and testing interface. Test endpoints directly from the browser.
            </p>
            <div style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden',
              height: '800px',
              position: 'relative'
            }}>
              <iframe
                src={`${window.location.protocol === 'https:' 
                  ? 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com' 
                  : 'http://localhost:3001'}/api-docs`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title="Swagger API Documentation"
                allow="fullscreen"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              />
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 10
              }}>
                <a
                  href={`${window.location.protocol === 'https:' 
                    ? 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com' 
                    : 'http://localhost:3001'}/api-docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    background: '#2E86AB',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-external-link-alt"></i>
                  Open in New Window
                </a>
              </div>
            </div>
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#fff3cd',
              border: '2px solid #ffc107',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#856404',
              marginBottom: '1rem'
            }}>
              <strong>🔐 How to Authenticate in Swagger:</strong>
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#e3f2fd', borderRadius: '6px', borderLeft: '4px solid #2196f3' }}>
                  <strong style={{ color: '#1976d2' }}>Method 1: Open in New Window (Easiest)</strong>
                  <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: '1.8', fontSize: '12px' }}>
                    <li>Click the <strong>"Open in New Window"</strong> button above (top right of iframe)</li>
                    <li>This opens Swagger UI in a new tab from the same origin</li>
                    <li>Your session cookies are automatically included!</li>
                    <li>You can test APIs immediately without manual authorization</li>
                  </ol>
                </div>
                <div style={{ padding: '0.75rem', background: '#fff9e6', borderRadius: '6px', borderLeft: '4px solid #ff9800' }}>
                  <strong style={{ color: '#f57c00' }}>Method 2: Manual Cookie Authorization</strong>
                  <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: '1.8', fontSize: '12px' }}>
                    <li>Make sure you're logged in to MarketingBy in the same browser</li>
                    <li>Open DevTools (Press <strong>F12</strong> or Right-click → Inspect)</li>
                    <li>Go to <strong>Application</strong> tab → <strong>Cookies</strong> → Your domain</li>
                    <li>Find the session cookie (name: <strong>connect.sid</strong> or <strong>marketingby.sid</strong>)</li>
                    <li>Copy the entire <strong>Value</strong> (it's a long string starting with something like <code>s%3A...</code>)</li>
                    <li>In Swagger UI, click the <strong>🔒 Authorize</strong> button (top right)</li>
                    <li>In the modal under "cookieAuth", paste the cookie value into the <strong>"Value"</strong> field</li>
                    <li>Click <strong>Authorize</strong> and then <strong>Close</strong></li>
                    <li>Now you can test authenticated endpoints!</li>
                  </ol>
                </div>
              </div>
              <p style={{ marginTop: '1rem', marginBottom: 0, fontStyle: 'italic', fontSize: '12px' }}>
                <strong>💡 Pro Tip:</strong> If you see the Swagger UI in an iframe, click "Open in New Window" for the best experience - cookies work automatically!
              </p>
            </div>
            <div style={{
              padding: '1rem',
              background: '#f9f9f9',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              <strong>💡 Additional Tips:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>Click "Try it out" on any endpoint to test it</li>
                <li>Enter required parameters and click "Execute"</li>
                <li>View response body, headers, and status codes</li>
                <li>All endpoints require authentication except public ones</li>
                <li>Session cookies are automatically included when opened in new window</li>
              </ul>
            </div>
          </div>
        )}
      </div>
      
      {/* Fullscreen Modal - Covers Entire Browser Viewport */}
      {isFullscreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'white',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          padding: 0,
          overflow: 'hidden'
        }}>
          {/* Fullscreen Header */}
          <div style={{
            padding: '1rem 2rem',
            background: '#2E86AB',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fas fa-sitemap"></i>
                ERD Diagram - Fullscreen View
              </h2>
              {searchQuery && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                  Showing {nodes.length} connected table{nodes.length !== 1 ? 's' : ''} for "{searchQuery}"
                </p>
              )}
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
            >
              <i className="fas fa-times"></i>
              Close Fullscreen
            </button>
          </div>
          
          {/* Fullscreen ERD Content */}
          <div style={{ 
            flex: 1, 
            position: 'relative', 
            overflow: 'hidden',
            width: '100%',
            height: 'calc(100vh - 80px)' // Full viewport minus header
          }}>
            {/* Search Bar in Fullscreen */}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 10,
              width: '350px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fas fa-search" style={{ color: '#666' }}></i>
              <input
                type="text"
                placeholder="Search table (shows connected tables)..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  border: 'none',
                  outline: 'none',
                  flex: 1,
                  fontSize: '15px',
                  color: '#333'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setNodes(allNodes);
                    setEdges(allEdges);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '4px'
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            
            <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
                attributionPosition="bottom-left"
                minZoom={0.1}
                maxZoom={3}
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: false,
                style: { 
                  stroke: '#2E86AB', 
                  strokeWidth: 3,
                },
                markerEnd: {
                  type: 'arrowclosed',
                  color: '#2E86AB',
                  width: 24,
                  height: 24,
                },
                labelStyle: { 
                  fontSize: '12px', 
                  fontWeight: '700',
                  fill: '#155a8a',
                  background: 'white',
                  padding: '4px 8px',
                  border: '1px solid #2E86AB',
                  borderRadius: '4px',
                },
                labelBgStyle: {
                  fill: 'white',
                  fillOpacity: 0.95,
                },
              }}
            >
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={(node) => {
                  const category = getTableCategory(node.data?.label || '');
                  return tableColors[category]?.border || '#2E86AB';
                }}
                style={{ backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0' }}
                maskColor="rgba(0, 0, 0, 0.05)"
              />
              </ReactFlow>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
