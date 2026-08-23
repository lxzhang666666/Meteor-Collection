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
   13. 关闭时触发 JVM 钩子，执行 Bean 销毁、关闭 Web 容器优雅停机。

>
> 面试重点：SpringBoot 只是对 Spring 做封装，核心容器还是 Spring 的 refresh ()。

1.先执行new SpringApplication()构造器：推断 Web 类型、从 spring.factories SPI 加载初始化器和监听器；
2.进入 run () 方法，先启动运行监听器发布启动事件；
3.加载所有层级 yml/properties 配置文件，准备 Environment 环境；
4.根据 Web 类型创建对应的 ApplicationContext IoC 容器；
5.预处理上下文，执行 ApplicationContextInitializer 扩展点，加载主启动类做包扫描；
6.核心调用 Spring 原生 refresh () 方法：执行自动配置、实例化全部 Bean、生成 AOP 代理、启动内嵌 Tomcat；
7.执行 ApplicationRunner 和 CommandLineRunner 后置初始化任务；
8.发布 ApplicationReadyEvent 就绪事件，SpringBoot 项目启动完成；
9.关闭时触发 JVM 钩子，执行 Bean 销毁、关闭 Web 容器优雅停机。

### refresh() SpringIOC 启动流程

##### 1. prepareRefresh() 刷新前准备

1. 标记容器启动状态、设置关闭标志为 false、激活状态为 active
2. 初始化上下文环境变量、加载占位符资源、记录启动开始时间
3. 执行 `ApplicationListeners` 监听器发布 `ApplicationStartingEvent` 启动事件

##### 2. obtainFreshBeanFactory() 获取新鲜BeanFactory

1. 销毁旧的 BeanFactory（如果存在），新建 `DefaultListableBeanFactory`
2. 给 BeanFactory 设置序列化ID，返回全新空的 BeanFactory 工厂对象 作用：创建底层核心工厂，后续所有BeanDefinition都注册到这个工厂里。

##### 3. prepareBeanFactory(beanFactory) 配置BeanFactory基础属性

1. 设置类加载器、表达式解析器、属性编辑器
2. 注册内置依赖Bean：`Environment`、`SystemProperties`、`SystemEnvironment`，可以直接@Autowired注入
3. 添加后置处理器 `ApplicationContextAwareProcessor`（用来回调各种XXXAware感知接口）
4. 设置忽略自动装配的接口（Aware系列由容器手动注入，不参与DI）
5. 开启 SpEL 表达式解析、属性注册

##### 4. postProcessBeanFactory(beanFactory) BeanFactory后置处理空钩子

模板方法，留给子类扩展：

- Web容器子类会在这里注册 ServletContext、ServletConfig 等web专属作用域
- 普通AnnotationConfigApplicationContext无默认实现，开发者可重写做自定义BD修改

##### 5. invokeBeanFactoryPostProcessors(beanFactory) 执行BeanFactory后置处理器【极高频考点】

###### 执行顺序严格分层：

1. 先执行 **BeanDefinitionRegistryPostProcessor**（子接口）

- 可以调用 `registry.registerBeanDefinition()` **新增、删除、修改BeanDefinition**
- 经典实现：Mybatis MapperScannerConfigurer 注册Mapper接口

2. 再执行父接口 **BeanFactoryPostProcessor**

- 只能修改已经存在的BeanDefinition，不能新增Bean
- 经典实现：PropertySourcesPlaceholderConfigurer 解析yml/properties占位符 `${}`
  **关键节点**：到此为止，**所有BeanDefinition元数据全部定型，后续不再新增BD**，只开始实例化对象。

##### 6. registerBeanPostProcessors(beanFactory) 注册Bean后置处理器

1. 从BeanFactory中找到所有实现 `BeanPostProcessor` 接口的类
2. 按优先级排序：PriorityOrdered → Ordered → 普通BeanPostProcessor
3. 注册进BeanFactory的 `beanPostProcessors` 集合中
   **核心后置处理器在这里注册**：

- AutowiredAnnotationBeanPostProcessor：解析@Autowired、@Value注入 -
  CommonAnnotationBeanPostProcessor：解析@PostConstruct、@PreDestroy、@Resource
- AnnotationAwareAspectJAutoProxyCreator：AOP自动代理创建器

##### 7. initMessageSource() 初始化国际化资源

加载 message.properties 国际化配置文件，做多语言支持，日常业务极少用到。

##### 8. initApplicationEventMulticaster() 初始化事件广播器

创建事件派发器 `SimpleApplicationEventMulticaster`，用于发布容器生命周期事件：
容器刷新完成、启动完成、关闭事件都由它通知所有 `ApplicationListener`。

##### 9. onRefresh() 模板钩子，子类重写创建Web服务器

- SpringMVC上下文 `ServletWebServerApplicationContext` 在这里**创建内嵌Tomcat/Jetty/Undertow**
- 非Web环境空实现

##### 10. registerListeners() 注册并启动监听器

1. 把容器内所有 `ApplicationListener` 监听器注册到事件广播器
2. 发布 `ApplicationStartedEvent` 容器已启动事件

##### 11. finishBeanFactoryInitialization(beanFactory) 实例化所有非懒加载单例Bean【最核心步骤】

调用 `beanFactory.preInstantiateSingletons()`，**循环创建所有单例Bean**，也就是我们常说的完整Bean生命周期全部在这里执行。
内部逻辑：

1. 获取所有BeanDefinition名称，过滤掉抽象类、多例、懒加载Bean
2. 循环调用 `getBean(beanName)` 实例化
3. 全部单例Bean创建完成后，遍历执行 `SmartInitializingSingleton` 接口回调 > 重点：SmartInitializingSingleton =
   所有Bean就绪后统一执行，比如扫描自定义注解、注册策略工厂

##### 12. finishRefresh() 容器收尾工作

1. 初始化生命周期处理器 `LifecycleProcessor`，执行 `SmartLifecycle.start()` 启动定时任务、中间件连接池、内嵌Web服务
2. 发布 `ApplicationReadyEvent` 事件，代表项目完全就绪，可以接收请求
3. 清除上下文缓存、设置容器刷新完成标志

##### refresh()

异常兜底方法 `registerShutdownHook()` 注册JVM关闭钩子，JVM退出时自动调用 `close()` 执行Bean销毁流程。

---

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

@Bean方法的类加@Configuration时  
当前类是由spring创建的cglib动态代理类这时  
@Bean方法 如果 去调用其他@Bean方法 会走代理增强方法 直接从容器中找已经存在的bean

@Bean方法的类不加 @Configuration时  
当前类不是cglib动态代理类这时@Bean方法   
如果 再去调用其他@Bean方法 则不会去容器中查询所需的bean是否存在 而且直接创建 这样破坏了单例性

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