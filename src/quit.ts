
import { JobStop } from 'ymlr/src/components/.job/job-stop'
import { QuitProps } from './quit.props'
import { RedisSub } from './redis-sub'

/** |**  ymlr-redis'quit
  Stop subscribed. Only used in "ymlr-redis'sub"
  @example
  ```yaml
    - ymlr-redis'sub:
        uri: redis://redis:6379
        channels:                   # Channels which is subscribed
          - channel1
        runs:                       # When a message is received then it will runs them
          - ymlr-redis'stop:        # Stop subscribed
  ```
*/
export class Quit extends JobStop {
  protected type = RedisSub

  constructor(props?: QuitProps) {
    super(props)
  }

  async exec() {
    const sub = this.proxy.getParentByClassName<RedisSub>(RedisSub)
    await sub?.$.stop()
  }
}
