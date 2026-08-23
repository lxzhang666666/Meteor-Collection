---
title: logstash
date: 2026-08-09 14:56:23
permalink: /pages/d7861d/
categories:
  - 后端
  - Collection
  - logstash
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# logstash

## mac
```shell
docker run -d \
	--name logstash \
    -v /Users/zhangbao/data/apps/logstash/pipeline/:/usr/share/logstash/pipeline/ \
    -v /Users/zhangbao/data/apps/logstash/config/:/usr/share/logstash/config/ \
    --privileged=true \
    --net prod-network \
    --ip 172.18.0.50 \
    -p 5407:5407 \
    -p 9600:9600 \
logstash:7.17.5

mac
前置拉取默认配置
docker run -d --name logstash logstash:7.17.5
docker cp logstash:/usr/share/logstash/pipeline/ .
docker cp logstash:/usr/share/logstash/config/ .

windows
docker run -d --name logstash logstash:7.17.5
docker cp logstash:/usr/share/logstash/pipeline/ .
docker cp logstash:/usr/share/logstash/config/ .


docker run -d `
	--name logstash `
    -v E:\data\apps\logstash/pipeline/:/usr/share/logstash/pipeline/ `
    -v E:\data\apps\logstash/config/:/usr/share/logstash/config/ `
    --privileged=true `
    --net prod-network `
    --ip 172.18.0.50 `
    -p 5407:5407 `
    -p 9600:9600 `
logstash:7.17.5
```
