---
title: rabbitmq
date: 2026-08-09 14:56:24
permalink: /pages/430f07/
categories:
  - 后端
  - Collection
  - mq
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# rabbitMQ

##

```shell
docker run -d --hostname rabbit --name rabbit -v /Users/zhangbao/data/apps/rabbitMQ/rabbit:/var/lib/rabbitmq --net prod-network --ip 172.18.0.60 -p 15682:15682 -p 5682:5682 -e RABBITMQ_ERLANG_COOKIE='rabbitmqCookie' rabbitmq:3.8-management

docker run -d --hostname rabbitmq02 --name rabbitmqCluster02 -v /home/soft/rabbitmqcluster/rabbitmq02:/var/lib/rabbitmq -p 15683:15682 -p 5683:5682 -e RABBITMQ_ERLANG_COOKIE='rabbitmqCookie'  --link rabbitmqCluster01:rabbitmq01 rabbitmq:3.8-management

docker run -d --hostname rabbitmq03 --name rabbitmqCluster03 -v /home/soft/rabbitmqcluster/rabbitmq03:/var/lib/rabbitmq -p 15684:15682 -p 5684:5682 -e RABBITMQ_ERLANG_COOKIE='rabbitmqCookie'  --link rabbitmqCluster01:rabbitmq01 --link rabbitmqCluster02:rabbitmq02  rabbitmq:3.8-management

```

docker-compose