# logback

> logback是java的日志开源组件，是log4j创始人写的，性能比log4j要好，目前主要分为3个模块
> 
> 1.logback-core:核心代码模块
> 
> 2.logback-classic:log4j的一个改良版本，同时实现了slf4j的接口，这样你如果之后要切换其他日志组件也是一件很容易的事
> 
> 3.logback-access:访问模块与Servlet容器集成提供通过Http来访问日志的功能

## 引入maven依赖

~~~
<!--这个依赖直接包含了 logback-core 以及 slf4j-api的依赖-->
<dependency>
     <groupId>ch.qos.logback</groupId>
     <artifactId>logback-classic</artifactId>
     <version>1.2.3</version>
</dependency>
~~~

## logback的配置

~~~
logback在启动的时候，会按照下面的顺序加载配置文件

如果java程序启动时指定了logback.configurationFile属性，就用该属性指定的配置文件。如java -Dlogback.configurationFile=/path/to/mylogback.xml Test ，这样执行Test类的时候就会加载/path/to/mylogback.xml配置
在classpath中查找 logback.groovy 文件
在classpath中查找 logback-test.xml 文件
在classpath中查找 logback.xml 文件
如果是 jdk6+,那么会调用ServiceLoader 查找 com.qos.logback.classic.spi.Configurator接口的第一个实现类
自动使用ch.qos.logback.classic.BasicConfigurator,在控制台输出日志
上面的顺序表示优先级，使用java -D配置的优先级最高，只要获取到配置后就不会再执行下面的流程。相关代码可以看ContextInitializer#autoConfig()方法。
~~~

## SLF4j的日志输出级别

~~~
在slf4j中，从小到大的日志级别依旧是trace、debug、info、warn、error
~~~

## logback.xml 配置样例

~~~
<?xml version="1.0" encoding="UTF-8"?>
<configuration debug="true" scan="true" scanPeriod="1 seconds">

    <contextName>logback</contextName>
    <!--定义参数,后面可以通过${app.name}使用-->
    <property name="app.name" value="logback_test"/>
    <!--ConsoleAppender 用于在屏幕上输出日志-->
    <appender name="stdout" class="ch.qos.logback.core.ConsoleAppender">
        <!--定义了一个过滤器,在LEVEL之下的日志输出不会被打印出来-->
        <!--这里定义了DEBUG，也就是控制台不会输出比ERROR级别小的日志-->
        <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
            <level>DEBUG</level>
        </filter>
        <!-- encoder 默认配置为PatternLayoutEncoder -->
        <!--定义控制台输出格式-->
        <encoder>
            <pattern>%d [%thread] %-5level %logger{36} [%file : %line] - %msg%n</pattern>
        </encoder>
    </appender>

    <appender name="file" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <!--定义日志输出的路径-->
        <!--这里的scheduler.manager.server.home 没有在上面的配置中设定，所以会使用java启动时配置的值-->
        <!--比如通过 java -Dscheduler.manager.server.home=/path/to XXXX 配置该属性-->
        <file>${scheduler.manager.server.home}/logs/${app.name}.log</file>
        <!--定义日志滚动的策略-->
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <!--定义文件滚动时的文件名的格式-->
            <fileNamePattern>${scheduler.manager.server.home}/logs/${app.name}.%d{yyyy-MM-dd.HH}.log.gz
            </fileNamePattern>
            <!--60天的时间周期，日志量最大20GB-->
            <maxHistory>60</maxHistory>
            <!-- 该属性在 1.1.6版本后 才开始支持-->
            <totalSizeCap>20GB</totalSizeCap>
        </rollingPolicy>
        <triggeringPolicy class="ch.qos.logback.core.rolling.SizeBasedTriggeringPolicy">
            <!--每个日志文件最大100MB-->
            <maxFileSize>100MB</maxFileSize>
        </triggeringPolicy>
        <!--定义输出格式-->
        <encoder>
            <pattern>%d [%thread] %-5level %logger{36} [%file : %line] - %msg%n</pattern>
        </encoder>
    </appender>

    <!--root是默认的logger 这里设定输出级别是debug-->
    <root level="trace">
        <!--定义了两个appender，日志会通过往这两个appender里面写-->
        <appender-ref ref="stdout"/>
        <appender-ref ref="file"/>
    </root>

    <!--对于类路径以 com.example.logback 开头的Logger,输出级别设置为warn,并且只输出到控制台-->
    <!--这个logger没有指定appender，它会继承root节点中定义的那些appender-->
    <logger name="com.example.logback" level="warn"/>

    <!--通过 LoggerFactory.getLogger("mytest") 可以获取到这个logger-->
    <!--由于这个logger自动继承了root的appender，root中已经有stdout的appender了，自己这边又引入了stdout的appender-->
    <!--如果没有设置 additivity="false" ,就会导致一条日志在控制台输出两次的情况-->
    <!--additivity表示要不要使用rootLogger配置的appender进行输出-->
    <logger name="bizLog" level="info" additivity="false">
        <appender-ref ref="stdout"/>
    </logger>
  
    <!--由于设置了 additivity="false" ，所以输出时不会使用rootLogger的appender-->
    <!--但是这个logger本身又没有配置appender，所以使用这个logger输出日志的话就不会输出到任何地方-->
    <logger name="bizLog-no" level="info" additivity="false"/>
</configuration>
~~~

### 配置详解

#### configuration节点相关属性

| 属性名称| 默认值 | 介绍|
| --- | --- | --- |
|debug|false|要不要打印 logback内部日志信息，true则表示要打印。建议开启|
|scan|true|配置发送改变时，要不要重新加载|
|scanPeriod|1 seconds|检测配置发生变化的时间间隔。如果没给出时间单位，默认时间单位是毫秒|

### configuration子节点介绍

1. contextName节点
   设置日志上下文名称，后面输出格式中可以通过定义 %contextName 来打印日志上下文名称

2. property节点
用来设置相关变量,通过key-value的方式配置，然后在后面的配置文件中通过 ${key}来访问

3. appender 节点
日志输出组件，主要负责日志的输出以及格式化日志。常用的属性有name和class


| 属性名称| 默认值 | 介绍|
| --- | --- | --- |
|name	|无默认值|	appender组件的名称，后面给logger指定appender使用|
|class|	无默认值|	appender的具体实现类。常用的有 ConsoleAppender、FileAppender、RollingFileAppender|

ConsoleAppender：向控制台输出日志内容的组件，只要定义好encoder节点就可以使用。

FileAppender：向文件输出日志内容的组件，用法也很简单，不过由于没有日志滚动策略，一般很少使用

RollingFileAppender：向文件输出日志内容的组件，同时可以配置日志文件滚动策略，在日志达到一定条件后生成一个新的日志文件。

appender节点中有一个子节点filter，配置具体的过滤器，比如上面的例子配置了一个内置的过滤器ThresholdFilter，然后设置了level的值为DEBUG。这样用这个appender输出日志的时候都会经过这个过滤器，日志级别低于DEBUG的都不会输出来。

在RollingFileAppender中，可以配置相关的滚动策略，具体可以看配置样例的注释。

> https://logback.qos.ch/manual/configuration.html

## 结合lombok Slf4j

@Slf4j(topic = "bizLog")


