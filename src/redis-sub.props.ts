import { RedisOptions } from 'ioredis'
import { ElementProxy } from 'ymlr/src/components/element-proxy'
import { Redis } from './redis'

export interface RedisSubProps {
  redis?: ElementProxy<Redis>
  uri?: string
  type?: 'text' | 'buffer'
  opts?: RedisOptions
  channels?: string[]
  channel?: string
}
