---
title: elk
date: 2026-08-09 14:56:23
permalink: /pages/0da7a3/
categories:
  - 后端
  - Collection
  - elk
tags:
  - 
author: 
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---
# ELK

## docker compose编排容器
> https://blog.csdn.net/qq_50227688/article/details/115379121

我们搭建三个节点的集群，根据上面所说要求对集群中必要组件进行冗余，我们将三个节点都设置为数据节点，并且每个节点都设置为master。

### 第一步，创建Es目录，在Es目录分别创建elasticSearch-node1，elasticSearch-node2，elasticSearch-node3三个目录作为三个节点的挂载目录，然后在三个目录下分别创建conf、data、plugins三个目录分别挂载容器内的es配置文件、es数据、es插件。

在Es目录下创建kibana目录并在该目录下创建kibana.yml，用于挂载kibana配置文件。
kibana.yml
```yaml
##默认值: 5601 Kibana 由后端服务器提供服务，该配置指定使用的端口号。 
server.port: 5602
#默认值: "localhost" 指定后端服务器的主机地址。 
server.host: "0.0.0.0"
#如果启用了代理，指定 Kibana 的路径，该配置项只影响 Kibana 生成的 URLs，转发请求到 Kibana 时代理会移除基础路径值，该配置项不能以斜杠 (/)结尾。 
#server.basePath:
#默认值: 1048576 服务器请求的最大负载，单位字节。 
#server.maxPayloadBytes:
#"您的主机名" Kibana 实例对外展示的名称。 
server.name: "Kibana"
#"/app/kibana" Kibana 的默认路径，该配置项可改变 Kibana 的登录页面。
#server.defaultRoute:
#"http://localhost:9200" 用来处理所有查询的 Elasticsearch 实例的 URL 。
elasticsearch.hosts: ["http://172.18.0.31:9201"]
#true 该设置项的值为 true 时，Kibana 使用 server.host 设定的主机名，该设置项的值为 false 时，Kibana 使用主机的主机名来连接 Kibana 实例。
elasticsearch.preserveHost: true
i18n.locale: "zh-CN"
#".kibana" Kibana 使用 Elasticsearch 中的索引来存储保存的检索，可视化控件以及仪表板。如果没有索引，Kibana 会创建一个新的索引。
#kibana.index:
#"discover" 默认加载的应用。 
#kibana.defaultAppId:
#    Kibana 用来在 tile 地图可视化组件中展示地图服务的 URL。默认时，Kibana 从外部的元数据服务读取 url，用户也可以覆盖该参数，使用自己的 tile 地图服务。例如："https://tiles.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana" 
#tilemap.url:
#1 最小缩放级别。 
#tilemap.options.minZoom:
#10 最大缩放级别。 
#tilemap.options.maxZoom:
#"? [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)" 地图属性字符串。 
#tilemap.options.attribution:
#服务使用的二级域名列表，用 {s} 指定二级域名的 URL 地址。
#tilemap.options.subdomains:
#Elasticsearch 设置了基本的权限认证，该配置项提供了用户名和密码，用于 Kibana 启动时维护索引。Kibana 用户仍需要 Elasticsearch 由 Kibana 服务端代理的认证。 
#elasticsearch.username: elastic
#elasticsearch.password: 123456
#默认值: "false" 对到浏览器端的请求启用 SSL，设为 true 时， server.ssl.certificate 和 server.ssl.key 也要设置。 
#server.ssl.enabled:
#PEM 格式 SSL 证书和 SSL 密钥文件的路径。 
#server.ssl.certificate:
#server.ssl.key:
#解密私钥的口令，该设置项可选，因为密钥可能没有加密。    
#server.ssl.keyPassphrase:
#可信任 PEM 编码的证书文件路径列表。  
#server.ssl.certificateAuthorities:
#TLSv1、TLSv1.1、TLSv1.2 版本支持的协议，有效的协议类型: TLSv1 、 TLSv1.1 、 TLSv1.2 。 
#server.ssl.supportedProtocols:
##ECDHE-RSA-AES128-GCM-SHA256, ECDHE-ECDSA-AES128-GCM-SHA256, ECDHE-RSA-AES256-GCM-SHA384, ECDHE-ECDSA-AES256-GCM-SHA384, DHE-RSA-AES128-GCM-SHA256, ECDHE-RSA-AES128-SHA256, DHE-RSA-AES128-SHA256, ECDHE-RSA-AES256-SHA384, DHE-RSA-AES256-SHA384, ECDHE-RSA-AES256-SHA256, DHE-RSA-AES256-SHA256, HIGH,!aNULL, !eNULL, !EXPORT, !DES, !RC4, !MD5, !PSK, !SRP, !CAMELLIA. 具体格式和有效参数可通过[OpenSSL cipher list format documentation](https://www.openssl.org/docs/man1.0.2/apps/ciphers.html#CIPHER-LIST-FORMAT) 获得。 
#server.ssl.cipherSuites:
#可选配置项，提供 PEM格式 SSL 证书和密钥文件的路径。这些文件确保 Elasticsearch 后端使用同样的密钥文件。 
#elasticsearch.ssl.certificate:  
#elasticsearch.ssl.key:
#解密私钥的口令，该设置项可选，因为密钥可能没有加密。 
#elasticsearch.ssl.keyPassphrase:
#指定用于 Elasticsearch 实例的 PEM 证书文件路径。  
#elasticsearch.ssl.certificateAuthorities:
#full 控制证书的认证，可用的值有 none 、 certificate 、 full 。 full 执行主机名验证，certificate 不执行主机名验证。 
#elasticsearch.ssl.verificationMode:
#elasticsearch.requestTimeout setting 的值，等待 Elasticsearch 的响应时间。
#elasticsearch.pingTimeout:
#30000 等待后端或 Elasticsearch 的响应时间，单位微秒，该值必须为正整数。
#elasticsearch.requestTimeout:
#[ 'authorization' ] Kibana 客户端发送到 Elasticsearch 头体，发送 no 头体，设置该值为[]。 
#elasticsearch.requestHeadersWhitelist:
#{} 发往 Elasticsearch的头体和值， 不管 elasticsearch.requestHeadersWhitelist 如何配置，任何自定义的头体不会被客户端头体覆盖。
#elasticsearch.customHeaders:
#0 Elasticsearch 等待分片响应时间，单位微秒，0即禁用。
#elasticsearch.shardTimeout:
#5000 Kibana 启动时等待 Elasticsearch 的时间，单位微秒。 
#elasticsearch.startupTimeout:
#    指定 Kibana 的进程 ID 文件的路径。 
#pid.file:
#stdout 指定 Kibana 日志输出的文件。
#logging.dest:
#false 该值设为 true 时，禁止所有日志输出。
#logging.silent:
#false 该值设为 true 时，禁止除错误信息除外的所有日志输出。 
#logging.quiet:
#false 该值设为 true 时，记下所有事件包括系统使用信息和所有请求的日志。 
#logging.verbose:
#5000 设置系统和进程取样间隔，单位微妙，最小值100。
#ops.interval:
##false 如果启用了权限，该项设置为 true 即允许所有非授权用户访问 Kibana 服务端 API 和状态页面。  
#status.allowAnonymous:
#如果挂载点跟 /proc/self/cgroup 不一致，覆盖 cgroup cpu 路径。 
#cpu.cgroup.path.override:
#如果挂载点跟 /proc/self/cgroup 不一致，覆盖 cgroup cpuacct 路径。    
#cpuacct.cgroup.path.override:
#true 设为 false 来禁用控制台，切换该值后服务端下次启动时会重新生成资源文件，因此会导致页面服务有点延迟。     
#console.enabled:
#Elasticsearch tribe 实例的 URL，用于所有查询。 
#elasticsearch.tribe.url:
#Elasticsearch 设置了基本的权限认证，该配置项提供了用户名和密码，用于 Kibana 启动时维护索引。Kibana 用户仍需要 Elasticsearch 由 Kibana 服务端代理的认证。    
#elasticsearch.tribe.username: 
#elasticsearch.tribe.password:    
#可选配置项，提供 PEM 格式 SSL 证书和密钥文件的路径。这些文件确保 Elasticsearch 后端使用同样的密钥文件。 
#elasticsearch.tribe.ssl.certificate:
#elasticsearch.tribe.ssl.key:
#解密私钥的口令，该设置项可选，因为密钥可能没有加密。    
#elasticsearch.tribe.ssl.keyPassphrase:
#指定用于 Elasticsearch tribe 实例的 PEM 证书文件路径。     
#elasticsearch.tribe.ssl.certificateAuthorities:
#full 控制证书的认证，可用的值有 none 、 certificate 、 full 。 full 执行主机名验证， certificate 不执行主机名验证。     
#elasticsearch.tribe.ssl.verificationMode:
#elasticsearch.tribe.requestTimeout setting 的值，等待 Elasticsearch 的响应时间。 
#elasticsearch.tribe.pingTimeout:
#Default: 30000 等待后端或 Elasticsearch 的响应时间，单位微秒，该值必须为正整数。 
#elasticsearch.tribe.requestTimeout:
#[ 'authorization' ] Kibana 发往 Elasticsearch 的客户端头体，发送 no 头体，设置该值为[]。   
#elasticsearch.tribe.requestHeadersWhitelist:
#{} 发往 Elasticsearch的头体和值，不管 elasticsearch.tribe.requestHeadersWhitelist 如何配置，任何自定义的头体不会被客户端头体覆盖。 
```

### 第二步，编写docker-compose目录：

docker-compose.yml

```yml
version: '3'
services:
  elasticSearch-node1:
    image: ${image}
    container_name: elasticSearch-node1
    environment:
      # 此处两行配置 可以写到elasticsearch.yml 中 
      - discovery.seed_hosts=elasticSearch-node1:9301,elasticSearch-node2:9302,elasticSearch-node3:9303
      - cluster.initial_master_nodes=elasticSearch-node1,elasticSearch-node2,elasticSearch-node3
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    # 控制资源限制
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - /Users/zhangbao/data/apps/ESCluster/elasticSearch-node1/data:/usr/share/elasticsearch/data
      - /Users/zhangbao/data/apps/ESCluster/elasticSearch-node1/config:/usr/share/elasticsearch/config
      - /Users/zhangbao/data/apps/ESCluster/elasticSearch-node1/plugins:/usr/share/elasticsearch/plugins
    ports:
      - 9201:9201
      - 9301:9301
    networks:
      prod-network:
        ipv4_address: 172.18.0.31

  elasticSearch-node2:
    image: ${image}
    container_name: elasticSearch-node2
    environment:
      # 此处两行配置 可以写到elasticsearch.yml 中 
      - discovery.seed_hosts=elasticSearch-node1:9301,elasticSearch-node2:9302,elasticSearch-node3:9303
      - cluster.initial_master_nodes=elasticSearch-node1,elasticSearch-node2,elasticSearch-node3
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - /Users/zhangbao/data/apps/ESCluster/elasticSearch-node2/data:/usr/share/elasticsearch/data
      - /Users/zhangbao/data/apps/ESCluster/elasticSearch-node2/config:/usr/share/elasticsearch/config
      - /Users/zhangbao/data/apps/ESCluster/elasticSearch-node2/plugins:/usr/share/elasticsearch/plugins
    ports:
      - 9202:9202
      - 9302:9302
    networks:
      prod-network:
        ipv4_address: 172.18.0.32

  elasticSearch-node3:
    image: ${image}
    container_name: elasticSearch-node3
    environment:
      # 此处两行配置 可以写到elasticsearch.yml 中 
      - discovery.seed_hosts=elasticSearch-node1:9301,elasticSearch-node2:9302,elasticSearch-node3:9303
      - cluster.initial_master_nodes=elasticSearch-node1,elasticSearch-node2,elasticSearch-node3
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - /Users/zhangbao/data/apps/ESCluster/elasticSearch-node3/data:/usr/share/elasticsearch/data
      - /Users/zhangbao/data/apps/ESCluster/elasticSearch-node3/config:/usr/share/elasticsearch/config
      - /Users/zhangbao/data/apps/ESCluster/elasticSearch-node3/plugins:/usr/share/elasticsearch/plugins
    ports:
      - 9203:9203
      - 9303:9303
    networks:
      prod-network:
        ipv4_address: 172.18.0.33

  kibana:
    image: ${image_kibana}
    container_name: kibana-node
    depends_on:
      - elasticSearch-node1
      - elasticSearch-node2
      - elasticSearch-node3
    environment:
      ELASTICSEARCH_URL: http://elasticSearch-node1:9201
      ELASTICSEARCH_HOSTS: http://elasticSearch-node1:9201
      server.port: 5602
    volumes:
      - /Users/zhangbao/data/apps/ESCluster/kibana/config:/usr/share/kibana/config
      - /Users/zhangbao/data/apps/ESCluster/kibana/data:/usr/share/kibana/data
      - /Users/zhangbao/data/apps/ESCluster/kibana/plugins:/usr/share/kibana/config/plugins
    networks:
      prod-network:
        ipv4_address: 172.18.0.41
    ports:
      - 5602:5602
  logstash:
    image: ${image_logstash}
    container_name: logstash-node
    volumes:
      - ./logstash/config:/usr/share/logstash/config
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5001:5001/tcp"
      - "5001:5001/udp"
      - "9601:9601"
    environment:
      LS_JAVA_OPTS: "-Xmx512m -Xms512m"
    networks:
      prod-network:
        ipv4_address: 172.18.0.51
    depends_on:
      - elasticSearch-node1
      - elasticSearch-node2
      - elasticSearch-node3
# 使用外部网卡
networks:
  prod-network:
    external: true
```

#### windows

```shell
version: '3'
services:
  elasticSearch-node1:
    image: ${image}
    container_name: elasticSearch-node1
    environment:
      # 此处两行配置 可以写到elasticsearch.yml 中 
      - discovery.seed_hosts=elasticSearch-node1:9301,elasticSearch-node2:9302,elasticSearch-node3:9303
      - cluster.initial_master_nodes=elasticSearch-node1,elasticSearch-node2,elasticSearch-node3
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    # 控制资源限制
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - E:\data\apps\ESCluster\elasticSearch-node1\data:/usr/share/elasticsearch/data
      - E:\data\apps\ESCluster\elasticSearch-node1\config:/usr/share/elasticsearch/config
      - E:\data\apps\ESCluster\elasticSearch-node1\plugins:/usr/share/elasticsearch/plugins
    ports:
      - 9201:9201
      - 9301:9301
    networks:
      prod-network:
        ipv4_address: 172.18.0.31

  elasticSearch-node2:
    image: ${image}
    container_name: elasticSearch-node2
    environment:
      # 此处两行配置 可以写到elasticsearch.yml 中 
      - discovery.seed_hosts=elasticSearch-node1:9301,elasticSearch-node2:9302,elasticSearch-node3:9303
      - cluster.initial_master_nodes=elasticSearch-node1,elasticSearch-node2,elasticSearch-node3
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - E:\data\apps\ESCluster\elasticSearch-node2\data:/usr/share/elasticsearch/data
      - E:\data\apps\ESCluster\elasticSearch-node2\config:/usr/share/elasticsearch/config
      - E:\data\apps\ESCluster\elasticSearch-node2\plugins:/usr/share/elasticsearch/plugins
    ports:
      - 9202:9202
      - 9302:9302
    networks:
      prod-network:
        ipv4_address: 172.18.0.32

  elasticSearch-node3:
    image: ${image}
    container_name: elasticSearch-node3
    environment:
      # 此处两行配置 可以写到elasticsearch.yml 中 
      - discovery.seed_hosts=elasticSearch-node1:9301,elasticSearch-node2:9302,elasticSearch-node3:9303
      - cluster.initial_master_nodes=elasticSearch-node1,elasticSearch-node2,elasticSearch-node3
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - E:\data\apps\ESCluster\elasticSearch-node3\data:/usr/share/elasticsearch/data
      - E:\data\apps\ESCluster\elasticSearch-node3\config:/usr/share/elasticsearch/config
      - E:\data\apps\ESCluster\elasticSearch-node3\plugins:/usr/share/elasticsearch/plugins
    ports:
      - 9203:9203
      - 9303:9303
    networks:
      prod-network:
        ipv4_address: 172.18.0.33

  kibana:
    image: ${image_kibana}
    container_name: kibana-node
    depends_on:
      - elasticSearch-node1
      - elasticSearch-node2
      - elasticSearch-node3
    environment:
      ELASTICSEARCH_URL: http://elasticSearch-node1:9201
      ELASTICSEARCH_HOSTS: http://elasticSearch-node1:9201
      server.port: 5602
    volumes:
      - E:\data\apps\ESCluster\kibana\config:/usr/share/kibana/config
      - E:\data\apps\ESCluster\kibana\data:/usr/share/kibana/data
      - E:\data\apps\ESCluster\kibana\plugins:/usr/share/kibana/config/plugins
    networks:
      prod-network:
        ipv4_address: 172.18.0.41
    ports:
      - 5602:5602
  logstash:
    image: ${image_logstash}
    container_name: logstash-node
    volumes:
      - ./logstash/config:/usr/share/logstash/config
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5001:5001/tcp"
      - "5001:5001/udp"
      - "9601:9601"
    environment:
      LS_JAVA_OPTS: "-Xmx512m -Xms512m"
    networks:
      prod-network:
        ipv4_address: 172.18.0.51
    depends_on:
      - elasticSearch-node1
      - elasticSearch-node2
      - elasticSearch-node3
# 使用外部网卡
networks:
  prod-network:
    external: true
```


在docker-compose文件中，容器使用镜像我们都使用占位符代替，那么docker会加载哪个地方？
在docker-compose文件所在目录下创建 .env文件，docker会读取这个文件的变量来替换compose文件的占位符。
.env
```shell
image=elasticsearch:7.17.5
image_kibana=kibana:7.17.5
image_logstash=logstash:7.17.5
```

我们再对每个节点的配置做分析：
image:${image} elasticsearch镜像
container_name 节点名称
discovery.seed_hosts cluster.initial_master_nodes
这两个设置是为了集群中的节点可以相互发现并进行主节点选举。

discovery.seed_hosts ：发现配置。
如果你的es节点都部署在本地，那么可以不用配置，es在启动时将绑定到可用的回环地址，并扫描9300-9305端口，以连接同一服务器上的es节点。
如果要与其他服务器上的节点组成集群，则必须配置该节点。该配置是用于在集群中启动当前节点时，发现其他节点的初始列表，这些节点必须都是master，并且是处于活动状态的可达节点，每个地址可以是ip地址，也可以是通过DNS解析为一个或多个ip地址的主机名。
cluster.initial_master_nodes：初始候选master节点列表。
集群第一次启动的时候，集群需要进行一次主节点选举，集群引导步骤将确定在第一次选举中进行投票的一组主节点。在开发模式下，如果未配置发现设置，此步骤将由节点本身自动执行，由于自动引导本质上是不安全的，所以在生产环境中，必须使用cluster.initial_master_nodes来配置这组主节点列表。
当集群第一次成功形成后 应该在每个节点的配置中删除该配置，重新启动集群或者将新节点添加到集群中不要使用此配置。
关于discovery.seed_hosts 和 cluster.initial_master_nodes两个配置可以参考官方文档以下两处：
discovery-settings
modules-discovery-settings
ES_JAVA_OPTS 设置堆内存大小
默认情况下，ES根据节点的角色和总内存自动设置堆大小。
如果要根据实际机器内存情况覆盖默认堆内存大小，设置Xms和Xms必须设置大小同样的值。由于ES需要堆以外的内存来进行其他工作，因此这两个值不应该大于总内存的50%。

### 第三步，在每个es节点挂载主目录下的conf目录编写每个节点的elasticsearch.yml配置文件。

elasticSearch-node1/config/elasticsearch.yml

```yaml
cluster.name: es_cluster # 集群名称，集群名称相同的节点自动组成一个集群
node.name: elasticSearch-node1  # 节点名称
network.host: 0.0.0.0 # 同时设置bind_host和publish_host
http.port: 9201  # rest客户端连接端口
transport.tcp.port: 9301  # 集群中节点互相通信端口
node.master: true # 设置master角色
node.data: true # 设置data角色
node.ingest: true # 设置ingest角色 在索引之前，对文档进行预处理，支持pipeline管道，相当于过滤器
bootstrap.memory_lock: false
xpack.security.enabled: false
node.max_local_storage_nodes: 1
http.cors.enabled: true # 跨域配置
http.cors.allow-origin: /.*/ # 跨域配置
```

elasticSearch-node2/config/elasticsearch.yml
```yaml
cluster.name: es_cluster
node.name: elasticSearch-node2
network.host: 0.0.0.0
http.port: 9202
transport.tcp.port: 9302
node.master: true
node.data: true
node.ingest: true
bootstrap.memory_lock: false
xpack.security.enabled: false
node.max_local_storage_nodes: 1
http.cors.enabled: true
http.cors.allow-origin: /.*/
```

elasticSearch-node3/config/elasticsearch.yml
```yaml
cluster.name: es_cluster
node.name: elasticSearch-node3
network.host: 0.0.0.0
http.port: 9203
transport.tcp.port: 9303
node.master: true
node.data: true
node.ingest: true
bootstrap.memory_lock: false
xpack.security.enabled: false
node.max_local_storage_nodes: 1
http.cors.enabled: true
http.cors.allow-origin: /.*/
```

logstash/config/logstash.yml 配置中的
```shell
xpack.monitoring.elasticsearch.hosts: [ "http://elasticSearch-node1:9201" ]
```
logstash/pipeline/logstash.conf
```shell
input {
  tcp {
    mode => "server"
    host => "0.0.0.0"
    port => 5001
    codec => json_lines
  }
}

filter {
  mutate { add_field => { "show" => "This data will be in the output" } }
  mutate { add_field => { "[@metadata][beat]" => "my-project" } }
  mutate { add_field => { "[@metadata][version]" => "0.0.1" } }
}

output {
  stdout { codec => rubydebug { metadata => true }}
  elasticsearch {
    hosts => ["http://elasticSearch-node1:9201"]
    index => "%{[@metadata][beat]}-%{[appName]}-%{[@metadata][version]}-%{+YYYY.MM.dd}"
    #user => "elastic"
    #password => "changeme"
  }
}
```

# 仅模板 logstash/pipeline/logstash.conf 会真实生效
logstash/config/logstash-sample.conf
```shell
input {
  tcp {
    mode => "server"
    host => "0.0.0.0"
    port => 5001
    codec => json_lines
  }
}

filter {
  mutate { add_field => { "show" => "This data will be in the output" } }
  mutate { add_field => { "[@metadata][beat]" => "my-project" } }
  mutate { add_field => { "[@metadata][version]" => "0.0.1" } }
}

output {
  stdout { codec => rubydebug { metadata => true }}
  elasticsearch {
    hosts => ["http://elasticSearch-node1:9201"]
    index => "%{[@metadata][beat]}-%{[appName]}-%{[@metadata][version]}-%{+YYYY.MM.dd}"
    #user => "elastic"
    #password => "changeme"
  }
}
```

### Docker运行Elasticsearch如何设置vm.max_map_count
启动时可能发生如下报错
> max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]
```shell
Linux
修改配置文件
grep vm.max_map_count /etc/sysctl.conf vm.max_map_count=262144
启动配置
sysctl -w vm.max_map_count=262144

Mac
启动命令行执行
screen ~/Library/Containers/com.docker.docker/Data/vms/0/tty
回车然后确认输入配置
sysctl -w vm.max_map_count=262144

Windows and macOS with Docker Desktop
通过docker-machine进行设置
docker-machine ssh
sudo sysctl -w vm.max_map_count=262144

Windows with Docker Desktop WSL 2 backend
wsl -d docker-desktop
#(永久)
echo 262144 >> /proc/sys/vm/max_map_count
#（临时）
sysctl -w vm.max_map_count=262144
```
### 第四步，启动集群，在docker-compose文件所在目录下运行命令：

docker-compose up -d

docker-compose stop

docker-compose down

docker-compose start

docker-compose restart