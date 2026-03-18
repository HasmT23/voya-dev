import { VoyaSocketClient } from "./socket/client.js";
import { closeBrowser } from "./launcher/browser.js";

const WS_URL = process.env.VOYA_WS_URL || "ws://localhost:3002";
const DEVICE_TOKEN = process.env.VOYA_DEVICE_TOKEN || "";

if (!DEVICE_TOKEN) {
  console.error(
    "Missing VOYA_DEVICE_TOKEN. Run the pairing flow first to get a device token."
  );
  process.exit(1);
}

console.log("Voya Desktop Agent starting...");
console.log(`Connecting to ${WS_URL}`);

const client = new VoyaSocketClient(WS_URL, DEVICE_TOKEN);
client.connect();

const shutdown = async () => {
  console.log("Shutting down Voya Desktop Agent...");
  client.disconnect();
  await closeBrowser();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
