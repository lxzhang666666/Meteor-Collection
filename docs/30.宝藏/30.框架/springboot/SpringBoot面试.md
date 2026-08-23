---
title: SpringBoot 面试相关
date: 2026-08-09 14:56:24
permalink: /pages/875acf/
categories:
  - 后端
  - Collection
  - SpringBoot面试
tags: []
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---

# SpringBoot面试

## 什么是 SpringBoot？解决了什么问题

SpringBoot 不是替代 Spring，是**Spring 的快速开发脚手架**。
解决痛点：

1. 繁琐的 XML 配置，大量样板配置
2. 复杂依赖版本管理，版本冲突
3. 需要手动部署 Tomcat 容器
4. 项目整合第三方组件大量配置

核心特性：**自动配置、起步依赖、内嵌 web 容器、可执行 jar、Actuator 监控**。

## SpringBoot自动装配

~~~text
SpringApplication.run()
        ↓
创建ApplicationContext
        ↓
刷新容器 refresh()
        ↓
ConfigurationClassPostProcessor(解析配置类)
        ↓
处理 @SpringBootApplication
        ↓
解析 @EnanleAutoConfiguration
        ↓
@Import(AutoConfigurationImportSelector.class)
        ↓
AutoConfigurationImportSelector.selectImports()
        ↓
SpringFactoriesLoader.loadFactoryNames()
        ↓
扫描所有 META-INF/spring.factories(2.7兼容两套机制;3.X 后面优化了路径为
resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports并且不再兼容)
        ↓
获取所有自动装配类全类名列表
        ↓
应用 @Conditional 条件注解进行过滤
        ↓
过滤出符合条件的类 并且该类中的 @Bean方法被执行
        ↓
Bean 注册到 Spring容器中
~~~~

## SpringBoot 启动完整流程

```java
SpringApplication.run(Application.class, args);
```

1. 初始化 SpringApplication 对象
    - 推断应用类型（SERVLET / REACTIVE）
    - 加载`META‑INF/spring.factories`，获取`ApplicationContextInitializer`、`ApplicationListener`
    - 推断主启动类
2. run () 方法
    1. 创建并启动计时器
    2. 获取 SpringApplicationRunListeners，发布 starting 启动事件
    3. 准备环境 Environment，加载外部配置、profile
    4. 发布 environmentPrepared 事件
    5. 创建 ApplicationContext 容器（根据 web 类型选择容器实现）
    6. 执行 ApplicationContextInitializer 初始化容器
    7. 发布 contextPrepared 事件
    8. 加载资源到容器
    9. 发布 contextLoaded 事件
    10. **调用 refresh ()，执行 Spring IOC 完整启动流程**
    11. refresh 完成后执行 callRunners：执行 ApplicationRunner、CommandLineRunner
    12. 发布 started 事件；应用运行完成发布 running 事件。

>
> 面试重点：SpringBoot 只是对 Spring 做封装，核心容器还是 Spring 的 refresh ()。

## 自定义starter

1. 创建两个模块：
    - xxx‑spring‑boot‑autoconfigure：存放自动配置类，写条件注解
    - xxx‑spring‑boot‑starter：pom，依赖 autoconfigure 模块，对外提供坐标
2. autoconfigure 模块中编写自动配置类，加上`@Configuration`、`@ConditionalOnClass`、`@ConditionalOnMissingBean`
3. Boot2：在 autoconfigure 的资源目录新建 `META‑INF/spring.factories`，填入 EnableAutoConfiguration 的 key 和你的配置类。
   Boot3：新建`META‑INF/spring/org.springframework.boot.autoconfigure.imports`写入配置类全类名。
4. 打包；其他项目引入 starter，即可自动装配。

## @Compoent 和 @Bean 的区别
1. 使用方式不同 @Compoent加到类上 spring通过反射使用无参构造创建对象
@Bean在方法上 通常会和@Configuration使用  由用户自己创建实例
2. @Bean可以创建第三方jar内的对象

## 全局异常处理

1. `@RestControllerAdvice + @ExceptionHandler` 全局捕获 controller 异常
2. ErrorPage 自动错误页面；/error 默认错误接口。

## SpringBoot 配置加载优先级（从高到低）
1. 命令行启动参数 java -jar xxx.jar --server.port=8081
2. 操作系统环境变量
3. jar包外部file:./config/下配置文件
4. jar包外部file:./ 下配置文件
5. jar内部resources/config/
6. jar内部resources/
7. 默认配置类内部@PropertySource

## SpringBoot3 新特性
1. 最低 JDK17+，Jakarta EE，包名从`javax.*` → `jakarta.*`
>
> 大坑：老的 javax 的依赖全部不能直接用，需要升级版本。
2. 自动配置文件变更：废弃 spring.factories，使用 `META‑INF/spring/org.springframework.boot.autoconfigure.imports`
3. 虚拟线程支持
4. AOT 编译，原生镜像 native image，GraalVM，启动速度极快，无 JVM 预热。
5. 默认代理策略变更：AOP 默认 CGLIB，不再优先 JDK 动态代理。