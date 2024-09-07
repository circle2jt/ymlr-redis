import assert from 'assert'
import { type ElementProxy } from 'ymlr/src/components/element-proxy'
import { type Element } from 'ymlr/src/components/element.interface'
import { RedisSub } from './redis-sub'

/** |**  ymlr-redis'unsub
  Unsubscribe channels in redis
  @example
  ```yaml
    - name: "subscribe a channel"
      ymlr-redis'sub:
        name: test_channel1
        uri: redis://user:pass
        channel: channel1
        runs:
          - echo: ${ $parentState.channelName }

    - name: unsubscribe a channel
      ymlr-redis'unsub: test_channel1

    - name: unsubscribe multiple channels
      ymlr-redis'unsub: [test_channel1, test_channel2]
  ```
*/
export class RedisUnsub implements Element {
  proxy!: ElementProxy<this>

  name?: string[]

  constructor(name?: string | string[]) {
    if (typeof name === 'string') {
      this.name = [name]
    } else if (Array.isArray(name)) {
      this.name = name
    }
  }

  async exec() {
    this.proxy.logger.debug(`Unsubscribe ${this.name?.join(',')}`)

    assert(this.name?.length)
    await Promise.all(this.name.map(async name => {
      const existed = RedisSub.SubNames.get(name)
      if (existed) {
        await existed.stop()
        RedisSub.SubNames.delete(name)
      }
    }))
    return []
  }

  async dispose() { }
}
