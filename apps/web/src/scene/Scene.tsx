import { OrbitControls, Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { AgentId, AgentSummary } from "@clawverse/protocol";
import { AgentRoom } from "./AgentRoom";
import { WorldDecor } from "./WorldDecor";

type SceneProps = {
  selectedAgent: AgentId | null;
  agents: AgentSummary[];
  onSelect: (agentId: AgentId) => void;
};

const gridPosition = (index: number, count: number): [number, number, number] => {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const x = (col - (cols - 1) / 2) * 4.6;
  const z = row * 4.6;
  return [x, 0, z];
};

const stageSize = (count: number): number => {
  const rows = Math.max(1, Math.ceil(count / Math.max(1, Math.ceil(Math.sqrt(count)))));
  return Math.max(12, rows * 5 + 6);
};

export const Scene = ({ selectedAgent, agents, onSelect }: SceneProps) => {
  const stage = stageSize(Math.max(1, agents.length));

  return (
    <Canvas shadows camera={{ position: [0, 6.8, 9.5], fov: 46 }}>
      <color attach="background" args={["#b8defd"]} />
      <fog attach="fog" args={["#cce6fb", 18, 46]} />

      <hemisphereLight intensity={0.72} color="#f7fbff" groundColor="#6d9b5e" />
      <directionalLight
        position={[9, 11, 3]}
        intensity={1.35}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-7, 3.2, -1]} intensity={8} color="#fff2be" />
      <WorldDecor stage={stage} />

      {agents.length === 0 && (
        <Text position={[0, 1.2, 0]} fontSize={0.34} color="#d6deed">
          Add your first OpenClaw agent
        </Text>
      )}

      {agents.map((agent, index) => (
        <AgentRoom
          key={agent.id}
          agent={agent}
          selected={selectedAgent === agent.id}
          position={gridPosition(index, agents.length)}
          onSelect={onSelect}
        />
      ))}

      <OrbitControls
        enablePan
        minPolarAngle={0.45}
        maxPolarAngle={1.3}
        minDistance={7}
        maxDistance={22}
        target={[0, 0.8, Math.max(0, stage / 4)]}
      />
    </Canvas>
  );
};
