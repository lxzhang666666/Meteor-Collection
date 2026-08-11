---
title: DDNSTO
date: 2026-08-09 14:56:24
permalink: /pages/7d6e40/
categories:
  - 后端
  - Collection
  - 内网穿透
tags:
  - 
author: 
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---
# DDNSTO

https://www.ddnsto.com/

https://doc.linkease.com/zh/guide/ddnsto/install/device/docker.html

```shell
docker run -d \
    --name=ddnsto \
    --restart always \
	--network host \
    -e TOKEN=<填入你的token> \
    -e DEVICE_IDX=<默认0，如果设备ID重复则为1-100之间> \
    -v /etc/localtime:/etc/localtime:ro \
    -v /your/config-path/ddnsto-config:/ddnsto-config \
    -e PUID=<uid for user> \
    -e PGID=<gid for user> \
    linkease/ddnsto
```

```shell
docker run -d \
    --name=ddnsto \
    --restart always \
    --privileged=true \
	--network prod-network \
	--ip 172.18.0.80 \
    -e TOKEN=c037c41d-50ec-411d-b12f-d770781d5c61 \
    -e DEVICE_IDX=1 \
    -v /etc/localtime:/etc/localtime:ro \
    -v /Users/zhangbao/data/apps/ddnsto/ddnsto-config:/ddnsto-config \
    -e PUID=501 \
    -e PGID=20 \
    linkease/ddnsto
```