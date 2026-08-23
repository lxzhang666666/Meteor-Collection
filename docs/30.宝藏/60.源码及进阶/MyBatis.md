---
title: MyBatis 核心源码解析
date: 2026-08-09 14:56:24
permalink: /pages/276aed/
categories:
  - 后端
  - Collection
tags: []
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---

# MyBatis 三大核心深度源码解析

## 一、MyBatis Mapper 动态代理完整源码（MapperProxy、MapperProxyFactory）

### 1. 前置架构认知

MyBatis 的 Mapper 接口本身**没有实现类**，所有接口调用全部由 JDK 动态代理生成代理对象执行。
核心类：

1. `MapperProxyFactory`：代理工厂，负责创建 Mapper 代理实例
2. `MapperProxy`：实现 `InvocationHandler`，JDK 代理回调处理器
3. `MapperMethod`：封装 Mapper 接口单个方法的元信息（SQL类型、参数、返回值、MappedStatementId）
4. `MapperMethodInvoker`：方法调用分发器（区分普通CRUD方法/默认方法/Object方法）

### 2. Mapper 代理对象创建全链路

#### 2.1 入口：SqlSession.getMapper(XXXMapper.class)

```
public <T> T getMapper(Class<T> type) {
    return configuration.getMapper(type, this);
}
```

Configuration 内部持有 `MapperRegistry` 注册器。

#### 2.2 MapperRegistry 注册与获取工厂

```
public class MapperRegistry {
    private final Map<Class<?>, MapperProxyFactory<?>> knownMappers = new HashMap<>();

    // 获取Mapper代理
    public <T> T getMapper(Class<T> type, SqlSession sqlSession) {
        final MapperProxyFactory<T> mapperProxyFactory = (MapperProxyFactory<T>) knownMappers.get(type);
        if (mapperProxyFactory == null) {
            throw new BindingException("Type " + type + " is not known to the MapperRegistry.");
        }
        try {
            return mapperProxyFactory.newInstance(sqlSession);
        } catch (Exception e) {
            throw new BindingException("Error getting mapper instance. Cause: " + e, e);
        }
    }
}
```

Spring 整合时 `MapperScannerConfigurer` 扫描所有 `@Mapper` 接口，提前放入 `knownMappers` 缓存。

#### 2.3 MapperProxyFactory 生成代理（JDK Proxy）

```
public class MapperProxyFactory<T> {
    private final Class<T> mapperInterface;

    public T newInstance(SqlSession sqlSession) {
        final MapperProxy<T> mapperProxy = new MapperProxy<>(sqlSession, mapperInterface, methodCache);
        // JDK动态代理生成接口代理类
        return Proxy.newProxyInstance(mapperInterface.getClassLoader(), new Class[]{mapperInterface}, mapperProxy);
    }
}
```

标准 JDK 动态代理三要素：类加载器、被代理接口数组、InvocationHandler（MapperProxy）。

### 3. 核心执行：MapperProxy.invoke() 逐行拆解

```
public class MapperProxy<T> implements InvocationHandler, Serializable {
    private final SqlSession sqlSession;
    private final Class<T> mapperInterface;
    // 缓存MapperMethod，避免每次反射解析方法
    private final Map<Method, MapperMethod> methodCache;

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // 分支1：Object原生方法（toString/equals/hashCode）直接执行，不走MyBatis
        if (Object.class.equals(method.getDeclaringClass())) {
            return method.invoke(this, args);
        }
        // 分支2：Java8+ 接口默认方法
        else if (method.isDefault()) {
            return invokeDefaultMethod(proxy, method, args);
        }
        // 分支3：真正的Mapper查询/更新方法
        final MapperMethod mapperMethod = cachedMapperMethod(method);
        return mapperMethod.execute(sqlSession, args);
    }

    // 缓存MapperMethod，提升性能
    private MapperMethod cachedMapperMethod(Method method) {
        return methodCache.computeIfAbsent(method, k -> new MapperMethod(mapperInterface, method, sqlSession.getConfiguration()));
    }
}
```

### 4. MapperMethod.execute() 分发SQL操作（重中之重）

`MapperMethod` 内部通过 `SqlCommand` 判断操作类型（SELECT/INSERT/UPDATE/DELETE），调用 SqlSession 对应方法：

```
public Object execute(SqlSession sqlSession, Object[] args) {
    Object result;
    switch (command.getType()) {
        case INSERT: {
            Object param = method.convertArgsToSqlCommandParam(args);
            result = rowCountResult(sqlSession.insert(command.getName(), param));
            break;
        }
        case UPDATE:
            Object param = method.convertArgsToSqlCommandParam(args);
            result = rowCountResult(sqlSession.update(command.getName(), param));
            break;
        case DELETE:
            Object param = method.convertArgsToSqlCommandParam(args);
            result = rowCountResult(sqlSession.delete(command.getName(), param));
            break;
        case SELECT:
            // 根据返回值类型区分：单个对象、集合、分页、游标、Map
            if (method.returnsVoid() && method.hasResultHandler()) {
                executeWithResultHandler(sqlSession, args);
                result = null;
            } else if (method.returnsMany()) {
                result = executeForMany(sqlSession, args);
            } else if (method.returnsMap()) {
                result = executeForMap(sqlSession, args);
            } else if (method.returnsCursor()) {
                result = executeForCursor(sqlSession, args);
            } else {
                Object param = method.convertArgsToSqlCommandParam(args);
                result = sqlSession.selectOne(command.getName(), param);
                if (method.returnsOptional()) {
                    result = Optional.ofNullable(result);
                }
            }
            break;
        case FLUSH:
            result = sqlSession.flushStatements();
            break;
        default:
            throw new BindingException("Unknown execution method for: " + command.getName());
    }
    return result;
}
```

### 5. Mapper 代理完整调用链路总结

```
UserMapper.selectById(1L)
→ JDK代理 MapperProxy.invoke()
→ 缓存获取 MapperMethod
→ MapperMethod.execute() 判断CRUD类型
→ 调用 DefaultSqlSession.selectOne/insert/update/delete
→ SqlSession 调用 Executor（BaseExecutor）
→ 走一级缓存 → JDBC执行SQL → 结果封装返回
```

---

# 二、MyBatis 一级缓存（本地缓存）源码深度解析

## 1. 核心定义

**一级缓存：SqlSession 级别的缓存，默认开启，无法关闭**
底层存储：`BaseExecutor` 内部 `PerpetualCache localCache`，本质是 `HashMap`。

### 2. 核心类结构

```
public abstract class BaseExecutor implements Executor {
    // 一级缓存：当前SqlSession私有缓存
    protected PerpetualCache localCache;
    // 输出参数缓存（存储存储过程OUT参数）
    protected PerpetualCache localOutputParameterCache;

    protected BaseExecutor(Configuration configuration, Transaction transaction) {
        this.localCache = new PerpetualCache("LocalCache");
        this.localOutputParameterCache = new PerpetualCache("LocalOutputParameterCache");
    }
}

// PerpetualCache 实现
public class PerpetualCache implements Cache {
    private final String id;
    private Map<Object, Object> cache = new HashMap<>();
}
```

## 3. 查询缓存命中逻辑：BaseExecutor.query()

```
@Override
public <E> List<E> query(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler) throws SQLException {
    BoundSql boundSql = ms.getBoundSql(parameter);
    // 构建缓存Key（核心）
    CacheKey key = createCacheKey(ms, parameter, rowBounds, boundSql);
    return query(ms, parameter, rowBounds, resultHandler, key, boundSql);
}

@SuppressWarnings("unchecked")
@Override
public <E> List<E> query(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, CacheKey key, BoundSql boundSql) throws SQLException {
    List<E> list;
    // 1. 判断是否刷新缓存（flushCache=true）
    if (queryStack == 0 && ms.isFlushCacheRequired()) {
        clearLocalCache();
    }
    list = resultHandler == null ? (List<E>) localCache.getObject(key) : null;
    // 2. 缓存命中直接返回，不走数据库
    if (list != null) {
        handleLocallyCachedOutputParameters(ms, key, parameter, boundSql);
    } else {
        // 3. 缓存未命中，查询数据库，并写入一级缓存
        list = queryFromDatabase(ms, parameter, rowBounds, resultHandler, key, boundSql);
    }
    queryStack--;
    if (queryStack == 0) {
        // 延迟加载处理
        if (configuration.getLocalCacheScope() == LocalCacheScope.STATEMENT) {
            clearLocalCache();
        }
    }
    return list;
}
```

### 3.1 CacheKey 缓存Key组成（6大要素）

`CacheKey` 由以下内容拼接生成，任意一个不同就判定为不同缓存：

1. MappedStatement 的 id（Mapper方法全限定名）
2. SQL 语句本身
3. 分页参数 RowBounds offset、limit
4. 传入的参数对象
5. 环境 Environment
6. 驱动信息

### 3.2 queryFromDatabase 查库并写入缓存

```
private <E> List<E> queryFromDatabase(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, CacheKey key, BoundSql boundSql) throws SQLException {
    List<E> list;
    localCache.putObject(key, EXECUTION_PLACEHOLDER);
    try {
        // 委托SimpleExecutor/ReuseExecutor/BatchExecutor执行JDBC查询
        list = doQuery(ms, parameter, rowBounds, resultHandler, boundSql);
    } finally {
        localCache.removeObject(key);
    }
    // 放入一级缓存
    localCache.putObject(key, list);
    return list;
}
```

## 4. 一级缓存失效/清空的5种场景（源码对应）

### 场景1：SqlSession 执行 insert/update/delete 任意写操作

```
@Override
public int update(MappedStatement ms, Object parameter) throws SQLException {
    // 执行DML之前清空当前SqlSession全部一级缓存
    clearLocalCache();
    return doUpdate(ms, parameter);
}
```

**原理：写操作必然调用 `clearLocalCache()` 清空 `localCache`，防止脏数据**

### 场景2：手动调用 `sqlSession.clearCache()`

直接执行 `localCache.clear()`

### 场景3：设置 `localCacheScope=STATEMENT`（仅当前语句生效）

全局配置：

```
mybatis:
  configuration:
    local-cache-scope: statement
```

执行完单次查询自动清空缓存，等同于关闭一级缓存。

### 场景4：不同 SqlSession 对象

每个 SqlSession 拥有独立 `BaseExecutor` 和独立 `localCache`，互相隔离，无法共享。

### 场景5：查询时设置 `flushCache=true`

```
<select id="xxx" flushCache="true">
```

执行前直接清空缓存。

## 5. 一级缓存经典坑：循环引用、脏数据

同一个SqlSession内先查询、再手动修改数据库（非MyBatis update方法），再次查询命中一级缓存，拿到旧数据。

---

# 三、MyBatis 二级缓存（全局Mapper级缓存）完整源码

## 1. 基础概念

- **二级缓存：Mapper 命名空间（namespace）级别缓存，多个 SqlSession 共享**
- 默认关闭，需要手动开启：
    1. 全局开启 `cacheEnabled=true`（默认true）
    2. Mapper XML 添加 `<cache/>` 标签
    3. 实体类实现 `Serializable` 序列化接口

### 2. 二级缓存整体架构

1. `CachingExecutor`：二级缓存装饰器，装饰 BaseExecutor，所有查询先走二级缓存
2. `TransactionalCacheManager`：事务缓存管理器，管理事务提交后才刷入二级缓存
3. `TransactionalCache`：事务临时缓存，事务未提交数据不对外可见
4. Cache 接口默认实现 `PerpetualCache`，可替换为 Redis 等第三方缓存

## 3. 入口：CachingExecutor.query() 二级缓存核心逻辑

### 3.1 CachingExecutor 装饰器包装

MyBatis 创建 Executor 时，如果开启二级缓存，用装饰器模式包裹原始 BaseExecutor：

```
public class CachingExecutor implements Executor {
    private final Executor delegate; // 被装饰的底层Executor
    private final TransactionalCacheManager tcm = new TransactionalCacheManager();

    @Override
    public <E> List<E> query(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler) throws SQLException {
        BoundSql boundSql = ms.getBoundSql(parameter);
        CacheKey key = createCacheKey(ms, parameter, rowBounds, boundSql);
        return query(ms, parameter, rowBounds, resultHandler, key, boundSql);
    }

    @Override
    public <E> List<E> query(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, CacheKey key, BoundSql boundSql) throws SQLException {
        Cache cache = ms.getCache();
        // 1. 当前Mapper配置了<cache>才走二级缓存
        if (cache != null) {
            // 判断是否需要刷新二级缓存
            flushCacheIfRequired(ms);
            if (ms.isUseCache() && resultHandler == null) {
                @SuppressWarnings("unchecked")
                List<E> list = (List<E>) tcm.getObject(cache, key);
                // 二级缓存命中，直接返回
                if (list == null) {
                    // 未命中：委托底层Executor查询（会走一级缓存）
                    list = delegate.query(ms, parameter, rowBounds, resultHandler, key, boundSql);
                    // 存入当前事务临时缓存TransactionalCache
                    tcm.putObject(cache, key, list);
                }
                return list;
            }
        }
        // 没有二级缓存，直接走原始执行器（只走一级缓存）
        return delegate.query(ms, parameter, rowBounds, resultHandler, key, boundSql);
    }
}
```

### 3.2 二级缓存事务提交才落地（核心事务隔离机制）

#### TransactionalCacheManager 提交逻辑

```
@Override
public void commit(boolean required) throws SQLException {
    delegate.commit(required);
    // 事务提交后，批量把TransactionalCache数据刷入真正的二级Cache
    tcm.commit();
}

// TransactionalCache.commit()
public void commit() {
    if (clearOnCommit) {
        delegateCache.clear();
    } else {
        // 将事务中put的全部数据放入全局二级缓存
        flushEntries();
    }
    entriesToAddOnCommit.clear();
}
```

**关键规则：**

1. 查询数据先放入 `TransactionalCache` 事务临时缓存；
2. **只有 SqlSession 执行 `commit()` 提交事务，数据才会写入全局二级缓存**；
3. 如果事务 `rollback()` 回滚，临时缓存直接丢弃，不会污染二级缓存；
4. 保证多会话事务隔离，未提交数据对其他SqlSession不可见。

## 4. 二级缓存清空规则（源码 flushCacheIfRequired）

```
private void flushCacheIfRequired(MappedStatement ms) {
    Cache cache = ms.getCache();
    // 执行DML（insert/update/delete）或者设置flushCache=true
    if (cache != null && ms.isFlushCacheRequired()) {
        tcm.clear(cache);
    }
}
```

**只要当前 Mapper namespace 下任意增删改操作，清空整个该命名空间的二级缓存**。

## 5.  标签对应配置参数底层映射

```
<!-- 默认配置 -->
<cache
    eviction="LRU"        <!-- 淘汰策略：LRU/FIFO/SOFT/WEAK -->
    flushInterval="60000" <!-- 自动刷新间隔毫秒 -->
    size="1024"           <!-- 缓存最大存储对象数量 -->
    readOnly="false"      <!-- 只读是否返回拷贝对象 -->
    blocking="false"/>    <!-- 阻塞获取缓存，防止缓存击穿 -->
```

底层对应 `PerpetualCache` 包装各类装饰器：`LruCache`、`ScheduledCache`、`SerializedCache`、`BlockingCache`。

## 6. 二级缓存完整执行时序

1. SqlSessionA 查询 → CachingExecutor 查找二级缓存
2. 未命中 → 调用底层BaseExecutor查询数据库，写入一级缓存 + 事务临时缓存
3. SqlSessionA 执行 commit() → 临时缓存刷入全局二级缓存
4. SqlSessionB 执行相同查询 → CachingExecutor 命中二级缓存，直接返回
5. 同一Mapper任意update/insert → 清空整个namespace二级缓存

---

# 四、一级缓存 vs 二级缓存 完整对比（源码维度）

| 对比项 | 一级缓存（Local Cache） | 二级缓存（Namespace Cache） |
| --- | --- | --- |
| 作用域 | 单个 SqlSession 内部 | Mapper 命名空间，多个SqlSession共享 |
| 默认状态 | **默认开启，不可关闭** | 默认关闭，需`<cache/>`手动开启 |
| 存储载体 | BaseExecutor.PerpetualCache(HashMap) | CachingExecutor + TransactionalCache |
| 清空时机 | 当前Session执行DML、clearCache() | 当前namespace执行任意DML清空全部 |
| 事务关系 | 事务内立即生效 | 事务commit提交后才写入全局缓存 |
| 执行顺序 | 二级缓存未命中 → 查一级缓存 → 查库 | 先查二级缓存，命中直接返回 |
| 共享性 | 会话隔离，无法共享 | 全局Mapper共享 |

### 执行优先级完整链路

**二级缓存 → 一级缓存 → 数据库**

---

# 五、高频面试源码导向问题

## 1. Mapper 接口没有实现类，MyBatis 如何执行？

通过 `MapperProxyFactory` 使用 **JDK动态代理** 生成代理对象，`MapperProxy.invoke` 拦截接口调用，封装为 `MapperMethod` 分发到 SqlSession 的 insert/update/delete/selectOne 方法。

## 2. 一级缓存为什么不能跨SqlSession共享？

一级缓存绑定在 `BaseExecutor` 实例中，每个 SqlSession 新建独立 Executor，拥有独立的 `localCache` HashMap，天然隔离。

## 3. 二级缓存为什么必须事务commit才生效？

为了事务ACID隔离，通过 `TransactionalCache` 做事务暂存，回滚直接丢弃脏数据，只有事务正常提交才刷入全局缓存，避免未提交数据被其他会话读取。

## 4. 同一个Mapper下update为什么清空整个二级缓存？

MyBatis二级缓存粒度是**整个namespace**，源码`CachingExecutor.flushCacheIfRequired`只要当前Mapper任意DML操作，直接clear该Cache，无法精准单条删除。

## 5. 二级缓存 readOnly=true 底层做了什么？

开启后使用 `SerializedCache` 装饰缓存，每次返回对象序列化副本，防止多线程修改缓存中共享对象导致脏数据。

## 6. MyBatis 缓存三大失效场景总结

1. **一级缓存失效**：不同SqlSession、执行DML、手动clearCache、localCacheScope=statement
2. **二级缓存失效**：未加`<cache/>`、实体未序列化、跨namespace更新、事务未commit
3. **共同失效**：SQL参数不同、分页不同、MappedStatementId不同（CacheKey不一致）

## 7. Spring 整合后一级缓存失效的经典原因？

Spring 事务管理中，**每次查询都会获取新的 SqlSession**（非事务方法），导致一级缓存无法复用；只有在同一个 `@Transactional` 事务内，共用同一个 SqlSession，一级缓存才生效。

---

# 极简背诵总结

1. **Mapper代理**：MapperRegistry注册接口 → MapperProxyFactory生成JDK代理 → MapperProxy拦截调用 → MapperMethod分发CRUD到SqlSession；
2. **一级缓存**：SqlSession私有HashMap缓存，BaseExecutor维护，DML自动清空，会话隔离；
3. **二级缓存**：CachingExecutor装饰器实现，Mapper命名空间共享，事务提交才落地，namespace级整体清空；
4. **执行顺序**：二级缓存 → 一级缓存 → DB；Spring非事务环境一级缓存基本无效。
