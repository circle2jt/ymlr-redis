export const sub = () => require('./redis-sub').RedisSub
export const unsub = () => require('./redis-unsub').RedisUnSub
export const remove = () => require('./redis-remove-callback').RedisRemoveCallback
export const pub = () => require('./redis-pub').RedisPub

export const job = () => require('./redis-job').RedisJob
export const onJob = () => require('./redis-job-handler').RedisJobHandler

export { Redis as default } from './redis'
