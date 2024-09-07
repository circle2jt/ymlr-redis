# ymlr-redis
ymlr-redis for ymlr plugin

## Shares

- [Redis query](./shares/redis-query/README.md)
- [Redis publisher](./shares/redis-pub/README.md)
- [Redis subscriber](./shares/redis-sub/README.md)
<br/>

# Tag details

| Tags | Description |
|---|---|
| [ymlr-redis](#ymlr-redis) | Declare a redis connector |
| [ymlr-redis'job](#ymlr-redis'job) | Add a new job with input data to do async |
| [ymlr-redis'onJob](#ymlr-redis'onJob) | Handle jobs which is add by ymlr-redis'job |
| [ymlr-redis'pub](#ymlr-redis'pub) | Publish a message to channels in redis |
| [ymlr-redis'sub](#ymlr-redis'sub) | Subscribe channels in redis |
| [ymlr-redis'unsub](#ymlr-redis'unsub) | Unsubscribe channels in redis |



## <a id="ymlr-redis"></a>ymlr-redis  
  
Declare a redis connector  

Example:  

```yaml
  - name: "[redis] localhost"
    ymlr-redis:
      uri: redis://user:pass                  # redis uri
      runs:                                   # When a message is received then it will runs them
        - echo: redis is connected
```
Publish a message to channels
```yaml
  - name: "[redis] localhost"
    ymlr-redis:
      uri: redis://user:pass                  # redis uri
      runs:                                   # When a message is received then it will runs them
        - name: Publish a message
          ymlr-redis'pub:
            channels:
              - test
            data:
              msg: Hello world
```  


## <a id="ymlr-redis'job"></a>ymlr-redis'job  
  
Add a new job with input data to do async  

Example:  

```yaml
  - name: Crop image size
    ymlr-redis'job:
      uri: redis://user:pass
      opts:                               # ioredis options
      name: Crop Image                    # Queue name
      queueOpts:                          # Job queue options (https://docs.bullmq.io)
      jobOpts:                            # Job options (https://docs.bullmq.io)
        removeOnComplete: true
      data:                               # Job data
        url: http://...
        type: jpeg
        size:
          width: 10
          height: 10
```

Declare global then reused by code
```yaml
  - name: Crop image size
    id: processImageJobsProxy
    detach: false                         # Dont release connection, keep it's used in background
    ymlr-redis'job:
      uri: redis://user:pass
      opts:                               # ioredis options
      name: Crop Image                    # Queue name
      queueOpts:                          # Job queue options (https://docs.bullmq.io)
      jobOpts:                            # Job options (https://docs.bullmq.io)
        removeOnComplete: true

  - js: |
      await $vars.processImageJobsProxy.$.add({
        url: 'http://...',
        type: 'jpeg',
        size: {
          width: 10,
          height: 10
        }
      }, {
        removeOnFail: true
      })
```  


## <a id="ymlr-redis'onJob"></a>ymlr-redis'onJob  
  
Handle jobs which is add by ymlr-redis'job  

Example:  

```yaml
  - name: Handle to crop image size
    ymlr-redis'onJob:
      uri: redis://user:pass
      opts:                                 # ioredis options
        maxRetriesPerRequest:
      name: Crop Image                      # Queue name
      workerOpts:                           # Job worker options (https://docs.bullmq.io)
        concurrency: 1
      runs:
        - echo: A new job has justed added
        - echo: ${ $parentState.job }       # Job information
        - echo: ${ $parentState.job.data }  # Job data
```  


## <a id="ymlr-redis'pub"></a>ymlr-redis'pub  
  
Publish a message to channels in redis  

Example:  

Publish a message to redis
```yaml
  - name: "[redis] localhost"
    ymlr-redis'pub:
      uri: redis://user:pass
      channel: channel1
      channels:
        - channel2
        - channel3
      data:
        name: thanh
```

Reuse redis connection to publish multiple times
```yaml
  - name: "[redis] localhost"
    ymlr-redis:
      uri: redis://user:pass
      runs:
        - ymlr-redis'pub:
            channels:
              - channel1
            data:
              name: thanh
        - ...
        # Other elements
```

Or reuse by global variable
Reuse redis connection to publish multiple times
```yaml
  - name: "[redis] localhost"
    ymlr-redis:
      uri: redis://user:pass
    vars:
      redis1: ${this}

  - ymlr-redis'pub:
      redis: ${ $vars.redis1 }
      channels:
        - channel1
      data:
        name: thanh
```  


## <a id="ymlr-redis'sub"></a>ymlr-redis'sub  
  
Subscribe channels in redis  

Example:  

```yaml
  - name: "[redis] localhost"
    ymlr-redis'sub:
      uri: redis://user:pass
      type: buffer                            # Message type is in [text, buffer]. Default is "text"
      channel: channel1
      channels:                               # channels which is subscribed
        - channel1
        - channel2
      runs:                                   # When a message is received then it will runs them
        - ${ $parentState }                   # - Received data in a channel
        - ${ $parentState.channelName }       # - channel name
        - ${ $parentState.channelData }       # - Received message which is cast to object
        - ${ $parentState.channelMsg }        # - Received message which is text

        - ...
        # Other elements

        - stop:
```

Used in global redis
```yaml
  - name: Global Redis
    ymlr-redis:
      uri: redis://user:pass
      runs:
        - name: "[redis] localhost"
          ymlr-redis'sub:
            type: buffer                        # Message type is in [text, buffer]. Default is "text"
            channel: channel1
            channels:                           # channels which is subscribed
              - channel1
              - channel2
            runs:                               # When a message is received then it will runs them
              - ${ $parentState }               # - Received data in a channel
              - ${ $parentState.channelName }   # - Channel name
              - ${ $parentState.channelData }   # - Received message which is cast to object
              - ${ $parentState.channelMsg }    # - Received message which is text or buffer

              - ...
              # Other elements
```

Or reuse by global variable
```yaml
  - id: redis
    name: Global Redis
    ymlr-redis:
      uri: redis://user:pass

  - name: "[redis] localhost"
    ymlr-redis'sub:
      name: my-test-channel                 # channel name which to reused when register again
      redis: ${ $vars.redis }
      channel: channel1
      channels:                             # channels which is subscribed
        - channel1
        - channel2
      runs:                                 # When a message is received then it will runs them
        - ${ $parentState }                 # - Received data in a channel
        - ${ $parentState.channelName }     # - channel name
        - ${ $parentState.channelData }     # - Received message which is cast to object
        - ${ $parentState.channelMsg }      # - Received message which is text

        - ...
        # Other elements
```  


## <a id="ymlr-redis'unsub"></a>ymlr-redis'unsub  
  
Unsubscribe channels in redis  

Example:  

```yaml
  - name: "subscribe a channel"
    ymlr-redis'sub:
      name: test_channel1
      uri: redis://user:pass
      channel: channel1
      runs:
        - echo: ${ $parentState.channelName }

  - name: unsubscribe a channel
    ymlr-redis'unsub: test_channel1

  - name: unsubscribe multiple channels
    ymlr-redis'unsub: [test_channel1, test_channel2]
```  


<br/>

### Have fun :)