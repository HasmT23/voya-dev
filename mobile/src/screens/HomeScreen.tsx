import React, { useCallback } from "react";
import { View, Text, SafeAreaView } from "react-native";
import { MicButton } from "../components/MicButton";
import { StepChain } from "../components/StepChain";
import { useCommandStore } from "../store/command";
import { sendCommand } from "../services/websocket";

export function HomeScreen() {
  const { transcript, isListening, setListening, setTranscript, startExecution } =
    useCommandStore();

  const handlePressIn = useCallback(() => {
    setListening(true);
    // iOS Speech Recognition will be integrated here
    // For now, this is the placeholder hook
  }, []);

  const handlePressOut = useCallback(() => {
    setListening(false);

    if (transcript.trim()) {
      const requestId = crypto.randomUUID();
      startExecution(requestId);
      sendCommand(transcript, requestId);
    }
  }, [transcript]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#fafafa",
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 16,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: "#111827",
            letterSpacing: -0.5,
          }}
        >
          Voya
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#9ca3af",
            marginTop: 4,
          }}
        >
          Tap the mic and speak a command
        </Text>
      </View>

      {/* Step Chain */}
      <StepChain />

      {/* Mic Area — centered at bottom */}
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 80,
        }}
      >
        {/* Transcript */}
        {(isListening || transcript) && (
          <Text
            style={{
              fontSize: 16,
              color: "#374151",
              textAlign: "center",
              marginBottom: 32,
              paddingHorizontal: 32,
              fontStyle: isListening ? "italic" : "normal",
            }}
          >
            {isListening ? "Listening..." : transcript}
          </Text>
        )}

        <MicButton onPressIn={handlePressIn} onPressOut={handlePressOut} />
      </View>
    </SafeAreaView>
  );
}
