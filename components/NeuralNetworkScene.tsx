"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// --- Node Component ---
function Node({
  position,
  color,
  pulseDelay = 0,
}: {
  position: THREE.Vector3;
  color: string;
  pulseDelay?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.8 + pulseDelay;
    const scale = 1 + Math.sin(t) * 0.18;
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(scale * 2.0);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.12 + Math.sin(t) * 0.08;
    }
  });

  return (
    <group position={position}>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.085, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {/* Core node */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.06, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>
    </group>
  );
}

// --- Signal particle traveling along dynamic edge ---
function Signal({
  getStart,
  getEnd,
  color,
  speed,
  offset,
}: {
  getStart: () => THREE.Vector3;
  getEnd: () => THREE.Vector3;
  color: string;
  speed: number;
  offset: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * speed + offset) % 1;
    const start = getStart();
    const end = getEnd();
    const pos = new THREE.Vector3().lerpVectors(start, end, t);
    ref.current.position.copy(pos);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.03, 10, 10]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}

// --- Dynamic Line Component ---
function DynamicLine({
  getStart,
  getEnd,
  color,
}: {
  getStart: () => THREE.Vector3;
  getEnd: () => THREE.Vector3;
  color: string;
}) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  useFrame(() => {
    if (!geometryRef.current) return;
    const start = getStart();
    const end = getEnd();
    const positions = new Float32Array([
      start.x, start.y, start.z,
      end.x, end.y, end.z,
    ]);
    geometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
  });

  return (
    <line>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial color={color} transparent opacity={0.22} linewidth={1} />
    </line>
  );
}

// --- Orbiting Particles Ring ---
function OrbitingRing({ color }: { color: string }) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 60;

  const [positions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 2.5 + Math.random() * 0.7;
      const angle = (i / count) * Math.PI * 2;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.4;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return [pos];
  }, [count]);

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;
    const t = clock.getElapsedTime() * 0.15;
    particlesRef.current.rotation.y = t;
    particlesRef.current.rotation.z = Math.sin(t * 0.2) * 0.15;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color={color}
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// --- Main scene ---
function NetworkGraph() {
  const groupRef = useRef<THREE.Group>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Base Layer positions: Input(4) → Hidden1(5) → Hidden2(4) → Output(2)
  const baseLayers = useMemo(
    () => [
      [
        [-2.2, 1.4, 0],
        [-2.2, 0.55, 0.2],
        [-2.2, -0.35, -0.2],
        [-2.2, -1.25, 0],
      ],
      [
        [-0.7, 1.8, 0.3],
        [-0.7, 0.95, -0.3],
        [-0.7, 0.1, 0.3],
        [-0.7, -0.8, -0.3],
        [-0.7, -1.6, 0.2],
      ],
      [
        [0.7, 1.4, -0.2],
        [0.7, 0.45, 0.3],
        [0.7, -0.45, -0.3],
        [0.7, -1.4, 0.2],
      ],
      [
        [2.2, 0.55, 0.1],
        [2.2, -0.55, -0.1],
      ],
    ] as [number, number, number][][],
    []
  );

  // Live node positions
  const currentPositionsRef = useRef<THREE.Vector3[][]>(
    baseLayers.map((layer) => layer.map((pos) => new THREE.Vector3(...pos)))
  );

  // Colors
  const nodeColors = ["#D97757", "#E8A87C", "#C96644", "#F0C4A0"];
  const edgeColor = "#D97757";
  const signalColor = "#F5A87D";

  // Build edge mappings
  const edgeIndices = useMemo(() => {
    const indices: { from: [number, number]; to: [number, number] }[] = [];
    for (let li = 0; li < baseLayers.length - 1; li++) {
      for (let fi = 0; fi < baseLayers[li].length; fi++) {
        for (let ti = 0; ti < baseLayers[li + 1].length; ti++) {
          indices.push({ from: [li, fi], to: [li + 1, ti] });
        }
      }
    }
    return indices;
  }, [baseLayers]);

  // Track mouse movement for subtle tilt
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 1.5,
        y: (e.clientY / window.innerHeight - 0.5) * 1.5,
      };
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Update dynamic node positions & group rotation every frame
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // Floating wave effect for each node
    baseLayers.forEach((layer, li) => {
      layer.forEach((basePos, ni) => {
        const offset = li * 1.1 + ni * 0.6;
        // Velocidad de la ola reducida para mayor suavidad
        const dx = Math.sin(t * 0.5 + offset) * 0.08;
        const dy = Math.cos(t * 0.6 + offset) * 0.12;
        const dz = Math.sin(t * 0.4 + offset * 0.5) * 0.10;

        currentPositionsRef.current[li][ni].set(
          basePos[0] + dx,
          basePos[1] + dy,
          basePos[2] + dz
        );
      });
    });

    // Group rotation & tilt & entry animation
    if (groupRef.current) {
      // Animación de entrada suave
      groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 3.5);

      // Rotación más lenta y suave
      groupRef.current.rotation.y = t * 0.1 + mouseRef.current.x * 0.1;
      groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.1 + mouseRef.current.y * 0.1;
      groupRef.current.rotation.z = Math.cos(t * 0.15) * 0.05;
    }
  });

  return (
    <group ref={groupRef} scale={[0.01, 0.01, 0.01]}>
      {/* Orbiting data particles */}
      <OrbitingRing color={signalColor} />

      {/* Dynamic Connections */}
      {edgeIndices.map((edge, i) => (
        <DynamicLine
          key={`edge-${i}`}
          getStart={() => currentPositionsRef.current[edge.from[0]][edge.from[1]]}
          getEnd={() => currentPositionsRef.current[edge.to[0]][edge.to[1]]}
          color={edgeColor}
        />
      ))}

      {/* Signal Particles travelling across connections */}
      {edgeIndices.map((edge, i) => (
        <Signal
          key={`signal-${i}`}
          getStart={() => currentPositionsRef.current[edge.from[0]][edge.from[1]]}
          getEnd={() => currentPositionsRef.current[edge.to[0]][edge.to[1]]}
          color={signalColor}
          speed={0.15 + (i % 5) * 0.04}
          offset={(i * 0.25) % 1}
        />
      ))}

      {/* Dynamic Nodes */}
      {baseLayers.map((layer, li) =>
        layer.map((_, ni) => (
          <Node
            key={`node-${li}-${ni}`}
            position={currentPositionsRef.current[li][ni]}
            color={nodeColors[li % nodeColors.length]}
            pulseDelay={li * 0.5 + ni * 0.3}
          />
        ))
      )}
    </group>
  );
}

export default function NeuralNetworkScene() {
  return (
    <div className="w-full h-full" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 8.5], fov: 50 }}
        style={{ background: "transparent" }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1.6} color="#D97757" />
        <pointLight position={[-5, -3, 3]} intensity={0.8} color="#784F3A" />
        <NetworkGraph />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={0.5}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}
