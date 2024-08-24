# wechaty-puppet-ferry

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Wechaty Puppet for WechatFerry

## Quick Start

Install:

```bash
pnpm add wechaty wechaty-puppet-ferry
```

Import:

```js
import { WechatyBuilder, log } from 'wechaty'
import { PuppetFerry } from 'wechaty-puppet-ferry'

const puppet = new PuppetFerry()
const bot = WechatyBuilder.build({ puppet })

bot.on('start', () => log.info('start'))
bot.on('ready', () => log.info('ready'))
bot.on('message', (msg) => {
  const taler = msg.talker()
  if (msg.type() === bot.Message.Type.Text) {
    log.info(`${taler.name()}: ${msg.text()}`)
  }
})

bot.start()
```

Callback:

Set [WcfRust](https://github.com/lich0821/wcf-client-rust) callback url to `http://localhost:10011/callback` and click start button

## Funding

<img src="./FUNDING.jpg" width="200" />

## License

[MIT](./LICENSE) License © 2024-PRESENT [mrrhq](https://github.com/mrrhqmao)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/wechaty-puppet-ferry?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/wechaty-puppet-ferry
[npm-downloads-src]: https://img.shields.io/npm/dm/wechaty-puppet-ferry?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/wechaty-puppet-ferry
[bundle-src]: https://img.shields.io/bundlephobia/minzip/wechaty-puppet-ferry?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=wechaty-puppet-ferry
[license-src]: https://img.shields.io/github/license/mrrhq/wechaty-puppet-ferry.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/mrrhq/wechaty-puppet-ferry/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/wechaty-puppet-ferry
