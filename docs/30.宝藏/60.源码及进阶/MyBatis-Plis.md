---
title: MyBatis-Plus 核心源码拆解
date: 2026-08-09 14:56:24
permalink: /pages/612345/
categories:
  - 后端
  - Collection
tags: []
author: 
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---

# MyBatis-Plus 完整核心源码拆解 + 架构体系 + 高频面试考点

## 一、整体架构总览（先建立顶层认知）

MyBatis-Plus（简称 MP）本质是 **MyBatis 的增强工具，只做增强不做修改**，完全兼容原生 MyBatis 所有特性。

### 核心分层结构

1. **自动注入层（最核心）**
   `AutoSqlInjector`：扫描实体类，自动生成 CRUD 的 Mapper 方法对应的 SQL（insert、deleteById、selectById、updateById、list、page 等），注入到 MyBatis `Configuration` 的 `MappedStatement`。
2. **BaseMapper / Mapper 父接口层**
   `BaseMapper<T>`：预置 17+ 通用单表操作方法；
   `Mapper` 顶层标记接口，自定义 Mapper 继承 `BaseMapper` 即可拥有所有内置方法。
3. **Service 封装层（简化业务层）**
   `ServiceImpl`（实现类）+ `IService`（接口）：对 BaseMapper 再做一层封装，自带批量保存、链式调用、分页条件构造器包装，减少 Service 重复代码。
4. **条件构造器 Wrapper 层**
   `QueryWrapper` / `LambdaQueryWrapper` / `UpdateWrapper` / `LambdaUpdateWrapper`：动态拼接 SQL Where、Order By、Set 语句，替代 XML 大量动态 `<if>`。
5. **分页插件 & 插件体系**
   `MybatisPlusInterceptor` 统一插件入口，内置分页、乐观锁、防止全表更新、租户多表、SQL 性能分析、字段填充等内置插件，基于 MyBatis `Interceptor` 拦截器实现。
6. **注解与元数据解析层**
   `TableInfoHelper`：解析实体 `@TableName`、`@TableId`、`@TableField`、`@Version`、`@TableLogic` 等注解，封装 `TableInfo` 表元数据（表名、主键、字段映射、逻辑删除、乐观锁字段）。

---

# 二、核心模块1：自动SQL注入 AutoSqlInjector（MP灵魂）

## 2.1 执行时机

在 Spring 容器启动、MyBatis 初始化 `SqlSessionFactory` 之后，MP 的 `MybatisPlusAutoConfiguration` 会触发 `GlobalConfigUtils` 调用 `AutoSqlInjector.inject()`。
MyBatis 运行靠 `MappedStatement` 存储每一条 SQL 语句，MP 就是批量往 `Configuration` 里批量新增 MappedStatement。

### 简化源码流程

```
public class AutoSqlInjector extends AbstractSqlInjector {

    // 定义要注入的所有内置方法
    @Override
    public List<AbstractMethod> getMethodList(Class<?> mapperClass) {
        return Arrays.asList(
                new Insert(),
                new Delete(),
                new DeleteById(),
                new UpdateById(),
                new SelectById(),
                new SelectList(),
                new SelectPage(),
                new SelectCount(),
                // ... 共17个内置CRUD方法
        );
    }

    // 核心注入入口
    @Override
    public void inject(SqlInjectorConfig config) {
        Configuration configuration = config.getConfiguration();
        Class<?> mapperClass = config.getMapperClass();
        TableInfo tableInfo = TableInfoHelper.getTableInfo(config.getEntityClass());

        // 遍历每一个内置方法类，生成MappedStatement注册到MyBatis全局配置
        for (AbstractMethod method : getMethodList(mapperClass)) {
            method.inject(configuration, mapperClass, tableInfo);
        }
    }
}
```

## 2.2 单个方法注入示例：SelectById

以根据ID查询为例 `SelectById extends AbstractMethod`

```
@Override
public MappedStatement injectMappedStatement(Class<?> mapperClass, Class<?> modelClass, TableInfo tableInfo) {
    // 1. 拼接原生SQL：SELECT id,name,age FROM user WHERE id = ?
    String sql = String.format("SELECT %s FROM %s WHERE %s = #{id}",
            tableInfo.getSelectColumn(),
            tableInfo.getTableName(),
            tableInfo.getKeyColumn());

    // 2. 构建SqlSource
    SqlSource sqlSource = languageDriver.createSqlSource(configuration, sql, modelClass);

    // 3. 添加到MyBatis Configuration，MappedStatement的id = Mapper全类名.selectById
    return addSelectMappedStatementForSingle(mapperClass, getMethod(sqlMethod), sqlSource, modelClass);
}
```

### 关键结论

1. 我们写 `UserMapper extends BaseMapper<User>` 不用写 XML，MP 在启动阶段已经把 `selectById`、`insert` 等 SQL 注册进 MyBatis；
2. 自定义全局注入器：继承 `DefaultSqlInjector` 重写 `getMethodList`，可以新增自定义通用方法（例如逻辑删除批量恢复）。

---

# 三、核心模块2：TableInfoHelper 实体注解解析机制

## 3.1 解析的注解清单

| 注解 | 作用 |
| --- | --- |
| `@TableName("sys_user")` | 指定数据库表名，schema、resultMap、autoResultMap |
| `@TableId(type = IdType.AUTO)` | 主键策略：自增、雪花ID、UUID、ASSIGN_ID |
| `@TableField("user_name")` | 字段映射、忽略字段、fill自动填充 |
| `@Version` | 乐观锁版本号字段标记 |
| `@TableLogic` | 逻辑删除标记（0未删，1已删） |
| `@EnumValue` | 枚举数据库存储值映射 |

## 3.2 TableInfo 封装的信息

```
public class TableInfo {
    // 表名
    private String tableName;
    // 主键字段信息 TableFieldInfo
    private TableFieldInfo pkColumn;
    // 所有普通字段列表
    private List<TableFieldInfo> fieldList;
    // 逻辑删除字段名、未删除值、已删除值
    private String logicDeleteField;
    private String logicDeleteValue;
    private String logicNotDeleteValue;
    // 乐观锁版本字段
    private String versionColumn;
}
```

## 3.3 自动主键策略 IdType 底层实现

1. **AUTO**：数据库自增，依赖数据库主键
2. **ASSIGN_ID（默认雪花算法）**
   `IdentifierGenerator` 顶层接口，默认实现 `DefaultIdentifierGenerator`，调用雪花算法生成 64 位 Long 唯一ID；
   可自定义 `identifierGenerator` Bean 重写生成规则。
3. **ASSIGN_UUID**：32位 UUID 字符串

---

# 四、核心模块3：Wrapper 条件构造器（SQL动态拼接核心）

## 4.1 四类 Wrapper 职责

1. **QueryWrapper**：字符串列名，用于 SELECT、DELETE
2. **LambdaQueryWrapper**：Lambda 函数式，防止字段名硬编码写错（`User::getUserName`）
3. **UpdateWrapper**：用于 UPDATE SET + WHERE 条件
4. **LambdaUpdateWrapper**：Lambda 版本更新构造器

## 4.2 底层执行原理

`Wrapper` 最终会被 MP 的 `AbstractMethod` 在注入 SQL 时解析，拼接成 `SqlSource`，本质还是 MyBatis 的动态 SQL。
简化执行链路：

```
mapper.selectList(lambdaQueryWrapper)
→ BaseMapper.selectList(Wrapper)
→ MP内置的SelectList AbstractMethod
→ Wrapper.getSqlSegment() 拼接 WHERE 后的条件字符串
→ 组装完整SQL执行
```

### Lambda 防误写原理

`LambdaQueryWrapper` 通过序列化 `User::getAge` 拿到方法名，反射匹配实体字段，再映射数据库列名，避免手写字符串 `age` 拼写错误。

## 4.3 链式调用原理

每个 `eq()`、`like()`、`ge()` 方法 `return this`，返回自身对象，实现流式链式写法。

---

# 五、核心模块4：ServiceImpl & IService 业务层封装

很多人分不清 `BaseMapper` 和 `ServiceImpl` 的区别：

1. **BaseMapper**：DAO 层，只做单表数据库操作，粒度最细；
2. **IService + ServiceImpl**：Service 层，对 Mapper 二次封装，增加批量、分页包装、链式操作、事务包装。

## 5.1 典型封装能力

```
// 批量新增（循环调用mapper.insert，可配置批量批次大小）
saveBatch(Collection<T> entityList)
// 批量新增优化（拼接INSERT INTO VALUES (...),(...) 一条SQL）
saveBatch(Collection<T> entityList, int batchSize)
// Lambda链式查询
lambdaQuery().eq(User::getId,1).getOne()
// 链式更新
lambdaUpdate().set(...).eq(...).update()
```

## 5.2 继承规范

```
// 1. 接口
public interface UserService extends IService<User> {}

// 2. 实现类
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {}
```

底层 `ServiceImpl` 内部持有 `protected M baseMapper`，直接调用 Mapper 方法，只是做上层封装。

---

# 六、核心模块5：MybatisPlusInterceptor 统一插件体系（MyBatis 拦截器）

MP 3.4.0+ 废弃大量独立拦截器，统一入口：`MybatisPlusInterceptor`，基于 MyBatis `Interceptor` 四大拦截点（Executor、StatementHandler、ParameterHandler、ResultSetHandler）实现。

## 6.1 常用内置插件

```
@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor() {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    // 1. 分页插件（最核心）
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
    // 2. 乐观锁插件
    interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());
    // 3. 防止全表更新/删除插件（阻断 update(null)、remove(null)）
    interceptor.addInnerInterceptor(new BlockAttackInnerInterceptor());
    // 4. 多租户插件（SQL自动拼接 tenant_id = ?）
    interceptor.addInnerInterceptor(new TenantLineInnerInterceptor());
    // 5. 逻辑删除本质也在此处做SQL改写
    return interceptor;
}
```

### 重点1：分页插件 PaginationInnerInterceptor 源码原理

1. 拦截 MyBatis `Executor.query` 方法；
2. 判断入参是否有 `Page` 对象；
3. 自动改写原始 SQL：
    - 原 SQL：`SELECT * FROM user WHERE name = ?`
    - 改写后：`SELECT COUNT(1) FROM user WHERE name = ?`（查总条数）
    - 再执行 `SELECT * FROM user LIMIT ?,?`（分页数据）
4. 封装总记录数、总页数、当前页到 `Page` 返回；
   **注意**：MP 分页插件必须配置，否则 `page()` 方法只会查询全部数据，分页不生效。

### 重点2：乐观锁插件 OptimisticLockerInnerInterceptor

1. 实体字段加 `@Version`；
2. 更新时自动拼接 SQL：

```
UPDATE user SET name=?, version = version+1 WHERE id=? AND version=?
```

3. 更新影响行数为 0 时，抛出 `OptimisticLockingFailureException`，由业务层重试处理。

### 重点3：逻辑删除底层改写

全局配置 `global-config.db-config.logic-delete-field=deleted`，MP 在所有 `delete` 方法拦截改写：

- 原 DELETE → 改写为 UPDATE 逻辑删除 SQL；
- 所有 `select` 查询自动追加 `WHERE deleted = 0` 条件；
  本质也是拦截 MappedStatement 改写 SQL。

---

# 七、核心模块6：自动字段填充 MetaObjectHandler

## 7.1 使用场景

创建人、创建时间、更新人、更新时间自动填充，不用手动 set。

```
@Component
public class MyMetaObjectHandler implements MetaObjectHandler {
    @Override
    public void insertFill(MetaObject metaObject) {
        strictInsertFill(metaObject, "createTime", LocalDateTime::now, LocalDateTime.class);
        strictInsertFill(metaObject, "updateTime", LocalDateTime::now, LocalDateTime.class);
    }
    @Override
    public void updateFill(MetaObject metaObject) {
        strictUpdateFill(metaObject, "updateTime", LocalDateTime::now, LocalDateTime.class);
    }
}
```

## 7.2 底层原理

实现 MyBatis 原生 `MetaObjectHandler`，在 `insert` / `update` 执行前拦截 `MetaObject` 对象，反射给实体属性赋值，属于 MyBatis 原生钩子扩展。
实体字段标记：`@TableField(fill = FieldFill.INSERT)`。

---

# 八、MP 启动自动装配流程（SpringBoot 自动配置）

1. 依赖引入 `mybatis-plus-boot-starter`；
2. `META-INF/spring.factories` 加载 `MybatisPlusAutoConfiguration`；
3. 自动注册核心 Bean：
    - `MybatisPlusProperties` 配置类（读取yml配置）
    - `SqlSessionFactory` 增强版 `MybatisPlusSqlSessionFactoryBean`
    - `AutoSqlInjector` 自动注入器
    - `MapperScannerConfigurer` 扫描 `@Mapper` 接口
    - `MybatisPlusInterceptor` 插件管理器
4. 扫描所有 Mapper 接口，启动时执行 SQL 自动注入。

---

# 九、MyBatis-Plus 大厂高频面试题（源码导向）

## 1. MyBatis-Plus 和原生 MyBatis 的区别？

1. MP 增强不修改，完全兼容 MyBatis XML、注解、插件；
2. MP 启动自动注入通用 CRUD 的 MappedStatement，省去基础 XML；
3. 提供 Wrapper 条件构造器简化动态 SQL；
4. 封装 Service 层、内置分页、乐观锁、逻辑删除、多租户等通用插件；
5. 内置主键生成器、字段自动填充、枚举映射等工程化能力。

## 2. BaseMapper 的方法是怎么来的？为什么不用写 XML？

启动时 `AutoSqlInjector` 扫描实体，遍历所有内置 CRUD 方法类，动态拼接 SQL 并注册到 MyBatis `Configuration` 的 `MappedStatement` 中，运行时直接执行。

## 3. LambdaQueryWrapper 如何通过函数式拿到数据库字段名？

通过序列化 `SerializedLambda` 解析方法签名 `getUserName` → 截取 `userName`，再通过 `TableInfo` 映射 `@TableField` 注解对应的数据库列名，避免字符串硬编码错误。

## 4. MP 分页插件底层原理，为什么不配置插件分页失效？

拦截 MyBatis Executor 查询方法，自动生成 count 总条数 SQL + limit 分页 SQL；
未配置 `PaginationInnerInterceptor` 时，MP 无法改写 SQL，只会查询全表数据，Page 对象 total=0。

## 5. 逻辑删除底层怎么实现的？可以自己改写SQL吗？

通过全局配置开启后，MP 在执行 delete 时拦截并改写为 UPDATE 语句，所有 select 自动拼接未删除条件；
可自定义 `ISqlInjector` 或者拦截器改写逻辑删除 SQL。

## 6. 乐观锁 `@Version` 实现机制？并发更新失败怎么处理？

插件拦截 update 语句，自动追加 `version = version +1 AND version = 旧版本号`；
返回受影响行数为0代表并发冲突，抛出异常，业务层手动重试即可。

## 7. ServiceImpl 和 BaseMapper 层级区别？

- BaseMapper：DAO 层，直接操作数据库，最小粒度；
- ServiceImpl：业务层封装，提供批量操作、链式调用、事务包装，依赖 BaseMapper 执行数据库操作。

## 8. MP 主键生成策略 ASSIGN_ID 雪花算法源码在哪？

顶层接口 `IdentifierGenerator`，默认实现 `DefaultIdentifierGenerator`，可自定义 Bean 替换ID生成规则。

## 9. Wrapper 能否和 XML 自定义 SQL 混用？

可以。XML 中使用 `${ew.customSqlSegment}` 接收 Wrapper 拼接的 WHERE 条件，实现复杂SQL+动态条件组合。

## 10. MP 插件执行顺序？如何自定义 InnerInterceptor？

`MybatisPlusInterceptor` 按添加顺序执行内部拦截器；自定义类实现 `InnerInterceptor`，重写 `beforeQuery` / `beforeUpdate` 等方法即可扩展。

---

# 十、极简背诵总结

1. **核心灵魂**：`AutoSqlInjector` 启动注入 CRUD 的 MappedStatement；
2. **元数据解析**：`TableInfoHelper` 解析实体注解，封装表、主键、逻辑删除、乐观锁信息；
3. **条件构造器**：Wrapper 动态拼接 SQL，Lambda 版本规避字段硬编码；
4. **插件统一入口**：`MybatisPlusInterceptor` 管理分页、乐观锁、防全表更新、多租户；
5. **分层封装**：BaseMapper(DAO) + ServiceImpl(业务层) 两级封装；
6. **自动装配**：SpringBoot `MybatisPlusAutoConfiguration` 完成所有Bean初始化。

需要我继续往下拆解：

1. **MP 多租户插件 SQL 改写完整源码**
2. 或者 **MP 自定义全局SQL注入器，新增自定义通用方法实战**
3. 或者对比 MyBatis、MP、MyBatis-Flex 三者差异吗？