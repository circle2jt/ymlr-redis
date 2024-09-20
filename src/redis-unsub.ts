import assert from 'assert'
import { type ElementProxy } from 'ymlr/src/components/element-proxy'
import { type Element } from 'ymlr/src/components/element.interface'
import { RedisSub } from './redis-sub'

/** |**  ymlr-redis'unsub
  Unsubscribe channels in redis
  @example
  ```yaml
    - name: "subscribe a channel1"
      ymlr-redis'sub:
        name: test_channel1
        uri: redis://user:pass
        channel: channel1
        runs:
          - echo: callback 01 ${ $parentState.channelName }

    - name: "subscribe a channel2"
      ymlr-redis'sub:
        name: test_channel2
        uri: redis://user:pass
        channel: channel1
        runs:
          - echo: callback 02 ${ $parentState.channelName }

    - name: keep subscribing channel "channel1" but remove all "callback 01"
      # ymlr-redis'unsub: test_channel1
      ymlr-redis'unsub:
        name: test_channel1

    - name: keep subscribing channel "channel1" but remove all "callback 01", "callback 02"
      # ymlr-redis'unsub: [test_channel1, test_channel2]
      ymlr-redis'unsub:
        names: [test_channel1, test_channel2]

    - name: unsubscribe channel "channel1"
      ymlr-redis'unsub:
        channel: test_channel1

    - name: unsubscribe channel "channel1", "channel2"
      ymlr-redis'unsub:
        channels: [test_channel1, test_channel2]
  ```
*/
export class RedisUnsub implements Element {
  proxy!: ElementProxy<this>

  names?: string[]
  channels?: string[]

  constructor(args: any) {
    if (typeof args === 'string') {
      this.names = [args]
    } else if (Array.isArray(args)) {
      this.names = args
    } else if (typeof args === 'object') {
      const { name, names, channel, channels } = args as { name?: string, names?: string[], channel?: string, channels?: string[] }
      if (name || names) {
        this.names = []
        if (name) {
          this.names = [name]
        }
        if (Array.isArray(names)) {
          this.names.push(...names)
        }
      } else if (channel || channels) {
        this.channels = []
        if (channel) {
          this.channels = [channel]
        }
        if (Array.isArray(channels)) {
          this.channels.push(...channels)
        }
      }
    }
  }

  async exec() {
    let isOnlyRemoveCallback = false
    if (this.names) {
      isOnlyRemoveCallback = true
      this.proxy.logger.debug(`Removed callbacks ${this.names?.join(',')}`)
    } else if (this.channels) {
      this.proxy.logger.debug(`Unsubscribed channels ${this.channels?.join(',')}`)
    }

    assert(this.names?.length)
    await Promise.all(this.names.map(async name => {
      const existed = RedisSub.SubNames.get(name)
      if (existed) {
        await existed.stop(isOnlyRemoveCallback)
        RedisSub.SubNames.delete(name)
      }
    }))
    return []
  }

  async dispose() { }
}
