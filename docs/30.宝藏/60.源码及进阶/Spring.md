---
title: Spring 循环依赖三级缓存源码
date: 2026-08-09 14:56:24
permalink: /pages/cc005f/
categories:
  - 后端
  - Collection
tags: []
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---

# Spring IoC 循环依赖 三级缓存 完整源码级拆解

## 1. 先明确概念

### 循环依赖场景

A依赖B，B依赖A，单例Bean，setter注入；构造器注入无法解决循环依赖。

### 三级缓存定义（DefaultSingletonBeanRegistry 源码变量）

```
public class DefaultSingletonBeanRegistry extends SimpleAliasRegistry implements SingletonBeanRegistry {
    // 一级缓存：完整初始化完毕、可以直接对外使用的单例Bean
    private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);

    // 二级缓存：实例化完成、属性未填充、未执行初始化方法的半成品Bean
    private final Map<String, Object> earlySingletonObjects = new HashMap<>(16);

    // 三级缓存：存储Bean的工厂ObjectFactory，用于生成AOP代理对象
    private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);
}
```

层级作用一句话：
1级：成品Bean；2级：原始半成品Bean；3级：Bean工厂（用来生成代理）。

## 2. 核心获取Bean方法：getSingleton() 源码逻辑

```
protected Object getSingleton(String beanName, boolean allowEarlyReference) {
    // 1. 先查一级缓存
    Object singletonObject = this.singletonObjects.get(beanName);
    // 一级没有 && 当前Bean正在创建中
    if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
        // 2. 查询二级缓存
        singletonObject = this.earlySingletonObjects.get(beanName);
        // 二级没有 && 允许提前引用（循环依赖开关）
        if (singletonObject == null && allowEarlyReference) {
            // 3. 从三级缓存取出ObjectFactory工厂
            ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName);
            if (singletonFactory != null) {
                // 调用工厂getObject()，获取原始对象 / AOP代理对象
                singletonObject = singletonFactory.getObject();
                // 放入二级缓存，删除三级缓存，后续直接走二级
                this.earlySingletonObjects.put(beanName, singletonObject);
                this.singletonFactories.remove(beanName);
            }
        }
    }
    return singletonObject;
}
```

### 执行流程拆解（以A、B循环依赖为例）

1. 开始创建A，标记A为**正在创建**；
2. A执行实例化（new A()），未填充属性；
3. A放入三级缓存 `singletonFactories`（存入A的工厂，可生成AOP代理）；
4. A填充属性发现依赖B，去创建B；
5. B实例化完成，放入三级缓存；B填充属性依赖A；
6. B调用`getSingleton("A", true)`：
    - 一级无A，A处于创建中；二级无A；
    - 从三级工厂取出A的早期引用（原始/代理），存入二级缓存，删除三级；
7. B拿到A的半成品引用，完成B全部初始化，B放入一级缓存；
8. A继续填充属性注入完整B，A执行初始化、AOP后置处理；
9. A最终放入一级缓存，删除二级缓存，循环依赖闭环完成。

## 3. 三级缓存存入时机源码：doCreateBean 方法关键片段

```
protected Object doCreateBean(final String beanName, final RootBeanDefinition mbd, final @Nullable Object[] args)
        throws BeanCreationException {

    // 1. 实例化Bean（反射new对象）
    BeanWrapper instanceWrapper = createBeanInstance(beanName, mbd, args);
    final Object bean = instanceWrapper.getWrappedInstance();

    // 2. 单例 && 允许循环依赖，提前暴露工厂到三级缓存
    boolean earlySingletonExposure = (mbd.isSingleton() && this.allowCircularReferences &&
            isSingletonCurrentlyInCreation(beanName));
    if (earlySingletonExposure) {
        // 存入ObjectFactory，核心方法getEarlyBeanReference处理AOP代理
        addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));
    }

    // 3. 属性填充 populateBean
    populateBean(beanName, mbd, instanceWrapper);
    // 4. 初始化 initializeBean（@PostConstruct、InitializingBean、AOP代理）
    exposedObject = initializeBean(beanName, exposedObject, mbd);

    // 5. 最终放入一级缓存，清理二三级
    addSingleton(beanName, exposedObject);
}
```

### addSingletonFactory 底层

```
protected void addSingletonFactory(String beanName, ObjectFactory<?> singletonFactory) {
    synchronized (this.singletonObjects) {
        if (!this.singletonObjects.containsKey(beanName)) {
            this.singletonFactories.put(beanName, singletonFactory);
            this.earlySingletonObjects.remove(beanName);
        }
    }
}
```

## 4. 最核心：三级缓存 ObjectFactory 存在的唯一意义（AOP代理）

`getEarlyBeanReference` 源码：

```
protected Object getEarlyBeanReference(String beanName, RootBeanDefinition mbd, Object bean) {
    Object exposedObject = bean;
    // 调用AOP后置处理器 AbstractAutoProxyCreator 创建代理对象
    if (!mbd.isSynthetic() && hasInstantiationAwareBeanPostProcessors()) {
        for (BeanPostProcessor bp : getBeanPostProcessors()) {
            if (bp instanceof SmartInstantiationAwareBeanPostProcessor) {
                SmartInstantiationAwareBeanPostProcessor processor =
                        (SmartInstantiationAwareBeanPostProcessor) bp;
                exposedObject = processor.getEarlyBeanReference(exposedObject, beanName);
            }
        }
    }
    return exposedObject;
}
```

### 终极灵魂问题：为什么不能只用二级缓存，非要三级？

1. 如果只有二级缓存：提前暴露的是**原始new出来的裸对象**；
2. 若Bean需要AOP动态代理，初始化后置步骤才生成代理；循环依赖注入给对方的就是原始对象，不是代理对象，事务、切面全部失效；
3. 三级缓存存工厂，需要提前引用时动态调用`getEarlyBeanReference`生成**代理半成品**，保证依赖注入的就是最终代理对象，这是三级缓存不可替代的唯一原因。

## 5. addSingleton 收尾清理缓存源码

```
protected void addSingleton(String beanName, Object singletonObject) {
    synchronized (this.singletonObjects) {
        // 放入一级缓存
        this.singletonObjects.put(beanName, singletonObject);
        // 删除二、三级缓存
        this.singletonFactories.remove(beanName);
        this.earlySingletonObjects.remove(beanName);
        this.registeredSingletons.add(beanName);
    }
}
```

## 6. 高频面试答疑（循环依赖专属）

### Q1 原型Bean为什么无法解决循环依赖？

原型Bean每次`getBean`都会新建对象，没有任何缓存池存储半成品，Spring不做任何处理，直接抛异常。

### Q2 构造器注入为什么解决不了？

构造器注入在`createBeanInstance`实例化阶段就需要依赖对象，此时还没执行到**存入三级缓存**的代码，无法提前暴露引用，直接死递归报错。

### Q3 allowEarlyReference 这个参数作用？

`getSingleton(beanName, true)`的true就是开启提前引用，只有循环依赖场景才传true，正常创建Bean传false不走二三级缓存。

### Q4 二级缓存的作用是什么？

三级工厂调用一次生成代理后放入二级，后续其他Bean再依赖时直接取二级，避免重复调用ObjectFactory多次生成代理对象，提升性能、保证单例唯一性。

---