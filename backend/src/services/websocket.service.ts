import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../utils/logger.js';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export class WebSocketService {
  private static wss: WebSocketServer | null = null;
  private static clients: Set<WebSocket> = new Set();
  private static pingInterval: NodeJS.Timeout | null = null;

  public static initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.clients.add(ws);
      const clientIp = req.socket.remoteAddress;
      logger.info(`[WebSocket] Client connected from ${clientIp}. Total connected: ${this.clients.size}`);

      // Send initial welcome & connection ack
      ws.send(JSON.stringify({
        type: 'CONNECTION_ESTABLISHED',
        data: {
          connectedClients: this.clients.size,
          serverTime: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message.toString());
          logger.debug('[WebSocket] Received client message:', parsed);
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          }
        } catch (err) {
          logger.warn('[WebSocket] Invalid JSON message from client');
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info(`[WebSocket] Client disconnected. Total active: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        logger.error('[WebSocket] Socket error:', err);
        this.clients.delete(ws);
      });
    });

    // Heartbeat check every 25 seconds
    this.pingInterval = setInterval(() => {
      this.broadcast('HEARTBEAT', {
        serverTime: new Date().toISOString(),
        activeClients: this.clients.size
      });
    }, 25000);

    logger.info('[WebSocket] Service initialized on path /ws');
  }

  public static broadcast(type: string, data: any): void {
    const payload: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString()
    };
    const jsonString = JSON.stringify(payload);

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(jsonString);
        sentCount++;
      }
    });

    logger.debug(`[WebSocket] Broadcasted "${type}" to ${sentCount} clients.`);
  }

  public static getConnectedCount(): number {
    return this.clients.size;
  }

  public static close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.clients.clear();
  }
}
