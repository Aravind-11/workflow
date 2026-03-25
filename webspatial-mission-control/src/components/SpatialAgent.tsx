import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Group, Vector3 } from 'three'
import type { Vec3Tuple } from '../types/audit'

type SpatialAgentProps = {
  position: Vec3Tuple
  thought: string
  color?: string
}

const tempVector = new Vector3()

export function SpatialAgent({ position, thought, color = '#7dd3fc' }: SpatialAgentProps) {
  const groupRef = useRef<Group>(null)

  useFrame((_state, delta) => {
    if (!groupRef.current) return
    tempVector.set(position[0], position[1], position[2])
    groupRef.current.position.lerp(tempVector, Math.min(1, delta * 3))
  })

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[-0.1, 0.08, 0.3]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[0.1, 0.08, 0.3]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      <mesh position={[0, 0.1, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.5, 1.4, 24, 1, true]} />
        <meshStandardMaterial color="#67e8f9" transparent opacity={0.2} side={2} />
      </mesh>

      <Text
        position={[0, 0.85, 0]}
        fontSize={0.18}
        color="#f8fafc"
        anchorX="center"
        anchorY="middle"
        outlineColor="#020617"
        outlineWidth={0.02}
      >
        {thought}
      </Text>
    </group>
  )
}
