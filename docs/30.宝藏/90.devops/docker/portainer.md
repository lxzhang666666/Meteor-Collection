---
title: portainer
date: 2026-08-09 14:56:23
permalink: /pages/e3275c/
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
# portainer

## 安装 升级portainer/portainer-ce

```shell
--查询
docker search portainer
NAME                                   DESCRIPTION                                     STARS     OFFICIAL   AUTOMATED
portainer/portainer                    This Repo is now deprecated, use portainer/p…   2264                 
portainer/portainer-ce                 Portainer CE - a lightweight service deliver…   1357   

docker pull portainer/portainer-ce

docker images
portainer/portainer-ce                 latest     500504ac663a   3 days ago      285MB

docker run \
	--name=portainer \
	--volume=/var/run/docker.sock:/var/run/docker.sock \
	--volume=/Users/zhangbao/data/apps/portainer/data:/data \
	--volume=/Users/zhangbao/data/apps/portainer/public:/public \
	--workdir=/ \
	-p 8000:8000 \
	-p 9000:9000 \
	-p 9443:9443 \
	--restart=always \
	portainer/portainer-ce
	
	
docker run -d `
	--name=portainer `
	--volume=/var/run/docker.sock:/var/run/docker.sock `
	--volume=E:\data\apps\portainer\data:/data `
	--volume=E:\data\apps\portainer\public:/public `
	--workdir=/ `
	-p 8000:8000 `
	-p 9000:9000 `
	-p 9443:9443 `
	--restart=always `
	portainer/portainer-ce
```

汉化方式

[汉化文件](../../assets/docker/portainer/public.zip)
解压到 自定义的public目录下
并加入参数
```shell
 -v E:\data\apps\portainer\public:/public 
```


## portainer忘记密码
1. docker stop ${portainerid}
2. docker inspect  ${portainerid}

![img.png](../../assets/docker/img.png)
   "Source": "/XXX/xx/data/apps/portainer/data",
3.  docker run --rm -v /XXX/xx/data/apps/portainer/data:/data portainer/helper-reset-password



