import { SessionData } from 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
    is_admin?: boolean;
  }
}