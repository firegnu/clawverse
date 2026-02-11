import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { AgentState } from "@clawverse/protocol";

type LobsterAgentProps = {
  state: AgentState;
  selected: boolean;
  onSelect: () => void;
};

const stateColor = (state: AgentState): string => {
  if (state === "idle") return "#d85a45";
  if (state === "thinking") return "#ef8a47";
  if (state === "running") return "#ff5e3a";
  return "#b52433";
};

export const LobsterAgent = ({ state, selected, onSelect }: LobsterAgentProps) => {
  const root = useRef<Group>(null);
  const leftClaw = useRef<Group>(null);
  const rightClaw = useRef<Group>(null);
  const bobSeed = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + bobSeed;
    if (!root.current || !leftClaw.current || !rightClaw.current) return;

    const idleBob = Math.sin(t * 1.6) * 0.05;
    const thinkingWave = Math.sin(t * 5.4) * 0.22;
    const runningStep = Math.sin(t * 8.5) * 0.22;
    const panic = (Math.random() - 0.5) * 0.06;

    root.current.position.y = 0.22 + idleBob;
    root.current.rotation.y = state === "running" ? Math.sin(t * 4.2) * 0.16 : 0;
    root.current.position.x = state === "error" ? panic : 0;

    if (state === "thinking") {
      leftClaw.current.rotation.z = 0.5 + thinkingWave;
      rightClaw.current.rotation.z = -0.5 - thinkingWave;
    } else if (state === "running") {
      leftClaw.current.rotation.z = 0.5 + runningStep;
      rightClaw.current.rotation.z = -0.5 - runningStep;
    } else if (state === "error") {
      leftClaw.current.rotation.z = 0.8 + panic * 6;
      rightClaw.current.rotation.z = -0.8 - panic * 6;
    } else {
      leftClaw.current.rotation.z = 0.5;
      rightClaw.current.rotation.z = -0.5;
    }
  });

  const shellColor = stateColor(state);
  const emissive = selected ? "#ffffff" : state === "error" ? "#5a0d0d" : "#1e0808";

  return (
    <group ref={root} onClick={onSelect}>
      <mesh castShadow>
        <capsuleGeometry args={[0.22, 0.44, 8, 14]} />
        <meshStandardMaterial color={shellColor} emissive={emissive} emissiveIntensity={selected ? 0.35 : 0.12} />
      </mesh>

      <mesh castShadow position={[0, 0.16, -0.2]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={shellColor} emissive={emissive} emissiveIntensity={selected ? 0.3 : 0.1} />
      </mesh>

      <mesh castShadow position={[-0.1, 0.22, -0.32]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#191919" />
      </mesh>
      <mesh castShadow position={[0.1, 0.22, -0.32]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#191919" />
      </mesh>

      <group ref={leftClaw} position={[-0.34, 0.1, 0]}>
        <mesh castShadow rotation={[0, 0, 0.4]}>
          <capsuleGeometry args={[0.05, 0.26, 6, 12]} />
          <meshStandardMaterial color={shellColor} />
        </mesh>
        <mesh castShadow position={[-0.1, 0.11, 0]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={shellColor} />
        </mesh>
      </group>

      <group ref={rightClaw} position={[0.34, 0.1, 0]}>
        <mesh castShadow rotation={[0, 0, -0.4]}>
          <capsuleGeometry args={[0.05, 0.26, 6, 12]} />
          <meshStandardMaterial color={shellColor} />
        </mesh>
        <mesh castShadow position={[0.1, 0.11, 0]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={shellColor} />
        </mesh>
      </group>
    </group>
  );
};

