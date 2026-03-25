import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { XR, XROrigin, createXRStore } from '@react-three/xr'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { buildDemoLogChain, verifyLogChain } from './audit/clientLog'
import { buildAgentStateAtTick, getMaxTick } from './audit/replay'
import { MissionControlHUD } from './components/MissionControl'
import { SpatialAgent } from './components/SpatialAgent'
import type { AuditEvent } from './types/audit'

const xrStore = createXRStore()

function App() {
  const [logs, setLogs] = useState<AuditEvent[]>([])
  const [currentTick, setCurrentTick] = useState(0)

  useEffect(() => {
    let active = true
    buildDemoLogChain().then((chain) => {
      if (!active) return
      setLogs(chain)
      setCurrentTick(getMaxTick(chain))
    })
    return () => {
      active = false
    }
  }, [])

  const maxTick = useMemo(() => getMaxTick(logs), [logs])
  const agentStates = useMemo(() => buildAgentStateAtTick(logs, currentTick), [logs, currentTick])

  const verifyIntegrity = async (): Promise<boolean> => verifyLogChain(logs)

  return (
    <>
      <MissionControlHUD
        logs={logs}
        currentTick={currentTick}
        maxTick={maxTick}
        onTickChange={setCurrentTick}
        onVerifyIntegrity={verifyIntegrity}
      />

      <Canvas shadows camera={{ position: [0, 2.4, 5.5], fov: 55 }}>
        <XR store={xrStore}>
          <XROrigin position={[0, 0, 0]} />

          <color attach="background" args={['#020617']} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[3, 6, 3]} intensity={1.2} castShadow />

          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>

          {Object.entries(agentStates).map(([agentId, state], index) => (
            <SpatialAgent
              key={agentId}
              position={state.position}
              thought={state.thought}
              color={index % 2 === 0 ? '#7dd3fc' : '#a78bfa'}
            />
          ))}

          <OrbitControls makeDefault />
        </XR>
      </Canvas>
    </>
  )
}

export default App
