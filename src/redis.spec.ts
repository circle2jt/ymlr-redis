import { ElementProxy } from 'ymlr/src/components/element-proxy'
import { sleep } from 'ymlr/src/libs/time'
import { Testing } from 'ymlr/src/testing'
import { Redis } from './redis'

let redis: ElementProxy<Redis>

beforeEach(async () => {
  await Testing.reset()
})

afterEach(async () => {
  await redis.dispose()
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
    channels: [channelName],
    runs: [{
      echo: 'hello'
    }]
  })
  await redis.exec()
  const channelCount = [0, 0]
  const subRedis1 = await redis.$.newOne()
  const subRedis2 = await redis.$.newOne()
  try {
    await Promise.race([
      new Promise((resolve: any) => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
          await redis.$.pub(['channel-0'], 0)
          await redis.$.pub(['channel-1'], 1)
          await redis.$.pub(['channel-1'], 2)
          await sleep(500)
          await redis.$.stop()
          resolve()
        }, 500)
      }),
      subRedis1.$.sub(['channel-0'], (_: string, message: string) => {
        expect(typeof message).toBe('string')
        channelCount[0]++
      }, 'text'),
      subRedis2.$.sub(['channel-1'], (_: Buffer, message: Buffer) => {
        expect(message).toBeInstanceOf(Buffer)
        channelCount[1]++
      }, 'buffer')
    ])
    expect(channelCount[0]).toBe(1)
    expect(channelCount[1]).toBe(2)
  } finally {
    await subRedis1.dispose()
    await subRedis2.dispose()
  }
})

test('ppub/sub', async () => {
  const channelName = Math.random().toString()
  redis = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI,
    channels: [channelName],
    runs: [{
      echo: 'hello'
    }]
  })
  await redis.exec()
  const channelCount = [0, 0]
  const subRedis1 = await redis.$.newOne()
  const subRedis2 = await redis.$.newOne()
  try {
    await Promise.race([
      new Promise((resolve: any) => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
          await redis.$.pub(['channel-0'], 0)
          await redis.$.pub(['channel-1'], 1)
          await redis.$.pub(['pchannel-1'], 2)
          await sleep(500)
          await redis.$.stop()
          resolve()
        }, 500)
      }),
      subRedis1.$.psub(['channel-*'], (_: string, message: string) => {
        expect(typeof message).toBe('string')
        channelCount[0]++
      }, 'text'),
      subRedis2.$.psub(['pchannel-*'], (_: Buffer, message: Buffer) => {
        expect(message).toBeInstanceOf(Buffer)
        channelCount[1]++
      }, 'buffer')
    ])
    expect(channelCount[0]).toBe(2)
    expect(channelCount[1]).toBe(1)
  } finally {
    await subRedis1.dispose()
    await subRedis2.dispose()
  }
})

test('sub many channels', async () => {
  const channelName = Math.random().toString()
  redis = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI,
    channels: [channelName],
    runs: [{
      echo: 'hello'
    }]
  })
  await redis.exec()
  const channelCount = [0, 0]
  const subRedis1 = await redis.$.newOne()
  try {
    await Promise.race([
      new Promise((resolve: any) => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
          await redis.$.pub(['channel-0'], 0)
          await redis.$.pub(['channel-1'], 1)
          await redis.$.pub(['channel-1'], 2)
          await sleep(500)
          await redis.$.stop()
          resolve()
        }, 500)
      }),
      subRedis1.$.subMany([{
        channels: ['channel-0'],
        cb: (_: string, message: string) => {
          expect(typeof message).toBe('string')
          channelCount[0]++
        },
        type: 'text'
      }, {
        channels: ['channel-1'],
        cb: (_: Buffer, message: Buffer) => {
          expect(message).toBeInstanceOf(Buffer)
          channelCount[1]++
        },
        type: 'buffer'
      }])
    ])
    expect(channelCount[0]).toBe(1)
    expect(channelCount[1]).toBe(2)
  } finally {
    await subRedis1.dispose()
  }
})

test('psub many channels', async () => {
  const channelName = Math.random().toString()
  redis = await Testing.createElementProxy(Redis, {
    uri: process.env.REDIS_URI,
    channels: [channelName],
    runs: [{
      echo: 'hello'
    }]
  })
  await redis.exec()
  const channelCount = [0, 0]
  const subRedis1 = await redis.$.newOne()
  try {
    await Promise.race([
      new Promise((resolve: any) => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
          await redis.$.pub(['channel-0'], 0)
          await redis.$.pub(['channel-1'], 1)
          await redis.$.pub(['pchannel-1'], 2)
          await sleep(500)
          await redis.$.stop()
          resolve()
        }, 500)
      }),
      subRedis1.$.psubMany([{
        channels: ['channel-*'],
        cb: (_: string, message: string) => {
          expect(typeof message).toBe('string')
          channelCount[0]++
        },
        type: 'text'
      }, {
        channels: ['pchannel-*'],
        cb: (_: Buffer, message: Buffer) => {
          expect(message).toBeInstanceOf(Buffer)
          channelCount[1]++
        },
        type: 'buffer'
      }])
    ])
    expect(channelCount[0]).toBe(2)
    expect(channelCount[1]).toBe(1)
  } finally {
    await subRedis1.dispose()
  }
})
