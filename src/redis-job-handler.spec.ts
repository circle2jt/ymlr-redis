import { Queue } from 'bullmq'
import { Redis as IORedis } from 'ioredis'
import { join } from 'path'
import { setTimeout } from 'timers/promises'
import { Testing } from 'ymlr/src/testing'
import { RedisJob } from './redis-job'
import { RedisJobHandler } from './redis-job-handler'

beforeEach(async () => {
  await Testing.reset()
  Testing.rootScene.tagsManager.register('ymlr-redis', join(__dirname, 'index'))
})

test('handle a job', async () => {
  const jobName = Math.random().toString()
  const redis = new IORedis(process.env.REDIS_URI as string)
  const queue = new Queue(jobName, {
    connection: redis as any
  })
  await queue.add('', { num: 1 })

  const redisJobHandler = await Testing.createElementProxy<RedisJobHandler>(RedisJobHandler, {
    uri: process.env.REDIS_URI,
    name: jobName
  }, {
    runs: [{
      vars: {
        num: '${$parentState.job.data.num}'
      }
    }]
  })
  try {
    void redisJobHandler.exec()
    await setTimeout(1000)
    expect(Testing.vars.num).toBe(1)
  } finally {
    redis.disconnect()
    await queue.close()
    await redisJobHandler.dispose()
  }
})

test('test full integration', async () => {
  const jobName = Math.random().toString()
  const redisJob = await Testing.createElementProxy<RedisJob>(RedisJob, {
    uri: process.env.REDIS_URI,
    name: jobName,
    data: {
      num: 10
    }
  })
  const redisJobHandler = await Testing.createElementProxy<RedisJobHandler>(RedisJobHandler, {
    uri: process.env.REDIS_URI,
    name: jobName
  }, {
    runs: [{
      vars: {
        numFull: '${$parentState.job.data.num}'
      }
    }, {
      stop: null
    }]
  })
  try {
    await Promise.all([
      redisJob.exec(),
      redisJobHandler.exec()
    ])
    await setTimeout(1000)
    expect(Testing.vars.numFull).toBe(10)
  } finally {
    await Promise.all([
      redisJob.dispose(),
      redisJobHandler.dispose()
    ])
  }
})
