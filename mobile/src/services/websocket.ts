import { useCommandStore } from "../store/command";

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || "ws://localhost:3002";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectWebSocket(deviceToken: string): void {
  if (ws?.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(deviceToken)}`);

  ws.onopen = () => {
    console.log("WebSocket connected");
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.type === "status_update") {
        useCommandStore.getState().updateStep(message.payload);
      }
    } catch {
      console.error("Invalid WebSocket message");
    }
  };

  ws.onclose = () => {
    console.log("WebSocket disconnected");
    scheduleReconnect(deviceToken);
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}

export function sendCommand(text: string, requestId: string): void {
  if (ws?.readyState !== WebSocket.OPEN) {
    console.error("WebSocket not connected");
    return;
  }

  ws.send(
    JSON.stringify({
      type: "command",
      payload: { text, requestId },
    })
  );
}

export function disconnectWebSocket(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  ws?.close();
  ws = null;
}

function scheduleReconnect(deviceToken: string): void {
  reconnectTimer = setTimeout(() => {
    connectWebSocket(deviceToken);
  }, 3000);
}
