import { type RedisOptions } from 'ioredis'
import { type ElementProxy } from 'ymlr/src/components/element-proxy'
import { type Redis } from './redis'

export interface RedisPubProps {
  redis?: ElementProxy<Redis>
  uri?: string
  channels?: string[]
  channel?: string
  data?: any
  opts?: RedisOptions
}
