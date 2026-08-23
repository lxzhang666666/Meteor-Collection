---
title: mysql-主从
date: 2026-08-09 14:56:24
permalink: /pages/f0c17c/
categories:
  - 后端
  - Collection
  - mysql
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# mysql

## mysql 单节点

win10
~~~shell
docker run -p 3306:3306 --name mysql-standalone --privileged=true  --net prod-network --ip 172.18.0.29  -v E:\data\apps\mysql\mysql-standalone\log:/var/log/mysql  -v E:\data\apps\mysql\mysql-standalone\data:/var/lib/mysql  -v E:\data\apps\mysql\mysql-standalone\conf\:/etc/mysql/conf.d/  -e MYSQL_ROOT_PASSWORD=root -d mysql:5.7
~~~

## mysql 主从复制

### 配置主机
Win10
```shell
docker run -p 3307:3306 --name mysql-master --privileged=true --hostname mysql-master --net prod-network --ip 172.18.0.20 --add-host mysql-slave:172.18.0.21  -v E:\data\apps\mysql\mysql-master\log:/var/log/mysql  -v E:\data\apps\mysql\mysql-master\data:/var/lib/mysql  -v E:\data\apps\mysql\mysql-master\conf\:/etc/mysql/conf.d/  -e MYSQL_ROOT_PASSWORD=root -d mysql:5.7
```

Mac
```shell
docker run -p 3307:3306 --name mysql-master --privileged=true \
--hostname mysql-master --net prod-network --ip 172.18.0.20 --add-host mysql-slave:172.18.0.21 \
-v /Users/xxx/data/apps/mysql/mysql-master/log:/var/log/mysql \
-v /Users/xxx/data/apps/mysql/mysql-master/data:/var/lib/mysql \
-v /Users/xxx/data/apps/mysql/mysql-master/conf/:/etc/mysql/conf.d/ \
-e MYSQL_ROOT_PASSWORD=root \
-d mysql:5.7
```
进入/mydata/mysql-master/conf目录下新建my.cnf
vim my.cnf

```shell
#解决 连接非中文问题
[client]
default_character_set=utf8
[mysqld]
## 设置server_id，同一局域网中需要唯一
server_id=101 
## 指定不需要同步的数据库名称
binlog-ignore-db=mysql
## 开启二进制日志功能
log-bin=mall-mysql-bin
## 设置二进制日志使用内存大小（事务）
binlog_cache_size=1M
## 设置使用的二进制日志格式（mixed,statement,row）
binlog_format=mixed
## 二进制日志过期清理时间。默认值为0，表示不自动清理。
expire_logs_days=7
## 跳过主从复制中遇到的所有错误或指定类型的错误，避免slave端复制中断。
## 如：1062错误是指一些主键重复，1032错误是因为主从数据库数据不一致
slave_skip_errors=1062
#解决 连接非中文问题
collation_server = utf8_general_ci
character_set_server = utf8
```

```shell
mysql> SHOW VARIABLES LIKE 'character%';
+--------------------------+----------------------------+
| Variable_name            | Value                      |
+--------------------------+----------------------------+
| character_set_client     | latin1                     |
| character_set_connection | latin1                     |
| character_set_database   | latin1                     |
| character_set_filesystem | binary                     |
| character_set_results    | latin1                     |
| character_set_server     | latin1                     |
| character_set_system     | utf8                       |
| character_sets_dir       | /usr/share/mysql/charsets/ |
+--------------------------+----------------------------+
8 rows in set (0.00 sec)
```
```text
#解决 连接非中文问题
[client]
default_character_set=utf8
[mysqld]
collation_server = utf8_general_ci
character_set_server = utf8
```

```shell
mysql -uroot -proot

#master容器实例内创建数据同步用户
CREATE USER 'slave'@'%' IDENTIFIED BY '123456';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'slave'@'%';
```

查看主机状态
```shell
mysql> show master status;
+-----------------------+----------+--------------+------------------+-------------------+
| File                  | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set |
+-----------------------+----------+--------------+------------------+-------------------+
| mall-mysql-bin.000003 |      617 |              | mysql            |                   |
+-----------------------+----------+--------------+------------------+-------------------+
1 row in set (0.00 sec)
```

### 配置从机
. 进入/mydata/mysql-slave/conf目录下新建my.cnf
. vim my.cnf

Win10
```shell
docker run -p 3308:3306 --name mysql-slave --privileged=true `
--hostname mysql-slave --net prod-network --ip 172.18.0.21 --add-host mysql-master:172.18.0.20   `
-v E:\data\apps\mysql\mysql-slave\log:/var/log/mysql  `
-v E:\data\apps\mysql\mysql-slave\data:/var/lib/mysql  `
-v E:\data\apps\mysql\mysql-slave\conf\:/etc/mysql/conf.d/  `
-e MYSQL_ROOT_PASSWORD=root  `
-d mysql:5.7
```


Mac
```shell
docker run -p 3308:3306 --name mysql-slave --privileged=true \
--hostname mysql-slave --net prod-network --ip 172.18.0.21 --add-host mysql-master:172.18.0.20 \
-v /Users/xxx/data/apps/mysql/mysql-slave/log:/var/log/mysql \
-v /Users/xxx/data/apps/mysql/mysql-slave/data:/var/lib/mysql \
-v /Users/xxx/data/apps/mysql/mysql-slave/conf:/etc/mysql/conf.d/ \
-e MYSQL_ROOT_PASSWORD=root \
-d mysql:5.7
```

```shell
[mysqld]
## 设置server_id，同一局域网中需要唯一
server_id=102
## 指定不需要同步的数据库名称
binlog-ignore-db=mysql
## 开启二进制日志功能，以备Slave作为其它数据库实例的Master时使用
log-bin=mall-mysql-slave1-bin
## 设置二进制日志使用内存大小（事务）
binlog_cache_size=1M
## 设置使用的二进制日志格式（mixed,statement,row）
binlog_format=mixed
## 二进制日志过期清理时间。默认值为0，表示不自动清理。
expire_logs_days=7
## 跳过主从复制中遇到的所有错误或指定类型的错误，避免slave端复制中断。
## 如：1062错误是指一些主键重复，1032错误是因为主从数据库数据不一致
slave_skip_errors=1062
## relay_log配置中继日志
relay_log=mall-mysql-relay-bin
## log_slave_updates表示slave将复制事件写进自己的二进制日志
log_slave_updates=1
## slave设置为只读（具有super权限的用户除外）
read_only=1
```

从机中配置主从
```shell
# change master to master_host='宿主机ip', master_user='slave', master_password='123456', master_port=3307, master_log_file='mall-mysql-bin.000001', master_log_pos=617, master_connect_retry=30;
#主从复制命令参数说明
#master_host：主数据库的IP地址；
#master_port：主数据库的运行端口；
#master_user：在主数据库创建的用于同步数据的用户账号；
#master_password：在主数据库创建的用于同步数据的用户密码；
#master_log_file：指定从数据库要复制数据的日志文件，通过查看主数据的状态，获取File参数；
#master_log_pos：指定从数据库从哪个位置开始复制数据，通过查看主数据的状态，获取Position参数；
#master_connect_retry：连接失败重试的时间间隔，单位为秒。
change master to master_host='172.18.0.20', master_user='slave', master_password='123456', master_port=3306, master_log_file='mall-mysql-bin.000001', master_log_pos=154, master_connect_retry=30;
```

### 查看主从状态
```shell
mysql> show slave status \G;
*************************** 1. row ***************************
               Slave_IO_State: 
                  Master_Host: 172.17.0.3
                  Master_User: slave
                  Master_Port: 3307
                Connect_Retry: 30
              Master_Log_File: mall-mysql-bin.000001
          Read_Master_Log_Pos: 617
               Relay_Log_File: mall-mysql-relay-bin.000001
                Relay_Log_Pos: 4
        Relay_Master_Log_File: mall-mysql-bin.000001
        # 还没开始 
             Slave_IO_Running: No
            Slave_SQL_Running: No
              Replicate_Do_DB: 
          Replicate_Ignore_DB: 
           Replicate_Do_Table: 
       Replicate_Ignore_Table: 
      Replicate_Wild_Do_Table: 
  Replicate_Wild_Ignore_Table: 
                   Last_Errno: 0
                   Last_Error: 
                 Skip_Counter: 0
          Exec_Master_Log_Pos: 617
              Relay_Log_Space: 154
              Until_Condition: None
               Until_Log_File: 
                Until_Log_Pos: 0
           Master_SSL_Allowed: No
           Master_SSL_CA_File: 
           Master_SSL_CA_Path: 
              Master_SSL_Cert: 
            Master_SSL_Cipher: 
               Master_SSL_Key: 
        Seconds_Behind_Master: NULL
Master_SSL_Verify_Server_Cert: No
                Last_IO_Errno: 0
                Last_IO_Error: 
               Last_SQL_Errno: 0
               Last_SQL_Error: 
  Replicate_Ignore_Server_Ids: 
             Master_Server_Id: 0
                  Master_UUID: 
             Master_Info_File: /var/lib/mysql/master.info
                    SQL_Delay: 0
          SQL_Remaining_Delay: NULL
      Slave_SQL_Running_State: 
           Master_Retry_Count: 86400
                  Master_Bind: 
      Last_IO_Error_Timestamp: 
     Last_SQL_Error_Timestamp: 
               Master_SSL_Crl: 
           Master_SSL_Crlpath: 
           Retrieved_Gtid_Set: 
            Executed_Gtid_Set: 
                Auto_Position: 0
         Replicate_Rewrite_DB: 
                 Channel_Name: 
           Master_TLS_Version: 
1 row in set (0.00 sec)

ERROR: 
No query specified
```
开启从机
```shell
mysql> start slave;
Query OK, 0 rows affected (0.00 sec)
```

FAQ
问题描述：docker搭建mysql主从集群，但是在配置的时候出现以下警告：
```shell
[Warning] World-writable config file '/etc/mysql/conf.d/my.cnf' is ignored.
```
解决方案：这是因为将my.cnf这个文件的权限给的太高了，只需要进行权限降级即可。
```shell
chmod 644 /etc/mysql/conf.d/my.cnf
```