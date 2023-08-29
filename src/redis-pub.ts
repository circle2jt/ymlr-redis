import assert from 'assert'
import { RedisOptions } from 'ioredis'
import { ElementProxy } from 'ymlr/src/components/element-proxy'
import { Element } from 'ymlr/src/components/element.interface'
import { Redis } from './redis'
import { RedisPubProps } from './redis-pub.props'

/** |**  ymlr-redis'pub
  Publish a message to channels in redis
  @example
  Publish a message to redis
  ```yaml
    - name: "[redis] localhost"
      ymlr-redis'pub:
        uri: redis://user:pass
        channel: channel1
        channels:
          - channel2
          - channel3
        data:
          name: thanh
  ```

  Reuse redis connection to publish multiple times
  ```yaml
    - name: "[redis] localhost"
      ymlr-redis:
        uri: redis://user:pass
        runs:
          - ymlr-redis'pub:
              channels:
                - channel1
              data:
                name: thanh
          - ...
          # Other elements
  ```

  Or reuse by global variable
  Reuse redis connection to publish multiple times
  ```yaml
    - name: "[redis] localhost"
      ymlr-redis:
        uri: redis://user:pass
      vars:
        redis1: ${this}

    - ymlr-redis'pub:
        redis: ${ $vars.redis1 }
        channels:
          - channel1
        data:
          name: thanh
  ```
*/
export class RedisPub implements Element {
  // ignoreEvalProps = ['redis']
  proxy!: ElementProxy<this>

  uri?: string
  opts?: RedisOptions
  data?: any
  channels: string[] = []

  redis?: ElementProxy<Redis>

  constructor({ channels = [], channel, redis, ...props }: RedisPubProps) {
    channel && channels.push(channel)
    Object.assign(this, { channels, redis, ...props })
  }

  async exec(parentState: any) {
    assert(this.channels.length > 0)
    let redis = this.redis
    if (!redis) {
      if (this.uri) {
        redis = this.redis = await this.proxy.scene.newElementProxy(Redis, {
          uri: this.uri,
          opts: this.opts
        })
        redis.logger = this.proxy.logger
        await this.redis.exec(parentState)
      } else {
        redis = await this.proxy.getParentByClassName<Redis>(Redis)
      }
    }
    assert(redis, '"uri" is required OR "ymlr-redis\'pub" only be used in "ymlr-redis"')
    await redis.$.pub(this.channels, this.data)
    return this.data
  }

  async stop() {
    if (this.uri) {
      await this.redis?.$.stop()
      this.redis = undefined
    }
  }

  async dispose() {
    await this.stop()
  }
}
