import type { Buffer } from 'node:buffer'
import knex from 'knex'

// #region MicroMsg.db
export interface Contact {
  Alias?: string
  NickName: string
  PYInitial: string
  QuanPin: string
  UserName: string
  Type: number
  VerifyFlag: number
  Remark?: string
  RemarkPYInitial?: string
}

export interface ChatRoomInfo {
  Announcement: string
  AnnouncementEditor: string
  AnnouncementPublishTime: string
  ChatRoomName: string
  InfoVersion: string
}

export interface ChatRoom {
  ChatRoomName: string
  RoomData: Buffer
}

export interface ContactHeadImgUrl {
  bigHeadImgUrl: string
  smallHeadImgUrl: string
  usrName: string
}
// #endregion

// #region MSG0.db

export interface MSG {
  localId?: number
  TalkerId?: number
  MsgSvrID: number
  Type: number
  SubType: number
  IsSender: number
  CreateTime: number
  Sequence?: number
  StatusEx?: number
  FlagEx: number
  Status: number
  MsgServerSeq: number
  MsgSequence: number
  StrTalker: string
  StrContent: string
  BytesExtra: Buffer
}

export interface Name2ID {
  UsrName: string
}

// #endregion

declare module 'knex/types/tables' {
  interface Tables {
    Contact: Contact
    ChatRoomInfo: ChatRoomInfo
    ChatRoom: ChatRoom
    ContactHeadImgUrl: ContactHeadImgUrl

    MSG: MSG
    Name2ID: Name2ID
  }
}

const db = knex({
  client: 'sqlite3',
  useNullAsDefault: true,
})

export function useMicroMsgDbQueryBuilder() {
  return {
    db: 'MicroMsg.db' as const,
    knex: db,
  }
}

export function useMSG0DbQueryBuilder() {
  return {
    db: 'MSG0.db' as const,
    knex: db,
  }
}
