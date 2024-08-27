import { WechatyBuilder, log } from 'wechaty'
import { PuppetWcferry } from 'wechaty-puppet-wcferry'

const puppet = new PuppetWcferry()
const bot = WechatyBuilder.build({
  puppet,
})

bot.on('start', () => log.info('start'))
bot.on('ready', () => {
  bot.Room.findAll()
})
bot.on('login', user => log.info(`${user.name()} login`))
bot.on('message', (msg) => {
  const taler = msg.talker()
  if (msg.type() === bot.Message.Type.Text) {
    log.info(`${taler.name()}: ${msg.text()}`)
  }
})

bot.start()
