import WebSocket from "ws";
import { executePlan } from "../browser/executor.js";

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const PING_INTERVAL = 25000;

export class VoyaSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private shouldReconnect = true;

  constructor(
    private serverUrl: string,
    private deviceToken: string
  ) {}

  connect(): void {
    const url = `${this.serverUrl}?token=${encodeURIComponent(this.deviceToken)}`;

    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      console.log("Connected to Voya server");
      this.reconnectAttempts = 0;
      this.startPing();
    });

    this.ws.on("message", async (data) => {
      let message: any;
      try {
        message = JSON.parse(data.toString());
      } catch {
        console.error("Invalid message from server");
        return;
      }

      if (message.type === "action_plan") {
        console.log(
          `Received action plan (${message.payload.steps.length} steps)`
        );
        await this.handleActionPlan(message.payload);
      } else if (message.type === "pong") {
        // Heartbeat response — nothing to do
      }
    });

    this.ws.on("close", (code, reason) => {
      console.log(`Disconnected: ${code} ${reason.toString()}`);
      this.stopPing();
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.on("error", (err) => {
      console.error("WebSocket error:", err.message);
    });
  }

  private async handleActionPlan(payload: {
    requestId: string;
    steps: Array<{
      stepIndex: number;
      action: string;
      params: Record<string, unknown>;
    }>;
  }) {
    await executePlan(payload.steps, (result) => {
      // Report each step's status back to server
      this.send({
        type: "step_status",
        payload: {
          requestId: payload.requestId,
          ...result,
        },
      });
    });
  }

  private send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    this.reconnectAttempts++;

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.stopPing();
    this.ws?.close();
  }
}
