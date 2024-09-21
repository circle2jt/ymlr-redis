import assert from 'assert'
import { type ElementProxy } from 'ymlr/src/components/element-proxy'
import { type Element } from 'ymlr/src/components/element.interface'
import { RedisSub } from './redis-sub'

/** |**  ymlr-redis'remove
  Remove callbacks in channels after subscribing
  @example
  ```yaml
    - id: redis
      name: Global Redis
      ymlr-redis:
        uri: redis://user:pass

    - name: "subscribe a channel1"
      ymlr-redis'sub:
        name: test_channel1
        redis: ${ $vars.redis }
        channel: channel1
        runs:
          - echo: callback 01 ${ $parentState.channelName }

    - name: keep subscribing channels but it removes the handler "test_channel1"
      ymlr-redis'unsub: test_channel1
      # ymlr-redis'unsub: [test_channel1, test_channel2]

  ```
*/
export class RedisRemoveCallback implements Element {
  proxy!: ElementProxy<this>

  names?: string[]

  constructor(args: string | string[]) {
    if (typeof args === 'string') {
      this.names = [args]
    } else if (Array.isArray(args)) {
      this.names = args
    }
  }

  async exec() {
    assert(this.names?.length, 'name is required')

    this.proxy.logger.debug(`Removed callbacks ${this.names?.join(',')}`)
    await Promise.all(this.names.map(async name => {
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
