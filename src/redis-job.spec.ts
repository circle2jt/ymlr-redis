import { join } from 'path'
import { Testing } from 'ymlr/src/testing'
import { RedisJob } from './redis-job'

beforeEach(async () => {
  await Testing.reset()
  Testing.rootScene.tagsManager.register('ymlr-redis', join(__dirname, 'index'))
})

test('add a new job', async () => {
  const jobName = Math.random().toString()
  const redisJob = await Testing.createElementProxy<RedisJob>(RedisJob, {
    uri: process.env.REDIS_URI,
    name: jobName,
    data: { num: 1 }
  })
  try {
    await redisJob.exec()
    const jobs = await redisJob.$.queue.getJobs()
    expect(jobs).toHaveLength(1)
  } finally {
    const jobs = await redisJob.$.queue.getJobs()
    for (const j of jobs) {
      await redisJob.$.queue.remove(j.id as string)
    }
    await redisJob.dispose()
  }
})

test('only add a queue not add job', async () => {
  const jobName = Math.random().toString()
  const redisJob = await Testing.createElementProxy<RedisJob>(RedisJob, {
    uri: process.env.REDIS_URI,
    name: jobName
  })
  try {
    await redisJob.exec()
    const jobs = await redisJob.$.queue.getJobs()
    expect(jobs).toHaveLength(0)
  } finally {
    const jobs = await redisJob.$.queue.getJobs()
    for (const j of jobs) {
      await redisJob.$.queue.remove(j.id as string)
    }
    await redisJob.dispose()
  }
})

test('add job by code', async () => {
  const jobName = Math.random().toString()
  const redisJob = await Testing.createElementProxy<RedisJob>(RedisJob, {
    uri: process.env.REDIS_URI,
    name: jobName
  })
  try {
    await redisJob.exec()
    await redisJob.$.add({ name: 'task 1' })
    const jobs = await redisJob.$.queue.getJobs()
    expect(jobs).toHaveLength(1)
  } finally {
    const jobs = await redisJob.$.queue.getJobs()
    for (const j of jobs) {
      await redisJob.$.queue.remove(j.id as string)
    }
    await redisJob.dispose()
  }
})
