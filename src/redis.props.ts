import { RedisOptions } from 'ioredis'

export interface RedisProps {
  uri: string
  opts?: RedisOptions
}
