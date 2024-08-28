import { WechatyBuilder, log } from 'wechaty'
import { PuppetWcferry } from 'wechaty-puppet-wcferry'

const puppet = new PuppetWcferry()
const bot = WechatyBuilder.build({
  puppet,
})

bot.on('start', () => log.info('start'))
bot.on('ready', async () => {
  // const url = await bot.UrlLink.create('https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzkwOTY3NzMyNw==&action=getalbum&album_id=3407764666267844610')
  // url = Object.assign(url, {
  //   payload: {
  //     ...url.payload,
  //     title: '🎉 欢迎 KeJun 加入一起搞 AI',
  //     description: 'AI 爱好者聚集地！\n互相帮助，理性交流\n历史日报直接点我',
  //     account: 'gh_1cc23d6cc50e',
  //     name: '禁止广告，多多交流',
  //   },
  // })
  // bot.say(url)
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
