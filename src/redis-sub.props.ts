import { RedisOptions } from 'ioredis'
import { JobProps } from 'ymlr/src/components/.job/job.props'
import { ElementProxy } from 'ymlr/src/components/element-proxy'
import { Redis } from './redis'

export type RedisSubProps = {
  redis?: ElementProxy<Redis>
  uri?: string
  type?: 'text' | 'buffer'
  opts?: RedisOptions
  channels?: string[]
  channel?: string
} & JobProps
