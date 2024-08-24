import type { Knex } from 'knex'

export type PromiseReturnType<T> = T extends Promise<infer R> ? R : never

export interface WcfRustApiQuerySqlOptions {
  db: 'MSG0.db' | 'MicroMsg.db'
  sql: Knex.QueryBuilder
}

export interface WcfRustApiUserOptions {
  /**
   * WcfRust 接口地址
   */
  baseURL?: string
}
export type WcfRustApiOptions = Required<WcfRustApiUserOptions>

export interface WcfRustApiDataResult<T> {
  error: null | string
  status: number
  data: T
}

export interface WcfRustApiUser {
  /**
   * 头像
   */
  big_head_url: string
  small_head_url: string
  home: string
  /**
   * 手机号
   */
  mobile: string
  /**
   * 昵称
   */
  name: string
  wxid: string
}

export interface WcfRustApiRecvMsg {
  /** 自己的消息 */
  is_self: boolean
  /** 群消息 */
  is_group: boolean
  /** 消息 id */
  id: number
  /** 消息类型 */
  type: number
  ts: number
  /** 群id */
  roomid: string
  /** 消息内容 */
  content: string
  /** 发送人 id */
  sender: string
  sign: string
  thumb: string
  extra: string
  xml: string
}
