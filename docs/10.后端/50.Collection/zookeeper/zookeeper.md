# zookeeper

```shell
docker run -d --name zookeeper \
    --net prod-network \
    --ip 172.18.0.90 \
    -e ALLOW_ANONYMOUS_LOGIN=yes \
    bitnami/zookeeper:latest
```