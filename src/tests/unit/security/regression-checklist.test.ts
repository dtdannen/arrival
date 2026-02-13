import { describe, it } from 'vitest'

describe('Security — Regression Checklist', () => {
  it.todo('T-2000: Reject code set is stable — 10 codes match Reject Code Canon exactly')

  it.todo('T-2001: Proof artifact pinning enforced — circuit_hash and verifying_key_hash match pinned values')

  it.todo('T-2002: k_min policy unchanged — runtime k_min matches spec default (50)')

  it.todo('T-2003: Nullifier scope unchanged — Poseidon(domain_tag, subject_id, epoch_id) matches reference')

  it.todo('T-2004: Logging policy unchanged — no witness material or stable identifiers in logs')
})
