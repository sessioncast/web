export interface PaneInfo {
  id: string;
  index: number;
  width: number;
  height: number;
  top: number;
  left: number;
  active: boolean;
  title: string;
}

export interface SessionInfo {
  id: string;
  label: string;
  machineId: string;
  status: 'online' | 'offline';
  panes?: PaneInfo[];  // present when session has multiple panes
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
