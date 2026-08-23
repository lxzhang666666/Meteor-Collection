---
title: frp
date: 2026-08-09 14:56:23
permalink: /pages/921198/
categories:
  - 后端
  - Collection
  - frp
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# frp

## 简介
[参看文献](https://www.itcoder.tech/posts/docker-frp/)

frp 是一个可用于内网穿透的高性能的反向代理应用，支持 tcp, udp 协议，为 http 和 https 应用协议提供了额外的能力，且尝试性支持了点对点穿透。 详细文档请参考：https://github.com/fatedier/frp/blob/master/README_zh.md

frp 支持 macOS, freebsd, windows,linux x64,linux i386, linux arm,Linux arm64, Mips 等不同的系统和 CPU 架构，并分别打包了文件。

因此，为了方便在不同的系统中安装和配置 frp，我基于 docker 对 frp 进行了封装和打包。

但是由于 docker 的限制，目前只支持(amd64, arm32v6, arm32v70, arm64v8, i386)

项目地址：

https://github.com/snowdreamtech/frp

DockerHub：

https://hub.docker.com/r/snowdreamtech/frps

https://hub.docker.com/r/snowdreamtech/frpc

## frps搭建
```shell
docker run  --name frps   -d \
--privileged=true --net prod-network --ip 172.18.0.50 \
-v /Users/zhangbao/data/frp/frps.ini:/etc/frp/frps.ini \
snowdreamtech/frps
```
## frpc搭建
```shell
docker run --name frpc -d \
--privileged=true \
--net prod-network \
--ip 172.18.0.51 \ 
 -v /Users/zhangbao/data/frp/frpc.ini:/etc/frp/frps.ini \
snowdreamtech/frpc
```