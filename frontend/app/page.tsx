"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
} from "@livekit/components-react";
import HologramAvatar from "@/components/HologramAvatar";

interface TokenData {
  token: string;
  url: string;
}

export default function FullscreenHologramApp() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const startSession = useCallback(async () => {
    if (tokenData || isConnecting) return;
    setIsConnecting(true);
    try {
      const res = await fetch("/api/token");
      if (!res.ok) {
        throw new Error("Failed to fetch token");
      }
      const data: TokenData = await res.json();
      setTokenData(data);
    } catch (err) {
      console.error("Connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [tokenData, isConnecting]);

  // Auto-connect on initial load or on first user click
  useEffect(() => {
    startSession();
  }, [startSession]);

  return (
    <main
      onClick={startSession}
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#010408] cursor-pointer"
    >
      {tokenData ? (
        <LiveKitRoom
          serverUrl={tokenData.url}
          token={tokenData.token}
          connect={true}
          audio={true}
          video={false}
          className="w-full h-full"
        >
          <HologramLiveSync />
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <HologramAvatar
          isConnected={false}
          state="idle"
          onScreenClick={startSession}
        />
      )}
    </main>
  );
}

function HologramLiveSync() {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <HologramAvatar
      audioTrack={audioTrack}
      state={state}
      isConnected={true}
    />
  );
}
