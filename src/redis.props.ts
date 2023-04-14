import { RedisOptions } from 'ioredis'
import { GroupItemProps, GroupProps } from 'ymlr/src/components/group/group.props'
import { RedisPubProps } from './redis-pub.props'
import { RedisSubProps } from './redis-sub.props'

export type RedisProps = {
  uri: string
  opts?: RedisOptions
  runs?: Array<GroupItemProps | {
    'ymlr-redis\'pub': RedisPubProps
  } | {
    'ymlr-redis\'sub': RedisSubProps
  }>
} & GroupProps
