import type { $Fetch } from 'ofetch'
import { $fetch } from 'ofetch'
import type { Knex } from 'knex'
import type { PromiseReturnType, WcfRustApiDataResult, WcfRustApiOptions, WcfRustApiQuerySqlOptions, WcfRustApiUser, WcfRustApiUserOptions } from '../types'
import { decodeBytesExtra, decodeRoomData, getWxidFromBytesExtra } from '../utils'
import type { MSG } from './knex'
import { useMSG0DbQueryBuilder, useMicroMsgDbQueryBuilder } from './knex'

export function resolveWcfRustApiOptions(userOptions: WcfRustApiUserOptions): WcfRustApiOptions {
  return {
    baseURL: 'http://127.0.0.1:10010',
    ...userOptions,
  }
}

export class WcfRustApi {
  fetch: $Fetch
  constructor(options: WcfRustApiUserOptions = {}) {
    const { baseURL } = resolveWcfRustApiOptions(options)
    this.fetch = $fetch.create({
      baseURL,
    })
  }

  private post<T>(request: string, body: Record<string, any>) {
    return this.fetch<WcfRustApiDataResult<T>>(request, {
      method: 'POST',
      body,
    })
  }

  private get<T>(request: string) {
    return this.fetch<WcfRustApiDataResult<T>>(request)
  }

  /**
   * 执行 SQL
   */
  async querySql<T>(options: WcfRustApiQuerySqlOptions) {
    const { data } = await this.post<T>('/sql', { ...options, sql: options.sql.toQuery() })
    return data
  }

  // #region WCF API
  /**
   * 登录账号信息
   */
  userInfo() {
    return this.get<WcfRustApiUser>('/userinfo')
  }

  /**
   * 登录态
   */
  isLoggedIn() {
    return this.get<boolean>('/islogin')
  }

  // #endregion

  // #region MicroMsg.db

  /**
   * 联系人列表
   */
  contactList() {
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

    return this.querySql<PromiseReturnType<typeof sql>>({
      db,
      sql,
    })
  }

  /**
   * 联系人信息
   * @param userName wxid 或 roomId
   */
  async contactInfo(userName: string) {
    const { db, knex } = useMicroMsgDbQueryBuilder()
    const sql = knex.from('Contact').where('UserName', userName)
    const [data] = await this.querySql<PromiseReturnType<typeof sql>>({
      db,
      sql,
    })

    return data
  }

  /**
   * 群聊详细列表
   */
  async chatroomDetailList() {
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

    const list = await this.querySql<PromiseReturnType<typeof sql>>({
      db,
      sql,
    })

    return list.map((v) => {
      const RoomData = v.RoomData
      const data = decodeRoomData(RoomData)
      const memberIdList = data.members.map((v: any) => v.wxID) as string[]
      return {
        ...v,
        memberIdList,
      }
    })
  }

  /**
   * 群聊列表
   */
  chatroomList() {
    const { db, knex } = useMicroMsgDbQueryBuilder()
    const sql = knex
      .from('Contact')
      .select(
        'NickName',
        'UserName',
        'Remark',
        'PYInitial',
        'RemarkPYInitial',
        'Type',
      )
      .whereIn('Type', [2, 2050])
      .orWhere(function () {
        this.where('Type', 3).andWhereLike('UserName', '%chatroom%')
      })
    return this.querySql<PromiseReturnType<typeof sql>>({
      db,
      sql,
    })
  }

  /**
   * 群聊信息
   * @param userName roomId
   */
  async chatroomInfo(
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

    const [data] = await this.querySql<PromiseReturnType<typeof sql>>({
      db,
      sql,
    })
    const { members } = decodeRoomData(data.RoomData)
    const memberIdList = members.map((v: any) => v.wxID) as string[]

    return {
      ...data,
      memberIdList,
    }
  }

  /**
   * 群聊成员
   * @param userName roomId
   */
  async chatroomMembers(userName: string) {
    const { db, knex } = useMicroMsgDbQueryBuilder()
    const { memberIdList } = await this.chatroomInfo(userName)

    const sql = knex
      .from('Contact')
      .select('NickName', 'UserName')
      .whereIn(
        'UserName',
        memberIdList.map((v: any) => v.wxID),
      )
      .leftJoin(
        'ContactHeadImgUrl',
        'Contact.UserName',
        'ContactHeadImgUrl.usrName',
      )
      .select(knex.ref('smallHeadImgUrl').withSchema('ContactHeadImgUrl'))

    return await this.querySql<PromiseReturnType<typeof sql>>({
      db,
      sql,
    })
  }

  // #endregion

  // #region MSG0.db

  /**
   * talkerId
   * @description 用于查询聊天记录
   * @param userName wxid 或 roomId
   */
  async talkerId(userName: string) {
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

    const [data] = await this.querySql<{ TalkerId: string }[]>({
      db,
      sql,
    })
    return Number(data.TalkerId)
  }

  /**
   * 历史聊天记录
   *
   * @description 建议注入查询条件，不然非常的卡
   * @param userName wxid wxid 或 roomId
   * @param interceptor 注入查询条件
   */
  async historyMessageList(
    userName: string,
    interceptor?: (sql: Knex.QueryBuilder<MSG>) => void,
  ) {
    const talkerId = await this.talkerId(userName)
    const { db, knex } = useMSG0DbQueryBuilder()
    const sql = knex
      .from('MSG')
      .where('TalkerId', talkerId)
      .orderBy('CreateTime', 'desc')

    interceptor?.(sql)
    if (sql.toQuery().includes('BytesExtra')) {
      throw new Error('必须 select BytesExtra')
    }

    const data = await this.querySql<PromiseReturnType<typeof sql>>({
      db,
      sql,
    })
    return data.map((msg) => {
      const BytesExtra = decodeBytesExtra(msg.BytesExtra)
      const wxid = getWxidFromBytesExtra(BytesExtra)
      return {
        ...msg,
        talkerWxid: wxid,
      }
    })
  }

  // #endregion

  // #region 发送消息

  /**
   * 发送文本消息
   *
   * @param userName wxid 或 roomId
   * @param content 文本内容
   * @param atUserList 要 @ 的 wxid 列表
   */
  sendText(userName: string, content: string, atUserList: string[] = []) {
    return this.post('/text', {
      aters: atUserList.join(','),
      msg: content,
      receiver: userName,
    })
  }

  /**
   * 发送图片
   *
   * @param userName  wxid 或 roomId
   * @param filePath 图片路径
   */
  sendImage(userName: string, filePath: string) {
    return this.post('/image', {
      path: filePath,
      receiver: userName,
    })
  }

  /**
   * 发送文件
   *
   * @param userName wxid 或 roomId
   * @param filePath 文件路径
   */
  sendFile(userName: string, filePath: string) {
    return this.post('/file', {
      path: filePath,
      receiver: userName,
    })
  }

  /**
   * 转发消息
   *
   * @param userName wxid 或 roomId
   * @param messageId 要转发的消息 id
   */
  forwardMessage(userName: string, messageId: string) {
    return this.post('/forward-msg', { receiver: userName, id: messageId })
  }

  // #endregion
}
