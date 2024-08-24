import type { WcfRustApi } from '..'
import type { WcfRustApiRecvMsg, WcfRustApiUser } from '.'

export interface FerryAgentHooks {
  message: [msg: WcfRustApiRecvMsg]
  login: [userInfo: WcfRustApiUser]
}

export interface FerryAgentUserOptions {
  api?: WcfRustApi
  server?: {
    /**
     * 禁用内置 http 服务器，默认回调地址为 `/wcf`
     * 禁用后需要手动 `agent.emit('message', msg)`
     * @default false
     */
    disabled?: boolean
    /**
     * @default 10011
     */
    port?: number
    /**
     * @default "0.0.0.0"
     */
    hostname?: string
  }
}

export type FerryAgentOptions = Required<FerryAgentUserOptions>
