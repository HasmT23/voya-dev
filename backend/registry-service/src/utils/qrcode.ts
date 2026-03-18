import QRCode from "qrcode";

export interface QRPayload {
  code: string;
  server: string;
  expiresAt: string;
}

/**
 * Generate QR code data URL from pairing payload.
 * The QR encodes a JSON object with the pairing code, server URL, and expiry.
 */
export async function generateQRDataURL(payload: QRPayload): Promise<string> {
  return QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
  });
}
