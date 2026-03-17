import { useState, useEffect, useRef, useCallback } from "react";

/**
 * WebSocket hook for インフラ雀.
 * Connects to /ws/{roomId}/{playerName} and handles messages.
 */
export function useWebSocket(roomId, playerName) {
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const shouldReconnect = useRef(true);

  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}/ws/${roomId}/${encodeURIComponent(playerName)}`;
  }, [roomId, playerName]);

  const connect = useCallback(() => {
    if (!roomId || !playerName) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "game_state") {
          setGameState(msg.state);
        } else if (msg.type === "error") {
          setError(msg.message);
          // Clear error after 3 seconds
          setTimeout(() => setError(null), 3000);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      wsRef.current = null;
      if (shouldReconnect.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      }
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      setError("接続エラーが発生しました");
    };
  }, [getWsUrl, roomId, playerName]);

  useEffect(() => {
    shouldReconnect.current = true;
    connect();
    return () => {
      shouldReconnect.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      setError("接続が切れています。再接続中...");
    }
  }, []);

  return { gameState, error, connected, sendMessage };
}
