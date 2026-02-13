import { describe, it } from 'vitest'

describe('Proof Engine — Nullifier', () => {
  it.todo('T-800: Nullifier deterministic for same identity + scope — identical nullifier_hash both times')

  it.todo('T-801: Nullifier differs across subjects — different subject_id produces different nullifier_hash')

  it.todo('T-802: Nullifier differs across epochs — different epoch_id produces different nullifier_hash')

  it.todo('T-803: Scope derivation matches spec — Poseidon(domain_tag, subject_id, epoch_id) matches reference')

  it.todo('T-804: epoch_id derivation matches spec — hash(subject_id || time_window_id) matches reference')

  it.todo('T-805: Verifier recomputes scope and confirms match — computed scope matches proof public input')
})
