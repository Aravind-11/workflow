import { useMemo, useState } from 'react'
import { withSpatialized2DElementContainer } from '@webspatial/react-sdk'
import type { AuditEvent } from '../types/audit'

type MissionControlHUDProps = {
  logs: AuditEvent[]
  currentTick: number
  maxTick: number
  onTickChange: (tick: number) => void
  onVerifyIntegrity: () => Promise<boolean>
}

type VerifyState = 'idle' | 'pass' | 'fail'
type DockMode = 'dock' | 'follow'

const basePanelStyle: React.CSSProperties = {
  width: 360,
  maxHeight: 460,
  borderRadius: 14,
  border: '2px solid #334155',
  background: 'rgba(2, 6, 23, 0.85)',
  color: '#e2e8f0',
  backdropFilter: 'blur(10px)',
  padding: 14,
  fontFamily: 'Inter, system-ui, sans-serif',
  pointerEvents: 'auto',
}

const getBorderColor = (verifyState: VerifyState): string => {
  if (verifyState === 'pass') return '#22c55e'
  if (verifyState === 'fail') return '#ef4444'
  return '#334155'
}

export function MissionControlHUD({
  logs,
  currentTick,
  maxTick,
  onTickChange,
  onVerifyIntegrity,
}: MissionControlHUDProps) {
  const SpatialDiv = useMemo(() => withSpatialized2DElementContainer('div'), [])
  const [verifyState, setVerifyState] = useState<VerifyState>('idle')
  const [dockMode, setDockMode] = useState<DockMode>('dock')

  const visibleLogs = logs.filter((log) => log.tick <= currentTick)

  const wrapperStyle: React.CSSProperties =
    dockMode === 'follow'
      ? {
          position: 'fixed',
          left: '50%',
          top: '8%',
          transform: 'translateX(-50%) translateZ(120px)',
          zIndex: 10,
        }
      : {
          position: 'fixed',
          right: 24,
          top: 24,
          zIndex: 10,
          transform: 'translateZ(80px)',
        }

  const handleVerifyClick = async () => {
    const isValid = await onVerifyIntegrity()
    setVerifyState(isValid ? 'pass' : 'fail')
    if (!isValid) {
      alert('Audit log integrity failed: chain has been tampered with.')
    }
  }

  return (
    <SpatialDiv component="div" style={wrapperStyle}>
      <div style={{ ...basePanelStyle, borderColor: getBorderColor(verifyState) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Mission Control HUD</h3>
          <button onClick={() => setDockMode(dockMode === 'dock' ? 'follow' : 'dock')}>
            {dockMode === 'dock' ? 'Follow User' : 'Dock HUD'}
          </button>
        </div>

        <p style={{ margin: '8px 0 10px', fontSize: 12, color: '#94a3b8' }}>
          WebXR note: test from the PICO Browser via `npm run dev -- --host`.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={handleVerifyClick}>Verify Integrity</button>
          <span style={{ fontSize: 12, alignSelf: 'center', color: '#cbd5e1' }}>
            {verifyState === 'idle' ? 'Not verified' : verifyState === 'pass' ? 'Verified OK' : 'Verification failed'}
          </span>
        </div>

        <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
          Replay Scrubber (tick: {currentTick}/{maxTick})
        </label>
        <input
          type="range"
          min={0}
          max={maxTick}
          value={currentTick}
          onChange={(event) => onTickChange(Number(event.target.value))}
          style={{ width: '100%', marginBottom: 12 }}
        />

        <h4 style={{ margin: '2px 0 8px', fontSize: 13 }}>Audit Logs (Chain of Thought)</h4>
        <div
          style={{
            maxHeight: 250,
            overflowY: 'auto',
            background: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: 8,
            padding: 8,
          }}
        >
          {visibleLogs.map((log) => (
            <div
              key={log.hash}
              style={{
                fontSize: 12,
                lineHeight: 1.35,
                borderBottom: '1px dashed rgba(148, 163, 184, 0.25)',
                padding: '6px 2px',
              }}
            >
              <strong>T{log.tick}</strong> [{log.agent_id}] {log.type}: {String(log.payload.thought ?? '(no thought)')}
            </div>
          ))}
          {visibleLogs.length === 0 && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Move the scrubber to view events.</div>
          )}
        </div>
      </div>
    </SpatialDiv>
  )
}
