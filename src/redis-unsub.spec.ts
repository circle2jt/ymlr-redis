import { join } from 'path'
import { sleep } from 'ymlr/src/libs/time'
import { Testing } from 'ymlr/src/testing'
import { Redis } from './redis'
import { RedisSub } from './redis-sub'
import { RedisUnSub } from './redis-unsub'

beforeEach(async () => {
  await Testing.reset()
  Testing.rootScene.tagsManager.register('ymlr-redis', join(__dirname, 'index'))
})

test('Unsubscribed channels then subcribe again\'sub', async () => {
  Testing.vars.i = 0
  const channelName = Math.random().toString()
  const redisPub = await Testing.createElementProxy<Redis>(Redis, {
    uri: process.env.REDIS_URI
  })
  const redis = await Testing.createElementProxy<Redis>(Redis, {
    uri: process.env.REDIS_URI
  })
  await redisPub.exec()
  await redis.exec()
  const redisSub = await Testing.createElementProxy<RedisSub>(RedisSub, {
    redis,
    channel: channelName
  }, {
    runs: [
      {
        js: '$vars.i++'
      }
    ]
  })
  const t = redisSub.exec()
  await sleep(500)

  await redisPub?.$.pub(channelName, '')
  await sleep(500)
  expect(Testing.vars.i).toBe(1)

  const redisUnSub = await Testing.createElementProxy<RedisUnSub>(RedisUnSub, {
    redis,
    channel: channelName
  })
  await redisUnSub.exec()
  await sleep(500)

  await redisPub?.$.pub(channelName, '')
  await sleep(500)
  expect(Testing.vars.i).toBe(1)

  const redisSubAgain = await Testing.createElementProxy<RedisSub>(RedisSub, {
    redis,
    channel: channelName
  })
  await redisSubAgain.exec()
  await sleep(500)

  await redisPub?.$.pub(channelName, '')
  await sleep(500)
  expect(Testing.vars.i).toBe(2)

  await redisSubAgain.$.stop()
  await redisSub.$.stop()

  await t

  await redisSub.dispose()
  await redis.dispose()
  await redisPub.dispose()
})
