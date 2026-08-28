import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseWebSocketOptions {
  onMessage?: (type: string, data: any) => void;
  onPaymentReceived?: (data: any) => void;
  onSessionCreated?: (data: any) => void;
  onSessionCancelled?: (data: any) => void;
  onAmountMismatch?: (data: any) => void;
  onDuplicateWarning?: (data: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    try {
      let wsUrl = import.meta.env.VITE_WS_URL;
      if (!wsUrl) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const { type, data } = parsed;

          optionsRef.current.onMessage?.(type, data);

          switch (type) {
            case 'PAYMENT_RECEIVED':
              optionsRef.current.onPaymentReceived?.(data);
              break;
            case 'SESSION_CREATED':
              optionsRef.current.onSessionCreated?.(data);
              break;
            case 'SESSION_CANCELLED':
            case 'SESSION_RESET':
            case 'SESSION_EXPIRED':
              optionsRef.current.onSessionCancelled?.(data);
              break;
            case 'PAYMENT_AMOUNT_MISMATCH':
              optionsRef.current.onAmountMismatch?.(data);
              break;
            case 'PAYMENT_DUPLICATE_WARNING':
              optionsRef.current.onDuplicateWarning?.(data);
              break;
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnect after 2.5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2500);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket encountered error:', err);
        ws.close();
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const send = useCallback((type: string, data: any = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  return { isConnected, send };
}
