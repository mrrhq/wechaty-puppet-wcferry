import { WechatyBuilder, log } from 'wechaty'
import { PuppetFerry } from 'wechaty-puppet-ferry'

const puppet = new PuppetFerry({

})
const bot = WechatyBuilder.build({
  puppet,
})

bot.on('start', () => log.info('start'))
bot.start()
