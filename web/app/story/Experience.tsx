"use client";

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Mutable, not React state — scroll position updates at frame rate and
// routing it through setState would re-render on every scroll tick.
const scrollProgress = { value: 0 };

type Shot = { pos: [number, number, number]; look: [number, number, number] };

// One shot per narrative section below. CameraRig lerps between the pair
// bracketing the current scroll progress.
const SHOTS: Shot[] = [
  { pos: [0, 1.4, 11], look: [0, 1.2, 0] }, // hero: wide view of a corridor of shut doors
  { pos: [0, 1.4, 8], look: [0, 1.2, -2] }, // the scale of it
  { pos: [0, 1.3, 5], look: [0, 1.2, -4] }, // the one door that matters comes into focus
  { pos: [0, 1.2, 2.4], look: [0, 1.2, -6] }, // right up against it
  { pos: [0, 1.2, -1.5], look: [0, 1.2, -8] }, // through the doorway, into the light
];

function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  const lookTarget = useMemo(() => new THREE.Vector3(...SHOTS[0].look), []);

  useFrame(() => {
    const progress = reducedMotion ? 0.98 : scrollProgress.value;
    const span = SHOTS.length - 1;
    const scaled = Math.min(span - 1e-4, Math.max(0, progress * span));
    const i = Math.floor(scaled);
    const f = scaled - i;
    const eased = f * f * (3 - 2 * f); // smoothstep

    const pos = lerpVec3(SHOTS[i].pos, SHOTS[i + 1].pos, eased);
    const look = lerpVec3(SHOTS[i].look, SHOTS[i + 1].look, eased);

    camera.position.lerp(new THREE.Vector3(...pos), reducedMotion ? 1 : 0.08);
    lookTarget.lerp(new THREE.Vector3(...look), reducedMotion ? 1 : 0.08);
    camera.lookAt(lookTarget);
  });

  return null;
}

function DoorFrame({
  position,
  dim = true,
}: {
  position: [number, number, number];
  dim?: boolean;
}) {
  const color = dim ? "#454e59" : "#c99a52";
  const emissive = dim ? "#1a1f26" : "#c99a52";
  return (
    <group position={position}>
      {/* left/right posts + lintel — a simple frame, not a modeled asset */}
      <mesh position={[-0.9, 1.2, 0]}>
        <boxGeometry args={[0.12, 2.4, 0.12]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={dim ? 0.4 : 0.15} />
      </mesh>
      <mesh position={[0.9, 1.2, 0]}>
        <boxGeometry args={[0.12, 2.4, 0.12]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={dim ? 0.4 : 0.15} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[1.92, 0.12, 0.12]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={dim ? 0.4 : 0.15} />
      </mesh>
    </group>
  );
}

function FeatureDoor({ reducedMotion }: { reducedMotion: boolean }) {
  const hingeRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Reads scroll progress directly every frame — like CameraRig — rather
  // than through React state derived inside another component's useFrame,
  // which doesn't reliably propagate at frame rate.
  useFrame(() => {
    const progress = reducedMotion ? 1 : scrollProgress.value;
    const openAmount = Math.min(1, Math.max(0, (progress - 0.75) / 0.25));
    const eased = openAmount * openAmount * (3 - 2 * openAmount);

    if (hingeRef.current) {
      hingeRef.current.rotation.y = -eased * (Math.PI / 1.9);
    }
    if (lightRef.current) {
      lightRef.current.intensity = eased * 18;
    }
  });

  return (
    <group position={[0, 0, -6]}>
      <DoorFrame position={[0, 0, 0]} dim={false} />
      {/* hinge on the left post; panel offset so it swings around that edge */}
      <group ref={hingeRef} position={[-0.84, 0, 0]}>
        <mesh position={[0.42, 1.2, 0.02]}>
          <boxGeometry args={[0.84, 2.3, 0.06]} />
          <meshStandardMaterial color="#8a6a3a" roughness={0.6} />
        </mesh>
      </group>
      <pointLight ref={lightRef} position={[0, 1.2, -1.5]} intensity={0} distance={12} color="#ffd9a0" />
    </group>
  );
}

function BackgroundDoors() {
  const positions: [number, number, number][] = [];
  for (let row = -1; row <= 1; row++) {
    for (let depth = 0; depth < 3; depth++) {
      if (row === 0 && depth === 2) continue; // leave center-far clear for the feature door
      positions.push([row * 2.6, 0, -1 - depth * 2.2]);
    }
  }
  return (
    <>
      {positions.map((p, i) => (
        <DoorFrame key={i} position={p} dim />
      ))}
    </>
  );
}

// Computed once at module load, not during render — a stable prop for the
// component below, not regenerated (or flagged as impure) on each render.
const PARTICLE_COUNT = 1500;
const PARTICLE_POSITIONS = (() => {
  const arr = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 30;
    arr[i * 3 + 1] = Math.random() * 8;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
  }
  return arr;
})();

function ScaleParticles() {
  const positions = PARTICLE_POSITIONS;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#5a6472" transparent opacity={0.5} />
    </points>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#14171c" roughness={0.95} />
    </mesh>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("ErrorBoundary caught:", error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <CameraRig reducedMotion={reducedMotion} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#3a4a5a", "#0a0806", 0.6]} />
      <directionalLight position={[3, 6, 4]} intensity={0.5} />
      <Ground />
      <BackgroundDoors />
      <FeatureDoor reducedMotion={reducedMotion} />
      <ScaleParticles />
    </>
  );
}

const SECTIONS = [
  {
    eyebrow: "Accessibility & Health",
    title: "63 million people in India live with a disability.",
    body: "Almost all of them are entitled to real support — pensions, transport concessions, free assistive devices, education and job quotas.",
  },
  {
    eyebrow: "The barrier isn't the benefits",
    title: "90% don't know the certificate that unlocks them exists.",
    body: "60% haven't even heard of the UDID card itself. The money and the infrastructure are already there.",
  },
  {
    eyebrow: "Since September 2024",
    title: "One certificate is now mandatory for all of it.",
    body: "Pension. Transport. Devices. Reservations. Every other benefit is locked behind this single door.",
  },
  {
    eyebrow: "Sugam",
    title: "We built the front door.",
    body: "A conversational guide that turns a confusing government process into a plain-language checklist — in English or Hindi.",
  },
  {
    eyebrow: "Get started",
    title: "Describe your situation. Get your checklist.",
    body: "Free, in minutes, no diagnosis made — just a map through a process that already exists.",
    cta: true,
  },
];

export default function Experience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
      onUpdate: (self) => {
        scrollProgress.value = self.progress;
      },
    });

    const refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 400);

    return () => {
      trigger.kill();
      clearTimeout(refreshTimer);
    };
  }, [reducedMotion]);

  const canvas = (
    <ErrorBoundary fallback={<div className="w-full h-full bg-[#0c0e12]" />}>
      <Canvas dpr={[1, 1.75]} camera={{ fov: 50 }}>
        <Scene reducedMotion={reducedMotion} />
      </Canvas>
    </ErrorBoundary>
  );

  if (reducedMotion) {
    // No scroll-driven camera here, so there's no need for a viewport-fixed
    // backdrop (which only ever covers one viewport's worth of a taller
    // page). A solid dark wrapper guarantees no gap shows through below the
    // hero, regardless of how tall the section stack ends up being.
    return (
      <div className="bg-[#0c0e12] min-h-screen">
        <div className="h-screen">{canvas}</div>
        <div className="relative z-10 -mt-[40vh]">
          {SECTIONS.map((s, i) => (
            <section key={i} className="px-6 py-16 max-w-xl mx-auto">
              <div className="max-w-xl bg-black/30 backdrop-blur-sm rounded-2xl p-6 sm:p-8">
                <p className="text-sm tracking-wide uppercase text-amber-300/90 font-medium mb-3">
                  {s.eyebrow}
                </p>
                <h2 className="text-2xl sm:text-4xl font-semibold text-white text-balance mb-4">
                  {s.title}
                </h2>
                <p className="text-white/75 text-base sm:text-lg leading-relaxed text-pretty">
                  {s.body}
                </p>
                {s.cta && (
                  <Link
                    href="/navigator"
                    className="inline-block mt-6 rounded-full bg-amber-400 text-black font-semibold px-6 py-3 hover:bg-amber-300 transition-colors"
                  >
                    Open the door →
                  </Link>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative" style={{ height: "500vh" }}>
      <div className="fixed inset-0 z-0 bg-[#0c0e12]">{canvas}</div>

      <div className="relative z-10 h-full">
        {SECTIONS.map((s, i) => (
          <section key={i} className="h-screen flex items-center px-6 sm:px-16">
            <div className="max-w-xl bg-black/30 backdrop-blur-sm rounded-2xl p-6 sm:p-8">
              <p className="text-sm tracking-wide uppercase text-amber-300/90 font-medium mb-3">
                {s.eyebrow}
              </p>
              <h2 className="text-2xl sm:text-4xl font-semibold text-white text-balance mb-4">
                {s.title}
              </h2>
              <p className="text-white/75 text-base sm:text-lg leading-relaxed text-pretty">
                {s.body}
              </p>
              {s.cta && (
                <Link
                  href="/navigator"
                  className="inline-block mt-6 rounded-full bg-amber-400 text-black font-semibold px-6 py-3 hover:bg-amber-300 transition-colors"
                >
                  Open the door →
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
