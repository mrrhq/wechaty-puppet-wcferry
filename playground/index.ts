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

bot.on('room-join', (room, inviteeList, inviter, date) => {
  log.info('join')
  log.info(JSON.stringify({ room, inviteeList, inviter, date }))
})
bot.on('room-leave', (room, leverList, remover, date) => {
  log.info('leave')
  log.info(JSON.stringify({ room, leverList, remover, date }))
})
bot.on('room-topic', (room, newTopic, oldTopic, changer, date) => {
  log.info('topic')
  log.info(JSON.stringify({ room, newTopic, oldTopic, changer, date }))
})

bot.start()
