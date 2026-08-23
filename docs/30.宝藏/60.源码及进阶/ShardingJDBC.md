---
title: Sharding-JDBC 完整解析
date: 2026-08-09 14:56:24
permalink: /pages/68cdfe/
categories:
  - 后端
  - Collection
tags: []
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---

# Sharding-JDBC 完整版深度解析

## 总大纲

1. 基础概念 + 业务场景引入（订单/用户/订单项三张真实表结构）
2. SpringBoot 全场景可运行配置（单库分表、分库分表、绑定表JOIN、读写分离）
3. 内置分片算法+落地场景对比
4. 底层5大执行流程（每一步配SQL案例拆解）
5. 跨库跨表查询、跨表JOIN完整原理 + 绑定表实战（重点新增）
6. 源码模块拆解（5.x）
7. 分布式事务落地
8. 生产踩坑&最佳实践
9. 全套面试题+标准答案

---

## 一、前置：业务场景与数据库表结构（贯穿全文所有案例）

### 业务背景

电商订单模块3张核心表，做分库分表：

1. `t_user` 用户主表（按 `user_id` 分片）
2. `t_order` 订单主表（按 `user_id` 分片，核心分片表）
3. `t_order_item` 订单子项/商品明细（订单从表，和t_order做绑定表JOIN）

### 1. t_user 用户表结构

```
CREATE TABLE t_user (
    id BIGINT COMMENT '雪花全局主键',
    user_id BIGINT COMMENT '分片键',
    username VARCHAR(50),
    phone VARCHAR(20),
    create_time DATETIME
);
```

### 2. t_order 订单主表结构（核心分片表）

```
CREATE TABLE t_order (
    order_id BIGINT COMMENT '全局唯一订单号（雪花ID）',
    user_id BIGINT COMMENT 【分片键】,
    order_amount DECIMAL(10,2),
    pay_status TINYINT,
    create_time DATETIME
);
```

### 3. t_order_item 订单明细表（子表，需要和t_order关联JOIN）

```
CREATE TABLE t_order_item (
    item_id BIGINT,
    order_id BIGINT,
    user_id BIGINT COMMENT 【必须和主表分片键一致】,
    product_id BIGINT,
    product_num INT,
    item_amount DECIMAL(10,2)
);
```

### 分片规则约定（下文所有配置统一沿用）

- 分片键统一：`user_id`
- 分库：2个物理库 `db0`、`db1`
- 每个库内分8张表：`_0 ~ _7`
- 分库算法：`user_id % 2`
- 分表算法：`user_id % 8`

>
> 核心约束：`t_order` 和 `t_order_item` **分片键、分片数量、分片算法完全一致**，才能配置绑定表实现同库内JOIN。

---

## 二、依赖基础（SpringBoot3 + ShardingSphere 5.4.1）

```
<!-- Sharding-JDBC 5.x 核心starter -->
<dependency>
    <groupId>org.apache.shardingsphere</groupId>
    <artifactId>shardingsphere-jdbc-core-spring-boot-starter</artifactId>
    <version>5.4.1</version>
</dependency>
<!-- MySQL8驱动 -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
<!-- Druid连接池 -->
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>druid-spring-boot-starter</artifactId>
    <version>1.2.20</version>
</dependency>
<!-- MyBatis/MyBatis-Plus 正常引入即可，无任何修改 -->
```

---

## 三、四种实战配置（带JOIN绑定表完整版）

### 配置1：分库分表 + 绑定表（解决t_order JOIN t_order_item跨表关联，最核心）

```
spring:
  shardingsphere:
    # 1. 定义所有物理数据源 db0 db1
    datasource:
      names: db0,db1
      db0:
        type: com.alibaba.druid.pool.DruidDataSource
        driver-class-name: com.mysql.cj.jdbc.Driver
        url: jdbc:mysql://127.0.0.1:3306/db0?useUnicode=true&serverTimezone=Asia/Shanghai
        username: root
        password: root
      db1:
        type: com.alibaba.druid.pool.DruidDataSource
        driver-class-name: com.mysql.cj.jdbc.Driver
        url: jdbc:mysql://127.0.0.1:3306/db1?useUnicode=true&serverTimezone=Asia/Shanghai
        username: root
        password: root

    rules:
      sharding:
        # 重点：绑定表配置（t_order 和 t_order_item 绑定）
        binding-tables: t_order,t_order_item
        # 广播表（全库都存在的表，如字典表、配置表）
        broadcast-tables: t_dict

        # 第一张逻辑表：t_order
        tables:
          t_order:
            # 真实节点表达式：db0.t_order_0~7 、db1.t_order_0~7
            actual-data-nodes: $->{db0,db1}.t_order_$->{0..7}
            # 分库策略
            database-strategy:
              standard:
                sharding-column: user_id
                sharding-algorithm-name: db_mod_2
            # 分表策略
            table-strategy:
              standard:
                sharding-column: user_id
                sharding-algorithm-name: table_mod_8

          # 第二张逻辑表：t_order_item 子表
          t_order_item:
            actual-data-nodes: $->{db0,db1}.t_order_item_$->{0..7}
            database-strategy:
              standard:
                sharding-column: user_id
                sharding-algorithm-name: db_mod_2
            table-strategy:
              standard:
                sharding-column: user_id
                sharding-algorithm-name: table_mod_8

        # 定义分片算法
        algorithms:
          db_mod_2:
            type: MOD
            props:
              sharding-count: 2
          table_mod_8:
            type: MOD
            props:
              sharding-count: 8

    # 开启SQL打印，调试看改写后的真实SQL
    props:
      sql-show: true
      sql-comment-parse-enabled: true
```

#### 绑定表生效后JOIN执行案例

业务SQL（代码只写逻辑表）

```
SELECT o.order_id,o.order_amount,i.product_num
FROM t_order o
JOIN t_order_item i ON o.order_id = i.order_id
WHERE o.user_id = 10086;
```

1. 解析拿到 `user_id=10086`；
2. 计算：10086 % 2 = 0 → 路由到 `db0`；10086%8=6 → 路由到后缀6的表；
3. SQL改写为：

```
SELECT o.order_id,o.order_amount,i.product_num
FROM db0.t_order_6 o
JOIN db0.t_order_item_6 i ON o.order_id = i.order_id
WHERE o.user_id = 10086;
```

✅ **同库同下标表内JOIN执行，无跨库JOIN，完全支持**

#### 如果不配置binding-tables会怎样？

Sharding-JDBC 无法保证两张表落在同一个分片，会直接抛出**跨库JOIN不支持异常**。

---

### 配置2：单库分表简化版（仅db0库拆分8张订单表）

```
spring:
  shardingsphere:
    datasource:
      names: db0
      db0:
        url: jdbc:mysql://127.0.0.1:3306/db0
    rules:
      sharding:
        tables:
          t_order:
            actual-data-nodes: db0.t_order_$->{0..7}
            table-strategy:
              standard:
                sharding-column: user_id
                sharding-algorithm-name: mod8
        algorithms:
          mod8:
            type: MOD
            props:
              sharding-count: 8
    props:
      sql-show: true
```

### 配置3：读写分离 + 分表组合（主写从读）

```
spring:
  shardingsphere:
    datasource:
      names: db_master,db_slave
      db_master: # 主库写入
        url: jdbc:mysql://127.0.0.1:3306/db0
      db_slave: # 从库查询
        url: jdbc:mysql://127.0.0.1:3307/db0
    rules:
      # 读写分离规则
      readwrite-splitting:
        data-sources:
          db0:
            write-data-source-name: db_master
            read-data-source-names: [db_slave]
            load-balancer-name: round_robin
        load-balancers:
          round_robin:
            type: ROUND_ROBIN
      # 下方追加t_order分表规则同上省略
```

规则：

- `INSERT/UPDATE/DELETE` 强制走主库；
- `SELECT` 负载均衡走从库，分担查询压力。

### 配置4：自定义分片算法（按业务规则路由）

比如根据用户ID区间路由不同库，实现冷热数据分离

```
import org.apache.shardingsphere.sharding.algorithm.sharding.standard.StandardShardingAlgorithm;

public class CustomUserIdShardingAlgorithm implements StandardShardingAlgorithm<Long> {

    @Override
    public String doSharding(Collection<String> availableTargetNames, ShardingValue<Long> shardingValue) {
        Long userId = shardingValue.getValue();
        // 自定义分库逻辑：0-50000进db0，其余db1
        String dbSuffix = userId <= 50000 ? "db0" : "db1";
        return dbSuffix;
    }
}
```

yml引用：

```
algorithms:
  custom_user_rule:
    type: CLASS_BASED
    props:
      strategy-class-name: com.xxx.algorithm.CustomUserIdShardingAlgorithm
```

---

## 四、5大类内置分片算法 + 适用场景（配案例）

1. **MOD 取模算法（默认最常用）**
   公式：`分片键 % 分片总数`
   案例：`user_id % 8` 分8张表；优点：计算快、分布均匀；缺点：扩容数据大量迁移。
2. **HASH_MOD 哈希取模**
   适用字符串分片键（手机号、账号），先哈希再取模。
3. **RANGE 范围分片**
   案例：订单ID 1~~100万放t_order_0，100万~~200万放t_order_1；适合流水有序自增主键。
4. **MONTH/YEAR 时间分片**
   日志表按 `create_time` 按月分表 `t_operate_log_202608`，归档清理超方便。
5. **CONSISTENT_HASH 一致性哈希**
   解决MOD扩容痛点，新增分片节点仅迁移少量数据；生产分库扩容首选。

---

## 五、Sharding-JDBC 五大执行核心流程（带SQL案例逐环节演示）

以这条业务SQL为例全程拆解：

```
SELECT * FROM t_order WHERE user_id = 10086 ORDER BY create_time DESC LIMIT 0,10;
```

### 第1层：SQL解析引擎 Parsing

1. 自研Parser把SQL转成AST抽象语法树；
2. 提取关键信息：逻辑表`t_order`、分片键`user_id`、等值条件`10086`、排序、分页；
3. 判断：**等值分片键 → 精准路由**，不是广播查询。

### 第2层：路由引擎 Route（核心）

执行计算：

- 分库：10086 % 2 = 0 → 目标库 `db0`
- 分表：10086 % 8 = 6 → 目标表 `t_order_6`
  输出路由上下文：只需要执行 `db0.t_order_6` 一张表。

### 第3层：SQL改写引擎 Rewrite

替换逻辑表为真实物理表，改写分页/排序语句：

```
SELECT * FROM db0.t_order_6 WHERE user_id = 10086 ORDER BY create_time DESC LIMIT 0,10;
```

### 第4层：执行引擎 Execute

通过装饰后的`ShardingDataSource`获取db0连接，执行单条SQL，返回ResultSet。

### 第5层：结果归并引擎 Merge

单表无需合并，直接封装结果返回给MyBatis。

---

## 六、重点扩展：跨表/跨库广播查询完整原理（多场景举例）

### 场景1：不带分片键全表统计（触发广播路由）

SQL：`SELECT COUNT(*) FROM t_order;`

1. 解析：WHERE无分片键，判定**全分片广播路由**；
2. 路由：生成db0.t_order_0~~7、db1.t_order_0~~7 共16条SQL；
3. 执行引擎线程池并行向16张表查询count值；
4. **归并引擎聚合**：把16个count数值累加，返回总订单数。

### 场景2：跨表全局分页（大坑点演示）

SQL：`SELECT * FROM t_order ORDER BY create_time DESC LIMIT 10000,10`
底层执行逻辑：

1. 所有16张分片表各自执行 `LIMIT 10000,10`；
2. 归并引擎把16批共160条数据全部加载到内存；
3. 内存全局重新排序，截取第10000之后10条；
   致命缺陷：偏移量越大，内存占用越高，生产严禁使用大offset分页。
   ✅ 优化方案：主键游标分页

```
SELECT * FROM t_order WHERE order_id > 上一页最大ID LIMIT 10;
```

### 场景3：GROUP BY 分组聚合

```
SELECT pay_status,COUNT(*) FROM t_order GROUP BY pay_status;
```

归并引擎逻辑：

1. 每张表各自分组统计；
2. 内存用Map按pay_status做key二次累加汇总，输出最终分组结果。

### 场景4：不支持的JOIN场景（反面案例）

```
-- t_order在db0/db1分片，t_user未做绑定，跨库JOIN直接报错
SELECT * FROM t_order o JOIN t_user u ON o.user_id = u.user_id;
```

原因：两张表分片规则不一致，无法保证落在同一个库，ShardingSphere禁止跨库关联。
解决方案：

1. t_user也按user_id做相同分片，配置binding-tables；
2. 订单表冗余username、phone等字段，避免JOIN查询。

---

## 七、5.x 源码核心模块拆解（对应执行流程）

```
org.apache.shardingsphere
├── parser        SQL AST解析器 SQLParserEngine
├── route         路由计算 ShardingRouteEngine（最核心）
├── rewrite       SQL表名替换 SQLRewriteEngine
├── executor     JDBC装饰器执行引擎 ShardingDataSource入口
├── merger        结果集归并 ResultMergeEngine（跨表聚合全部在这里）
├── algorithm     分片算法抽象接口 StandardShardingAlgorithm
├── transaction   分布式事务XA/Seata AT实现
```

### 核心设计模式：装饰器模式（无侵入关键）

重写全套JDBC标准接口：

- `ShardingDataSource implements DataSource`
- `ShardingConnection implements Connection`
- `ShardingPreparedStatement implements PreparedStatement`
  业务层依旧使用MyBatis、JdbcTemplate，零代码改动。

---

## 八、分布式事务落地（分库分表一致性）

### 三种事务模式

1. **LOCAL（默认）**
   仅单个库保证ACID，跨库DML直接失效，数据不一致。
2. **XA 2PC强一致性**
   JTA标准两阶段提交，性能损耗极大，并发场景禁用。
3. **BASE + Seata AT 最终一致性（生产唯一推荐）**
   yml开启配置：

```
spring:
  shardingsphere:
    transaction:
      default-type: BASE
      provider-type: Seata
```

原理：执行业务SQL记录undo_log快照，全局事务失败自动回滚，性能远优于XA。

---

## 九、生产高频坑点+最佳实践（结合订单场景）

1. **禁止更新分片键 user_id**
   `UPDATE t_order SET user_id=20000 WHERE order_id=xxx`，数据不会自动迁移到新分片，查询丢失；解决：先删旧分片数据，再插入新分片。
2. 所有业务查询强制携带分片键user_id，杜绝全分片广播。
3. MOD算法初期预估数据量，优先使用一致性哈希方便扩容。
4. 绑定表主从表必须：分片键相同、分片数量相同、算法相同。
5. 分表主键必须全局唯一：雪花算法/Redis自增/Seata ID，避免自增主键重复。
6. 统计报表不走在线跨表COUNT，通过Binlog同步到ClickHouse做离线分析。

---

## 十、完整版面试题+标准答案（带场景举例）

### 基础题

1. Q：逻辑表、真实表、分片键用订单场景解释？
   A：代码写的`t_order`是逻辑表；库中`db0.t_order_6`是真实物理表；`user_id`用来计算路由就是分片键。
2. Q：Sharding-JDBC和MyCat区别？
   A：JDBC嵌入Jar无独立进程，Java专用，性能损耗低；MyCat独立中间件，跨语言可用，多一层网络转发，运维成本更高。

### 原理核心题

3. Q：五大执行流程是什么，用JOIN订单SQL举例？
   A：SQL解析AST提取分片键→路由计算db0.t_order_6→改写真实表名→同库执行JOIN→结果直接返回。
4. Q：精准路由和广播路由触发场景？
   A：WHERE带分片键等值查询=精准单表执行；无分片键、统计、全局分页=广播全表执行。
5. Q：绑定表Binding Tables作用和约束？
   A：解决t_order JOIN t_order_item同库内关联；约束：分片键、算法、分片总数完全一致。

### 源码&生产题

6. Q：跨表大偏移分页为什么性能差？怎么优化？
   A：所有分片全部查询大量数据加载进内存合并；优化：雪花ID游标分页`where order_id > lastId limit 10`。
7. Q：修改分片键会产生什么问题？
   A：数据留在旧分片表，新分片查询不到，业务层手动删插迁移。
8. Q：分库分表分布式事务三种模式，推荐哪种？
   A：LOCAL单库使用，XA性能差淘汰，跨库统一用Seata AT BASE最终一致性。
9. Q：哪些SQL不支持执行？
   A：跨不同库逻辑表JOIN、存储过程、触发器、多表批量UPDATE、自定义函数等。

### 拔高架构题

10. Q：电商订单分库分表完整落地架构？
    A：1）垂直分库：订单库、用户库、支付库拆分；2）订单表user_id一致性哈希32库8表；3）读写分离主写从读；4）雪花全局ID；5）绑定表保证主单子表JOIN；6）报表同步ClickHouse；7）Seata AT跨库事务兜底；8）定时任务Binlog对账校验数据一致性。

---
# SpringBoot 完整使用与配置（5 种常用场景）

依赖版本（5.x 最新稳定版，基于 SpringBoot3）

```
<!-- Sharding-JDBC 核心依赖 -->
<dependency>
    <groupId>org.apache.shardingsphere</groupId>
    <artifactId>shardingsphere-jdbc-core-spring-boot-starter</artifactId>
    <version>5.4.1</version>
</dependency>
<!-- MySQL驱动 + Druid连接池 -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>druid-spring-boot-starter</artifactId>
    <version>1.2.20</version>
</dependency>
```

## 场景 1：单库分表（最常用，水平分表）

需求：db0 库下 t_order 拆为 t_order_0 ~ t_order_7 共 8 张表，分片键 `user_id` 取模 8 分片

```
spring:
  shardingsphere:
    # 数据源配置
    datasource:
      names: db0
      db0:
        type: com.alibaba.druid.pool.DruidDataSource
        driver-class-name: com.mysql.cj.jdbc.Driver
        url: jdbc:mysql://127.0.0.1:3306/db0?useUnicode=true
        username: root
        password: root
    # 分片规则
    rules:
      sharding:
        tables:
          # 逻辑表名
          t_order:
            # 真实表：db0.t_order_0 到 db0.t_order_7
            actual-data-nodes: db0.t_order_$->{0..7}
            # 分表策略
            table-strategy:
              standard:
                sharding-column: user_id
                sharding-algorithm-name: user-mod8
        # 分片算法定义
        algorithms:
          user-mod8:
            type: MOD
            props:
              sharding-count: 8
    props:
      sql-comment-parse-enabled: true
      sql-show: true # 打印最终改写后的真实SQL，调试必备
```

- `MOD` 取模算法：`user_id % 8 = 下标`；
- `sql-show: true` 可以在控制台看到 Sharding-JDBC 改写后的 SQL，排查路由问题神器。

## 场景 2：分库 + 分表（水平分库分表）

2 个库 db0、db1，每个库内部再分 8 张订单表，`user_id` 先分库再分表

```
spring:
  shardingsphere:
    datasource:
      names: db0,db1
      db0:
        url: jdbc:mysql://127.0.0.1:3306/db0
        username: root
      db1:
        url: jdbc:mysql://127.0.0.1:3306/db1
        username: root
    rules:
      sharding:
        tables:
          t_order:
            actual-data-nodes: $->{db0,db1}.t_order_$->{0..7}
            # 分库策略
            database-strategy:
              standard:
                sharding-column: user_id
                sharding-algorithm-name: db-mod2
            # 分表策略
            table-strategy:
              standard:
                sharding-column: user_id
                sharding-algorithm-name: table-mod8
        algorithms:
          db-mod2:
            type: MOD
            props:
              sharding-count: 2
          table-mod8:
            type: MOD
            props:
              sharding-count: 8
```

路由计算：

1. `user_id % 2` → 落到 db0 /db1；
2. `user_id % 8` → 落到对应库内 t_order_x 表。

## 场景 3：读写分离 + 分表混合配置

主库 db0 写，从库 db0_slave 读，同时 t_order 分 8 张表

```
spring:
  shardingsphere:
    datasource:
      names: db0,db0_slave
      db0: # 主库
        url: jdbc:mysql://127.0.0.1:3306/db0
      db0_slave: # 从库
        url: jdbc:mysql://127.0.0.1:3307/db0
    rules:
      # 读写分离规则
      readwrite-splitting:
        data-sources:
          db0:
            write-data-source-name: db0
            read-data-source-names: [db0_slave]
            load-balancer-name: round_robin
        load-balancers:
          round_robin:
            type: ROUND_ROBIN
      # 分表规则同上省略
```

规则：

- INSERT/UPDATE/DELETE 强制走写库；
- SELECT 查询根据负载均衡走从库，分担读压力。

## 场景 4：时间范围分片（按年月分表）

日志表`t_operate_log`按`create_time`按月分表 t_operate_log_202601、t_operate_log_202602
算法类型：`MONTH` 按月分片，无需自己写规则。

## 场景 5：自定义分片算法（业务复杂规则）

继承 `StandardShardingAlgorithm<T>` 重写 `doSharding` 方法，可实现：

- 按地区编码分片；
- 按商户 ID 哈希分片；
- 冷热数据路由到不同库。

```
public class CustomUserShardingAlgorithm implements StandardShardingAlgorithm<Long> {
    @Override
    public String doSharding(Collection<String> availableTargetNames, ShardingValue<Long> shardingValue) {
        Long userId = shardingValue.getValue();
        // 自定义路由逻辑
        String suffix = userId % 8 + "";
        return "t_order_" + suffix;
    }
}
```

yml 中配置 `type: CLASS_BASED` 指定全类名即可加载。