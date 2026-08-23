---
title: zookeeper
date: 2026-08-09 14:56:24
permalink: /pages/9e7ab2/
categories:
  - 后端
  - Collection
  - zookeeper
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# zookeeper

```shell
docker run -d --name zookeeper \
    --net prod-network \
    --ip 172.18.0.90 \
    -e ALLOW_ANONYMOUS_LOGIN=yes \
    bitnami/zookeeper:latest
```