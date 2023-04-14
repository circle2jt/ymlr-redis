import { RedisOptions } from 'ioredis'
import { ElementProxy } from 'ymlr/src/components/element-proxy'
import { Redis } from './redis'

export interface RedisPubProps {
  redis?: ElementProxy<Redis>
  uri?: string
  channels?: string[]
  channel?: string
  data?: any
  opts?: RedisOptions
}
