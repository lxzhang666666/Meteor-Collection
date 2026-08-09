# Nacos

## 简介
一个更易于构建云原生应用的动态服务发现、配置管理和服务管理平台。
## 功能
### 动态配置服务
> 动态配置服务让您能够以中心化、外部化和动态化的方式管理所有环境的配置。动态配置消除了配置变更时重新部署应用和服务的需要。配置中心化管理让实现无状态服务更简单，也让按需弹性扩展服务更容易。
### 服务发现及管理
> 动态服务发现对以服务为中心的（例如微服务和云原生）应用架构方式非常关键。Nacos支持DNS-Based和RPC-Based（Dubbo、gRPC）模式的服务发现。Nacos也提供实时健康检查，以防止将请求发往不健康的主机或服务实例。借助Nacos，您可以更容易地为您的服务实现断路器。
### 动态DNS服务
> 通过支持权重路由，动态DNS服务能让您轻松实现中间层负载均衡、更灵活的路由策略、流量控制以及简单数据中心内网的简单DNS解析服务。动态DNS服务还能让您更容易地实现以DNS协议为基础的服务发现，以消除耦合到厂商私有服务发现API上的风险。


[官网](https://nacos.io/zh-cn/)  https://nacos.io/zh-cn/

## Nacos Docker 快速开始
https://github.com/nacos-group/nacos-docker.git

单机模式 Derby

> docker-compose -f example/standalone-derby.yaml up

单机模式 MySQL
如果希望使用MySQL5.7

> docker-compose -f example/standalone-mysql-5.7.yaml up

```yaml
version: "3.8"
services:
  nacos:
    image: nacos/nacos-server:${NACOS_VERSION}
    container_name: nacos-mysql
    env_file:
      - ../env/custom-application-config.env
    volumes:
      - ./standalone-logs/:/home/nacos/logs
      - ./conf/:/home/nacos/conf
      - ./data/:/home/nacos/data
    ports:
      - "8848:8848"
      - "9848:9848"
      - "9555:9555"
    networks:
      redis-cluster:
        ipv4_address: 172.18.0.70

    restart: on-failure

# 使用外部网卡
networks:
  prod-network:
    external: true
```


如果希望使用MySQL8

> docker-compose -f example/standalone-mysql-8.yaml up

集群模式

> docker-compose -f example/cluster-hostname.yaml up

服务注册

> curl -X POST 'http://127.0.0.1:8848/nacos/v1/ns/instance?serviceName=nacos.naming.serviceName&ip=20.18.7.10&port=8080'

服务发现

> curl -X GET 'http://127.0.0.1:8848/nacos/v1/ns/instance/list?serviceName=nacos.naming.serviceName'

发布配置
> curl -X POST "http://127.0.0.1:8848/nacos/v1/cs/configs?dataId=nacos.cfg.dataId&group=test&content=helloWorld"

获取配置
> curl -X GET "http://127.0.0.1:8848/nacos/v1/cs/configs?dataId=nacos.cfg.dataId&group=test"

Nacos 控制台

link：http://127.0.0.1:8848/nacos/

