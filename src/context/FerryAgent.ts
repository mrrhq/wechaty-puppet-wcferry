import { EventEmitter } from 'node:events'
import process from 'node:process'
import { createApp, createRouter, defineEventHandler, readBody, toNodeListener } from 'h3'
import type { Listener } from 'listhen'
import { listen } from 'listhen'
import type { FerryAgentHooks, FerryAgentOptions, FerryAgentUserOptions, WcfRustApiRecvMsg } from '../types'
import { WcfRustApi } from './WcfRustApi'

export function resolveFerryAgentOptions(userOptions: FerryAgentUserOptions): FerryAgentOptions {
  return {
    api: new WcfRustApi(),
    server: {
      disabled: false,
      port: 10011,
      hostname: '0.0.0.0',
      ...userOptions.server,
    },
    ...userOptions,
  }
}

/**
 * 连接 WcfRust 和 Wechaty
 *
 * 默认的回调地址是：`http://127.0.0.1:10011/wcf`
 *
 * 如果你已经有 http 监听了，可通过 `server.disabled` 来禁用内置 http 服务器，禁用后需手动 emit 消息
 */
export class FerryAgent extends EventEmitter<FerryAgentHooks> {
  api: WcfRustApi
  private listener?: Listener
  private isLoggedIn: boolean = false
  private timer: number | null = null
  private options: FerryAgentOptions

  constructor(options: FerryAgentUserOptions = {}) {
    super()
    this.options = resolveFerryAgentOptions(options)
    this.api = this.options.api
  }

  start() {
    const { server } = this.options
    this.catchErrors()
    if (!server.disabled) {
      this.createServer(server as any)
    }
    this.startTimer()
  }

  async stop() {
    this.listener?.close()
    this.stopTimer()
  }

  private async createServer({ disabled: _, ...server }: Required<FerryAgentOptions['server']>) {
    const app = createApp()
    const router = createRouter()
    app.use(router)
    const handler = defineEventHandler(async (event) => {
      try {
        const msg = await readBody<WcfRustApiRecvMsg>(event)
        this.emit('message', msg)
        return { status: 0, message: '成功' }
      }
      catch {
        return { status: 0, message: `http://${server.hostname}:${server.port}/callback` }
      }
    })
    router.get('/**', handler)
      .post('/**', handler)
    this.listener = await listen(toNodeListener(app), { ...server, qr: false, showURL: false })
  }

  private catchErrors() {
    process.on('uncaughtException', this.stop.bind(this))
    process.on('SIGINT', this.stop.bind(this))
    process.on('exit', this.stop.bind(this))
  }

  private async checkLogin(initial = false) {
    const { data } = await this.api.isLoggedIn()
    this.isLoggedIn = data
    if (this.isLoggedIn) {
      const { data: userInfo } = await this.api.userInfo()
      this.emit('login', userInfo)
    }
    if (this.isLoggedIn || !initial) {
      // TODO: 未登录
    }
  }

  private async startTimer() {
    this.stopTimer()

    if (this.isLoggedIn)
      return

    await this.checkLogin(true)

    this.timer = setInterval(() => {
      if (this.isLoggedIn) {
        this.stopTimer()
        return
      }
      this.checkLogin()
    }, 1000 * 30) as unknown as number
  }

  private stopTimer() {
    if (!this.timer)
      return
    clearInterval(this.timer)
    this.timer = null
  }
}
