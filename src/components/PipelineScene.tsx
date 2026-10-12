"use client";

import { Grid, OrbitControls, QuadraticBezierLine, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { AGENTS } from "@/lib/agents";
import type { AgentId } from "@/lib/types";

export type NodeState = "idle" | "running" | "done" | "failed";
type NodeId = AgentId | "deal" | "docs" | "advisor";

interface SceneNode {
  id: NodeId;
  label: string;
  layer: number;
  calc?: boolean;
}

const NODES: SceneNode[] = [
  { id: "deal", label: "Deal inputs", layer: 0 },
  { id: "docs", label: "Documents", layer: 0 },
  ...AGENTS.map((a) => ({ id: a.id, label: a.short, layer: a.layer, calc: a.kind === "calculation" })),
  { id: "advisor", label: "Advisor chat", layer: 5 },
];

const EDGES: [NodeId, NodeId][] = [
  ...AGENTS.flatMap((a) =>
    a.parents.flatMap((p): [NodeId, NodeId][] => (p === "inputs" ? [["deal", a.id], ["docs", a.id]] : [[p, a.id]])),
  ),
  ["decision", "advisor"],
];

const SPACING = 2.05;
const LAYER_GAP = 2.1;

function positionsFor() {
  const byLayer = new Map<number, SceneNode[]>();
  NODES.forEach((n) => byLayer.set(n.layer, [...(byLayer.get(n.layer) ?? []), n]));
  const pos = {} as Record<NodeId, THREE.Vector3>;
  for (const [layer, nodes] of byLayer) {
    nodes.forEach((n, i) => {
      pos[n.id] = new THREE.Vector3((i - (nodes.length - 1) / 2) * SPACING, 0, -5.2 + layer * LAYER_GAP);
    });
  }
  return pos;
}

interface Palette {
  idle: string;
  running: string;
  done: string;
  failed: string;
  edge: string;
  grid: string;
  section: string;
}

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    idle: v("--line-strong", "#cdc6b8"),
    running: v("--series-1", "#2a78d6"),
    done: v("--brand", "#1f4e8c"),
    failed: v("--critical", "#d03b3b"),
    edge: v("--line-strong", "#cdc6b8"),
    grid: v("--line", "#e3ded4"),
    section: v("--line-strong", "#cdc6b8"),
  };
}

function NodeMesh({ node, state, position, palette, reduced }: { node: SceneNode; state: NodeState; position: THREE.Vector3; palette: Palette; reduced: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = state === "running" ? palette.running : state === "done" ? palette.done : state === "failed" ? palette.failed : palette.idle;

  useFrame(({ clock }, delta) => {
    if (!mesh.current || !material.current) return;
    const t = clock.elapsedTime;
    const lifted = state === "running" ? 0.32 : state === "done" ? 0.1 : 0;
    const bob = state === "running" && !reduced ? Math.sin(t * 4 + position.x) * 0.05 : 0;
    mesh.current.position.y = THREE.MathUtils.damp(mesh.current.position.y, lifted + bob, 8, delta);
    const glow = state === "running" ? (reduced ? 0.5 : 0.35 + 0.25 * Math.sin(t * 5)) : state === "done" ? 0.12 : 0;
    material.current.emissiveIntensity = glow;
  });

  return (
    <group position={position}>
      <RoundedBox ref={mesh} args={node.calc ? [1.5, 0.22, 0.8] : [1.75, 0.3, 0.95]} radius={0.07} smoothness={3}>
        <meshStandardMaterial ref={material} color={color} emissive={color} roughness={0.55} metalness={0.05} transparent opacity={state === "idle" ? 0.55 : 1} />
      </RoundedBox>
    </group>
  );
}

function Packets({ from, to, color, reduced }: { from: THREE.Vector3; to: THREE.Vector3; color: string; reduced: boolean }) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.9, 0));
    return new THREE.QuadraticBezierCurve3(from.clone().setY(0.2), mid, to.clone().setY(0.2));
  }, [from, to]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.55;
    a.current?.position.copy(curve.getPoint(t % 1));
    b.current?.position.copy(curve.getPoint((t + 0.5) % 1));
  });
  if (reduced) return null;
  return (
    <>
      <mesh ref={a}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={b}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}

function placeLabel(el: HTMLDivElement | null | undefined, x: number, y: number, visible: boolean) {
  if (!el) return;
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  el.style.visibility = visible ? "visible" : "hidden";
}

type LabelRefs = RefObject<Partial<Record<NodeId, HTMLDivElement | null>>>;

function Scene({
  states,
  interactive,
  reduced,
  palette,
  labels,
}: {
  states: Record<NodeId, NodeState>;
  interactive: boolean;
  reduced: boolean;
  palette: Palette;
  labels: LabelRefs;
}) {
  const group = useRef<THREE.Group>(null);
  const pos = useMemo(() => positionsFor(), []);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const probe = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    if (!group.current) return;
    if (!interactive && !reduced) group.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.1;
    // Labels are plain DOM in an overlay; project each node to screen space.
    for (const n of NODES) {
      const p = probe.current.copy(pos[n.id]).setY(0.72);
      group.current.localToWorld(p).project(camera);
      placeLabel(labels.current?.[n.id], (p.x * 0.5 + 0.5) * size.width, (-p.y * 0.5 + 0.5) * size.height, p.z < 1);
    }
  });

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 10, 6]} intensity={1.2} />
      <group ref={group}>
        <Grid
          position={[0, -0.25, 0]}
          args={[30, 30]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor={palette.grid}
          sectionSize={2.5}
          sectionThickness={1}
          sectionColor={palette.section}
          fadeDistance={22}
          fadeStrength={1.5}
          infiniteGrid
        />
        {EDGES.map(([a, b]) => {
          const active = states[b] === "running";
          const lit = states[b] === "done" || active;
          const from = pos[a];
          const to = pos[b];
          const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.9, 0));
          return (
            <group key={`${a}-${b}`}>
              <QuadraticBezierLine
                start={from.clone().setY(0.2)}
                end={to.clone().setY(0.2)}
                mid={mid}
                color={active ? palette.running : lit ? palette.done : palette.edge}
                lineWidth={active ? 2 : 1.2}
                transparent
                opacity={lit ? 0.9 : 0.45}
              />
              {active ? <Packets from={from} to={to} color={palette.running} reduced={reduced} /> : null}
            </group>
          );
        })}
        {NODES.map((n) => (
          <NodeMesh key={n.id} node={n} state={states[n.id] ?? "idle"} position={pos[n.id]} palette={palette} reduced={reduced} />
        ))}
      </group>
      {interactive ? <OrbitControls enablePan={false} minDistance={7} maxDistance={18} maxPolarAngle={Math.PI / 2.2} /> : null}
    </>
  );
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function PipelineScene({
  status,
  advisorReady,
  interactive = false,
  className,
}: {
  status: Partial<Record<AgentId, NodeState>>;
  advisorReady?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  // Client-only component (loaded with ssr: false), so window is available here.
  const [palette, setPalette] = useState<Palette>(readPalette);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onMotion = () => setReduced(motion.matches);
    const onScheme = () => setPalette(readPalette());
    motion.addEventListener("change", onMotion);
    scheme.addEventListener("change", onScheme);
    return () => {
      motion.removeEventListener("change", onMotion);
      scheme.removeEventListener("change", onScheme);
    };
  }, []);

  const started = Object.values(status).some((s) => s && s !== "idle");
  const states = {
    deal: started ? "done" : "idle",
    docs: started ? "done" : "idle",
    advisor: advisorReady ? "done" : "idle",
    ...status,
  } as Record<NodeId, NodeState>;
  const labels: LabelRefs = useRef({});

  return (
    <div className={`relative ${className ?? ""}`} aria-hidden>
      <SceneBoundary fallback={<div className="grid h-full place-items-center text-sm text-ink-3">3D view unavailable on this device.</div>}>
        <Canvas camera={{ position: [0, 10.5, 10.5], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
          <Scene states={states} interactive={interactive} reduced={reduced} palette={palette} labels={labels} />
        </Canvas>
        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
          {NODES.map((n) => {
            const state = states[n.id] ?? "idle";
            return (
              <div
                key={n.id}
                ref={(el) => {
                  labels.current[n.id] = el;
                }}
                className="absolute left-0 top-0 whitespace-nowrap rounded-md border px-2 py-0.5 text-[12px] font-medium shadow-sm"
                style={{
                  visibility: "hidden",
                  background: "var(--surface)",
                  borderColor: state === "running" ? "var(--series-1)" : "var(--line)",
                  color: state === "idle" ? "var(--ink-3)" : "var(--ink)",
                }}
              >
                {n.label}
                {state === "failed" ? " ⚠" : ""}
              </div>
            );
          })}
        </div>
      </SceneBoundary>
    </div>
  );
}
