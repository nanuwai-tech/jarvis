"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HologramMeshProps {
  mouthOpeningRef: React.MutableRefObject<number>;
}

function AnimatedGalaxy({ mouthOpeningRef }: HologramMeshProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const parameters = {
    count: 35000,
    size: 0.03,
    radius: 4.5,
    branches: 5,
    spin: 1.2,
    randomness: 0.35,
    randomnessPower: 3,
    insideColor: new THREE.Color("#00ffff"), // Bright cyan core
    outsideColor: new THREE.Color("#0044ff"), // Deep blue outer arms
  };

  const [geometry, material] = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const scales = new Float32Array(parameters.count * 1);

    for (let i = 0; i < parameters.count; i++) {
      const i3 = i * 3;

      const radius = Math.random() * parameters.radius;
      const spinAngle = radius * parameters.spin;
      const branchAngle = ((i % parameters.branches) / parameters.branches) * Math.PI * 2;

      const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
      const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
      const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

      positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

      const mixedColor = parameters.insideColor.clone();
      mixedColor.lerp(parameters.outsideColor, radius / parameters.radius);

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      scales[i] = Math.random();
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

    const material = new THREE.ShaderMaterial({
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uAudio: { value: 0 },
        uSize: { value: 25.0 * (typeof window !== "undefined" ? window.devicePixelRatio : 1) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uAudio;
        uniform float uSize;
        attribute float aScale;
        varying vec3 vColor;
        
        void main() {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          
          float distanceToCenter = length(modelPosition.xz);
          
          // Audio reactivity: expand and throb the Y axis slightly
          modelPosition.y += sin(distanceToCenter * 4.0 - uTime * 3.0) * uAudio * 0.4;
          
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectedPosition = projectionMatrix * viewPosition;
          
          gl_Position = projectedPosition;
          
          // Point size pulses with audio
          gl_PointSize = uSize * aScale * (1.0 + uAudio * 1.5);
          gl_PointSize *= (1.0 / -viewPosition.z); // Size attenuation
          
          vColor = color;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uAudio;
        
        void main() {
          // Soft circular particle
          float strength = distance(gl_PointCoord, vec2(0.5));
          strength = 1.0 - strength;
          strength = pow(strength, 4.0); // Make it a glowing dot
          
          // Audio boost brightness
          vec3 finalColor = vColor * (1.0 + uAudio * 2.5);
          
          gl_FragColor = vec4(finalColor, strength);
        }
      `
    });

    return [geometry, material];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime();
    const audioLvl = mouthOpeningRef.current;

    // Slowly rotate the entire galaxy
    pointsRef.current.rotation.y = time * 0.15 + (audioLvl * 0.2); // Spin slightly faster when talking
    
    // Tilt to match the perspective of the table in the background image
    pointsRef.current.rotation.x = 1.25; 
    
    // Shift slightly down to align with the physical table in the image
    pointsRef.current.position.y = -0.5;

    // Pass uniforms
    material.uniforms.uTime.value = time;
    material.uniforms.uAudio.value = audioLvl;
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}

export default function HologramAvatar3D({ mouthOpeningRef }: HologramMeshProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
      <Canvas
        camera={{ position: [0, 2, 8], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
      >
        <AnimatedGalaxy mouthOpeningRef={mouthOpeningRef} />
      </Canvas>
    </div>
  );
}
