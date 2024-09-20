import assert from 'assert'
import { Worker, type Job, type WorkerOptions } from 'bullmq'
import { type RedisOptions } from 'ioredis'
import { type ElementProxy } from 'ymlr/src/components/element-proxy'
import { type Element } from 'ymlr/src/components/element.interface'
import { type Group } from 'ymlr/src/components/group/group'
import { type GroupItemProps, type GroupProps } from 'ymlr/src/components/group/group.props'
import { Redis } from './redis'

/** |**  ymlr-redis'onJob
  Handle jobs which is add by ymlr-redis'job
  @example
  ```yaml
    - name: Handle to crop image size
      ymlr-redis'onJob:
        uri: redis://user:pass
        opts:                                 # ioredis options
          maxRetriesPerRequest:
        name: Crop Image                      # Queue name
        workerOpts:                           # Job worker options (https://docs.bullmq.io)
          concurrency: 1
        runs:
          - echo: A new job has justed added
          - echo: ${ $parentState.job }       # Job information
          - echo: ${ $parentState.job.data }  # Job data
  ```
*/
export class RedisJobHandler implements Element {
  uri?: string
  opts?: RedisOptions
  redis?: ElementProxy<Redis>
  workerOpts?: WorkerOptions
  name!: string

  worker!: Worker
  private promHandler?: Promise<any>
  innerRunsProxy!: ElementProxy<Group<GroupProps, GroupItemProps>>
  proxy!: ElementProxy<this>

  constructor({ uri, opts, workerOpts, name, redis }: any) {
    Object.assign(this, { uri, opts, workerOpts, name, redis })
  }

  async exec(parentState?: Record<string, any> | undefined) {
    assert(this.name)

    if (!this.redis) {
      if (this.uri) {
        this.redis = await this.proxy.scene.newElementProxy(Redis, {
          uri: this.uri,
          opts: {
            maxRetriesPerRequest: null,
            ...this.opts
          }
        })
        this.redis.logger = this.proxy.logger
        await this.redis.exec()
      } else {
        this.redis = this.proxy.getParentByClassName<Redis>(Redis)
      }
    }
    assert(this.redis)

    this.worker = new Worker(this.name, async (job: Job) => {
      return await this.innerRunsProxy.exec({
        ...parentState,
        job
      })
    }, {
      connection: this.redis.$.client as any,
      ...this.workerOpts
    })
    this.promHandler = new Promise((resolve, reject) => {
      this.worker.on('error', err => { reject(err) })
      this.worker.on('closed', () => {
        resolve(undefined)
      })
    })

    await this.promHandler

    return []
  }

  async stop() {
    await this.worker?.close(true)
    if (this.uri) {
      await this.redis?.$.stop()
      this.redis = undefined
    }
    await this.promHandler
  }

  async dispose() {
    await this.stop()
  }
}
