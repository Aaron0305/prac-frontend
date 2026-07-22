"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

interface WireframeHeadProps {
    isDark: boolean;
}

interface ParticleState {
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    scale: number;
    life: number;
    maxLife: number;
    rot: THREE.Vector3;
    rotSpeed: THREE.Vector3;
}

export default function WireframeHead({ isDark }: WireframeHeadProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // --- 1. Basic Scene Setup ---
        const width = containerRef.current.clientWidth || window.innerWidth;
        const height = containerRef.current.clientHeight || window.innerHeight;

        const scene = new THREE.Scene();
        
        // Transparent scene so we can see the custom CSS radial background
        scene.background = null;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 5.5);

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 0); // Transparent background
        containerRef.current.appendChild(renderer.domElement);

        // --- 2. Head Geometry Deformation (Sphere to Profile) ---
        const R = 1.9; // Radius
        const rows = 45;
        const cols = 55;

        const vertices: THREE.Vector3[] = [];
        const colors: THREE.Color[] = [];

        for (let i = 0; i <= rows; i++) {
            const phi = (i / rows) * Math.PI;
            for (let j = 0; j <= cols; j++) {
                const theta = (j / cols) * 2 * Math.PI;

                // Spherical coordinates
                const nx = Math.sin(phi) * Math.cos(theta);
                const ny = Math.cos(phi);
                const nz = Math.sin(phi) * Math.sin(theta);

                const t = ny; // Height ratio [-1, 1]

                // Detailed face profile curve factor P(t)
                let profile = 1.0;
                if (t > 0.6) {
                    profile = 1.0; // Top skull
                } else if (t > 0.45) {
                    const u = (t - 0.45) / 0.15;
                    profile = 1.0 + 0.05 * Math.sin(u * Math.PI); // Forehead/brow ridge
                } else if (t > 0.3) {
                    const u = (t - 0.3) / 0.15;
                    profile = 0.94 + 0.06 * u; // Eye socket
                } else if (t > 0.0) {
                    const u = (t - 0.0) / 0.3;
                    profile = 1.25 - 0.25 * u; // Nose tip / upper nose
                } else if (t > -0.12) {
                    const u = (t - (-0.12)) / 0.12;
                    profile = 0.94 + 0.31 * u; // Nose base
                } else if (t > -0.2) {
                    const u = (t - (-0.2)) / 0.08;
                    profile = 0.93 + 0.01 * Math.sin(u * Math.PI); // Philtrum
                } else if (t > -0.26) {
                    const u = (t - (-0.26)) / 0.06;
                    profile = 0.96 + 0.02 * Math.sin(u * Math.PI); // Upper lip
                } else if (t > -0.32) {
                    const u = (t - (-0.32)) / 0.06;
                    profile = 0.93 + 0.03 * u; // Mouth cleft
                } else if (t > -0.38) {
                    const u = (t - (-0.38)) / 0.06;
                    profile = 0.96 + 0.01 * Math.sin(u * Math.PI); // Lower lip
                } else if (t > -0.45) {
                    const u = (t - (-0.45)) / 0.07;
                    profile = 0.93 + 0.03 * u; // Chin cleft
                } else if (t > -0.6) {
                    const u = (t - (-0.6)) / 0.15;
                    profile = 1.01 + 0.04 * Math.sin(u * Math.PI); // Chin
                } else {
                    const u = (t - (-1.0)) / 0.4;
                    profile = 0.74 + 0.22 * u; // Neck front
                }

                let R_deformed = R;
                // Deform the sphere radius only on the front hemisphere (x > 0)
                if (nx > 0) {
                    const cosTheta = Math.cos(theta);
                    // Power of 5 concentrates deformation on the front centerline
                    const fade = Math.pow(cosTheta, 5);
                    R_deformed = R * (1.0 + (profile - 1.0) * fade);
                }

                const vx = R_deformed * nx;
                const vy = R_deformed * ny;
                // Scale Z to make the head narrower ear-to-ear (skull proportions)
                const vz = R_deformed * nz * 0.72;

                const v = new THREE.Vector3(vx, vy, vz);
                vertices.push(v);

                // --- Vertex Colors (Lines fade to black towards the back) ---
                const color = new THREE.Color();
                // Fade factor: 1.0 at front (+1.5), 0.0 at back (-1.3)
                const fadeX = Math.max(0, Math.min(1, (vx + 1.2) / 2.0));

                if (isDark) {
                    // Dark mode: Bright neon cyan/blue
                    const baseColor = new THREE.Color(0x00f0ff);
                    color.copy(baseColor).multiplyScalar(fadeX);
                } else {
                    // Light mode: Rich royal blue
                    const baseColor = new THREE.Color(0x1d4ed8);
                    color.copy(baseColor).multiplyScalar(fadeX);
                }
                colors.push(color);
            }
        }

        // --- 3. Build Quad-Grid Indices ---
        const lineIndices: number[] = [];
        for (let i = 0; i <= rows; i++) {
            for (let j = 0; j <= cols; j++) {
                const idx = i * (cols + 1) + j;

                // Horizontal connections (wrap around sphere)
                const rightIdx = (j < cols) ? (idx + 1) : (i * (cols + 1));
                lineIndices.push(idx, rightIdx);

                // Vertical connections (to bottom row)
                if (i < rows) {
                    const bottomIdx = idx + (cols + 1);
                    lineIndices.push(idx, bottomIdx);
                }
            }
        }

        // Create Face Geometry
        const faceGeometry = new THREE.BufferGeometry();
        const positionArray = new Float32Array(vertices.length * 3);
        const colorArray = new Float32Array(colors.length * 3);

        for (let k = 0; k < vertices.length; k++) {
            positionArray[k * 3] = vertices[k].x;
            positionArray[k * 3 + 1] = vertices[k].y;
            positionArray[k * 3 + 2] = vertices[k].z;

            colorArray[k * 3] = colors[k].r;
            colorArray[k * 3 + 1] = colors[k].g;
            colorArray[k * 3 + 2] = colors[k].b;
        }

        faceGeometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));
        faceGeometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));
        faceGeometry.setIndex(lineIndices);

        const faceMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.85
        });

        const wireframeMesh = new THREE.LineSegments(faceGeometry, faceMaterial);

        // Group to handle rotation and responsive position
        const headGroup = new THREE.Group();
        headGroup.add(wireframeMesh);
        scene.add(headGroup);

        // --- 4. Particle System (Dissolving Cubes) ---
        // Collect vertices from the back/middle of the head (x < 0.5) to spawn particles
        const spawnVertices = vertices.filter(v => v.x < 0.5 && v.x > -R);
        const particleCount = 200;
        const particles: ParticleState[] = [];

        const resetParticle = (p: ParticleState): ParticleState => {
            const spawnPos = spawnVertices[Math.floor(Math.random() * spawnVertices.length)];
            
            p.pos = (spawnPos ? spawnPos.clone() : new THREE.Vector3(-1.0, 0, 0));
            
            // Particles fly mainly left (negative X) with slight random drifts
            const speedX = 0.012 + Math.random() * 0.022;
            const speedY = -0.008 + Math.random() * 0.016;
            const speedZ = -0.008 + Math.random() * 0.016;
            p.vel = new THREE.Vector3(-speedX, speedY, speedZ);

            p.scale = 0.3 + Math.random() * 0.6;
            p.maxLife = 90 + Math.random() * 110;
            p.life = p.maxLife;

            p.rot = new THREE.Vector3(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            p.rotSpeed = new THREE.Vector3(
                (Math.random() - 0.5) * 0.03,
                (Math.random() - 0.5) * 0.03,
                (Math.random() - 0.5) * 0.03
            );
            return p;
        };

        // Initialize particles
        for (let k = 0; k < particleCount; k++) {
            particles.push(resetParticle({} as ParticleState));
        }

        // Instanced Mesh for high-performance cube rendering
        const cubeGeo = new THREE.BoxGeometry(0.065, 0.065, 0.065);
        const cubeMat = new THREE.MeshBasicMaterial({
            color: isDark ? 0x00d2ff : 0x1d4ed8,
            transparent: true,
            opacity: 0.95
        });
        const instancedMesh = new THREE.InstancedMesh(cubeGeo, cubeMat, particleCount);
        headGroup.add(instancedMesh);

        // --- 5. Post-Processing Setup (Neon Bloom Effect) ---
        const composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        // UnrealBloomPass parameters: (resolution, strength, radius, threshold)
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            1.45,  // Bloom strength (glow intensity)
            0.35,  // Bloom radius
            0.15   // Threshold (only bright objects glow)
        );
        composer.addPass(bloomPass);

        const outputPass = new OutputPass();
        composer.addPass(outputPass);

        // --- 6. Interactivity & Parallax ---
        const mouse = { x: 0, y: 0 };
        const targetRotation = { x: 0, y: 0 };

        const onMouseMove = (event: MouseEvent) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener("mousemove", onMouseMove);

        // --- 7. Responsive Positioning ---
        const handleResize = () => {
            const w = containerRef.current?.clientWidth || window.innerWidth;
            const h = containerRef.current?.clientHeight || window.innerHeight;

            camera.aspect = w / h;
            camera.updateProjectionMatrix();

            renderer.setSize(w, h);
            composer.setSize(w, h);
            bloomPass.setSize(w, h);

            if (w >= 1024) {
                // Desktop: Shift head to the right side
                headGroup.position.set(1.3, 0, 0);
                camera.position.z = 5.2;
            } else {
                // Mobile: Center the head
                headGroup.position.set(0, 0, 0);
                camera.position.z = 6.0;
            }
        };
        window.addEventListener("resize", handleResize);
        
        // Trigger once immediately to set initial position
        handleResize();

        // --- 8. Animation Loop ---
        let animationFrameId: number;
        const dummy = new THREE.Object3D();
        const pColor = new THREE.Color();
        const baseColor = isDark ? new THREE.Color(0x00f0ff) : new THREE.Color(0x1d4ed8);

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            // Smooth Lerp Rotation for Parallax
            targetRotation.x = mouse.y * 0.16; // Pitch (up/down)
            targetRotation.y = mouse.x * 0.28; // Yaw (left/right)

            headGroup.rotation.x += (targetRotation.x - headGroup.rotation.x) * 0.045;
            headGroup.rotation.y += (targetRotation.y - headGroup.rotation.y) * 0.045;

            // Update particles
            for (let k = 0; k < particleCount; k++) {
                const p = particles[k];
                p.pos.add(p.vel);
                p.rot.add(p.rotSpeed);
                p.life -= 1.0;

                if (p.life <= 0) {
                    resetParticle(p);
                }

                const pct = p.life / p.maxLife; // 1.0 down to 0.0

                dummy.position.copy(p.pos);
                dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);

                const currentScale = p.scale * pct;
                dummy.scale.set(currentScale, currentScale, currentScale);

                dummy.updateMatrix();
                instancedMesh.setMatrixAt(k, dummy.matrix);

                // Fade particles out in color as they die
                pColor.copy(baseColor).multiplyScalar(pct);
                instancedMesh.setColorAt(k, pColor);
            }

            instancedMesh.instanceMatrix.needsUpdate = true;
            if (instancedMesh.instanceColor) {
                instancedMesh.instanceColor.needsUpdate = true;
            }

            // Render scene via post-processing composer for the neon bloom glow
            composer.render();
        };

        animate();

        // --- 9. Clean-up ---
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationFrameId);

            // Dispose Geometries
            faceGeometry.dispose();
            cubeGeo.dispose();

            // Dispose Materials
            faceMaterial.dispose();
            cubeMat.dispose();

            // Dispose Post-processing
            bloomPass.dispose();
            renderer.dispose();

            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }
        };
    }, [isDark]);

    return (
        <div 
            ref={containerRef} 
            className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden" 
        />
    );
}
