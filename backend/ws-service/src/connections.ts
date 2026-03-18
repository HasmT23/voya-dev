import type { WebSocket } from "ws";

interface ConnectedDevice {
  ws: WebSocket;
  deviceId: string;
  deviceType: string;
  userId: string;
  connectedAt: Date;
}

/**
 * Manages active WebSocket connections.
 * Maps userId → deviceId → connection.
 */
export class ConnectionManager {
  private connections = new Map<string, Map<string, ConnectedDevice>>();

  add(userId: string, device: ConnectedDevice): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Map());
    }
    this.connections.get(userId)!.set(device.deviceId, device);
  }

  remove(userId: string, deviceId: string): void {
    const userDevices = this.connections.get(userId);
    if (userDevices) {
      userDevices.delete(deviceId);
      if (userDevices.size === 0) {
        this.connections.delete(userId);
      }
    }
  }

  /**
   * Get all desktop devices for a user (to send action plans to).
   */
  getDesktops(userId: string): ConnectedDevice[] {
    const userDevices = this.connections.get(userId);
    if (!userDevices) return [];
    return Array.from(userDevices.values()).filter((d) =>
      d.deviceType.startsWith("DESKTOP_")
    );
  }

  /**
   * Get all mobile devices for a user (to send status updates to).
   */
  getMobiles(userId: string): ConnectedDevice[] {
    const userDevices = this.connections.get(userId);
    if (!userDevices) return [];
    return Array.from(userDevices.values()).filter((d) =>
      d.deviceType.startsWith("MOBILE_")
    );
  }

  /**
   * Get a specific device connection.
   */
  get(userId: string, deviceId: string): ConnectedDevice | undefined {
    return this.connections.get(userId)?.get(deviceId);
  }

  /**
   * Send a message to specific device(s).
   */
  sendToDesktops(userId: string, message: object): void {
    for (const device of this.getDesktops(userId)) {
      if (device.ws.readyState === device.ws.OPEN) {
        device.ws.send(JSON.stringify(message));
      }
    }
  }

  sendToMobiles(userId: string, message: object): void {
    for (const device of this.getMobiles(userId)) {
      if (device.ws.readyState === device.ws.OPEN) {
        device.ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Get total connection count (for health checks).
   */
  get totalConnections(): number {
    let count = 0;
    for (const devices of this.connections.values()) {
      count += devices.size;
    }
    return count;
  }
}
