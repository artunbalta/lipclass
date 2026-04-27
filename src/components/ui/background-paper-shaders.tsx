"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    
    vec3 pos = position;
    pos.y += sin(pos.x * 10.0 + time) * 0.1 * intensity;
    pos.x += cos(pos.y * 8.0 + time * 1.5) * 0.05 * intensity;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform float intensity;
  uniform vec3 color1;
  uniform vec3 color2;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vec2 uv = vUv;
    
    float noise = sin(uv.x * 20.0 + time) * cos(uv.y * 15.0 + time * 0.8);
    noise += sin(uv.x * 35.0 - time * 2.0) * cos(uv.y * 25.0 + time * 1.2) * 0.5;
    
    vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
    color = mix(color, vec3(1.0), pow(abs(noise), 2.0) * intensity);
    
    float glow = 1.0 - length(uv - 0.5) * 2.0;
    glow = pow(glow, 2.0);
    
    gl_FragColor = vec4(color * glow, glow * 0.8);
  }
`;

export function ShaderPlane({
  position,
  scale = 1.6,
  color1 = "#4f46e5",
  color2 = "#0f172a",
}: {
  position: [number, number, number];
  scale?: number;
  color1?: string;
  color2?: string;
}) {
  const mesh = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      intensity: { value: 1.0 },
      color1: { value: new THREE.Color(color1) },
      color2: { value: new THREE.Color(color2) },
    }),
    [color1, color2],
  );

  useFrame((state) => {
    if (mesh.current) {
      uniforms.time.value = state.clock.elapsedTime;
      uniforms.intensity.value = 1.0 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  return (
    <mesh ref={mesh} position={position} scale={scale}>
      <planeGeometry args={[2, 2, 32, 32]} />
      <shaderMaterial
        uniforms={uniforms as unknown as { [key: string]: THREE.IUniform }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function PaperScene() {
  return <ShaderPlane position={[0, 0, 0]} scale={1.8} color1="#4f46e5" color2="#020617" />;
}

/**
 * Arka plan WebGL, trial gibi bölümlerin altında, içerik pointer-events alır.
 */
export function PaperShadersBackground({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 2.4], fov: 45, near: 0.1, far: 20 }}
        className="h-full w-full"
      >
        <PaperScene />
      </Canvas>
    </div>
  );
}
