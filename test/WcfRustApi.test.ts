import process from 'node:process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadEnv } from 'vite'
import { WcfRustApi, resolveWcfRustApiOptions } from '..'

const env = loadEnv('test', process.cwd(), 'TEST')

describe('wcfRustApi', () => {
  const api = new WcfRustApi()

  it.skip('should resolve WcfRustApiOptions correctly', () => {
    const options = { baseURL: 'http://example.com' }
    const resolvedOptions = resolveWcfRustApiOptions(options)
    expect(resolvedOptions).toEqual(options)
  })

  it.skip('should initialize fetch with correct baseURL', () => {
    const options = { baseURL: 'http://example.com' }
    const api = new WcfRustApi(options)
    expect(api.fetch).toBeDefined()
  })

  it.skip('should querySql correctly', async () => {
    const sqlOptions = { db: 'test', sql: { toQuery: () => 'SELECT 1' } }
    const data = await api.querySql(sqlOptions as any)
    expect(data).toBeDefined()
  })

  it.skip('should get userInfo correctly', async () => {
    const userInfo = await api.userInfo()
    expect(userInfo).toBeDefined()
  })

  it.skip('should check isLoggedIn correctly', async () => {
    const isLoggedIn = await api.isLoggedIn()
    expect(isLoggedIn).toBeDefined()
  })

  it.skip('should get contactList correctly', async () => {
    const contactList = await api.contactList()
    expect(contactList).toBeDefined()
  })

  it.skip('should get contactInfo correctly', async () => {
    const contactInfo = await api.contactInfo(env.TEST_WXID)
    expect(contactInfo).toBeDefined()
  })

  it.skip('should get chatroomDetailList correctly', async () => {
    const chatroomDetailList = await api.chatroomDetailList()
    expect(chatroomDetailList).toBeDefined()
  })

  it.skip('should get chatroomList correctly', async () => {
    const chatroomList = await api.chatroomList()
    expect(chatroomList).toBeDefined()
  })

  it.skip('should get chatroomInfo correctly', async () => {
    const chatroomInfo = await api.chatroomInfo(env.TEST_ROOM_ID)
    expect(chatroomInfo).toBeDefined()
  })

  it.skip('should get chatroomMembers correctly', async () => {
    const chatroomMembers = await api.chatroomMembers(env.TEST_ROOM_ID)
    expect(chatroomMembers).toBeDefined()
  })

  it.skip('should get talkerId correctly', async () => {
    const talkerId = await api.talkerId('filehelper')
    expect(talkerId).toBeDefined()
  })

  it.skip('should get historyMessageList correctly', async () => {
    const historyMessageList = await api.historyMessageList('filehelper', (sql) => {
      sql.limit(10)
    })
    expect(historyMessageList).toBeDefined()
  })

  it.skip('should sendText correctly', async () => {
    const response = await api.sendText('filehelper', 'Hello')
    expect(response).toBeDefined()
  })

  it.skip('should sendImage correctly', async () => {
    const response = await api.sendImage('filehelper', resolve(__dirname, './test.gif'))
    expect(response).toBeDefined()
    expect(response.data).toBeTruthy()
  })

  it.skip('should sendFile correctly', async () => {
    const response = await api.sendFile('filehelper', resolve(__dirname, './img.png'))
    expect(response).toBeDefined()
    expect(response.data).toBeTruthy()
  })

  it.skip('should forwardMessage correctly', async () => {
    const response = await api.forwardMessage('filehelper', '0')
    expect(response).toBeDefined()
    expect(response.data).toBeTruthy()
  })
})
