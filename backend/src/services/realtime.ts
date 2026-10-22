import { Response } from 'express';

class RealtimeService {
  // Map of userId -> Set of active SSE Response objects
  private clients: Map<string, Set<Response>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.broadcast('heartbeat', { time: Date.now() });
    }, 25000);
  }

  addClient(userId: string, res: Response) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(res);

    // Initial greeting
    this.sendToResponse(res, 'connected', { status: 'ok', userId, time: Date.now() });

    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  removeClient(userId: string, res: Response) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  private sendToResponse(res: Response, event: string, data: any) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } catch {
      // client disconnected
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    const userClients = this.clients.get(userId);
    if (userClients && userClients.size > 0) {
      userClients.forEach((res) => {
        this.sendToResponse(res, event, data);
      });
    }
  }

  sendToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach((id) => this.sendToUser(id, event, data));
  }

  broadcast(event: string, data: any) {
    this.clients.forEach((resSet) => {
      resSet.forEach((res) => {
        this.sendToResponse(res, event, data);
      });
    });
  }
}

export const realtime = new RealtimeService();
