---
title: mysql
date: 2026-08-09 14:56:24
permalink: /pages/80c0db/
categories:
  - 后端
  - Collection
  - mysql
tags:
  - 
author: 
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---
# mysql事务

## 事务的基本要素（ACID）

1、原子性（Atomicity）：事务开始后所有操作，要么全部做完，要么全部不做，不可能停滞在中间环节。事务执行过程中出错，会回滚到事务开始前的状态，所有的操作就像没有发生一样。也就是说事务是一个不可分割的整体，就像化学中学过的原子，是物质构成的基本单位。

2、一致性（Consistency）：事务开始前和结束后，数据库的完整性约束没有被破坏 。比如A向B转账，不可能A扣了钱，B却没收到。

3、隔离性（Isolation）：同一时间，只允许一个事务请求同一数据，不同的事务之间彼此没有任何干扰。比如A正在从一张银行卡中取钱，在A取钱的过程结束前，B不能向这张卡转账。

4、持久性（Durability）：事务完成后，事务对数据库的所有更新将被保存到数据库，不能回滚。

## 事务的并发问题

1、脏读：事务A读取了事务B更新的数据，然后B回滚操作，那么A读取到的数据是脏数据

2、不可重复读：事务 A 多次读取同一数据，事务 B 在事务A多次读取的过程中，对数据作了更新并提交，导致事务A多次读取同一数据时，结果 不一致。

3、幻读：系统管理员A将数据库中所有学生的成绩从具体分数改为ABCDE等级，但是系统管理员B就在这个时候插入了一条具体分数的记录，当系统管理员A改结束后发现还有一条记录没有改过来，就好像发生了幻觉一样，这就叫幻读。

小结：不可重复读的和幻读很容易混淆，不可重复读侧重于修改，幻读侧重于新增或删除。解决不可重复读的问题只需锁住满足条件的行，解决幻读需要锁表

## 事务隔离级别

| 隔离级别 | 事务 | 脏读 | 不可重复读 |幻读|
| --- | --- | --- | --- |---|
| 1 | READ-UNCOMMITTED(读未提交) | 是 | 是 |是|
| 2 | READ-COMMITTED(读已提交) |  否| 是 |是|
| 4 | REPEATABLE-READ(可重复读) | 否 | 否|是|
| 8 | SERIALIZABLE(串行化)| 否 | 否 |否|

## 查询事务

select @@tx_isolation;

```shell
mysql> select @@tx_isolation;
+-----------------+
| @@tx_isolation  |
+-----------------+
| REPEATABLE-READ |
+-----------------+
1 row in set, 1 warning (0.00 sec)
```

show variables like '%tx_isolation%';

```shell
mysql> show variables like '%tx_isolation%';
+---------------+-----------------+
| Variable_name | Value           |
+---------------+-----------------+
| tx_isolation  | REPEATABLE-READ |
+---------------+-----------------+
1 row in set (0.05 sec)
```

还可以使用下列语句分别查询全局和会话的事务隔离级别：

```sql
SELECT @@global.tx_isolation;
SELECT @@session.tx_isolation;
```

> 提示：在MySQL 8.0.3 中，tx_isolation 变量被 transaction_isolation 变量替换了。在 MySQL 8.0.3 版本中查询事务隔离级别，只要把上述查询语句中的 tx_isolation 变量替换成 transaction_isolation 变量即可。

## 修改事务隔离级别

MySQL 提供了 SET TRANSACTION 语句，该语句可以改变单个会话或全局的事务隔离级别。语法格式如下：

```sql
SET [SESSION | GLOBAL] TRANSACTION ISOLATION LEVEL {READ UNCOMMITTED | READ COMMITTED | REPEATABLE READ | SERIALIZABLE}
```

```shell
SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
Query OK, 0 rows affected (0.01 sec)

mysql> SELECT @@session.tx_isolation;
+------------------------+
| @@session.tx_isolation |
+------------------------+
| READ-UNCOMMITTED       |
+------------------------+
1 row in set, 1 warning (0.00 sec)
```

还可以使用 set tx_isolation 命令直接修改当前 session 的事务隔离级别

```shell
mysql> set tx_isolation='READ-COMMITTED';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> SELECT @@session.tx_isolation;
+------------------------+
| @@session.tx_isolation |
+------------------------+
| READ-COMMITTED         |
+------------------------+
1 row in set, 1 warning (0.00 sec)
```

## 举例说明各隔离级别存在的问题

数据准备：

```sql
CREATE database test;
use test;
CREATE TABLE `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `card` varchar(64) NOT NULL COMMENT '编码',
  `name` varchar(64) DEFAULT NULL COMMENT '姓名',
  `created_by` varchar(64) NOT NULL DEFAULT '' COMMENT '创建人',
  `modified_by` varchar(64) DEFAULT '' COMMENT '修改人',
  `created_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `modified_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;

BEGIN;
INSERT INTO `users` VALUES (1, '1', '1', '1', '', '2022-07-27 09:42:32', '2022-07-27 09:42:32');
INSERT INTO `users` VALUES (2, '2', '2', '2', '', '2022-07-27 09:42:38', '2022-07-27 09:42:38');
COMMIT;
```

此处可忽略

```shell
#查看开启自动提交
mysql> SHOW VARIABLES LIKE 'autocommit';
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| autocommit    | ON    |
+---------------+-------+
1 row in set (0.00 sec)
#设置提交功能禁用
mysql> SET autocommit=0;
Query OK, 0 rows affected (0.00 sec)

mysql> SHOW VARIABLES LIKE 'autocommit';
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| autocommit    | OFF   |
+---------------+-------+
1 row in set (0.00 sec)
```

**注意点：
只针对当前的会话有效，不是永久生效的**

### 1、读未提交：

（1）打开一个客户端A，并设置当前事务模式为read uncommitted（未提交读），开启事务并查询表users的初始值：

```shell
# Client A
mysql> set tx_isolation='READ-UNCOMMITTED';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> select @@tx_isolation;
+------------------+
| @@tx_isolation   |
+------------------+
| READ-UNCOMMITTED |
+------------------+
1 row in set, 1 warning (0.00 sec)

mysql> begin;
Query OK, 0 rows affected (0.00 sec)


mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 14:46:35 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

（2）在客户端A的事务提交之前，打开另一个客户端B，更新表users：

```shell
# Client B
mysql> set tx_isolation='READ-UNCOMMITTED';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> select @@tx_isolation;
+------------------+
| @@tx_isolation   |
+------------------+
| READ-UNCOMMITTED |
+------------------+
1 row in set, 1 warning (0.00 sec)

mysql> begin;
Query OK, 0 rows affected (0.00 sec)


mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 14:46:35 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)

mysql> update users set  card=card+100 where id =1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 101  | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:00:42 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

（3）这时，虽然客户端B的事务还没提交，但是客户端A就可以查询到B已经更新的数据：

```shell
# Client A
mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 101  | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:00:42 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

（4）一旦客户端B的事务因为某种原因回滚，所有的操作都将会被撤销，那客户端A查询到的数据其实就是脏数据：

```shell
# Client B
mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 101  | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:00:42 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)

mysql> rollback;
Query OK, 0 rows affected (0.01 sec)

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 14:56:27 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

（5）在客户端A执行更新语句update users set card=card+3 where id =1;，
name = 1 的 card =4 看似正确，但是在应用程序中，我们会用1+3=4，
并不知道其他会话回滚了，要想解决这个问题可以采用读已提交的隔离级别

```shell
# Client A
mysql>  update users set name=name+3 where id =1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 4    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 14:56:27 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

### 2、读已提交

（1）打开一个客户端A，并设置当前事务模式为read committed（未提交读），查询表users的所有记录：

```shell
# Client A
mysql> set tx_isolation='READ-COMMITTED';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> select @@tx_isolation;
+----------------+
| @@tx_isolation |
+----------------+
| READ-COMMITTED |
+----------------+
1 row in set, 1 warning (0.00 sec)

mysql> begin;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:04:58 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

（2）在客户端A的事务提交之前，打开另一个客户端B，更新表users：

```shell
# Client B
mysql> set tx_isolation='READ-COMMITTED';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> SELECT @@tx_isolation;
+----------------+
| @@tx_isolation |
+----------------+
| READ-COMMITTED |
+----------------+
1 row in set, 1 warning (0.00 sec)

mysql> begin;
Query OK, 0 rows affected (0.00 sec)


mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 14:46:35 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)

mysql> update users set  card=card+100 where id =1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 101  | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:00:42 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

（3）这时，客户端B的事务还没提交，客户端A不能查询到B已经更新的数据，解决了脏读问题：

```shell
# Client A
mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:04:58 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:10:47 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

（4）客户端B的事务提交

```shell
# Client B
mysql> commit;
Query OK, 0 rows affected (0.10 sec)
```

（5）客户端A执行与上一步相同的查询，结果 与上一步不一致，即产生了不可重复读的问题

```shell
# Client A
mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:10:47 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 101  | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:11:06 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

### 3、可重复读

（1）打开一个客户端A，并设置当前事务模式为repeatable read，查询表users的所有记录

```shell
# Client A
mysql> set tx_isolation='REPEATABLE-READ';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> select @@tx_isolation;
+-----------------+
| @@tx_isolation  |
+-----------------+
| REPEATABLE-READ |
+-----------------+
1 row in set, 1 warning (0.00 sec)

mysql> begin;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:16:00 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

（2）在客户端A的事务提交之前，打开另一个客户端B，更新表users并提交

```shell
# Client B
mysql> set tx_isolation='REPEATABLE-READ';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> select @@tx_isolation;
+-----------------+
| @@tx_isolation  |
+-----------------+
| REPEATABLE-READ |
+-----------------+
1 row in set, 1 warning (0.00 sec)

mysql> begin;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:16:00 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)

mysql> update users set  card=card+100 where id =1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 101  | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:18:10 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)

mysql> commit;
Query OK, 0 rows affected (0.07 sec)
```

（3）在客户端A查询表users的所有记录，与步骤（1）查询结果一致，没有出现不可重复读的问题

```shell
mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:16:00 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:16:00 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

（4）在客户端A，接着执行update users set card=card-1 where id =1;，
name=1没有变成1-1=0，name=1 的 card 值用的是步骤（2）中的101来算的，
所以是100，数据的一致性倒是没有被破坏。可重复读的隔离级别下使用了MVCC机制，select操作不会更新版本号，
是快照读（历史版本）；insert、update和delete会更新版本号，是当前读（当前版本）。

```shell
# Client A
mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 1    | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:16:00 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)

mysql>  update users set card=card-1 where id =1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 100  | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:20:53 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

（5）重新打开客户端B，插入一条新数据后提交

```shell
# Client B
mysql> begin;
Query OK, 0 rows affected (0.00 sec)

mysql> INSERT INTO `users` VALUES (3, '3', '3', '3', '', '2022-07-27 09:42:32', '2022-07-27 09:42:32');
Query OK, 1 row affected (0.00 sec)

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 101  | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:18:10 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
|  3 | 3    | 3    | 3          |             | 2022-07-27 09:42:32 | 2022-07-27 09:42:32 |
+----+------+------+------------+-------------+---------------------+---------------------+
3 rows in set (0.00 sec)
```

（6）在客户端A查询表account的所有记录，没有 查出 新增数据，所以没有出现幻读

```shell
# Client A
mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 100  | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:20:53 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 100  | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:20:53 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
+----+------+------+------------+-------------+---------------------+---------------------+
2 rows in set (0.00 sec)
```

### 4.串行化

（1）打开一个客户端A，并设置当前事务模式为serializable，查询表users的初始值：

```shell
# Client A
mysql> set tx_isolation='SERIALIZABLE';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> select @@tx_isolation;
+----------------+
| @@tx_isolation |
+----------------+
| SERIALIZABLE   |
+----------------+
1 row in set, 1 warning (0.00 sec)

mysql> begin;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from users;
+----+------+------+------------+-------------+---------------------+---------------------+
| id | card | name | created_by | modified_by | created_time        | modified_time       |
+----+------+------+------------+-------------+---------------------+---------------------+
|  1 | 100  | 1    | 1          |             | 2022-07-27 09:42:32 | 2022-07-27 15:20:53 |
|  2 | 2    | 2    | 2          |             | 2022-07-27 09:42:38 | 2022-07-27 09:42:38 |
|  3 | 3    | 3    | 3          |             | 2022-07-27 09:42:32 | 2022-07-27 09:42:32 |
+----+------+------+------------+-------------+---------------------+---------------------+
3 rows in set (7.55 sec)
```

（2）打开一个客户端B，并设置当前事务模式为serializable，插入一条记录报错，表被锁了插入失败，
mysql中事务隔离级别为serializable时会锁表， 因此不会出现幻读的情况，这种隔离级别并发性极低，开发中很少会用到。

```shell
# Client B
mysql> set tx_isolation='SERIALIZABLE';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> select @@tx_isolation;
+----------------+
| @@tx_isolation |
+----------------+
| SERIALIZABLE   |
+----------------+
1 row in set, 1 warning (0.00 sec)

mysql> begin;
Query OK, 0 rows affected (0.00 sec)

mysql> INSERT INTO `users` VALUES (4, '4', '4', '4', '', '2022-07-27 09:42:32', '2022-07-27 09:42:32');
ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction
```

补充：

1、事务隔离级别为读已提交、读未提交时，写数据只会锁住相应的行

2、事务隔离级别为可重复读时，如果检索条件有索引（包括主键索引）的时候，默认加锁方式是next-key 锁；
如果检索条件没有索引，更新数据时会锁住整张表。一个间隙被事务加了锁，其他事务是不能在这个间隙插入记录的，这样可以防止幻读。

3、事务隔离级别为串行化时，读写数据都会锁住整张表

4、隔离级别越高，越能保证数据的完整性和一致性，但是对并发性能的影响也越大。

5、MYSQL MVCC实现机制参考链接：https://blog.csdn.net/whoamiyang/article/details/51901888

6、关于next-key 锁可以参考链接：https://blog.csdn.net/bigtree_3721/article/details/73731377

> 参考：https://www.cnblogs.com/huanongying/p/7021555.html

### 创建用户

```sql
1 创建新用户
create user collection_project identified by '123456';
注：'localuser' 即为新用户的用户名
'666' 即为新用户的登录密码
2 为此新用户赋予操作某个数据库的权限
grant all privileges on my_project.* to 'collection_project'@'%';
注：'collection_project' 即为指定的数据库
'%' 即表示无论此用户以哪个IP操作都可以。
3 刷新数据库使刚才的操作生
flush privileges;
```
```sql
create user collection_project identified by '123456';
grant all privileges on my_project.* to 'collection_project'@'%';
flush privileges;
```

```sql
create user 'collection'@'%' identified by '123456';
grant all privileges on my_project.* to 'collection_project'@'%';
flush privileges;
```