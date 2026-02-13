import { describe, it } from 'vitest'

describe('WoT Indexer — Event Ingestion', () => {
  it.todo('T-200: Ingest valid kind 3 event — follow list stored, graph contains expected edges')

  it.todo('T-201: Reject invalid Schnorr signature — event discarded, graph unchanged')

  it.todo('T-202: Reject non-kind-3 events — event ignored, graph unchanged')

  it.todo('T-209: Malformed event handling — missing fields, invalid JSON, empty contact list all discarded without crash')
})
