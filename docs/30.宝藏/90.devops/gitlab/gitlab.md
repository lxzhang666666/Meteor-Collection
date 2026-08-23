---
title: gitlab
date: 2026-08-09 14:56:23
permalink: /pages/263c7e/
categories:
  - 后端
  - Collection
  - gitlab
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# GitLab

## Centos7 安装
1. 安装和配置必须的依赖项 
在 CentOS 7上，下面的命令也会在系统防火墙中打开 HTTP、HTTPS 和 SSH 访问。这是一个可选步骤，如果您打算仅从本地网络访问极狐GitLab，则可以跳过它。
```shell
sudo yum install -y curl policycoreutils-python openssh-server perl
sudo systemctl enable sshd
sudo systemctl start sshd

sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo systemctl reload firewalld
```
2. 下载/安装极狐GitLab
配置极狐GitLab 软件源镜像。

```shell
curl -fsSL https://packages.gitlab.cn/repository/raw/scripts/setup.sh | /bin/bash
```
3. 访问极狐GitLab 实例并登录
```shell
sudo EXTERNAL_URL="https://gitlab.example.com" yum install -y gitlab-jh
```

## windows-Docker 安装
[doc](https://docs.gitlab.cn/jh/install/docker.html) https://docs.gitlab.cn/jh/install/docker.html
```shell
docker run -d --net prod-network --ip 172.18.0.4 --hostname gitlab.example.com -p 10443:443 -p 3080:80 -p 22:22 --name gitlab --restart always --volume E:\data\apps\gitlab/config:/etc/gitlab --volume E:\data\apps\gitlab/logs:/var/log/gitlab --volume E:\data\apps\gitlab/data:/var/opt/gitlab --shm-size 256m registry.gitlab.cn/omnibus/gitlab-jh:latest

PS C:\WINDOWS\system32> docker exec -it gitlab grep 'Password:' /etc/gitlab/initial_root_password
Password: q8m9y4B+uch7SNjjhh137GorbSDI3Ds0OcDkZmmw83o=
```

## mac-Docker 安装
[doc](https://docs.gitlab.cn/jh/install/docker.html) https://docs.gitlab.cn/jh/install/docker.html
```shell
export GITLAB_HOME=/srv/gitlab

sudo docker run --detach \
  --hostname gitlab.example.com \
  --publish 443:443 --publish 80:80 --publish 22:22 \
  --name gitlab \
  --restart always \
  --volume $GITLAB_HOME/config:/etc/gitlab \
  --volume $GITLAB_HOME/logs:/var/log/gitlab \
  --volume $GITLAB_HOME/data:/var/opt/gitlab \
  --shm-size 256m \
  registry.gitlab.cn/omnibus/gitlab-jh:latest
  ```
## 重置密码
```shell
# gitlab-rake "gitlab:password:reset"
Enter username: root
Enter password: 
Confirm password: 
Password successfully updated for user with username root
```

[官网](https://gitlab.cn/) https://gitlab.cn/

