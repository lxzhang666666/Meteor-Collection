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
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---
# Spring

## spring ioc aop
### Spring IOC原理:
Spring IoC（Inversion of Control，控制反转），它通过将对象的创建和依赖关系的管理交给容器来实现，从而降低了组件之间的耦合度，提高了代码的可维护性和可测试性。

控制反转：依赖对象的获取方式被反转了，从主动创建依赖对象，变成由容器创建并注入依赖对象。

依赖注入：组件之间依赖关系由容器在运行期决定的，即由容器动态地将某个依赖关系注入到组件之中。

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

### Spring AOP原理:
AOP两种代理方式
Spring提供了两种方式来生成代理对象: JDKProxy和Cglib，具体使用哪种方式生成由AopProxyFactory根据AdvisedSupport对象的配置来决定。默认的策略是如果目标类是接口，则使用JDK动态代理技术，否则使用Cglib来生成代理。

3.1JDK动态接口代理
JDK 动态代理主要涉及到 java.lang.reflect 包中的两个类：Proxy 和 InvocationHandler。InvocationHandler是一个接口，通过实现该接口定义横切逻辑，并通过反射机制调用目标类的代码，动态将横切逻辑和业务逻辑编制在一起。Proxy 利用 InvocationHandler 动态创建一个符合某一接口的实例，生成目标类的代理对象.

3.2CGLib 动态代理
CGLib 全称为 Code Generation Library，是一个强大的高性能，高质量的代码生成类库，可以在运行期扩展 Java 类与实现 Java 接口，CGLib 封装了 asm，可以再运行期动态生成新的 class。和 JDK 动态代理相比较：JDK 创建代理有一个限制，就是只能为接口创建代理实例，而对于没有通过接口定义业务方法的类，则可以通过 CGLib 创建动态代理。


## Spring ⾥⽤到了哪些设计模式?

1. 单例模式 ：Spring 中的 Bean 默认情况下都是单例的。⽆需多说。 
2. ⼯⼚模式 ：⼯⼚模式主要是通过 BeanFactory 和 ApplicationContext 来⽣产 Bean 对象。 
3. 代理模式 ：最常⻅的 AOP 的实现⽅式就是通过代理来实现，Spring主要是使⽤ JDK 动态代理和 CGLIB代理。
4. 模板⽅法模式 ：主要是⼀些对数据库操作的类⽤到，⽐如 JdbcTemplate、JpaTemplate，因为查询数据库的建⽴连接、执⾏查询、关闭连接⼏个过程，⾮常适⽤于模板⽅法。

## spring bean 容器的生命周期
spring bean 容器的生命周期流程如下：
1. Spring 容器根据配置中的 bean 定义中实例化 bean。
2. Spring 使用依赖注入填充所有属性，如 bean 中所定义的配置。
3. 如果 bean 实现 BeanNameAware 接口，则工厂通过传递 bean 的 ID 来
调用 setBeanName()。
4. 如果 bean 实现 BeanFactoryAware 接口，工厂通过传递自身的实例来调
用 setBeanFactory()。
5. 如果存在与 bean 关联的任何 BeanPostProcessors，则调用
postProcessBeforeInitialization() 方法。
6. 如果为 bean 指定了 init 方法（ <bean> 的 init-method 属性），那
么将调 用它。
7. 最后，如果存在与 bean 关联的任何 BeanPostProcessors，则将调用
postProcessAfterInitialization() 方法。
8. 如果 bean 实现 DisposableBean 接口，当 spring 容器关闭时，会调用
destory()。
9. 如果为 bean 指定了 destroy 方法（ <bean> 的 destroy-method 属
性），那么将 调用它。

## spring bean 是线程安全的吗
spring bean 默认是单例bean 不是线程安全的    
如何解决     
1. 可以设置spring bean的作用域为原型模式 prototype
2. 不改变bean作用域的装态下 可以避免bean中存在可变装态的声明
3. 使用并发编程的数据结构 或者加锁修饰可变装态


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
