import React from "react";
import { View, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useCommandStore } from "../store/command";

export function StepChain() {
  const { steps, isExecuting } = useCommandStore();

  if (steps.length === 0 && !isExecuting) return null;

  return (
    <View
      style={{
        paddingHorizontal: 24,
        paddingTop: 32,
        gap: 12,
      }}
    >
      {steps.map((step, index) => (
        <Animated.View
          key={step.stepIndex}
          entering={FadeInDown.delay(index * 100).springify()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor:
              step.status === "completed"
                ? "#f0fdf4"
                : step.status === "failed"
                  ? "#fef2f2"
                  : "#f5f3ff",
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 18 }}>
            {step.status === "completed"
              ? "\u2713"
              : step.status === "failed"
                ? "\u2717"
                : "\u25CB"}
          </Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color:
                  step.status === "completed"
                    ? "#16a34a"
                    : step.status === "failed"
                      ? "#dc2626"
                      : "#6366f1",
              }}
            >
              Step {step.stepIndex + 1} of {step.totalSteps}
            </Text>
            <Text
              style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}
            >
              {step.description || step.error || "Processing..."}
            </Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
