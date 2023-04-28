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
| [ymlr-redis'pub](#ymlr-redis'pub) | Publish a message to channels in redis |
| [ymlr-redis'quit](#ymlr-redis'quit) | Stop subscribed. Only used in "ymlr-redis'sub" |
| [ymlr-redis'sub](#ymlr-redis'sub) | Subscribe channels in redis |



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


## <a id="ymlr-redis'quit"></a>ymlr-redis'quit  
  
Stop subscribed. Only used in "ymlr-redis'sub"  

Example:  

```yaml
  - ymlr-redis'sub:
      uri: redis://redis:6379
      channels:                   # Channels which is subscribed
        - channel1
      runs:                       # When a message is received then it will runs them
        - ymlr-redis'stop:        # Stop subscribed
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
      redis: ${ $vars.redis }
      channel: channel1
      channels:                             # channels which is subscribed
        - channel1
        - channel2
      runs:                               # When a message is received then it will runs them
        - ${ $parentState }               # - Received data in a channel
        - ${ $parentState.channelName }     # - channel name
        - ${ $parentState.channelData }     # - Received message which is cast to object
        - ${ $parentState.channelMsg }      # - Received message which is text

        - ...
        # Other elements
```  


<br/>

### Have fun :)