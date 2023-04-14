import { join } from 'path'
import { ElementProxy } from 'ymlr/src/components/element-proxy'
import { sleep } from 'ymlr/src/libs/time'
import { Testing } from 'ymlr/src/testing'
import { Redis } from './redis'
import { RedisPub } from './redis-pub'

beforeEach(async () => {
  await Testing.reset()
  Testing.rootScene.tagsManager.register('ymlr-redis', join(__dirname, 'index'))
})

test('publish a message', async () => {
  const channelName = Math.random().toString()
  const redis = await Testing.createElementProxy<Redis>(Redis, {
    uri: process.env.REDIS_URI
  })
  // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
  const t = new Promise(async (resolve) => {
    await redis.$.sub([channelName], (channel: string, buf: Buffer) => {
      Testing.vars.channel = channel
      Testing.vars.data = buf.toString()
      resolve(undefined)
    })
  })
  await sleep(1000)
  const pub = await Testing.createElementProxy(RedisPub, {
    uri: process.env.REDIS_URI,
    channel: channelName,
    data: 'hello world'
  })
  await pub.exec()
  await pub.dispose()
  await t
  await redis.dispose()
  expect(Testing.vars.channel).toBe(channelName)
  expect(Testing.vars.data).toBe('hello world')
})

test('publish a message - used in ymlr-redis', async () => {
  const channelName = Math.random().toString()
  const data = {
    say: 'hello world'
  }
  const redis: ElementProxy<Redis> = await Testing.createElementProxy<Redis>(Redis, {
    uri: process.env.REDIS_URI,
    runs: [
      {
        'ymlr-redis\'pub': {
          channels: [channelName],
          data
        }
      }
    ]
  })
  const sub = await Testing.createElementProxy<Redis>(Redis, {
    uri: process.env.REDIS_URI
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
  const t = new Promise(async (resolve) => {
    await sub.$.sub([channelName], (channel: string, buf: Buffer) => {
      Testing.vars.channel = channel
      Testing.vars.data = buf.toString()
      resolve(undefined)
    })
  })
  await sleep(1000)
  await redis.exec()
  await t
  await sub.dispose()
  expect(Testing.vars.channel).toBe(channelName)
  expect(Testing.vars.data).toBe(JSON.stringify(data))
  await redis.dispose()
})

test('publish a message - used the global redis', async () => {
  const redis: ElementProxy<Redis> = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI
  })
  await redis.exec()

  const channelName = Math.random().toString()
  const data = {
    say: 'hello world'
  }
  const redisPub = await Testing.createElementProxy<Redis>(RedisPub, {
    redis,
    channels: [channelName],
    data
  })
  const redisSub: ElementProxy<Redis> = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI
  })
  void redisSub.$.sub([channelName], (channel: string, buf: Buffer) => {
    Testing.vars.channel = channel.toString()
    Testing.vars.data = buf.toString()
  }, 'buffer')
  await sleep(1000)
  await redisPub.exec()
  await sleep(1000)
  expect(Testing.vars.channel).toBe(channelName)
  expect(Testing.vars.data).toBe(JSON.stringify(data))
  await redisPub.dispose()
  await redisSub.dispose()
  await redis.dispose()
})
