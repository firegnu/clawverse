import { useMemo } from "react";
import { Sky } from "@react-three/drei";

type WorldDecorProps = {
  stage: number;
};

type TreePoint = {
  x: number;
  z: number;
  h: number;
};

const makeTrees = (stage: number): TreePoint[] => {
  const half = stage / 2 - 1.2;
  const points: TreePoint[] = [];
  for (let i = -3; i <= 3; i += 1) {
    points.push({ x: -half, z: i * 2.6, h: 0.95 + (i % 2 === 0 ? 0.1 : 0) });
    points.push({ x: half, z: i * 2.6 + 1.1, h: 0.9 + (i % 2 === 0 ? 0.08 : 0.15) });
  }
  return points;
};

export const WorldDecor = ({ stage }: WorldDecorProps) => {
  const trees = useMemo(() => makeTrees(stage), [stage]);

  return (
    <>
      <Sky distance={450000} sunPosition={[10, 8, -4]} turbidity={4} rayleigh={1.8} />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, stage / 3]}>
        <planeGeometry args={[stage * 1.35, stage * 1.35]} />
        <meshStandardMaterial color="#79b96d" />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, stage / 3]}>
        <planeGeometry args={[2.2, stage * 1.1]} />
        <meshStandardMaterial color="#d8ccb3" />
      </mesh>

      <mesh position={[8, 9, -10]}>
        <sphereGeometry args={[1.2, 24, 24]} />
        <meshBasicMaterial color="#ffe08a" />
      </mesh>

      {trees.map((tree, idx) => (
        <group key={`tree-${idx}`} position={[tree.x, 0, tree.z]}>
          <mesh castShadow position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.7, 10]} />
            <meshStandardMaterial color="#6e4d31" />
          </mesh>
          <mesh castShadow position={[0, tree.h, 0]}>
            <sphereGeometry args={[0.42, 16, 16]} />
            <meshStandardMaterial color="#4f8f4a" />
          </mesh>
        </group>
      ))}
    </>
  );
};

