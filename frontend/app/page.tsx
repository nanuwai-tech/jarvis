"use client";

import React, { useState, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  BarVisualizer,
  useVoiceAssistant,
  useLocalParticipant,
  useTracks,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, MonitorUp, Power, Sparkles, Activity } from "lucide-react";

interface TokenData {
  token: string;
  url: string;
}

export default function JarvisVoiceApp() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/token");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch connection token");
      }
      const data: TokenData = await res.json();
      setTokenData(data);
    } catch (err: any) {
      console.error("Connection error:", err);
      setError(err.message || "Failed to start session.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const endSession = useCallback(() => {
    setTokenData(null);
  }, []);

  return (
    <main className="flex-1 flex flex-col items-center justify-between p-6 max-w-6xl w-full mx-auto">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between py-4 border-b border-cyan-900/30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.3)]">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-cyan-400">J.A.R.V.I.S.</h1>
            <p className="text-xs text-slate-400">Just A Rather Very Intelligent System</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                tokenData ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-slate-600"
              }`}
            />
            <span className="text-slate-300">{tokenData ? "ONLINE" : "STANDBY"}</span>
          </div>

          {tokenData ? (
            <button
              onClick={endSession}
              className="flex items-center space-x-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded-lg text-sm transition-all"
            >
              <Power className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={startSession}
              disabled={isConnecting}
              className="flex items-center space-x-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-sm transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50"
            >
              <Activity className="w-4 h-4" />
              <span>{isConnecting ? "Initializing..." : "Engage Jarvis"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Interactive Stage */}
      <section className="flex-1 w-full flex flex-col items-center justify-center my-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 text-sm max-w-md text-center">
            {error}
          </div>
        )}

        {tokenData ? (
          <LiveKitRoom
            serverUrl={tokenData.url}
            token={tokenData.token}
            connect={true}
            audio={true}
            video={false}
            onDisconnected={endSession}
            className="w-full flex flex-col items-center justify-center space-y-8"
          >
            <JarvisSessionControls />
            <RoomAudioRenderer />
          </LiveKitRoom>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            {/* Reactor Orb Standby */}
            <div className="relative flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border border-cyan-500/30 jarvis-reactor flex items-center justify-center bg-cyan-950/20 backdrop-blur-sm">
                <div className="w-36 h-36 rounded-full border border-cyan-400/40 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-cyan-500/10 border border-cyan-300/60 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-cyan-300" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-bold text-white tracking-wide">Jarvis is in Standby</h2>
              <p className="text-sm text-slate-400">
                Click <span className="text-cyan-400 font-semibold">Engage Jarvis</span> to establish real-time multimodal voice and vision communication.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Footer Instructions */}
      <footer className="w-full py-4 border-t border-cyan-900/20 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center space-x-2">
          <span>Multimodal Engine: Google Gemini Live</span>
          <span>•</span>
          <span>WebRTC: LiveKit Cloud</span>
        </div>
        <div>
          <span>Say "Jarvis, search the web for..." or "Open browser and..."</span>
        </div>
      </footer>
    </main>
  );
}

function JarvisSessionControls() {
  const { state, audioTrack } = useVoiceAssistant();
  const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();

  const getStatusText = () => {
    switch (state) {
      case "listening":
        return "Listening to you, sir...";
      case "thinking":
        return "Processing request...";
      case "speaking":
        return "Jarvis is speaking...";
      default:
        return "Connected & Ready";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-2xl">
      {/* Reactor Center with Visualizer */}
      <div className="relative flex items-center justify-center">
        <div
          className={`w-64 h-64 rounded-full border ${
            state === "speaking"
              ? "border-cyan-400 shadow-[0_0_60px_rgba(0,229,255,0.8)]"
              : state === "listening"
              ? "border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.6)]"
              : "border-cyan-500/40 jarvis-reactor"
          } flex items-center justify-center bg-cyan-950/30 backdrop-blur-md transition-all duration-500`}
        >
          <div className="w-48 h-48 flex items-center justify-center">
            {audioTrack ? (
              <BarVisualizer
                state={state}
                barCount={15}
                trackRef={audioTrack}
                className="h-28 flex items-center gap-1.5 text-cyan-400"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-cyan-300" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* State Badge */}
      <div className="px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-sm font-mono tracking-wide">
        {getStatusText()}
      </div>

      {/* Bottom Control Bar */}
      <div className="flex items-center space-x-4 p-3 bg-slate-900/80 border border-cyan-500/30 rounded-2xl backdrop-blur-lg shadow-xl">
        <TrackToggle
          source={Track.Source.Microphone}
          className="p-3 rounded-xl bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 text-slate-200 transition-all data-[enabled=true]:bg-cyan-500 data-[enabled=true]:text-slate-950"
        >
          {isMicrophoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </TrackToggle>

        <TrackToggle
          source={Track.Source.Camera}
          className="p-3 rounded-xl bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 text-slate-200 transition-all data-[enabled=true]:bg-cyan-500 data-[enabled=true]:text-slate-950"
        >
          {isCameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </TrackToggle>

        <TrackToggle
          source={Track.Source.ScreenShare}
          className="p-3 rounded-xl bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 text-slate-200 transition-all data-[enabled=true]:bg-cyan-500 data-[enabled=true]:text-slate-950"
        >
          <MonitorUp className="w-5 h-5" />
        </TrackToggle>
      </div>
    </div>
  );
}
