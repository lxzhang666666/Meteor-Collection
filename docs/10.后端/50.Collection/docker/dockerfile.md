---
title: dockerfile
date: 2026-08-09 14:56:23
permalink: /pages/278be5/
categories:
  - 后端
  - Collection
  - docker
tags:
  - 
author: 
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---
# Dockerfile
## 文件概述
> Dockerfile是一个用于自定义构建镜像的文本文件，其中包含了多条构建镜像所需要的指令、软件依赖和说明。

## 指令详解
### FROM
指定基础镜像

```text
格式:
	FROM <image>
	FROM <image>:<tag>
	FROM <image>@<digest>
描述：
	tag和digest可选，不指定时，则使用latest版本基础镜像，digest表示V2版本及以上版本镜像的内容可寻址标识符。
示例:
	FROM centos:7
```

### MAINTAINER
维护者信息

```text
格式：
	MAINTAINER <name>
描述：
	name即为维护者信息，可自定义为姓名、邮箱地址等
示例：
	MAINTAINER andya
	MAINTAINER andya@163.com
	MAINTAINER andya <andya@163.com>
```

### USER
设置用户名（或UID）和可选设置用户组（或GID），用于运行镜像及RUN、CMD、ENTRYPOINT命令。
```text
格式：
	USER <user>[:<group>]
	USER <UID>[:<GID>]
描述：
	1）可以直接指定用户名或所属组名，也可以指定UID或GID。
	2）当为用户指定一个用户组，则该用户只有该指定的组关系，其他组成员关系将会被忽略。
示例：
	USER userA
```


### WROKDIR
指定工作目录，类似于cd命令。默认不设置即为容器根目录/
```text
格式：
	WROKDIR <dir>
描述：
	1）设置工作目录后，Dockerfile后的命令RUN, CMD, ENTRYPOINT, COPY和ADD等命令，都在该目录下运行。
	2）若不存在，则自动创建。
	3）在docker run时，可以通过-w或--workdir进行覆盖。
	4）在Dockerfile中可以多次使用，使用相对路径时，会基于第一个进行拼接成绝对路径。
示例：
	# 此时工作目录为根目录/
	WROKDIR /
	# 此时工作目录为/c
	WROKDIR c
```

### ARG
用户指定传递给build构建运行时的变量
```text
格式：
	ARG <name>[=<default value>]
描述：
	1）docker build命令中通过--build-arg <varname>=<value>进行指定，若Dockerfile不存在该arg声明，则抛警告。
示例：
	FROM busybox
	ARG user1
	ARG buildno
	
	# 设置默认值
	FROM busybox
	ARG user1=someuser
	ARG buildno=1
```

### ENV
设置环境变量
```text
格式：
	ENV <key> <value>
	ENV <key>=<value> ...
描述：
	1）ENV <key> <value> 中的<key>后面内容都作为<value>的内容，所以一次只能设置一个变量
	2）ENV <key>=<value> ... 可以设置多个变量，若遇到空格等可使用\进行转义，或""进行标识
示例：
	ENV addressInfo suzhou xiancheng
	ENV addressCity=suzhou
```

### VOLUME
指定持久化目录为匿名卷，防止运行时用户将动态文件所保存目录挂载为卷。
```text
格式：
	VOLUME ["<dir01>", "<dir02>", ...]
	VOLUME <dir>
描述：
	指定持久化目录，卷可以存在于一个或多个容器的指定目录
示例：
	VOLUME ["/data/data01", "/data/data02"]
	VOLUME /data
```


### LABEL
给镜像添加元数据，LABEL是一堆key-value对。
```text
格式：
	LABEL <key>=<value> <key>=<value> <key>=<value> ...
描述：
	镜像可以有1个或多个label，且可以在一行设置多个label，通过空格分隔。推荐使用一条LABEL指令指定多个label对。
示例：
	LABEL "com.example.vendor"="ACME Incorporated"
	LABEL com.example.label-with-value="foo"
	LABEL version="1.0"
	LABEL description="This text illustrates \
	that label-values can span multiple lines."
```


### COPY
拷贝功能，类似于ADD，但不可以自动解压文件，且不能访问网络资源
```text
格式：
	COPY [--chown=<user>:<group>] <src>... <dest>
	COPY [--chown=<user>:<group>] ["<src>",... "<dest>"]
描述：
	1）[--chown=<user>:<group>]为可选参数，改变文件的所属者和属组。
	2）目标路径不存在时，会自动创建。
	
示例：
	COPY demo.tar demo01.tar
	COPY --chown=user01:group01 demo.tar demo02.tar
```

### ADD
拷贝功能，类似于COPY，但会自动解压tar等压缩文件

```text
格式：
	ADD <sourceDir1>... <dest>
	ADD ["<sourceDir1>", ... "<targetDir>"]
描述：
	1）用[]，可以支持包含空格的路径。
	2）基本功能和格式同COPY。
示例：
	ADD demo.jar /app.jar
	ADD *.sh /shell
	ADD dir01 relativeDir/
	ADD dir02 /absoluteDir
```

### RUN
执行命令

```text
格式：
	# shell执行
	RUN <command>
	# exec执行
	RUN ["executable", "param1", "param2"]
描述：
	1）Dockerfile的指令每执行一次都会在docker上新建一层，所以尽量合并RUN。
	2）exec执行格式是JSON数组，必须使用双引号描述。
	3）exec格式不调用命令行shell，需要使用shell格式或者路径。如RUN [ "echo", "$HOME" ]不生效，需要使用RUN [ "sh", "-c", "echo $HOME" ]。
示例：
	RUN yum install wget \
		&& tar -xvf demo.tar
		&& chmod -R 777 /shell
	RUN /bin/bash -c 'source $HOME/.bashrc; \
	echo $HOME'
	RUN /bin/bash -c 'source $HOME/.bashrc; echo $HOME'
	RUN ["/bin/bash", "-c", "echo hello"]
```

### CMD
CMD的最主要目的是为一个执行中容器提供默认值。包括可执行文件/程序。
```text
格式：
	# exec form, this is the preferred form
	CMD ["executable","param1","param2"] 
	# shell form
	CMD command param1 param2 
	# as default parameters to ENTRYPOINT
	CMD ["param1","param2"] 
描述：
	1）Dockerfile中若有多个CMD，则只有最后一个CMD有效。
	2）当CMD为ENTRYPOINT提供默认参数时，CMD和ENTRYPOINT都需要以JSON数组格式进行声明。
	3）同ENTRYPOINT，exec格式中CMD [ "echo", "$HOME" ]无效，需要指定sh -c，如使用CMD [ "sh", "-c", "echo $HOME" ]，当然，也可以直接使用shell格式：CMD echo $HOME
	4）与RUN不同，RUN是docker build构建docker镜像时执行的命令，真正运行一个命令并提交运行结果。CMD在build时期不执行任何东西，在docker run执行docker镜像构建容器时，为镜像声明了预期的命令。ENTRYPOINT命令一定会执行，一般用于执行脚本。
示例：
	# exec格式
	CMD ["/usr/bin/wc","--help"]
	
	# shell格式
	CMD echo "This is a test." | wc -
```

### EXPOSE
指定与外界交互的端口。
```text
格式：
	EXPOSE <port> [<port>/<protocol>...]
描述：
	1）默认TCP协议。
	2）EXPOSE不是真正的发布该端口，需要在docker run中使用-p进行发布，如docker run -p 80:80/tcp -p 80:80/udp。
示例：
	EXPOSE 8080
	EXPOSE 10001/tcp 10002/udp
```


### ENTRYPOINT
```text
格式：
	# exec格式
	ENTRYPOINT ["executable", "param1", "param2"]
	# shell格式
	ENTRYPOINT command param1 param2
描述：
	1）shell格式的将会拒绝任何CMD或者run命令行的参数，将以/bin/sh -c开头，只有exec格式的才可以在命令行中使用--entrypoint进行覆盖。
	2）Dockerfile中只有最后一个ENTRYPOINT有效。
	3）同RUN，exec格式中ENTRYPOINT [ "echo", "$HOME" ]无效，需要指定sh -c，如使用ENTRYPOINT [ "sh", "-c", "echo $HOME" ]
示例：
	# exec格式
	ENTRYPOINT ["top", "-b"]
	CMD ["-c"]
	
	# shell格式
	ENTRYPOINT exec top -b
```

### RUN、ENTRYPOINT和CMD区别
```text
RUN是docker build构建docker镜像时执行的命令，真正运行一个命令并提交运行结果。
CMD在docker build时期不执行任何东西，在docker run执行docker镜像构建容器时，为镜像声明了预期的命令。存在多条CMD时，只会执行最后一条，当同时存在ENTRYPOINT时，CMD命令将充当参数（exec格式提供默认值）或者被覆盖。若不存在ENTRYPOINT时，则可以动态覆盖或执行命令。
ENTRYPOINT命令一定会执行，一般用于执行脚本。shell格式的ENTRYPOINT命令，都不会执行在Dockerfile中存在CMD命令还是在docker run添加的命令。exec格式的ENTRYPOINT命令，CMD命令或docker run添加的命令，会被当做ENTRYPOINT命令的参数执行。
```



制作自己的openjdk镜像
```dockerfile
# 基础镜像使用java
FROM openjdk:8u162-jre-slim-stretch
# 作者
MAINTAINER LXzhang666666
#设置用户名 root
USER root
#环境变量
ENV PROJECT_ENV dev
ENV JAVA_OPTS -Xnoagent -Dlogs=logs -Dcache=cache -Xloggc:/logs/gc.log -server -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:InitiatingHeapOccupancyPercent=45 -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=10080
# VOLUME 指定临时文件目录为/tmp，在主机/var/lib/docker目录下创建了一个临时文件并链接到容器的/tmp
VOLUME /tmp
VOLUME /data/apps/project/jar
VOLUME /logs
#工作目录
WORKDIR /

RUN mkdir -p /data/apps/project/jar
RUN mkdir logs && touch logs/gc.log

# 运行jar包
COPY startenv.sh /startenv.sh
RUN chmod +x /startenv.sh
# RUN sh /startenv.sh
# 打印一下默认值
RUN echo 'PROJECT_ENV=' $PROJECT_ENV  
# 打印一下默认值
RUN echo 'JAVA_OPTS=' $JAVA_OPTS
#暴露80端口作为微服务
EXPOSE 80
# 运行jar包
ENTRYPOINT java -Dspring.profiles.active=$PROJECT_ENV $JAVA_OPTS -jar /data/apps/project/jar/*.jar
```
脚本中引用的文件
```shell
#!/bin/sh

export JAVA_OPTS="-Xnoagent -Dlogs=logs -Dcache=cache -Xlog:gc:/data/apps/project/logs/gc.log"
export JAVA_OPTS="$JAVA_OPTS -server -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:InitiatingHeapOccupancyPercent=45"
export JAVA_OPTS="$JAVA_OPTS -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=10080"
```

制作镜像
```shell
docker build -t project .
```
mac
```shell
docker run -d --name my-project -p 18080:8080 --net prod-network --ip 172.18.0.3 -v $PWD/jar/:/data/apps/project/jar -v $PWD/logs/:/logs -v $PWD/tmp/:/tmp --privileged=true -e  PROJECT_ENV=sit project
```
```shell
docker run -d --name collection-java -p 18080:8080 --net prod-network --ip 172.18.0.4 -v $PWD/logs/:/data/apps/collection-java/logs --privileged=true registry.cn-hangzhou.aliyuncs.com/collection_666/collection-java
````

```shell
docker run -d --name collection-security -p 8081:8081 --net prod-network --ip 172.18.40.1 -v $PWD/jar/:/data/apps/collection/security/jar -v $PWD/logs/:/logs -v $PWD/tmp/:/tmp --privileged=true -e  PROJECT_ENV=sit collection-security
```
windows
```shell
docker run -d --name my-project -p 18080:8080 --net prod-network --ip 172.18.0.3 -v $PWD/jar/:/data/apps/project/jar -v $PWD/logs/:/logs -v $PWD/tmp/:/tmp --privileged=true -e  PROJECT_ENV=sit project
```

```shell
docker run -d --name collection-java -p 28080:8080 --net prod-network --ip 172.18.0.4 -v $PWD/logs/:/data/apps/collection-java/logs --privileged=true registry.cn-hangzhou.aliyuncs.com/collection_666/collection-java
````

```shell
docker run -d --name collection-security -p 8081:8081 --net prod-network --ip 172.18.40.1 -v $PWD/jar/:/data/apps/collection/security/jar -v $PWD/logs/:/logs -v $PWD/tmp/:/tmp --privileged=true -e  PROJECT_ENV=sit collection-security
```


### 最近发现两个非常好用的工具，一个是runlike，一个是whaler
runlike：通过容器打印出容器的启动命令
```shell
1.安装python3
https://www.python.org/downloads/

2.pip3 install runlike

3. runlike -p portainer
```
dfimage：通过镜像导出dockerfile
```shell
alias dfimage="docker run -v /var/run/docker.sock:/var/run/docker.sock --rm alpine/dfimage"

dfimage -sV=1.36 nginx:latest 

root@xxxMacBook-Pro data % dfimage -sV=1.36 nginx:latest
Analyzing nginx:latest
Docker Version: 20.10.12
GraphDriver: overlay2
Environment Variables
|PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
|NGINX_VERSION=1.23.1
|NJS_VERSION=0.7.6
|PKG_RELEASE=1~bullseye

Open Ports
|80

Image user
|User is root

Potential secrets:
Dockerfile:
CMD ["bash"]
LABEL maintainer=NGINX Docker Maintainers <docker-maint@nginx.com>
ENV NGINX_VERSION=1.23.1
ENV NJS_VERSION=0.7.6
ENV PKG_RELEASE=1~bullseye
RUN set -x  \
	&& addgroup --system --gid 101 nginx  \
	&& adduser --system --disabled-login --ingroup nginx --no-create-home --home /nonexistent --gecos "nginx user" --shell /bin/false --uid 101 nginx  \
	&& apt-get update  \
	&& apt-get install --no-install-recommends --no-install-suggests -y gnupg1 ca-certificates  \
	&& NGINX_GPGKEY=573BFD6B3D8FBC641079A6ABABF5BD827BD9BF62; found=''; for server in hkp://keyserver.ubuntu.com:80 pgp.mit.edu ; do echo "Fetching GPG key $NGINX_GPGKEY from $server"; apt-key adv --keyserver "$server" --keyserver-options timeout=10 --recv-keys "$NGINX_GPGKEY"  \
	&& found=yes  \
	&& break; done; test -z "$found"  \
	&& echo >&2 "error: failed to fetch GPG key $NGINX_GPGKEY"  \
	&& exit 1; apt-get remove --purge --auto-remove -y gnupg1  \
	&& rm -rf /var/lib/apt/lists/*  \
	&& dpkgArch="$(dpkg --print-architecture)"  \
	&& nginxPackages=" nginx=${NGINX_VERSION}-${PKG_RELEASE} nginx-module-xslt=${NGINX_VERSION}-${PKG_RELEASE} nginx-module-geoip=${NGINX_VERSION}-${PKG_RELEASE} nginx-module-image-filter=${NGINX_VERSION}-${PKG_RELEASE} nginx-module-njs=${NGINX_VERSION}+${NJS_VERSION}-${PKG_RELEASE} "  \
	&& case "$dpkgArch" in amd64|arm64) echo "deb https://nginx.org/packages/mainline/debian/ bullseye nginx" >> /etc/apt/sources.list.d/nginx.list  \
	&& apt-get update ;; *) echo "deb-src https://nginx.org/packages/mainline/debian/ bullseye nginx" >> /etc/apt/sources.list.d/nginx.list  \
	&& tempDir="$(mktemp -d)"  \
	&& chmod 777 "$tempDir"  \
	&& savedAptMark="$(apt-mark showmanual)"  \
	&& apt-get update  \
	&& apt-get build-dep -y $nginxPackages  \
	&& ( cd "$tempDir"  \
	&& DEB_BUILD_OPTIONS="nocheck parallel=$(nproc)" apt-get source --compile $nginxPackages )  \
	&& apt-mark showmanual | xargs apt-mark auto > /dev/null  \
	&& { [ -z "$savedAptMark" ] || apt-mark manual $savedAptMark; }  \
	&& ls -lAFh "$tempDir"  \
	&& ( cd "$tempDir"  \
	&& dpkg-scanpackages . > Packages )  \
	&& grep '^Package: ' "$tempDir/Packages"  \
	&& echo "deb [ trusted=yes ] file://$tempDir ./" > /etc/apt/sources.list.d/temp.list  \
	&& apt-get -o Acquire::GzipIndexes=false update ;; esac  \
	&& apt-get install --no-install-recommends --no-install-suggests -y $nginxPackages gettext-base curl  \
	&& apt-get remove --purge --auto-remove -y  \
	&& rm -rf /var/lib/apt/lists/* /etc/apt/sources.list.d/nginx.list  \
	&& if [ -n "$tempDir" ]; then apt-get purge -y --auto-remove  \
	&& rm -rf "$tempDir" /etc/apt/sources.list.d/temp.list; fi  \
	&& ln -sf /dev/stdout /var/log/nginx/access.log  \
	&& ln -sf /dev/stderr /var/log/nginx/error.log  \
	&& mkdir /docker-entrypoint.d
COPY file:65504f71f5855ca017fb64d502ce873a31b2e0decd75297a8fb0a287f97acf92 in /
	docker-entrypoint.sh

COPY file:0b866ff3fc1ef5b03c4e6c8c513ae014f691fb05d530257dfffd07035c1b75da in /docker-entrypoint.d
	docker-entrypoint.d/
	docker-entrypoint.d/10-listen-on-ipv6-by-default.sh

COPY file:0fd5fca330dcd6a7de297435e32af634f29f7132ed0550d342cad9fd20158258 in /docker-entrypoint.d
	docker-entrypoint.d/
	docker-entrypoint.d/20-envsubst-on-templates.sh

COPY file:09a214a3e07c919af2fb2d7c749ccbc446b8c10eb217366e5a65640ee9edcc25 in /docker-entrypoint.d
	docker-entrypoint.d/
	docker-entrypoint.d/30-tune-worker-processes.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 80
STOPSIGNAL SIGQUIT
CMD ["nginx" "-g" "daemon off;"]
```

> 补充 
> alias 可以查看全量别名
> 删除 alias     unalias dfimage