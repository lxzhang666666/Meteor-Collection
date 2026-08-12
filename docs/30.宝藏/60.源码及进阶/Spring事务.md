---
title: Spring 事务底层全解析
date: 2026-08-09 14:56:24
permalink: /pages/1774ff/
categories:
  - 后端
  - Collection
tags: []
author: 
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---

# Spring @Transactional 事务底层全解析：TransactionInterceptor 完整源码拆解 + 执行链路 + 高频面试题

## 前置整体架构总览

### 1. 事务AOP核心组件分工

1. **@Transactional 注解解析器**
   `AnnotationTransactionAttributeSource`：扫描类/方法上`@Transactional`，封装成`TransactionAttribute`（传播行为、隔离级别、回滚规则、超时、只读等）
2. **切面Advisor**
   `TransactionAttributeSourceAdvisor`：AOP切面，切点匹配加了`@Transactional`的方法，通知为`TransactionInterceptor`
3. **核心拦截器（重中之重）**
   `TransactionInterceptor extends MethodInterceptor`：AOP环绕通知入口，事务创建、提交、回滚、挂起、恢复全部逻辑在这里
4. **事务管理器顶层接口**
   `PlatformTransactionManager`：Spring事务规范，最核心两个实现：

- `DataSourceTransactionManager`：JDBC/MyBatis 单数据源事务（最常用）
- `JtaTransactionManager`：分布式JTA事务

5. **事务状态上下文**
   `TransactionStatus`：封装当前事务运行状态（是否新事务、是否有保存点、是否已回滚、是否完成等）
6. **事务资源持有**
   `TransactionSynchronizationManager`：**线程级上下文**，用ThreadLocal绑定当前线程的Connection、事务属性、同步器，解决多线程资源隔离、嵌套事务资源复用

### 2. 整体执行链路（先记骨架）

```
目标方法调用 → AOP代理 → TransactionInterceptor.invoke()
  → getTransactionAttributeSource() 获取注解配置 TransactionAttribute
  → 调用事务管理器 tm.getTransaction() 根据传播行为创建/复用/挂起事务
  → 执行业务方法 invocation.proceed()
  → try正常：tm.commit(status) 提交事务
  → catch异常：判断是否需要回滚 → tm.rollback(status)
  → finally：清理事务资源、恢复挂起的旧事务、清空ThreadLocal绑定
```

---

# 第一部分 TransactionInterceptor 类结构与核心成员变量

```
public class TransactionInterceptor extends TransactionAspectSupport implements MethodInterceptor, Serializable {

    // 事务属性来源：解析@Transactional注解
    private TransactionAttributeSource transactionAttributeSource;

    // 注入事务管理器（PlatformTransactionManager）
    public TransactionInterceptor(PlatformTransactionManager ptm) {
        setTransactionManager(ptm);
    }

    public TransactionInterceptor(PlatformTransactionManager ptm, TransactionAttributeSource tas) {
        setTransactionManager(ptm);
        setTransactionAttributeSource(tas);
    }

    // AOP环绕通知唯一入口
    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {
        // 核心调用父类 TransactionAspectSupport 的模板方法
        return invokeWithinTransaction(invocation.getMethod(), invocation.getThis(), invocation::proceed);
    }
}
```

### 关键点说明

1. `TransactionInterceptor` 自身代码极少，**所有事务核心逻辑全部在父类 `TransactionAspectSupport.invokeWithinTransaction()`**
2. `invoke()` 只做了一层转发，真正的事务创建、传播行为判断、提交回滚都在父类模板方法
3. `invocation::proceed` 是函数式接口，代表执行业务目标方法

---

# 第二部分 核心源码：TransactionAspectSupport.invokeWithinTransaction 逐行深度拆解

## 方法整体框架

```
protected Object invokeWithinTransaction(Method method, @Nullable Class<?> targetClass,
        final InvocationCallback invocation) throws Throwable {

    // ========== 步骤1：解析@Transactional注解，获取事务属性 ==========
    TransactionAttributeSource tas = getTransactionAttributeSource();
    final TransactionAttribute txAttr = (tas != null ? tas.getTransactionAttribute(method, targetClass) : null);

    // 获取配置的事务管理器 PlatformTransactionManager
    final PlatformTransactionManager tm = determineTransactionManager(txAttr);
    final String joinpointIdentification = methodIdentification(method, targetClass, txAttr);

    // ========== 分支1：声明式事务（标准@Transactional注解） ==========
    if (txAttr == null || !(tm instanceof CallbackPreferringPlatformTransactionManager)) {
        // 事务信息持有者，存放事务状态、连接、挂起资源等
        TransactionInfo txInfo = createTransactionIfNecessary(tm, txAttr, joinpointIdentification);
        Object retVal;
        try {
            // ========== 执行业务目标方法 ==========
            retVal = invocation.proceedWithInvocation();
        }
        catch (Throwable ex) {
            // ========== 异常捕获：判断回滚规则，执行回滚 ==========
            completeTransactionAfterThrowing(txInfo, ex);
            throw ex;
        }
        finally {
            // ========== 后置收尾：清理资源、恢复挂起事务、解绑ThreadLocal ==========
            cleanupTransactionInfo(txInfo);
        }
        // ========== 正常执行完毕：提交事务 ==========
        commitTransactionAfterReturning(txInfo);
        return retVal;
    }
    // 分支2：编程式回调事务（极少使用，忽略）
    else {
        // ... CallbackPreferringPlatformTransactionManager 省略
    }
}
```

## 分步骤逐块拆解（最核心四大模板方法）

### 步骤1：createTransactionIfNecessary 创建/获取/挂起事务（传播行为全部在这里判断）

```
protected TransactionInfo createTransactionIfNecessary(@Nullable PlatformTransactionManager tm,
        @Nullable TransactionAttribute txAttr, final String joinpointIdentification) {

    // 标记旧的事务信息，用于finally恢复
    TransactionInfo oldTxInfo = TransactionSynchronizationManager.getTransactionInfo();

    TransactionInfo newTxInfo = new TransactionInfo(tm, txAttr, joinpointIdentification);

    if (txAttr != null) {
        // 调用事务管理器核心方法：根据传播行为规则获取事务状态
        TransactionStatus status = tm.getTransaction(txAttr);
        newTxInfo.setTransactionStatus(status);
        // 把当前事务绑定到当前线程ThreadLocal
        newTxInfo.bindToThread();
    }
    return newTxInfo;
}
```

#### 核心要点

1. `tm.getTransaction(txAttr)` **整个事务传播行为7种规则的逻辑全部封装在这个方法里**（由具体事务管理器实现，如`DataSourceTransactionManager`）
2. `TransactionInfo.bindToThread()`：将newTxInfo存入`TransactionSynchronizationManager`的ThreadLocal，保证嵌套事务、同线程方法共享事务上下文
3. 保存`oldTxInfo`：嵌套事务/挂起场景下，执行完内层方法要恢复外层挂起的事务

### 步骤2：执行业务方法 invocation.proceedWithInvocation()

就是AOP责任链往下执行，调用被`@Transactional`修饰的目标Service方法；
方法抛出任何Throwable都会进入catch分支。

### 步骤3：completeTransactionAfterThrowing 异常回滚判定（面试超级高频）

```
protected void completeTransactionAfterThrowing(@Nullable TransactionInfo txInfo, Throwable ex) {
    if (txInfo != null && txInfo.getTransactionStatus() != null) {
        TransactionAttribute txAttr = txInfo.getTransactionAttribute();
        // 核心判断：是否触发回滚
        if (txAttr.rollbackOn(ex)) {
            // 符合回滚规则 → 执行回滚
            txInfo.getTransactionManager().rollback(txInfo.getTransactionStatus());
        }
        else {
            // 不满足回滚条件 → 依旧提交事务
            txInfo.getTransactionManager().commit(txInfo.getTransactionStatus());
        }
    }
}
```

#### rollbackOn(ex) 底层规则（重中之重）

1. **Spring默认规则**：**只在 RuntimeException（运行时异常）和 Error 错误时回滚**
2. 受检异常（Checked Exception，如Exception直接抛出、IOException）默认**不会回滚**
3. `@Transactional(rollbackFor = Exception.class)` 就是修改`TransactionAttribute`的回滚规则，让所有Exception都触发回滚
4. `noRollbackFor` 指定某些异常即便抛出也不回滚

### 步骤4：commitTransactionAfterReturning 正常提交

```
protected void commitTransactionAfterReturning(@Nullable TransactionInfo txInfo) {
    if (txInfo != null && txInfo.getTransactionStatus() != null) {
        txInfo.getTransactionManager().commit(txInfo.getTransactionStatus());
    }
}
```

只有目标方法**正常执行完毕无异常**才会走到提交分支。

### 步骤5：cleanupTransactionInfo 最终资源清理（finally块必执行）

```
protected void cleanupTransactionInfo(@Nullable TransactionInfo txInfo) {
    if (txInfo != null) {
        // 解绑当前线程的事务信息，恢复外层挂起的旧事务上下文
        txInfo.restoreThreadLocalStatus();
    }
}
```

作用：

1. 清空当前线程ThreadLocal绑定的Connection、事务同步器
2. 恢复上一层挂起的`oldTxInfo`，保证嵌套事务执行完毕外层事务可以继续运行
3. 避免ThreadLocal内存泄漏

---

# 第三部分 核心辅助类深度解析

## 3.1 TransactionInfo 事务封装载体

```
final class TransactionInfo {
    // 事务管理器
    private final PlatformTransactionManager transactionManager;
    // 注解解析出来的事务属性
    private final TransactionAttribute transactionAttribute;
    // 切点标识（方法全限定名）
    private final String joinpointIdentification;
    // 当前事务运行状态
    private TransactionStatus transactionStatus;
    // 上一层被挂起的事务信息（嵌套/REQUIRES_NEW等传播行为使用）
    private TransactionInfo oldTransactionInfo;

    // 绑定到当前线程
    public void bindToThread() {
        this.oldTransactionInfo = TransactionSynchronizationManager.getTransactionInfo();
        TransactionSynchronizationManager.setTransactionInfo(this);
    }

    // 恢复旧事务
    public void restoreThreadLocalStatus() {
        TransactionSynchronizationManager.setTransactionInfo(this.oldTransactionInfo);
    }
}
```

## 3.2 TransactionSynchronizationManager 线程上下文管理器（ThreadLocal核心）

### 存储结构（全部静态ThreadLocal）

```
public abstract class TransactionSynchronizationManager {
    // 当前线程绑定的数据源 -> Connection
    private static final ThreadLocal<Map<Object, Object>> resources = new NamedThreadLocal<>("Transactional resources");
    // 当前事务是否激活
    private static final ThreadLocal<Boolean> currentTransactionReadOnly = new NamedThreadLocal<>("Current transaction read-only status");
    // 事务隔离级别
    private static final ThreadLocal<Integer> currentTransactionIsolationLevel = new NamedThreadLocal<>("Current transaction isolation level");
    // 事务是否开启
    private static final ThreadLocal<Boolean> actualTransactionActive = new NamedThreadLocal<>("Actual transaction active");
    // 事务同步回调钩子
    private static final ThreadLocal<Deque<TransactionSynchronization>> synchronizations = new NamedThreadLocal<>("Transaction synchronizations");
    // 当前TransactionInfo
    private static final ThreadLocal<TransactionInfo> transactionInfoHolder = new NamedThreadLocal<>("Current aspect-driven transaction");
}
```

### 核心作用

1. **绑定数据库Connection**：同一个线程多个`@Transactional`嵌套方法复用同一个JDBC连接，保证事务一致性
2. 存储挂起事务、只读标记、隔离级别
3. 提供事务生命周期钩子`TransactionSynchronization`（beforeCommit、afterCommit、afterCompletion）
4. 方法执行完毕清空ThreadLocal，防止线程池复用导致事务上下文串扰

## 3.3 TransactionAttribute 注解封装类

`AnnotationTransactionAttributeSource` 解析`@Transactional`注解，封装为`RuleBasedTransactionAttribute`，存储：

- propagation：传播行为（REQUIRED、REQUIRES_NEW、NESTED等7种）
- isolation：事务隔离级别（DEFAULT、READ_COMMITTED、REPEATABLE_READ等）
- timeout：事务超时时间
- readOnly：是否只读
- rollbackFor / rollbackForClassName：触发回滚的异常
- noRollbackFor / noRollbackForClassName：不回滚异常

---

# 第四部分 底层事务管理器：DataSourceTransactionManager 关键源码逻辑

## 4.1 getTransaction() 传播行为判断入口

`PlatformTransactionManager` 核心接口方法：

```
public interface PlatformTransactionManager {
    // 根据事务属性创建/复用/挂起事务，返回事务状态
    TransactionStatus getTransaction(@Nullable TransactionAttribute definition) throws TransactionException;
    // 提交事务
    void commit(TransactionStatus status) throws TransactionException;
    // 回滚事务
    void rollback(TransactionStatus status) throws TransactionException;
}
```

### DataSourceTransactionManager.getTransaction() 简化逻辑

1. 获取当前线程是否已有事务（从TransactionSynchronizationManager拿Connection）
2. 根据**传播行为Propagation**做分支判断（7种传播行为全部在这里实现）
    - REQUIRED：有就加入当前事务，没有新建
    - REQUIRES_NEW：挂起旧事务，新建独立事务
    - NESTED：开启保存点savepoint嵌套事务
    - SUPPORTS、NOT_SUPPORTED、MANDATORY、NEVER 对应不同逻辑
3. 新建事务时：从数据源获取Connection → 设置autoCommit=false（关闭自动提交）→ 绑定到ThreadLocal
4. 创建`DefaultTransactionStatus`对象返回，记录是否新事务、是否有保存点、挂起的资源

## 4.2 commit 提交逻辑

1. 判断事务是否被标记为全局回滚（setRollbackOnly()），如果强制回滚则走rollback
2. 调用JDBC Connection.commit()
3. 执行事务同步钩子afterCommit
4. 释放连接、重置autoCommit为true、解绑ThreadLocal资源

## 4.3 rollback 回滚逻辑

1. 如果是NESTED嵌套事务：只回滚到之前的savepoint保存点，外层事务不受影响
2. 普通事务：Connection.rollback()全量回滚
3. 执行afterCompletion钩子，清理资源

### 重点：NESTED 嵌套事务实现原理

基于JDBC3.0的**Savepoint 数据库保存点**：
内层异常只回滚到savepoint，外层事务可以选择提交或整体回滚；
和REQUIRES_NEW本质区别：REQUIRES_NEW是两个独立事务，互不影响；NESTED依赖外层事务的物理连接。

---

# 第五部分 @Transactional 完整AOP加载启动流程（Bean生命周期）

1. 启动类加 `@EnableTransactionManagement`
2. 导入`TransactionManagementConfiguration`配置类，注册两个核心Bean：
    - `TransactionAttributeSourceAdvisor`（AOP切面）
    - `TransactionInterceptor`（环绕通知拦截器）
3. Spring Bean后置处理器扫描所有Service Bean，匹配切点（带有`@Transactional`的类/方法）
4. 匹配成功使用JDK/CGLIB生成代理对象放入容器
5. 调用代理方法 → 进入`TransactionInterceptor.invoke()` → 执行父类事务模板逻辑

### @EnableTransactionManagement 两个关键属性

1. `proxyTargetClass`：同AOP，true强制CGLIB代理，false默认JDK
2. `mode = AdviceMode.PROXY`：默认AOP动态代理模式；ASPECTJ模式为编译期织入（极少用）

---

# 第六部分 高频深度面试题（源码导向，大厂必问）

## 一、核心执行流程题

### 1. TransactionInterceptor 完整执行流程是什么？

1. AOP代理进入`invoke`方法，调用父类`invokeWithinTransaction`
2. 解析`@Transactional`注解得到`TransactionAttribute`
3. `createTransactionIfNecessary`调用事务管理器`getTransaction`，根据传播行为创建/复用/挂起事务，绑定到ThreadLocal
4. 执行目标业务方法
5. 异常捕获：`completeTransactionAfterThrowing`判断异常类型，符合规则回滚，否则提交
6. 正常走完：`commitTransactionAfterReturning`提交事务
7. finally执行`cleanupTransactionInfo`，解绑ThreadLocal、恢复挂起事务

### 2. 为什么`@Transactional`默认只回滚RuntimeException和Error？源码哪里控制的？

在`RuleBasedTransactionAttribute.rollbackOn(Throwable ex)`方法硬编码判断：

```
public boolean rollbackOn(Throwable ex) {
    return (ex instanceof RuntimeException || ex instanceof Error);
}
```

受检Exception不会触发回滚，所以必须手动配置`rollbackFor = Exception.class`。

### 3. TransactionSynchronizationManager 用ThreadLocal解决了什么问题？

1. 同一个线程嵌套多个`@Transactional`方法共用同一个JDBC Connection，保证事务原子性
2. 挂起事务（REQUIRES_NEW）时保存上层事务上下文，执行完恢复
3. 隔离多线程之间事务资源，避免连接错乱
4. 事务结束统一清理资源，防止线程池复用导致脏上下文

## 二、传播行为与底层原理（重中之重）

### 4. 7种传播行为底层在哪个方法实现？REQUIRED / REQUIRES_NEW / NESTED 区别？

全部在`DataSourceTransactionManager.getTransaction()`方法做分支判断：

1. **REQUIRED（默认）**：当前有事务就加入，共用一个连接；外层回滚内层全部回滚
2. **REQUIRES_NEW**：挂起原有事务，新建独立Connection和事务；内层异常不影响外层，外层回滚不影响已提交的内层
3. **NESTED**：复用外层同一个连接，创建数据库Savepoint保存点；内层异常只回滚到保存点，外层可自主决定整体提交或回滚；依赖外层事务，没有外层则新建事务

### 5. NESTED嵌套事务为什么MySQL需要开启InnoDB的savepoint支持？

NESTED底层依赖JDBC的`Connection.setSavepoint()`，MyISAM引擎不支持事务和保存点，只有InnoDB支持。

## 三、坑点经典面试题（源码根源）

### 6. 为什么同类中this调用带@Transactional的方法事务失效？

根源：`this`指向原始对象，不走AOP代理，不会进入`TransactionInterceptor`拦截器，自然没有事务创建逻辑。
解决方案：

1. `@EnableAspectJAutoProxy(exposeProxy = true)`，`((Service)AopContext.currentProxy()).method()`调用
2. 自身`@Autowired private XXX self`注入代理对象调用
3. 拆分到不同Bean

### 7. 哪些场景会导致@Transactional事务失效？（对应源码原因）

1. **方法非public**：AOP切点无法匹配，TransactionInterceptor不会拦截（Spring AOP只拦截public方法）
2. 同类内部this自调用：绕过代理
3. 抛出受检Exception，未配置`rollbackFor`：`rollbackOn`判定不回滚
4. 传播行为配置错误（如PROPAGATION_SUPPORTS、NOT_SUPPORTED）
5. 数据库引擎不支持事务（MyISAM）
6. 多线程异步调用：子线程ThreadLocal无法拿到主线程事务上下文
7. 手动捕获异常没有抛出：catch吞掉异常，不会进入completeTransactionAfterThrowing回滚分支
8. 手动调用`transactionStatus.setRollbackOnly()`强制回滚

### 8. setRollbackOnly() 底层做了什么？

在`TransactionStatus`标记全局回滚状态，即便代码正常走完，`commit`方法内部检测到该标记，依旧执行rollback回滚。常用于无法抛出异常但需要强制回滚的场景。

### 9. TransactionStatus 里面都存了哪些状态？

- 是否为新事务`isNewTransaction()`
- 是否有保存点`hasSavepoint()`（NESTED用）
- 是否被标记回滚`isRollbackOnly()`
- 是否事务完成`isCompleted()`

## 四、架构扩展题

### 10. PlatformTransactionManager 为什么设计成接口？体现了什么设计原则？

策略模式，面向接口编程：

- `DataSourceTransactionManager`：本地JDBC事务
- `JtaTransactionManager`：分布式JTA事务
- `HibernateTransactionManager`：旧版Hibernate事务管理器
  切换底层事务实现无需改动上层`TransactionInterceptor`逻辑。

### 11. 事务同步器TransactionSynchronization的执行顺序？

1. beforeCommit：提交前执行
2. beforeCompletion：提交/回滚前
3. afterCommit：提交成功后
4. afterCompletion：最终完成（无论提交还是回滚）
   常用于事务提交后发送消息、记录日志、更新缓存。

### 12. 只读事务 readOnly = true 底层作用？

1. 给JDBC Connection设置只读模式，数据库引擎优化查询（MySQL禁止DML操作）
2. 事务管理器优化，不开启事务、不申请回滚段，提升查询性能
3. 运行期间执行增删改会抛出异常

---

# 极简背诵总结

1. **入口**：`TransactionInterceptor.invoke()` 转发到父类`TransactionAspectSupport.invokeWithinTransaction`模板方法；
2. **四步核心**：解析注解→创建事务（传播行为）→执行业务→异常回滚/正常提交→finally清理ThreadLocal；
3. **传播行为**：全部由`DataSourceTransactionManager.getTransaction()`实现，NESTED基于数据库Savepoint；
4. **上下文核心**：`TransactionSynchronizationManager` ThreadLocal绑定JDBC连接，实现嵌套事务资源复用；
5. **失效根源**：AOP代理未生效（非public、this自调用）、异常回滚规则不匹配、引擎不支持事务、异步跨线程。

需要我继续拆解：

1. `AnnotationTransactionAttributeSource` 如何解析类/方法上`@Transactional`注解优先级；
2. 或者 **分布式事务（Seata AT模式）和Spring本地事务的差异源码对比** 吗？