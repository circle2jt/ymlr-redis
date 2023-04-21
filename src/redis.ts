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
  private _client?: IORedis
  get client() {
    return this._client || (this._client = new IORedis(this.uri, this.opts || {}))
  }

  uri!: string
  opts?: RedisOptions
  callbacks?: {
    id: Record<string, OnMessageTextCallback | OnPMessageTextCallback>
    text?: Record<string, Set<OnMessageTextCallback> | Set<OnPMessageTextCallback>>
    buffer?: Record<string, Set<OnMessageBufferCallback> | Set<OnPMessageBufferCallback>>
  }

  private resolve?: Function
  private promSubscribe?: Promise<any>

  constructor(private readonly _props: RedisProps) {
    const { uri, opts, ...props } = _props
    super(props as any)
    Object.assign(this, { uri, opts, _props })
    this.ignoreEvalProps.push('callbacks', '_client', '_props', 'resolve')
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
    let returnType = 1
    if (!Array.isArray(channels)) {
      channels = [channels]
      returnType = 0
    }
    const idCallbacks: string[] = []
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
            id: {},
            text: undefined,
            buffer: undefined
          }
        }
        if (!this.callbacks?.text && type === 'text') {
          this.callbacks.text = {}
          if (subType === 'sub') {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.client.on('message', this.onMessage.bind(this))
          } else {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.client.on('pmessage', this.onPMessage.bind(this))
          }
        } else if (!this.callbacks?.buffer && type === 'buffer') {
          this.callbacks.buffer = {}
          if (subType === 'sub') {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.client.on('messageBuffer', this.onMessageBuffer.bind(this))
          } else {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.client.on('pmessageBuffer', this.onPMessageBuffer.bind(this))
          }
        }
        const cbChannels = this.callbacks[type] as Record<string, Set<any>>
        assert(cbChannels, 'Channel type is not correct')
        const id = this.callbacks.id
        const rd = Math.random().toString()
        channels.forEach((channel, i) => {
          if (!cbChannels[channel]) cbChannels[channel] = new Set()

          const uuid = `${type}:${channel}:${i}:${rd}`
          id[uuid] = cb as any
          idCallbacks.push(uuid)
          cbChannels[channel].add(id[uuid] as any)
        })

        if (!this.promSubscribe) {
          this.promSubscribe = new Promise(resolve => {
            this.resolve = resolve
          })
        }
      }
    }
    return !returnType ? idCallbacks[0] : idCallbacks
  }

  async sub(channels: string[] | string, cb: OnMessageBufferCallback | OnMessageTextCallback | undefined, type = 'text' as 'text' | 'buffer') {
    return await this._sub('sub', channels, cb, type)
  }

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
          .forEach(uuid => delete this.callbacks?.id[uuid])
        delete this.callbacks?.text?.[channel]
        delete this.callbacks?.buffer?.[channel]
      })
      if (!this.callbacks?.text?.length && !this.callbacks?.buffer?.length) {
        this.callbacks = undefined
      }
    }
  }

  removeCb(uuids: string | string[]) {
    if (!Array.isArray(uuids)) {
      uuids = [uuids]
    }
    Object.keys(this.callbacks?.id || {})
      .filter(uuid => uuids.includes(uuid))
      .forEach(uuid => {
        const [type, channel] = uuid.split(':')
        const cb = this.callbacks?.id[uuid]
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this.callbacks?.[type]?.[channel]?.delete(cb, 1)
        delete this.callbacks?.id[uuid]
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
    const callbacks = this.callbacks.buffer?.[pattern.toString()] as Set<OnPMessageBufferCallback>
    if (!callbacks?.size) return
    this.logger.debug('⇠ [%s]\t%s', channel, message)
    await Promise.all([...callbacks].map(cb => cb(pattern, channel, message)))
  }

  private async onPMessage(pattern: string, channel: string, message: string) {
    if (!this.callbacks) return
    const callbacks = this.callbacks.text?.[pattern] as Set<OnPMessageTextCallback>
    if (!callbacks?.size) return
    this.logger.debug('⇠ [%s]\t%s', channel, message)
    await Promise.all([...callbacks].map(cb => cb(pattern, channel, message)))
  }

  private async onMessageBuffer(channel: Buffer, message: Buffer) {
    if (!this.callbacks) return
    const callbacks = this.callbacks.buffer?.[channel.toString()] as Set<OnMessageBufferCallback>
    if (!callbacks?.size) return
    this.logger.debug('⇠ [%s]\t%s', channel, message)
    await Promise.all([...callbacks].map(cb => cb(channel, message)))
  }

  private async onMessage(channel: string, message: string) {
    if (!this.callbacks) return
    const callbacks = this.callbacks.text?.[channel] as Set<OnMessageTextCallback>
    if (!callbacks?.size) return
    this.logger.debug('⇠ [%s]\t%s', channel, message)
    await Promise.all([...callbacks].map(cb => cb(channel, message)))
  }
}
