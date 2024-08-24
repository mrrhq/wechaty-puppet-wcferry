/* eslint-disable unused-imports/no-unused-vars */
import process, { nextTick } from 'node:process'
import * as PUPPET from 'wechaty-puppet'
import { log } from 'wechaty-puppet'
import type { Storage, StorageValue } from 'unstorage'
import { createStorage, prefixStorage } from 'unstorage'
import type { FileBoxInterface } from 'file-box'
import { FileBox } from 'file-box'
import fse from 'fs-extra'

import type {
  Contact,
  EventMessage,
  EventRoomInvite,
  Message,
  RoomMember,
} from 'wechaty-puppet/payloads'

import { xmlDecrypt, xmlToJson } from '../utils'
import type { PrefixStorage, PuppetContact, PuppetFerryOptions, PuppetFerryUserOptions, PuppetRoom, WcfRustApiRecvMsg, WcfRustApiUser } from '../types'
import { normalizedMsg } from '../utils/msg'
import { FerryAgent } from './FerryAgent'

export function resolvePuppetFerryOptions(userOptions: PuppetFerryUserOptions): PuppetFerryOptions {
  return {
    agent: new FerryAgent(),
    storage: createStorage(),
    ...userOptions,
  }
}

const VERSION = '3.9.10.27'

export class PuppetFerry extends PUPPET.Puppet {
  static override readonly VERSION = VERSION
  agent: FerryAgent
  storage: Storage<StorageValue>
  private contactStorage: PrefixStorage<Contact>
  private roomStorage: PrefixStorage<PuppetRoom>
  private messageStorage: PrefixStorage<Message>

  constructor(options: PuppetFerryUserOptions = {}) {
    super()

    const { agent, storage } = resolvePuppetFerryOptions(options)
    this.agent = agent
    this.storage = storage
    this.contactStorage = this.createPrefixStorage<PuppetContact>(storage, 'contact')
    this.roomStorage = this.createPrefixStorage<PuppetRoom>(storage, 'room')
    this.messageStorage = this.createPrefixStorage<Message>(storage, 'message')
  }

  override login(contactId: string) {
    log.verbose('PuppetBridge', 'login(%s)', contactId)

    super.login(contactId)
  }

  override ding(data?: string | undefined): void {
    log.silly('PuppetBridge', 'ding(%s)', data || '')

    setTimeout(() => {
      this.emit('dong', { data: data || '' })
    }, 1000)
  }

  // #region Contact

  override contactRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.Contact>
  override async contactRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.Contact> {
    return rawPayload
  }

  override contactRawPayload(contactId: string): Promise<Contact | null>
  override contactRawPayload(contactId: string): Promise<Contact | null> {
    log.verbose('PuppetBridge', 'contactRawPayload(%s)', contactId)
    return this.contactStorage.getItem(contactId)
  }

  override contactAlias(contactId: string): Promise<string>
  override contactAlias(contactId: string, alias: string | null): Promise<void>
  override async contactAlias(contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetBridge', 'contactAlias(%s, %s)', contactId, alias || '')
    const contact = await this.contactRawPayload(contactId)
    if (!contact)
      throw new Error('contact not found')

    if (alias) {
      throw new Error('not support set alias')
    }

    return contact.alias
  }

  override contactSearch(
    query?: string | PUPPET.filters.Contact | undefined,
    searchIdList?: string[] | undefined
  ): Promise<string[]>
  override async contactSearch(
    query?: string | PUPPET.filters.Contact | undefined,
    searchIdList?: string[] | undefined,
  ): Promise<string[]> {
    log.verbose('PuppetBridge', 'contactSearch(%s, %s)', query, searchIdList || '')

    const contactList = await this.contactStorage.getItemsList()

    let contacts: string[] = []

    if (typeof query === 'object') {
      if (query.name) {
        contacts = contactList.filter(contact => contact.name === query.name).map(contact => contact.id)
      }
      else if (query.alias) {
        contacts = contactList.filter(contact => contact.alias === query.alias).map(contact => contact.id)
      }
      else if (query.id) {
        contacts = contactList.filter(contact => contact.id === query.id).map(contact => contact.id)
      }
    }
    else if (typeof query === 'string') {
      contacts = contactList
        .filter(contact => contact.id === query || contact.name === query)
        .map(contact => contact.id)
    }
    else {
      contacts = contactList.map(contact => contact.id)
    }

    return contacts
  }

  override contactPhone(contactId: string, phoneList: string[]): Promise<void>
  override contactPhone(contactId: string, phoneList: string[]): Promise<void> {
    log.verbose('PuppetBridge', 'contactPhone(%s, %s)', contactId, phoneList)

    throw new Error('not support set phone')
  }

  override contactList(): Promise<string[]>
  override contactList(): Promise<string[]> {
    log.verbose('PuppetBridge', 'contactList()')
    return this.contactStorage.getKeys()
  }

  override contactAvatar(contactId: string): Promise<FileBoxInterface>
  override contactAvatar(contactId: string, file: FileBoxInterface): Promise<void>
  override async contactAvatar(contactId: string, file?: FileBoxInterface): Promise<void | FileBoxInterface> {
    log.verbose('PuppetBridge', 'contactAvatar(%s, %s)', contactId, file)

    if (file) {
      throw new Error('not support set avatar')
    }

    const contact = await this.contactStorage.getItem(contactId)
    if (!contact)
      throw new Error('contact not found')

    return FileBox.fromUrl(contact.avatar)
  }

  // #endregion

  // #region Room

  // Room --------------

  private async getRoom(roomId: string) {
    const room = await this.roomStorage.hasItem(roomId)
    if (!room) {
      await this.updateRoomPayload({ id: roomId } as any)
    }
    return this.roomStorage.getItem(roomId)
  }

  override async roomAvatar(roomId: string): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'roomAvatar(%s)', roomId)
    const payload = await this.roomPayload(roomId)
    if (!payload.avatar) {
      throw new Error('avatar not set')
    }
    return FileBox.fromUrl(payload.avatar)
  }

  override async roomRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.Room> {
    log.verbose('PuppetBridge', 'roomRawPayloadParser(%s)', JSON.stringify(rawPayload))
    return rawPayload
  }

  override roomRawPayload(roomId: string): Promise<any> {
    log.verbose('PuppetBridge', 'roomRawPayload(%s)', roomId)
    return this.getRoom(roomId)
  }

  override roomPayload(roomId: string): Promise<PUPPET.payloads.Room>
  override roomPayload(roomId: string): Promise<PUPPET.payloads.Room | null>
  override roomPayload(roomId: string): Promise<PUPPET.payloads.Room | null> {
    log.verbose('PuppetBridge', 'roomPayload(%s)', roomId)
    return this.getRoom(roomId)
  }

  override async roomSearch(query?: PUPPET.filters.Room | undefined): Promise<string[]> {
    log.verbose('PuppetBridge', 'roomSearch(%s)', query)

    const roomList = await this.roomStorage.getItemsList()

    let rooms: string[] = []

    if (typeof query === 'object') {
      if (query.id) {
        rooms = roomList.filter(room => room.id === query.id).map(room => room.id)
      }
      else if (query.topic) {
        rooms = roomList.filter(room => room.topic === query.topic).map(room => room.id)
      }
    }
    else {
      rooms = roomList.map(room => room.id)
    }

    return rooms
  }

  override roomList(): Promise<string[]>
  override roomList(): Promise<string[]> {
    log.verbose('PuppetBridge', 'roomList()')
    return this.roomStorage.getKeys()
  }

  override roomMemberList(roomId: string): Promise<string[]>
  override async roomMemberList(roomId: string): Promise<string[]> {
    log.verbose('PuppetBridge', 'roomMemberList(%s)', roomId)

    const room = await this.roomStorage.getItem(roomId)
    if (!room)
      return []

    return room.memberIdList
  }

  override roomMemberPayload(roomId: string, memberId: string): Promise<PUPPET.payloads.RoomMember>
  override async roomMemberPayload(roomId: string, memberId: string): Promise<PUPPET.payloads.RoomMember> {
    log.verbose('PuppetBridge', 'roomMemberPayload(%s, %s)', roomId, memberId)

    const room = await this.roomStorage.getItem(roomId)
    if (!room)
      throw new Error('room not found')

    const member = room.members.find(member => member.id === memberId)
    if (!member)
      throw new Error('member not found')

    return member
  }

  override roomMemberRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.RoomMember>
  override async roomMemberRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.RoomMember> {
    return rawPayload
  }

  override roomMemberRawPayload(roomId: string, contactId: string): Promise<any>
  override async roomMemberRawPayload(roomId: string, contactId: string): Promise<any> {
    log.verbose('PuppetBridge', 'roomMemberRawPayload(%s, %s)', roomId, contactId)

    const room = await this.roomStorage.getItem(roomId)
    if (!room)
      return null

    const member = room.members.find(member => member.id === contactId)
    if (!member)
      return null

    return member
  }

  override roomMemberSearch(roomId: string, query: string | symbol | PUPPET.filters.RoomMember): Promise<string[]>
  override async roomMemberSearch(roomId: string, query: string | symbol | PUPPET.filters.RoomMember): Promise<string[]> {
    log.verbose('PuppetBridge', 'roomMemberSearch(%s, %s)', roomId, query)

    const room = await this.roomStorage.getItem(roomId)
    if (!room)
      throw new Error('room not found')

    const memberList = room.members

    let members: string[] = []

    if (typeof query === 'function') {
      members = memberList.filter(query).map(member => member.id)
    }
    else if (typeof query === 'object') {
      if (query.name) {
        members = memberList.filter(member => member.name === query.name).map(member => member.id)
      }
    }
    else if (typeof query === 'string') {
      members = memberList.filter(member => member.name === query).map(member => member.id)
    }
    else {
      members = memberList.map(member => member.id)
    }

    return members
  }

  // #endregion

  // #region Room OPS

  // TODO: 群聊操作

  // #endregion

  // #region Message

  override messageRawPayload(messageId: string): Promise<any>
  override async messageRawPayload(messageId: string): Promise<any> {
    log.verbose('PuppetBridge', 'messageRawPayload(%s)', messageId)
    return this.messageStorage.getItem(messageId)
  }

  override messageRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.Message>
  override async messageRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.Message> {
    log.verbose('PuppetBridge', 'messageRawPayloadParser(%s)', JSON.stringify(rawPayload))
    return rawPayload
  }

  override messagePayload(messageId: string): Promise<PUPPET.payloads.Message>
  override async messagePayload(messageId: string): Promise<PUPPET.payloads.Message> {
    log.verbose('PuppetBridge', 'messagePayload(%s)', messageId)
    const message = await this.messageStorage.getItem(messageId)
    if (!message)
      throw new Error('message not found')
    return message
  }

  override async messageContact(messageId: string): Promise<string>
  override async messageContact(messageId: string): Promise<string> {
    log.verbose('PuppetBridge', 'messageContact(%s)', messageId)
    const message = await this.messageStorage.getItem(messageId)
    if (!message)
      throw new Error('message not found')
    return await xmlDecrypt(message.text || '', message.type || PUPPET.types.Message.Unknown)
  }

  private getImageFileConfig(imageType: PUPPET.types.Image) {
    if (imageType === PUPPET.types.Image.Thumbnail) {
      return {
        fileType: 3,
        attr: 'cdnthumburl',
        suffix: 'thumb',
      }
    }
    if (imageType === PUPPET.types.Image.HD) {
      return {
        fileType: 2,
        attr: 'cdnmidimgurl',
        suffix: 'hd',
      }
    }
    return {
      fileType: 1,
      attr: 'cdnbigimgurl',
      suffix: 'normal',
    }
  }

  override async messageImage(messageId: string, imageType: PUPPET.types.Image): Promise<FileBoxInterface>
  override async messageImage(messageId: string, imageType: PUPPET.types.Image): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'messageImage(%s, %s)', messageId, imageType)

    const message = await this.messageStorage.getItem(messageId)
    if (!message)
      throw new Error('message not found')

    try {
      const content = await xmlToJson(message.text || '', { mergeAttrs: true, explicitArray: false })

      const { fileType, suffix, attr } = this.getImageFileConfig(imageType)

      const aeskey = content.msg.img.aeskey
      const cdnUrl = content.msg.img[attr] || content.msg.img.cdnmidimgurl

      const fileName = `message_${aeskey}_${suffix}.png`
      // TODO: download image
    }
    catch (error: any) {
      log.error(
        'PuppetBridge',
        'messageImage() exception %s',
        error.stack,
      )
    }

    throw new Error('not support messageImage')
  }

  override messageRecall(messageId: string): Promise<boolean>
  override messageRecall(messageId: string): Promise<boolean> {
    log.verbose('PuppetBridge', 'messageRecall(%s)', messageId)

    throw new Error('not support messageRecall')
  }

  private async getMessageFileBox(message: PUPPET.payloads.Message): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'messageFileBox(%s)', message.id)

    const configMapping = {
      [PUPPET.types.Message.Video]: {
        attr: 'videomsg',
        suffix: '.mp4',
        fileTye: 4,
      },
      [PUPPET.types.Message.Audio]: {
        attr: 'voicemsg',
        suffix: '.slik',
        fileTye: 15,
      },
    } as Record<PUPPET.types.Message, { attr: string, suffix: string, fileTye: number }>
    const config = configMapping[message.type]

    try {
      const content = await xmlToJson(message.text || '', { mergeAttrs: true, explicitArray: false })

      const aeskey = content.msg[config.attr].aeskey
      const cdnUrl = content.msg[config.attr].cdnvideourl
      const fileName = `message_${aeskey}${config.suffix}`

      // TODO: download file
    }
    catch (error: any) {
      log.error(
        'PuppetBridge',
        'getMessageFileBox() exception %s',
        error.stack,
      )
    }

    throw new Error('not support getMessageFileBox')
  }

  private async getMessageAttachment(message: PUPPET.payloads.Message): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'getMessageAttachment(%s)', message.id)

    try {
      const content = await xmlToJson(message.text || '', { ignoreAttrs: true, explicitArray: false })

      const title = content.msg.appmsg.title
      const totallen = content.msg.appmsg.appattach.totallen
      const aeskey = content.msg.appmsg.appattach.aeskey
      const cdnUrl = content.msg.appmsg.appattach.cdnattachurl

      const fileName = `message_${aeskey}_${title}`
      // TODO: download file
    }
    catch (error: any) {
      log.error(
        'PuppetBridge',
        'getMessageAttachment() exception %s',
        error.stack,
      )
    }
    throw new Error('not support getMessageAttachment')
  }

  private async getMessageEmoticon(message: PUPPET.payloads.Message): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'messageEmoticon(%s)', message.id)

    try {
      const content = await xmlToJson(message.text || '', { mergeAttrs: true, explicitArray: false })

      const aeskey = content.msg.emoji.aeskey
      const cdnUrl = content.msg.emoji.cdnurl

      const emoticonBox = FileBox.fromUrl(cdnUrl, {
        name: `message_${aeskey}.png`,
      })

      emoticonBox.metadata = {
        payload: content,
        type: 'emoticon',
      }

      return emoticonBox
    }
    catch (error: any) {
      log.error(
        'PuppetBridge',
        'getMessageEmoticon() exception %s',
        error.stack,
      )
    }

    throw new Error('can\'t get emoticon')
  }

  override async messageFile(messageId: string): Promise<FileBoxInterface>
  override async messageFile(messageId: string): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'messageFile(%s)', messageId)

    const message = await this.messageStorage.getItem(messageId)
    if (!message)
      throw new Error('message not found')

    if (message?.type === PUPPET.types.Message.Image) {
      return this.messageImage(messageId, PUPPET.types.Image.HD)
    }

    if (message.type === PUPPET.types.Message.Emoticon) {
      return this.getMessageEmoticon(message)
    }

    if (message.type === PUPPET.types.Message.Video || message.type === PUPPET.types.Message.Audio) {
      return this.getMessageFileBox(message)
    }

    if (message.type === PUPPET.types.Message.Attachment) {
      return this.getMessageAttachment(message)
    }

    log.info(`messageFile unknown type: ${message.type}`)

    throw new Error('can\'t get file')
  }

  override async messageUrl(messageId: string): Promise<PUPPET.payloads.UrlLink>
  override async messageUrl(messageId: string): Promise<PUPPET.payloads.UrlLink> {
    log.verbose('PuppetBridge', 'messageUrl(%s)', messageId)

    const message = await this.messageStorage.getItem(messageId)
    if (!message)
      throw new Error('message not found')

    return await xmlDecrypt(message?.text || '', message?.type || PUPPET.types.Message.Unknown)
  }

  override async messageMiniProgram(messageId: string): Promise<PUPPET.payloads.MiniProgram>
  override async messageMiniProgram(messageId: string): Promise<PUPPET.payloads.MiniProgram> {
    log.verbose('PuppetBridge', 'messageMiniProgram(%s)', messageId)

    const message = await this.messageStorage.getItem(messageId)
    if (!message)
      throw new Error('message not found')

    return await xmlDecrypt(message?.text || '', message?.type || PUPPET.types.Message.Unknown)
  }

  override async messageLocation(messageId: string): Promise<PUPPET.payloads.Location>
  override async messageLocation(messageId: string): Promise<PUPPET.payloads.Location> {
    log.verbose('PuppetBridge', 'messageLocation(%s)', messageId)

    const message = await this.messageStorage.getItem(messageId)
    if (!message)
      throw new Error('message not found')

    return await xmlDecrypt(message?.text || '', message?.type || PUPPET.types.Message.Unknown)
  }

  private mentionTextParser(message: string): { mentions: string[], message: string } {
    const mentionRegex = /@\[mention:([^\]]+)\]/g
    const mentions = message.match(mentionRegex) || []

    const mentionIds = mentions.map((mention) => {
      const match = mention.match(/@\[mention:([^\]]+)\]/)
      return match && match.length > 1 ? match[1] : null
    })

    const text = message.replace(mentionRegex, '').trim()

    return {
      mentions: mentionIds.filter(id => id) as string[],
      message: text,
    }
  }

  private async getMentionText(roomId: string, mentions: string[]) {
    let mentionText = ''

    if (mentions.length === 0)
      return mentionText

    const chatroom = await this.roomStorage.getItem(roomId)
    if (!chatroom)
      throw new Error('chatroom not found')

    const chatroomMembers = chatroom.members

    mentionText = mentions.reduce((acc, mentionId) => {
      chatroomMembers.filter((member) => {
        if (member.id === mentionId) {
          acc += `@${member.name} `
          return true
        }
        return false
      })

      return acc
    }, '')

    return mentionText
  }

  // #endregion

  // #region Send

  override async messageSendText(
    conversationId: string,
    text: string,
    mentionIdList?: string[] | undefined
  ): Promise<string | void>
  override async messageSendText(
    conversationId: string,
    text: string,
    mentionIdList?: string[] | undefined,
  ): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendText(%s, %s, %s)', conversationId, text, mentionIdList)

    if (!conversationId.includes('@chatroom')) {
      log.info('messageSendText', 'normal text')
      await this.agent.api.sendText(conversationId, text)
      return
    }

    if (text.includes('@all')) {
      log.info('messageSendText', 'at all')
      text = text.replace('@all', '@所有人').trim()
      await this.agent.api.sendText(conversationId, text, ['notify@all'])
    }
    else if (/@\[mention:[^\]]+\]/.test(text)) {
      log.info('messageSendText', 'at mention')
      const { mentions, message } = this.mentionTextParser(text)
      const mentionText = this.getMentionText(conversationId, mentions)
      await this.agent.api.sendText(conversationId, `${mentionText} ${message}`, mentions)
    }
    else {
      log.info('messageSendText', 'normal text')
      await this.agent.api.sendText(conversationId, text)
    }
  }

  override async messageSendFile(conversationId: string, file: FileBoxInterface): Promise<string | void>
  override async messageSendFile(conversationId: string, file: FileBoxInterface): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendFile(%s, %s)', conversationId, file)
    const dir = await fse.mkdtemp('ferry')
    const filePath = dir + file.name
    if (
      !await fse.exists(filePath)
    ) {
      try {
        await file.toFile(filePath)
      }
      catch (err) {
        log.error('file.toFile(filePath) fail:', err)
      }
    }

    if (file.mediaType.startsWith('image')) {
      await this.agent.api.sendImage(conversationId, filePath)
    }
    else {
      await this.agent.api.sendFile(conversationId, filePath)
    }

    process.nextTick(async () => {
      try {
        await fse.unlink(filePath)
      }
      catch (err) {
        log.error('messageSendFile.unlink fail:', err)
      }
    })
  }

  override messageSendUrl(conversationId: string, urlLinkPayload: PUPPET.payloads.UrlLink): Promise<string | void>
  override async messageSendUrl(conversationId: string, urlLinkPayload: PUPPET.payloads.UrlLink): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendUrl(%s, %s)', conversationId, urlLinkPayload)
    // TODO: 发送链接
    throw new Error('not support messageSendUrl')
  }

  override async messageSendContact(conversationId: string, contactId: string): Promise<string | void>
  override async messageSendContact(conversationId: string, contactId: string): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendContact(%s, %s)', conversationId, contactId)
    // TODO: 发送联系人
    throw new Error('not support messageSendContact')
  }

  override messageSendMiniProgram(
    conversationId: string,
    miniProgramPayload: PUPPET.payloads.MiniProgram
  ): Promise<string | void>
  override async messageSendMiniProgram(
    conversationId: string,
    miniProgramPayload: PUPPET.payloads.MiniProgram,
  ): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendMiniProgram(%s, %s)', conversationId, miniProgramPayload)
    // TODO: 发送小程序
    throw new Error('not support messageSendMiniProgram')
  }

  override messageForward(conversationId: string, messageId: string): Promise<string | void>
  override async messageForward(conversationId: string, messageId: string): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageForward(%s, %s)', conversationId, messageId)

    await this.agent.api.forwardMessage(conversationId, messageId)
  }

  override messageSendLocation(
    conversationId: string,
    locationPayload: PUPPET.payloads.Location
  ): Promise<string | void>
  override async messageSendLocation(
    conversationId: string,
    locationPayload: PUPPET.payloads.Location,
  ): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendLocation(%s, %s)', conversationId, locationPayload)

    // TODO: 发送位置
    throw new Error('not support messageSendMiniProgram')
  }

  override messageSendPost(conversationId: string, postPayload: PUPPET.payloads.Post): Promise<string | void>
  override async messageSendPost(conversationId: string, postPayload: PUPPET.payloads.Post): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendPost(%s, %s)', conversationId, postPayload)
    // TODO: send post
    throw new Error('not support messageSendPost')
  }

  // #endregion

  // #region Core

  async onStart() {
    this.agent.start()
    this.agent.on('message', this.onMessage.bind(this))
    this.agent.on('login', this.onLogin.bind(this))
  }

  async onStop() {
    this.agent.stop()
  }

  async onLogin(user: WcfRustApiUser) {
    log.verbose('PuppetBridge', 'onLogin() user %s', JSON.stringify(user))

    await this.loadContacts()
    await this.loadRooms()
    this.login(user.wxid)
    nextTick(() => this.emit('ready'))
  }

  async onMessage(message: WcfRustApiRecvMsg) {
    log.verbose('PuppetBridge', 'onMessage()')

    if (!message)
      return

    this.msgHandler(message)
  }

  async msgHandler(message: WcfRustApiRecvMsg) {
    const roomId = message.is_group ? message.roomid : ''
    const talkerId = message.sender
    const listenerId = message.sender

    if (talkerId) {
      await this.updateContactPayload({
        id: talkerId,
      } as PuppetContact)
    }

    const { content, type } = await normalizedMsg(message)

    const payload = {
      type,
      id: message.id.toString(),
      text: content,
      talkerId,
      listenerId: roomId ? '' : listenerId,
      timestamp: Date.now(),
      roomId,
    } as Message

    if (roomId && !await this.roomStorage.hasItem(roomId)) {
      await this.updateRoomPayload({
        id: roomId,
      } as PuppetRoom)
    }

    if (this.isRoomOps(message)) {
      this.roomMsgHandler(payload)
    }
    else if (this.isInviteMsg(payload)) {
      this.inviteMsgHandler(payload)
      this.messageStorage.setItem(payload.id, payload)
    }
    else {
      this.messageStorage.setItem(payload.id, payload)
      this.emit('message', { messageId: payload.id } as EventMessage)
    }
  }

  private async roomMsgHandler(message: Message) {
    log.verbose('PuppetBridge', 'roomMsgHandler()  message %s', JSON.stringify(message))
    const { roomId, text } = message
    if (!roomId)
      return

    throw new Error('not support roomMsgHandler')
  }

  private inviteMsgHandler = (message: Message) => {
    log.verbose('PuppetBridge', 'inviteMsgHandler()  message %s', JSON.stringify(message))

    this.emit('room-invite', {
      roomInvitationId: message.id,
    } as EventRoomInvite)
  }

  // #endregion

  // #region Storage
  private async updateRoomPayload(room: PuppetRoom, forceUpdate = false): Promise<void> {
    log.verbose('PuppetBridge', 'updateRoomPayload()')

    if (!room)
      return

    const exist = await this.roomStorage.hasItem(room.id)
    if (exist && !forceUpdate)
      return
    try {
      const roomInfo = await this.agent.api.chatroomInfo(room.id)
      room.announce = roomInfo.Announcement
      room.topic = roomInfo.NickName
      room.avatar = roomInfo.smallHeadImgUrl
      const members = await this.agent.api.chatroomMembers(room.id)
      room.memberIdList = members.map(member => member.UserName)
      room.members = members.map((member) => {
        return {
          id: member.UserName,
          name: member.NickName,
          avatar: member.smallHeadImgUrl,
        } as RoomMember
      })

      await this.roomStorage.setItem(room.id, room)
    }
    catch (error: any) {
      log.error(
        'PuppetBridge',
        'updateRoomPayload() exception %s',
        error.stack,
      )
    }
  }

  private async updateContactPayload(
    contact: PuppetContact,
    forceUpdate = false,
  ): Promise<void> {
    // log.verbose("PuppetBridge", "updateContactPayload()");

    if (!contact)
      return

    const exist = await this.contactStorage.hasItem(contact.id)
    if (exist && !forceUpdate)
      return

    try {
      const contactInfo = await this.agent.api.contactInfo(contact.id)
      if (!contactInfo)
        return

      // TODO: 更多信息
      // contact.gender = contactInfo.sex;
      // contact.city = contactInfo.city;
      // contact.province = contactInfo.province;
      // contact.address = contactInfo.province + contactInfo.city;
      // contact.alias = contactInfo.alias;
      // contact.signature = contactInfo.signature;
      // contact.tags = contactInfo?.labelIds.map((id) => String(id)) || [];

      await this.contactStorage.setItem(contact.id, contact)
    }
    catch (error) {
      log.error('PuppetBridge', 'updateContactPayload() exception %s', error)
    }
  }

  private async loadContacts() {
    log.verbose('PuppetBridge', 'loadContacts()')
    try {
      const contacts = await this.agent.api.contactList()

      for (const contact of contacts) {
        let contactType = PUPPET.types.Contact.Individual

        if (contact.UserName.startsWith('gh_')) {
          contactType = PUPPET.types.Contact.Official
        }
        if (contact.UserName.startsWith('@openim')) {
          contactType = PUPPET.types.Contact.Corporation
        }

        const contactPayload = {
          id: contact.UserName,
          name: contact.NickName,
          type: contactType,
          friend: true,
          phone: [] as string[],
          avatar: contact.smallHeadImgUrl,
        } as PuppetContact

        this.contactStorage.setItem(contact.UserName, contactPayload)
      }

      const updateContactPromises = (await this.contactStorage.getItemsList()).map(
        (contact) => {
          return this.updateContactPayload(contact, true)
        },
      )
      let size = updateContactPromises.length

      // update contact payload in batch
      while (size > 0) {
        await Promise.all(updateContactPromises.splice(0, 15))
        size = updateContactPromises.length
      }

      log.verbose(
        'PuppetBridge',
        'loadContacts() contacts count %s',
        size,
      )
    }
    catch (error: any) {
      log.error('PuppetBridge', 'loadContacts() exception %s', error.stack)
    }
  }

  private async loadRooms(): Promise<void> {
    log.verbose('PuppetBridge', 'loadRooms()')
    try {
      const roomsData = await this.agent.api.chatroomDetailList()

      if (!roomsData)
        throw new Error('no rooms data')

      for (const room of roomsData) {
        const chatroomMembers = await this.agent.api.chatroomMembers(
          room.UserName,
        )
        const membersPromise = room.memberIdList.map(async (userName) => {
          const contact = chatroomMembers.find(v => v.UserName === userName)
          return {
            id: contact?.UserName,
            // roomAlias: contact.alias,
            avatar: contact?.smallHeadImgUrl,
            name: contact?.NickName,
          }
        })
        const members = await Promise.all(membersPromise)
        const roomPayload = {
          id: room.UserName,
          avatar: room.smallHeadImgUrl,
          external: false,
          // ownerId: room.ownerUserName || "",
          announce: room.Announcement || '',
          topic: room.NickName || '',
          // adminIdList:
          //   chatroomMembers
          //     .filter((member) => member.isChatroomAdmin)
          //     .map((member) => member.userName) || [],
          memberIdList: room.memberIdList || [],
          members,
        } as PuppetRoom
        this.roomStorage.setItem(room.UserName, roomPayload)
      }
      log.verbose(
        'PuppetBridge',
        'loadRooms() rooms count %s',
        (await this.roomStorage.getKeys()).length,
      )
    }
    catch (error: any) {
      log.error('PuppetBridge', 'loadRooms() exception %s', error.stack)
    }
  }
  // #endregion

  // #region Utils
  private createPrefixStorage<T extends StorageValue>(storage: Storage<T>, base: string) {
    const s = prefixStorage(storage, base)

    const getItemsMap = async (base?: string) => {
      const keys = await s.getKeys(base)
      return s.getItems(keys)
    }
    return {
      ...s,
      getItemsMap,
      async getItemsList(base?: string) {
        return (await getItemsMap(base)).map(v => v.value)
      },
    }
  }

  private isRoomOps = (message: WcfRustApiRecvMsg) => {
    const type = message.type.valueOf()
    return [10000, 10002].includes(type)
  }

  private isInviteMsg = (message: Message) => {
    const type = message.type.valueOf()
    return type === 14 && message.text?.includes('邀请你加入群聊')
  }

  // #endregion
}
