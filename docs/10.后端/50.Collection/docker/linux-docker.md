# docker

## Linux docker

基于virtual bos 安装的 centos7镜像

```shell
1 卸载系统之前的docker 
sudo yum remove docker \
              docker-client \
              docker-client-latest \
              docker-common \
              docker-latest \
              docker-latest-logrotate \
              docker-logrotate \
              docker-engine

2  设置存储库
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

3  安装DOCKER引擎
sudo yum install docker-ce docker-ce-cli containerd.io

4  启动Docker.
sudo systemctl start docker

5 配置镜像加速
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://chqac97z.mirror.aliyuncs.com"]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

```shell
--启动docker
systemctl start docker
--停止dokcer
systemctl stop docker
--查看docker状态
systemctl status docker 
--重启docker
systemctl restart docker
# docker 服务开机自启动命令
systemctl enable docker.service
# 关闭docker 服务开机自启动命令
systemctl disable docker.service
--查看docker 版本
docker version
--查看docker配置
cat /usr/lib/systemd/system/docker.service
```

安装 portainer

```shell
--查询
docker search portainer
NAME                                   DESCRIPTION                                     STARS     OFFICIAL   AUTOMATED
portainer/portainer                    This Repo is now deprecated, use portainer/p…   2243   
--拉取镜像
docker pull portainer/portainer
--查看镜像
docker images
REPOSITORY            TAG       IMAGE ID       CREATED         SIZE
portainer/portainer   latest    580c0e4e98b0   16 months ago   79.1MB
--启动
docker run -d -p 9000:9000 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v /data/apps/portainer/data:/data portainer/portainer
```

### docker 网络

#### 用法

```shell
docker network create [OPTIONS] NETWORK
```

#### 选项

| 名称，简写| 默认| 说明|
| --- | --- | --- |
| `--attachable` |false  | 启用手动容器安装 |
| `--aux-address` | `map[]` | 网络驱动程序使用的辅助IPv4或IPv6地址 |
| --driver, -d | bridge | 驱动程序管理网络 |
| --gateway |  | 用于主子网的IPv4或IPv6网关 |
|`--internal`|false|限制对网络的外部访问|
|`--ip-range`||从子范围分配容器`ip`|
|`--ipam-driver`|default|IP地址管理驱动程序|
|`--ipam-opt`|`map[]`|设置IPAM驱动程序的具体选项|
|`--ipv6`|false|启用IPv6网络|
|`--label`||在网络上设置元数据|
|`--opt, -o`|`map[]`|设置驱动程序特定选项|
|`--subnet`|| 表示网段的CIDR格式的子网 |

#### 相关命令

| 名称| 说明|
| --- | --- |
|[docker network connect](http://www.yiibai.com/docker/network_connect.html "docker network connect") |将容器连接到网络|
|[docker network create](http://www.yiibai.com/docker/network_create.html "docker network create") | 创建一个网络|
|[docker network disconnect](http://www.yiibai.com/docker/network_disconnect.html "docker network disconnect") | 断开容器的网络|
|[docker network inspect](http://www.yiibai.com/docker/network_inspect.html "docker network inspect")  |显示一个或多个网络的详细信息|
|[docker network ls](http://www.yiibai.com/docker/network_ls.html "docker network ls") | 列出网络|
|[docker network prune](http://www.yiibai.com/docker/network_prune.html "docker network prune")  |删除所有未使用的网络|
|[docker network rm](http://www.yiibai.com/docker/network_rm.html "docker network rm") |  删除一个或多个网络|

## 示例

**连接容器网络**

启动容器时，使用`--network`标志将其连接到网络。 此示例将`busybox`容器添加到`mynet`网络：

```shell
$ docker run -itd --network=mynet busybox
```

如果要在容器运行后将容器添加到网络，请使用`docker network connect`子命令。

**指定高级选项**

创建网络时，引擎默认为网络创建一个不重叠的子网。 该子网不是现有网络的细分。 它纯粹用于IP寻址目的。可以覆盖此默认值，并使用`--subnet`选项直接指定子网络值。 在桥接网络上，只能创建单个子网：

```shell
$ docker network create --driver=bridge --subnet=192.168.0.0/16 br0
```

另外，还可以指定`--gateway --ip-range`和`--aux-address`选项。

```shell
$ docker network create \
  --driver=bridge \
  --subnet=172.28.0.0/16 \
  --ip-range=172.28.5.0/24 \
  --gateway=172.28.5.254 \
  br0
```

如果省略`--gateway`标志，引擎将从首选池中选择一个。对于覆盖网络和支持它的网络驱动程序插件，可以创建多个子网络。

```shell
$ docker network create -d overlay \
  --subnet=192.168.0.0/16 \
  --subnet=192.170.0.0/16 \
  --gateway=192.168.0.100 \
  --gateway=192.170.0.100 \
  --ip-range=192.168.1.0/24 \
  --aux-address="my-router=192.168.1.5" --aux-address="my-switch=192.168.1.6" \
  --aux-address="my-printer=192.170.1.5" --aux-address="my-nas=192.170.1.6" \
  my-multihost-network
```

确保子网不重叠。如果重叠的话网络创建失败，并且引擎会返回错误。

**桥接驱动程序选项**

创建自定义网络时，默认的网络驱动程序(即bridge)具有可以传递的其他选项。

例如，使用`-o`或`--opt`选项在发布端口时指定IP地址绑定：

```shell
$ docker network create \
    -o "com.docker.network.bridge.host_binding_ipv4"="172.19.0.1" \
    simple-network
```

### 示例

#### 将正在运行的容器连接到网络
```shell
$ docker network connect multi-host-network my_container1
```
#### 启动时将容器连接到网络
还可以使用docker run --network=<network-name>选项启动容器并立即将其连接到网络。
```shell
$ docker run -itd --network=multi-host-network busybox-container
```
#### 指定容器的IP地址
可以指定要分配给容器网络接口的IP地址。
````shell
$ docker network connect --ip 10.10.36.122 multi-host-network container2
````
#### 使用legacy —link选项
可以使用--link选项将另一个容器与首选别名相链接
```shell
$ docker network connect --link container1:c1 multi-host-network container2
```
#### 为容器创建一个网络别名
--alias选项可用于通过连接到的网络中的另一个名称来解析容器。
```shell
$ docker network connect --alias db --alias mysql multi-host-network container2
```
#### 停止，暂停或重新启动容器的网络影响
可以暂停，重新启动并停止连接到网络的容器。容器在运行时连接到其配置的网络。
```shell
$ docker network create --subnet 172.20.0.0/16 --ip-range 172.20.240.0/20 multi-hos
$ docker network connect --ip 172.20.128.2 multi-host-network container2
```


#### 创建net-work

```shell
docker network create \
  --driver=bridge \
  --subnet=172.18.0.0/16 \
  --ip-range=172.18.0.0/24 \
  --gateway=172.18.0.1 \
  prod-network
```

## 创建redis集群

```shell
docker run -d -p 6381:6381 --net host --name redis-node-1  --privileged=true --hostname redis-node-1 -v /data/apps/redis/redis-node-1:/data redis:6.0.8 --requirepass "123456" --masterauth "123456" --cluster-enabled yes --appendonly yes --port 6381
docker run -d -p 6382:6382 --net host --name redis-node-2  --privileged=true --hostname redis-node-2 -v /data/apps/redis/redis-node-2:/data redis:6.0.8 --requirepass "123456" --masterauth "123456" --cluster-enabled yes --appendonly yes --port 6382
docker run -d -p 6383:6383 --net host --name redis-node-3  --privileged=true --hostname redis-node-3 -v /data/apps/redis/redis-node-3:/data redis:6.0.8 --requirepass "123456" --masterauth "123456" --cluster-enabled yes --appendonly yes --port 6383
docker run -d -p 6384:6384 --net host --name redis-node-4  --privileged=true --hostname redis-node-4 -v /data/apps/redis/redis-node-4:/data redis:6.0.8 --requirepass "123456" --masterauth "123456" --cluster-enabled yes --appendonly yes --port 6384
docker run -d -p 6385:6385 --net host --name redis-node-5  --privileged=true --hostname redis-node-5 -v /data/apps/redis/redis-node-5:/data redis:6.0.8 --requirepass "123456" --masterauth "123456" --cluster-enabled yes --appendonly yes --port 6385
docker run -d -p 6386:6386 --net host --name redis-node-6  --privileged=true --hostname redis-node-6 -v /data/apps/redis/redis-node-6:/data redis:6.0.8 --requirepass "123456" --masterauth "123456" --cluster-enabled yes --appendonly yes --port 6386
#单节点
docker run -d -p 6379:6379 --net host --name redis-node  --privileged=true --hostname redis-node -v /data/apps/redis/redis-node:/data redis:6.0.8 --requirepass "123456" --appendonly yes --port 6379
```
windows 中 ping不通docker容器内ip 固选择host模式  mac可以选择使用ip桥接模式
```shell
redis-cli --cluster create 192.168.56.10:6381 192.168.56.10:6382 192.168.56.10:6383 192.168.56.10:6384 192.168.56.10:6385 192.168.56.10:6386 --cluster-replicas 1 -a 123456
# 必须为ip地址  redis集群对主机名不敏感  配置会失败
# --cluster-replicas 1  主从节点比例
# -a 123456  连接密码
```

设置 redis自启动
```shell
docker update --restart=always redis-node-1 redis-node-2 redis-node-3 redis-node-4 redis-node-5 redis-node-6
```

### 创建mysql 主从复制

mysql 在 virtualbox 挂载windows硬盘的情况下 不能正常启动 顾不挂载在windows 共享磁盘下 仅仅挂载在virtualbox centos7中
```shell
docker run -p 3307:3306 --name mysql-master --privileged=true \
--hostname mysql-master --net prod-network --ip 172.18.0.20 --add-host mysql-slave:172.18.0.21 \
-v /mysql/mysql-master/log:/var/log/mysql \
-v /mysql/mysql-master/data:/var/lib/mysql \
-v /mysql/mysql-master/conf/:/etc/mysql/conf.d/ \
-e MYSQL_ROOT_PASSWORD=root \
-d mysql:5.7


docker run -p 3308:3306 --name mysql-slave --privileged=true \
--hostname mysql-slave --net prod-network --ip 172.18.0.21 --add-host mysql-master:172.18.0.20 \
-v /mysql/mysql-slave/log:/var/log/mysql \
-v /mysql/mysql-slave/data:/var/lib/mysql \
-v /mysql/mysql-slave/conf:/etc/mysql/conf.d/ \
-e MYSQL_ROOT_PASSWORD=root \
-d mysql:5.7
```

设置 mysql自启动
```shell
docker update --restart=always mysql-master
```