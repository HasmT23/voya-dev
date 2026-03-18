import { z } from "zod";

export const DeviceTypeEnum = z.enum([
  "DESKTOP_WINDOWS",
  "DESKTOP_MAC",
  "MOBILE_IOS",
  "MOBILE_ANDROID",
]);

export const InitiatePairingSchema = z.object({
  deviceName: z
    .string()
    .min(1, "Device name is required")
    .max(100, "Device name too long")
    .trim(),
  deviceType: DeviceTypeEnum,
});

export const ConfirmPairingSchema = z.object({
  code: z
    .string()
    .min(1, "Pairing code is required")
    .max(64, "Invalid pairing code"),
});

export const VerifyTokenSchema = z.object({
  token: z
    .string()
    .min(1, "Token is required")
    .max(128, "Invalid token"),
});

export type InitiatePairingInput = z.infer<typeof InitiatePairingSchema>;
export type ConfirmPairingInput = z.infer<typeof ConfirmPairingSchema>;
export type VerifyTokenInput = z.infer<typeof VerifyTokenSchema>;
