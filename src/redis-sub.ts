import assert from 'assert'
import { type RedisOptions } from 'ioredis'
import { type ElementProxy } from 'ymlr/src/components/element-proxy'
import { type Element } from 'ymlr/src/components/element.interface'
import type Group from 'ymlr/src/components/group'
import { type GroupItemProps, type GroupProps } from 'ymlr/src/components/group/group.props'
import { Redis } from './redis'
import { type RedisSubProps } from './redis-sub.props'

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

          - stop:                             # - Stop subscribing
  ```
*/
export class RedisSub implements Element {
  readonly ignoreEvalProps = ['t', '_resolve', '_cbIDs']
  readonly proxy!: ElementProxy<this>
  readonly innerRunsProxy!: ElementProxy<Group<GroupProps, GroupItemProps>>

  static SubNames = new Map<string, RedisSub>()

  uri?: string
  channels: string[] = []
  type = 'text' as 'text' | 'buffer'
  opts?: RedisOptions
  redis?: ElementProxy<Redis>
  name?: string

  private _resolve: any
  private readonly _cbIDs = [] as string[]
  private t?: Promise<any>

  constructor({ uri, opts, type, channels = [], channel, name, redis }: RedisSubProps) {
    channel && channels.push(channel)
    Object.assign(this, { uri, opts, type, channels, redis, name })
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

    await handler.start(parentState)

    return []
  }

  async start(parentState: any) {
    assert(this.redis, '"uri" is required OR "ymlr-redis\'pub" only be used in "ymlr-redis"')

    if (this.t) return false

    let _cbIDs = []
    if (this.channels.some(channel => channel.includes('*'))) {
      _cbIDs = await this.redis.$.psub(this.channels, async (pattern: string | Buffer, channel: string | Buffer, message: Buffer | string) => {
        await this.innerRunsProxy.exec({
          ...parentState,
          channelPattern: pattern,
          channelName: channel,
          channelMsg: message,
          channelData: this.tryToParseData(message.toString())
        })
      }, this.type)
      this._cbIDs.push(..._cbIDs)
    } else {
      _cbIDs = await this.redis.$.sub(this.channels, async (channel: string | Buffer, message: Buffer | string) => {
        await this.innerRunsProxy.exec({
          ...parentState,
          channelName: channel,
          channelMsg: message,
          channelData: this.tryToParseData(message.toString())
        })
      }, this.type)
    }
    this._cbIDs.push(..._cbIDs)
    this.t = new Promise((resolve) => {
      this._resolve = resolve
    })
    await this.t
    return true
  }

  async stop(onlyRemoveCallback: boolean) {
    if (!this.t) return false

    if (!onlyRemoveCallback) {
      await this.redis?.$.unsub(this.channels, true)
    } else {
      await this.redis?.$.removeCb(this._cbIDs)
    }
    if (this.uri) {
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
    await this.stop(true)
  }
}
