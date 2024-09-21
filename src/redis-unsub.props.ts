import { type RedisOptions } from 'ioredis'
import { type ElementProxy } from 'ymlr/src/components/element-proxy'
import { type Redis } from './redis'

export interface RedisUnSubProps {
  redis?: ElementProxy<Redis>
  uri?: string
  opts?: RedisOptions
  channels?: string[]
  channel?: string
}
