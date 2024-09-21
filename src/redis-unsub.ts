import assert from 'assert'
import { type RedisOptions } from 'ioredis'
import { type ElementProxy } from 'ymlr/src/components/element-proxy'
import { type Element } from 'ymlr/src/components/element.interface'
import { Redis } from './redis'
import { type RedisUnSubProps } from './redis-unsub.props'

/** |**  ymlr-redis'unsub
  Unsubscribe channels in redis
  @example
  ```yaml
    - id: redis
      name: Global Redis
      ymlr-redis:
        uri: redis://user:pass

    - name: "[redis] localhost"
      ymlr-redis'unsub:
        redis: ${ $vars.redis }
        channel: channel1
        channels:                             # channels which are unsubscribed
          - channel1
          - channel2
  ```
*/
export class RedisUnSub implements Element {
  readonly ignoreEvalProps = []
  readonly proxy!: ElementProxy<this>

  uri?: string
  channels: string[] = []
  opts?: RedisOptions
  redis?: ElementProxy<Redis>
  name?: string

  constructor({ uri, channels = [], channel, redis }: RedisUnSubProps) {
    channel && channels.push(channel)
    Object.assign(this, { uri, channels, redis })
  }

  async exec() {
    if (!this.redis) {
      if (this.uri) {
        this.redis = await this.proxy.scene.newElementProxy(Redis, {
          uri: this.uri,
          opts: this.opts
        })
        this.redis.logger = this.proxy.logger
        await this.redis.exec()
      } else {
        this.redis = this.proxy.getParentByClassName<Redis>(Redis)
      }
    }

    assert(this.redis)

    const pchannels = this.channels.filter(channel => channel.includes('*'))
    const nchannels = this.channels.filter(channel => !channel.includes('*'))
    if (pchannels.length) {
      await this.redis.$.punsubscribe(...pchannels)
    }
    if (nchannels.length) {
      await this.redis.$.unsubscribe(...nchannels)
    }

    return []
  }

  async dispose() {

  }
}
