import { type ElementProxy } from 'ymlr/src/components/element-proxy'
import { sleep } from 'ymlr/src/libs/time'
import { Testing } from 'ymlr/src/testing'
import { Redis } from './redis'

let redis: ElementProxy<Redis>

beforeEach(async () => {
  await Testing.reset()
})

afterEach(async () => {
  await redis.$.stop()
})

test('test redis', async () => {
  const channelName = Math.random().toString()
  redis = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI,
    channels: [channelName],
    runs: [{
      echo: 'hello'
    }]
  })
  const [echo] = await redis.exec()
  expect(redis.$.client).toBeDefined()
  await redis.$.client.set('test', '1')
  expect(await redis.$.client.get('test')).toBe('1')
  await redis.$.client.del('test')
  expect(echo.result).toBe('hello')
})

test('pub/sub', async () => {
  const channelName = Math.random().toString()
  redis = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI,
    channels: [channelName]
  })
  await redis.exec()
  const channelCount = [0, 0]
  const subRedis1 = await redis.$.newOne()
  const subRedis2 = await redis.$.newOne()
  try {
    await subRedis1.$.sub(['channel-0'], (_: string, message: string) => {
      expect(typeof message).toBe('string')
      channelCount[0]++
    }, 'text')
    await subRedis2.$.sub(['channel-1'], (_: Buffer, message: Buffer) => {
      expect(message).toBeInstanceOf(Buffer)
      channelCount[1]++
    }, 'buffer')

    await redis.$.pub(['channel-0'], 0)
    await redis.$.pub(['channel-1'], 1)
    await redis.$.pub(['channel-1'], 2)

    await sleep(500)

    expect(channelCount[0]).toBe(1)
    expect(channelCount[1]).toBe(2)
  } finally {
    await subRedis1.$.stop()
    await subRedis2.$.stop()
  }
})

test('ppub/sub', async () => {
  const channelName = Math.random().toString()
  redis = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI,
    channels: [channelName]
  })
  await redis.exec()
  const channelCount = [0, 0]
  const subRedis1 = await redis.$.newOne()
  const subRedis2 = await redis.$.newOne()
  try {
    await subRedis1.$.psub(['channel-*'], (_: string, message: string) => {
      expect(typeof message).toBe('string')
      channelCount[0]++
    }, 'text')
    await subRedis2.$.psub(['pchannel-*'], (_: Buffer, message: Buffer) => {
      expect(message).toBeInstanceOf(Buffer)
      channelCount[1]++
    }, 'buffer')

    await redis.$.pub(['channel-0'], 0)
    await redis.$.pub(['channel-1'], 1)
    await redis.$.pub(['pchannel-1'], 2)

    await sleep(500)

    expect(channelCount[0]).toBe(2)
    expect(channelCount[1]).toBe(1)
  } finally {
    await subRedis1.$.stop()
    await subRedis2.$.stop()
  }
})

test('sub waitToDone', async () => {
  const channelName = Math.random().toString()
  redis = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI,
    channels: [channelName]
  })
  await redis.exec()
  const subRedis1 = await redis.$.newOne()
  try {
    const begin = Date.now()
    await subRedis1.$.sub('c1', () => { })
    await Promise.race([
      subRedis1.$.waitToDone(),
      sleep(1000)
    ])
    expect(Date.now() - begin).toBeGreaterThanOrEqual(1000)
  } finally {
    await subRedis1.$.stop()
  }
})

test('sub callback', async () => {
  const channelName = Math.random().toString()
  redis = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI,
    channels: [channelName],
    runs: [{
      echo: 'hello'
    }]
  })
  await redis.exec()
  const subRedis1 = await redis.$.newOne()
  try {
    let c1 = 0
    let c2 = 0
    const [id1, id2] = await Promise.all([
      subRedis1.$.sub('c1', () => {
        c1++
      }),
      subRedis1.$.sub('c2', () => {
        c2++
      }, 'buffer')
    ])

    await redis.$.pub('c1')
    await redis.$.pub('c2')
    await sleep(200)
    expect(c1).toBe(1)
    expect(c2).toBe(1)

    const callbacks = subRedis1.$.callbacks as any

    expect(callbacks.id.size).toBe(2)
    expect(callbacks.id.get(id2)).toBeDefined()
    expect(callbacks.id.get(id1)).toBeDefined()
    expect(callbacks.text.size).toBe(1)
    expect(callbacks.buffer.size).toBe(1)
    expect(callbacks.text.get('c1').size).toBe(1)
    expect(callbacks.buffer.get('c2').size).toBe(1)
    expect(callbacks.text.get('c2')).toBe(undefined)
    expect(callbacks.buffer.get('c1')).toBe(undefined)

    await subRedis1.$.removeCb(id2)
    expect(callbacks.id.size).toBe(1)
    expect(callbacks.id.get(id2)).toBeUndefined()
    expect(callbacks.id.get(id1)).toBeDefined()
    expect(callbacks.text.size).toBe(1)
    expect(callbacks.buffer.size).toBe(1)
    expect(callbacks.text.get('c1').size).toBe(1)
    expect(callbacks.buffer.get('c2').size).toBe(0)
    expect(callbacks.text.get('c2')).toBe(undefined)
    expect(callbacks.buffer.get('c1')).toBe(undefined)

    await redis.$.pub('c1')
    await redis.$.pub('c2')
    await sleep(200)
    expect(c1).toBe(2)
    expect(c2).toBe(1)
    await subRedis1.$.removeCb(id1)

    expect(callbacks.id.size).toBe(0)
    expect(callbacks.id.get(id2)).toBeUndefined()
    expect(callbacks.id.get(id1)).toBeUndefined()
    expect(callbacks.text.size).toBe(1)
    expect(callbacks.buffer.size).toBe(1)
    expect(callbacks.text.get('c1').size).toBe(0)
    expect(callbacks.buffer.get('c2').size).toBe(0)
    expect(callbacks.text.get('c2')).toBe(undefined)
    expect(callbacks.buffer.get('c1')).toBe(undefined)
  } finally {
    await subRedis1.$.stop()
  }
})
