import { describe, it } from 'vitest'

describe('WoT Indexer — Replaceable Event Semantics', () => {
  it.todo('T-203: Newer replaces older — only later created_at contact list retained')

  it.todo('T-204: Older does not replace newer — earlier created_at event ignored')

  it.todo('T-205: Tie-break on same created_at — lowest event id wins (lexicographic)')

  it.todo('T-206: Union-then-replace across relays — higher created_at retained after relay union')
})
