import assert from 'assert'
import { JobsOptions, Queue, QueueOptions } from 'bullmq'
import { RedisOptions } from 'ioredis'
import { ElementProxy } from 'ymlr/src/components/element-proxy'
import { Element } from 'ymlr/src/components/element.interface'
import { Redis } from './redis'

/** |**  ymlr-redis'job
  Add a new job with input data to do async
  @example
  ```yaml
    - name: Crop image size
      ymlr-redis'job:
        uri: redis://user:pass
        opts:                               # ioredis options
        name: Crop Image                    # Queue name
        queueOpts:                          # Job queue options (https://docs.bullmq.io)
        jobOpts:                            # Job options (https://docs.bullmq.io)
          removeOnComplete: true
        data:                               # Job data
          url: http://...
          type: jpeg
          size:
            width: 10
            height: 10
  ```

  Declare global then reused by code
  ```yaml
    - name: Crop image size
      id: processImageJobsProxy
      detach: false                         # Dont release connection, keep it's used in background
      ymlr-redis'job:
        uri: redis://user:pass
        opts:                               # ioredis options
        name: Crop Image                    # Queue name
        queueOpts:                          # Job queue options (https://docs.bullmq.io)
        jobOpts:                            # Job options (https://docs.bullmq.io)
          removeOnComplete: true

    - js: |
        await $vars.processImageJobsProxy.$.add({
          url: 'http://...',
          type: 'jpeg',
          size: {
            width: 10,
            height: 10
          }
        }, {
          removeOnFail: true
        })
  ```
*/
export class RedisJob implements Element {
  proxy!: ElementProxy<this>

  uri?: string
  opts?: RedisOptions
  redis?: ElementProxy<Redis>
  queueOpts?: QueueOptions
  name!: string

  queue!: Queue
  data?: any
  jobOpts: JobsOptions = {
    removeOnComplete: true
  }

  constructor(props: any) {
    Object.assign(this, props)
  }

  async exec() {
    assert(this.name)

    let redis: ElementProxy<Redis> | undefined
    if (!this.redis) {
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
    assert(redis)

    this.queue = new Queue(this.name, {
      connection: redis.$.client as any,
      ...this.queueOpts
    })

    if (this.data !== undefined) {
      await this.add(this.data)
    }
  }

  async add(data: any, jobOpts = this.jobOpts) {
    const job = await this.queue.add(this.name, data, jobOpts)
    return job
  }

  async dispose() {
    await this.queue?.close()
    await this.redis?.$.stop()
    this.redis = undefined
  }
}
