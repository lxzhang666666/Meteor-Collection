---
title: kafka
date: 2026-08-09 14:56:24
permalink: /pages/e154af/
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
# Kafka

##
```shell
docker run -d --name kafka-server \
    --net prod-network \
    --ip 172.18.0.80 \
    -p 9092:9092 \
    -e ALLOW_PLAINTEXT_LISTENER=yes \
    -e KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper-server:2181 \
    -e KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://192.168.0.101:9092 \
    bitnami/kafka:latest
    
    
docker run -d --name kafka-eagle -p 8048:8048 -v /Users/zhangbao/data/apps/kafka/eagle/:/kafka-eagle --net prod-network --ip 172.18.0.101 rottenleaf/kafka-eagle:1.1.9
```