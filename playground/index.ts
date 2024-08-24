import { WechatyBuilder, log } from 'wechaty'
import { PuppetFerry } from 'wechaty-puppet-ferry'

const puppet = new PuppetFerry()
const bot = WechatyBuilder.build({
  puppet,
})

bot.on('start', () => log.info('start'))
bot.on('ready', () => log.info('ready'))
bot.on('message', (msg) => {
  const taler = msg.talker()
  if (msg.type() === bot.Message.Type.Text) {
    log.info(`${taler.name()}: ${msg.text()}`)
  }
})

bot.start()
