import process from 'node:process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadEnv } from 'vite'
import { AgentWcferry } from '../src/context/AgentWcferry'

const env = loadEnv('test', process.cwd(), 'TEST')
const wcf = new AgentWcferry()

beforeAll(() => wcf.start())
afterAll(() => wcf.stop())

describe.skip('wcfRustApi', () => {
  it('historyMessageList', () => {
    const data = wcf.getHistoryMessageList(env.TEST_ROOM_ID, sql => sql.limit(10))
    expect(data).toBeDefined()
  })

  it('chatroom', () => {
    const data = wcf.getChatRoomDetailList()
    expect(data).toBeDefined()
  })
})
