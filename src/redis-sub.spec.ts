import { join } from 'path'
import { Testing } from 'ymlr/src/testing'
import { Redis } from './redis'
import { RedisSub } from './redis-sub'

beforeEach(async () => {
  await Testing.reset()
  Testing.rootScene.tagsManager.register('ymlr-redis', join(__dirname, 'index'))
})

test('Subscribe a channel in redis\'sub', async () => {
  const channelName = Math.random().toString()
  const data = {
    say: 'hello world'
  }
  const redisSub = await Testing.createElementProxy<RedisSub>(RedisSub, {
    uri: process.env.REDIS_URI,
    channel: channelName,
    runs: [
      {
        vars: {
          channel: '${ $parentState.channelName }',
          data: '${ $parentState.channelData }',
          msg: '${ $parentState.channelMsg }'
        }
      },
      {
        'ymlr-redis\'stop': null
      }
    ]
  })
  const redisPub = await Testing.createElementProxy<Redis>(Redis, {
    uri: process.env.REDIS_URI
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(async () => await redisPub?.$.pub(channelName, data), 1000)
  await redisSub.exec()
  expect(Testing.vars.channel).toBe(channelName)
  expect(Testing.vars.data).toEqual(data)
  expect(Testing.vars.msg).toBe(JSON.stringify(data))

  await redisSub.dispose()
  await redisPub?.dispose()
})

test('Use the redis to subscribe a channel in redis\'sub', async () => {
  const redis = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI
  })
  await redis.exec()

  const channelName = Math.random().toString()
  const data = {
    say: 'hello world'
  }
  const redisSub = await Testing.createElementProxy<RedisSub>(RedisSub, {
    redis,
    channel: channelName,
    runs: [
      {
        vars: {
          channel: '${ $parentState.channelName }',
          data: '${ $parentState.channelData }',
          msg: '${ $parentState.channelMsg }'
        }
      },
      {
        'ymlr-redis\'stop': null
      }
    ]
  })
  const redisPub = await Testing.createElementProxy<Redis>(Redis, {
    uri: process.env.REDIS_URI
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(async () => await redisPub?.$.pub(channelName, data), 1000)

  await redisSub.exec()
  expect(Testing.vars.channel).toBe(channelName)
  expect(Testing.vars.data).toEqual(data)
  expect(Testing.vars.msg).toBe(JSON.stringify(data))

  await redisSub.dispose()
  await redisPub?.dispose()
  await redis.dispose()
})

test('Use the redis to psubscribe a channel in redis\'sub', async () => {
  const redis = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI
  })
  await redis.exec()

  const rd = Math.random().toString()
  const channelName = rd + '-0'
  const channelPattern = rd + '-*'
  const data = {
    say: 'hello world'
  }
  const redisSub = await Testing.createElementProxy<RedisSub>(RedisSub, {
    redis,
    channel: channelPattern,
    runs: [
      {
        vars: {
          pattern: '${ $parentState.channelPattern }',
          channel: '${ $parentState.channelName }',
          data: '${ $parentState.channelData }',
          msg: '${ $parentState.channelMsg }'
        }
      },
      {
        'ymlr-redis\'stop': null
      }
    ]
  })
  const redisPub = await Testing.createElementProxy<Redis>(Redis, {
    uri: process.env.REDIS_URI
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(async () => await redisPub?.$.pub(channelName, data), 1000)

  await redisSub.exec()
  expect(Testing.vars.pattern).toBe(channelPattern)
  expect(Testing.vars.channel).toBe(channelName)
  expect(Testing.vars.data).toEqual(data)
  expect(Testing.vars.msg).toBe(JSON.stringify(data))

  await redisSub.dispose()
  await redisPub?.dispose()
  await redis.dispose()
})
