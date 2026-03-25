import type { AuditEvent, AuditEventPayload, AuditEventType } from '../types/audit'

const DEMO_SECRET = 'demo-webspatial-hmac-secret'
const ZERO_HASH = '0'.repeat(64)

export interface DraftAuditEvent {
  tick: number
  agent_id: string
  type: AuditEventType
  payload: AuditEventPayload
}

const canonicalPayload = (payload: AuditEventPayload): string => JSON.stringify(payload)

const bytesToHex = (bytes: Uint8Array): string => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(digest))
}

const hmacHex = async (value: string, secret: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(signature))
}

const computeEventHash = async (event: Omit<AuditEvent, 'hash'>): Promise<string> => {
  const content = `${event.tick}|${event.agent_id}|${event.type}|${canonicalPayload(event.payload)}|${event.prev_hash}|${event.signature}`
  return sha256Hex(content)
}

const computeSignature = async (event: DraftAuditEvent, prevHash: string, secret: string): Promise<string> => {
  const content = `${event.tick}|${event.agent_id}|${event.type}|${canonicalPayload(event.payload)}|${prevHash}`
  return hmacHex(content, secret)
}

export const appendClientEvent = async (
  previous: AuditEvent | undefined,
  draft: DraftAuditEvent,
  secret = DEMO_SECRET,
): Promise<AuditEvent> => {
  const prev_hash = previous?.hash ?? ZERO_HASH
  const signature = await computeSignature(draft, prev_hash, secret)
  const baseEvent: Omit<AuditEvent, 'hash'> = { ...draft, prev_hash, signature }

  return {
    ...baseEvent,
    hash: await computeEventHash(baseEvent),
  }
}

export const buildDemoLogChain = async (): Promise<AuditEvent[]> => {
  const drafts: DraftAuditEvent[] = [
    { tick: 1, agent_id: 'agent-alpha', type: 'OBSERVE', payload: { thought: 'Scanning aisle A-3.' } },
    { tick: 2, agent_id: 'agent-beta', type: 'THINK', payload: { thought: 'Calculating the shortest safe route.' } },
    { tick: 3, agent_id: 'agent-alpha', type: 'ACTION', payload: { thought: 'Moving to checkpoint.', position: [-1.5, 0.4, -0.5] } },
    { tick: 4, agent_id: 'agent-beta', type: 'ACTION', payload: { thought: 'Crossing dock line.', position: [1.1, 0.4, 0.8] } },
    { tick: 5, agent_id: 'agent-alpha', type: 'THINK', payload: { thought: 'Vision confirms package target.' } },
    { tick: 6, agent_id: 'agent-beta', type: 'ACTION', payload: { thought: 'Delivering payload to bay 4.', position: [2.0, 0.4, -1.1] } },
    { tick: 7, agent_id: 'agent-alpha', type: 'ACTION', payload: { thought: 'Returning to standby.', position: [-0.2, 0.4, 1.4] } },
  ]

  const chain: AuditEvent[] = []
  for (const draft of drafts) {
    const nextEvent = await appendClientEvent(chain.at(-1), draft)
    chain.push(nextEvent)
  }
  return chain
}

export const verifyLogChain = async (logs: AuditEvent[], secret = DEMO_SECRET): Promise<boolean> => {
  for (let i = 0; i < logs.length; i += 1) {
    const current = logs[i]
    const previous = logs[i - 1]
    const expectedPrevHash = previous?.hash ?? ZERO_HASH
    if (current.prev_hash !== expectedPrevHash) {
      return false
    }

    const expectedSignature = await computeSignature(
      {
        tick: current.tick,
        agent_id: current.agent_id,
        type: current.type,
        payload: current.payload,
      },
      current.prev_hash,
      secret,
    )
    if (current.signature !== expectedSignature) {
      return false
    }

    const expectedHash = await computeEventHash({
      tick: current.tick,
      agent_id: current.agent_id,
      type: current.type,
      payload: current.payload,
      prev_hash: current.prev_hash,
      signature: current.signature,
    })
    if (current.hash !== expectedHash) {
      return false
    }
  }

  return true
}
