export type AuditEventType = 'OBSERVE' | 'THINK' | 'ACTION'

export type Vec3Tuple = [number, number, number]

export interface AuditEventPayload {
  thought?: string
  position?: Vec3Tuple
  [key: string]: unknown
}

export interface AuditEvent {
  tick: number
  agent_id: string
  type: AuditEventType
  payload: AuditEventPayload
  prev_hash: string
  signature: string
  hash: string
}

export interface AgentVisualState {
  position: Vec3Tuple
  thought: string
}
