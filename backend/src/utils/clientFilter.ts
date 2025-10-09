import { Request } from 'express';

/**
 * Get client filter SQL clause based on user's role and client_id
 * 
 * @param req Express request object with session
 * @param tableAlias Optional table alias (e.g., 'l' for leads)
 * @returns Object with SQL where clause and parameters
 */
export function getClientFilter(req: Request, tableAlias?: string): { whereClause: string; params: any[] } {
  const role = req.session.role;
  const clientId = req.session.clientId;
  const prefix = tableAlias ? `${tableAlias}.` : '';

  // Super admin sees ALL data
  if (role === 'super_admin') {
    return { whereClause: '', params: [] };
  }

  // Admin/customer/client_user see only their client's data
  if (clientId) {
    return { 
      whereClause: `${prefix}client_id = $1`, 
      params: [clientId] 
    };
  }

  // If admin but no client_id (legacy WeTechForU admin), see all
  if (role === 'admin' && !clientId) {
    return { whereClause: '', params: [] };
  }

  // Default: no access
  return { whereClause: '1=0', params: [] };
}

/**
 * Check if user has access to a specific client
 * 
 * @param req Express request object with session
 * @param targetClientId The client ID to check access for
 * @returns boolean indicating if user has access
 */
export function hasClientAccess(req: Request, targetClientId: number): boolean {
  const role = req.session.role;
  const clientId = req.session.clientId;

  // Super admin has access to all clients
  if (role === 'super_admin') {
    return true;
  }

  // Legacy WeTechForU admin (no client_id) has access to all
  if (role === 'admin' && !clientId) {
    return true;
  }

  // User can only access their own client
  return clientId === targetClientId;
}

/**
 * Get the appropriate client_id for data creation
 * 
 * @param req Express request object with session
 * @param requestedClientId Optional client ID from request body/params
 * @returns client_id to use for new records
 */
export function getClientIdForCreate(req: Request, requestedClientId?: number): number | null {
  const role = req.session.role;
  const userClientId = req.session.clientId;

  // Super admin can create for any client
  if (role === 'super_admin') {
    return requestedClientId || null;
  }

  // Legacy WeTechForU admin can create for any client
  if (role === 'admin' && !userClientId) {
    return requestedClientId || null;
  }

  // Regular users can only create for their own client
  return userClientId || null;
}

