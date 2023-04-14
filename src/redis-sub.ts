import assert from 'assert'
import { RedisOptions } from 'ioredis'
import { Job } from 'ymlr/src/components/.job/job'
import { ElementProxy } from 'ymlr/src/components/element-proxy'
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
export class RedisSub extends Job {
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

  async execJob() {
    if (!this.redis) {
      if (this.uri) {
        this.redis = await this.scene.newElementProxy(Redis, {
          uri: this.uri,
          opts: this.opts
        })
      } else {
        this.redis = await this.proxy.getParentByClassName<Redis>(Redis)
      }
    }
    assert(this.redis)

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    await this.redis.$.sub(this.channels, async (channel: string, message: Buffer | string) => {
      await this.addJobData({
        channelName: channel,
        channelMsg: message,
        channelData: this.tryToParseData(message.toString())
      })
    }, this.type)
  }

  async stop() {
    await this.redis?.$.stop()
    await super.stop()
    this.redis = undefined
  }
}
