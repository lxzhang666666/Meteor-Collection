# docker

## Docker每次启动容器，IP及hosts指定

```shell
docker run -itd --name hadoop0 --hostname hadoop0 --net network_my --ip 192.168.10.30 --add-host hadoop1:192.168.10.31 --add-host hadoop2:192.168.10.32  -d -P -p 50070:50070 -p 8088:8088 hadoop:master
```

```text
--hostname ：指定hostname;
--net : 指定网络模式
--ip：指定IP
--add-host ：指定往/etc/hosts添加的host
```

## MacOS无法连接docker容器解决方案

[文献连接](https://github.com/wenjunxiao/mac-docker-connector)

1. 首先 Mac 端通过 brew 安装 docker-connector
```shell
brew install wenjunxiao/brew/docker-connector
```

2. 然后执行以下命令把 docker 的所有 bridge 网络都添加到路由中
```shell
docker network ls --filter driver=bridge --format "{{.ID}}" | xargs docker network inspect --format "route {{range .IPAM.Config}}{{.Subnet}}{{end}}" >> /usr/local/etc/docker-connector.conf
```
3. 配置完成，直接启动服务（需要 sudo，路由配置启动之后仍然可以修改，并且无需重启服务立即生效）
```shell
sudo brew services start docker-connector
sudo brew services list
```

4. 然后使用以下命令在 docker 端运行 wenjunxiao/mac-docker-connector，需要使用 host 网络，并且允许 NET_ADMIN
```shell
docker run -it -d --restart always --net host --cap-add NET_ADMIN --name connector wenjunxiao/mac-docker-connector
```

