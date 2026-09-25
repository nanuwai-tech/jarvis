"use client";

import React, { useEffect, useRef, useState } from "react";
import { TrackReferenceOrPlaceholder } from "@livekit/components-react";

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

  // Main Canvas Rendering Loop with 3D Hologram, Scanlines, Particle System, and Lip Sync
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    const maxParticles = 65;

    // Mouth geometry in original 746 x 522 image
    const origW = 746;
    const origH = 522;
    const mouthCenterOrigX = 373;
    const mouthSeamOrigY = 270;
    const mouthWidthOrig = 90;

    let smoothedAudioLevel = 0;
    let mouthOpening = 0;
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
        
        // Focus on vocal formant speech frequencies (bins 2 to 24)
        let sum = 0;
        const count = 22;
        for (let i = 2; i < 24; i++) {
          sum += buffer[i];
        }
        rawAudioLevel = sum / (count * 255);
      } else if (state === "speaking") {
        // Fallback natural speaking modulation if audio context is in direct speaker pipe
        const mod1 = Math.sin(time * 12) * 0.4 + 0.5;
        const mod2 = Math.cos(time * 22) * 0.3;
        rawAudioLevel = Math.max(0, mod1 + mod2);
      }

      // Smooth attack and decay for realistic lip opening physics
      if (rawAudioLevel > smoothedAudioLevel) {
        smoothedAudioLevel += (rawAudioLevel - smoothedAudioLevel) * 0.45;
      } else {
        smoothedAudioLevel += (rawAudioLevel - smoothedAudioLevel) * 0.22;
      }

      mouthOpening = Math.min(1.0, smoothedAudioLevel * 1.5);

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

      // 3. Compute Hologram Size and Position
      const img = imageRef.current;
      if (!img) return;

      const scale = Math.min(
        (canvas.width * 0.95) / origW,
        (canvas.height * 0.95) / origH
      );
      const renderW = origW * scale;
      const renderH = origH * scale;

      // 3D floating & organic breathing motion
      const floatY = Math.sin(time * 1.4) * 5;
      const floatX = Math.cos(time * 0.8) * 2;
      const renderX = (canvas.width - renderW) / 2 + floatX;
      const renderY = (canvas.height - renderH) / 2 + floatY;

      ctx.save();

      // 4. Hologram Glow / Volumetric Aura Behind Avatar
      const auraPulse = Math.sin(time * 2) * 0.15 + (state === "speaking" ? 0.35 + mouthOpening * 0.3 : 0.2);
      const glowGrad = ctx.createRadialGradient(
        renderX + renderW / 2,
        renderY + renderH * 0.4,
        20 * scale,
        renderX + renderW / 2,
        renderY + renderH * 0.4,
        280 * scale
      );
      glowGrad.addColorStop(0, `rgba(0, 229, 255, ${auraPulse * 0.5})`);
      glowGrad.addColorStop(0.6, `rgba(0, 180, 216, ${auraPulse * 0.2})`);
      glowGrad.addColorStop(1, "rgba(0, 229, 255, 0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 5. Draw Avatar with Dynamic Lip-Sync Mesh Slicing
      const jawDisplacement = mouthOpening * (18 * scale);

      // (A) Upper Head Section (from top down to upper lip seam)
      ctx.drawImage(
        img,
        0, 0, origW, mouthSeamOrigY,
        renderX, renderY, renderW, mouthSeamOrigY * scale
      );

      // (B) Inner Oral Cavity Holographic Glow (Revealed when mouth opens)
      if (jawDisplacement > 0.8) {
        const mouthCanvasX = renderX + (mouthCenterOrigX - mouthWidthOrig / 2) * scale;
        const mouthCanvasY = renderY + mouthSeamOrigY * scale - 2;
        const mouthCanvasW = mouthWidthOrig * scale;
        const mouthCanvasH = jawDisplacement + 3;

        // Glowing cyan cavity
        ctx.save();
        const cavityGrad = ctx.createRadialGradient(
          mouthCanvasX + mouthCanvasW / 2,
          mouthCanvasY + mouthCanvasH / 2,
          1,
          mouthCanvasX + mouthCanvasW / 2,
          mouthCanvasY + mouthCanvasH / 2,
          mouthCanvasW * 0.6
        );
        cavityGrad.addColorStop(0, `rgba(0, 240, 255, ${Math.min(0.9, mouthOpening * 1.2)})`);
        cavityGrad.addColorStop(0.5, `rgba(0, 150, 210, ${Math.min(0.6, mouthOpening * 0.8)})`);
        cavityGrad.addColorStop(1, "rgba(0, 50, 90, 0)");
        
        ctx.fillStyle = cavityGrad;
        ctx.beginPath();
        ctx.ellipse(
          mouthCanvasX + mouthCanvasW / 2,
          mouthCanvasY + mouthCanvasH / 2,
          (mouthCanvasW / 2) * (0.8 + mouthOpening * 0.3),
          mouthCanvasH / 2,
          0, 0, Math.PI * 2
        );
        ctx.fill();

        // Horizontal digital laser lines inside mouth
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 + mouthOpening * 0.5})`;
        ctx.lineWidth = 1.2;
        for (let ly = mouthCanvasY + 2; ly < mouthCanvasY + mouthCanvasH; ly += 3.5 * scale) {
          ctx.beginPath();
          ctx.moveTo(mouthCanvasX + 4, ly);
          ctx.lineTo(mouthCanvasX + mouthCanvasW - 4, ly);
          ctx.stroke();
        }
        ctx.restore();
      }

      // (C) Lower Jaw / Chin Section (Shifted down dynamically with speech audio)
      const jawOrigHeight = origH - mouthSeamOrigY;
      ctx.drawImage(
        img,
        0, mouthSeamOrigY, origW, jawOrigHeight,
        renderX, renderY + mouthSeamOrigY * scale + jawDisplacement, renderW, jawOrigHeight * scale
      );

      // 6. Holographic Scanline Overlay & Vertical Raster Beams
      const scanlineSpacing = 3;
      ctx.fillStyle = "rgba(0, 229, 255, 0.035)";
      for (let y = renderY; y < renderY + renderH + jawDisplacement; y += scanlineSpacing) {
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
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#010408] cursor-pointer select-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}
