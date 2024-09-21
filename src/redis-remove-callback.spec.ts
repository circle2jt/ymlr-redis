import { join } from 'path'
import { sleep } from 'ymlr/src/libs/time'
import { Testing } from 'ymlr/src/testing'
import { Redis } from './redis'
import { RedisRemoveCallback } from './redis-remove-callback'
import { RedisSub } from './redis-sub'

beforeEach(async () => {
  await Testing.reset()
  Testing.rootScene.tagsManager.register('ymlr-redis', join(__dirname, 'index'))
})

test('Remove callback a channel in redis\'sub', async () => {
  Testing.vars.i = 0
  Testing.vars.j = 0
  const channelName = Math.random().toString()
  const redisSub1 = await Testing.createElementProxy<RedisSub>(RedisSub, {
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
  const redisSub2 = await Testing.createElementProxy<RedisSub>(RedisSub, {
    uri: process.env.REDIS_URI,
    name: 'subname2',
    channel: channelName
  }, {
    runs: [
      {
        js: '$vars.j++'
      }
    ]
  })
  const redisPub = await Testing.createElementProxy<Redis>(Redis, {
    uri: process.env.REDIS_URI
  })
  await redisPub.exec()
  const t1 = redisSub1.exec()
  const t2 = redisSub2.exec()
  await sleep(500)
  await redisPub.$.pub(channelName, '')
  await redisPub.$.pub(channelName, '')
  await sleep(500)
  expect(Testing.vars.i).toBe(2)
  expect(Testing.vars.j).toBe(2)

  const redisRemoveCallback = await Testing.createElementProxy<RedisRemoveCallback>(RedisRemoveCallback, 'subname1')
  await redisRemoveCallback.exec()

  await redisPub.$.pub(channelName, '')
  await redisPub.$.pub(channelName, '')
  expect(Testing.vars.i).toBe(2)
  expect(Testing.vars.j).toBe(4)

  const justStop1 = await redisSub1.$.stop()
  expect(justStop1).toBe(false)
  const justStop2 = await redisSub2.$.stop()
  expect(justStop2).toBe(true)

  await redisPub.dispose()
  await Promise.all([
    t1, t2
  ])
})
