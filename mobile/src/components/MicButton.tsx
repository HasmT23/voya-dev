import React from "react";
import { Pressable, View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { useCommandStore } from "../store/command";

interface MicButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
}

export function MicButton({ onPressIn, onPressOut }: MicButtonProps) {
  const { isListening, isExecuting } = useCommandStore();

  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  React.useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
      pulseOpacity.value = withTiming(0);
    }
  }, [isListening]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Pulse ring */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "#6366f1",
          },
          pulseStyle,
        ]}
      />

      {/* Main button */}
      <Animated.View style={buttonStyle}>
        <Pressable
          onPressIn={() => {
            scale.value = withSpring(0.92);
            onPressIn();
          }}
          onPressOut={() => {
            scale.value = withSpring(1);
            onPressOut();
          }}
          disabled={isExecuting}
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: isExecuting
              ? "#9ca3af"
              : isListening
                ? "#ef4444"
                : "#6366f1",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text style={{ fontSize: 36 }}>
            {isExecuting ? "..." : isListening ? "||" : "Mic"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
