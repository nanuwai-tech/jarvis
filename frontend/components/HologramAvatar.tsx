"use client";

import React, { useEffect, useRef, useState } from "react";
import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import HologramAvatar3D from "./HologramAvatar3D";

interface HologramAvatarProps {
  audioTrack?: TrackReferenceOrPlaceholder;
  state?: string;
  isConnected: boolean;
  onScreenClick?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export default function HologramAvatar({
  audioTrack,
  state = "idle",
  isConnected,
  onScreenClick,
}: HologramAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load avatar base image
  useEffect(() => {
    const img = new Image();
    img.src = "/avatar.png";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
  }, []);

  // Set up Web Audio Analyser when audioTrack changes
  useEffect(() => {
    if (!audioTrack || !audioTrack.publication?.track?.mediaStreamTrack) {
      return;
    }

    try {
      const mediaStreamTrack = audioTrack.publication.track.mediaStreamTrack;
      const stream = new MediaStream([mediaStreamTrack]);
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;

      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
    } catch (e) {
      console.warn("Could not attach Web Audio analyser to track:", e);
    }

    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [audioTrack]);

  const mouthOpeningRef = useRef(0);
  // Main Canvas Rendering Loop with Scanlines and Particle System
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    const maxParticles = 65;

    let smoothedAudioLevel = 0;
    let time = 0;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      time += 0.035;

      // 1. Calculate Real-Time Audio Level for Lip Sync
      let rawAudioLevel = 0;
      if (analyserRef.current && state === "speaking") {
        const buffer = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buffer);
        
        let sum = 0;
        const count = 22;
        for (let i = 2; i < 24; i++) {
          sum += buffer[i];
        }
        rawAudioLevel = sum / (count * 255);
      } else if (state === "speaking") {
        const mod1 = Math.sin(time * 12) * 0.4 + 0.5;
        const mod2 = Math.cos(time * 22) * 0.3;
        rawAudioLevel = Math.max(0, mod1 + mod2);
      }

      if (rawAudioLevel > smoothedAudioLevel) {
        smoothedAudioLevel += (rawAudioLevel - smoothedAudioLevel) * 0.45;
      } else {
        smoothedAudioLevel += (rawAudioLevel - smoothedAudioLevel) * 0.22;
      }

      mouthOpeningRef.current = Math.min(1.0, smoothedAudioLevel * 1.5);

      // 2. Clear Screen & Draw Ambient Deep Space Vignette
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bgGrad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height * 0.45,
        50,
        canvas.width / 2,
        canvas.height * 0.45,
        Math.max(canvas.width, canvas.height) * 0.75
      );
      bgGrad.addColorStop(0, "#081422");
      bgGrad.addColorStop(0.4, "#040b13");
      bgGrad.addColorStop(1, "#010408");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();

      const origW = 746;
      const origH = 522;
      const scale = Math.min(
        (canvas.width * 0.95) / origW,
        (canvas.height * 0.95) / origH
      );
      const renderW = origW * scale;
      const renderH = origH * scale;

      const floatY = Math.sin(time * 1.4) * 5;
      const floatX = Math.cos(time * 0.8) * 2;
      const renderX = (canvas.width - renderW) / 2 + floatX;
      const renderY = (canvas.height - renderH) / 2 + floatY;

      // 6. Holographic Scanline Overlay & Vertical Raster Beams
      const scanlineSpacing = 3;
      ctx.fillStyle = "rgba(0, 229, 255, 0.035)";
      for (let y = renderY; y < renderY + renderH; y += scanlineSpacing) {
        ctx.fillRect(renderX, y, renderW, 1);
      }

      // High-intensity sweeping holographic laser scanline
      const sweepY = renderY + ((time * 85) % (renderH + 100));
      const sweepGrad = ctx.createLinearGradient(0, sweepY - 15, 0, sweepY + 15);
      sweepGrad.addColorStop(0, "rgba(0, 229, 255, 0)");
      sweepGrad.addColorStop(0.5, "rgba(0, 245, 255, 0.28)");
      sweepGrad.addColorStop(1, "rgba(0, 229, 255, 0)");
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(renderX, sweepY - 15, renderW, 30);

      // 7. Holographic Particle Dust System
      if (particles.length < maxParticles && Math.random() < 0.4) {
        particles.push({
          x: renderX + Math.random() * renderW,
          y: renderY + renderH * 0.7 + Math.random() * (renderH * 0.3),
          vx: (Math.random() - 0.5) * 0.8,
          vy: -(Math.random() * 1.5 + 0.8),
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.7 + 0.3,
          life: 0,
          maxLife: Math.random() * 80 + 40,
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        const pFade = Math.sin((p.life / p.maxLife) * Math.PI);
        const pAlpha = p.alpha * pFade * (state === "speaking" ? 1.4 : 0.8);

        ctx.fillStyle = `rgba(0, 229, 255, ${Math.min(1.0, pAlpha)})`;
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      // 8. Subtle Listening Resonance Wave (When User Speaks / Mic Active)
      if (state === "listening") {
        const pulseR = ((time * 60) % 180) * scale;
        const pulseAlpha = Math.max(0, 1 - pulseR / (180 * scale)) * 0.35;
        ctx.strokeStyle = `rgba(52, 211, 153, ${pulseAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(renderX + renderW / 2, renderY + renderH * 0.42, 60 * scale + pulseR, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [imageLoaded, state]);

  return (
    <div
      onClick={onScreenClick}
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#010408] cursor-pointer select-none relative"
    >
      <HologramAvatar3D mouthOpeningRef={mouthOpeningRef} textureUrl="/avatar.png" />
      <canvas
        ref={canvasRef}
        className="w-full h-full block absolute inset-0 pointer-events-none z-10 mix-blend-screen"
      />
    </div>
  );
}
