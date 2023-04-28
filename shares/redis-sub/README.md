# Test redis subscriber

## Prerequisites

- Installed [ymlr](https://github.com/circle2jt/ymlr) package

# Run in local
```sh
  ymlr -e REDISURI=redis://:pwd@192.168.11.112:6379 -- https://raw.githubusercontent.com/circle2jt/ymlr-redis/main/shares/redis-sub/index.yaml
```

## Run in docker container
```yaml
  docker run --rm -t circle2jt/ymlr -e REDISURI=redis://:pwd@192.168.11.112:6379 -- https://raw.githubusercontent.com/circle2jt/ymlr-redis/main/shares/redis-sub/index.yaml
```
