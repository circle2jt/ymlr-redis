import assert from 'assert'
import { RedisOptions } from 'ioredis'
import { ElementProxy } from 'ymlr/src/components/element-proxy'
import { Group } from 'ymlr/src/components/group/group'
import { GroupItemProps, GroupProps } from 'ymlr/src/components/group/group.props'
import { Redis } from './redis'
import { RedisSubProps } from './redis-sub.props'

/** |**  ymlr-redis'sub
  Subscribe channels in redis
  @example
  ```yaml
    - name: "[redis] localhost"
      ymlr-redis'sub:
        uri: redis://user:pass
        type: buffer                            # Message type is in [text, buffer]. Default is "text"
        channel: channel1
        channels:                               # channels which is subscribed
          - channel1
          - channel2
        runs:                                   # When a message is received then it will runs them
          - ${ $parentState }                   # - Received data in a channel
          - ${ $parentState.channelName }       # - channel name
          - ${ $parentState.channelData }       # - Received message which is cast to object
          - ${ $parentState.channelMsg }        # - Received message which is text

          - ...
          # Other elements

          - stop:
  ```

  Used in global redis
  ```yaml
    - name: Global Redis
      ymlr-redis:
        uri: redis://user:pass
        runs:
          - name: "[redis] localhost"
            ymlr-redis'sub:
              type: buffer                        # Message type is in [text, buffer]. Default is "text"
              channel: channel1
              channels:                           # channels which is subscribed
                - channel1
                - channel2
              runs:                               # When a message is received then it will runs them
                - ${ $parentState }               # - Received data in a channel
                - ${ $parentState.channelName }   # - Channel name
                - ${ $parentState.channelData }   # - Received message which is cast to object
                - ${ $parentState.channelMsg }    # - Received message which is text or buffer

                - ...
                # Other elements
  ```

  Or reuse by global variable
  ```yaml
    - id: redis
      name: Global Redis
      ymlr-redis:
        uri: redis://user:pass

    - name: "[redis] localhost"
      ymlr-redis'sub:
        name: my-test-channel                 # channel name which to reused when register again
        redis: ${ $vars.redis }
        channel: channel1
        channels:                             # channels which is subscribed
          - channel1
          - channel2
        runs:                                 # When a message is received then it will runs them
          - ${ $parentState }                 # - Received data in a channel
          - ${ $parentState.channelName }     # - channel name
          - ${ $parentState.channelData }     # - Received message which is cast to object
          - ${ $parentState.channelMsg }      # - Received message which is text

          - ...
          # Other elements
  ```
*/
export class RedisSub extends Group<GroupProps, GroupItemProps> {
  static SubNames = new Map<string, RedisSub>()
  uri?: string
  channels: string[] = []
  type = 'text' as 'text' | 'buffer'
  opts?: RedisOptions
  redis?: ElementProxy<Redis>
  name?: string

  private _resolve: any
  private t?: Promise<any>

  constructor({ uri, opts, type, channels = [], channel, redis, name, ...props }: RedisSubProps) {
    super(props)
    channel && channels.push(channel)
    Object.assign(this, { uri, opts, type, channels, redis, name })
    this.ignoreEvalProps.push('t', '_resolve')
  }

  tryToParseData(msg: string) {
    try {
      return JSON.parse(msg)
    } catch {
      return msg
    }
  }

  async exec(parentState?: any) {
    let handler = this as RedisSub
    if (this.name) {
      const existed = RedisSub.SubNames.get(this.name)
      if (!existed) {
        RedisSub.SubNames.set(this.name, this)
      } else {
        handler = existed
      }
    }
    await handler.start(parentState)

    return []
  }

  async start(parentState?: any) {
    if (this.t) return await this.t

    const redis = await this.getRedis()
    if (this.channels.some(channel => channel.includes('*'))) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      await redis.$.psub(this.channels, async (pattern: string | Buffer, channel: string | Buffer, message: Buffer | string) => {
        await this.runEachOfElements({
          ...parentState,
          channelPattern: pattern,
          channelName: channel,
          channelMsg: message,
          channelData: this.tryToParseData(message.toString())
        })
      }, this.type)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      await redis.$.sub(this.channels, async (channel: string | Buffer, message: Buffer | string) => {
        await this.runEachOfElements({
          ...parentState,
          channelName: channel,
          channelMsg: message,
          channelData: this.tryToParseData(message.toString())
        })
      }, this.type)
    }
    this.t = new Promise((resolve) => {
      this._resolve = resolve
    })
    await this.t
  }

  async stop() {
    if (!this.t) return false

    const redis = await this.getRedis()
    await redis.$.unsub(this.channels, true)
    if (this.redis) {
      await this.redis?.$.stop()
    }
    if (this.name) {
      RedisSub.SubNames.delete(this.name)
    }
    this.redis = undefined
    this._resolve?.()
    await this.t
    this.t = undefined
    return true
  }

  async dispose() {
    await this.stop()
    await super.dispose()
  }

  private async getRedis() {
    let redis = this.redis
    if (!redis) {
      if (this.uri) {
        this.redis = redis = await this.proxy.scene.newElementProxy(Redis, {
          uri: this.uri,
          opts: this.opts
        })
        redis.logger = this.proxy.logger
        await redis.exec()
      } else {
        redis = await this.proxy.getParentByClassName<Redis>(Redis)
      }
    }
    assert(redis, '"uri" is required OR "ymlr-redis\'pub" only be used in "ymlr-redis"')
    return redis
  }
}
