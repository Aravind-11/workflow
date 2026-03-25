import type { AgentVisualState, AuditEvent, Vec3Tuple } from '../types/audit'

const DEFAULT_POSITION: Vec3Tuple = [0, 0.4, 0]
const DEFAULT_THOUGHT = 'Awaiting mission tick...'

export const buildAgentStateAtTick = (
  logs: AuditEvent[],
  tick: number,
): Record<string, AgentVisualState> => {
  const sorted = [...logs].sort((a, b) => a.tick - b.tick)
  const state: Record<string, AgentVisualState> = {}

  for (const event of sorted) {
    if (event.tick > tick) {
      break
    }

    const previous = state[event.agent_id] ?? {
      position: DEFAULT_POSITION,
      thought: DEFAULT_THOUGHT,
    }

    const nextPosition = Array.isArray(event.payload.position)
      ? (event.payload.position as Vec3Tuple)
      : previous.position
    const nextThought =
      typeof event.payload.thought === 'string' ? event.payload.thought : previous.thought

    state[event.agent_id] = {
      position: nextPosition,
      thought: nextThought,
    }
  }

  return state
}

export const getMaxTick = (logs: AuditEvent[]): number =>
  logs.reduce((max, event) => Math.max(max, event.tick), 0)
