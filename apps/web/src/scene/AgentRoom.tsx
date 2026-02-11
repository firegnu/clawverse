import { Text } from "@react-three/drei";
import type { AgentId, AgentSummary } from "@clawverse/protocol";
import { LobsterAgent } from "./LobsterAgent";

type AgentRoomProps = {
  agent: AgentSummary;
  selected: boolean;
  position: [number, number, number];
  onSelect: (agentId: AgentId) => void;
};

const lampByState = (state: AgentSummary["state"]): string => {
  if (state === "idle") return "#7bcf70";
  if (state === "thinking") return "#f2b265";
  if (state === "running") return "#4fa6ff";
  return "#e85567";
};

export const AgentRoom = ({ agent, selected, position, onSelect }: AgentRoomProps) => (
  <group position={position} onClick={() => onSelect(agent.id)}>
    <mesh receiveShadow position={[0, -0.07, 0]}>
      <boxGeometry args={[3.8, 0.12, 3.8]} />
      <meshStandardMaterial color="#6fbb67" />
    </mesh>

    <mesh receiveShadow position={[0, 0.01, -0.35]}>
      <boxGeometry args={[2.36, 0.05, 1.94]} />
      <meshStandardMaterial color="#ccbca1" />
    </mesh>

    <mesh castShadow receiveShadow position={[0, 0.64, -1.3]}>
      <boxGeometry args={[2.5, 1.25, 0.1]} />
      <meshStandardMaterial color="#f0e4cf" />
    </mesh>
    <mesh castShadow receiveShadow position={[-1.2, 0.64, -0.35]}>
      <boxGeometry args={[0.1, 1.25, 2.0]} />
      <meshStandardMaterial color="#f0e4cf" />
    </mesh>
    <mesh castShadow receiveShadow position={[1.2, 0.64, -0.35]}>
      <boxGeometry args={[0.1, 1.25, 2.0]} />
      <meshStandardMaterial color="#f0e4cf" />
    </mesh>
    <mesh castShadow receiveShadow position={[-0.72, 0.64, 0.62]}>
      <boxGeometry args={[0.86, 1.25, 0.08]} />
      <meshStandardMaterial color="#f0e4cf" />
    </mesh>
    <mesh castShadow receiveShadow position={[0.72, 0.64, 0.62]}>
      <boxGeometry args={[0.86, 1.25, 0.08]} />
      <meshStandardMaterial color="#f0e4cf" />
    </mesh>
    <mesh castShadow receiveShadow position={[0, 1.23, 0.62]}>
      <boxGeometry args={[2.5, 0.14, 0.08]} />
      <meshStandardMaterial color="#f0e4cf" />
    </mesh>

    <mesh castShadow position={[0, 1.35, -0.58]} rotation={[0.63, 0, 0]}>
      <planeGeometry args={[2.7, 1.55]} />
      <meshStandardMaterial
        color="#bb7b5c"
        transparent
        opacity={selected ? 0.35 : 0.62}
        side={2}
      />
    </mesh>
    <mesh castShadow position={[0, 1.35, -0.58]} rotation={[-0.63, 0, 0]}>
      <planeGeometry args={[2.7, 1.55]} />
      <meshStandardMaterial
        color="#bb7b5c"
        transparent
        opacity={selected ? 0.35 : 0.62}
        side={2}
      />
    </mesh>

    <mesh castShadow position={[0, 0.32, 0.7]}>
      <boxGeometry args={[0.45, 0.62, 0.06]} />
      <meshStandardMaterial color="#704e3a" />
    </mesh>
    <mesh castShadow position={[-0.72, 0.76, 0.71]}>
      <boxGeometry args={[0.42, 0.36, 0.06]} />
      <meshStandardMaterial color="#aad4ff" emissive="#5d84ae" emissiveIntensity={0.2} />
    </mesh>
    <mesh castShadow position={[0.72, 0.76, 0.71]}>
      <boxGeometry args={[0.42, 0.36, 0.06]} />
      <meshStandardMaterial color="#aad4ff" emissive="#5d84ae" emissiveIntensity={0.2} />
    </mesh>

    <mesh castShadow receiveShadow position={[-0.95, 0.32, 0.1]}>
      <boxGeometry args={[0.86, 0.08, 0.46]} />
      <meshStandardMaterial color="#6e5745" />
    </mesh>
    <mesh castShadow receiveShadow position={[-0.95, 0.6, 0.1]}>
      <boxGeometry args={[0.28, 0.2, 0.03]} />
      <meshStandardMaterial color="#2a2f39" emissive="#0f253f" emissiveIntensity={0.5} />
    </mesh>
    <mesh castShadow receiveShadow position={[0.95, 0.13, 0.35]}>
      <boxGeometry args={[0.3, 0.24, 0.3]} />
      <meshStandardMaterial color="#55784f" />
    </mesh>
    <mesh castShadow position={[1.34, 0.53, -1.2]}>
      <cylinderGeometry args={[0.06, 0.06, 0.8, 12]} />
      <meshStandardMaterial color="#556473" />
    </mesh>
    <mesh position={[1.34, 0.98, -1.2]}>
      <sphereGeometry args={[0.14, 14, 14]} />
      <meshStandardMaterial color={lampByState(agent.state)} emissive={lampByState(agent.state)} emissiveIntensity={0.8} />
    </mesh>

    <mesh position={[0, 1.02, 0.71]}>
      <planeGeometry args={[1.7, 0.46]} />
      <meshStandardMaterial color={selected ? "#f2f7ff" : "#d3deed"} emissive="#2a3d52" emissiveIntensity={0.2} />
    </mesh>

    <group position={[0, 0, 1.02]}>
      <LobsterAgent state={agent.state} selected={selected} onSelect={() => onSelect(agent.id)} />
    </group>

    <Text position={[0, 1.03, 0.72]} fontSize={0.14} color="#234f70">
      {agent.name}
    </Text>
    <Text position={[0, 1.86, -1.35]} fontSize={0.12} color="#f2f6ff">
      {agent.connection} · {agent.state}
    </Text>
  </group>
);
