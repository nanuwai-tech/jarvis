"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

interface HologramMeshProps {
  mouthOpeningRef: React.MutableRefObject<number>;
  textureUrl: string;
}

function HologramMesh({ mouthOpeningRef, textureUrl }: HologramMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, textureUrl);

  // Original image dimensions
  const origW = 746;
  const origH = 522;
  const mouthCenterOrigX = 373;
  const mouthSeamOrigY = 270;

  // The Plane is mapped from -w/2 to w/2.
  // We normalize mouth coordinates relative to plane center.
  // X: 0 is center. Mouth center is 373 out of 746 -> exactly 0.
  // Y: 0 is center. Mouth seam is 270 out of 522. Center is 261. 
  // So mouth is slightly below center (remembering standard Y up). 
  // In Three.js, Y goes from H/2 (top) to -H/2 (bottom).
  // Image Y=0 is top, Y=522 is bottom.
  // mouthSeamOrigY = 270. Normalized from top: 270/522 = 0.517.
  // ThreeJS Y = (0.5 - 0.517) * planeH.

  const planeW = 6;
  const planeH = planeW * (origH / origW); // Maintain aspect ratio

  // Create geometry once and save original positions
  const geometry = useMemo(() => {
    // 64x64 segments for smooth rubber stretching
    return new THREE.PlaneGeometry(planeW, planeH, 64, 64);
  }, [planeW, planeH]);

  const originalPositions = useMemo(() => {
    return new Float32Array(geometry.attributes.position.array);
  }, [geometry]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    // Subtle 3D floating & organic breathing motion
    meshRef.current.position.y = Math.sin(time * 1.4) * 0.05;
    meshRef.current.position.x = Math.cos(time * 0.8) * 0.02;
    // Rotate slightly for a holographic look
    meshRef.current.rotation.y = Math.sin(time * 0.5) * 0.05;
    meshRef.current.rotation.x = Math.cos(time * 0.7) * 0.02;

    // Mutate vertices for lip sync
    const positions = meshRef.current.geometry.attributes.position;
    const array = positions.array;

    // The mouth area in 3D space
    const mouthY = (0.5 - (mouthSeamOrigY / origH)) * planeH; 
    const mouthX = ((mouthCenterOrigX / origW) - 0.5) * planeW;
    const jawRadiusX = planeW * 0.15; // Width of the moving jaw area
    const jawRadiusY = planeH * 0.25; // Height of the moving jaw area below the mouth

    // Smoothing the mouth opening transition
    const smoothedMouth = Math.min(1.0, Math.max(0, mouthOpeningRef.current * 1.5));

    for (let i = 0; i < array.length; i += 3) {
      const origX = originalPositions[i];
      const origY = originalPositions[i + 1];

      // Calculate distance from mouth center
      const dx = origX - mouthX;
      // We only displace vertices that are AT or BELOW the mouth seam
      const dy = origY - mouthY;

      if (dy <= 0) { // In Three.js, negative Y is down (below mouth seam)
        // Check if inside the jaw area ellipse
        const dist = Math.sqrt((dx * dx) / (jawRadiusX * jawRadiusX) + (dy * dy) / (jawRadiusY * jawRadiusY));
        
        if (dist < 1.0) {
          // Weight: max displacement at center (dist=0), tapering to 0 at edge (dist=1)
          // We use a cosine curve for a smooth falloff
          const weight = (Math.cos(dist * Math.PI) + 1) * 0.5;
          
          // Max displacement downward
          const maxDisplacement = -0.5 * smoothedMouth; 
          
          array[i + 1] = origY + maxDisplacement * weight;
        } else {
          array[i + 1] = origY;
        }
      } else {
        array[i + 1] = origY; // Above mouth, no displacement
      }
    }
    
    positions.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial 
        map={texture} 
        transparent={true} 
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function HologramAvatar3D({ mouthOpeningRef, textureUrl }: HologramMeshProps) {
  // Ensure this only runs on client
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={1} />
        <HologramMesh mouthOpeningRef={mouthOpeningRef} textureUrl={textureUrl} />
      </Canvas>
    </div>
  );
}
