export interface SessionInfo {
  id: string;
  label: string;
  machineId: string;
  status: 'online' | 'offline';
}

export interface Message {
  type: string;
  role?: string;
  session?: string;
  payload?: string;
  meta?: Record<string, string>;
  sessions?: SessionInfo[];
  status?: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';
