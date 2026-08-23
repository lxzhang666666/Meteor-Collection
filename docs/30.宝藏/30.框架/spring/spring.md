---
title: spring
date: 2026-08-09 14:56:24
permalink: /pages/c3caec/
categories:
  - 后端
  - Collection
  - spring
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# Spring

## spring ioc aop
### Spring IOC原理:
Spring IoC（Inversion of Control，控制反转），它通过将对象的创建和依赖关系的管理交给容器来实现，从而降低了组件之间的耦合度，提高了代码的可维护性和可测试性。

控制反转：依赖对象的获取方式被反转了，从主动创建依赖对象，变成由容器创建并注入依赖对象。

依赖注入：组件之间依赖关系由容器在运行期决定的，即由容器动态地将某个依赖关系注入到组件之中。 
解析自动装配(byname bytype constractor none @Autowired) DI的体现

#### Spring IOC 启动流程

~~~java
@Override
public void refresh() throws BeansException, IllegalStateException {
synchronized (this.startupShutdownMonitor) {
// 1. 准备刷新：记录启动时间、状态标记、环境校验
prepareRefresh();

        // 2. 获取BeanFactory；解析资源，加载所有BeanDefinition
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

        // 3. 对BeanFactory做前置填充、配置
        prepareBeanFactory(beanFactory);

        // 4. 留给子类扩展，模板方法，允许子类修改beanFactory
        postProcessBeanFactory(beanFactory);

        // 5. 执行 BeanFactoryPostProcessor【非常重要，修改BeanDefinition】
        invokeBeanFactoryPostProcessors(beanFactory);

        // 6. 注册 BeanPostProcessor（Bean后置处理器，后面实例化bean时回调）
        registerBeanPostProcessors(beanFactory);

        // 7. 初始化消息源，国际化 i18n
        initMessageSource();

        // 8. 初始化事件广播器 ApplicationEventMulticaster
        initApplicationEventMulticaster();

        // 9. 留给子类扩展，onRefresh，web容器在这里创建tomcat
        onRefresh();

        // 10. 注册事件监听器
        registerListeners();

        // 11. 【核心】实例化所有非懒加载的单例Bean！！
        finishBeanFactoryInitialization(beanFactory);

        // 12. 收尾，发布容器刷新完成事件
        finishRefresh();
    }
}
~~~


#### 精简版

> IOC 容器启动核心是 refresh 方法：

1. 准备刷新环境；获取 BeanFactory，解析配置得到所有 BeanDefinition；
2. 配置 BeanFactory，执行 BeanFactory 后置处理器，解析 @Configuration、@Bean，修改 BeanDefinition 元数据；
3. 注册 Bean 后置处理器；初始化国际化、事件广播器；
4. 钩子扩展；注册事件监听器；
5. 预实例化全部非懒加载单例 Bean，执行实例化、依赖注入、Aware、BeanPostProcessor、初始化方法，处理循环依赖，AOP 代理生成；
6. 发布容器刷新完成事件，容器就绪。
----

BeanDefinitionRegistry 注册表  
Spring 配置文件中每一个节点元素在 Spring 容器里都通过一个 BeanDefinition 对象表示，它描述了 Bean 的配置信息。而 BeanDefinitionRegistry 接口提供了向容器手工注册BeanDefinition 对象的方法。 

BeanFactory 顶层接口  
位于类结构树的顶端 ，它最主要的方法就是 getBean(String beanName)，该方法从容器中返回特定名称的 Bean，BeanFactory 的功能通过其他的接口得到不断扩展。

ListableBeanFactory  
该接口定义了访问容器中 Bean 基本信息的若干方法，如查看 Bean 的个数、获取某一类型Bean 的配置名、查看容器中是否包括某一 Bean 等方法。

HierarchicalBeanFactory  
父子级联 IoC 容器的接口，子容器可以通过接口方法访问父容器； 通过HierarchicalBeanFactory 接口， Spring 的 IoC 容器可以建立父子层级关联的容器体系，子容器可以访问父容器中的 Bean，但父容器不能访问子容器的 Bean。Spring 使用父子容器实
现了很多功能，比如在 Spring MVC 中，展现层 Bean 位于一个子容器中，而业务层和持久层的 Bean 位于父容器中。这样，展现层 Bean 就可以引用业务层和持久层的 Bean，而业务层和持久层的 Bean 则看不到展现层的 Bean。

ConfigurableBeanFactory  
是一个重要的接口，增强了 IoC 容器的可定制性，它定义了设置类装载器、属性编辑器、容器初始化后置处理器等方法。

AutowireCapableBeanFactory 自动装配  
定义了将容器中的 Bean 按某种规则（如按名字匹配、按类型匹配等）进行自动装配的方法。

SingletonBeanRegistry 运行期间注册单例 Bean  
定义了允许在运行期间向容器注册单实例 Bean 的方法；对于单实例（ singleton）的 Bean 来说，BeanFactory 会缓存 Bean 实例，所以第二次使用 getBean() 获取 Bean 时将直接从IoC 容器的缓存中获取 Bean 实例。Spring 在DefaultSingletonBeanRegistry 类中提供了一个用于缓存单实例 Bean 的缓存器，它是一个用 HashMap 实现的缓存器，单实例的 Bean 以beanName 为键保存在这个 HashMap 中。
依赖日志框框
在初始化 BeanFactory 时，必须为其提供一种日志框架，比如使用 Log4J， 即在类路径下提供 Log4J 配置文件，这样启动 Spring 容器才不会报错。
----

### Spring AOP原理:

> 横向切面编程，统一处理日志、事务、权限、异常等横切逻辑，不用侵入业务代码
>

### AOP 核心概念
- 切面Aspect：切面类，存放通知+切入点
- 切入点Pointcut：匹配哪些类/方法执行拦截
- 连接点JoinPoint：被拦截的方法本身
- 通知Advice：拦截后执行的逻辑（前置、后置、异常、最终、环绕）
- 目标对象Target：原始被代理对象
- 代理Proxy：Spring生成的代理对象

AOP两种代理方式
Spring提供了两种方式来生成代理对象: JDKProxy和Cglib，具体使用哪种方式生成由AopProxyFactory根据AdvisedSupport对象的配置来决定。默认的策略是如果目标类是接口，则使用JDK动态代理技术，否则使用Cglib来生成代理。

3.1JDK动态接口代理
JDK 动态代理主要涉及到 java.lang.reflect 包中的两个类：Proxy 和 InvocationHandler。InvocationHandler是一个接口，通过实现该接口定义横切逻辑，并通过反射机制调用目标类的代码，动态将横切逻辑和业务逻辑编制在一起。Proxy 利用 InvocationHandler 动态创建一个符合某一接口的实例，生成目标类的代理对象.

3.2CGLib 动态代理
CGLib 全称为 Code Generation Library，是一个强大的高性能，高质量的代码生成类库，可以在运行期扩展 Java 类与实现 Java 接口，CGLib 封装了 asm，可以再运行期动态生成新的 class。和 JDK 动态代理相比较：JDK 创建代理有一个限制，就是只能为接口创建代理实例，而对于没有通过接口定义业务方法的类，则可以通过 CGLib 创建动态代理。
---
## spring bean 容器的生命周期
spring bean 容器的生命周期流程如下：
1. 实例化阶段
   1. 通过反射区推断构造函数进行实例化
   2. 实例工厂、静态工厂
2. 属性赋值阶段
   1. 解析自动装配(byname bytype constractor none @Autowired) DI的体现
   2. 可能发生循环依赖
3. 初始化阶段
   1. 调用XXXAware回调方法
   2. 如果存在与 bean 关联的任何 BeanPostProcessors，则调用
   postProcessBeforeInitialization() 方法。
   3. 在希望初始化时回调的方法上加@PostConstruct注解 当实例初始化时会调用该方法
   4. 如果实现了 InitalizingBean接口 则会回调afterPropertiesSet()
   5. 如果为 bean 指定了 init 方法（ <bean> 的 init-method 属性），那
   么将调 用它。
   (标红 代表此3个方法为Bean初始化回调的3种方式 执行顺序也是如此 注解、接口、指定)
   6. 最后，如果存在与 bean 关联的任何 BeanPostProcessors，则将调用
   postProcessAfterInitialization() 方法。
   7. 如果bean实现了aop 会创建动态代理
4. 使用阶段
5. 销毁阶段
   1. 在spring关闭时进行调用
   2. 在希望销毁时回调的方法上加@PreDestory注解 当 spring 容器关闭时，会调用该方法
   3. 如果 bean 实现 DisposableBean 接口，当 spring 容器关闭时，会调用
   destory()。
   4. bean 指定了 destroy 方法（ <bean> 的 destroy-method 属
   性），那么将 调用它
   (标红 代表此3个方法为Bean销毁化回调的3种方式 执行顺序也是如此 注解、接口、指定)

## 循环依赖

>
> 什么是循环依赖：A 依赖 B，B 依赖 A。

### 1）哪些情况 Spring 可以解决？哪些解决不了

✅**可以解决：单例 bean，setter / 字段注入（属性注入）**
❌**不能解决：**

1. prototype 作用域 bean，直接抛异常
2. **构造器注入循环依赖，直接报错**
3. 多例、非单例都无法解决

### 2）三级缓存原理

```
一级缓存 singletonObjects：完全初始化完成的完整bean
二级缓存 earlySingletonObjects：已经实例化，还没填充属性的原始bean（未代理）
三级缓存 singletonFactories：ObjectFactory，用来生成原始bean的代理对象
```
流程：A实例化后放入三级缓存，B注入A时从三级获取工厂生成提前代理，放入二级缓存，A完成初始化后移入一级缓存。

流程简述：

1. 创建 A，反射实例化对象（只构造，不赋值），把 lambda 工厂放入三级缓存。
2. A 填充属性，发现需要 B，开始创建 B。
3. B 实例化完成，放入三级缓存；B 填充属性需要 A。
4. 从 A 的三级缓存取出 ObjectFactory，拿到 A 的早期引用（原始对象 / 代理对象）注入 B。
5. B 完成属性填充、初始化，放入一级缓存。
6. A 拿到 B 完成属性填充、初始化，A 移入一级缓存。

>
> 面试追问：为什么需要三级，二级缓存行不行？

- 如果全部 bean 都不需要 AOP 代理，二级缓存就够用。
- 如果存在 AOP 代理对象：早期就要生成代理。三级缓存的 ObjectFactory 做懒代理：**只有别人需要引用这个 bean 的时候，才生成代理对象，避免全部 bean 提前代理，提升性能**。

>
> 关键点：**循环依赖解决的核心是：提前暴露实例化完成，但还没赋值的原始对象引用**。构造器注入做不到，因为构造阶段对象还没创建出来。

>
> SpringBoot2.6+ 默认禁止循环依赖，配置开启：`spring.main.allow‑circular‑references=true`

## Spring的扩展点以及时机

1. BeanDefinitionRegistryPostProcessor
### 执行时机 
ApplicationContext 执行 `refresh()` → `invokeBeanFactoryPostProcessors()` 阶段，**优先级最高**，在所有BeanFactoryPostProcessor之前执行。
### 底层原理 
实现 `BeanDefinitionRegistryPostProcessor` 接口，重写 `postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry)`。 
容器此时已经扫描完所有@Component、@Service、配置类，生成了原始BeanDefinition注册表。
### 核心能力 
1. 手动新增、删除、修改 BeanDefinition 
2. 动态注册自定义类到Spring容器 
3. 动态扫描第三方包（Mybatis MapperScannerConfigurer 底层就是用这个扩展点注册Mapper接口） 
### 使用场景 
Mybatis 自动注册Mapper、动态插件注册、自定义注解扫描注入Bean。

2. BeanFactoryPostProcessor接口
实现BeanFactoryPostProcessor 
并重写postProcessBeanFactory() 
可以在所有BeanDefinition注册完成后做扩展 可以修改所有的bean描述例如 作用域、懒加载方式
### 执行时机 
紧随 BeanDefinitionRegistryPostProcessor 之后，同样在 Bean 实例化**之前**执行。
### 底层原理 
重写 `postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory)` 
### 核心能力 
只能对已经存在的 BeanDefinition 进行修改，**不能新增注册Bean**，修改类名、作用域、属性值、依赖、lazy-init等配置。
### 使用场景 
修改第三方组件Bean的定义、配置属性全局替换、占位符解析（PropertySourcesPlaceholderConfigurer）。

### Spring 扩展点整体执行顺序（精简版）
1. ApplicationContextInitializer
2. BeanDefinitionRegistryPostProcessor（增删BD）
3. BeanFactoryPostProcessor（修改BD）
4. InstantiationAwareBeanPostProcessor 实例化前置
5. 反射实例化 → 属性DI注入
6. XXXAware 感知接口回调
7. BeanPostProcessor beforeInitialization
8. @PostConstruct → InitializingBean → init-method
9. BeanPostProcessor afterInitialization（AOP代理）
10. SmartInitializingSingleton（所有单例Bean完成后）
11. ApplicationListener 容器刷新事件
12. SmartLifecycle 启动服务
13. 容器关闭执行销毁方法
----
## spring bean 是线程安全的吗
spring bean 默认是单例bean 不是线程安全的    
如何解决     
1. 可以设置spring bean的作用域为原型模式 prototype
2. 不改变bean作用域的装态下 可以避免bean中存在可变装态的声明
3. 使用并发编程的数据结构 或者加锁修饰可变装态

## Bean 的作用域

| 作用域 | 说明 |
| --- | --- |
| singleton【默认】 | 整个容器只 1 个实例，容器启动创建 |
| prototype | 每次 getBean 新建对象，容器不管理销毁 |
| request | web 环境，一次 http 请求一个实例 |
| session | web 环境，一次会话一个实例 |
| application | web 环境，ServletContext 级别 |

>
> 面试坑：prototype 的 bean，容器关闭**不会执行销毁方法**，容器不维护 prototype 生命周期。

>
> 高频坑：单例 bean 里面注入 prototype bean，会永远只有一份 prototype。
> 解决方案：`@Lookup`，每次获取新实例。

## Spring ⾥⽤到了哪些设计模式?

1. 单例模式 ：Spring 中的 Bean 默认情况下都是单例的。⽆需多说。
2. ⼯⼚模式 ：⼯⼚模式主要是通过 BeanFactory 和 ApplicationContext 来⽣产 Bean 对象。
3. 代理模式 ：最常⻅的 AOP 的实现⽅式就是通过代理来实现，Spring主要是使⽤ JDK 动态代理和 CGLIB代理。
4. 模板⽅法模式 ：主要是⼀些对数据库操作的类⽤到，⽐如 JdbcTemplate、JpaTemplate，因为查询数据库的建⽴连接、执⾏查询、关闭连接⼏个过程，⾮常适⽤于模板⽅法。
5. 策略模式：干掉if else，动态切换算法规则
6. 观察者：发布订阅，Spring事件机制底层
7. 责任链：过滤器、审批流程链式传递请求
8. 外观模式：封装复杂系统，对外提供简单入口
9. 享元模式：池化共享对象，节省内存
10. 状态模式：状态机流转，解决大量分支判断


## Spring MVC 的执行流程
1. 用户发送请求至前端控制器 DispatcherServlet。 
2. DispatcherServlet 收到请求调用 HandlerMapping 处理器映射器。
3. 处理器映射器找到具体的处理器（可以根据 xml 配置、注解进行查找），生成处理器对象及
处理器、拦截器（如果有则生成）一并返回给 DispatcherServlet。
4. DispatcherServlet 调用 HandlerAdapter 处理器适配器。
5. HandlerAdapter 经过适配调用具体的处理器（Controller，也叫后端控制器）。
6. Controller 执行完成返回 ModelAndView。
7. HandlerAdapter 将 controller 执行结果 ModelAndView 返回给 DispatcherServlet。
8. DispatcherServlet 将 ModelAndView 传给 ViewReslover 视图解析器。
9. ViewReslover 解析后返回具体 View。
10. DispatcherServlet 根据 View 进行渲染视图（即将模型数据填充至视图中）。
11. DispatcherServlet 响应用户。

## 服务设计CAP
CAP，C(consistency)是指强一致性，A(availability)是指可用性，P(partition-tolerance)是指分区容错性。

## Eureka 和 zookeper 作为注册中心的区别
Eureka 和 Zookeeper 都是常用的服务注册与发现组件，但它们有一些主要区别：
1. 架构差异：Eureka 是基于 AP（可用性和分区容忍度）原则的分布式系统，Zookeeper 是基于 CP（一致性和分区容忍度）
原则的分布式系统。这意味着Eureka可以在某种程度上容忍节点故障，
而Zookeeper在网络分区时的一致性更高。zookeper使用的主从，主节点挂了以后，从节点切换成主节点，问题就出在这里，那就是选举的时间有点长。 
而Eureka 配置的集群，只要有一个存在，就可以正常的提供服务。
2. 选举机制：Eureka 使用快速失败机制，而 Zookeeper 使用领导者选举机制。
3. 节点故障处理：Eureka 有内置的保护机制避免节点失效，Zookeeper 需要额外的监控机制。
4. 使用场景：Eureka 主要在微服务架构中作为服务注册中心，Zookeeper 除了服务注册发现外，还常用于分布式锁、集群管理等。
5. 数据模型：Eureka 使用平面模型，Zookeeper 使用层次模型。
6. 性能：在大规模部署时，Zookeeper 的性能可能会下降，因为它使用了领导者选举机制。
7. 时效性问题：根据Eureka的机制，一个服务从上线，完成注册，到消费端能够使用，如果不调参数的话，需要花费一分钟的时间。
这源于Eureka的多级缓存，整体是采用一个被动更新的方式来更新注册表数据的。也就是说如果时效性要求比较高的话，确实是有问题的，我们要考虑，如果注册的服务挂了，一分种才能发现。难道这一分钟都去报错吗？还是要处理。 而zk是使用主动推送的方式更新注册的服务的。一旦有服务注册过来，就主动更新注册表到客户端。
