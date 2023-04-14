
export const sub = () => require('./redis-sub').RedisSub
export const pub = () => require('./redis-pub').RedisPub
export const stop = () => require('./quit').Quit
export { Redis as default } from './redis'
