"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

interface HologramMeshProps {
  mouthOpeningRef: React.MutableRefObject<number>;
  textureUrl: string;
}

// Custom Shader Material for Perspective-Correct Galaxy Rotation
const HologramShaderMaterial = {
  uniforms: {
    uTexture: { value: null },
    uTime: { value: 0 },
    uAudioLevel: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      // Slight 3D hover/breathing effect on vertices based on time
      vec3 pos = position;
      pos.z += sin(pos.x * 5.0 + uTime) * 0.02;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uAudioLevel;

    void main() {
      vec2 uv = vUv;
      
      // Visual center of the galaxy in the image
      vec2 center = vec2(0.5, 0.52); 
      
      // Perspective ratio of the hologram table (it's very flat)
      float perspectiveY = 0.25; 
      
      vec2 delta = uv - center;
      
      // Un-squash the Y axis to calculate true circular distance in the 3D plane
      delta.y /= perspectiveY;
      float dist = length(delta);
      
      // Radius of the rotating galaxy
      float radius = 0.45;
      
      if (dist < radius) {
          // Smooth falloff so the rotating center blends seamlessly into the static base
          float falloff = smoothstep(radius, radius * 0.4, dist);
          
          // Rotation angle: continuous slow spin + audio reactivity
          float angle = (uTime * 0.8 + uAudioLevel * 2.5) * falloff;
          
          float s = sin(angle);
          float c = cos(angle);
          
          // Rotate
          vec2 rotatedDelta = vec2(
              delta.x * c - delta.y * s,
              delta.x * s + delta.y * c
          );
          
          // Squash back to perspective
          rotatedDelta.y *= perspectiveY;
          uv = center + rotatedDelta;
      }
      
      vec4 color = texture2D(uTexture, uv);
      
      // Audio-reactive pulsing core glow
      float coreGlow = smoothstep(radius * 0.6, 0.0, dist);
      color.rgb += vec3(0.0, 0.8, 1.0) * uAudioLevel * 0.4 * coreGlow;
      
      gl_FragColor = color;
    }
  `
};

function HologramMesh({ mouthOpeningRef, textureUrl }: HologramMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useLoader(THREE.TextureLoader, textureUrl);

  // Approximate aspect ratio of the ultra-wide image
  const planeW = 14;
  const planeH = planeW * (522 / 1400); // Guessed aspect ratio for wide image

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;
    const time = state.clock.getElapsedTime();
    const audioLvl = mouthOpeningRef.current;

    // Update shader uniforms
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uAudioLevel.value = audioLvl;

    // Very subtle floating parallax for the whole scene
    meshRef.current.position.y = Math.sin(time * 1.2) * 0.1;
    meshRef.current.position.x = Math.cos(time * 0.7) * 0.05;
    meshRef.current.rotation.y = Math.sin(time * 0.5) * 0.02;
    meshRef.current.rotation.x = Math.cos(time * 0.6) * 0.01;
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[planeW, planeH, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        args={[HologramShaderMaterial]}
        uniforms-uTexture-value={texture}
        transparent={true}
      />
    </mesh>
  );
}

export default function HologramAvatar3D({ mouthOpeningRef, textureUrl }: HologramMeshProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center bg-black">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <HologramMesh mouthOpeningRef={mouthOpeningRef} textureUrl={textureUrl} />
      </Canvas>
    </div>
  );
}
