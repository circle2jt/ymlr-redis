import assert from 'assert'
import { Redis as IORedis, RedisOptions } from 'ioredis'
import { Group } from 'ymlr/src/components/group/group'
import { GroupItemProps } from 'ymlr/src/components/group/group.props'
import { RedisProps } from './redis.props'

type OnMessageTextCallback = (channel: string, message: string) => any
type OnMessageBufferCallback = (channel: string, message: Buffer) => any
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
    text: Record<string, OnMessageTextCallback[]>
    buffer: Record<string, OnMessageBufferCallback[]>
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

  async pub(channels: string[] | string, data?: any) {
    if (!Array.isArray(channels)) channels = [channels]
    if (!channels?.length) return
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

  async sub(channels: string[] | string, cb: OnMessageBufferCallback | OnMessageTextCallback | undefined, type = 'text' as 'text' | 'buffer') {
    if (!Array.isArray(channels)) channels = [channels]
    if (!channels?.length) return
    this.logger.debug(`Subscribed "${channels}" in "${this.uri}"`)
    await this.client.subscribe(...channels)
    if (cb) {
      if (!this.callbacks) {
        this.callbacks = {
          text: {},
          buffer: {}
        }
        if (type === 'text') {
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          this.client.on('message', this.onMessage.bind(this))
        } else {
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          this.client.on('messageBuffer', this.onMessageBuffer.bind(this))
        }
      }
      const cbChannels = this.callbacks[type]
      for (const channel of channels) {
        if (!cbChannels[channel]) cbChannels[channel] = []
        cbChannels[channel].push(cb as any)
      }
    }

    if (!this.promSubscribe) {
      this.promSubscribe = new Promise(resolve => {
        this.resolve = resolve
      })
    }
    await this.promSubscribe
  }

  async onMessageBuffer(channel: string, message: Buffer) {
    if (!this.callbacks) return
    const callbacks = this.callbacks.buffer[channel]
    if (!callbacks?.length) return
    this.logger.debug('⇠ [%s]\t%s', channel, message)
    await Promise.all(callbacks.map(cb => cb(channel, message)))
  }

  async onMessage(channel: string, message: string) {
    if (!this.callbacks) return
    const callbacks = this.callbacks.text[channel]
    if (!callbacks?.length) return
    this.logger.debug('⇠ [%s]\t%s', channel, message)
    await Promise.all(callbacks.map(cb => cb(channel, message)))
  }

  async unsub(channels?: string[]) {
    if (!channels?.length) return
    this.logger.debug(`Subscribed "${channels}" in "${this.uri}"`)
    await this.client.unsubscribe(...channels)
    channels?.forEach(channel => {
      delete this.callbacks?.text[channel]
      delete this.callbacks?.buffer[channel]
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
    if (!this._client) return
    this.client.disconnect(false)
    if (this.resolve) this.resolve(undefined)
    this._client = undefined
  }

  async dispose() {
    await this.stop()
  }
}
