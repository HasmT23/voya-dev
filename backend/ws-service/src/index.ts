import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "node:url";
import { ConnectionManager } from "./connections.js";
import { ClientMessageSchema } from "./messages.js";

const PORT = parseInt(process.env.PORT || "3002", 10);
const REGISTRY_URL = process.env.REGISTRY_URL || "http://localhost:3001";
const HEARTBEAT_INTERVAL = 30_000;

const connections = new ConnectionManager();

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "ws",
        connections: connections.totalConnections,
      })
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

/**
 * Verify device token against registry service on WS handshake.
 */
async function verifyDevice(
  token: string
): Promise<{
  deviceId: string;
  deviceType: string;
  userId: string;
} | null> {
  try {
    const res = await fetch(`${REGISTRY_URL}/devices/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) return null;
    return (await res.json()) as {
      deviceId: string;
      deviceType: string;
      userId: string;
    };
  } catch {
    return null;
  }
}

wss.on("connection", async (ws, req) => {
  // Extract device token from query string
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const token = url.searchParams.get("token");

  if (!token) {
    ws.close(4001, "Missing device token");
    return;
  }

  // Verify token against registry
  const device = await verifyDevice(token);
  if (!device) {
    ws.close(4001, "Invalid device token");
    return;
  }

  console.log(
    `Device connected: ${device.deviceId} (${device.deviceType}) for user ${device.userId}`
  );

  connections.add(device.userId, {
    ws,
    deviceId: device.deviceId,
    deviceType: device.deviceType,
    userId: device.userId,
    connectedAt: new Date(),
  });

  // Heartbeat
  let alive = true;
  const heartbeat = setInterval(() => {
    if (!alive) {
      ws.terminate();
      return;
    }
    alive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);

  ws.on("pong", () => {
    alive = true;
  });

  // Message handling
  ws.on("message", (data) => {
    let message: unknown;
    try {
      message = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
      return;
    }

    const parsed = ClientMessageSchema.safeParse(message);
    if (!parsed.success) {
      ws.send(
        JSON.stringify({
          type: "error",
          error: "Invalid message format",
          details: parsed.error.flatten(),
        })
      );
      return;
    }

    const msg = parsed.data;

    switch (msg.type) {
      case "command":
        // Mobile sent a voice command → forward to agent service (via HTTP)
        // then send action plan to desktops
        handleCommand(device.userId, msg.payload);
        break;

      case "step_status":
        // Desktop reporting step progress → forward to mobile devices
        connections.sendToMobiles(device.userId, {
          type: "status_update",
          payload: {
            requestId: msg.payload.requestId,
            stepIndex: msg.payload.stepIndex,
            totalSteps: 0, // filled by agent service
            status: msg.payload.status,
            description: msg.payload.result || "",
            error: msg.payload.error,
          },
        });
        break;

      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;
    }
  });

  ws.on("close", () => {
    clearInterval(heartbeat);
    connections.remove(device.userId, device.deviceId);
    console.log(`Device disconnected: ${device.deviceId}`);
  });

  ws.on("error", (err) => {
    console.error(`WebSocket error for ${device.deviceId}:`, err.message);
  });
});

/**
 * Handle a voice command from mobile.
 * Calls agent service to plan actions, then routes plan to desktops.
 */
async function handleCommand(
  userId: string,
  payload: { text: string; requestId: string }
) {
  const agentUrl = process.env.AGENT_URL || "http://localhost:3003";

  try {
    const res = await fetch(`${agentUrl}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        text: payload.text,
        requestId: payload.requestId,
      }),
    });

    if (!res.ok) {
      connections.sendToMobiles(userId, {
        type: "status_update",
        payload: {
          requestId: payload.requestId,
          stepIndex: 0,
          totalSteps: 0,
          status: "failed",
          description: "Failed to plan command.",
        },
      });
      return;
    }

    const plan = (await res.json()) as { steps: unknown[] };

    // Send action plan to all connected desktops
    connections.sendToDesktops(userId, {
      type: "action_plan",
      payload: {
        requestId: payload.requestId,
        steps: plan.steps,
      },
    });

    // Notify mobile that execution has started
    connections.sendToMobiles(userId, {
      type: "status_update",
      payload: {
        requestId: payload.requestId,
        stepIndex: 0,
        totalSteps: plan.steps.length,
        status: "running",
        description: "Executing on your desktop...",
      },
    });
  } catch (err) {
    console.error("Agent service error:", err);
    connections.sendToMobiles(userId, {
      type: "status_update",
      payload: {
        requestId: payload.requestId,
        stepIndex: 0,
        totalSteps: 0,
        status: "failed",
        description: "Agent service unavailable.",
      },
    });
  }
}

server.listen(PORT, () => {
  console.log(`WebSocket service running on port ${PORT}`);
});

const shutdown = () => {
  console.log("Shutting down...");
  wss.close();
  server.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
