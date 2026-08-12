---
title: Spring AOP 源码深度解析
date: 2026-08-09 14:56:24
permalink: /pages/8cc949/
categories:
  - 后端
  - Collection
tags: []
author: 
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---

# Spring AOP JDK动态代理 & CGLIB代理 完整源码拆解 + 选择判定逻辑 + 面试深度题

## 前置核心基础

### 1. 两种代理本质区别

1. **JDK 动态代理（`java.lang.reflect.Proxy`）**
    - 要求：目标类**必须实现至少一个接口**
    - 原理：运行时动态生成**目标接口的实现类**，代理类和目标类实现同一套接口
    - 局限：只能拦截**接口中定义的public方法**，无法拦截类自身非接口方法、private/final/static方法
2. **CGLIB 代理（Code Generation Library，ASM字节码框架）**
    - 要求：目标类**不能是final**，被拦截方法不能是final（无法重写）
    - 原理：运行时动态生成**目标类的子类**，通过重写父类非final方法完成拦截
    - 优势：无需接口，直接对普通类做代理

### 2. Spring AOP 核心入口类

- 顶层接口：`AopProxy`，只有两个实现类
    1. `JdkDynamicAopProxy`：JDK代理实现
    2. `ObjenesisCglibAopProxy`（继承`CglibAopProxy`）：CGLIB代理实现
- 代理工厂：`DefaultAopProxyFactory` **（决定用JDK还是CGLIB的核心判定源码就在这里）**
- 统一对外工具：`ProxyFactory` / `ProxyCreatorSupport` 封装创建逻辑

---

# 第一部分：核心判定源码 `DefaultAopProxyFactory.createAopProxy()` 逐行解析

Spring 5.x / Spring Boot 2.x（底层Spring Framework 5）源码完全一致，核心判定逻辑没有改动。

```
public class DefaultAopProxyFactory implements AopProxyFactory, Serializable {

    @Override
    public AopProxy createAopProxy(AdvisedSupport config) throws AopConfigException {
        // ====================== 核心三层判断 ======================
        // 条件1：用户强制指定使用CGLIB（setProxyTargetClass(true)）
        if (config.isOptimize() || config.isProxyTargetClass() || hasNoUserSuppliedProxyInterfaces(config)) {
            Class<?> targetClass = config.getTargetClass();
            if (targetClass == null) {
                throw new AopConfigException("TargetSource cannot determine target class: " +
                        "Either an interface or a target is required for proxy creation.");
            }
            // 边界：目标类本身是接口 或者 是JDK Proxy生成的代理类 → 降级使用JDK代理
            if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
                return new JdkDynamicAopProxy(config);
            }
            // 否则：创建CGLIB代理
            return new ObjenesisCglibAopProxy(config);
        }
        // 条件2：默认走JDK动态代理
        else {
            return new JdkDynamicAopProxy(config);
        }
    }

    // 私有辅助方法：判断是否没有用户手动指定的代理接口
    private static boolean hasNoUserSuppliedProxyInterfaces(AdvisedSupport config) {
        Class<?>[] ifcs = config.getProxiedInterfaces();
        return (ifcs.length == 0 || (ifcs.length == 1 && SpringProxy.class == ifcs[0]));
    }
}
```

## 拆解判定规则（背诵版）

### 三个触发CGLIB的条件（任意一个成立）

```
config.isOptimize()        // 开启CGLIB优化（极少用）
|| config.isProxyTargetClass()  // 【最常用】proxy-target-class=true
|| hasNoUserSuppliedProxyInterfaces(config) // 目标类没有实现任何业务接口
```

### 完整执行优先级

1. **最高优先级：手动强制 `proxy-target-class=true`** → 直接CGLIB
2. 其次：目标类**没有实现任何自定义接口** → CGLIB
3. 兜底边界：就算上面满足，但目标本身是`interface` 或者已经是JDK代理类 → 退化成JDK代理
4. 默认规则：目标实现了接口 且 没开proxy-target-class → **JDK动态代理**

### 对应XML/注解配置写法

#### 1）XML开启强制CGLIB

```
<aop:aspectj-autoproxy proxy-target-class="true"/>
```

#### 2）注解开启（SpringBoot常用）

```
@EnableAspectJAutoProxy(proxyTargetClass = true)
```

---

# 第二部分：JdkDynamicAopProxy 源码拆解（JDK代理创建与调用）

## 2.1 类结构与核心成员

```
final class JdkDynamicAopProxy implements AopProxy, InvocationHandler, Serializable {

    // 封装AOP配置：目标对象、切面通知、切点、Advisor链等
    private final AdvisedSupport advised;
    // 缓存要代理的接口数组
    private Class<?>[] proxiedInterfaces;
    // 生成的代理类缓存
    private Object proxy;

    // 构造器注入配置
    public JdkDynamicAopProxy(AdvisedSupport config) {
        Assert.notNull(config, "AdvisedSupport must not be null");
        this.advised = config;
        this.proxiedInterfaces = AopProxyUtils.completeProxiedInterfaces(config, true);
        // 校验不能代理final接口等
        findDefinedEqualsAndHashCodeMethods(this.proxiedInterfaces);
    }
}
```

关键点：`JdkDynamicAopProxy` 自身实现了 `InvocationHandler`，JDK代理回调入口就是 `invoke()` 方法。

## 2.2 创建代理对象：`getProxy()` 核心方法

```
@Override
public Object getProxy() {
    return getProxy(ClassUtils.getDefaultClassLoader());
}

@Override
public Object getProxy(@Nullable ClassLoader classLoader) {
    if (this.proxy == null) {
        // JDK Proxy核心API：Proxy.newProxyInstance
        this.proxy = Proxy.newProxyInstance(
                classLoader,          // 类加载器
                this.proxiedInterfaces,// 要实现的接口数组
                this                  // InvocationHandler当前对象
        );
    }
    return this.proxy;
}
```

标准JDK动态代理三板斧：
`Proxy.newProxyInstance(类加载器, 接口数组, InvocationHandler)`

## 2.3 执行拦截：invoke() 核心逻辑（重中之重）

```
@Override
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    Object oldProxy = null;
    boolean setProxyContext = false;

    TargetSource targetSource = this.advised.getTargetSource();
    Object target = null;

    try {
        // 1. 处理AOP内部上下文暴露（@EnableAspectJAutoProxy(exposeProxy = true)）
        if (this.advised.exposeProxy()) {
            oldProxy = AopContext.setCurrentProxy(proxy);
            setProxyContext = true;
        }

        // 2. 特殊方法短路：equals、hashCode、toString 不走切面逻辑
        if (AopUtils.isEqualsMethod(method)) {
            return equals(args[0]);
        }
        if (AopUtils.isHashCodeMethod(method)) {
            return hashCode();
        }
        if (AopUtils.isToStringMethod(method)) {
            return toString();
        }

        // 3. 如果是Advised接口内部方法（AOP框架内部使用），直接反射执行
        if (method.getDeclaringClass() == Advised.class) {
            return AopUtils.invokeJoinpointUsingReflection(this.advised, method, args);
        }

        // 4. 获取真实目标对象
        target = targetSource.getTarget();
        Class<?> targetClass = (target != null ? target.getClass() : null);

        // ========== AOP核心：获取拦截器调用链（Advisor链包装成MethodInvocation） ==========
        MethodInvocation invocation = new ReflectiveMethodInvocation(
                proxy, target, method, args, targetClass,
                this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass)
        );

        // 5. 执行责任链调用，递归执行前置/后置/异常/最终通知
        Object retVal = invocation.proceed();

        // 6. 处理返回值特殊场景：如果返回值是目标对象本身，替换为代理对象（解决内部调用AOP失效）
        Class<?> returnType = method.getReturnType();
        if (retVal != null && retVal == target &&
                returnType != Object.class && returnType.isInstance(retVal)) {
            retVal = proxy;
        }
        return retVal;
    }
    finally {
        // 释放目标对象（池化TargetSource）
        if (target != null && !targetSource.isStatic()) {
            targetSource.releaseTarget(target);
        }
        // 恢复AOP上下文
        if (setProxyContext) {
            AopContext.setCurrentProxy(oldProxy);
        }
    }
}
```

### invoke 核心流程总结

1. 开启 `exposeProxy` 则把代理对象存入 `AopContext`，解决**类内部调用AOP失效**问题
2. `equals/hashCode/toString` 直接原生执行，不经过切面
3. 获取目标类，匹配当前方法对应的所有Advisor（通知链）
4. 封装为 `ReflectiveMethodInvocation` 执行责任链 `proceed()`
5. 如果方法return了this，自动替换为代理对象，修复自调用问题
6. finally释放资源、还原上下文

## 2.4 JDK代理硬限制（源码体现）

1. 只能代理**接口里声明的public方法**，目标类普通public方法不在接口里 → 无法拦截
2. final类、final接口无法生成代理
3. 静态方法、private方法 JDK代理完全无法拦截

---

# 第三部分：CGLIB 代理 CglibAopProxy / ObjenesisCglibAopProxy 源码拆解

## 3.1 CGLIB整体架构

1. `CglibAopProxy`：基础CGLIB代理实现
2. `ObjenesisCglibAopProxy`：子类，优化构造函数（无需默认无参构造也能创建代理）
3. CGLIB核心依赖两个ASM字节码类：
    - `Enhancer`：动态生成子类的核心生成器
    - `MethodInterceptor`：方法拦截回调接口（等同于JDK的InvocationHandler）

## 3.2 核心创建代理方法 `getProxy()`

```
@Override
public Object getProxy(@Nullable ClassLoader classLoader) {
    // 1. 创建CGLIB Enhancer增强器
    Enhancer enhancer = createEnhancer();
    if (classLoader != null) {
        enhancer.setClassLoader(classLoader);
    }

    // 2. 设置父类：目标类作为要继承的父类
    Class<?> targetClass = this.advised.getTargetClass();
    enhancer.setSuperclass(AopUtils.getMostSpecificSuperclass(targetClass));

    // 3. 实现Spring内部AOP标记接口
    enhancer.setInterfaces(AopProxyUtils.completeProxiedInterfaces(this.advised));

    // 4. 设置回调拦截器（当前CglibAopProxy自身实现了MethodInterceptor）
    Callback[] callbacks = getCallbacks(classLoader);
    enhancer.setCallbacks(callbacks);

    // 5. 生成代理子类实例
    return createProxyClassAndInstance(enhancer, callbacks);
}
```

### 关键配置说明

- `setSuperclass(targetClass)`：CGLIB本质是**继承目标类生成子类**
- `setCallbacks(this)`：当前类实现`MethodInterceptor`，拦截入口为`intercept`方法
- 自动跳过final类：Enhancer会直接抛出异常，无法继承final类

## 3.3 CGLIB拦截入口 intercept() 方法

```
@Override
public Object intercept(Object proxy, Method method, Object[] args, MethodProxy methodProxy) throws Throwable {
    Object oldProxy = null;
    boolean setProxyContext = false;

    TargetSource targetSource = this.advised.getTargetSource();
    Object target = null;

    try {
        // 同样支持 exposeProxy 暴露代理对象
        if (this.advised.exposeProxy()) {
            oldProxy = AopContext.setCurrentProxy(proxy);
            setProxyContext = true;
        }

        // 同样短路equals、hashCode、toString
        if (AopUtils.isEqualsMethod(method)) {
            return equals(args[0]);
        }
        if (AopUtils.isHashCodeMethod(method)) {
            return hashCode();
        }
        if (AopUtils.isToStringMethod(method)) {
            return toString();
        }

        // 直接执行父类原始方法（无切面绕过）
        if (method.isDeclaredBy(Object.class) || method.isDeclaredBy(Cloneable.class)) {
            return methodProxy.invokeSuper(proxy, args);
        }

        target = targetSource.getTarget();
        Class<?> targetClass = (target != null ? target.getClass() : null);

        // 和JDK代理完全一致：获取Advisor拦截链
        MethodInvocation invocation = new CglibMethodInvocation(
                proxy, target, method, args, targetClass,
                this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass),
                methodProxy
        );

        // 执行AOP通知链
        Object retVal = invocation.proceed();

        // 返回this替换为代理对象，解决内部调用AOP失效
        Class<?> returnType = method.getReturnType();
        if (retVal != null && retVal == target && returnType.isInstance(retVal)) {
            retVal = proxy;
        }
        return retVal;
    }
    finally {
        if (target != null && !targetSource.isStatic()) {
            targetSource.releaseTarget(target);
        }
        if (setProxyContext) {
            AopContext.setCurrentProxy(oldProxy);
        }
    }
}
```

### CGLIB 两个独有优势源码体现

1. 入参多了 `MethodProxy methodProxy`，调用 `methodProxy.invokeSuper(proxy, args)` 直接调用父类原方法，**比反射Method.invoke性能更高**
2. 可以拦截目标类**任意public非final方法**，不需要依赖接口

## 3.4 ObjenesisCglibAopProxy 扩展作用

父类`CglibAopProxy`创建代理时要求**目标类必须有无参构造函数**；
`ObjenesisCglibAopProxy`借助Objenesis框架绕过构造方法直接实例化对象，解决目标类只有带参构造时CGLIB创建失败的问题。

## 3.5 CGLIB强制限制

1. 目标类不能被 `final` 修饰（无法继承）
2. 需要被AOP拦截的方法不能加 `final`（无法重写）
3. private / static 方法依然无法拦截（子类不能重写）

---

# 第四部分：JDK代理 vs CGLIB 完整横向对比（源码角度）

| 对比维度 | JDK动态代理（JdkDynamicAopProxy） | CGLIB代理（CglibAopProxy） |
| --- | --- | --- |
| 生成对象 | 实现目标接口的新类 | 继承目标类的子类 |
| 依赖条件 | 必须实现接口 | 不能是final类，方法不能final |
| 核心回调 | InvocationHandler.invoke | MethodInterceptor.intercept |
| 执行原方法 | Method.invoke() 反射 | MethodProxy.invokeSuper() 字节码直接调用，性能更高 |
| 可拦截范围 | 仅接口public方法 | 类所有非final public方法 |
| 有无第三方依赖 | JDK原生，无依赖 | 依赖ASM字节码框架（Spring内置） |
| 默认策略 | Spring AOP默认优先选择 | 手动开启proxy-target-class=true才使用 |
| 构造函数限制 | 无要求 | 原版CGLIB需要无参构造，Objenesis版本不需要 |

---

# 第五部分：Spring AOP 代理创建全链路调用栈（梳理流程）

```
1. @EnableAspectJAutoProxy 注册 AnnotationAwareAspectJAutoProxyCreator（后置处理器）
2. Bean初始化完成后执行 postProcessAfterInitialization()
3. wrapIfNecessary() 判断当前Bean是否匹配切面PointCut
4. 匹配成功 → 创建 ProxyFactory 工厂，存入Advisor通知链
5. proxyFactory.getProxy() → 调用 AopProxyFactory（默认DefaultAopProxyFactory）
6. DefaultAopProxyFactory.createAopProxy() 执行三段式判定规则
   6.1 满足CGLIB条件 → new ObjenesisCglibAopProxy
   6.2 默认 → new JdkDynamicAopProxy
7. 调用AopProxy.getProxy() 生成最终代理Bean放入单例池
8. 外部调用Bean方法 → 进入invoke()/intercept() → ReflectiveMethodInvocation责任链执行通知
```

---

# 第六部分：Spring AOP 代理高频面试深度题（源码向）

## 一、基础判定逻辑题

### 1. Spring AOP 默认什么时候用JDK，什么时候用CGLIB？

答：

1. 默认：目标类**实现了接口** → JDK动态代理；
2. 目标类**没有实现任何接口** 或者 `@EnableAspectJAutoProxy(proxyTargetClass=true)` 强制开启 → CGLIB；
3. 边界：即使开了proxyTargetClass，如果目标本身是接口，依然降级JDK代理。

### 2. `proxyTargetClass=true` 一定百分百走CGLIB吗？

不一定，如果目标Class本身是 `interface` 或者已经是JDK Proxy生成的代理类，`DefaultAopProxyFactory` 内部会做判断，强制切回JDK动态代理。

### 3. SpringBoot 2.x/3.x 默认AOP代理是哪种？

SpringBoot 2.x 依旧**默认JDK代理**；
SpringBoot 3.x（Spring Framework 6）底层规则没变，只是CGLIB依赖包需要手动引入。

## 二、源码底层深挖题

### 4. DefaultAopProxyFactory 三个判定条件分别代表什么？

1. `isProxyTargetClass()`：用户强制指定使用类代理（最常用）；
2. `isOptimize()`：开启CGLIB内部优化，很少业务代码使用；
3. `hasNoUserSuppliedProxyInterfaces`：没有手动添加代理接口，目标为普通类。

### 5. JdkDynamicAopProxy.invoke 里为什么要单独处理equals、hashCode、toString？

这三个方法属于Object顶级方法，不属于业务接口方法，不需要经过切面拦截，直接原生执行即可，避免AOP增强干扰对象基础行为。

### 6. CGLIB的MethodProxy.invokeSuper 和 JDK Method.invoke 性能差异？

`Method.invoke` 是Java反射调用，有安全检查、包装拆箱开销；
`MethodProxy.invokeSuper` 直接操作字节码调用父类方法，底层ASM生成硬编码调用逻辑，性能高出很多。

### 7. ObjenesisCglibAopProxy 解决了什么痛点？

原版CGLIB Enhancer生成子类时，必须调用父类无参构造函数；
Objenesis绕过构造器直接分配堆内存实例化对象，兼容只有带参构造的目标类。

## 三、经典坑点面试题

### 8. 为什么类内部this调用本类方法，AOP切面不生效？

原因：`this` 指向的是**原始目标对象**，不是Spring容器中的代理对象，不会经过代理拦截器。
解决方案三种：

1. `@EnableAspectJAutoProxy(exposeProxy = true)`，代码里 `AopContext.currentProxy()` 获取代理对象调用；
2. 自己注入当前Bean（`@Autowired private XXX self;`），用self调用；
3. 拆分方法到不同Bean。
   源码对应：invoke/intercept方法中`exposeProxy` 就是为了支持该场景。

### 9. final类 / final方法 / static方法为什么无法被AOP拦截？

1. final类：CGLIB无法继承生成子类，JDK如果是接口final也无法代理；
2. final方法：CGLIB子类不能重写final方法，JDK接口也不能定义final方法；
3. static方法：属于类本身，不属于实例对象，代理无法拦截静态方法。

### 10. JDK动态代理能不能拦截类上public方法（不在接口中定义的）？

不能。JDK代理生成的是接口实现类，只重写接口里的方法，类独有的public方法不会被重写，调用直接走原生对象，无法进入invoke拦截。

### 11. AOP的ReflectiveMethodInvocation和CglibMethodInvocation区别？

- ReflectiveMethodInvocation：JDK代理使用，底层用Method反射执行目标方法；
- CglibMethodInvocation：CGLIB代理使用，持有MethodProxy对象，调用invokeSuper执行父类方法。
  两者都实现了MethodInvocation，共用一套通知责任链执行逻辑。

## 四、扩展架构题

### 12. AopProxy、AopProxyFactory、AdvisedSupport 三者职责？

1. `AopProxy`：顶层接口，定义`getProxy()`生成代理对象，两个实现Jdk/Cglib；
2. `AopProxyFactory`：工厂接口，只有DefaultAopProxyFactory一个默认实现，负责判定选择哪种代理；
3. `AdvisedSupport`：配置容器，存放目标对象、切点表达式、Advisor通知列表、proxyTargetClass开关、exposeProxy开关等所有AOP元数据，传给AopProxy构造器。

### 13. CGLIB生成代理类大致结构是什么样？

ASM字节码动态生成：

```
public class UserService$$EnhancerBySpringCGLIB$$xxxx extends UserService {
    private MethodInterceptor CGLIB$CALLBACK_0;
    // 重写所有非final public方法
    @Override
    public void add() {
        CGLIB$CALLBACK_0.intercept(this, method, args, methodProxy);
    }
}
```

---

# 极简背诵总结

1. **选择核心**：`DefaultAopProxyFactory`三段式判断，默认有接口JDK，无接口/强制开关走CGLIB；
2. **JDK代理**：实现接口+Proxy+InvocationHandler.invoke，只能拦接口方法；
3. **CGLIB代理**：继承目标类+ASM字节码+MethodInterceptor.intercept，可拦普通类非final方法；
4. **统一执行**：两种代理最终都封装`MethodInvocation`执行通知责任链，共用一套AOP通知体系；
5. **高频坑**：内部this调用失效、final/static无法拦截、CGLIB需要无参构造（Objenesis优化）。

需要我继续往下拆解 **AOP通知责任链ReflectiveMethodInvocation.proceed()递归执行源码** 或者 **AspectJ注解解析、Advisor创建过程** 吗？