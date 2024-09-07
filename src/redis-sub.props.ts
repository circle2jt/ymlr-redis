import { type RedisOptions } from 'ioredis'
import { type ElementProxy } from 'ymlr/src/components/element-proxy'
import { type Redis } from './redis'

export interface RedisSubProps {
  name?: string
  redis?: ElementProxy<Redis>
  uri?: string
  type?: 'text' | 'buffer'
  opts?: RedisOptions
  channels?: string[]
  channel?: string
}
