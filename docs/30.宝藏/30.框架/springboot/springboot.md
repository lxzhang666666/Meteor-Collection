---
title: springboot
date: 2026-08-09 14:56:24
permalink: /pages/daa799/
categories:
  - 后端
  - Collection
  - springboot
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# springboot

> Spring Boot是由Pivotal团队提供的全新框架，其设计目的是用来简化新Spring应用的初始搭建以及开发过程。该框架使用了特定的方式来进行配置，从而使开发人员不再需要定义样板化的配置。通过这种方式，Spring
> Boot致力于在蓬勃发展的快速应用开发领域(rapid application development)成为领导者。

## Spring框架

>Spring框架是Java平台上的一种开源应用框架，提供具有控制反转特性的容器。尽管Spring框架自身对编程模型没有限制，但其在Java应用中的频繁使用让它备受青睐，以至于后来让它作为EJB（EnterpriseJavaBeans）模型的补充，甚至是替补。Spring框架为开发提供了一系列的解决方案，比如利用控制反转的核心特性，并通过依赖注入实现控制反转来实现管理对象生命周期容器化，利用面向切面编程进行声明式的事务管理，整合多种持久化技术管理数据访问，提供大量优秀的Web框架方便开发等等。Spring框架具有控制反转（IOC）特性，IOC旨在方便项目维护和测试，它提供了一种通过Java的反射机制对Java对象进行统一的配置和管理的方法。Spring框架利用容器管理对象的生命周期，容器可以通过扫描XML文件或类上特定Java注解来配置对象，开发者可以通过依赖查找或依赖注入来获得对象。Spring框架具有面向切面编程（AOP）框架，SpringAOP框架基于代理模式，同时运行时可配置；AOP框架主要针对模块之间的交叉关注点进行模块化。Spring框架的AOP框架仅提供基本的AOP特性，虽无法与AspectJ框架相比，但通过与AspectJ的集成，也可以满足基本需求。Spring框架下的事务管理、远程访问等功能均可以通过使用SpringAOP技术实现。Spring的事务管理框架为Java平台带来了一种抽象机制，使本地和全局事务以及嵌套事务能够与保存点一起工作，并且几乎可以在Java平台的任何环境中工作。Spring集成多种事务模板，系统可以通过事务模板、XML或Java注解进行事务配置，并且事务框架集成了消息传递和缓存等功能。Spring的数据访问框架解决了开发人员在应用程序中使用数据库时遇到的常见困难。它不仅对Java:
JDBC、iBATS/MyBATIs、Hibernate、Java数据对象（JDO）、ApacheOJB和ApacheCayne等所有流行的数据访问框架中提供支持，同时还可以与Spring的事务管理一起使用，为数据访问提供了灵活的抽象。Spring框架最初是没有打算构建一个自己的WebMVC框架，其开发人员在开发过程中认为现有的StrutsWeb框架的呈现层和请求处理层之间以及请求处理层和模型之间的分离不够，于是创建了SpringMVC。

## 特点

>SpringBoot基于Spring4.0设计，不仅继承了Spring框架原有的优秀特性，而且还通过简化配置来进一步简化了Spring应用的整个搭建和开发过程。另外SpringBoot通过集成大量的框架使得依赖包的版本冲突，以及引用的不稳定性等问题得到了很好的解决。
SpringBoot所具备的特征有：
> 
>（1）可以创建独立的Spring应用程序，并且基于其Maven或Gradle插件，可以创建可执行的JARs和WARs；
> 
>（2）内嵌Tomcat或Jetty等Servlet容器；
> 
>（3）提供自动配置的“starter”项目对象模型（POMS）以简化Maven配置；
> 
>（4）尽可能自动配置Spring容器；
> 
>（5）提供准备好的特性，如指标、健康检查和外部化配置；
> 
>（6）绝对没有代码生成，不需要XML配置。

# 多环境配置

```
#application.yml
spring:
  application:
    name: @artifactId@
  profiles:
    # @env@ 标识 因为 pom.xml中env参数
    active: @env@
```

```
 #pom.xml
 <profiles>
   <profile>
     <id>local</id>
     <activation>
       <activeByDefault>true</activeByDefault>
     </activation>
     <properties>
       <env>local</env>
     </properties>
   </profile>
 </profiles>
 
 <build>
   <!-- 配置资源文件对应的位置 -->
   <resources>
     <resource>
       <directory>src/main/resources</directory>
       <filtering>true</filtering>
    </resource>
   </resources>
 </build>
```

## 问题小记
现象：Failed to decode downloaded font: <URL>
发现页面有些字体图标不显示，或者显示错误时，浏览器就会报上述错误
分析：
第一：检查是否使用maven，如果是，由于maven的filter（拦截），会破坏font文件的二进制文件格式，导致前台解析出错，
所以可以添加以下代码，到pom文件的<project>标签下的<build>标签里面。
```xml
<!--方法1-->
<resources>
    <resource>
        <directory>src/main/resources</directory>
        <filtering>true</filtering>
        <excludes>
            <exclude>**/*.woff</exclude>
            <exclude>**/*.woff2</exclude>
            <exclude>**/*.ttf</exclude>
        </excludes>
    </resource>
 
    <!-- fonts file cannot use filter as the data structure of byte file will be changed via filter -->
    <resource>
        <directory>src/main/resources</directory>
        <filtering>false</filtering>
        <includes>
            <include>**/*.woff</include>
            <include>**/*.woff2</include>
            <include>**/*.ttf</include>
        </includes>
    </resource>
 
    <resource>
        <directory>src/main/java</directory>
        <includes>
            <include>**/*.xml</include>
        </includes>
    </resource>
</resources>
 
 
 
<!--方法2-->
 
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-resources-plugin</artifactId>
    <version>3.1.0</version>
    <configuration>
        <includeEmptyDirs>true</includeEmptyDirs>
        <!-- 不添加此节点，编译时会修改损坏字体的二进制文件 -->
        <resources>
            <resource>
                <directory>src/main/resources</directory>
                <filtering>true</filtering>
                <excludes>
                    <exclude>**/*.woff</exclude>
                    <exclude>**/*.woff2</exclude>
                    <exclude>**/*.ttf</exclude>
                </excludes>
            </resource>
            <resource>
                <directory>src/main/resources</directory>
                <filtering>false</filtering>
                <includes>
                    <include>**/*.woff</include>
                    <include>**/*.woff2</include>
                    <include>**/*.ttf</include>
                </includes>
            </resource>
        </resources>
    </configuration>
</plugin>
 
 
 
<!--方法3-->
 
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-resources-plugin</artifactId>
    <configuration>
        <nonFilteredFileExtensions>
            <nonFilteredFileExtension>ttf</nonFilteredFileExtension>
            <nonFilteredFileExtension>jks</nonFilteredFileExtension>
            <nonFilteredFileExtension>woff</nonFilteredFileExtension>
            <nonFilteredFileExtension>woff2</nonFilteredFileExtension>
        </nonFilteredFileExtensions>
    </configuration>
</plugin>
```
第二：也可能是由于使用了security或者shiro等安全框架，导致静态资源被拦截，这时候可以放行静态资源（这个网上有很多方法，绝对路径放行或者全部放行，你可以根据你的项目具体操作，应该相信不难）。第二步完成之后，大部分项目是可以正常显示了，但如果还有问题，请继续往下看：
第三：到这里，就是巨坑了。是你迁移项目或者下载的时候，前端框架静态资源font文件夹下面的.woff或者.ttf文件损坏了。这时候怎么解决呢？首先如果你有很多静态资源文件，不知道那个错了，不要紧，到浏览器看报错信息，一般都能看到报错的路径。最后你只要去用到的前端框架，重新下载文档，找到font文件夹，替换你项目的这些字体文件（以.woff或者.ttf结尾的文件），建议你换掉整个font文件夹。
