---
title: redis
date: 2026-08-09 14:56:24
permalink: /pages/e34ed7/
categories:
  - 后端
  - Collection
  - redis
tags:
  - 
author: 
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---
# Redis

## 数据结构
> redis 9种数据结构由5种最基本的数据结构（String、List、Hash、Set、Sorted Set（zset）） 加 bitmap、geohash、hyperloglog、streams 组成

![redis数据结构](assets/redis数据结构.jpg)

String: 一般用于缓存、限流、计数器、分布式锁、分布式Session。    
~~~java
//缓存token
redisTemplate.opsForValue().set("ZHANGSAN", "92c48b47-573f-455c-8f37-3746f85bf6a5", 30, TimeUnit.MINUTES);
//计数器
redisTemplate.opsForValue().increment("views_num", 1);
~~~
哈希表（Hash）:通常用来存储对象型数据，如用户信息的对象数据 人(属性，值，属性，值)。     
~~~java
//设置哈希字段的值
redisTemplate.opsForHash().put("myhash", "field1", "value1");
//设置多个哈希字段的值
Map<String, Object> map = new HashMap<>();
map.put("field1", "value1");
map.put("field2", "value2");
redisTemplate.opsForHash().putAll("myhash", map);
//获取哈希字段的值
redisTemplate.opsForHash().get("myhash", "field1");
//获取多个哈希字段的值
redisTemplate.opsForHash().multiGet("myhash", Arrays.asList("field1", "field2"));
// 判断哈希中是否存在指定的字段 
redisTemplate.opsForHash().hasKey("myhash", "field1");
//获取哈希的所有字段
redisTemplate.opsForHash().keys("myhash");
//获取哈希的所有值
redisTemplate.opsForHash().values("myhash");
//获取哈希的所有字段和对应的值
redisTemplate.opsForHash().entries("myhash");
//将指定字段的值增加指定步长
redisTemplate.opsForHash().increment("myhash", "field1", 5);
//删除指定的字段
redisTemplate.opsForHash().delete("myhash", "field1");
~~~
// todo 关注列表、粉丝列表
列表（List）: List类型一般用于简单队列、列表显示、关注列表、粉丝列表、留言评价…分页、热点新闻等。      
~~~java
//从列表的左侧插入一个或多个元素
redisTemplate.opsForList().leftPush("mylist", "value1");
//从列表的右侧插入一个或多个元素
redisTemplate.opsForList().rightPush("mylist", "value1");
//移除并返回列表最左侧的元素
redisTemplate.opsForList().leftPop("mylist");
//移除并返回列表最右侧的元素
redisTemplate.opsForList().rightPop("mylist");
//获取列表指定范围内的元素
redisTemplate.opsForList().range("mylist", 0, -1);
//获取列表中指定索引处的元素
redisTemplate.opsForList().index("mylist", 1);
//获取列表的长度
redisTemplate.opsForList().size("mylist");
//截取指定范围内的元素，保留指定范围内的元素，其它元素将被删除
redisTemplate.opsForList().trim("mylist", 0, 2);
//移除列表中指定数量的元素
redisTemplate.opsForList().remove("mylist", 2, "value1");
//设置列表中指定索引处的元素的值
redisTemplate.opsForList().set("mylist", 2, "newvalue");
~~~
集合（Set）: Set类型一般用于赞、踩、标签、好友关系等； 利用对交集、并集、差集的计算对数据进行过滤处理，如共同好友、推荐信息的数据过滤等。 利用唯一性统计独立IP等；      
~~~java
//向集合中添加一个或多个元素
redisTemplate.opsForSet().add("myset", "value1", "value2", "value3");
//获取集合中的所有成员
redisTemplate.opsForSet().members("myset");
//获取集合的大小
redisTemplate.opsForSet().size("myset");
//判断元素是否是集合的成员
redisTemplate.opsForSet().isMember("myset", "value1");
//获取集合中的随机元素
redisTemplate.opsForSet().randomMember("myset");
//弹出并返回集合中的一个随机元素
redisTemplate.opsForSet().pop("myset");
//从集合中移除一个或多个元素
redisTemplate.opsForSet().remove("myset", "value1", "value2");
//计算多个集合的交集，并返回结果集合
redisTemplate.opsForSet().intersect("set1", "set2");
//计算多个集合的并集，并返回结果集合
redisTemplate.opsForSet().union("set1", "set2");
//计算两个集合的差集，并返回结果集合
redisTemplate.opsForSet().difference("set1", "set2");
~~~
// todo 百万主播实时计算 top 100   
有序集合（ZSet ）: Zset类型一般用于排行榜、商品进行排序显示等    
~~~java
//向有序集合中添加一个成员，同时指定该成员的分数
// 0-5000
redisTemplate.opsForZSet().add("myzset1", "member1", 0.5);
// 5001-10000
redisTemplate.opsForZSet().add("myzset2", "member2", 0.8);
// 10000- +
redisTemplate.opsForZSet().add("myzset3", "member3", 1.2);
//获取有序集合中指定范围内的成员集合（按分数从低到高排序）
redisTemplate.opsForZSet().range("myzset", 0, -1);
//获取有序集合中指定范围内的成员集合（按分数从高到低排序）
redisTemplate.opsForZSet().reverseRange("myzset", 0, -1);
//获取有序集合中的成员数量
redisTemplate.opsForZSet().zCard("myzset");
//获取有序集合中指定成员的分数
redisTemplate.opsForZSet().score("myzset", "member1");
//从有序集合中移除指定的成员
redisTemplate.opsForZSet().remove("myzset", "member1", "member2");
//统计有序集合中指定分数范围内的成员数量
redisTemplate.opsForZSet().count("myzset", 1.0, 2.0);
//将指定成员的分数增加指定数值
redisTemplate.opsForZSet().incrementScore("myzset", "member1", 0.2);
//获取指定成员在有序集合中的排名（按分数从低到高排序）
redisTemplate.opsForZSet().rank("myzset", "member1");
//获取指定成员在有序集合中的排名（按分数从高到低排序）
redisTemplate.opsForZSet().reverseRank("myzset", "member1");
~~~
地理空间（GEO）: 地理空间索引，附件商家、酒店等    
~~~java
//添加一个或多个地理位置到指定的Geo键中
redisTemplate.opsForGeo().add("mygeo", new Point(116.397128, 39.916527), "Beijing");
redisTemplate.opsForGeo().add("mygeo", new Point(121.472641, 31.231707), "Shanghai");
redisTemplate.opsForGeo().add("mygeo", new Point(113.264435, 23.129163), "Guangzhou");
//获取指定成员的地理位置
redisTemplate.opsForGeo().position("mygeo", "Beijing");
//计算两个成员之间的距离（默认以米为单位）
redisTemplate.opsForGeo().distance("mygeo", "Beijing", "Shanghai");
//获取指定成员的Geohash值
redisTemplate.opsForGeo().hash("mygeo", "Beijing");
//根据给定的中心点，返回与中心点距离在指定范围内的成员（按距离由近到远排序）
Circle circle = new Circle(new Point(116.397128, 39.916527), new Distance(200, Metrics.KILOMETERS));
redisTemplate.opsForGeo().radius("mygeo", circle);
//根据给定的成员，返回与该成员距离在指定范围内的其他成员（按距离由近到远排序）
redisTemplate.opsForGeo().radiusByMember("mygeo", "Beijing", new Distance(200, Metrics.KILOMETERS));
//从指定的Geo键中移除一个或多个成员
redisTemplate.opsForGeo().remove("mygeo", "Beijing", "Shanghai");
~~~
位图（Bitmaps）: Bitmaps一般用于记录状态，比如登录状态、签到等，并可以对状态进行统计。
~~~java
//给指定key的值的第offset赋值val
redisTemplate.opsForValue().setBit("key","userId",false);
//获取指定key的第offset位
redisTemplate.opsForValue().getBit("key","userId");
//获取多个数据
BitFieldSubCommands command = BitFieldSubCommands.create()
    .get(BitFieldSubCommands.BitFieldType.unsigned(1)).valueAt(1)
    .get(BitFieldSubCommands.BitFieldType.unsigned(1)).valueAt(2)
    .get(BitFieldSubCommands.BitFieldType.unsigned(1)).valueAt(3)
    .get(BitFieldSubCommands.BitFieldType.unsigned(1)).valueAt(4)
    .get(BitFieldSubCommands.BitFieldType.unsigned(1)).valueAt(5)
    .get(BitFieldSubCommands.BitFieldType.unsigned(1)).valueAt(6)
    .get(BitFieldSubCommands.BitFieldType.unsigned(1)).valueAt(7);
redisTemplate.opsForValue().bitField("key",command);
~~~

### 什么是简单动态字符串(SDS)
简单动态字符串(SDS)，即：simple dynamic string
1.1 SDS的定义
每个src/sds.h/sdshdr结构表示一个sds对象。sdshdrxx会根据字符串的实际长度，选取合适的结构，最大化节省内存空间。获取字符串长度时间复杂度O(1)。
attribute ((packed)) : 告诉编译器，不要因为内存对齐而在结构体中填充字节，以保证内存的紧凑，这样sds - 1就可以得到flags字段，进而能够得到其头部类型。如果填充了字节，则就不能得到flags字段。
1.2 空间预分配
用来优化SDS的字符串增长操作：当SDS的API对一个SDS进行修改，并且需要对SDS进行空间扩展的时候，程序不仅会为SDS分配修改所必须要的空间，还会为SDS分配额外的未使用空间。通过空间预分配策略，Redis可以减少连续执行字符串增长操作所需的内存重分配次数。
1.3 惰性空间释放
用来优化SDS字符串缩短操作：当SDS的API对一个SDS进行缩短时，程序并不立即回收多出来的字节，而是通过alloc和len的差值，将这些字节数量保存起来，等待将来使用。
1.4 二进制安全
C语言的字符串中的字符必须符合某种编码（如：ASCII），并且除了字符串末尾的空字符，其他位置不能包含空字符，否则，会出现数据被截断的情况
SDS使用len属性的值判断字符串是否结束，而不是空字符，即SDS是二进制安全的。

// 快速列表  quicklist
- ziplist压缩表

ziplist主要是为了节约内存，他将元素存储在一块连续的内存空间中，这样在查询数据的时候也可以利用CPU的缓存访问数据，加快查询的效率
![redis数据结构](assets/zipList图例.jpeg)
![redis数据结构](assets/zipList.png)
header是固定的10字节长度，442分别代表：ziplist总字节数、到ziplist表尾的字节数即指向ziplist_entry_end的偏移量、ziplist元素数量      

| 域       |长度/类型|域的值|
|:--------|:---:|---:|
| zlbytes |	uint32_t|	整个 ziplist 占用的内存字节数，对 ziplist 进行内存重分配，或者计算末端时使用。
| zltail  |	uint32_t|	到达 ziplist 表尾节点的偏移量。 通过这个偏移量，可以在不遍历整个 ziplist 的前提下，弹出表尾节点。|
| zllen   |	uint16_t|	ziplist 中节点的数量。 当这个值小于 UINT16_MAX （65535）时，这个值就是 ziplist 中节点的数量； 当这个值等于 UINT16_MAX 时，节点的数量需要遍历整个 ziplist 才能计算得出。|
| entryX  |	?|	ziplist 所保存的节点，各个节点的长度根据内容而定。|
| zlend   |	uint8_t|	255的二进制值 1111 1111 （UINT8_MAX） ，用于标记 ziplist 的末端。|

ziplist的entry的内存结构比较复杂，分为pre_entry_length、encoding、length、content4个部分
![redis数据结构](assets/zipList-entry.png)

- skiplist跳表

跳表(skip list) 对标的是平衡树(AVL Tree)，红黑树，是一种 插入/删除/搜索 都是 O(log n) 的数据结构。这两个查询效率差不多，
 - 跳表它最大的优势是原理简单、容易实现、效率更高。
 - 在并发的情况下，红黑树在插入删除的时候可能需要做数的平衡的操作，即树的左旋和右旋来保证树的平衡，会影响其他部分树的节点，而跳表只会影响局部，不会影响其他的节点
 ![redis数据结构](assets/skiplist-图例.png)
![redis数据结构](assets/skipList.jpeg)

## redis为什么那么快
1. 基于内存机制：     
   Redis是基于内存存储实现的数据库，相对于数据存在磁盘的数据库，就省去磁盘磁盘I/O的消耗。
   MySQL等磁盘数据库，需要建立索引来加快查询效率，而Redis数据存放在内存，直接操作内存，所以就很快。
2. 高效的数据结构：    
   Redis内置了多种高效的数据结构，如字符串、哈希表、列表、集合和有序集合等。 
   这些数据结构都经过优化，能够在时间复杂度为O(1)的情况下完成大部分操作。
   例如，通过使用哈希表存储数据，Redis能够快速地进行读写操作，而不需要像传统数据库那样进行磁盘的随机访问。
![redis数据结构](assets/redis数据结构.png)
3. 合理的数据编码：
   Redis支持多种数据基本类型，每种基本类型对应不同的数据结构，每种数据结构对应不一样的编码。为了提高性能，Redis设计者总结出，数据结构最适合的编码搭配。     
   String：如果存储数字的话，是用int类型的编码;如果存储非数字，小于等于39字节的字符串，是embstr；大于39个字节，则是raw编码。      
   List：如果列表的元素个数小于512个，列表每个元素的值都小于64字节（默认），使用ziplist编码，否则使用linkedlist编码      
   Hash：哈希类型元素个数小于512个，所有值小于64字节的话，使用ziplist编码,否则使用hashtable编码。      
   Set：如果集合中的元素都是整数且元素个数小于512个，使用intset编码，否则使用hashtable编码。     
   Zset：当有序集合的元素个数小于128个，每个元素的值小于64字节时，使用ziplist编码，否则使用skiplist（跳跃表）编码  
 ![redis数据结构](assets/redis数据结构.jpg)
4. 合理的线程模型： 
   1. 单线程模型：避免了上下文切换：      
   Redis是单线程的，其实是指Redis的网络IO和键值对读写是由一个线程来完成的。但Redis的其他功能，比如持久化、异步删除、集群数据同步等等，实际是由额外的线程执行的。      
   Redis的单线程模型，避免了CPU不必要的上下文切换和竞争锁的消耗。也正因为是单线程，如果某个命令执行过长（如hgetall命令），会造成阻塞。Redis是面向快速执行场景的内存数据库，所以要慎用如lrange和smembers、hgetall等命令。
   2. I/O 多路复用：   
   I/O ：网络 I/O       
   多路 ：多个网络连接     
   复用：复用同一个线程。    
   IO多路复用其实就是一种同步IO模型，它实现了一个线程可以监视多个文件句柄；一旦某个文件句柄就绪，就能够通知应用程序进行相应的读写操作；而没有文件句柄就绪时,就会阻塞应用程序，交出cpu。
![IO多路复用](assets/IO多路复用.png)

## redis的优缺点
### 优点:
1. 性能极致 基于内存存储 读写速度极快  单线程模型 避免多线程上下文切换和竞争 保障原子性且cpu不是瓶颈 高效的数据结构 数据结构支持多 支持字符串、列表、集合、哈希、有序集合等,这些结构在内存中经过优化,操作效率极高
2. 丰富的数据结构和功能 除了get set 还支持如 列表推拉、集合并交差、有序集合排名、地理空间计算等 能直接实现复杂的业务逻辑(如排行榜、好友关系、消息队列)
3. 高可用与可扩展   Redis Sentinel 提供主从复制和故障自动转移;
Redis Cluster 提供分布式数据分片 支持线性横向扩展 能承载更大的数据量和更高的高并发
4. 持久化保障 RDB(快照):定时全量备份,恢复快,适合备份 AOF(追加日志):记录所有写操作,数据完整性高，可配置不同刷盘策略平衡性能与安全
5. 与java生态契合 Spring Boot 的 Spring Data Redis

### 缺点:
1. 容量与成本 容量限制与内存 成本较高
2. 持久化与数据安全的风险: RDB可能丢失最后一次的快照后数据,AOF文件大且恢复慢(因为需要全量执行命令) 默认的AOF(everysec)策略在宕机时仍有最后1秒数据丢失的风险
3. 事务非强一致性(redis事务仅能保证 "批量执行" 不保证原子回滚  A->B->C A成功了  B失败 整体失败 但是不会回滚A操作)
4. 单线程模型虽然高效 但是存在长耗时命令(如 keys *,对大集合 smembers)会阻塞所有后续请求

## redis 过期键的删除策略？

（1） 惰性删除:放任键过期不管，但是每次从键空间中获取键时，都检查取得
的键是否过期，如果过期的话，就删除该键;如果没有过期，就返回该键。

（2） 定期删除:每隔一段时间程序就对数据库进行一次检查，删除里面的过期
键。至于要删除多少过期键，以及要检查多少个数据库，则由算法决定。

// lfu
## redis数据淘汰机制
例题：
MySQL 里有 2000w 数据，redis 中只存 20w
的数据，如何保证 redis 中的数据都是热点数据？

Redis 内存数据集大小上升到一定大小的时候，就会施行数据淘汰策略。
相关知识：Redis 提供 8 种数据淘汰策略：
1. volatile-lru：从已设置过期时间的数据集（server.db[i].expires）中挑选
最近最少使用的数据淘汰
2. volatile-ttl：从已设置过期时间的数据集（server.db[i].expires）中挑选
将要过期的数据淘汰
3. volatile-random：从已设置过期时间的数据集（server.db[i].expires）中任
意选择数据淘汰
4. allkeys-lru：从数据集（server.db[i].dict）中挑选最近最少使用的数据淘
汰
5. allkeys-random：从数据集（server.db[i].dict）中任意选择数据淘汰
6. no-enviction（驱逐）：禁止驱逐数据
7. allkeys-lfu（redis 4.0+）: 从所有key中,淘汰最不常使用的key;基于访问频率(LFU算法),比LRU更精准识别冷门数据;适用需要根据访问频率淘汰低频数据的场景
8. volatile-lfu:仅从设置了过期时间的key中,淘汰最不经常使用的key;结合了LFU算法和volatile范围,适用于临时数据的频率淘汰

## Redis 事务相关的命令有哪几个？
//  cell 
// lua脚本与事务
MULTI、EXEC、DISCARD、WATCH

// 单点登录  微信红包  长连接webSocket  redis 管道
## redis可以做什么
1. String:
   使用场景:缓存、限流、计数器、分布式锁、分布式Session
2. Hash:
   使用场景:存储对象型数据，如用户信息的对象数据 人(属性，值，属性，值)
3. List:
   使用场景:简单队列、列表显示、关注列表、粉丝列表、留言评价、分页、热点新闻
4. Set
   使用场景:赞、踩、标签、好友关系等； 利用对交集、并集、差集的计算对数据进行过滤处理，如共同好友、推荐信息的数据过滤
5. SortedSet
   使用场景:排行榜、商品进行排序显示
6. bitmap
   使用场景:记录状态，比如登录状态、签到
7. geo
   使用场景:地理空间索引，附件商家、酒店
8. hyperloglog:
   使用场景:大数据统计去重统计

## Redis 哈希槽的概念？
Redis集群没有使用一致性hash,而是引入了哈希槽的概念，Redis 集群
有 16384 个哈希槽，每个 key 通过 CRC16 校验后对 16384 取模来决定放置
哪个槽，集群的每个节点负责一部分hash槽

## redis为什么不用一致性哈希 
1. 简单的虚拟哈希槽分布：Redis使用的是简单的哈希算法，将数据分布在固定数量的哈希槽（Hash Slot）中。这种分布方式相比一致性哈希更加简单直观，易于实现和维护。
2. 简化数据迁移：一致性哈希算法的一个重要特性是节点的增加、删除或故障时，只会影响少量的数据。但是一致性哈希算法在节点变动时需要进行数据迁移，而这个过程是比较复杂的。相比之下，Redis采用的哈希槽分布方式在节点增删时，只需要将槽位重新分配即可。
3. 单节点存储的数据量较小：Redis通常作为缓存使用，单个节点存储的数据量相对较小。在这种场景下，使用一致性哈希算法并不会带来明显的性能优势，反而会增加系统的复杂度。
4. 故障恢复较简单：当Redis节点发生故障时，Redis的主从复制机制能够快速恢复故障节点，不需要借助一致性哈希算法进行数据迁移。这样能够简化故障恢复的过程，提升系统的可靠性和可用性。

## Redis 集群，集群的原理是什么？
（1） Redis Sentinal 着眼于高可用，在 master 宕机时会自动将 slave 提升
为 master，继续提供服务。

（2） Redis Cluster 着眼于扩展性，在单个 redis 内存不足时，使用
Cluster 进行分片存储。

## Redis 的同步机制了解么？ // binlog-salve-0001 
Redis 可以使用主从同步，从从同步。第一次同步时，主节点做一次
bgsave，并同时将后续修改操作记录到内存 buffer，待完成后将 rdb 文件全
量同步到复制节点，复制节点接受完成后将 rdb 镜像加载到内存。加载完成
后，再通知主节点将期间修改的操作记录同步到复制节点进行重放就完成了同
步过程。

## Redis 的持久化机制是什么？各自的优缺点？

Redis 提供两种持久化机制 RDB 和 AOF 机制:
1. RDB(Redis DataBase)持久化方式：

是指用数据集快照的方式半持久化模式)记录 redis 数据库的所有键值对,在某
个时间点将数据写入一个临时文件，持久化结束后，用这个临时文件替换上次
持久化的文件，达到数据恢复。
优点：

（1） 只有一个文件 dump.rdb，方便持久化。

（2） 容灾性好，一个文件可以保存到安全的磁盘。

（3） 性能最大化，fork 子进程来完成写操作，让主进程继续处理命令，所以
是 IO 最大化。使用单独子进程来进行持久化，主进程不会进行任何 IO 操 作，
保证了 redis 的高性能)

（4） 相对于数据集大时，比 AOF 的启动效率更高。
缺点：
数据安全性低。RDB 是间隔一段时间进行持久化，如果持久化之间 redis 发生
故障，会发生数据丢失。所以这种方式更适合数据要求不严谨的时候
2. AOF(Append-only file)持久化方式：

是指所有的命令行记录以 redis 命令请求协议的格式完全持久化存储)保存为
aof 文件。
优点：

（1） 数据安全，aof 持久化可以配置 appendfsync 属性，有 always，每进行
一次命令操作就记录到 aof 文件中一次。

（2） 通过 append 模式写文件，即使中途服务器宕机，可以通过 redis check-aof 工具解决数据一致性问题。

（3） AOF 机制的 rewrite 模式。AOF 文件没被 rewrite 之前（文件过大时会
对命令进行合并重写），可以删除其中的某些命令（比如误操作的 flush all）)
缺点：
   （1） AOF 文件比 RDB 文件大，且恢复速度慢。

   （2） 数据集大的时候，比 rdb 启动效率低。
   
## 什么是缓存雪崩、缓存穿透、缓存击穿？你怎么解决？
请具体分析一下什么是缓存雪崩、缓存穿透、缓存击穿？
如果在开发过程中遇到了这些问题，你会怎么解决？
其实，缓存雪崩、穿透以及击穿，最终导致的问题都是我的请求绕过了我们的缓存中间件，直接打到了
DB 的集群，导致 DB 的压力过大或者造成 DB 崩溃的现象。只不过场景稍微有些不一样。

 缓存雪崩
缓存雪崩是指同一时间段内  大量缓存数据同时过期，导致所有的请求直接打到数据库，造成数据库瞬间压力激增甚至连锁故障
核心特征：
大规模缓存失效
请求直接冲击到数据库
可能引发服务不可用  
产生原因：
1. 批量缓存同时过期： 如缓存设置为相同的TTL 凌晨批量失效
2. redis服务宕机：集群整体或者主节点故障
3. 热点数据集中失效： 促销活动结束后相关缓存同时过期

解决方案：
1. 缓存层：差异化过期时间 过期时间不要在同一时间过期
2. 缓存层：热点数据永不过期
3. 服务层： 相关查询数据方法做熔断降级
4. 服务层： 相关查询数据方法做限流或者队列化
5. 高可用：redis集群  数据库读写分离
6. 数据预热与更新策略： 主动更新、缓存降级
7. 监控与应急

 缓存击穿
缓存击穿是指一个访问非常频繁的"热点数据"(如明星八卦、秒杀商品),存在缓存过期的瞬间,同时有大量请求直接穿透缓存,全部打到数据库上,导致数据库瞬时压力激增,甚至可能被压垮的现象
核心特征
1. 缓存中有这个key:数据之前是有的
2. Key恰好过期:在某个时间点 key到了过期时间,从缓存中删除了
3. 并发量巨大:有大量用户、线程同时请求这个相同的数据
4. 数据库压力称为瓶颈:所有请求在缓存中查不到,同时去数据库查询、加载数据,造成数据库瞬间极高并发压力

解决方案:
1. 使用互斥锁 加分布式锁
2. 逻辑过期  将过期时间保存到value中
3. 提前续期 设置守护线程去查询过期数据 一直续期

 缓存穿透
缓存穿透是指用户查询一个在缓存和数据库中都不存在的数据，由于缓存通常采用"缓存为命中则查询数据库"的策略（如get key -> null -> select db）这类请求频繁发生时，会导致每次请求都无法命中缓存，从而直接穿透到数据库”
核心认证
1. 查询的key在缓存和数据库中根本不存在
2. 请求量大 求通常是恶意或者异常请求   

如何解决:
1. 参数校验:针对参数进行规范校验 如id范围 字符串长度等
2. 缓存空对象: 针对非实时要求的数据 查询到数据为空时 存到缓存中一个较短的时间
3. 布隆过滤器（存在概率性 不支持删除）、布谷鸟过滤器 （支持删除）
4. 实时监控与黑名单
5. 接口限流与降级


