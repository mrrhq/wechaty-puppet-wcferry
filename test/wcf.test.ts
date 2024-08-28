import process from 'node:process'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadEnv } from 'vite'
import { WechatyBuilder } from 'wechaty'
import { PuppetWcferry } from '..'

const env = loadEnv('test', process.cwd(), 'TEST')
const wxid = env.TEST_WXID
const roomId = env.TEST_ROOM_ID

const wcf = WechatyBuilder.build({ puppet: new PuppetWcferry() })

beforeAll(() => {
  return new Promise((r) => {
    wcf.on('ready', () => r())
    return wcf.start()
  })
})

describe.skip('room', async () => {
  it('find', async () => {
    const room = (await wcf.Room.find({ id: roomId }))!
    expect(room).toBeDefined()
    expect(await room.topic()).toBeDefined()
    expect(room.id).toBeDefined()
  })

  it('findAll', async () => {
    const rooms = await wcf.Room.findAll()
    expect(rooms.length).toBeGreaterThan(0)
    const room = rooms[0]
    expect(await room.topic()).toBeDefined()
    expect(room.id).toBeDefined()
  })
})

describe('contact', async () => {
  it('find', async () => {
    const contact = (await wcf.Contact.find({ id: wxid }))!
    expect(contact).toBeDefined()
    expect(contact.id).toBeDefined()
    expect(contact.name()).not.toBe('')
  })

  it.skip('findAll', async () => {
    const contact2s = await wcf.Contact.findAll()
    expect(contact2s.length).toBeGreaterThan(0)
    const contact = contact2s[0]
    expect(contact.name()).toBeDefined()
    expect(contact.id).toBeDefined()
  })
})

describe.skip('self', async () => {
  it('find', async () => {
    const user = wcf.currentUser
    const selfUser = await wcf.ContactSelf.find(user.id)
    expect(selfUser?.id).toEqual(user.id)
  })
})
