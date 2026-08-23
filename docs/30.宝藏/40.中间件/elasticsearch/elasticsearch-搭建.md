---
title: elasticsearch-搭建
date: 2026-08-09 14:56:23
permalink: /pages/12c11d/
categories:
  - 后端
  - Collection
  - elasticsearch
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# ElasticSearch

[官网](https://www.elastic.co/cn/elasticsearch)

>ElasticSearch是一个基于Lucene的搜索服务器。它提供了一个分布式多用户能力的全文搜索引擎，基于RESTful web接口。Elasticsearch是用Java开发的，并作为Apache许可条款下的开放源码发布，是当前流行的企业级搜索引擎。设计用于云计算中，能够达到实时搜索，稳定，可靠，快速，安装使用方便。我们建立一个网站或应用程序，并要添加搜索功能，但是想要完成搜索工作的创建是非常困难的。我们希望搜索解决方案要运行速度快，我们希望能有一个零配置和一个完全免费的搜索模式，我们希望能够简单地使用JSON通过HTTP来索引数据，我们希望我们的搜索服务器始终可用，我们希望能够从一台开始并扩展到数百台，我们要实时搜索，我们要简单的多租户，我们希望建立一个云的解决方案。因此我们利用Elasticsearch来解决所有这些问题及可能出现的更多其它问题。

## single-node
```shell
docker run -d \
	--name elasticsearch \
    -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
    -e "discovery.type=single-node" \
    -v /Users/zhangbao/data/apps/elasticsearch/data:/usr/share/elasticsearch/data \
    -v /Users/zhangbao/data/apps/elasticsearch/plugins:/usr/share/elasticsearch/plugins \
    -v /Users/zhangbao/data/apps/elasticsearch/config:/usr/share/elasticsearch/config \
    -v /Users/zhangbao/data/apps/elasticsearch/logs:/usr/share/elasticsearch/logs \
    --privileged=true \
    --net prod-network \
    --ip 172.18.0.30 \
    -p 9200:9200 \
    -p 9300:9300 \
elasticsearch:7.17.5

docker cp elasticsearch:/usr/share/elasticsearch/config  /Users/zhangbao/data/apps/elasticsearch/config/
```
#### windows
```shell
docker run -d `
	--name elasticsearch `
    -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" `
    -e "discovery.type=single-node" `
    -v E:\data\apps\elasticsearch\data:/usr/share/elasticsearch/data `
    -v E:\data\apps\elasticsearch\plugins:/usr/share/elasticsearch/plugins `
    -v E:\data\apps\elasticsearch\config:/usr/share/elasticsearch/config `
    -v E:\data\apps\elasticsearch\logs:/usr/share/elasticsearch/logs `
    --privileged=true `
    --net prod-network `
    --ip 172.18.0.30 `
    -p 9200:9200 `
    -p 9300:9300 `
elasticsearch:7.17.5

docker cp elasticsearch:/usr/share/elasticsearch/config E:\data\apps\elasticsearch\config/
```

## elasticsearch head
```shell
docker run --name elasticsearch-head -d \
--privileged=true \
--net prod-network \
--ip 172.18.0.43 \
-p 9100:9100 \
mobz/elasticsearch-head:5-alpine
```
#### windows
```shell
docker run --name elasticsearch-head -d `
--privileged=true `
--net prod-network `
--ip 172.18.0.43 `
-p 9100:9100 `
mobz/elasticsearch-head:5-alpine
```
### ik分词器

>https://github.com/medcl/elasticsearch-analysis-ik
> 注意ik分词器与ES之间版本关系