---
title: maven 脚手架
date: 2026-08-09 14:56:23
permalink: /pages/0a6ff8/
categories:
  - 后端
  - Collection
  - maven
tags:
  - 
author: 
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---
## MAVEN 脚手架

### 准备

https://blog.csdn.net/qq_35448165/article/details/103721481?utm_medium=distribute.pc_relevant.none-task-blog-2~default~baidujs_baidulandingword~default-0.no_search_link&spm=1001.2101.3001.4242s

https://blog.csdn.net/wowwilliam0/article/details/107091858/


####  步骤1
在现有项目根路径下执行maven命令：

mvn archetype:create-from-project

目录结构如下:

.
├── main
│   ├── java
│   └── resources
│       ├── archetype-resources
│       │   ├── README.md
│       │   ├── __rootArtifactId__-api
│       │   │   └── pom.xml
│       │   ├── __rootArtifactId__-biz
│       │   │   ├── pom.xml
│       │   │   └── src
│       │   │       └── main
│       │   │           ├── java
│       │   │           │   └── paradise
│       │   │           │       └── app
│       │   │           └── resources
│       │   │               └── mapper
│       │   ├── __rootArtifactId__-boot
│       │   │   ├── pom.xml
│       │   │   └── src
│       │   │       └── main
│       │   │           ├── java
│       │   │           │   └── paradise
│       │   │           │       └── app
│       │   │           │           ├── IpParadiseAppApplication.java
│       │   │           │           ├── config
│       │   │           │           └── controller
│       │   │           └── resources
│       │   │               ├── application-local.properties
│       │   │               ├── application-pre.properties
│       │   │               ├── application-prod.properties
│       │   │               ├── application-uat.properties
│       │   │               ├── application.yml
│       │   │               └── banner.txt
│       │   ├── __rootArtifactId__-client
│       │   │   ├── pom.xml
│       │   │   └── src
│       │   │       └── main
│       │   │           └── java
│       │   │               └── paradise
│       │   │                   └── app
│       │   │                       └── wx
│       │   │                           └── response
│       │   └── pom.xml
│       └── maven
│           └── archetype-metadata.xml
└── test
    └── resource
        └── projects.basic
            ├── archetype.properties
            └── goal.txt

34 directories, 16 files




## /src/main/resources/META-INF/maven/archetype-metadata.xml
archetype-metadata.xml 可以自定义属性

    <!--属性变量定义-->
    <requiredProperties>
    <requiredProperty key="beanName">
      <defaultValue>Archetype</defaultValue>
    </requiredProperty>
    <requiredProperty key="dir">
      <defaultValue>archetype</defaultValue>
    </requiredProperty>
    </requiredProperties>


## /target/generated-sources/archetype/src/test/resources/projects/basic/archetype.properties
archetype.properties 自定义属性需要在此文件配置

mvn clean install

mvn archetype:crawl


## ==此处注意 mvn deploy 只读取本地setting.xml中的server==
mvn install --settings c:\user\settings.xml
固将

     <server>
      <id>xcan-maven-snapshot</id>
      <username>***</username>
      <password>***</password>
    </server>
    
放入setting.xml中

mvn deploy

## 生成 archetype-catalog.xml

    <archetype>
      <groupId>com.longfor.ip</groupId>
      <artifactId>longfor-ip-archetype</artifactId>
      <version>0.1.0-SNAPSHOT</version>
      <description>Provide unified sending and receiving ArchetypeProxy service.</description>
    </archetype>
    
    
    
archetypeCatalog用来指定maven-archetype-plugin读取archetype-catalog.xml文件的位置：

internal——maven-archetype-plugin内置的
local——本地的，位置为~/.m2/archetype-catalog.xml
remote——指向Maven中央仓库的Catalog


sdf-archetype  5