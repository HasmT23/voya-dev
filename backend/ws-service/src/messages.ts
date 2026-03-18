import { z } from "zod";

/**
 * All WebSocket message types for Voya.
 */

// Client → Server: Device sends a command intent (from mobile)
export const CommandMessageSchema = z.object({
  type: z.literal("command"),
  payload: z.object({
    text: z.string().min(1).max(1000),
    requestId: z.string().uuid(),
  }),
});

// Server → Desktop: Action plan to execute
export const ActionPlanMessageSchema = z.object({
  type: z.literal("action_plan"),
  payload: z.object({
    requestId: z.string().uuid(),
    steps: z.array(
      z.object({
        stepIndex: z.number(),
        action: z.string(),
        params: z.record(z.unknown()),
      })
    ),
  }),
});

// Desktop → Server: Step status update
export const StepStatusMessageSchema = z.object({
  type: z.literal("step_status"),
  payload: z.object({
    requestId: z.string().uuid(),
    stepIndex: z.number(),
    status: z.enum(["running", "completed", "failed"]),
    result: z.string().optional(),
    error: z.string().optional(),
  }),
});

// Server → Mobile: Status update forwarded from desktop
export const StatusUpdateMessageSchema = z.object({
  type: z.literal("status_update"),
  payload: z.object({
    requestId: z.string().uuid(),
    stepIndex: z.number(),
    totalSteps: z.number(),
    status: z.enum(["running", "completed", "failed"]),
    description: z.string(),
    error: z.string().optional(),
  }),
});

// Heartbeat
export const PingMessageSchema = z.object({
  type: z.literal("ping"),
});

export const PongMessageSchema = z.object({
  type: z.literal("pong"),
});

// Union of all client messages
export const ClientMessageSchema = z.discriminatedUnion("type", [
  CommandMessageSchema,
  StepStatusMessageSchema,
  PingMessageSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type CommandMessage = z.infer<typeof CommandMessageSchema>;
export type StepStatusMessage = z.infer<typeof StepStatusMessageSchema>;
