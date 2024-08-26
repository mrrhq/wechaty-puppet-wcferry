import EventEmitter from 'node:events'
import type { Buffer } from 'node:buffer'
import process from 'node:process'
import type { Knex } from 'knex'
import type { FileSavableInterface, RawMessage, UserInfo, Wcferry, WcferryOptions } from '@wcferry/core'
import * as _WcferryCore from '@wcferry/core'

import type { wcf } from '@wcferry/core/src/lib/proto-generated/wcf'
import { interopDefault } from 'mlly'
import { decodeBytesExtra, decodeRoomData, getWxidFromBytesExtra } from '../utils'
import type { MSG } from './knex'
import { useMSG0DbQueryBuilder, useMicroMsgDbQueryBuilder } from './knex'

const WcferryCore = interopDefault(_WcferryCore)

type PromiseReturnType<T> = T extends Promise<infer R> ? R : never

export interface FerryAgentHooks {
  message: [msg: RawMessage]
  login: [user: UserInfo]
  logout: []
  error: [error: Error]
}

export class AgentWcferry extends EventEmitter<FerryAgentHooks> implements Pick<Wcferry, 'sendTxt' | 'sendFile' | 'sendImage' | 'sendRichText' | 'forwardMsg' | 'dbSqlQuery' | 'start' | 'stop'> {
  wcf: Wcferry
  private timer: number | null = null
  private isLoggedIn = false
  constructor(options: WcferryOptions = {}) {
    super()
    this.wcf = new WcferryCore.Wcferry(options)
  }

  start() {
    this.wcf.start()
    this.startTimer()
    this.catchErrors()
    this.wcf.on(msg => this.emit('message', msg.raw))
  }

  stop(error?: any) {
    this.stopTimer()
    this.wcf.stop()

    if (error) {
      this.emit('error', error)
    }

    if (this.isLoggedIn) {
      this.emit('logout')
    }
  }

  sendImage(image: string | Buffer | { type: 'Buffer', data: number[] } | FileSavableInterface, receiver: string) {
    return this.wcf.sendImage(image, receiver)
  }

  sendFile(file: string | Buffer | { type: 'Buffer', data: number[] } | FileSavableInterface, receiver: string) {
    return this.wcf.sendFile(file, receiver)
  }

  sendRichText(desc: Omit<ReturnType<wcf.RichText['toObject']>, 'receiver'>, receiver: string) {
    return this.wcf.sendRichText(desc, receiver)
  }

  forwardMsg(msgid: string, receiver: string) {
    return this.wcf.forwardMsg(msgid, receiver)
  }

  sendTxt(msg: string, receiver: string, aters?: string | string[]): number {
    return this.wcf.sendTxt(msg, receiver, Array.isArray(aters) ? aters.join(',') : aters)
  }

  dbSqlQuery<T>(db: string, sql: string | Knex.QueryBuilder): T {
    return this.wcf.dbSqlQuery(db, typeof sql === 'string' ? sql : sql.toQuery()) as T
  }

  private catchErrors() {
    process.on('uncaughtException', this.stop.bind(this))
    process.on('SIGINT', this.stop.bind(this))
    process.on('exit', this.stop.bind(this))
  }

  private checkLogin() {
    this.isLoggedIn = this.wcf.isLogin()
    if (this.isLoggedIn) {
      const userInfo = this.wcf.getUserInfo()
      this.emit('login', userInfo)
      this.stopTimer()
    }
  }

  private startTimer() {
    this.stopTimer()
    this.checkLogin()

    setInterval(() => {
      if (this.isLoggedIn) {
        return this.stopTimer()
      }
      this.checkLogin()
    }, 5000)
  }

  private stopTimer() {
    clearInterval(this.timer!)
    this.timer = null
  }

  // #region MicroMsg.db
  /**
   * 群聊详细列表
   */
  getChatRoomDetailList() {
    const { db, knex } = useMicroMsgDbQueryBuilder()

    const sql = knex
      .from('ChatRoomInfo')
      .select(
        'Announcement',
        'AnnouncementEditor',
        'AnnouncementPublishTime',
        'InfoVersion',
      )
      .leftJoin('Contact', 'ChatRoomInfo.ChatRoomName', 'Contact.UserName')
      .select(
        knex.ref('NickName').withSchema('Contact'),
        knex.ref('UserName').withSchema('Contact'),
      )
      .leftJoin(
        'ChatRoom',
        'ChatRoomInfo.ChatRoomName',
        'ChatRoom.ChatRoomName',
      )
      .select(knex.ref('RoomData').withSchema('ChatRoom'))
      .leftJoin(
        'ContactHeadImgUrl',
        'Contact.UserName',
        'ContactHeadImgUrl.usrName',
      )
      .select(knex.ref('smallHeadImgUrl').withSchema('ContactHeadImgUrl'))

    const list = this.dbSqlQuery<PromiseReturnType<typeof sql>>(db, sql)

    return list.map((v) => {
      const RoomData = v.RoomData
      const data = decodeRoomData(RoomData)
      const memberIdList = data.members?.map((v: any) => v.wxID) as string[]
      return {
        ...v,
        memberIdList,
      }
    })
  }

  /**
   * 群聊信息
   * @param userName roomId
   */
  getChatRoomInfo(
    userName: string,
  ) {
    const { db, knex } = useMicroMsgDbQueryBuilder()

    const sql = knex
      .from('ChatRoomInfo')
      .select(
        'Announcement',
        'AnnouncementEditor',
        'AnnouncementPublishTime',
        'InfoVersion',
      )
      .leftJoin('Contact', 'ChatRoomInfo.ChatRoomName', 'Contact.UserName')
      .select(
        knex.ref('NickName').withSchema('Contact'),
        knex.ref('userName').withSchema('Contact'),
      )
      .leftJoin(
        'ContactHeadImgUrl',
        'Contact.UserName',
        'ContactHeadImgUrl.usrName',
      )
      .select(knex.ref('smallHeadImgUrl').withSchema('ContactHeadImgUrl'))
      .leftJoin(
        'ChatRoom',
        'ChatRoomInfo.ChatRoomName',
        'ChatRoom.ChatRoomName',
      )
      .select(knex.ref('RoomData').withSchema('ChatRoom'))
      .where('ChatRoomInfo.ChatRoomName', userName)

    const [data] = this.dbSqlQuery<PromiseReturnType<typeof sql>>(db, sql)
    const { members } = decodeRoomData(data.RoomData)
    const memberIdList = members?.map((v: any) => v.wxID) as string[]
    return {
      ...data,
      memberIdList,
    }
  }

  /**
   * 群聊成员
   * @param userName roomId
   */
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-expect-error
  override getChatRoomMembers(userName: string) {
    const { db, knex } = useMicroMsgDbQueryBuilder()
    const { memberIdList } = this.getChatRoomInfo(userName)
    const sql = knex
      .from('Contact')
      .select('NickName', 'UserName')
      .whereIn(
        'UserName',
        memberIdList,
      )
      .leftJoin(
        'ContactHeadImgUrl',
        'Contact.UserName',
        'ContactHeadImgUrl.usrName',
      )
      .select(knex.ref('smallHeadImgUrl').withSchema('ContactHeadImgUrl'))

    return this.dbSqlQuery<PromiseReturnType<typeof sql>>(db, sql)
  }

  /**
   * 联系人信息
   * @param userName wxid 或 roomId
   */
  getContactInfo(userName: string) {
    const { db, knex } = useMicroMsgDbQueryBuilder()
    const sql = knex.from('Contact').where('UserName', userName)
    const [data] = this.dbSqlQuery<PromiseReturnType<typeof sql>>(db, sql)
    return data
  }

  /**
   * 联系人列表
   */
  getContactList() {
    const { db, knex } = useMicroMsgDbQueryBuilder()
    const sql = knex
      .from('Contact')
      .select('NickName', 'UserName', 'Remark', 'PYInitial', 'RemarkPYInitial')
      .leftJoin(
        'ContactHeadImgUrl',
        'Contact.UserName',
        'ContactHeadImgUrl.usrName',
      )
      .select(knex.ref('smallHeadImgUrl').withSchema('ContactHeadImgUrl'))
      .where('VerifyFlag', 0)
      .andWhere(function () {
        this.where('Type', 3).orWhere('Type', '>', 50)
      })
      .andWhere('Type', '!=', 2050)
      .andWhereNot(function () {
        this.whereIn('UserName', ['qmessage', 'tmessage'])
      })
      .andWhereNot('UserName', 'like', '%chatroom%')
      .orderBy('Remark', 'desc')

    return this.dbSqlQuery<PromiseReturnType<typeof sql>>(db, sql)
  }
  // #endregion

  // #region MSG0.db

  /**
   * talkerId
   * @description 用于查询聊天记录
   * @param userName wxid 或 roomId
   */
  getTalkerId(userName: string) {
    const { db, knex } = useMSG0DbQueryBuilder()
    const sql = knex
      .with(
        'TalkerId',
        knex.raw(
          'select ROW_NUMBER() over(order by (select 0)) AS TalkerId, * FROM Name2ID',
        ),
      )
      .select('*')
      .from('TalkerId')
      .where('UsrName', userName)

    const [data] = this.dbSqlQuery<{ TalkerId: string }[]>(db, sql)
    return data.TalkerId
  }

  /**
   * 历史聊天记录
   *
   * @description 建议注入查询条件，不然非常的卡
   * @param userName wxid wxid 或 roomId
   * @param filter 注入查询条件
   */
  getHistoryMessageList(
    userName: string,
    filter?: (sql: Knex.QueryBuilder<MSG>) => void,
  ) {
    const talkerId = this.getTalkerId(userName)
    const { db, knex } = useMSG0DbQueryBuilder()
    const sql = knex
      .from('MSG')
      .select(
        'localId',
        'TalkerId',
        'MsgSvrID',
        'Type',
        'SubType',
        'IsSender',
        'CreateTime',
        'Sequence',
        'StatusEx',
        'FlagEx',
        'Status',
        'MsgServerSeq',
        'MsgSequence',
        'StrTalker',
        'StrContent',
        'BytesExtra',
      )
      .where('TalkerId', talkerId)
      .orderBy('CreateTime', 'desc')

    filter?.(sql)

    const data = this.dbSqlQuery<PromiseReturnType<typeof sql>>(db, sql)
    return data.map((msg) => {
      const BytesExtra = decodeBytesExtra(msg.BytesExtra)
      const wxid = getWxidFromBytesExtra(BytesExtra)
      return {
        ...msg,
        talkerWxid: wxid,
      }
    })
  }
}
