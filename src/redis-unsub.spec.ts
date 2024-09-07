import { join } from 'path'
import { sleep } from 'ymlr/src/libs/time'
import { Testing } from 'ymlr/src/testing'
import { Redis } from './redis'
import { RedisSub } from './redis-sub'
import { RedisUnsub } from './redis-unsub'

beforeEach(async () => {
  await Testing.reset()
  Testing.rootScene.tagsManager.register('ymlr-redis', join(__dirname, 'index'))
})

test('Subscribe a channel in redis\'sub', async () => {
  Testing.vars.i = 0
  const channelName = Math.random().toString()
  const redisSub = await Testing.createElementProxy<RedisSub>(RedisSub, {
    uri: process.env.REDIS_URI,
    name: 'subname1',
    channel: channelName
  }, {
    runs: [
      {
        js: '$vars.i++'
      }
    ]
  })
  const redisPub = await Testing.createElementProxy<Redis>(Redis, {
    uri: process.env.REDIS_URI
  })
  await redisPub.exec()
  const t = redisSub.exec()
  await sleep(500)
  await redisPub.$.pub(channelName, '')
  await redisPub.$.pub(channelName, '')
  await sleep(500)
  expect(Testing.vars.i).toBe(2)

  const redisUnsub = await Testing.createElementProxy<RedisUnsub>(RedisUnsub, 'subname1')
  await redisUnsub.exec()

  await redisPub.$.pub(channelName, '')
  await redisPub.$.pub(channelName, '')
  expect(Testing.vars.i).toBe(2)

  const justStop = await redisSub.$.stop()
  expect(justStop).toBe(false)
  await redisPub.dispose()
  await t
})
