import assert from 'assert'
import { Redis as IORedis, RedisOptions } from 'ioredis'
import { Group } from 'ymlr/src/components/group/group'
import { GroupItemProps } from 'ymlr/src/components/group/group.props'
import { RedisProps } from './redis.props'

export type OnMessageTextCallback = (channel: string, message: string) => any
export type OnPMessageTextCallback = (pattern: string, channel: string, message: string) => any

export type OnMessageBufferCallback = (channel: Buffer, message: Buffer) => any
export type OnPMessageBufferCallback = (pattern: Buffer, channel: Buffer, message: Buffer) => any
/** |**  ymlr-redis
  Declare a redis connector
  @example
  ```yaml
    - name: "[redis] localhost"
      ymlr-redis:
        uri: redis://user:pass                  # redis uri
        runs:                                   # When a message is received then it will runs them
          - echo: redis is connected
  ```
  Publish a message to channels
  ```yaml
    - name: "[redis] localhost"
      ymlr-redis:
        uri: redis://user:pass                  # redis uri
        runs:                                   # When a message is received then it will runs them
          - name: Publish a message
            ymlr-redis'pub:
              channels:
                - test
              data:
                msg: Hello world
  ```
*/
export class Redis extends Group<RedisProps, GroupItemProps> {
  uri!: string
  opts?: RedisOptions

  private callbacks?: {
    id: Map<string, OnMessageTextCallback | OnPMessageTextCallback>
    text?: Map<string, Set<OnMessageTextCallback> | Set<OnPMessageTextCallback>>
    buffer?: Map<string, Set<OnMessageBufferCallback> | Set<OnPMessageBufferCallback>>
  }

  private resolve?: Function
  private promSubscribe?: Promise<any>
  private _client?: IORedis

  get client() {
    return this._client || (this._client = new IORedis(this.uri, this.opts || {}))
  }

  constructor(private readonly _props: RedisProps) {
    const { uri, opts, ...props } = _props
    super(props as any)
    Object.assign(this, { uri, opts, _props })
    this.ignoreEvalProps.push('callbacks', '_client', '_props', 'resolve', 'promSubscribe')
  }

  async newOne() {
    const newOne = await (this.proxy.parent as Group<any, any>).newElementProxy<Redis>(Redis, this._props)
    return newOne
  }

  async waitToDone() {
    if (!this.promSubscribe) return
    return await this.promSubscribe
  }

  async pub(channels: string[] | string, data?: any) {
    if (!Array.isArray(channels)) channels = [channels]
    if (!channels?.length) return
    if (this.callbacks) throw new Error('The redis is using "subscribe" mode. Could not publish')
    let msg = data ?? ''
    if (typeof msg === 'object' && !(msg instanceof Buffer)) {
      msg = JSON.stringify(msg)
    }
    this.logger.debug('⇢ [%s]\t%j', channels.join('|'), msg.toString())
    const proms = channels.map(async channel => {
      await this.client.publish(channel, msg.toString())
    })
    if (proms?.length) {
      await Promise.all(proms)
    }
  }

  private async _sub(subType: 'sub' | 'psub', channels: string[] | string, cb: OnMessageBufferCallback | OnMessageTextCallback | OnPMessageBufferCallback | OnPMessageTextCallback | undefined, type = 'text' as 'text' | 'buffer') {
    let callbackType = 1
    const callbackIDs = [] as string[]
    if (!Array.isArray(channels)) {
      channels = [channels]
      callbackType = 0
    }
    if (channels?.length) {
      this.logger.debug(`Subscribed "${channels}" in "${this.uri}"`)
      if (channels.length) {
        if (subType === 'sub') {
          await this.client.subscribe(...channels)
        } else {
          await this.client.psubscribe(...channels)
        }
      }
      if (cb) {
        if (!this.callbacks) {
          this.callbacks = {
            id: new Map(),
            text: undefined,
            buffer: undefined
          }
        }
        if (!this.callbacks?.text && type === 'text') {
          this.callbacks.text = new Map()
          if (subType === 'sub') {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.client.on('message', this.onMessage.bind(this))
          } else {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.client.on('pmessage', this.onPMessage.bind(this))
          }
        } else if (!this.callbacks?.buffer && type === 'buffer') {
          this.callbacks.buffer = new Map()
          if (subType === 'sub') {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.client.on('messageBuffer', this.onMessageBuffer.bind(this))
          } else {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.client.on('pmessageBuffer', this.onPMessageBuffer.bind(this))
          }
        }
        const cbChannels = this.callbacks[type] as Map<string, Set<any>>
        assert(cbChannels, 'Channel type is not correct')
        const id: Map<string, any> = this.callbacks.id
        const rd = Math.random().toString()
        channels.forEach((channel, i) => {
          if (!cbChannels.has(channel)) cbChannels.set(channel, new Set())

          const callbackID = `${type}:${channel}:${i}:${rd}`
          id.set(callbackID, cb)
          cbChannels.get(channel)?.add(id.get(callbackID))
          callbackIDs.push(callbackID)
        })

        if (!this.promSubscribe) {
          this.promSubscribe = new Promise(resolve => {
            this.resolve = resolve
          })
        }
      }
    }
    return callbackType === 1 ? callbackIDs : callbackIDs[0]
  }

  async sub(channels: string, cb: OnMessageBufferCallback | OnMessageTextCallback | undefined, type?: 'text' | 'buffer'): Promise<string>
  async sub(channels: string[], cb: OnMessageBufferCallback | OnMessageTextCallback | undefined, type?: 'text' | 'buffer'): Promise<string[]>
  async sub(channels: string[] | string, cb: OnMessageBufferCallback | OnMessageTextCallback | undefined, type = 'text' as 'text' | 'buffer') {
    return await this._sub('sub', channels, cb, type)
  }

  async psub(channels: string, cb: OnPMessageBufferCallback | OnPMessageTextCallback | undefined, type?: 'text' | 'buffer'): Promise<string>
  async psub(channels: string[], cb: OnPMessageBufferCallback | OnPMessageTextCallback | undefined, type?: 'text' | 'buffer'): Promise<string[]>
  async psub(channels: string[] | string, cb: OnPMessageBufferCallback | OnPMessageTextCallback | undefined, type = 'text' as 'text' | 'buffer') {
    return await this._sub('psub', channels, cb, type)
  }

  async unsub(channels: string[] | string, isRemoveCallback = true) {
    if (typeof channels === 'string') {
      channels = [channels]
    }
    if (!channels.length) return
    this.logger.debug(`Subscribed "${channels}" in "${this.uri}"`)
    await this.client.unsubscribe(...channels)
    if (isRemoveCallback) {
      channels.forEach(channel => {
        Object.keys(this.callbacks?.id || {})
          .filter(uuid => uuid.includes(`:${channel}:`))
          .forEach(uuid => this.callbacks?.id.delete(uuid))
        this.callbacks?.text?.delete(channel)
        this.callbacks?.buffer?.delete(channel)
      })
    }
  }

  async removeCb(uuids: string | string[]) {
    if (!Array.isArray(uuids)) {
      uuids = [uuids]
    }
    [...(this.callbacks?.id.keys() || [])]
      .filter((uuid: string) => uuids.includes(uuid))
      .forEach((uuid: string) => {
        const [type, channel] = uuid.split(':')
        const cb = this.callbacks?.id.get(uuid)
        if (cb) {
          // @ts-expect-error
          const ch = this.callbacks?.[type]?.get(channel)
          ch?.delete(cb)
        }
        this.callbacks?.id.delete(uuid)
      })
  }

  async exec() {
    assert(this.uri, '"uri" is required')
    await new Promise((resolve, reject) => {
      this.client.on('connect', resolve).on('error', reject)
    })
    const rs = await super.exec()
    return rs
  }

  async stop() {
    this.client.disconnect(false)
    if (this.resolve) this.resolve(undefined)
    this._client = undefined
  }

  async dispose() {
    await this.stop()
  }

  private async onPMessageBuffer(pattern: Buffer, channel: Buffer, message: Buffer) {
    if (!this.callbacks) return
    const callbacks = this.callbacks.buffer?.get(pattern.toString()) as Set<OnPMessageBufferCallback>
    if (!callbacks?.size) return
    this.logger.debug('⇠ [%s]\t%s', channel, message)
    await Promise.all([...callbacks].map(cb => cb(pattern, channel, message)))
  }

  private async onPMessage(pattern: string, channel: string, message: string) {
    if (!this.callbacks) return
    const callbacks = this.callbacks.text?.get(pattern) as Set<OnPMessageTextCallback>
    if (!callbacks?.size) return
    this.logger.debug('⇠ [%s]\t%s', channel, message)
    await Promise.all([...callbacks].map(cb => cb(pattern, channel, message)))
  }

  private async onMessageBuffer(channel: Buffer, message: Buffer) {
    if (!this.callbacks) return
    const callbacks = this.callbacks.buffer?.get(channel.toString()) as Set<OnMessageBufferCallback>
    if (!callbacks?.size) return
    this.logger.debug('⇠ [%s]\t%s', channel, message)
    await Promise.all([...callbacks].map(cb => cb(channel, message)))
  }

  private async onMessage(channel: string, message: string) {
    if (!this.callbacks) return
    const callbacks = this.callbacks.text?.get(channel) as Set<OnMessageTextCallback>
    if (!callbacks?.size) return
    this.logger.debug('⇠ [%s]\t%s', channel, message)
    await Promise.all([...callbacks].map(cb => cb(channel, message)))
  }
}
