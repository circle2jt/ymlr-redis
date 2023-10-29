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
        redis: ${ $vars.redis }
        channel: channel1
        channels:                             # channels which is subscribed
          - channel1
          - channel2
        runs:                               # When a message is received then it will runs them
          - ${ $parentState }               # - Received data in a channel
          - ${ $parentState.channelName }     # - channel name
          - ${ $parentState.channelData }     # - Received message which is cast to object
          - ${ $parentState.channelMsg }      # - Received message which is text

          - ...
          # Other elements
  ```
*/
export class RedisSub extends Group<GroupProps, GroupItemProps> {
  uri?: string
  channels: string[] = []
  type = 'text' as 'text' | 'buffer'
  opts?: RedisOptions
  redis?: ElementProxy<Redis>

  constructor({ uri, opts, type, channels = [], channel, redis, ...props }: RedisSubProps) {
    super(props as any)
    channel && channels.push(channel)
    Object.assign(this, { uri, opts, type, channels, redis })
    // this.ignoreEvalProps.push('redis')
  }

  tryToParseData(msg: string) {
    try {
      return JSON.parse(msg)
    } catch {
      return msg
    }
  }

  async exec(parentState?: any) {
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
    await redis.$.waitToDone()

    return []
  }

  async stop() {
    await this.redis?.$.unsub(this.channels, true)
    await this.redis?.$.stop()
    this.redis = undefined
  }

  async dispose() {
    await this.stop()
    await super.dispose()
  }
}
