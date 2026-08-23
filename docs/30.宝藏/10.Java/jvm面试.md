---
title: jvm面试
date: 2026-08-12 22:23:44
permalink: /pages/06b1d1/
categories:
  - 宝藏
  - Java
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# Java后端资深工程师面试高频场景题深度文稿

**Java后端资深工程师**
**面试高频场景题深度文稿**

覆盖 JVM · 并发 · MySQL · Redis · Spring · 分布式一致性

---

# **使用说明**


# **模块一：JVM性能故障场景**

## **1.1 线上频繁Full GC导致服务响应超时**

**【场景描述】**某电商订单服务在大促期间，QPS从平时500飙升至5000，运行约30分钟后接口RT从50ms飙升至2000ms，部分请求直接超时。监控显示JVM堆内存使用率持续在95%以上，Full GC频率从每天几次变为每分钟3-5次，每次Full GC停顿时间约1.5-3秒。

**【故障现象】**

- 应用日志：大量请求超时，线程池队列积压

- JVM监控：老年代使用率>95%，Full GC频繁，GC耗时占比>20%

- 业务监控：订单创建成功率从99.9%下降至92%

- 服务器监控：CPU使用率不高（GC线程在等待），但应用无响应

**【解决方案】**

**▶ 资深回答（体系化调优 + 根因定位 + 预防机制）**

完整的排查和调优应分为"紧急止血 → 根因定位 → 长期优化"三个阶段：

**【紧急止血】**

- 从负载均衡摘除该节点流量，避免影响扩大

- 若确认非内存泄漏，可通过jcmd <pid> GC.run 手动触发Full GC观察回收效果

- 临时调整 -XX:MaxHeapFreeRatio 或重启服务恢复

**【根因定位】**

使用jcmd进行综合诊断（比jmap更安全，不会暂停整个JVM）：
~~~shell
# 查看GC统计
jcmd <pid> GC.heap_info
jcmd <pid> GC.class_histogram | head -30

# 安全导出堆转储（live参数会先触发一次Full GC再dump，文件更小）
jcmd <pid> GC.heap_dump /tmp/heap_$(date +%Y%m%d_%H%M%S).hprof

# 查看线程栈，确认是否有线程在创建大对象
jcmd <pid> Thread.print
~~~
MAT分析关键操作：

- Dominator Tree：找出占用内存最大的对象及其保留集

- Path to GC Roots：查看对象为何无法被回收（引用链）

- Leak Suspects Report：MAT自动生成的内存泄漏嫌疑报告

- 对比两个时间点的heap dump，找出持续增长的对象类型

**【GC调优参数配置（生产级）】**

~~~text
# G1收集器推荐配置（JDK8+，堆内存4G-32G适用）
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200          # 目标停顿时间200ms
-XX:G1HeapRegionSize=16m          # Region大小，堆8G时设16m
-XX:InitiatingHeapOccupancyPercent=45  # IHOP阈值，老年代占45%时启动并发标记
-XX:G1MixedGCLiveThresholdPercent=85   # Mixed GC回收Region中存活对象低于85%才回收
-XX:G1MixedGCCountTarget=8        # Mixed GC次数上限
-XX:+ParallelRefProcEnabled       # 并行处理Reference
-XX:+AlwaysPreTouch               # 启动时预分配内存，避免运行时缺页
-XX:+HeapDumpOnOutOfMemoryError   # OOM时自动dump
-XX:HeapDumpPath=/var/log/jvm/
-Xms8g -Xmx8g                     # 堆大小固定，避免动态扩缩
-Xss512k                          # 线程栈大小
-XX:MetaspaceSize=256m
-XX:MaxMetaspaceSize=512m
~~~

**【底层原理】**

**1. Full GC触发条件（以G1为例）**

- 显式调用System.gc()（可通过-XX:+DisableExplicitGC禁用）

- 老年代空间不足，无法容纳新晋升对象

- 元空间（Metaspace）使用达到MaxMetaspaceSize

- CMS/G1的并发模式失败（Concurrent Mode Failure），退化为Full GC

- 晋升失败（Promotion Failure）：Survivor区放不下，老年代也放不下

**2. G1 GC的Region模型与回收流程**

G1堆内存结构（逻辑分区，物理不连续）：  
```text
┌─────────────────────────────────────────────────────────┐  
│  E  │  E  │  S  │  O  │  O  │  O  │  H  │  O  │  E  │  O  │  
│  E  │  E  │  S  │  O  │  O  │  O  │  H  │  O  │  E  │  O  │  
│     │     │     │     │     │     │     │     │     │     │  
│  Eden Region  │Surv│     Old Generation Region     │Humongous│  
│  (年轻代)     │ivor│                                │ (大对象) │  
└─────────────────────────────────────────────────────────┘  
```
每个Region大小：1m/2m/4m/8m/16m/32m（2的幂，由堆大小决定）

G1回收流程：  
```text
┌──────────┐    ┌──────────────┐    ┌──────────────┐  
│ YGC      │───▶│ Concurrent   │───▶│ Mixed GC     │  
│ (STW)    │    │ Marking      │    │ (STW, 回收    │  
│ 回收Eden │     │ (并发标记)    │    │  Eden+部分Old │  
│ +Survivor│    │  计算各Region │    │  Region)     │  
└──────────┘    │  存活对象占比  │    └──────────────┘  
                └──────────────┘           │  
                     ▲                     ▼  
                     │              ┌──────────────┐  
                     └──────────────│ Full GC      │  
                        并发标记失败  │ (STW, 全堆    │  
                        或老年代满    │ 单线程回收)    │  
                                    └──────────────┘  
```

**3. GC Roots的本质**

GC Roots不是一个具体的对象，而是一组"必须存活的引用起点"。JVM通过OopMap记录这些位置：

- 虚拟机栈中引用的对象（局部变量表）

- 方法区中类静态属性引用的对象

- 方法区中常量引用的对象（如String常量池）

- 本地方法栈中JNI引用的对象

- 被synchronized锁持有的对象

G1使用Remembered Set（RSet）记录其他Region对当前Region的引用，避免全堆扫描。每个Region维护一个RSet，通过写屏障（Write Barrier）在引用变更时更新。

**【面试官追问预判】**

- Q: G1和CMS的核心区别是什么？为什么JDK9后默认用G1？

A: CMS基于"标记-清除"会产生内存碎片，仅回收老年代；G1基于"标记-整理+复制"，将堆分为等大Region，可预测停顿时间，同时管理年轻代和老年代。G1通过RSet避免全堆扫描，适合大堆（4G+）场景。CMS在JDK9被标记为废弃。

- Q: 什么是Humongous对象？它会带来什么问题？

A: 超过Region大小50%的对象称为Humongous对象，直接分配在老年代的连续Region中。问题：①无法被普通YGC回收，只能在Mixed GC或Full GC时回收；②可能导致Region碎片化。JDK8u40后，并发标记阶段可以回收无引用的Humongous对象。

- Q: -XX:MaxGCPauseMillis设太小会怎样？

A: G1会通过调整年轻代Region数量来满足目标停顿。设太小会导致年轻代变小，YGC频率增加，总GC时间反而上升。一般建议100-300ms，根据业务RT要求调整。

- Q: 如何在不重启服务的情况下动态调整GC参数？

A: 大部分GC参数需要重启。但可以通过jcmd修改部分参数，如jcmd <pid> VM.set_flag MaxGCPauseMillis 300。也可以用JVMTI或JMX连接。


## **1.2 各种OOM场景排查与解决方案**

**【场景描述】**生产环境中遇到多种不同类型的OutOfMemoryError，包括Java heap space、Metaspace、unable to create new native thread、Direct buffer memory、GC overhead limit exceeded等，需要快速区分类型并定位根因。

**【故障现象】**

- java.lang.OutOfMemoryError: Java heap space — 堆内存不足

- java.lang.OutOfMemoryError: Metaspace — 元空间不足

- java.lang.OutOfMemoryError: unable to create new native thread — 线程数超限

- java.lang.OutOfMemoryError: Direct buffer memory — 堆外内存不足

- java.lang.OutOfMemoryError: GC overhead limit exceeded — GC耗时占比过高

**【解决方案】**

**▶ 中级回答**

不同OOM类型根因完全不同，必须对症下药：

**1. Java heap space**

- 原因：堆中对象过多无法回收，或大对象无法分配

- 排查：-XX:+HeapDumpOnOutOfMemoryError自动dump，MAT分析

- 解决：修复内存泄漏 / 增大堆 / 优化大对象创建

**2. Metaspace**

- 原因：动态生成的类过多（CGLIB、ASM、JDK动态代理、Groovy脚本、热部署）

- 排查：jcmd <pid> GC.class_stats（需加-XX:+UnlockDiagnosticVMOptions）查看类加载统计

- 解决：检查是否重复创建代理对象 / 增大-XX:MaxMetaspaceSize / 修复类加载器泄漏

**3. unable to create new native thread**

- 原因：创建的线程数超过操作系统限制（ulimit -u）或进程虚拟内存不足

- 排查：jstack查看线程数，ps -eLf | grep <pid> | wc -l统计线程数

- 解决：优化线程池（避免new Thread()）/ 调大ulimit / 减小-Xss

**4. Direct buffer memory**

- 原因：NIO的DirectByteBuffer分配过多，堆外内存耗尽

- 排查：jmap -histo查看DirectByteBuffer数量，检查Netty/HttpClient配置

- 解决：调大-XX:MaxDirectMemorySize / 检查是否有堆外内存泄漏

**5. GC overhead limit exceeded**

- 原因：GC耗时超过98%且回收内存不足2%（JDK默认策略）

- 排查：通常伴随内存泄漏，堆几乎被占满

- 解决：同Java heap space的排查方法

**▶ 资深回答**

从JVM内存模型和操作系统层面理解各类OOM的本质：

**【JVM内存区域与OOM对应关系】**

JVM运行时内存区域：
```text
┌──────────────────────────────────────────────────┐
│                  进程虚拟内存空间                    │
│  ┌────────────────────────────────────────────┐  │
│  │  JVM堆（-Xms ~ -Xmx）                       │  │
│  │  ┌──────┬──────────┬────────────────────┐  │  │
│  │  │ Eden │ Survivor │   Old Generation   │  │  │── Java heap space
│  │  │      │  S0/S1   │                    │  │  │   GC overhead limit
│  │  └──────┴──────────┴────────────────────┘  │  │
│  ├────────────────────────────────────────────┤  │
│  │  元空间 Metaspace（本地内存，非JVM堆）       │  │── Metaspace
│  │  （类元数据、常量池、静态变量）               │  │
│  ├────────────────────────────────────────────┤  │
│  │  堆外内存 Direct Memory                     │  │── Direct buffer memory
│  │  （DirectByteBuffer、Netty PooledByteBuf）  │  │
│  ├────────────────────────────────────────────┤  │
│  │  线程栈（每个线程-Xss大小，本地内存）         │  │── unable to create
│  │  线程数 × Xss = 线程栈总内存                 │  │   new native thread
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**【线程OOM的深度分析】**

unable to create new native thread的本质不是JVM堆不够，而是操作系统层面无法创建新线程。在Linux中，每个线程对应一个内核task_struct，需要：

- 内核栈空间（8KB）

- 用户态线程栈（-Xss指定，默认1024KB）

- 进程文件描述符、PID等资源

限制来源：

- ulimit -u（max user processes）：默认通常1024或4096

- /proc/sys/kernel/threads-max：系统全局线程数上限

- /proc/sys/vm/max_map_count：内存映射区域数（默认65530）

- 虚拟地址空间：32位系统约2-3GB，64位理论无限制但受物理内存约束
~~~text
# 排查线程OOM的完整命令
# 1. 查看当前进程线程数
ps -eLf | grep <pid> | wc -l
# 或
ls /proc/<pid>/task | wc -l

# 2. 查看线程限制
ulimit -a | grep "max user processes"
cat /proc/sys/kernel/threads-max

# 3. 查看线程分布（哪些线程在运行）
jstack <pid> | grep "java.lang.Thread.State" | sort | uniq -c | sort -rn

# 4. 生产级线程池配置（避免无限制创建线程）
@Bean
public ThreadPoolExecutor bizThreadPool() {
int coreSize = Runtime.getRuntime().availableProcessors() * 2;
return new ThreadPoolExecutor(
coreSize,                          // 核心线程数：CPU核数×2（IO密集型）
coreSize * 4,                      // 最大线程数
60L, TimeUnit.SECONDS,             // 空闲线程存活时间
new LinkedBlockingQueue<>(1000),   // 有界队列，防止OOM
new ThreadFactoryBuilder()         // Guava线程工厂，设置有意义的线程名
.setNameFormat("biz-pool-%d")
.setDaemon(false)
.build(),
new ThreadPoolExecutor.CallerRunsPolicy()  // 拒绝策略：调用者线程执行
);
}
~~~

**【堆外内存泄漏排查】**

DirectByteBuffer通过Cleaner（虚引用）回收，依赖GC触发。如果创建速度远快于GC回收速度，或存在内存泄漏，会导致堆外内存OOM。Netty的PooledByteBuf如果忘记release也会泄漏。

~~~shell
# 排查堆外内存
# 1. 查看DirectByteBuffer统计
jcmd <pid> VM.native_memory summary  # 需加-XX:NativeMemoryTracking=summary

# 2. 查看进程实际内存使用（RSS）
ps -o pid,rss,vsz -p <pid>
# RSS远超-Xmx说明堆外内存占用大

# 3. Netty内存泄漏检测（开发环境开启）
-Dio.netty.leakDetection.level=advanced  # 级别：DISABLED/SIMPLE/ADVANCED/PARANOID

# 4. 限制堆外内存大小
-XX:MaxDirectMemorySize=512m
# Netty中：
-Dio.netty.maxDirectMemory=536870912
~~~

**【底层原理】**

**1. OOM的抛出机制**

当JVM在分配内存失败时，会先尝试GC。如果GC后仍无法分配，且满足对应条件，则在当前线程的执行路径上抛出OutOfMemoryError。注意OOM是Error不是Exception，可以被catch但不建议catch后继续执行业务逻辑（因为JVM可能已处于不稳定状态）。

**2. GC overhead limit exceeded的触发条件**

JDK定义：如果超过98%的时间用于GC，且每次GC回收不到2%的堆内存，连续5次GC都满足此条件，则抛出此错误。可通过-XX:-UseGCOverheadLimit禁用（不推荐，只是延迟OOM）。

**3. Metaspace vs 永久代（PermGen）**

- JDK7及之前：永久代在JVM堆内，受-XX:MaxPermSize限制，存储类元数据、常量池、静态变量

- JDK8+：元空间在本地内存（Native Memory），受-XX:MaxMetaspaceSize限制，默认无上限

- 好处：避免永久代OOM、支持类数据并发卸载、与JRockit统一

- 风险：如果不限MaxMetaspaceSize，类加载泄漏会耗尽系统内存

**【面试官追问预判】**

- Q: 堆OOM后JVM还能运行吗？其他线程还能工作吗？

A: OOM是在尝试分配内存的线程上抛出的，如果该线程catch了OOM且JVM还有空闲内存，其他线程可以继续工作。但如果堆已完全耗尽，后续所有分配都会OOM，服务基本不可用。建议OOM后让进程退出（-XX:+ExitOnOutOfMemoryError），由K8s/ supervisord重启。

- Q: 如何在OOM时自动告警和重启？

A: 配置-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/path/ -XX:OnOutOfMemoryError="sh /path/restart.sh"。OnOutOfMemoryError可以执行任意脚本，如发送告警、采集环境信息、重启服务。

- Q: String.intern()会导致什么OOM？

A: JDK7+，intern()的字符串存放在堆中（不再是永久代），但如果大量调用intern()且字符串不重复，会导致常量池持续增长，最终堆OOM。JDK6中会导致PermGen OOM。



## **1.3 GC调优实战：从Parallel GC到G1/ZGC的迁移**

**【场景描述】**某核心交易服务使用JDK8，默认Parallel GC，堆内存16G。随着业务增长，YGC停顿约200ms，Full GC约3-5秒，影响交易SLA（要求99.9%请求<500ms）。需要进行GC调优并评估升级到ZGC的可行性。

**【故障现象】**

- YGC频率：每30秒一次，停顿150-250ms

- Full GC：每天2-3次，每次3-5秒

- 交易接口P99：800ms（目标500ms）

- GC日志显示：老年代增长速度快，晋升阈值偏低

**【解决方案】**

**▶ 资深回答**

完整的GC调优方法论 + 收集器选型决策：

**【GC调优目标三角】**

吞吐量 (Throughput)
▲
╱ ╲
╱   ╲
╱     ╲
╱       ╲
╱         ╲
╱           ╲
╱             ╲
╱               ╲
╱                 ╲
╱                   ╲
╱                     ╲
◆───────────────────────◆
低停顿 ◄──── 权衡 ────► 高停顿
(Latency)              (Latency)

调优原则：先明确业务对三者的优先级，再选收集器
- 吞吐量优先（离线计算、批处理）：Parallel GC
- 低延迟优先（在线交易、API服务）：G1 / ZGC / Shenandoah
- 小堆（<2G）：Serial GC / Parallel GC
- 大堆（>32G）：G1 / ZGC

**【Parallel GC调优要点】**

Parallel GC（JDK8默认，吞吐量优先）
-XX:+UseParallelGC
-XX:+UseParallelOldGC          # 老年代也用并行回收
-XX:ParallelGCThreads=8        # GC线程数，默认=CPU核数
-XX:GCTimeRatio=99             # 吞吐量目标=1/(1+99)=1%时间用于GC
-XX:MaxGCPauseMillis=200       # 最大停顿目标（尽力而为）
-XX:NewRatio=2                 # 年轻代:老年代 = 1:2
-XX:SurvivorRatio=8            # Eden:Survivor = 8:1:1
-XX:MaxTenuringThreshold=15    # 最大晋升年龄（对象在Survivor经历15次YGC后晋升）

关键调优：如果Full GC频繁，检查是否老年代太小
如果YGC频繁且停顿长，检查是否Eden太小
如果晋升失败（Promotion Failure），增大Survivor或老年代

**【G1 GC调优要点】**

# G1 GC（JDK9+默认，平衡吞吐量和延迟）
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
-XX:G1HeapRegionSize=16m       # 堆16G时，Region数=1024，每个16M
-XX:InitiatingHeapOccupancyPercent=45  # 默认45，老年代占比达到此值启动并发标记
-XX:G1NewSizePercent=5         # 年轻代最小占比（默认5%）
-XX:G1MaxNewSizePercent=60     # 年轻代最大占比（默认60%）
-XX:G1MixedGCLiveThresholdPercent=85   # Region存活对象<85%才被Mixed GC回收
-XX:G1MixedGCCountTarget=8     # 一次并发标记后最多8次Mixed GC
-XX:G1HeapWastePercent=5       # 堆浪费超过5%时停止Mixed GC
-XX:+G1SummarizeRSetStats      # 输出RSet统计（调试用）

调优经验：
1. 如果MaxGCPauseMillis设太小，G1会缩小年轻代，导致YGC频率暴增
2. IHOP设太低会导致并发标记频繁，设太高会导致Mixed GC回收不及时
3. G1MixedGCLiveThresholdPercent设太低会导致可回收Region变少

**【ZGC评估与配置（JDK11+，JDK15生产可用）】**

ZGC（亚毫秒级停顿，适合大堆低延迟场景）
-XX:+UseZGC                   # JDK11-15需加此参数，JDK15后可直接用
-XX:+UnlockExperimentalVMOptions  # JDK11-12需要
-Xmx16g -Xms16g
-XX:ZCollectionInterval=30    # 两次GC最小间隔（秒）
-XX:ZAllocationSpikeTolerance=2.0  # 分配尖峰容忍度
-XX:+UseLargePages            # 使用大页（需OS配置）
-XX:+UseTransparentHugePages  # 透明大页（更简单）

ZGC核心特性：
- 并发整理（Concurrent Compaction）：几乎所有阶段并发执行
- 着色指针（Colored Pointers）：指针中存储对象元信息（finalizable/remapped/marked0/marked1）
- 负载屏障（Load Barrier）：读取对象时检查指针颜色，触发自愈
- 停顿时间与堆大小无关，通常<10ms
- 支持TB级堆内存

ZGC停顿阶段（仅这三个阶段STW）：
1. Start Marking（开始标记）：<1ms
2. End Marking（结束标记）：<1ms
3. Start Relocation（开始迁移）：<1ms

**【收集器选型决策树】**

堆内存大小？
```text
│
├─ < 2GB ──────────────► Serial GC（客户端模式）
│
├─ 2GB ~ 8GB
│   │
│   ├─ 吞吐量优先 ────► Parallel GC
│   └─ 延迟优先 ──────► G1 GC
│
├─ 8GB ~ 32GB
│   │
│   ├─ JDK8 ──────────► G1 GC（推荐）
│   ├─ JDK11+ ────────► G1 GC（稳定）或 ZGC（实验性，JDK11-14）
│   └─ JDK15+ ────────► ZGC（生产可用，延迟<10ms）
│
└─ > 32GB
│
├─ JDK8 ──────────► G1 GC（注意Region大小）
├─ JDK11-14 ──────► G1 GC（ZGC仍实验性）
└─ JDK15+ ────────► ZGC（最佳选择，支持TB级堆）
```

**【底层原理】**

**1. G1的CSet（Collection Set）与RSet**

CSet是每次GC要回收的Region集合。YGC的CSet=所有Eden+Survivor Region；Mixed GC的CSet=Eden+Survivor+部分回收价值高的Old Region。RSet记录"哪些Region引用了我"，通过写屏障在引用变更时维护，避免全堆扫描。

**2. ZGC的着色指针与负载屏障**

64位指针（ZGC利用高4位存储元信息）：
```text
┌────────┬────────┬────────┬────────┬──────────────────────────┐
│ 1 bit  │ 1 bit  │ 1 bit  │ 1 bit  │      42 bits             │
│Remapped│Marked1 │Marked0 │Finaliz │     对象地址              │
└────────┴────────┴────────┴────────┴──────────────────────────┘
```
42位可寻址 4TB（2^42），JDK13后支持16TB

负载屏障（Load Barrier）伪代码：
~~~java
Object load(Object* ref) {
    if (ref->is_bad()) {           // 指针颜色不对
        if (is_from_space(ref)) {  // 对象在from-space
            heal(ref);             // 自愈：更新指针到新地址
        }
    }
    return *ref;
}
~~~
效果：应用线程在读取对象时自动完成指针修复，GC线程不需要STW来更新所有引用

**3. GC日志分析关键指标**

- YGC频率：正常应>5秒一次，<1秒说明年轻代太小

- YGC停顿：正常<100ms，G1目标由MaxGCPauseMillis控制

- 晋升速率：YGC后老年代增长速度，正常应<100MB/s

- Full GC频率：理想为0，每天>1次需要排查

- GC耗时占比：正常<5%，>10%说明GC压力大

## 开启GC日志（JDK9+统一格式，JDK8用旧参数）

### JDK8:

-XX:+PrintGCDetails -XX:+PrintGCDateStamps -XX:+PrintGCApplicationStoppedTime
-XX:+PrintPromotionFailure -Xloggc:/var/log/gc/gc-%t.log
-XX:+UseGCLogFileRotation -XX:NumberOfGCLogFiles=10 -XX:GCLogFileSize=100M

### JDK9+:

-Xlog:gc*,gc+heap=trace,gc+age=trace:file=/var/log/gc/gc-%t.log:time,uptime,level,tags:filecount=10,filesize=100M

**【面试官追问预判】**

- Q: G1的Region大小如何选择？设错了有什么影响？

A: Region大小必须是2的幂（1-32M），JVM会根据堆大小自动选择（堆/2048）。手动设置时确保Region数在2000左右最佳。太小：Region数过多，RSet开销大；太大：大对象更容易成为Humongous，回收效率低。

- Q: ZGC有什么缺点？什么场景不适合用？

A: 缺点：①吞吐量比Parallel/G1低约5-15%（负载屏障开销）；②需要更多内存（负载屏障导致额外的对象复制）；③JDK11-14为实验性。不适合：吞吐量优先的批处理任务、内存极度紧张的场景。

- Q: 什么是安全点（Safepoint）？GC为什么需要安全点？

A: 安全点是线程执行过程中某些特定位置，此时线程状态是确定的（OopMap已更新）。GC需要所有线程到达安全点才能STW，因为只有在安全点才能准确枚举GC Roots。安全点通常在：方法返回、循环回边、异常抛出、JNI调用返回处。如果有线程长时间不到达安全点（如大循环），会导致GC停顿时间变长（SafePoint Time）。

---

# **模块二：并发多线程场景**

## **2.1 高并发计数器原子性问题与CAS深度解析**

**【场景描述】**某秒杀系统需要统计商品被抢购的次数，使用int count++实现。压测时发现1000个并发请求，预期count=1000，实际只有876。同时在QPS 5000时，使用synchronized的版本RT明显升高。

**【故障现象】**

- 计数器结果小于预期值（丢失更新）

- synchronized版本在高并发下吞吐量下降明显

- 使用AtomicInteger后，在极高并发下CPU使用率飙升

**【解决方案】**

**▶ 中级回答**

count++的字节码层面分为3步：getstatic（读取）、iadd（加1）、putstatic（写回），多线程穿插执行会导致丢失更新。解决方案演进：
~~~java
// 方案1：synchronized（重量锁，高并发下线程阻塞唤醒开销大）
private int count = 0;
public synchronized void increment() {
    count++;
}

// 方案2：AtomicInteger（无锁，基于CAS）
private AtomicInteger count = new AtomicInteger(0);
public void increment() {
    count.incrementAndGet();  // 内部使用Unsafe.compareAndSwapInt
}

// 方案3：LongAdder（JDK8+，高并发下比AtomicLong更优）
private LongAdder count = new LongAdder();
public void increment() {
    count.increment();  // 分段累加，最后sum()汇总
}

AtomicInteger的incrementAndGet()源码：

public final int incrementAndGet() {
    return unsafe.getAndAddInt(this, valueOffset, 1) + 1;
}

// Unsafe.getAndAddInt（JDK8）
public final int getAndAddInt(Object obj, long offset, int delta) {
    int v;
    do {
        v = getIntVolatile(obj, offset);  //  volatile读，获取最新值
    } while (!compareAndSwapInt(obj, offset, v, v + delta));  // CAS尝试更新
    return v;
}
// 自旋CAS：如果失败（其他线程已修改），重新读取最新值再尝试
~~~
**▶ 资深回答**

从硬件指令到JDK实现的完整链路：

**【CAS的硬件基础】**

CAS（Compare-And-Swap）是一条CPU原子指令，x86架构下对应CMPXCHG指令。在多核心环境下，CMPXCHG本身不是原子的，需要加LOCK前缀（LOCK CMPXCHG），通过锁缓存行（Cache Lock）或锁总线（Bus Lock）保证原子性。

CAS操作流程：
线程A                     内存值V=0
```text
│                          │
│── 读取V=0 ──────────────▶│
│  预期值E=0               │
│  新值N=1                 │
│                          │
│── CAS(E=0, N=1) ────────▶│  比较V==E?
│                          │  V(0)==E(0) ✓ → 更新V=1，返回true
│◀── 返回true ─────────────│
│                          │
```
线程B（在A之前已修改）        内存值V=1
```text
│                          │
│── 读取V=1 ──────────────▶│
│  预期值E=0（旧值）        │
│  新值N=1                 │
│                          │
│── CAS(E=0, N=1) ────────▶│  比较V==E?
│                          │  V(1)!=E(0) ✗ → 不更新，返回false
│◀── 返回false ────────────│
│  自旋重试：重新读取V=1    │
```

**【LongAdder的分段累加原理】**

AtomicLong在高并发下，多个线程竞争同一个变量的CAS，导致大量自旋重试（CPU飙高）。LongAdder将一个变量拆分为base + cells[]数组，每个线程通过哈希映射到不同的cell，减少竞争。sum()时遍历cells累加。

LongAdder内部结构：
```text
┌─────────────────────────────────────────┐
│              LongAdder                   │
│  ┌──────┐  ┌───┬───┬───┬───┬───┬───┐   │
│  │ base │  │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │   │  cells数组（懒加载）
│  │  0   │  │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │   │  每个元素是一个Cell
│  └──────┘  └───┴───┴───┴───┴───┴───┘   │
└─────────────────────────────────────────┘
```

线程竞争流程：
```text
线程1 (hash=0) ──CAS──▶ Cell[0] += 1  ✓
线程2 (hash=1) ──CAS──▶ Cell[1] += 1  ✓  无竞争
线程3 (hash=0) ──CAS──▶ Cell[0] += 1  ✗ 竞争→扩容cells或重新hash
```

sum() = base + Σ(cell[i].value)

Cell类的设计：
~~~java
@sun.misc.Contended  // 缓存行填充，避免伪共享
static final class Cell {
    volatile long value;
    // ...
}
~~~
**【伪共享与缓存行填充】**

CPU缓存以缓存行（Cache Line，通常64字节）为单位加载。如果多个volatile变量在同一缓存行，一个变量的修改会导致整个缓存行失效，其他CPU核心需要重新加载——这就是伪共享（False Sharing）。LongAdder的Cell使用@Contended注解自动填充缓存行。

伪共享问题：
缓存行（64字节）：
```text
┌──────────────────────────────────────────────────┐
│  Cell[0].value │ Cell[1].value │ Cell[2].value  │  三个变量在同一缓存行
│     8字节       │     8字节       │     8字节       │
└──────────────────────────────────────────────────┘
CPU1修改Cell[0] → 缓存行失效 → CPU2/CPU3需要重新加载整个缓存行
```

@Contended填充后：
```text
┌──────────────────┬──────────────────┬──────────────────┐
│ Cell[0]+padding  │ Cell[1]+padding  │ Cell[2]+padding  │  每个Cell独占缓存行
│    64字节         │    64字节         │    64字节         │
└──────────────────┴──────────────────┴──────────────────┘
```

**【底层原理】**

**1. CAS的ABA问题**

ABA问题：变量值从A变为B，又变回A，CAS检查时认为值没变，但实际上已经被修改过。解决方案：使用AtomicStampedReference（版本号）或AtomicMarkableReference（布尔标记）。
~~~java
// AtomicStampedReference：带版本号的CAS
AtomicStampedReference<Integer> ref = new AtomicStampedReference<>(0, 0);
int[] stamp = new int[1];
Integer value = ref.get(stamp);  // 同时获取值和版本号
ref.compareAndSet(value, newValue, stamp[0], stamp[0] + 1);  // 值和版本号都匹配才更新
~~~
**2. volatile的内存语义**

- 可见性：volatile写会立即刷新到主内存，volatile读会直接从主内存读取（失效本地缓存）

- 有序性：禁止指令重排序（通过内存屏障Memory Barrier实现）

- 不保证原子性：volatile i++仍然不是原子操作

内存屏障（x86架构）：

volatile写的内存屏障：
StoreStore屏障 → volatile写 → StoreLoad屏障
（禁止前面的写与volatile写重排）（禁止volatile写与后面的读重排）

volatile读的内存屏障：
volatile读 → LoadLoad屏障 → LoadStore屏障
（禁止volatile读与后面的读重排）（禁止volatile读与后面的写重排）

x86架构只有StoreLoad屏障是真正的屏障（lock addl $0x0,(%rsp)），
其他屏障在x86下是空操作，因为x86是强一致性内存模型（TSO）。

**3. synchronized的锁升级过程**

synchronized锁升级（JDK6+，不可逆）：

~~~text
无锁状态 ──▶ 偏向锁 ──▶ 轻量级锁 ──▶ 重量级锁
01         01(biased)   00          10
~~~

偏向锁：Mark Word存储线程ID，同一线程重入无需CAS  
轻量级锁：CAS竞争Mark Word，失败则自旋，自旋一定次数后膨胀  
重量级锁：依赖操作系统Mutex，线程阻塞（从用户态切换到内核态）

Mark Word（64位）结构：
```text
┌──────────────────────────────────────────────────────┬──────┐
│                     62 bits                           │2 bits│
│  线程ID(54)+Epoch(2)+分代年龄(4)+偏向锁标记(1)+unused(1)│  01  │ 偏向锁
│  锁记录指针(62)                                        │  00  │ 轻量级锁
│  重量级锁指针(62)                                      │  10  │ 重量级锁
│  分代年龄(4)+unused(25)+identity_hashcode(31)+unused(2)│  01  │ 无锁
└──────────────────────────────────────────────────────┴──────┘
```

**【面试官追问预判】**

- Q: AtomicInteger和LongAdder的区别？什么时候用哪个？

A: AtomicInteger是单个变量CAS，竞争激烈时自旋多CPU高；LongAdder分段累加，高并发下吞吐更高，但sum()不是精确值（因为sum过程中可能有更新）。低并发用AtomicInteger（内存占用小、精确），高并发统计用LongAdder。

- Q: CAS自旋会不会一直占用CPU？如何解决？

A: 会。AtomicInteger的CAS是无界自旋，竞争极端激烈时CPU 100%。解决方案：①LongAdder分段减少竞争；②使用带超时的CAS（如tryLock）；③在CAS失败后yield()或sleep()让出CPU；④JDK9的VarHandle可以使用更细粒度的内存屏障。

- Q: 什么是伪共享？除了@Contended还有什么解决方案？

A: 伪共享是多个变量在同一缓存行导致的不必要缓存失效。解决方案：①@Contended注解（JDK8+，需-XX:-RestrictContended）；②手动填充：在变量前后加7个long字段（64字节-8字节值=56字节=7×8）；③合理布局数据结构，避免热点变量相邻。

- Q: synchronized和ReentrantLock的区别？

A: ①synchronized是JVM内置锁，ReentrantLock是API层面的锁（基于AQS）；②ReentrantLock支持公平锁、可中断锁（lockInterruptibly）、超时获取（tryLock）、多条件变量；③synchronized在JDK6后有锁升级优化，性能与ReentrantLock接近；④synchronized自动释放锁（退出同步块），ReentrantLock必须手动unlock()（finally中）。



## **2.2 死锁排查、预防与活锁/饥饿区分**

**【场景描述】**某订单服务在并发处理"转账"和"退款"时，偶发线程全部阻塞，接口无响应。jstack发现大量线程BLOCKED状态，互相等待对方释放锁。重启后恢复，但不定期复现。

**【故障现象】**

- 接口RT持续升高，最终全部超时

- jstack显示多个线程处于BLOCKED状态，互相持有对方需要的锁

- CPU使用率不高（线程都在等待），但应用无响应

- 重启后恢复，运行一段时间后再次出现

**【解决方案】**

**▶ 中级回答**

死锁产生的四个必要条件（缺一不可）：

- 互斥条件：资源不能被多个线程同时使用

- 占有且等待：持有一个锁的同时等待另一个锁

- 不可抢占：锁只能被持有者主动释放，不能被强制剥夺

- 循环等待：线程间形成循环等待链

排查方法：
~~~shell
# 1. jstack检测死锁（自动检测synchronized死锁）
jstack <pid> | grep -A 30 "Found one Java-level deadlock"

# 2. jcmd检测死锁
jcmd <pid> Thread.print -l  # -l会打印锁信息

# 3. Arthas（更强大）
thread -b  # 直接找出阻塞其他线程的线程
thread --deadlock  # 检测死锁

# 4. 典型死锁代码
public void transfer(Account from, Account to, BigDecimal amount) {
synchronized (from) {       // 线程A：先锁from
synchronized (to) {     // 线程A：再锁to
from.debit(amount);
to.credit(amount);
}
}
}
// 线程A: transfer(账户1, 账户2) → 先锁账户1，等账户2
// 线程B: transfer(账户2, 账户1) → 先锁账户2，等账户1 → 死锁！
~~~
预防方案：

- 固定加锁顺序：按账户ID升序加锁（破坏循环等待）

- 使用tryLock超时：ReentrantLock.tryLock(timeout)，超时则放弃（破坏不可抢占）

- 一次性获取所有锁：用一个全局锁管理，原子获取多个锁

- 降低锁粒度：避免在持有锁的同时调用外部方法（可能触发其他锁）

**▶ 资深回答**

从操作系统层面理解死锁，并区分死锁/活锁/饥饿：

**【死锁的操作系统本质】**

Java的synchronized重量级锁最终依赖操作系统的互斥量（Mutex）。当线程获取锁失败时，会被加入该锁的等待队列（_WaitSet），状态从RUNNABLE变为BLOCKED，并通过park()系统调用（Linux下是futex）挂起。死锁时，多个线程的等待关系形成有向环。

**【固定顺序加锁的生产级实现】**
~~~java
// 方案1：按系统哈希值排序加锁（注意哈希冲突时的处理）
public void transfer(Account from, Account to, BigDecimal amount) {
    Account first = from;
    Account second = to;
    // 按identityHashCode排序，确保加锁顺序一致
    if (System.identityHashCode(from) > System.identityHashCode(to)) {
        first = to;
        second = from;
    }
    synchronized (first) {
        // 哈希冲突时，用额外的"领带锁"（tie-break lock）
        if (System.identityHashCode(from) == System.identityHashCode(to)) {
            synchronized (TIE_LOCK) {
                synchronized (second) {
                    doTransfer(from, to, amount);
                }
            }
        } else {
            synchronized (second) {
                doTransfer(from, to, amount);
            }
        }
    }
}
}

// 方案2：ReentrantLock + tryLock超时（更健壮）
public boolean transfer(Account from, Account to, BigDecimal amount, long timeoutMs) {
    ReentrantLock fromLock = from.getLock();
    ReentrantLock toLock = to.getLock();
    long deadline = System.currentTimeMillis() + timeoutMs;
    while (true) {
        if (!fromLock.tryLock()) return false;
        try {
            if (!toLock.tryLock(timeoutMs, TimeUnit.MILLISECONDS)) {
                return false;  // 获取第二个锁超时，放弃并释放第一个锁
            }
            try {
                from.debit(amount);
                to.credit(amount);
                return true;
            } finally {
            toLock.unlock();
        }
    } catch (InterruptedException e) {
    Thread.currentThread().interrupt();
    return false;
} finally {
fromLock.unlock();  // 确保释放
}
}
}
~~~
**【死锁 vs 活锁 vs 饥饿】**

死锁 (Deadlock)：
```text
线程A ◄──等待── 线程B
│                │
└──持有─────────▶│
```
两个线程都BLOCKED，永远无法继续，CPU占用低

活锁 (Livelock)：
线程A：获取锁1失败 → 释放锁1 → 重试 → 获取锁1失败 → ...
线程B：获取锁2失败 → 释放锁2 → 重试 → 获取锁2失败 → ...
线程都在RUNNABLE，不断重试但无法推进，CPU占用高
典型场景：两个礼貌的人在走廊相遇，都让路给对方，结果都走不了

饥饿 (Starvation)：
线程A（高优先级）不断获取锁 → 线程B（低优先级）永远抢不到
线程在RUNNABLE/WAITING，长时间得不到执行
典型场景：非公平锁下，后来的线程插队，先来的线程一直等

区别总结：
```text
┌──────────┬────────────┬──────────┬──────────────────┐
│   类型    │  线程状态   │ CPU占用  │    能否自行恢复    │
├──────────┼────────────┼──────────┼──────────────────┤
│  死锁     │  BLOCKED   │   低     │   不能（需干预）   │
│  活锁     │  RUNNABLE  │   高     │   可能（随机退避） │
│  饥饿     │  WAITING   │  中/低   │   可能（公平调度） │
└──────────┴────────────┴──────────┴──────────────────┘
```

**【底层原理】**

**1. JVM死锁检测原理**

jstack的死锁检测基于"锁等待图"的环检测。JVM维护每个锁的持有者和等待者列表，通过深度优先搜索（DFS）检测是否存在循环等待。注意：jstack只能检测synchronized和java.util.concurrent锁的死锁，无法检测基于数据库锁或分布式锁的死锁。

**2. futex与线程挂起**

Linux下，ReentrantLock的park()最终调用futex(FUTEX_WAIT)系统调用，将线程加入内核等待队列并切换到内核态。unpark()调用futex(FUTEX_WAKE)唤醒。synchronized重量级锁的等待/唤醒也基于futex。

**【面试官追问预判】**

- Q: 数据库死锁和Java死锁有什么区别？如何排查数据库死锁？

A: 数据库死锁发生在事务层面，基于行锁/表锁。MySQL InnoDB自动检测死锁（wait-for graph），选择回滚代价最小的事务。排查：show engine innodb status查看LATEST DETECTED DEADLOCK。Java死锁是JVM层面的，需要jstack。两者可能同时存在（Java锁+数据库锁嵌套）。

- Q: 如何在生产环境自动检测死锁并告警？

A: ①用JMX的ThreadMXBean.findDeadlockedThreads()定时检测；②Arthas的thread --deadlock；③自定义JVM Agent监控线程状态；④Prometheus + JMX Exporter监控BLOCKED线程数，超过阈值告警。

- Q: 什么是哲学家就餐问题？如何用代码解决？

A: 5个哲学家围坐，每人需要左右两根筷子才能吃饭。经典死锁场景。解决方案：①最多允许4个哲学家同时拿筷子；②奇数先拿左，偶数先拿右（破坏循环等待）；③用tryLock超时获取（破坏不可抢占）。



## **2.3 线程池参数配置、异常处理与性能调优**

**【场景描述】**某服务使用Executors.newFixedThreadPool(10)处理异步任务，大促时任务量激增，出现OOM（队列无限积压）和任务丢失（shutdownNow时）。同时部分任务抛出异常后线程消失，导致线程池实际可用线程越来越少。

**【故障现象】**

- java.util.concurrent.RejectedExecutionException（队列满+线程数达max）

- OOM: Java heap space（LinkedBlockingQueue无界，任务对象积压）

- 线程池线程数逐渐减少（任务异常导致线程死亡）

- 任务执行结果丢失（submit()的异常被吞掉）

**【解决方案】**



**▶ 中级回答**

线程池的核心参数和执行流程：

ThreadPoolExecutor执行流程：
```text
新任务提交
│
▼
当前线程数 < corePoolSize?
│
├─ 是 → 创建核心线程执行任务
│
└─ 否 → 任务加入workQueue
│
├─ 队列未满 → 入队等待
│
└─ 队列已满 → 当前线程数 < maximumPoolSize?
│
├─ 是 → 创建非核心线程执行任务
│
└─ 否 → 执行拒绝策略（RejectedExecutionHandler）
```

线程池参数：
```text
┌──────────────────────┬──────────────────────────────────────┐
│  参数                 │  说明                                  │
├──────────────────────┼──────────────────────────────────────┤
│ corePoolSize         │ 核心线程数，即使空闲也保留（除非allowCoreThreadTimeOut）│
│ maximumPoolSize      │ 最大线程数                             │
│ keepAliveTime        │ 非核心线程空闲存活时间                  │
│ workQueue            │ 任务队列（必须有界！）                  │
│ threadFactory        │ 线程工厂（设置线程名、daemon、优先级）   │
│ rejectedHandler      │ 拒绝策略                               │
└──────────────────────┴──────────────────────────────────────┘
```
~~~java
// 生产级线程池配置
@Bean("orderProcessPool")
public ThreadPoolExecutor orderProcessPool() {
    int cpuCores = Runtime.getRuntime().availableProcessors();
    return new ThreadPoolExecutor(
    cpuCores * 2,                // 核心线程：IO密集型=CPU核数×2
    cpuCores * 4,                // 最大线程：核心×2（根据压测调整）
    60L, TimeUnit.SECONDS,       // 空闲线程60秒回收
    new LinkedBlockingQueue<>(2000),  // 有界队列，容量2000（关键！）
    new ThreadFactoryBuilder()
    .setNameFormat("order-process-%d")  // 有意义的线程名，便于排查
    .setUncaughtExceptionHandler((t, e) -> {
        log.error("线程{}未捕获异常", t.getName(), e);  // 全局异常兜底
    })
    .build(),
    new ThreadPoolExecutor.CallerRunsPolicy()  // 拒绝策略：调用者线程执行（背压）
    );
}

// 任务异常处理（关键！）
// 方式1：execute() + try-catch
pool.execute(() -> {
    try {
        doTask();
    } catch (Exception e) {
    log.error("任务执行失败", e);
}
});

// 方式2：submit() + Future.get()（异常会封装在ExecutionException中）
Future<?> future = pool.submit(() -> doTask());
try {
    future.get();  // 不调用get()，异常会被吞掉！
} catch (ExecutionException e) {
log.error("任务异常", e.getCause());  // 真实异常在getCause()中
}

// 方式3：自定义ThreadPoolExecutor，重写afterExecute
public class TraceableThreadPoolExecutor extends ThreadPoolExecutor {
    @Override
    protected void afterExecute(Runnable r, Throwable t) {
        super.afterExecute(r, t);
        if (t == null && r instanceof Future<?>) {
            try {
                Future<?> future = (Future<?>) r;
                if (future.isDone()) future.get();
            } catch (CancellationException ce) {
            t = ce;
        } catch (ExecutionException ee) {
        t = ee.getCause();
    } catch (InterruptedException ie) {
    Thread.currentThread().interrupt();
}
}
if (t != null) {
    log.error("线程池任务异常", t);
}
}
}
~~~
**▶ 资深回答**

线程池的深度调优与监控：

**【核心线程数计算公式】**

任务类型与线程数配置：
```text
┌──────────────┬──────────────────────────────────────────────┐
│  任务类型      │  公式                                        │
├──────────────┼──────────────────────────────────────────────┤
│ CPU密集型     │ corePoolSize = CPU核数 + 1                   │
│              │ （计算密集，减少上下文切换）                    │
├──────────────┼──────────────────────────────────────────────┤
│ IO密集型      │ corePoolSize = CPU核数 × (1 + W/C)           │
│              │ W=等待时间, C=计算时间                         │
│              │ 如W/C=2（等待是计算的2倍）→ 核数×3             │
├──────────────┼──────────────────────────────────────────────┤
│ 混合型        │ 拆分线程池！CPU任务和IO任务用不同线程池        │
│              │ 避免IO任务占满线程导致CPU任务饥饿               │
└──────────────┴──────────────────────────────────────────────┘
```

实际生产中：先按公式设置，再通过压测调整。
监控指标：活跃线程数、队列积压数、任务完成数、拒绝数

**【四种拒绝策略对比】**

```text
┌───────────────────────┬──────────────────────────────────────────┐
│  拒绝策略               │  行为                                      │
├───────────────────────┼──────────────────────────────────────────┤
│ AbortPolicy（默认）    │ 抛出RejectedExecutionException            │
│ CallerRunsPolicy      │ 由提交任务的线程执行（背压，降低提交速度）   │
│ DiscardPolicy         │ 直接丢弃任务，不抛异常（静默丢失！）         │
│ DiscardOldestPolicy   │ 丢弃队列最老的任务，再尝试提交              │
└───────────────────────┴──────────────────────────────────────────┘
```
生产推荐：CallerRunsPolicy（自动背压）或自定义策略（记录日志+降级）

**【线程池监控（JMX + Micrometer）】**
~~~java
// 自定义线程池监控指标
public class MonitoredThreadPoolExecutor extends ThreadPoolExecutor {
    private final MeterRegistry registry;
    private final String poolName;

    public MonitoredThreadPoolExecutor(..., MeterRegistry registry, String poolName) {
        super(...);
        this.registry = registry;
        this.poolName = poolName;
        registerMetrics();
    }

    private void registerMetrics() {
        // 活跃线程数
        registry.gauge("threadpool.active.threads", Tags.of("pool", poolName),
        this, ThreadPoolExecutor::getActiveCount);
        // 队列大小
        registry.gauge("threadpool.queue.size", Tags.of("pool", poolName),
        this, e -> e.getQueue().size());
        // 已完成任务数
        registry.gauge("threadpool.completed.tasks", Tags.of("pool", poolName),
        this, ThreadPoolExecutor::getCompletedTaskCount);
    }

    @Override
    protected void beforeExecute(Thread t, Runnable r) {
        // 记录任务开始时间，用于计算执行耗时
        ((TraceableTask) r).setStartTime(System.currentTimeMillis());
    }

    @Override
    protected void afterExecute(Runnable r, Throwable t) {
        long duration = System.currentTimeMillis() - ((TraceableTask) r).getStartTime();
        registry.timer("threadpool.task.duration", Tags.of("pool", poolName))
        .record(duration, TimeUnit.MILLISECONDS);
    }
}

// 动态调整线程池参数（无需重启）
public void adjustPoolSize(int newCoreSize, int newMaxSize) {
    executor.setCorePoolSize(newCoreSize);   // 会立即创建/回收线程
    executor.setMaximumPoolSize(newMaxSize);
    // 注意：setCorePoolSize可能导致正在运行的线程被中断
}
~~~
**【线程池优雅关闭】**
~~~java
// 优雅关闭流程（Spring Bean销毁方法）
@PreDestroy
public void shutdown() {
    log.info("开始关闭线程池，待处理任务数：{}", executor.getQueue().size());
    executor.shutdown();  // 停止接受新任务，已提交任务继续执行
    try {
        // 等待已提交任务完成，最多等30秒
        if (!executor.awaitTermination(30, TimeUnit.SECONDS)) {
            log.warn("30秒内任务未完成，强制关闭");
            List<Runnable> droppedTasks = executor.shutdownNow();  // 中断正在执行的任务
            log.error("丢弃了{}个未执行任务", droppedTasks.size());
            // 可选：将丢弃任务持久化，下次启动恢复
            saveDroppedTasks(droppedTasks);
        }
    } catch (InterruptedException e) {
    Thread.currentThread().interrupt();
    executor.shutdownNow();
}
}
~~~
**【底层原理】**

**1. 线程池的Worker设计**

ThreadPoolExecutor内部用Worker类封装线程和任务。Worker继承AQS，实现了Runnable。每个Worker线程启动后，循环从workQueue中取任务执行（getTask()）。Worker的AQS状态用于表示线程是否正在执行任务（非公平锁，不可重入）。

**2. 线程复用原理**
~~~java
Worker线程的run()方法（简化）：
while (task != null || (task = getTask()) != null) {
    w.lock();          // 加锁，表示正在执行任务
    try {
        task.run();    // 执行任务
    } finally {
        task = null;
        w.unlock();    // 解锁，表示空闲
    }
    completedTasks++;
}
// 退出循环 → 线程结束（getTask返回null的条件：
//   1. 线程数超过maximumPoolSize
//   2. 线程空闲超过keepAliveTime且允许超时
//   3. 线程池已shutdown且队列为空）

getTask()中的超时等待：
if (wc > corePoolSize || allowCoreThreadTimeOut) {
    Runnable r = workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS);
    if (r != null) return r;
    timedOut = true;  // 超时，下一轮可能退出
} else {
return workQueue.take();  // 核心线程无限等待
}
~~~
**3. 为什么不建议用Executors创建线程池**

- newFixedThreadPool / newSingleThreadExecutor：LinkedBlockingQueue无界（Integer.MAX_VALUE），可能OOM

- newCachedThreadPool：maximumPoolSize=Integer.MAX_VALUE，可能创建无限线程导致OOM

- newScheduledThreadPool：DelayedWorkQueue无界，同上

- 线程名默认pool-N-thread-M，无法区分业务，排查困难

- 没有自定义拒绝策略，默认AbortPolicy可能导致任务丢失

**【面试官追问预判】**

- Q: 核心线程会被回收吗？如何让核心线程也超时回收？

A: 默认不会。设置allowCoreThreadTimeOut(true)后，核心线程空闲超过keepAliveTime也会回收。注意：设置后所有线程都可能被回收，极端情况下线程池可能变为0线程。

- Q: 线程池抛异常后线程会怎样？submit和execute有什么区别？

A: execute()：异常直接抛出，线程会终止（线程池会创建新线程补充）。submit()：异常被封装在Future中，不调用get()则异常被吞，线程正常复用。所以submit的任务如果忘记get()，异常会静默丢失。

- Q: 如何实现线程池的任务优先级？

A: 使用PriorityBlockingQueue作为workQueue，任务实现Comparable接口。注意：PriorityBlockingQueue是无界的，需要自定义容量限制或监控队列大小。也可以用多个线程池（高优先级池+低优先级池），根据任务类型提交到不同池。

- Q: Tomcat的线程池和JDK原生线程池有什么区别？

A: Tomcat的ThreadPoolExecutor继承JDK的ThreadPoolExecutor，重写了execute()和afterExecute()。核心区别：Tomcat的队列是TaskQueue（继承LinkedBlockingQueue），重写了offer()方法——当线程数小于maximumPoolSize时，offer()返回false，迫使线程池创建新线程而非入队。这样可以在核心线程忙时优先创建新线程，而不是排队等待。

---

# **模块三：MySQL数据库场景**

## **3.1 慢SQL排查与执行计划深度分析**

**【场景描述】**某订单查询接口平时RT 100ms，大促时飙升至5s，数据库CPU使用率90%+。慢查询日志显示一条关联3张表的SQL执行时间超过3秒，扫描行数100万+。

**【故障现象】**

- 接口RT飙升，P99超过5秒

- 数据库CPU使用率持续90%以上

- 慢查询日志大量记录同一SQL

- 连接池耗尽，其他SQL也受影响

**【解决方案】**

**▶ 中级回答**

完整的慢SQL排查流程：
~~~sql
# 1. 开启慢查询日志（生产环境建议长期开启）
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;     -- 超过1秒记录（可设0.1秒）
SET GLOBAL log_queries_not_using_indexes = ON;  -- 记录未使用索引的SQL

# 2. 分析慢查询日志
# 方式1：mysqldumpslow（MySQL自带）
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log  # 按时间排序，取前10
# 方式2：pt-query-digest（Percona工具，更强大）
pt-query-digest /var/log/mysql/slow.log > slow_analysis.txt

# 3. EXPLAIN分析执行计划
EXPLAIN SELECT o.*, u.name, p.product_name
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id
WHERE o.create_time > '2026-01-01' AND o.status = 1
ORDER BY o.create_time DESC
LIMIT 20;
~~~
EXPLAIN关键字段解读：

EXPLAIN输出字段（MySQL 5.7+）：
```text
┌──────────────┬──────────────────────────────────────────────────┐
│  字段          │  含义与关注点                                    │
├──────────────┼──────────────────────────────────────────────────┤
│ id           │ 查询序号，id越大越先执行；相同id从上到下           │
│ select_type  │ SIMPLE/PRIMARY/SUBQUERY/DERIVED/UNION             │
│ table        │ 表名或派生表                                      │
│ type         │ 访问类型（性能从好到差）：                          │
│              │   system > const > eq_ref > ref > range >         │
│              │   index > ALL（全表扫描！）                        │
│ possible_keys│ 可能使用的索引                                    │
│ key          │ 实际使用的索引（NULL=没走索引）                    │
│ key_len      │ 索引使用长度（越短越好，可判断联合索引用了几列）    │
│ ref          │ 索引比较的列或常量                                │
│ rows         │ 预估扫描行数（越小越好）                           │
│ Extra        │ 额外信息：                                        │
│              │   Using index：覆盖索引（好）                      │
│              │   Using where：回表后过滤                          │
│              │   Using filesort：文件排序（需优化ORDER BY）       │
│              │   Using temporary：临时表（需优化GROUP BY/DISTINCT）│
│              │   Using join buffer：关联查询用了join buffer       │
└──────────────┴──────────────────────────────────────────────────┘

```

**▶ 资深回答**
从B+树索引结构到优化器成本模型的完整分析：

**【B+树索引结构】**

InnoDB聚簇索引（主键索引）B+树结构（3层，假设每页16K，每行100字节）：
```text
┌─────────────────────────────────────────────────────────┐
│                    根节点 (Page 1)                        │
│  ┌─────────┬─────────┬─────────┬─────────┐              │
│  │ 主键<100 │100≤..<500│500≤..<900│ 主键≥900 │  指针      │
│  └────┬────┴────┬────┴────┬────┴────┬────┘              │
└───────┼─────────┼─────────┼─────────┼───────────────────┘
│         │         │         │
▼         ▼         ▼         ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 内部节点  │ │ 内部节点  │ │ 内部节点  │ │ 内部节点  │  第2层
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
│            │            │            │
▼            ▼            ▼            ▼
┌───────────────────────────────────────────────────────┐
│  叶子节点（双向链表，存储完整行数据）                      │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐          │
│  │ id=1 │ id=2 │ id=3 │ id=4 │ id=5 │ ...  │  数据行   │
│  │ name │ name │ name │ name │ name │      │          │
│  └──────┴──────┴──────┴──────┴──────┴──────┘          │
└───────────────────────────────────────────────────────┘
```

计算：每页可存 16K/100B ≈ 160行数据（叶子节点）
内部节点每页可存 16K/(8B主键+6B指针) ≈ 1170个指针
3层B+树可存储：1170 × 1170 × 160 ≈ 2.19亿行！
所以查询任意一行最多3次IO（根节点常驻内存，实际2次）

二级索引（非聚簇索引）：
叶子节点存储的是【索引列值 + 主键值】，不是完整行数据
查询非索引列需要"回表"：先查二级索引得到主键，再查聚簇索引

覆盖索引：查询的列都在二级索引中，无需回表（Extra: Using index）

**【慢SQL优化实战案例】**
~~~sql
-- 问题SQL：分页查询（深度分页）
SELECT * FROM orders WHERE user_id = 123 ORDER BY create_time DESC LIMIT 100000, 20;
-- 问题：LIMIT 100000,20 需要扫描100020行，丢弃前100000行

-- 优化方案1：延迟关联（先查主键，再关联回表）
SELECT o.* FROM orders o
INNER JOIN (
SELECT id FROM orders WHERE user_id = 123 ORDER BY create_time DESC LIMIT 100000, 20
) t ON o.id = t.id;
-- 原理：子查询走覆盖索引（id, create_time都在索引中），只回表20次

-- 优化方案2：游标分页（推荐，无深度分页问题）
SELECT * FROM orders WHERE user_id = 123 AND create_time < '上次最后一条时间'
ORDER BY create_time DESC LIMIT 20;
-- 原理：利用索引范围扫描，每次只扫20行

-- 问题SQL：联合索引顺序错误
-- 索引：idx_status_create_time(status, create_time)
SELECT * FROM orders WHERE create_time > '2026-01-01' AND status = 1;
-- 可以走索引（等值在前，范围在后，符合最左前缀）

-- 索引：idx_create_time_status(create_time, status)
SELECT * FROM orders WHERE create_time > '2026-01-01' AND status = 1;
-- create_time是范围查询，后面的status无法使用索引（索引失效）

-- 优化：建联合索引时，等值条件列在前，范围条件列在后
ALTER TABLE orders ADD INDEX idx_status_createtime(status, create_time);
~~~
**【生产级MySQL配置】**

# my.cnf 关键配置（InnoDB，16G内存服务器）
[mysqld]
# 缓冲池（最重要，设为物理内存的50-70%）
innodb_buffer_pool_size = 10G
innodb_buffer_pool_instances = 8   # 缓冲池实例数，减少锁竞争（每个≥1G）

# 日志
innodb_log_file_size = 1G          # redo log大小，大事务友好
innodb_log_buffer_size = 64M       # redo log缓冲区
innodb_flush_log_at_trx_commit = 2 # 0=每秒刷盘, 1=每次提交刷盘(最安全), 2=提交写OS缓存
sync_binlog = 1000                 # binlog刷盘策略，1=每次提交(最安全)，N=每N次

# 连接
max_connections = 1000
wait_timeout = 600
interactive_timeout = 600

# 排序/临时表
sort_buffer_size = 4M
join_buffer_size = 4M
tmp_table_size = 64M
max_heap_table_size = 64M

# 慢查询
slow_query_log = ON
long_query_time = 1
log_queries_not_using_indexes = ON

# 其他
innodb_flush_method = O_DIRECT     # 绕过OS缓存，直接写磁盘
innodb_file_per_table = ON         # 每个表独立表空间
innodb_stats_on_metadata = OFF     # 禁止查询元数据时更新统计信息（避免锁）
character_set_server = utf8mb4
collation_server = utf8mb4_unicode_ci

**【底层原理】**

**1. MySQL优化器如何选择执行计划**

MySQL优化器是基于成本（Cost-Based Optimizer, CBO）的。它计算每个执行计划的成本，选择成本最低的。成本主要包括：IO成本（读取数据页）+ CPU成本（比较、排序等）。统计信息（innodb_stats_persistent）的准确性直接影响优化器决策。可以用ANALYZE TABLE更新统计信息，用EXPLAIN FORMAT=JSON查看成本细节。

**2. 回表与覆盖索引**

InnoDB是聚簇索引组织表，二级索引叶子节点只存主键值。如果查询列不在二级索引中，需要用主键再查聚簇索引（回表），多一次IO。覆盖索引就是让查询列都包含在索引中，避免回表。注意：SELECT * 永远无法覆盖索引（除非表只有索引列）。

**3. MRR与ICP**

- MRR（Multi-Range Read）：二级索引查询时，先收集主键，排序后批量回表，减少随机IO

- ICP（Index Condition Pushdown）：将WHERE条件下推到存储引擎层，在索引层面过滤，减少回表次数

- MySQL 5.6+默认开启MRR和ICP

**【面试官追问预判】**

- Q: 为什么有时加了索引还是不走？

A: ①查询返回数据量超过表的20-30%，优化器认为全表扫描更快（顺序IO比随机IO快）；②索引列参与函数运算或类型隐式转换；③OR条件中有非索引列；④字符串列用数字查询（隐式转换）；⑤统计信息过时，优化器误判。可用FORCE INDEX强制走索引验证。

- Q: Using filesort一定慢吗？如何优化？

A: filesort不一定用磁盘，数据量小时在内存排序（sort_buffer_size）。优化：①ORDER BY列建索引；②利用联合索引同时满足WHERE和ORDER BY；③减少排序的数据量（只查需要的列）；④增大sort_buffer_size。

- Q: 聚簇索引和非聚簇索引的区别？MyISAM和InnoDB的索引区别？

A: InnoDB聚簇索引：叶子节点存完整行数据，主键索引就是聚簇索引，二级索引存主键。MyISAM非聚簇索引：叶子节点存数据行的物理地址指针，主键索引和二级索引结构相同。InnoDB按主键物理排序存储，MyISAM数据按插入顺序存储。



## **3.2 索引失效的10种场景与联合索引设计原则**

**【场景描述】**某用户表有联合索引idx_name_age_status(name, age, status)，但多个查询场景下索引失效，导致全表扫描，数据库压力大。需要系统梳理索引失效场景并优化。

**【故障现象】**

- EXPLAIN显示type=ALL（全表扫描），key=NULL

- 部分查询type=index（全索引扫描，比ALL好但仍慢）

- key_len显示联合索引只用了第一列

**【解决方案】**

**▶ 中级回答**

系统梳理10种索引失效场景：
~~~sql
-- 表结构
CREATE TABLE user (
id INT PRIMARY KEY AUTO_INCREMENT,
name VARCHAR(50),
age INT,
status TINYINT,
phone VARCHAR(20),
create_time DATETIME,
INDEX idx_name_age_status(name, age, status),
INDEX idx_phone(phone),
INDEX idx_create_time(create_time)
);

-- 1. 违反最左前缀原则（联合索引必须从最左列开始匹配）
SELECT * FROM user WHERE age = 20;           -- ✗ 失效（跳过了name）
SELECT * FROM user WHERE status = 1;         -- ✗ 失效
SELECT * FROM user WHERE name = '张三' AND age = 20;  -- ✓ 走索引(name+age)
SELECT * FROM user WHERE age = 20 AND name = '张三';  -- ✓ 优化器会调整顺序

-- 2. 索引列参与函数运算或表达式
SELECT * FROM user WHERE YEAR(create_time) = 2026;    -- ✗ 失效
SELECT * FROM user WHERE create_time >= '2026-01-01'  -- ✓ 走索引
AND create_time < '2027-01-01';
SELECT * FROM user WHERE age + 1 = 21;                -- ✗ 失效
SELECT * FROM user WHERE age = 20;                    -- ✓

-- 3. 隐式类型转换（phone是VARCHAR，用数字查询）
SELECT * FROM user WHERE phone = 13800138000;         -- ✗ 失效（触发CAST转换）
SELECT * FROM user WHERE phone = '13800138000';       -- ✓

-- 4. 隐式字符集转换（关联查询时两表字符集不同）
-- user表utf8mb4，order表utf8，关联时会触发转换
SELECT * FROM user u JOIN orders o ON u.phone = o.buyer_phone;  -- 可能失效

-- 5. LIKE以通配符开头
SELECT * FROM user WHERE name LIKE '%张';           -- ✗ 失效（B+树无法定位）
SELECT * FROM user WHERE name LIKE '张%';           -- ✓ 走索引（范围扫描）
-- 优化：使用全文索引或搜索引擎（ES）

-- 6. OR条件中有非索引列
SELECT * FROM user WHERE name = '张三' OR age = 20;  -- ✗ 如果age没索引则全表扫
-- 优化：两个条件都建索引，或用UNION ALL
SELECT * FROM user WHERE name = '张三'
UNION ALL
SELECT * FROM user WHERE age = 20;

-- 7. NOT、!=、<> 操作符
SELECT * FROM user WHERE name != '张三';   -- ✗ 通常失效（优化器认为返回行多）
SELECT * FROM user WHERE status NOT IN (0, 1);  -- ✗ 通常失效
-- 优化：改写为正向条件，或用覆盖索引

-- 8. IS NULL / IS NOT NULL（取决于数据分布）
SELECT * FROM user WHERE name IS NULL;      -- 可能走索引（如果NULL少）
SELECT * FROM user WHERE name IS NOT NULL;  -- 可能失效（如果非NULL多）
-- 建议：列设NOT NULL DEFAULT ''，避免NULL带来的优化器不确定性

-- 9. 联合索引中范围查询后的列失效
SELECT * FROM user WHERE name = '张三' AND age > 20 AND status = 1;
-- ✓ name走索引，age走索引，status失效（范围查询后的列无法用索引）
-- 优化：调整索引顺序，把范围列放最后：idx_name_status_age

-- 10. 数据量小或返回比例高，优化器选择全表扫描
SELECT * FROM user WHERE status = 1;  -- 如果status=1占90%，优化器选全表扫描
-- 优化：用覆盖索引避免回表，或FORCE INDEX强制走索引
~~~
**▶ 资深回答**

联合索引设计的核心原则与底层原理：

**【联合索引的B+树结构】**

联合索引 idx(name, age, status) 的B+树叶子节点：
```text
按name排序 → name相同按age排序 → age相同按status排序

┌─────────────────────────────────────────────────────────┐
│  (name, age, status) → 主键id                            │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │ ('李四',18,1) │ ('李四',20,0) │ ('李四',25,1) │  李四   │
│  └──────────────┴──────────────┴──────────────┘         │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │ ('王五',22,1) │ ('王五',30,0) │ ('王五',35,1) │  王五   │
│  └──────────────┴──────────────┴──────────────┘         │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │ ('张三',20,0) │ ('张三',20,1) │ ('张三',25,1) │  张三   │
│  └──────────────┴──────────────┴──────────────┘         │
└─────────────────────────────────────────────────────────┘
```

最左前缀原理：
```text
- WHERE name='张三' → 可定位到"张三"区间 ✓
- WHERE name='张三' AND age=20 → 在"张三"区间内定位age=20 ✓
- WHERE name='张三' AND age=20 AND status=1 → 继续定位status ✓
- WHERE age=20 → 无法定位（age在不同name区间都有）✗
- WHERE name='张三' AND status=1 → name可定位，status无法定位（跳过了age）
```
实际：name走索引，回表后过滤status（key_len只算name的长度）

**【索引设计原则（三星索引法）】**

三星索引评估法（Lahdenmaki & Leach）：
★ 第一颗星：WHERE条件中的等值查询列都在索引中
★ 第二颗星：ORDER BY/GROUP BY的列在索引中（避免filesort/temporary）
★ 第三颗星：SELECT的列都在索引中（覆盖索引，避免回表）

设计步骤：
1. 列出所有查询SQL
```text
2. 提取WHERE等值条件列 → 放索引最前面
3. 提取WHERE范围条件列 → 放等值列之后
4. 提取ORDER BY/GROUP BY列 → 放范围列之后（或范围列之前，需权衡）
5. 提取SELECT列 → 追加到索引末尾（覆盖索引）
```
6. 评估索引选择性（COUNT(DISTINCT col)/COUNT(*)），选择性低的列不适合单独建索引

注意：索引不是越多越好！
- 每个索引都需要维护（INSERT/UPDATE/DELETE时更新B+树）
- 索引占用磁盘空间
- 优化器选择索引时需要计算成本，索引多了可能选错
- 单表索引数建议≤5个

**【索引选择性与 cardinality】**
~~~sql
-- 查看索引基数（cardinality）
SHOW INDEX FROM user;
-- cardinality列表示索引中唯一值的估计数量
-- 选择性 = cardinality / 表总行数，越接近1越好

-- 计算列的选择性
SELECT
COUNT(DISTINCT name)/COUNT(*) AS name_selectivity,
COUNT(DISTINCT status)/COUNT(*) AS status_selectivity,
COUNT(DISTINCT age)/COUNT(*) AS age_selectivity
FROM user;
-- name选择性高（适合建索引），status选择性低（不适合单独建索引）
-- 但status在联合索引中作为过滤条件仍有价值
~~~
**【底层原理】**

**1. 优化器的索引选择逻辑**

优化器通过统计信息估算每个索引的扫描行数，选择扫描行数最少的。InnoDB的统计信息是采样统计（默认20个页），可能不准确。当数据分布不均匀时（如status=0只有10条，status=1有100万条），优化器可能对不同值选择不同执行计划——这就是"参数嗅探"问题。

**2. 索引下推（ICP）的工作原理**

MySQL 5.6引入ICP。在没有ICP时，存储引擎通过索引定位行后，返回给Server层，Server层再用WHERE条件过滤。有了ICP后，存储引擎在索引层面就用WHERE条件过滤，只返回满足条件的行，减少回表次数。EXPLAIN的Extra显示Using index condition。

**【面试官追问预判】**

- Q: 联合索引的列顺序怎么确定？

A: 原则：①等值查询列在前，范围查询列在后；②选择性高的列在前；③ORDER BY/GROUP BY列考虑是否需要避免排序。实际中需要结合具体查询SQL，不能只看列的选择性。比如WHERE a=? AND b>? ORDER BY c，索引(a, b, c)中c用不上，而(a, c, b)中c可以用于排序但b用不上——需要权衡。

- Q: 什么是索引下推？什么场景下生效？

A: ICP将WHERE条件下推到存储引擎层，在索引遍历过程中过滤。生效条件：①使用二级索引（聚簇索引不需要，因为数据就在叶子节点）；②WHERE条件可以用索引评估（即条件列在索引中）；③不是全部索引列都用于定位（如范围查询后的列）。MySQL 5.6+默认开启，可通过optimizer_switch="index_condition_pushdown=off"关闭。

- Q: 为什么不建议在低选择性列上建索引？

A: 低选择性列（如性别、状态）的索引，每个值对应大量行。查询时需要回表大量行，随机IO多，可能比全表扫描（顺序IO）还慢。但在联合索引中，低选择性列可以作为辅助过滤列。另外，如果查询是覆盖索引，即使选择性低也可能走索引（因为不需要回表）。



## **3.3 库存超卖问题的四种解决方案与对比**

**【场景描述】**秒杀系统中，1000个用户同时抢购100件商品。使用"先查库存再扣减"的方式，出现超卖（实际卖出120件），库存变为负数。

**【故障现象】**

- 库存字段变为负数（-20）

- 订单数超过库存数（120单 > 100件）

- 并发量越高，超卖越严重

**【解决方案】**

**▶ 中级回答**

四种解决方案对比：
~~~sql
-- 方案1：悲观锁（SELECT ... FOR UPDATE）
BEGIN;
SELECT stock FROM product WHERE id = 1 FOR UPDATE;  -- 加行锁，其他事务阻塞
-- 检查stock > 0
UPDATE product SET stock = stock - 1 WHERE id = 1;
INSERT INTO orders(...) VALUES(...);
COMMIT;
-- 优点：简单可靠
-- 缺点：并发低（串行化），高并发下大量线程阻塞，可能死锁

-- 方案2：乐观锁（版本号）
UPDATE product SET stock = stock - 1, version = version + 1
WHERE id = 1 AND version = #{version} AND stock > 0;
-- 影响行数=1表示成功，=0表示失败（重试或返回抢购失败）
-- 优点：并发比悲观锁高
-- 缺点：高并发下大量重试，CPU高；需要version字段

-- 方案3：原子扣减（CAS思想，最常用）
UPDATE product SET stock = stock - 1 WHERE id = 1 AND stock > 0;
-- 影响行数=1成功，=0失败
-- 优点：单条SQL原子性，无需额外字段，性能好
-- 缺点：无法知道扣减前的库存值（某些业务需要）

-- 方案4：Redis预扣库存 + 数据库最终扣减
-- 预热：将库存存入Redis
SET seckill:stock:1 100
-- 扣减：Redis原子操作
DECR seckill:stock:1
-- 返回>=0表示成功，<0表示失败（不操作数据库）
-- 异步：MQ消息通知数据库扣减库存
-- 优点：极高并发，数据库压力小
-- 缺点：Redis与数据库一致性问题，需要补偿机制
~~~
**▶ 资深回答**

生产级秒杀系统的完整方案：

**【秒杀系统架构】**

秒杀请求处理流程：
用户请求
```text
│
▼
┌─────────┐   限流（Nginx/网关）：令牌桶/漏桶，只放行库存×10的请求
│  限流层  │── 多余请求直接返回"已售罄"
└────┬────┘
│
▼
┌─────────┐   Redis预扣库存（DECR原子操作）
│ Redis层 │── 返回<0 → 直接返回失败
└────┬────┘   返回≥0 → 继续
│
▼
┌─────────┐   异步下单（发送MQ消息）
│  MQ层   │── 立即返回"排队中"给用户
└────┬────┘
│
▼
┌─────────┐   消费者：数据库原子扣减 + 创建订单
│ 数据库层 │   UPDATE product SET stock=stock-1 WHERE id=? AND stock>0
└─────────┘   成功→通知用户；失败→回滚Redis库存（INCR）
```

防超卖的三道防线：
1. 限流层：控制进入系统的请求量（库存×10）
2. Redis层：DECR原子操作，库存到0直接拒绝
3. 数据库层：UPDATE ... WHERE stock>0，最终兜底

**【Redis + 数据库一致性保障】**
~~~java
// Redis预扣库存（Lua脚本保证原子性）
String script = """
local stock = redis.call('GET', KEYS[1])
if not stock then return -1 end        -- 库存key不存在
if tonumber(stock) <= 0 then return 0 end  -- 库存不足
redis.call('DECR', KEYS[1])            -- 扣减
return 1                               -- 成功
""";
Long result = redisTemplate.execute(
new DefaultRedisScript<>(script, Long.class),
Collections.singletonList("seckill:stock:" + productId)
);
// result=1成功，0失败，-1异常

// 数据库扣减（兜底防超卖）
@Transactional
public boolean createOrder(Long productId, Long userId) {
    // 1. 原子扣减库存
    int rows = productMapper.decrementStock(productId);
    if (rows == 0) {
        // 数据库扣减失败，回滚Redis库存
        redisTemplate.opsForValue().increment("seckill:stock:" + productId);
        return false;
    }
    // 2. 创建订单
    orderMapper.insert(new Order(productId, userId));
    return true;
}

// SQL：带条件的原子扣减
<update id="decrementStock">
UPDATE product SET stock = stock - 1, sold = sold + 1
WHERE id = #{productId} AND stock > 0
</update>

// 兜底对账：定时任务对比Redis库存和数据库库存
@Scheduled(fixedRate = 60000)
public void reconcileStock() {
    List<Product> products = productMapper.selectAll();
    for (Product p : products) {
        Integer redisStock = redisTemplate.opsForValue()
        .get("seckill:stock:" + p.getId());
        if (redisStock != null && !redisStock.equals(p.getStock())) {
            log.warn("库存不一致，productId={}, redis={}, db={}",
            p.getId(), redisStock, p.getStock());
            // 以数据库为准，修正Redis
            redisTemplate.opsForValue().set("seckill:stock:" + p.getId(), p.getStock());
        }
    }
}
~~~
**【底层原理】**

**1. 数据库行锁的实现**

InnoDB的行锁是基于索引实现的，锁定的是索引记录而非数据行。如果查询没有走索引，会升级为表锁（锁全表）。FOR UPDATE是排他锁（X锁），FOR SHARE（MySQL 8.0）是共享锁（S锁）。行锁在事务提交或回滚时释放。

**2. 间隙锁（Gap Lock）与超卖**

在RR隔离级别下，InnoDB使用Next-Key Lock（行锁+间隙锁）防止幻读。如果库存表的查询条件没有命中索引，会锁住大量间隙，导致并发极低。因此秒杀扣库存必须用主键或唯一索引查询。

**3. Redis DECR的原子性**

Redis是单线程模型，每个命令都是原子的。DECR命令在服务端一次性完成"读取-减1-写回"，不会有并发问题。但如果业务逻辑需要"判断库存>0再扣减"，必须用Lua脚本封装，因为GET+DECR是两个命令，中间可能有其他客户端插入。

**【面试官追问预判】**

- Q: 乐观锁和悲观锁分别适合什么场景？

A: 悲观锁适合写多读少、冲突概率高的场景（如金融转账），因为冲突后重试代价大。乐观锁适合读多写少、冲突概率低的场景（如商品信息更新），因为加锁开销大。秒杀场景冲突概率极高，乐观锁会导致大量重试，所以用Redis预扣+数据库原子扣减。

- Q: Redis扣减成功但数据库扣减失败怎么办？

A: 需要回滚Redis库存（INCR）。但如果回滚也失败（如Redis宕机），会导致库存不一致。解决方案：①定时对账任务，以数据库为准修正Redis；②用分布式事务（TCC）保证一致性；③Redis持久化（AOF）+ 故障恢复。生产中通常用对账任务兜底。

- Q: 如何防止同一个用户重复抢购？

A: ①Redis SETNX用户ID（setIfAbsent），成功才允许抢购；②数据库唯一索引（user_id + product_id）防止重复下单；③前端按钮置灰+后端校验。三层防护。



## **3.4 Spring事务失效的9种场景与底层原理**

**【场景描述】**某服务方法标注了@Transactional，但运行时发现异常后数据没有回滚，或部分方法事务不生效。需要系统梳理事务失效场景。

**【故障现象】**

- 方法抛出异常后，数据库数据未回滚

- 同类中方法A调用方法B，B的事务不生效

- 捕获异常后事务不回滚

- 多线程中事务不生效

**【解决方案】**

**▶ 中级回答**

9种事务失效场景：
~~~java
// 1. 方法不是public（@Transactional只能作用于public方法）
@Transactional
private void addUser() {  // ✗ private方法事务不生效
    userMapper.insert(user);
}
// 原因：Spring AOP基于CGLIB/JDK动态代理，只能拦截public方法

// 2. 同类中方法调用（this调用绕过代理）
@Service
public class UserService {
    public void methodA() {
        this.methodB();  // ✗ this调用，不走代理，事务不生效
    }
    @Transactional
    public void methodB() {
        userMapper.insert(user);
    }
}
// 解决：注入自己（@Autowired UserService self），用self.methodB()
//      或用AopContext.currentProxy()获取代理对象

// 3. 异常被捕获（catch后没有重新抛出）
@Transactional
public void addUser() {
    try {
        userMapper.insert(user);
        int i = 1 / 0;
    } catch (Exception e) {
    log.error("异常", e);  // ✗ 捕获后没抛出，事务不回滚
}
}
// 解决：catch后throw new RuntimeException(e); 或手动回滚
//      TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();

// 4. 抛出的是受检异常（默认只回滚RuntimeException和Error）
@Transactional
public void addUser() throws IOException {
    userMapper.insert(user);
    throw new IOException("文件异常");  // ✗ 默认不回滚
}
// 解决：@Transactional(rollbackFor = Exception.class)

// 5. 数据库引擎不支持事务（MyISAM）
// CREATE TABLE user (...) ENGINE=MyISAM;  -- ✗ MyISAM不支持事务
// 解决：使用InnoDB引擎

// 6. 没有被Spring管理（没有加@Service等注解）
public class UserService {  // ✗ 没有@Service，不是Spring Bean
    @Transactional
    public void addUser() { ... }
}

// 7. 多线程中调用（事务基于线程绑定的Connection）
@Transactional
public void addUser() {
    userMapper.insert(user);
    new Thread(() -> {
        otherMapper.insert(other);  // ✗ 新线程没有事务上下文
    }).start();
}
// 原因：事务的Connection绑定在ThreadLocal中，新线程获取不到

// 8. propagation传播行为设置错误
@Transactional(propagation = Propagation.NOT_SUPPORTED)  // ✗ 以非事务运行
public void addUser() { ... }

// 9. 自身标注了@Transactional但被final类或final方法
// CGLIB代理无法继承final类或重写final方法
@Service
public final class UserService {  // ✗ final类无法被CGLIB代理
    @Transactional
    public final void addUser() { ... }  // ✗ final方法无法被重写
}
~~~
**▶ 资深回答**

Spring事务的AOP代理原理与TransactionSynchronization：

**【Spring事务代理原理】**

Spring事务执行流程（基于AOP动态代理）：
调用方
```text
│
▼
┌─────────────────────────────────────┐
│  代理对象（CGLIB/JDK Proxy）         │
│  ┌───────────────────────────────┐  │
│  │ TransactionInterceptor        │  │
│  │  (MethodInterceptor)          │  │
│  │    1. 获取事务属性(@Transactional)│
│  │    2. 创建/获取事务状态         │  │
│  │    3. 开启事务（setAutoCommit=false）│
│  │    4. 调用目标方法             │  │
│  │    5. 异常→判断是否回滚         │  │
│  │    6. 正常→提交事务            │  │
│  └───────────────────────────────┘  │
└──────────────┬──────────────────────┘
│
▼
┌─────────────────────────────────────┐
│  目标对象（真实Bean）                 │
│  public void addUser() { ... }      │
└─────────────────────────────────────┘
```

关键：只有通过代理对象调用，事务拦截器才会生效。
this.methodB()是直接调用目标对象，绕过了代理！

**【事务与数据库连接的绑定】**
~~~java
// Spring事务的核心：TransactionSynchronizationManager
// 它用ThreadLocal绑定事务资源（Connection）

public abstract class TransactionSynchronizationManager {
    // 每个线程绑定一个DataSource → Connection的映射
    private static final ThreadLocal<Map<Object, Object>> resources =
    new NamedThreadLocal<>("Transactional resources");

    // 绑定连接
    public static void bindResource(Object key, Object value) {
        Map<Object, Object> map = resources.get();
        if (map == null) { map = new HashMap<>(); resources.set(map); }
        map.put(key, value);
    }

    // 获取连接（MyBatis/Spring JDBC都会从这里获取）
    public static Object getResource(Object key) {
        Map<Object, Object> map = resources.get();
        return map != null ? map.get(key) : null;
    }
}
~~~
// 流程：
// 1. @Transactional方法进入 → 开启事务 → 从DataSource获取Connection
// 2. Connection.setAutoCommit(false)
// 3. Connection绑定到TransactionSynchronizationManager的ThreadLocal
// 4. MyBatis执行SQL时，从TransactionSynchronizationManager获取同一个Connection
// 5. 方法正常结束 → commit()
// 6. 方法异常 → rollback()
// 7. 解绑Connection，归还连接池

// 所以多线程中事务失效的原因：新线程的ThreadLocal中没有绑定Connection！

**【同类调用的解决方案对比】**
~~~java
// 方案1：注入自己（最常用）
@Service
public class UserService {
    @Autowired
    private UserService self;  // 注入代理对象

    public void methodA() {
        self.methodB();  // ✓ 通过代理对象调用
    }
    @Transactional
    public void methodB() { ... }
}

// 方案2：AopContext（需要开启exposeProxy=true）
// @EnableAspectJAutoProxy(exposeProxy = true)
@Service
public class UserService {
    public void methodA() {
        ((UserService) AopContext.currentProxy()).methodB();  // ✓
    }
}

// 方案3：拆分到不同的Service（最优雅）
@Service
public class UserService {
    @Autowired
    private UserTxService userTxService;

    public void methodA() {
        userTxService.methodB();  // ✓ 不同Bean，天然走代理
    }
}
@Service
public class UserTxService {
    @Transactional
    public void methodB() { ... }
}
~~~
**【底层原理】**

**1. Spring事务的传播行为**

7种传播行为：
```text
┌──────────────────────┬──────────────────────────────────────────┐
│  传播行为              │  含义                                      │
├──────────────────────┼──────────────────────────────────────────┤
│ REQUIRED（默认）      │ 有事务则加入，没有则新建                    │
│ REQUIRES_NEW         │ 总是新建事务，挂起当前事务                   │
│ SUPPORTS             │ 有事务则加入，没有则非事务执行               │
│ NOT_SUPPORTED        │ 总是非事务执行，挂起当前事务                 │
│ MANDATORY            │ 必须在事务中调用，否则抛异常                 │
│ NEVER                │ 必须非事务调用，有事务则抛异常               │
│ NESTED               │ 嵌套事务（保存点Savepoint）                 │
└──────────────────────┴──────────────────────────────────────────┘
```

NESTED vs REQUIRES_NEW：
- REQUIRES_NEW：完全独立的事务，外层回滚不影响内层（内层已提交）
- NESTED：嵌套事务，外层回滚会连带内层回滚；内层回滚不影响外层
（基于JDBC Savepoint实现，需要JDBC驱动支持）

**2. 事务隔离级别与MySQL默认级别**

- READ_UNCOMMITTED：读未提交（脏读）

- READ_COMMITTED：读已提交（Oracle/PostgreSQL默认）

- REPEATABLE_READ：可重复读（MySQL InnoDB默认）

- SERIALIZABLE：串行化

MySQL InnoDB在RR级别下通过Next-Key Lock（行锁+间隙锁）防止幻读，所以实际上RR级别已经解决了幻读问题（在当前读场景下）。

**【面试官追问预判】**

- Q: @Transactional加在接口上和实现类上有什么区别？

A: 加在接口上：只有JDK动态代理（基于接口）时生效，CGLIB代理（基于类继承）不生效。加在实现类上：两种代理方式都生效。Spring Boot默认用CGLIB（spring.aop.proxy-target-class=true），所以建议加在实现类方法上。

- Q: 一个方法中先操作A表再操作B表，B表操作异常，A表会回滚吗？

A: 如果在同一个事务中（默认REQUIRED），会回滚。因为整个方法在一个事务中，异常触发整个事务回滚。如果B表操作在REQUIRES_NEW的事务中，则B表独立提交/回滚，A表不受B表异常影响（但A表会因异常而回滚自己的操作）。

- Q: 如何手动控制事务回滚？

A: ①TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();②注入PlatformTransactionManager，手动使用TransactionTemplate。注意：setRollbackOnly()只是标记回滚，事务仍会在方法结束时执行回滚，不会立即回滚。如果需要立即回滚，必须抛出异常。

---

# **模块四：Redis缓存场景**

## **4.1 缓存穿透、击穿、雪崩的区别与解决方案**

**【场景描述】**某商品详情服务引入Redis缓存后，QPS从1000提升到10000。但出现三类问题：①恶意请求不存在的商品ID，全部打到数据库；②热点商品缓存过期瞬间，大量请求击穿到数据库；③大量缓存同时过期，数据库压力骤增。

**【故障现象】**

- 缓存穿透：数据库QPS异常升高，缓存命中率极低，请求的key在缓存和数据库都不存在

- 缓存击穿：某个热点key过期瞬间，数据库QPS突增，之后恢复正常

- 缓存雪崩：大量key同时过期，数据库QPS持续高位，可能导致数据库宕机

**【解决方案】**

**▶ 中级回答**

三种问题的对比与解决方案：

三种缓存问题对比：
```text
┌──────────┬──────────────────────┬──────────────────────┬──────────────────┐
│  类型     │  原因                  │  特点                  │  解决方案         │
├──────────┼──────────────────────┼──────────────────────┼──────────────────┤
│ 缓存穿透  │ 查询不存在的数据       │ key在缓存和DB都不存在  │ 空值缓存/布隆过滤器│
│ 缓存击穿  │ 热点key过期            │ 单个key，瞬时高并发    │ 互斥锁/逻辑过期    │
│ 缓存雪崩  │ 大量key同时过期        │ 多个key，持续高并发    │ 随机过期/多级缓存  │
└──────────┴──────────────────────┴──────────────────────┴──────────────────┘
```
~~~java
// 1. 缓存穿透：缓存空值
public Product getProduct(Long id) {
    String key = "product:" + id;
    Product product = redisTemplate.opsForValue().get(key);
    if (product != null) {
        return product;
    }
    // 查询数据库
    product = productMapper.selectById(id);
    if (product == null) {
        // 缓存空值，设置较短过期时间（防止内存浪费）
        redisTemplate.opsForValue().set(key, NULL_PRODUCT, 5, TimeUnit.MINUTES);
        return null;
    }
    redisTemplate.opsForValue().set(key, product, 30, TimeUnit.MINUTES);
    return product;
}

// 2. 缓存穿透：布隆过滤器（更高效，适合海量数据）
// 初始化：将所有存在的商品ID加入布隆过滤器
@PostConstruct
public void initBloomFilter() {
    List<Long> ids = productMapper.selectAllIds();
    for (Long id : ids) {
        bloomFilter.add(id);
    }
}

public Product getProductWithBloom(Long id) {
    // 布隆过滤器判断：不存在则一定不存在；存在则可能存在
    if (!bloomFilter.mightContain(id)) {
        return null;  // 直接返回，不查缓存和数据库
    }
    // 继续查缓存和数据库...
}

// 3. 缓存击穿：互斥锁（mutex key）
public Product getProductWithLock(Long id) {
    String key = "product:" + id;
    Product product = redisTemplate.opsForValue().get(key);
    if (product != null) return product;

    String lockKey = "lock:product:" + id;
    // 尝试获取锁
    Boolean locked = redisTemplate.opsForValue()
    .setIfAbsent(lockKey, "1", 10, TimeUnit.SECONDS);
    if (Boolean.TRUE.equals(locked)) {
        try {
            // 双重检查：获取锁后再查一次缓存（可能其他线程已重建）
            product = redisTemplate.opsForValue().get(key);
            if (product != null) return product;
            // 查询数据库并重建缓存
            product = productMapper.selectById(id);
            redisTemplate.opsForValue().set(key, product, 30, TimeUnit.MINUTES);
            return product;
        } finally {
        redisTemplate.delete(lockKey);  // 释放锁
    }
} else {
// 未获取到锁，等待后重试
try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
return getProductWithLock(id);  // 递归重试
}
}

// 4. 缓存雪崩：过期时间加随机值
public void setProductCache(Product product) {
    String key = "product:" + product.getId();
    // 基础过期时间30分钟 + 随机0-5分钟，避免同时过期
    int ttl = 30 + ThreadLocalRandom.current().nextInt(0, 6);
    redisTemplate.opsForValue().set(key, product, ttl, TimeUnit.MINUTES);
}
~~~
**▶ 资深回答**

从Redis数据结构到布隆过滤器原理的深度分析：

**【布隆过滤器原理】**

布隆过滤器（Bloom Filter）结构：
一个位数组 + 多个哈希函数

位数组（初始全0，假设大小m=16）：
```text
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
```

添加元素"product:123"：
```text
hash1("product:123") % 16 = 3  → 位置3设为1
hash2("product:123") % 16 = 7  → 位置7设为1
hash3("product:123") % 16 = 12 → 位置12设为1

┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ 0 │ 0 │ 0 │ 1 │ 0 │ 0 │ 0 │ 1 │ 0 │ 0 │ 0 │ 0 │ 1 │ 0 │ 0 │ 0 │
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
```

查询元素"product:456"：
hash1 → 位置5（0）→ 一定不存在！直接返回false

查询元素"product:789"：
```text
hash1 → 位置3（1）
hash2 → 位置7（1）
hash3 → 位置12（1）
所有位置都是1 → 可能存在（误判！实际可能不存在）
```

特性：
- 不存在 → 一定不存在（100%准确）
- 存在 → 可能存在（有误判率）
- 不支持删除（删除会影响其他元素）
- 空间效率极高：1亿数据只需约120MB（误判率1%）

误判率公式：p ≈ (1 - e^(-kn/m))^k
m=位数组大小, n=元素数, k=哈希函数数
最优k = (m/n) × ln2

**【逻辑过期方案（热点key永不过期）】**
~~~java
// 缓存击穿的另一种方案：逻辑过期（不设物理TTL，在value中存过期时间）
@Data
public class CacheData<T> {
    private T data;
    private LocalDateTime expireTime;  // 逻辑过期时间
}

public Product getProductWithLogicalExpire(Long id) {
    String key = "product:" + id;
    CacheData<Product> cacheData = redisTemplate.opsForValue().get(key);

    if (cacheData == null) return null;  // 缓存未命中（理论上热点key都预热了）

    // 未过期，直接返回
    if (cacheData.getExpireTime().isAfter(LocalDateTime.now())) {
        return cacheData.getData();
    }

    // 已过期，尝试异步重建缓存（用线程池，不阻塞当前请求）
    String lockKey = "lock:product:" + id;
    if (Boolean.TRUE.equals(redisTemplate.opsForValue()
    .setIfAbsent(lockKey, "1", 10, TimeUnit.SECONDS))) {
        // 获取锁成功，异步重建
        rebuildCacheExecutor.submit(() -> {
            try {
                Product dbProduct = productMapper.selectById(id);
                CacheData<Product> newData = new CacheData<>();
                newData.setData(dbProduct);
                newData.setExpireTime(LocalDateTime.now().plusMinutes(30));
                redisTemplate.opsForValue().set(key, newData);  // 无TTL，永不过期
            } finally {
            redisTemplate.delete(lockKey);
        }
    });
}
// 返回旧数据（过期但仍可用，保证可用性）
return cacheData.getData();
}
~~~
// 对比：互斥锁 vs 逻辑过期
// 互斥锁：一致性好（等待新数据），但高并发下有线程等待，吞吐量略低
// 逻辑过期：可用性好（立即返回旧数据），但存在短暂数据不一致，实现复杂
// 秒杀/商品详情等对一致性要求不极高的场景，推荐逻辑过期

**【多级缓存架构】**

多级缓存架构（从快到慢）：
请求
```text
│
▼
┌─────────────┐  L1：本地缓存（Caffeine/Guava）
│ 本地缓存     │  命中→直接返回，无网络开销
│ (进程内)     │  容量小（几十MB），过期时间短（几秒）
└──────┬──────┘
│ 未命中
▼
┌─────────────┐  L2：分布式缓存（Redis Cluster）
│ Redis缓存    │  命中→返回，同时回填本地缓存
│ (跨进程)     │  容量大（几十GB），过期时间长（几分钟）
└──────┬──────┘
│ 未命中
▼
┌─────────────┐  L3：数据库（MySQL）
│ 数据库       │  查询→回填Redis和本地缓存
└─────────────┘
```

本地缓存注意事项：
- 数据更新时需要通知所有节点清除本地缓存（Redis Pub/Sub或MQ）
- 本地缓存可能导致短暂不一致（各节点缓存不同步）
- 适合读多写少、对一致性要求不高的场景

**【底层原理】**

**1. Redis的过期删除策略**

- 惰性删除：访问key时检查是否过期，过期则删除（CPU友好，内存不友好）

- 定期删除：每隔一段时间随机抽取一批key检查，删除过期的（平衡CPU和内存）

- Redis同时使用两种策略。注意：过期的key不会立即删除，所以内存不会立即释放

**2. Redis的内存淘汰策略**

当内存达到maxmemory时，触发淘汰：

- noeviction：不淘汰，写入报错（默认）

- allkeys-lru：所有key中淘汰最久未使用的（最常用）

- volatile-lru：设置了过期时间的key中淘汰LRU

- allkeys-lfu：所有key中淘汰使用频率最低的（Redis 4.0+）

- volatile-lfu：设置了过期时间的key中淘汰LFU

- allkeys-random / volatile-random：随机淘汰

- volatile-ttl：淘汰最早过期的key

**3. 布隆过滤器的Redis实现**

Redis 4.0+支持布隆过滤器模块（RedisBloom），也可以用位图（Bitmap）自己实现。Bitmap基于String类型，最大512MB（2^32位），可以用SETBIT/GETBIT操作。

**【面试官追问预判】**

- Q: 布隆过滤器的误判率怎么计算？如何降低误判率？

A: 误判率p ≈ (1 - e^(-kn/m))^k，其中m=位数组大小，n=元素数，k=哈希函数数。降低误判率：①增大位数组m；②增加元素数n不变时增大m；③选择最优k=(m/n)×ln2。实际中根据可接受的误判率反推m和k。比如1亿数据、1%误判率，需要m≈9.6亿位（120MB），k≈7。

- Q: 缓存空值和布隆过滤器怎么选？

A: 数据量小（百万级）用空值缓存简单；数据量大（亿级）且恶意攻击多，用布隆过滤器更省内存。也可以组合使用：布隆过滤器挡第一层，空值缓存挡第二层。注意布隆过滤器不支持删除，新增数据时需要同步添加到布隆过滤器。

- Q: Redis的LRU是怎么实现的？是精确LRU吗？

A: Redis的LRU不是精确LRU（没有双向链表），而是近似LRU。每个key对象维护一个24位的lru字段（记录最后访问时间的秒数）。淘汰时随机采样N个key（默认5个，maxmemory-samples配置），淘汰其中最久未访问的。采样数越大越接近精确LRU，但CPU开销越大。Redis 4.0+的LFU也是类似的近似实现。



## **4.2 Redis分布式锁的演进与Redisson深度解析**

**【场景描述】**分布式环境下，多个服务实例需要互斥访问共享资源（如库存扣减、定时任务防重复执行）。使用Redis实现分布式锁，但出现锁过期释放、锁被其他线程误删、主从切换锁丢失等问题。

**【故障现象】**

- 锁过期但业务未执行完，其他线程获取到锁，导致并发问题

- 线程A的锁过期后，线程B获取锁，线程A执行完删除了线程B的锁

- Redis主节点宕机，锁未同步到从节点，主从切换后锁丢失

**【解决方案】**

**▶ 中级回答**

分布式锁的演进过程：
~~~java
// 版本1：最简单的锁（有严重问题）
public boolean lock(String key) {
    return redisTemplate.opsForValue().setIfAbsent(key, "1");  // 没有过期时间！
}
public void unlock(String key) {
    redisTemplate.delete(key);  // 可能删除别人的锁
}
// 问题：①获取锁后服务宕机，锁永远不释放（死锁）
//      ②delete不判断锁的持有者，可能误删

// 版本2：加过期时间 + 唯一标识
public boolean lock(String key, String requestId, int expireSeconds) {
    // SET key value NX EX seconds：原子操作
    return redisTemplate.opsForValue()
    .setIfAbsent(key, requestId, expireSeconds, TimeUnit.SECONDS);
}
public void unlock(String key, String requestId) {
    // 先判断是不是自己的锁
    if (requestId.equals(redisTemplate.opsForValue().get(key))) {
        redisTemplate.delete(key);  // 非原子！判断和删除之间可能过期被别人获取
    }
}
// 问题：unlock的判断和删除不是原子操作

// 版本3：Lua脚本保证释放锁原子性
public void unlock(String key, String requestId) {
    String script = """
    if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
    else
    return 0
    end
    """;
    redisTemplate.execute(new DefaultRedisScript<>(script, Long.class),
    Collections.singletonList(key), requestId);
}

// 版本4：Redisson（生产级方案）
@Autowired
private RedissonClient redissonClient;

public void doWithLock() {
    RLock lock = redissonClient.getLock("order:lock:123");
    try {
        // 尝试加锁：等待100秒，锁持有时间10秒（不设则自动续期）
        boolean locked = lock.tryLock(100, 10, TimeUnit.SECONDS);
        if (locked) {
            // 业务逻辑
        }
    } catch (InterruptedException e) {
    Thread.currentThread().interrupt();
} finally {
if (lock.isHeldByCurrentThread()) {
    lock.unlock();
}
}
}
~~~
**▶ 资深回答**

Redisson的看门狗机制与RedLock算法：

**【Redisson看门狗（Watchdog）机制】**

Redisson锁自动续期流程：
线程A获取锁（默认leaseTime=30秒）
│
▼
启动看门狗定时任务（每10秒执行一次，即lockTime/3）
```text
│
├─ 10秒后：检查锁是否还被当前线程持有
│           是 → 续期到30秒（PEXPIRE）
│           否 → 取消看门狗
│
├─ 20秒后：再次检查并续期
│
├─ 业务执行完成 → unlock() → 取消看门狗 → 删除锁
│
└─ 服务宕机 → 看门狗停止 → 锁30秒后自动过期
```

关键参数：
- lockWatchdogTimeout = 30000ms（默认30秒）
- 续期间隔 = lockWatchdogTimeout / 3 = 10秒
- 只有未指定leaseTime时才启动看门狗
- 指定了leaseTime则不会自动续期（需自己保证业务在leaseTime内完成）

源码核心（RedissonLock）：
~~~java
private void scheduleExpirationRenewal(long threadId) {
    // 定时任务，每internalLockLeaseTime/3毫秒执行一次
    Timeout task = commandExecutor.getConnectionManager().newTimeout(
    new TimerTask() {
        @Override
        public void run(Timeout timeout) throws Exception {
            // Lua脚本：判断锁是否还在，在则续期
            evalWriteAsync(..., "if (redis.call('hexists', KEYS[1], ARGV[2]) == 1) then " +
            "redis.call('pexpire', KEYS[1], ARGV[1]); return 1; end; return 0;", ...);
        }
    }, internalLockLeaseTime / 3, TimeUnit.MILLISECONDS);
}
~~~
**【RedLock算法（多节点分布式锁）】**

RedLock解决主从切换锁丢失问题：
假设N个独立的Redis主节点（通常N=5，奇数）

加锁流程：
1. 获取当前时间戳T1
2. 依次向N个节点发送加锁请求（SET key value NX PX ttl）
3. 计算成功加锁的节点数 successCount
4. 获取当前时间戳T2，计算耗时 = T2 - T1
5. 加锁成功条件：
successCount >= N/2 + 1（多数派，如5节点需要≥3）
AND 耗时 < ttl（锁还没过期）
6. 加锁失败：向所有节点发送解锁请求（即使没加锁成功的节点也要解锁）

解锁：向所有N个节点发送解锁请求

优点：即使少数节点宕机，锁仍然有效
缺点：①需要部署多个独立Redis实例；②性能比单节点锁差；
③存在争议（Martin Kleppmann与antirez的著名辩论）

生产实践：
- 大多数场景用单节点Redisson锁足够（主从切换概率低，业务可容忍）
- 金融级强一致场景用ZooKeeper/etcd分布式锁（基于CP模型）
- RedLock在实际生产中使用较少

**【Redisson可重入锁原理】**
~~~java
// Redisson的锁不是简单的String，而是Hash结构
// key = 锁名，field = 客户端ID:线程ID，value = 重入次数

// 加锁Lua脚本
String lockScript = """
if (redis.call('exists', KEYS[1]) == 0) then              -- 锁不存在
redis.call('hincrby', KEYS[1], ARGV[2], 1);           -- 创建，重入次数=1
redis.call('pexpire', KEYS[1], ARGV[1]);              -- 设置过期时间
return nil;                                           -- 返回null表示加锁成功
end;
if (redis.call('hexists', KEYS[1], ARGV[2]) == 1) then    -- 锁存在且是自己的
redis.call('hincrby', KEYS[1], ARGV[2], 1);           -- 重入次数+1
redis.call('pexpire', KEYS[1], ARGV[1]);              -- 续期
return nil;
end;
return redis.call('pttl', KEYS[1]);                       -- 返回剩余过期时间（加锁失败）
""";

// 解锁Lua脚本
String unlockScript = """
if (redis.call('hexists', KEYS[1], ARGV[3]) == 0) then    -- 锁不存在或不是自己的
return nil;
end;
local counter = redis.call('hincrby', KEYS[1], ARGV[3], -1);  -- 重入次数-1
if (counter > 0) then                                     -- 还有重入次数，不删除
redis.call('pexpire', KEYS[1], ARGV[2]);
return 0;
else                                                      -- 重入次数=0，删除锁
redis.call('del', KEYS[1]);
redis.call('publish', KEYS[2], ARGV[1]);              -- 发布解锁消息，唤醒等待线程
return 1;
end;
""";

// Hash结构示例：
// HGETALL order:lock:123
//   "client-uuid-xxx:thread-1" → "2"  （重入了2次）
~~~
**【底层原理】**

**1. Redis单线程与原子性**

Redis是单线程模型，命令串行执行。SET NX EX是一条命令，天然原子。但"判断+删除"是两条命令，中间可能插入其他命令，所以必须用Lua脚本。Redis执行Lua脚本时也是单线程的，脚本中的所有命令原子执行。

**2. 分布式锁的三大特性**

- 互斥性：同一时间只有一个客户端持有锁

- 容错性：持有锁的客户端宕机后，锁能自动释放（过期时间）

- 可重入性：同一线程可以多次获取同一把锁（Redisson支持）

**3. Redis vs ZooKeeper分布式锁对比**

```text
┌──────────────┬──────────────────────┬──────────────────────┐
│   特性        │  Redis分布式锁        │  ZooKeeper分布式锁    │
├──────────────┼──────────────────────┼──────────────────────┤
│ 一致性模型    │  AP（最终一致）        │  CP（强一致）          │
│ 锁丢失风险    │  主从切换可能丢失      │  不会丢失（ZAB协议）   │
│ 性能          │  高（内存操作）        │  中（磁盘持久化）      │
│ 实现复杂度    │  简单                  │  复杂（临时节点+Watcher）│
│ 适用场景      │  高并发、可容忍偶尔失败 │  金融级、强一致要求     │
└──────────────┴──────────────────────┴──────────────────────┘
```

**【面试官追问预判】**

- Q: Redis锁的过期时间设多少合适？业务执行超过过期时间怎么办？

A: 过期时间应大于业务最大执行时间。如果不确定，用Redisson的看门狗自动续期。如果手动实现，可以启动一个后台线程定时续期。注意：续期也需要用Lua脚本判断锁是否还在。过期时间太短→锁提前释放→并发问题；太长→服务宕机后锁占用时间长→影响可用性。

- Q: Redisson的公平锁和非公平锁有什么区别？

A: 非公平锁：多个线程竞争时，不保证获取顺序，可能后来的线程先获取（吞吐量高）。公平锁：按请求顺序获取（FIFO），不会饥饿，但吞吐量低。Redisson公平锁用Redis的List队列记录等待线程，按顺序唤醒。默认是非公平锁，大多数场景用非公平锁即可。

- Q: 如何实现分布式读写锁？

A: Redisson提供RReadWriteLock。读锁共享（多个读线程可同时持有），写锁排他。实现上用两个锁：读锁和写锁。加读锁时检查写锁是否被持有；加写锁时检查读锁和写锁。适合读多写少的场景，比纯排他锁并发度更高。



## **4.3 缓存与数据库一致性问题与解决方案**

**【场景描述】**商品信息更新时，需要同时更新数据库和Redis缓存。出现缓存与数据库数据不一致的情况：①先更新数据库再删缓存，缓存删除失败导致不一致；②先删缓存再更新数据库，并发读导致旧数据回填。

**【故障现象】**

- 用户看到的商品价格是旧的（缓存未更新）

- 数据库已更新但缓存仍是旧值，持续到缓存过期

- 高并发下出现短暂的数据不一致窗口

**【解决方案】**

**▶ 中级回答**

四种缓存更新策略对比：

缓存更新策略对比：
```text
┌──────────────────┬──────────────────────┬──────────────────────┐
│  策略             │  写操作               │  问题                 │
├──────────────────┼──────────────────────┼──────────────────────┤
│ 先更新DB再删缓存  │  update DB → del cache│ 删缓存失败→不一致      │
│ 先删缓存再更新DB  │  del cache → update DB│ 并发读旧值回填→不一致  │
│ 先更新DB再更新缓存│  update DB → set cache│ 更新缓存失败→不一致    │
│ 先更新缓存再更新DB│  set cache → update DB│ 更新DB失败→不一致      │
└──────────────────┴──────────────────────┴──────────────────────┘
```

推荐：先更新数据库，再删除缓存（Cache-Aside Pattern）
原因：①删除缓存比更新缓存更安全（下次读自动加载）；
②更新缓存可能导致并发写覆盖问题；
③删除操作幂等，失败可重试。

// Cache-Aside模式（读）
~~~java
public Product getProduct(Long id) {
    String key = "product:" + id;
    Product product = redisTemplate.opsForValue().get(key);
    if (product != null) return product;        // 缓存命中
    product = productMapper.selectById(id);     // 缓存未命中，查DB
    if (product != null) {
        redisTemplate.opsForValue().set(key, product, 30, TimeUnit.MINUTES);  // 回填缓存
    }
    return product;
}

// Cache-Aside模式（写）
@Transactional
public void updateProduct(Product product) {
    productMapper.updateById(product);          // 1. 更新数据库
    redisTemplate.delete("product:" + product.getId());  // 2. 删除缓存
}
~~~
// 问题：如果第2步删除缓存失败怎么办？
// 解决方案：重试机制 + 消息队列兜底

**▶ 资深回答**

从并发时序到最终一致性方案的完整分析：

**【先删缓存再更新DB的并发问题】**

并发时序（先删缓存，再更新DB）：
线程A（写）              线程B（读）
```text
│                       │
│ 1. 删除缓存            │
│                       │ 2. 读缓存（未命中）
│                       │ 3. 读数据库（旧值）
│ 4. 更新数据库（新值）   │
│                       │ 5. 旧值写入缓存
│                       │
▼                       ▼
数据库=新值              缓存=旧值 ← 不一致！直到缓存过期
```

解决方案：延迟双删
1. 删除缓存
2. 更新数据库
3. 休眠一段时间（如500ms，大于读请求的耗时）
4. 再次删除缓存（删除可能被回填的旧值）

但延迟双删也有问题：
- 休眠时间难以确定
- 第二次删除仍可能失败
- 吞吐量降低

**【基于MQ的最终一致性方案】**

最终一致性方案（数据库更新 → MQ → 删除缓存）：

```text
                写请求
                  │
                  ▼
            ┌─────────────┐
            │ 更新数据库   │  事务提交后
            └──────┬──────┘
                   │
                   ▼
            ┌─────────────┐   发送删除缓存消息
            │  发送MQ消息  │──────────────────────────┐
            └─────────────┘                         │
                   ▼
            ┌─────────────┐
            │  消费消息     │
            │  删除缓存     │
            └──────┬──────┘
                   │ 失败
                   ▼
            ┌─────────────┐
            │  重试机制     │  最多重试N次
            │  (指数退避)   │
            └──────┬──────┘
                   │ 仍失败
                   ▼
            ┌─────────────┐
            │  死信队列     │  人工处理
            └─────────────┘
```

优点：①删除缓存与业务解耦；②MQ保证消息至少投递一次；
③失败可重试；④不影响主流程性能
缺点：①有短暂不一致窗口；②引入MQ增加系统复杂度

**【基于binlog的最终一致性方案（Canal）】**

// Canal监听MySQL binlog，异步删除缓存
// 架构：MySQL → Canal Server → Canal Client → 删除Redis缓存
~~~java
// Canal Client示例
@CanalEventListener
public class ProductCacheListener {
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @ListenPoint(schema = "shop", table = "product")
    public void onProductChange(CanalEntry.Entry entry) {
        if (entry.getEntryType() == CanalEntry.EntryType.ROWDATA) {
            CanalEntry.RowChange rowChange = ...;
            for (CanalEntry.RowData rowData : rowChange.getRowDatasList()) {
                // 获取变更后的商品ID
                Long productId = getColumnValue(rowData.getAfterColumnsList(), "id");
                // 删除缓存
                redisTemplate.delete("product:" + productId);
            }
        }
    }
}
~~~
// 优点：
// 1. 业务代码零侵入（不需要在更新方法中写缓存删除逻辑）
// 2. 基于binlog，保证数据库变更一定能被捕获
// 3. 适合复杂的多表关联缓存更新场景
// 缺点：
// 1. 引入Canal组件，增加运维成本
// 2. 延迟比直接删除大（binlog同步+消费）
// 3. Canal本身需要高可用部署

**【缓存一致性方案选型】**

方案选型决策树：
对一致性要求？
```text
│
├─ 强一致（不能有任何不一致）──────► 不用缓存，或加分布式锁+读写锁
│
└─ 最终一致（允许短暂不一致）
│
├─ 简单场景（单表、QPS不高）────► Cache-Aside（先更DB再删缓存）
│
├─ 高并发、删缓存可能失败───────► + MQ重试机制
│
└─ 多表关联、业务复杂───────────► Canal监听binlog异步删除
```

注意：没有完美的缓存一致性方案！
- CAP定理：分布式系统中一致性(C)、可用性(A)、分区容错性(P)不能同时满足
- 缓存本质上是为了提升性能和可用性，必然牺牲一定的一致性
- 业务上能接受最终一致就用最终一致，不能接受就不用缓存

**【底层原理】**

**1. 为什么是删除缓存而不是更新缓存**

- 并发写问题：两个线程同时更新缓存，可能导致后写的覆盖先写的，但数据库顺序可能相反

- 写放大：如果缓存值需要关联多表计算，每次更新都重新计算代价高

- 懒加载：删除后下次读取时再加载，只加载实际被访问的数据

- 幂等性：删除操作天然幂等，更新操作需要考虑并发覆盖

**2. MySQL binlog与Canal原理**

Canal模拟MySQL从库，向主库发送COM_BINLOG_DUMP命令，主库推送binlog事件。Canal解析binlog（ROW模式），将变更事件推送给客户端。binlog的ROW模式记录每行数据的变更前和变更后的值，所以Canal能获取精确的变更数据。

**3. 缓存更新的事务问题**

如果在数据库事务中删除缓存，事务回滚后缓存已被删除，下次读会加载旧数据（事务回滚前的值）。但这其实是正确的——因为事务回滚后数据库确实是旧值。问题在于：如果事务提交后删除缓存失败，需要重试机制。所以删除缓存应该在事务提交后执行（TransactionSynchronizationManager.registerSynchronization）。

**【面试官追问预判】**

- Q: 先更新数据库再删缓存，有没有并发问题？

A: 理论上有，但概率极低。时序：①线程A读缓存未命中，查数据库（旧值）；②线程B更新数据库并删缓存；③线程A将旧值写入缓存。这个时序需要线程A的读数据库操作比线程B的写操作还慢，通常写操作比读操作慢，所以概率很低。可以通过缓存过期时间兜底，即使不一致也只会持续到过期。

- Q: 如何保证缓存和数据库的强一致性？

A: 分布式系统中强一致性很难。方案：①读写锁（读加共享锁，写加排他锁），写时阻塞读，保证一致但性能差；②2PC/分布式事务，性能更差；③不用缓存，直接读数据库。实际上大多数业务场景接受最终一致，强一致场景（如金融账户余额）通常不使用缓存。

- Q: 本地缓存（Caffeine）和Redis缓存的一致性怎么保证？

A: 数据更新时，除了删除Redis缓存，还要通知所有服务节点删除本地缓存。方案：①Redis Pub/Sub广播失效消息，各节点订阅后删除本地缓存；②MQ广播消息；③本地缓存设置很短的过期时间（如5秒），即使不一致也很快恢复。注意：Pub/Sub消息不持久化，节点宕机期间的消息会丢失，所以本地缓存必须有过期时间兜底。

---

# **模块五：Spring框架场景**

## **5.1 Spring循环依赖与三级缓存深度解析**

**【场景描述】**ServiceA依赖ServiceB，ServiceB依赖ServiceA，形成循环依赖。Spring能解决单例Bean的循环依赖，但原型Bean、构造器注入的循环依赖会失败。需要理解三级缓存的工作原理。

**【故障现象】**

- BeanCurrentlyInCreationException：当前Bean正在创建中

- 构造器注入循环依赖启动失败

- 原型（prototype）Bean循环依赖启动失败

- AOP代理场景下循环依赖的特殊处理

**【解决方案】**

**▶ 中级回答**

三级缓存的结构与作用：

Spring三级缓存（DefaultSingletonBeanRegistry）：
```text
┌─────────────────────────────────────────────────────────────┐
│  一级缓存：singletonObjects                                   │
│  Map<String, Object>                                         │
│  存放完全初始化好的Bean（可直接使用）                           │
├─────────────────────────────────────────────────────────────┤
│  二级缓存：earlySingletonObjects                              │
│  Map<String, Object>                                         │
│  存放提前暴露的Bean（已实例化但未初始化，可能是代理对象）        │
├─────────────────────────────────────────────────────────────┤
│  三级缓存：singletonFactories                                 │
│  Map<String, ObjectFactory<?>>                               │
│  存放Bean的工厂对象（ObjectFactory），用于生成早期Bean引用      │
│  关键：可以在这里生成AOP代理对象                               │
└─────────────────────────────────────────────────────────────┘

获取Bean的查询顺序：一级缓存 → 二级缓存 → 三级缓存
一级命中 → 直接返回
二级命中 → 直接返回（早期引用，可能是代理）
三级命中 → 调用ObjectFactory.getObject()生成早期引用，放入二级缓存，删除三级缓存
```
~~~java
// 循环依赖示例（setter注入，Spring能解决）
@Service
public class ServiceA {
    private ServiceB serviceB;
    @Autowired  // setter注入或字段注入
    public void setServiceB(ServiceB serviceB) { this.serviceB = serviceB; }
}
@Service
public class ServiceB {
    private ServiceA serviceA;
    @Autowired
    public void setServiceA(ServiceA serviceA) { this.serviceA = serviceA; }
}

// 构造器注入（Spring无法解决）
@Service
public class ServiceA {
    private final ServiceB serviceB;
    public ServiceA(ServiceB serviceB) { this.serviceB = serviceB; }  // ✗ 失败
}

// 解决方案：@Lazy延迟注入
@Service
public class ServiceA {
    private final ServiceB serviceB;
    public ServiceA(@Lazy ServiceB serviceB) {  // ✓ 注入代理对象，延迟加载
        this.serviceB = serviceB;
    }
}

// 原型Bean循环依赖（Spring无法解决）
@Scope("prototype")
@Service
public class ServiceA { ... }  // ✗ 每次创建新对象，无法缓存早期引用
~~~

**▶ 资深回答**

从源码层面理解三级缓存与AOP代理的循环依赖：

**【循环依赖完整流程】**

ServiceA和ServiceB循环依赖的创建流程：

1. 创建ServiceA
```text
├─ doGetBean("serviceA")
├─ getSingleton() → 三级缓存都没有
├─ 标记serviceA正在创建（singletonsCurrentlyInCreation.add("serviceA")）
├─ createBean() → doCreateBean()
│   ├─ createBeanInstance() → 实例化ServiceA（调用无参构造）
│   ├─ addSingletonFactory("serviceA", ObjectFactory) → 放入三级缓存！
│   │   （ObjectFactory的getObject()会调用getEarlyBeanReference，可能生成AOP代理）
│   └─ populateBean() → 属性注入
│       └─ 发现需要注入ServiceB
│           └─ doGetBean("serviceB")
│
```
2. 创建ServiceB
```text
├─ getSingleton() → 三级缓存都没有
├─ 标记serviceB正在创建
├─ createBean() → doCreateBean()
│   ├─ createBeanInstance() → 实例化ServiceB
│   ├─ addSingletonFactory("serviceB", ObjectFactory) → 放入三级缓存
│   └─ populateBean() → 属性注入
│       └─ 发现需要注入ServiceA
│           └─ doGetBean("serviceA")
│               ├─ getSingleton("serviceA")
│               │   ├─ 一级缓存：没有
│               │   ├─ 二级缓存：没有
│               │   └─ 三级缓存：有！调用ObjectFactory.getObject()
│               │       └─ getEarlyBeanReference() → 返回ServiceA的早期引用
│               │           （如果有AOP，这里返回代理对象；否则返回原始对象）
│               ├─ 将ServiceA早期引用放入二级缓存
│               ├─ 从三级缓存删除ServiceA
│               └─ 返回ServiceA早期引用给ServiceB注入 ✓
│
├─ ServiceB属性注入完成
├─ initializeBean() → 初始化ServiceB（@PostConstruct、AOP代理等）
└─ ServiceB创建完成 → 放入一级缓存，删除二级/三级缓存
│
```
3. 回到ServiceA的创建
```text
├─ ServiceA属性注入完成（注入了ServiceB）
├─ initializeBean() → 初始化ServiceA
│   （注意：如果ServiceA已经在三级缓存中生成了代理，这里不会再生成代理）
└─ ServiceA创建完成 → 放入一级缓存
```

关键：三级缓存的ObjectFactory是解决AOP循环依赖的核心！
如果没有AOP，二级缓存就够了（直接放原始对象）。
但有AOP时，早期引用必须是代理对象，所以需要三级缓存的工厂来延迟生成代理。

**【三级缓存源码解析】**
~~~java
// DefaultSingletonBeanRegistry.java

// 一级缓存：完全初始化的Bean
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);

// 二级缓存：早期Bean引用（已实例化未初始化）
private final Map<String, Object> earlySingletonObjects = new ConcurrentHashMap<>(16);

// 三级缓存：Bean工厂
private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);

// 获取单例Bean（核心方法）
protected Object getSingleton(String beanName, boolean allowEarlyReference) {
    // 1. 先查一级缓存
    Object singletonObject = this.singletonObjects.get(beanName);
    if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
        // 2. 查二级缓存
        singletonObject = this.earlySingletonObjects.get(beanName);
        if (singletonObject == null && allowEarlyReference) {
            synchronized (this.singletonObjects) {
                // 双重检查
                singletonObject = this.singletonObjects.get(beanName);
                if (singletonObject == null) {
                    singletonObject = this.earlySingletonObjects.get(beanName);
                    if (singletonObject == null) {
                        // 3. 查三级缓存
                        ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName);
                        if (singletonFactory != null) {
                            // 调用工厂生成早期引用
                            singletonObject = singletonFactory.getObject();
                            // 放入二级缓存
                            this.earlySingletonObjects.put(beanName, singletonObject);
                            // 从三级缓存移除
                            this.singletonFactories.remove(beanName);
                        }
                    }
                }
            }
        }
    }
    return singletonObject;
}

// 添加三级缓存（在doCreateBean中，实例化后、属性注入前调用）
protected void addSingletonFactory(String beanName, ObjectFactory<?> singletonFactory) {
    synchronized (this.singletonObjects) {
        if (!this.singletonObjects.containsKey(beanName)) {
            this.singletonFactories.put(beanName, singletonFactory);
            this.earlySingletonObjects.remove(beanName);
            this.registeredSingletons.add(beanName);
        }
    }
}

// ObjectFactory的实现（在AbstractAutowireCapableBeanFactory中）
addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));

// getEarlyBeanReference：遍历SmartInstantiationAwareBeanPostProcessor
// 其中AnnotationAwareAspectJAutoProxyCreator会在这里生成AOP代理对象
protected Object getEarlyBeanReference(String beanName, RootBeanDefinition mbd, Object bean) {
    Object exposedObject = bean;
    for (SmartInstantiationAwareBeanPostProcessor bp : getSmartInstantiationAwareBeanPostProcessors()) {
        exposedObject = bp.getEarlyBeanReference(exposedObject, beanName);
    }
    return exposedObject;
}
~~~

**【为什么构造器注入无法解决循环依赖】**

因为构造器注入时，必须先完成构造方法调用才能实例化对象。ServiceA的构造需要ServiceB，ServiceB的构造需要ServiceA——两个对象都无法完成实例化，也就无法放入三级缓存（三级缓存需要先有实例化后的对象）。setter注入/字段注入可以先实例化（调用无参构造），再注入属性，所以能利用三级缓存。

**【底层原理】**

**1. AOP代理的创建时机**

正常情况下（无循环依赖），AOP代理在initializeBean阶段的postProcessAfterInitialization中创建。有循环依赖时，代理对象需要提前在getEarlyBeanReference中创建（三级缓存的工厂方法中），这样其他Bean注入的就是代理对象。Spring通过earlyProxyReferences记录已经提前创建代理的Bean，避免initializeBean阶段重复创建代理。

**2. 原型Bean为什么不能解决循环依赖**

原型Bean每次getBean都创建新对象，不缓存。Spring在创建原型Bean前会检查是否正在创建中（isPrototypeCurrentlyInCreation），如果是则直接抛出异常。因为原型Bean没有缓存，无法像单例那样提前暴露引用。

**【面试官追问预判】**

- Q: 二级缓存能不能解决循环依赖？为什么需要三级缓存？

A: 如果没有AOP，二级缓存就够了（实例化后直接放入二级缓存）。但有AOP时，早期暴露的引用必须是代理对象，而代理对象的创建需要时机控制。三级缓存的ObjectFactory可以延迟创建代理——只有在真正被其他Bean引用时才创建代理。如果用二级缓存直接存代理对象，那所有Bean在实例化后都要立即创建代理，即使没有循环依赖也会创建，增加不必要的开销。三级缓存实现了"按需创建代理"。

- Q: Spring如何检测循环依赖？

A: 通过singletonsCurrentlyInCreation集合。创建Bean前将beanName加入集合，创建完成后移除。如果创建过程中发现要创建的Bean已经在集合中，说明存在循环依赖。对于单例setter注入，Spring会尝试用三级缓存解决；对于构造器注入和原型Bean，直接抛异常。

- Q: @Lazy是如何解决循环依赖的？

A: @Lazy注入的不是真实对象，而是一个代理对象（JDK动态代理或CGLIB代理）。代理对象在第一次调用方法时才去容器中获取真实Bean。这样构造器注入时，ServiceA构造时注入的是ServiceB的代理，不需要立即创建ServiceB，打破了循环依赖。代理对象的每次方法调用都会触发ContextBeanFactory.getBean()获取真实对象。



## **5.2 Spring Bean生命周期与扩展点详解**

**【场景描述】**需要在Bean初始化前后执行自定义逻辑（如配置加载、资源初始化、优雅关闭）。同时需要理解Spring的各种扩展点（BeanPostProcessor、BeanFactoryPostProcessor等）的执行时机。

**【故障现象】**

- @PostConstruct方法中注入的属性为null（执行时机问题）

- 实现InitializingBean的afterPropertiesSet不执行

- BeanPostProcessor的postProcessAfterInitialization中获取的对象不是代理对象

- 关闭容器时资源未释放

**【解决方案】**

**▶ 中级回答**

Bean生命周期完整流程：

Spring Bean生命周期（单例Bean）：
```text
┌─────────────────────────────────────────────────────────────────┐
│  1. 实例化（Instantiation）                                       │
│     createBeanInstance() → 调用构造方法（反射/CGLIB）              │
│     ↓ BeanPostProcessor.postProcessBeforeInstantiation()        │
│     ↓ （如果返回非null，跳过后续流程，直接走postProcessAfter）        │
├─────────────────────────────────────────────────────────────────┤
│  2. 属性注入（Populate）                                          │
│     populateBean() → 注入@Autowired/@Value等属性                  │
│     ↓ Aware接口回调：                                             │
│       BeanNameAware → BeanClassLoaderAware → BeanFactoryAware   │
├─────────────────────────────────────────────────────────────────┤
│  3. 初始化（Initialization）                                      │
│     initializeBean()                                             │
│     ├─ Aware回调：                                                │
│     │  EnvironmentAware → EmbeddedValueResolverAware →           │
│     │  ResourceLoaderAware → ApplicationEventPublisherAware →    │
│     │  MessageSourceAware → ApplicationContextAware              │
│     ├─ BeanPostProcessor.postProcessBeforeInitialization()       │
│     │ （@PostConstruct在此执行，CommonAnnotationBeanPostProcessor）│
│     ├─ InitializingBean.afterPropertiesSet()                     │
│     ├─ init-method（@Bean(initMethod)或XML配置）                  │
│     └─ BeanPostProcessor.postProcessAfterInitialization()       │
│         （AOP代理在此创建！AnnotationAwareAspectJAutoProxyCreator）│
├─────────────────────────────────────────────────────────────────┤
│  4. 使用（Ready）                                                 │
│     Bean放入一级缓存singletonObjects，可被使用                     │
├─────────────────────────────────────────────────────────────────┤
│  5. 销毁（Destruction）                                           │
│     容器关闭时（AbstractApplicationContext.close()）               │
│     ├─ @PreDestroy（CommonAnnotationBeanPostProcessor）           │
│     ├─ DisposableBean.destroy()                                   │
│     └─ destroy-method                                             │
└─────────────────────────────────────────────────────────────────┘
```

// 完整的Bean生命周期示例
~~~java
@Component
public class LifeCycleBean implements BeanNameAware, BeanFactoryAware,
ApplicationContextAware, InitializingBean, DisposableBean {

    private String beanName;
    private BeanFactory beanFactory;
    private ApplicationContext applicationContext;

    // 构造方法
    public LifeCycleBean() {
        System.out.println("1. 构造方法执行");
    }

    // 属性注入（@Autowired）
    @Autowired
    private OtherBean otherBean;

    // Aware回调
    @Override public void setBeanName(String name) {
        this.beanName = name;
        System.out.println("2. BeanNameAware: " + name);
    }
    @Override public void setBeanFactory(BeanFactory beanFactory) {
        this.beanFactory = beanFactory;
        System.out.println("3. BeanFactoryAware");
    }
    @Override public void setApplicationContext(ApplicationContext ctx) {
        this.applicationContext = ctx;
        System.out.println("4. ApplicationContextAware");
    }

    // @PostConstruct（初始化前）
    @PostConstruct
    public void postConstruct() {
        System.out.println("5. @PostConstruct");
    }

    // InitializingBean
    @Override
    public void afterPropertiesSet() {
        System.out.println("6. InitializingBean.afterPropertiesSet");
    }

    // init-method
    public void initMethod() {
        System.out.println("7. init-method");
    }

    // @PreDestroy（销毁前）
    @PreDestroy
    public void preDestroy() {
        System.out.println("8. @PreDestroy");
    }

    // DisposableBean
    @Override
    public void destroy() {
        System.out.println("9. DisposableBean.destroy");
    }

    // destroy-method
    public void destroyMethod() {
        System.out.println("10. destroy-method");
    }
}
~~~
```text
// 执行顺序：构造 → Aware → @PostConstruct → afterPropertiesSet → init-method
// 销毁顺序：@PreDestroy → destroy → destroy-method
```

**▶ 资深回答**


Spring扩展点体系与BeanPostProcessor原理：

**【Spring两大核心扩展点】**

BeanFactoryPostProcessor vs BeanPostProcessor：

BeanFactoryPostProcessor（Bean工厂后置处理器）：
执行时机：Bean定义加载完成后，Bean实例化之前
作用：修改BeanDefinition（Bean的定义信息）
典型实现：
- PropertySourcesPlaceholderConfigurer：解析${}占位符
- CustomScopeConfigurer：注册自定义Scope
- ConfigurationClassPostProcessor：处理@Configuration类
注意：此时Bean还未实例化，不能操作Bean实例

BeanPostProcessor（Bean后置处理器）：
执行时机：Bean实例化后、初始化前后
作用：修改Bean实例（包装、代理、属性修改）
典型实现：
- CommonAnnotationBeanPostProcessor：处理@PostConstruct/@PreDestroy/@Resource
- AutowiredAnnotationBeanPostProcessor：处理@Autowired/@Value注入
- AnnotationAwareAspectJAutoProxyCreator：创建AOP代理
- ValidationPostProcessor：JSR-303校验

执行顺序：
BeanFactoryPostProcessor → Bean实例化 → BeanPostProcessor
（容器级扩展）              （Bean级扩展）

**【BeanPostProcessor的两个关键方法】**
~~~java
public interface BeanPostProcessor {
    // 初始化前执行（@PostConstruct之前）
    // 如果返回null，后续的BeanPostProcessor不再执行
    default Object postProcessBeforeInitialization(Object bean, String beanName)
    throws BeansException {
        return bean;
    }

    // 初始化后执行（init-method之后）
    // AOP代理在这里创建！返回代理对象替换原始Bean
    default Object postProcessAfterInitialization(Object bean, String beanName)
    throws BeansException {
        return bean;
    }
}

// 注意：postProcessBeforeInstantiation（实例化前）
// 定义在SmartInstantiationAwareBeanPostProcessor中
// 如果此方法返回非null对象，会跳过正常的Bean创建流程，
// 直接走postProcessAfterInitialization然后返回

// AOP代理创建（AnnotationAwareAspectJAutoProxyCreator）
public Object postProcessAfterInitialization(Object bean, String beanName) {
    if (bean != null) {
        Object cacheKey = getCacheKey(bean.getClass(), beanName);
        // 检查是否需要代理（是否有匹配的切面）
        if (this.earlyProxyReferences.remove(cacheKey) != bean) {
            // 如果需要代理，创建代理对象
            return wrapIfNecessary(bean, beanName, cacheKey);
        }
    }
    return bean;
}

// wrapIfNecessary：创建AOP代理
protected Object wrapIfNecessary(Object bean, String beanName, Object cacheKey) {
    // 获取匹配的切面通知（Advisor列表）
    Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(bean.getClass(), beanName, null);
    if (specificInterceptors != DO_NOT_PROXY) {
        this.advisedBeans.put(cacheKey, Boolean.TRUE);
        // 创建代理：JDK动态代理（有接口）或CGLIB代理（无接口）
        Object proxy = createProxy(bean.getClass(), beanName, specificInterceptors,
        new SingletonTargetSource(bean));
        this.proxyTypes.put(cacheKey, proxy.getClass());
        return proxy;
    }
    this.advisedBeans.put(cacheKey, Boolean.FALSE);
    return bean;
}
~~~
**【Spring事务代理的创建时机】**

@Transactional的代理也是在postProcessAfterInitialization中创建的，由InfrastructureAdvisorAutoProxyCreator（或AnnotationAwareAspectJAutoProxyCreator）处理。它会扫描Bean的方法上是否有@Transactional注解，如果有则创建代理。代理对象在执行方法时，通过TransactionInterceptor拦截，开启/提交/回滚事务。

**【底层原理】**

**1. 为什么@PostConstruct在InitializingBean之前执行**

@PostConstruct由CommonAnnotationBeanPostProcessor的postProcessBeforeInitialization处理，而postProcessBeforeInitialization在initializeBean中先于afterPropertiesSet执行。执行顺序：postProcessBeforeInitialization（含@PostConstruct）→ afterPropertiesSet → init-method。

**2. BeanPostProcessor的执行顺序**

- 实现PriorityOrdered接口的优先执行

- 实现Ordered接口的次之（按order值升序）

- 普通的最后执行

- 注意：BeanPostProcessor本身也是Bean，但它会在普通Bean之前实例化

**3. 销毁回调的注册机制**

Spring在Bean初始化时，会检查Bean是否实现DisposableBean或有destroy-method，如果有则注册到disposableBeans集合中。容器关闭时遍历这个集合，依次调用销毁方法。@PreDestroy由CommonAnnotationBeanPostProcessor在postProcessBeforeInitialization中将@PreDestroy方法注册为销毁回调。

**【面试官追问预判】**

- Q: BeanPostProcessor和BeanFactoryPostProcessor的区别？

A: ①执行时机不同：BeanFactoryPostProcessor在Bean实例化前，操作BeanDefinition；BeanPostProcessor在Bean实例化后，操作Bean实例。②作用不同：前者修改Bean定义，后者修改Bean对象。③典型场景：前者用于修改占位符、注册自定义Scope；后者用于AOP代理、属性注入、校验。

- Q: 如何在Spring启动时执行自定义逻辑？各种方式的优先级？

A: 方式及优先级：①BeanFactoryPostProcessor（最早，Bean实例化前）；②@PostConstruct（Bean初始化前）；③InitializingBean.afterPropertiesSet；④init-method；⑤ApplicationRunner/CommandLineRunner（容器启动完成后）；⑥@EventListener(ContextRefreshedEvent.class)（容器刷新完成后）。如果需要所有Bean初始化完成后执行，用ApplicationRunner或ContextRefreshedEvent。

- Q: 原型Bean的生命周期和单例有什么不同？

A: 原型Bean每次getBean都创建新实例，Spring只负责创建、初始化，不负责销毁。所以原型Bean的@PreDestroy和DisposableBean.destroy()不会被Spring调用！如果需要释放资源，必须手动调用。另外，原型Bean不会被放入一级缓存，也不参与循环依赖解决。

---

# **模块六：分布式一致性场景**

## **6.1 2PC/3PC原理、缺陷与XA事务实战**

**【场景描述】**跨库转账场景：从A账户（DB1）扣款，到B账户（DB2）加款，需要保证两个数据库操作的原子性。使用XA两阶段提交（2PC）实现，但出现协调者宕机导致资源锁定、同步阻塞等问题。

**【故障现象】**

- 协调者宕机后，参与者一直锁定资源，无法释放

- 网络分区时，部分参与者提交，部分回滚，数据不一致

- 同步阻塞导致吞吐量极低，不适合高并发场景

- 参与者宕机后恢复时，不确定事务状态（提交还是回滚）

**【解决方案】**

**▶ 中级回答**

2PC和3PC的详细流程：

2PC（Two-Phase Commit）流程：

阶段一：准备阶段（Prepare / Voting）
协调者                        参与者A          参与者B
```text
│                            │                │
│──── Prepare ──────────────▶│                │
│──── Prepare ──────────────▶│───────────────▶│
│                            │ 写redo/undo日志 │ 写redo/undo日志
│                            │ 锁定资源        │ 锁定资源
│◀──── Yes/No ──────────────│                │
│◀──── Yes/No ───────────────────────────────│
```

阶段二：提交/回滚阶段（Commit / Abort）
如果全部Yes：
```text
│──── Commit ───────────────▶│                │
│──── Commit ───────────────▶│───────────────▶│
│                            │ 提交事务        │ 提交事务
│                            │ 释放锁          │ 释放锁
│◀──── Ack ─────────────────│                │
│◀──── Ack ──────────────────────────────────│
```

如果有一个No或超时：
```text
│──── Rollback ─────────────▶│                │
│                            │ 回滚事务        │ 回滚事务
│                            │ 释放锁          │ 释放锁
```

2PC的问题：
1. 同步阻塞：准备阶段后，所有参与者锁定资源，等待协调者指令
2. 协调者单点：协调者宕机，参与者永远等待（资源锁定）
3. 数据不一致：提交阶段网络分区，部分参与者收到Commit提交，部分没收到回滚

3PC（Three-Phase Commit）流程：
在2PC基础上增加CanCommit阶段，并引入参与者超时机制

阶段一：CanCommit（询问是否可以提交）
协调者 ──CanCommit──▶ 参与者 ──Yes/No──▶ 协调者
（参与者不锁定资源，只检查是否可以执行）

阶段二：PreCommit（预提交）
如果全部Yes：
协调者 ──PreCommit──▶ 参与者
参与者：写redo/undo日志，锁定资源，返回Ack
（参与者启动超时计时器：超时未收到DoCommit则自动提交）

阶段三：DoCommit（真正提交）
协调者 ──DoCommit──▶ 参与者 ──提交事务、释放锁──▶ Ack
如果有No或超时：
协调者 ──Abort──▶ 参与者 ──回滚──▶ Ack

3PC的改进：
1. 减少阻塞：CanCommit阶段不锁定资源
2. 参与者超时：PreCommit后超时自动提交（解决协调者宕机问题）
3. 但仍有数据不一致风险：网络分区时参与者超时自动提交，协调者可能决定回滚

注意：3PC在实际生产中很少使用，因为实现复杂且不能完全解决一致性问题

// XA事务Java代码示例（Atomikos + Spring Boot）
~~~java
@Configuration
public class XAConfig {
    // 配置两个XA数据源
    @Bean
    @Primary
    public DataSource dataSource1() {
        MysqlXADataSource xaDs = new MysqlXADataSource();
        xaDs.setUrl("jdbc:mysql://db1:3306/account_a");
        xaDs.setUser("root");
        AtomikosDataSourceBean ds = new AtomikosDataSourceBean();
        ds.setXaDataSource(xaDs);
        ds.setUniqueResourceName("db1");
        ds.setMaxPoolSize(10);
        return ds;
    }
    // dataSource2类似...

    @Bean
    public JtaTransactionManager transactionManager() {
        UserTransactionManager utm = new UserTransactionManager();
        UserTransactionImp ut = new UserTransactionImp();
        return new JtaTransactionManager(ut, utm);
    }
}

@Service
public class TransferService {
    @Transactional(transactionManager = "transactionManager")
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        // 操作DB1：扣款
        accountMapper1.debit(fromId, amount);
        // 操作DB2：加款
        accountMapper2.credit(toId, amount);
    }
    // Spring的JtaTransactionManager会自动使用XA两阶段提交
}
~~~

**▶ 资深回答**

从CAP定理到分布式事务选型：

**【CAP定理与BASE理论】**

CAP定理：分布式系统中，一致性(C)、可用性(A)、分区容错性(P)三者不可兼得
- C(Consistency)：所有节点在同一时间看到相同的数据
- A(Availability)：每个请求都能得到非错误响应（不保证是最新数据）
- P(Partition Tolerance)：网络分区时系统仍能运行

网络分区不可避免（P必须满足），所以实际是在C和A之间权衡：
- CP系统：牺牲可用性，保证一致性（ZooKeeper、etcd、HBase）
- AP系统：牺牲一致性，保证可用性（Eureka、Cassandra、DynamoDB）

BASE理论（对CAP中AP的延伸）：
- Basically Available：基本可用（允许响应时间增加、功能降级）
- Soft State：软状态（允许中间状态，如数据同步延迟）
- Eventually Consistent：最终一致（一段时间后数据达到一致）

分布式事务方案本质上是在C和A之间做选择：
- 强一致（2PC/XA）：CP，性能差，适合金融核心
- 最终一致（TCC/SAGA/消息表）：AP，性能好，适合大多数互联网业务

**【XA事务的深度问题】**

// XA事务的底层：MySQL XA语法
XA START 'xid1';          -- 开启XA事务
UPDATE account SET balance = balance - 100 WHERE id = 1;
XA END 'xid1';            -- 结束
XA PREPARE 'xid1';        -- 准备阶段（写日志，锁定资源）
XA COMMIT 'xid1';         -- 提交（或 XA ROLLBACK 'xid1'）

-- 查看处于PREPARE状态的XA事务
XA RECOVER;

-- 问题：如果XA PREPARE后协调者宕机，MySQL中的XA事务会一直处于PREPARE状态
-- 锁定行资源，导致其他事务阻塞。需要手动处理：
-- 1. XA RECOVER 查看悬挂事务
-- 2. 根据业务判断提交或回滚
-- 3. XA COMMIT/ROLLBACK 手动处理

-- MySQL XA的限制：
-- 1. 不支持XA事务内的DDL语句
-- 2. 复制环境下XA事务可能导致主从不一致
-- 3. 性能差（比普通事务慢3-10倍）

**【底层原理】**

**1. XA规范与两阶段提交**

XA（eXtended Architecture）是X/Open组织定义的分布式事务规范，定义了事务管理器（TM，Transaction Manager）和资源管理器（RM，Resource Manager）之间的接口。TM是协调者，RM是数据库等资源。JTA（Java Transaction API）是XA规范的Java实现。Atomikos、Bitronix、Narayana是常见的JTA实现。

**2. 2PC的日志机制**

协调者和参与者都需要写事务日志（持久化到磁盘）。协调者在发送Prepare前写"开始事务"日志，在发送Commit/Rollback前写"提交/回滚"日志。参与者在Prepare阶段写redo/undo日志。这样即使宕机，恢复时可以根据日志决定事务状态。但协调者宕机时，参与者无法获取事务状态，只能等待（或人工干预）。

**【面试官追问预判】**

- Q: 2PC和3PC的区别？3PC真的解决了2PC的问题吗？

A: 3PC增加了CanCommit阶段（减少阻塞）和参与者超时自动提交机制（解决协调者单点）。但3PC仍有数据不一致风险：网络分区时，参与者超时自动提交，但协调者可能因为收不到Ack而决定回滚。而且3PC实现复杂，实际生产中几乎不用。大多数系统选择最终一致性方案（TCC/SAGA/消息表）。

- Q: XA事务的性能为什么差？

A: ①同步阻塞：Prepare阶段后所有参与者锁定资源，等待协调者指令，并发度低；②多次网络往返：协调者与每个参与者至少2次通信（Prepare+Commit）；③日志刷盘：Prepare阶段需要写redo/undo日志并刷盘；④协调者单点：所有事务经过协调者，协调者成为性能瓶颈。通常XA事务吞吐量比本地事务低5-10倍。

- Q: 什么场景下必须用XA（强一致）而不是最终一致？

A: 金融核心场景：跨行转账、证券交易、支付清算。这些场景对一致性要求极高，不能容忍任何中间状态。但即使在金融领域，也越来越多使用最终一致+补偿的方案，因为XA性能太差，无法满足高并发需求。比如支付宝的分布式事务就是基于TCC和消息表。



## **6.2 TCC分布式事务原理与Seata实现**

**【场景描述】**电商下单场景：扣减库存（库存服务）、创建订单（订单服务）、扣减余额（账户服务），三个服务需要保证事务一致性。使用TCC（Try-Confirm-Cancel）模式实现。

**【故障现象】**

- Try阶段部分服务成功，部分失败，需要回滚已成功的服务

- Confirm/Cancel阶段网络超时，需要重试保证最终一致

- 空回滚、幂等、悬挂等TCC特有的问题

**【解决方案】**

**▶ 中级回答**

TCC的三个阶段与核心问题：

TCC（Try-Confirm-Cancel）流程：

Try阶段（资源预留/冻结）：
```text
事务发起者 ──Try──▶ 库存服务：冻结库存（stock - x, frozen + x）
──Try──▶ 订单服务：创建订单（状态=待确认）
──Try──▶ 账户服务：冻结余额（balance - x, frozen + x）

如果全部Try成功 → 进入Confirm阶段
如果有一个Try失败 → 进入Cancel阶段
```

Confirm阶段（确认提交）：
```text
事务发起者 ──Confirm──▶ 库存服务：扣减冻结库存（frozen - x）
──Confirm──▶ 订单服务：更新订单状态（状态=已确认）
──Confirm──▶ 账户服务：扣减冻结余额（frozen - x）
```

Cancel阶段（取消回滚）：
```text
事务发起者 ──Cancel──▶ 库存服务：释放冻结库存（stock + x, frozen - x）
──Cancel──▶ 订单服务：取消订单（状态=已取消）
──Cancel──▶ 账户服务：释放冻结余额（balance + x, frozen - x）
```

TCC vs 2PC：
- 2PC是资源层（数据库）的协议，对业务无侵入
- TCC是业务层的协议，需要每个服务实现Try/Confirm/Cancel三个接口
- TCC不锁定资源（Try只是预留），并发度更高
- TCC需要业务保证幂等、空回滚、防悬挂

// TCC接口定义
~~~java
public interface InventoryTccService {
    // Try：冻结库存
    @TwoPhaseBusinessAction(name = "inventoryTcc", commitMethod = "confirm", rollbackMethod = "cancel")
    boolean tryFreeze(@BusinessActionContextParameter(paramName = "productId") Long productId,
    @BusinessActionContextParameter(paramName = "count") Integer count);

    // Confirm：确认扣减
    boolean confirm(BusinessActionContext context);

    // Cancel：释放冻结
    boolean cancel(BusinessActionContext context);
}

// 实现类
@Service
public class InventoryTccServiceImpl implements InventoryTccService {
    @Autowired
    private InventoryMapper inventoryMapper;

    @Override
    public boolean tryFreeze(Long productId, Integer count) {
        // 幂等检查：防止重复Try
        if (tccLogService.exists(productId, "TRY")) return true;

        // 冻结库存：stock - count, frozen + count
        int rows = inventoryMapper.freeze(productId, count);
        if (rows == 0) throw new RuntimeException("库存不足");

        // 记录Try日志（用于幂等和空回滚判断）
        tccLogService.save(productId, "TRY", "SUCCESS");
        return true;
    }

    @Override
    public boolean confirm(BusinessActionContext context) {
        Long productId = (Long) context.getActionContext("productId");
        Integer count = (Integer) context.getActionContext("count");

        // 幂等检查
        if (tccLogService.exists(productId, "CONFIRM")) return true;

        // 扣减冻结库存：frozen - count
        inventoryMapper.confirmFreeze(productId, count);
        tccLogService.save(productId, "CONFIRM", "SUCCESS");
        return true;
    }

    @Override
    public boolean cancel(BusinessActionContext context) {
        Long productId = (Long) context.getActionContext("productId");
        Integer count = (Integer) context.getActionContext("count");

        // 空回滚处理：Try没执行就收到Cancel（网络超时导致Try没到达）
        if (!tccLogService.exists(productId, "TRY")) {
            tccLogService.save(productId, "CANCEL", "EMPTY_ROLLBACK");
            return true;  // 直接返回成功，不执行实际回滚
        }

        // 幂等检查
        if (tccLogService.exists(productId, "CANCEL")) return true;

        // 释放冻结库存：stock + count, frozen - count
        inventoryMapper.cancelFreeze(productId, count);
        tccLogService.save(productId, "CANCEL", "SUCCESS");
        return true;
    }
}
~~~

**▶ 资深回答**

TCC的三大核心问题与Seata TCC实现：

**【TCC三大核心问题】**

1. 幂等性（Idempotency）
问题：Confirm/Cancel可能因网络超时被重复调用
解决：用事务日志表记录每个分支事务的状态，执行前检查状态
表结构：t_tcc_log(xid, branch_id, action_type, status, create_time)

2. 空回滚（Empty Rollback）
问题：Try请求因网络超时未到达服务，但全局事务回滚调用了Cancel
现象：Cancel要回滚一个从未执行过的Try
解决：Cancel执行前检查是否有Try记录，没有则直接返回成功（空回滚）

3. 防悬挂（Suspension）
问题：Cancel先于Try到达（网络延迟），Cancel执行空回滚后，
Try才到达并执行资源预留，导致资源被冻结但永远不会被Confirm/Cancel
解决：Try执行前检查是否有Cancel记录（包括空回滚），有则不执行Try

时序图（悬挂问题）：
发起者                    参与者
```text
│                         │
│──── Try（网络延迟）─────▶│  （未到达）
│  超时，决定回滚          │
│──── Cancel ────────────▶│  空回滚（无Try记录），记录CANCEL
│                         │
│  Try终于到达 ──────────▶│  执行Try，冻结资源！
│                         │  （但事务已结束，资源永远冻结 → 悬挂！）
```

解决：Try执行前检查是否有CANCEL记录，有则不执行

**【Seata TCC模式架构】**

Seata（Simple Extensible Autonomous Transaction Architecture）架构：

```text
┌──────────────────────────────────────────────────────────────┐
│                      TC (Transaction Coordinator)            │
│              事务协调者（独立部署，维护全局事务状态）               │
└────────────────────────────┬─────────────────────────────────┘
│
┌────────────────────────────┼─────────────────────────────────┐
│                            │                                 │
▼                            ▼                                 ▼
┌────────────────┐    ┌──────────────┐               ┌──────────────┐
│  TM (事务管理器) │    │  RM (资源管理器)│              │ RM (资源管理器)│
│  事务发起方      │    │  库存服务       │              │  订单服务      │
│  @GlobalTrans- │    │  TCC接口实现   │               │  TCC接口实现   │
│  actional      │    │              │                │              │
└────────────────┘    └──────────────┘                └──────────────┘
```

TCC模式执行流程：
1. TM向TC注册全局事务，获取XID
2. TM调用各RM的Try方法（携带XID）
3. 各RM向TC注册分支事务
```text
4. Try全部成功 → TM通知TC全局提交 → TC通知各RM执行Confirm
Try有失败 → TM通知TC全局回滚 → TC通知各RM执行Cancel
5. RM的Confirm/Cancel失败 → TC定时重试（保证最终一致）
```

Seata的四种模式：
- AT模式：自动代理SQL，生成undo日志，对业务无侵入（最常用）
- TCC模式：业务实现Try/Confirm/Cancel，灵活但侵入性强
- SAGA模式：长事务，正向流程+补偿流程
- XA模式：基于XA协议的强一致事务

// Seata TCC使用示例
~~~java
@Service
public class OrderTccServiceImpl implements OrderTccService {
    @Autowired
    private OrderMapper orderMapper;

    @TwoPhaseBusinessAction(name = "orderTcc", commitMethod = "commit", rollbackMethod = "rollback")
    @Override
    public boolean prepareCreateOrder(
    @BusinessActionContextParameter(paramName = "orderNo") String orderNo,
    @BusinessActionContextParameter(paramName = "userId") Long userId,
    @BusinessActionContextParameter(paramName = "amount") BigDecimal amount) {
        // Try：创建待确认订单
        Order order = new Order();
        order.setOrderNo(orderNo);
        order.setUserId(userId);
        order.setAmount(amount);
        order.setStatus("PENDING");  // 待确认状态
        orderMapper.insert(order);
        return true;
    }

    @Override
    public boolean commit(BusinessActionContext context) {
        String orderNo = context.getActionContext("orderNo").toString();
        // Confirm：更新订单为已确认
        orderMapper.updateStatus(orderNo, "CONFIRMED");
        return true;
    }

    @Override
    public boolean rollback(BusinessActionContext context) {
        String orderNo = context.getActionContext("orderNo").toString();
        // Cancel：更新订单为已取消（或删除）
        orderMapper.updateStatus(orderNo, "CANCELLED");
        return true;
    }
}

// 全局事务发起方
@Service
public class OrderService {
    @Autowired
    private InventoryTccService inventoryTccService;
    @Autowired
    private OrderTccService orderTccService;
    @Autowired
    private AccountTccService accountTccService;

    @GlobalTransactional(rollbackFor = Exception.class)  // 全局事务
    public void createOrder(String orderNo, Long userId, Long productId,
    Integer count, BigDecimal amount) {
        // Try阶段：依次调用各服务的Try
        inventoryTccService.tryFreeze(productId, count);
        accountTccService.tryFreeze(userId, amount);
        orderTccService.prepareCreateOrder(orderNo, userId, amount);
        // 全部成功后，Seata TC自动调用各服务的Confirm
        // 有异常则自动调用各服务的Cancel
    }
}
~~~

**【底层原理】**

**1. TCC与2PC的本质区别**

- 2PC是资源层协议（数据库XA），锁定数据库资源，业务无感知

- TCC是业务层协议，不锁定数据库资源（Try只是预留），业务需实现三个接口

- 2PC的回滚由数据库保证（undo日志），TCC的回滚由业务代码实现（Cancel）

- TCC的并发度远高于2PC，因为Try阶段不锁定行锁

**2. Seata的事务日志与恢复**

TC（事务协调者）维护全局事务和分支事务的状态，存储在数据库或Redis中。如果Confirm/Cancel失败，TC会定时重试（默认5秒一次，无限重试直到成功）。这保证了最终一致性，但需要业务保证幂等性。TC本身需要高可用部署（集群模式）。

**【面试官追问预判】**

- Q: TCC和Seata AT模式怎么选？

A: AT模式对业务无侵入（自动生成undo日志），适合大多数场景，但有全局锁（写隔离），高并发写场景性能差。TCC模式需要业务实现三个接口，侵入性强，但没有全局锁，并发度高，适合高并发核心链路。简单说：能AT就AT，AT满足不了性能才用TCC。

- Q: TCC的Try阶段如果数据库宕机怎么办？

A: Try失败会触发全局回滚，调用所有已成功Try的服务的Cancel。如果Try请求没到达（网络超时），会出现空回滚，需要业务处理。如果Try执行了但响应丢失，发起者认为失败调用Cancel，参与者需要幂等处理。所以TCC的三大问题（幂等、空回滚、防悬挂）必须处理好。

- Q: 如何设计TCC的资源预留？

A: 通常用"冻结字段"实现：库存表增加frozen_count字段，Try时stock-count, frozen+count；Confirm时frozen-count；Cancel时stock+count, frozen-count。也可以用独立的冻结表记录。关键是Try不能直接扣减（否则Cancel无法恢复），必须预留资源，Confirm才真正扣减。



## **6.3 SAGA长事务模式与状态机引擎**

**【场景描述】**复杂业务流程（如电商下单：创建订单→扣库存→扣余额→创建物流单→发送通知），涉及多个服务，流程长，TCC实现过于复杂。使用SAGA模式，每个步骤都有对应的补偿操作。

**【故障现象】**

- 长流程中某一步失败，需要按相反顺序补偿已完成的步骤

- 补偿操作也可能失败，需要重试

- 流程状态需要持久化，支持宕机恢复

**【解决方案】**

**▶ 中级回答**

SAGA的两种执行方式：

SAGA模式：
将长事务T拆分为 T1, T2, ..., Tn 多个本地事务
每个Ti有对应的补偿操作Ci

正向执行：T1 → T2 → ... → Tn（全部成功则事务完成）
失败补偿：假设T3失败 → C2 → C1（按相反顺序补偿）

SAGA的两种协调方式：

1. 编排式（Choreography）：
各服务通过事件驱动，没有中心协调者
订单服务 ──订单创建事件──▶ 库存服务 ──库存扣减事件──▶ 支付服务 ...
某步失败 ──补偿事件──▶ 前序服务执行补偿
优点：无中心节点，松耦合
缺点：流程分散，难以追踪，循环依赖风险

2. 协调式（Orchestration）：
有中心协调者（SAGA执行器），按定义的流程调用各服务
```text
┌──────────────┐
│ SAGA协调者    │
│  状态机引擎   │
└──────┬───────┘
│ 调用T1
▼
订单服务 ──成功──▶ 协调者 ──调用T2──▶ 库存服务 ...
│ 失败
▼
协调者 ──调用C1──▶ 订单服务（补偿）
```
优点：流程集中，易于监控和重试
缺点：协调者单点（需高可用）

// SAGA状态机定义（基于状态机引擎）
~~~java
public class OrderSagaDefinition {
    public static SagaDefinition build() {
        return SagaDefinitionBuilder()
        .step("createOrder")
        .withCompensation("cancelOrder")
        .step("reserveInventory")
        .withCompensation("releaseInventory")
        .step("chargePayment")
        .withCompensation("refundPayment")
        .step("createShipment")
        .withCompensation("cancelShipment")
        .build();
    }
}

// 每个步骤的实现
@Service
public class OrderSagaSteps {
    @Autowired
    private OrderService orderService;
    @Autowired
    private InventoryService inventoryService;
    @Autowired
    private PaymentService paymentService;

    // T1：创建订单
    @SagaStep(action = "createOrder", compensation = "cancelOrder")
    public void createOrder(SagaContext context) {
        Order order = orderService.create(context.getOrderRequest());
        context.setOrderId(order.getId());
    }
    // C1：取消订单（补偿）
    public void cancelOrder(SagaContext context) {
        orderService.cancel(context.getOrderId());
    }

    // T2：预留库存
    @SagaStep(action = "reserveInventory", compensation = "releaseInventory")
    public void reserveInventory(SagaContext context) {
        inventoryService.reserve(context.getProductId(), context.getCount());
    }
    // C2：释放库存
    public void releaseInventory(SagaContext context) {
        inventoryService.release(context.getProductId(), context.getCount());
    }

    // T3：扣款
    @SagaStep(action = "chargePayment", compensation = "refundPayment")
    public void chargePayment(SagaContext context) {
        paymentService.charge(context.getUserId(), context.getAmount());
    }
    // C3：退款
    public void refundPayment(SagaContext context) {
        paymentService.refund(context.getUserId(), context.getAmount());
    }
}
~~~

**▶ 资深回答**

SAGA的隔离性问题与状态机引擎实现：

**【SAGA的隔离性问题（I缺失）】**

SAGA不满足ACID中的I（隔离性），因为各步骤是独立提交的本地事务，
中间状态对其他事务可见。可能导致的问题：

1. 脏读（Lost Updates）：
SAGA1：T1创建订单（未支付）→ T2扣库存
SAGA2：读取订单状态=未支付 → 取消订单（但SAGA1正在支付中）
结果：SAGA1支付成功，但订单被SAGA2取消

2. 脏写（Dirty Writes）：
SAGA1：T1更新余额-100 → T2更新积分+10
SAGA2：在T1和T2之间读取余额，基于旧余额计算
结果：SAGA2的计算基于不一致的数据

解决方案：
1. 语义锁（Semantic Lock）：在Try阶段设置"处理中"状态，其他事务看到此状态则等待或拒绝
例：订单状态=PENDING_PAYMENT，其他事务不能取消
2. 可交换更新（Commutative Updates）：设计补偿操作与正向操作可交换顺序
例：加积分和减积分，无论顺序如何最终结果一致
3. 悲观视图（Pessimistic View）：在读取时检查是否有进行中的SAGA，有则拒绝
4. 重新读取（Reread）：更新前重新读取数据，检查是否被其他SAGA修改
5. 版本号（Version File）：数据带版本号，更新时检查版本

**【SAGA状态机引擎核心设计】**

// SAGA状态机核心表设计
~~~sql
CREATE TABLE saga_instance (
id BIGINT PRIMARY KEY AUTO_INCREMENT,
saga_id VARCHAR(64) NOT NULL COMMENT '全局SAGA ID',
saga_type VARCHAR(64) NOT NULL COMMENT 'SAGA类型',
status VARCHAR(20) NOT NULL COMMENT 'RUNNING/COMPENSATING/COMPLETED/FAILED',
current_step INT DEFAULT 0 COMMENT '当前执行到第几步',
context JSON COMMENT 'SAGA上下文（参数传递）',
retry_count INT DEFAULT 0 COMMENT '重试次数',
create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
UNIQUE KEY uk_saga_id (saga_id)
);

CREATE TABLE saga_step_log (
id BIGINT PRIMARY KEY AUTO_INCREMENT,
saga_id VARCHAR(64) NOT NULL,
step_name VARCHAR(64) NOT NULL,
step_type VARCHAR(20) NOT NULL COMMENT 'FORWARD/COMPENSATION',
status VARCHAR(20) NOT NULL COMMENT 'SUCCESS/FAILED/PENDING',
request JSON COMMENT '请求参数',
response JSON COMMENT '响应结果',
execute_time DATETIME,
KEY idx_saga_id (saga_id)
);
~~~

~~~java
// SAGA执行器核心逻辑
public class SagaExecutor {
    @Autowired
    private SagaInstanceMapper instanceMapper;
    @Autowired
    private SagaStepLogMapper stepLogMapper;

    public void execute(String sagaId, SagaDefinition definition, SagaContext context) {
        // 1. 创建SAGA实例（持久化，支持宕机恢复）
        SagaInstance instance = new SagaInstance(sagaId, definition.getType(), context);
        instanceMapper.insert(instance);

        // 2. 正向执行
        for (int i = 0; i < definition.getSteps().size(); i++) {
            SagaStep step = definition.getSteps().get(i);
            try {
                // 执行正向操作
                step.getAction().execute(context);
                // 记录步骤日志
                stepLogMapper.insert(new SagaStepLog(sagaId, step.getName(), "FORWARD", "SUCCESS"));
                instance.setCurrentStep(i + 1);
                instanceMapper.update(instance);
            } catch (Exception e) {
            log.error("步骤{}执行失败，开始补偿", step.getName(), e);
            stepLogMapper.insert(new SagaStepLog(sagaId, step.getName(), "FORWARD", "FAILED"));
            // 3. 补偿执行（按相反顺序）
            compensate(sagaId, definition, context, i);
            instance.setStatus("COMPENSATING");
            instanceMapper.update(instance);
            return;
        }
    }
    // 全部成功
    instance.setStatus("COMPLETED");
    instanceMapper.update(instance);
}

private void compensate(String sagaId, SagaDefinition definition, SagaContext context, int failedStep) {
    // 从失败步骤的前一步开始，按相反顺序补偿
    for (int i = failedStep - 1; i >= 0; i--) {
        SagaStep step = definition.getSteps().get(i);
        int retry = 0;
        while (retry < 3) {  // 补偿失败重试3次
            try {
                step.getCompensation().execute(context);
                stepLogMapper.insert(new SagaStepLog(sagaId, step.getName(), "COMPENSATION", "SUCCESS"));
                break;
            } catch (Exception e) {
            retry++;
            if (retry >= 3) {
                // 补偿失败：记录，人工介入或定时任务重试
                stepLogMapper.insert(new SagaStepLog(sagaId, step.getName(), "COMPENSATION", "FAILED"));
                // 发送告警
                alertService.sendAlert("SAGA补偿失败", sagaId, step.getName());
            }
        }
    }
}
}

// 定时任务：恢复宕机时未完成的SAGA
@Scheduled(fixedRate = 30000)
public void recoverRunningSagas() {
    List<SagaInstance> runningInstances = instanceMapper.selectByStatus("RUNNING");
    for (SagaInstance instance : runningInstances) {
        // 从currentStep继续执行
        executeFromStep(instance.getSagaId(), instance.getCurrentStep());
    }
    List<SagaInstance> compensatingInstances = instanceMapper.selectByStatus("COMPENSATING");
    for (SagaInstance instance : compensatingInstances) {
        // 继续补偿
        continueCompensation(instance.getSagaId());
    }
}
}
~~~

**【TCC vs SAGA vs 本地消息表 选型】**

```text
┌──────────────┬──────────────┬──────────────┬──────────────────┐
│   方案        │  一致性       │  性能         │  适用场景         │
├──────────────┼──────────────┼──────────────┼──────────────────┤
│ 2PC/XA       │  强一致       │  差（同步阻塞）│  金融核心、跨库    │
│ TCC          │  最终一致     │  好（无锁）    │  高并发、资源预留  │
│ SAGA         │  最终一致     │  好           │  长流程、多步骤    │
│ 本地消息表    │  最终一致     │  最好         │  异步、对实时性要求低│
└──────────────┴──────────────┴──────────────┴──────────────────┘
```

选型原则：
1. 能不用分布式事务就不用（通过业务设计避免）
2. 能异步就用本地消息表（性能最好）
3. 需要同步确认的短流程用TCC
4. 长流程、多步骤用SAGA
5. 强一致要求且性能要求不高用XA

**【底层原理】**

**1. SAGA的补偿事务设计原则**

- 补偿操作必须幂等（可能被重试多次）

- 补偿操作不能失败（如果失败需要人工介入或无限重试）

- 补偿操作应与正向操作语义相反（正向扣减→补偿加回）

- 补偿操作不需要还原到完全相同的状态（可以是语义上的补偿，如退款而非撤销支付）

**2. 状态机引擎的核心**

SAGA本质上是一个有限状态机（FSM）。每个SAGA实例有明确的状态（运行中、补偿中、已完成、失败），每个步骤也有状态。状态转换由事件驱动（步骤成功/失败）。状态机引擎负责：①持久化状态（支持宕机恢复）；②按定义的流程执行；③失败时触发补偿；④重试失败的步骤；⑤监控和告警。常见的状态机引擎：Seata SAGA、Netflix Conductor、Camunda。

**【面试官追问预判】**

- Q: SAGA和TCC的区别？

A: ①TCC有Try阶段（资源预留），SAGA没有Try，直接执行正向操作；②TCC的Cancel是回滚Try的预留，SAGA的补偿是回滚已提交的本地事务；③TCC适合短流程（2-3个服务），SAGA适合长流程（多个步骤）；④TCC的隔离性比SAGA好（Try预留资源期间其他事务看到"处理中"状态）；⑤SAGA的实现比TCC简单（不需要Try接口，只需要正向+补偿）。

- Q: SAGA的补偿操作失败怎么办？

A: 补偿失败必须重试（指数退避），直到成功。如果持续失败，需要人工介入。所以补偿操作的设计要尽量简单、幂等、不易失败。另外，可以设计"补偿的补偿"——但这会无限循环，所以实际中都是无限重试+人工告警。生产环境中，SAGA失败的实例需要有运营后台可以手动触发重试或跳过。

- Q: SAGA如何处理并发冲突？

A: SAGA没有隔离性，中间状态可见。解决方案：①语义锁（设置"处理中"状态）；②乐观锁（版本号）；③业务层面设计（如订单创建后不允许修改金额）。大多数互联网业务能容忍短暂的中间状态，通过业务设计规避并发冲突。



## **6.4 本地消息表+MQ最终一致性方案**

**【场景描述】**用户注册后需要发送欢迎邮件、初始化积分、创建用户画像，这些操作不需要同步完成。使用本地消息表+MQ实现最终一致性，保证用户注册成功后这些异步操作最终都能执行。

**【故障现象】**

- 用户注册成功但MQ发送失败，后续操作未执行

- MQ消费失败，消息丢失或重复消费

- 消息表积压，定时任务未及时处理

**【解决方案】**

**▶ 中级回答**

本地消息表的完整流程：

本地消息表+MQ最终一致性流程：

1. 业务操作 + 写消息表（同一个本地事务）
~~~sql
BEGIN;
INSERT INTO user(...) VALUES(...);           -- 业务操作
INSERT INTO msg_local(msg_id, content, status)  -- 写消息表
VALUES('uuid', '{"userId":123}', 'PENDING');
COMMIT;
（原子性：要么都成功，要么都失败）
~~~
2. 定时任务扫描消息表，发送MQ
~~~java
@Scheduled(fixedRate = 5000)
SELECT * FROM msg_local WHERE status='PENDING' LIMIT 100;
for each msg:
try {
    mq.send(msg.content);
    UPDATE msg_local SET status='SENT' WHERE msg_id=?;
} catch (Exception e) {
// 发送失败，下次重试（可增加重试次数）
UPDATE msg_local SET retry_count=retry_count+1 WHERE msg_id=?;
}
~~~
3. MQ消费端（幂等处理）
~~~java
@RabbitListener(queues = "user.register")
public void onMessage(String msg) {
    UserRegisterEvent event = parse(msg);
    // 幂等检查：根据msg_id判断是否已处理
    if (msgLogService.exists(event.getMsgId())) return;
    try {
        // 执行业务（发邮件、初始化积分等）
        emailService.sendWelcome(event.getUserId());
        pointService.init(event.getUserId());
        msgLogService.save(event.getMsgId(), "SUCCESS");
    } catch (Exception e) {
    // 消费失败，抛出异常触发MQ重试（或记录失败表）
    throw new AmqpRejectAndDontRequeueException("处理失败", e);
}
}
~~~
4. 消费端失败处理
- MQ自动重试（如RabbitMQ的重试机制）
- 重试多次失败 → 死信队列（DLX）
- 定时任务扫描死信队列，人工处理或自动重试

~~~sql
-- 本地消息表设计
CREATE TABLE msg_local (
id BIGINT PRIMARY KEY AUTO_INCREMENT,
msg_id VARCHAR(64) NOT NULL COMMENT '消息唯一ID',
topic VARCHAR(64) NOT NULL COMMENT 'MQ主题',
content TEXT NOT NULL COMMENT '消息内容(JSON)',
status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/SENT/FAILED',
retry_count INT DEFAULT 0 COMMENT '重试次数',
next_retry_time DATETIME COMMENT '下次重试时间（指数退避）',
create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
UNIQUE KEY uk_msg_id (msg_id),
KEY idx_status_next_retry (status, next_retry_time)
);

-- 消费端幂等表
CREATE TABLE msg_consume_log (
id BIGINT PRIMARY KEY AUTO_INCREMENT,
msg_id VARCHAR(64) NOT NULL,
status VARCHAR(20) NOT NULL COMMENT 'SUCCESS/FAILED',
create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
UNIQUE KEY uk_msg_id (msg_id)
);
~~~

**▶ 资深回答**

本地消息表的优化与事务消息对比：

**【本地消息表的优化方案】**

~~~java

// 1. 定时任务优化：多实例并发处理（避免重复发送）
@Scheduled(fixedRate = 5000)
public void sendPendingMessages() {
    // 抢占式锁：只允许一个实例处理一批消息
    List<MsgLocal> messages = msgMapper.selectPending(100);
    for (MsgLocal msg : messages) {
        // CAS更新状态为SENDING，防止多实例重复发送
        int updated = msgMapper.updateStatusIfPending(msg.getMsgId(), "SENDING");
        if (updated == 0) continue;  // 被其他实例抢占
        try {
            mq.send(msg.getTopic(), msg.getContent());
            msgMapper.updateStatus(msg.getMsgId(), "SENT");
        } catch (Exception e) {
        // 指数退避：1s, 2s, 4s, 8s, ...
        int delay = (int) Math.pow(2, Math.min(msg.getRetryCount(), 5));
        msgMapper.updateStatusWithRetry(msg.getMsgId(), "PENDING",
        msg.getRetryCount() + 1, LocalDateTime.now().plusSeconds(delay));
    }
}
}

// 2. 直接发送+定时补偿（减少延迟）
public void registerUser(UserRequest request) {
    String msgId = UUID.randomUUID().toString();
    // 1. 业务+消息表（本地事务）
    userService.registerWithMsg(request, msgId);
    // 2. 立即尝试发送MQ（减少延迟，不用等定时任务）
    try {
        mq.send("user.register", buildMsg(request, msgId));
        msgMapper.updateStatus(msgId, "SENT");
    } catch (Exception e) {
    // 发送失败没关系，定时任务会兜底
    log.warn("MQ发送失败，等待定时任务重试，msgId={}", msgId);
}
}

// 3. 消息表清理（避免数据膨胀）
@Scheduled(cron = "0 0 2 * * ?")  // 每天凌晨2点
public void cleanSentMessages() {
    // 删除7天前已发送的消息
    msgMapper.deleteSentBefore(LocalDateTime.now().minusDays(7));
}

// 4. 监控告警
@Scheduled(fixedRate = 60000)
public void monitorMessageBacklog() {
    long pendingCount = msgMapper.countByStatus("PENDING");
    if (pendingCount > 1000) {
        alertService.sendAlert("消息表积压", "待发送消息数：" + pendingCount);
    }
    long failedCount = msgMapper.countByStatus("FAILED");
    if (failedCount > 0) {
        alertService.sendAlert("消息发送失败", "失败消息数：" + failedCount);
    }
}
~~~

**【本地消息表 vs RocketMQ事务消息】**

RocketMQ事务消息流程（半消息机制）：
1. 发送半消息（Half Message）到MQ （半消息对消费者不可见）
2. MQ返回半消息发送成功
3. 执行本地事务（业务操作）
4. 根据本地事务结果，向MQ发送Commit或Rollback
- Commit：半消息变为可消费
- Rollback：半消息被删除
5. 如果MQ长时间没收到Commit/Rollback，回调生产者检查本地事务状态
（事务回查机制）

对比：
```text
┌──────────────────┬──────────────────────┬──────────────────────┐
│   特性            │  本地消息表            │  RocketMQ事务消息      │
├──────────────────┼──────────────────────┼──────────────────────┤
│ 实现方式          │ 业务表+消息表本地事务  │ 半消息+事务回查        │
│ 对MQ依赖          │ 任何MQ都可以          │ 必须用RocketMQ         │
│ 消息存储          │ 业务数据库            │ MQ Broker              │
│ 定时任务          │ 需要（扫描发送）       │ 不需要（MQ主动回查）    │
│ 性能              │ 好（本地事务）         │ 好（半消息）           │
│ 运维成本          │ 低（只需维护表）       │ 中（需RocketMQ集群）   │
│ 适用场景          │ 通用方案              │ 已使用RocketMQ的项目   │
└──────────────────┴──────────────────────┴──────────────────────┘
```

注意：RocketMQ事务消息也不是100%可靠，极端情况下（Broker宕机+生产者宕机）
可能需要人工处理。本地消息表更通用，不依赖特定MQ。

**【消费端幂等的三种实现方式】**

~~~java
// 方式1：唯一ID+数据库唯一索引（最常用）
public void onMessage(String msgId, String content) {
    try {
        // 插入消费记录，唯一索引保证不重复
        msgConsumeLogMapper.insert(new MsgConsumeLog(msgId, "SUCCESS"));
    } catch (DuplicateKeyException e) {
    return;  // 重复消息，直接返回
}
// 执行业务
process(content);
}

// 方式2：Redis SETNX
public void onMessage(String msgId, String content) {
    Boolean firstTime = redisTemplate.opsForValue()
    .setIfAbsent("msg:consume:" + msgId, "1", 24, TimeUnit.HOURS);
    if (Boolean.FALSE.equals(firstTime)) return;  // 重复消息
    process(content);
}

// 方式3：业务状态机（天然幂等）
// 例：订单状态只能从 PENDING → PAID → SHIPPED → COMPLETED
// 重复收到"支付成功"消息，订单已经是PAID，更新影响行数=0，直接返回
public void handlePaymentSuccess(String orderNo) {
    int rows = orderMapper.updateStatusIf(orderNo, "PAID", "PENDING");
    if (rows == 0) return;  // 状态不匹配，可能是重复消息
    // 后续逻辑
}
~~~

**【底层原理】**

**1. 本地消息表的核心思想**

利用本地事务的原子性，将"业务操作"和"写消息"绑定在一起。因为两者在同一个数据库的同一个事务中，所以要么都成功，要么都失败。这就解决了"业务成功但消息没发出去"或"消息发了但业务失败"的问题。然后通过定时任务保证消息最终被发送到MQ，消费端通过幂等保证不重复处理。

**2. 消息投递的三种语义**

- At most once（最多一次）：消息可能丢失，但不会重复（发送方不重试）

- At least once（至少一次）：消息不会丢失，但可能重复（发送方重试+消费端幂等）

- Exactly once（恰好一次）：消息不丢失不重复（最难，需要业务和MQ配合）

本地消息表+MQ实现的是"至少一次"语义，通过消费端幂等达到"恰好一次"的效果。大多数分布式系统都是At least once + 幂等 = 业务上的Exactly once。

**【面试官追问预判】**

- Q: 本地消息表和MQ事务消息怎么选？

A: 如果已经在用RocketMQ，用事务消息更简洁（不需要维护消息表和定时任务）。如果用RabbitMQ/Kafka等不支持事务消息的MQ，用本地消息表。另外，本地消息表的消息存在业务库，可以方便地查询和管理消息状态，而事务消息的状态在MQ中，查询不太方便。大多数互联网公司用本地消息表方案。

- Q: 消费端幂等有哪些方案？各有什么优缺点？

A: ①数据库唯一索引：可靠，但需要建表，有DB开销；②Redis SETNX：性能好，但Redis宕机可能丢失幂等记录（需持久化）；③业务状态机：天然幂等，不需要额外存储，但不是所有业务都有明确状态流转；④乐观锁版本号：适合更新操作。生产中常用数据库唯一索引（最可靠）或业务状态机。

- Q: 定时任务扫描消息表会不会有性能问题？

A: ①加索引（status+next_retry_time）；②分页批量处理（每次100条）；③多实例时用分布式锁或CAS抢占避免重复；④正常情况下消息很快被发送，表中PENDING状态数据很少。如果消息量极大，可以用ShardingJDBC分表，或改用MQ事务消息。另外，可以用"立即发送+定时补偿"的方式，大多数消息立即发送，定时任务只处理失败的。

---

# **附录：面试答题技巧与准备建议**

## **一、答题框架（STAR + 原理深挖）**

- S(Situation)：场景背景，什么业务、什么量级

- T(Task)：遇到什么问题，故障现象是什么

- A(Action)：如何排查、用了什么工具、解决方案是什么

- R(Result)：最终效果，数据对比（如RT从5s降到100ms）

- 原理深挖：面试官追问时，能从应用层→框架层→JVM层→OS层→硬件层逐步深入

## **二、高频追问方向预判**

- JVM：GC Roots有哪些？安全点是什么？ZGC的着色指针原理？

- 并发：AQS的实现原理？volatile的内存屏障？ThreadLocal内存泄漏？

- MySQL：B+树为什么不用B树？MVCC的实现？间隙锁和Next-Key Lock？

- Redis：单线程为什么快？持久化RDB/AOF？集群槽位分配？

- Spring：BeanPostProcessor执行顺序？AOP代理创建时机？事务传播行为？

- 分布式：CAP/BASE？一致性哈希？分布式ID生成方案？

## **三、准备建议**

- 每个场景准备一个自己参与过的真实项目案例（比背理论更有说服力）

- 默写核心ASCII图（B+树、三级缓存、线程池流程、2PC/TCC流程）

- 整理生产级参数配置（JVM参数、MySQL参数、线程池参数）

- 准备3个以上的"踩坑经历"（排查过程+解决方案+效果）

- 关注新技术：ZGC、虚拟线程（Loom）、Spring Boot 3.x、Seata、PolarDB等

# jcmd 完整使用手册 + 高频面试题

## 一、jcmd 基础认知

### 1. 是什么

`jcmd` 是 JDK 自带的**全能 JVM 故障排查命令行工具**，JDK7 开始引入，替代了零散的 `jstack`、`jmap`、`jinfo`、`jstat`、`jhat`、
`jfr` 等工具，**一个命令搞定所有 JVM 运维排查**。
底层原理：Attach API 附加到目标 Java 进程，发送指令执行对应操作。

### 2. 前置条件

1. JDK 环境（不要只用 JRE，没有 jcmd）
2. 执行用户和 Java 进程**同一个操作系统用户**（权限问题最常见坑）
3. 目标 JVM 开启 Attach 机制（默认开启，除非参数禁用）

### 3. 基础语法

```
# 查看所有java进程（等同于jps）
jcmd

# 通用格式
jcmd <PID> <command> [参数]

# 查看某个进程支持的所有命令
jcmd <PID> help

# 查看某个具体命令的帮助
jcmd <PID> help <command_name>

# 远程JVM（极少用，一般本地排查）
jcmd <host>:<port> <command>
```

## 二、核心常用命令分类（实操版）

先获取 PID：直接敲 `jcmd` 列出所有 Java 进程，第一列就是 PID。

### 1. 进程基础信息（替代 jinfo）

#### （1）打印 JVM 启动参数

```
jcmd 1234 VM.command_line
```

输出：`-Xms` `-Xmx` `-XX` 系列参数、系统属性、classpath。

#### （2）打印 JVM 版本、系统属性、JDK 版本

```
# JVM版本
jcmd 1234 VM.version

# 系统属性（System.getProperties()）
jcmd 1234 VM.system_properties

# JVM flags（生效的XX参数）
jcmd 1234 VM.flags
# 包含默认值的所有参数
jcmd 1234 VM.flags -all
```

#### （3）动态修改 JVM 参数（运行时改，无需重启）

```
# 格式：jcmd PID VM.set_flag 参数名 值
jcmd 1234 VM.set_flag HeapDumpOnOutOfMemoryError true
```

>
> 注意：只有 **manageable** 类型的参数支持动态修改，面试高频考点。

### 2. 线程排查（替代 jstack）

#### （1）导出线程堆栈（最常用）

```
# 控制台直接输出
jcmd 1234 Thread.print

# 输出到文件（推荐）
jcmd 1234 Thread.print > thread.log
```

作用：排查死锁、死循环、CPU 飙升、阻塞、线程池耗尽。

#### （2）检测死锁（内置自动查找）

```
jcmd 1234 Thread.print -l
```

`-l` 会打印锁信息，自动汇总死锁线程块。

### 3. 内存排查（替代 jmap）

#### （1）查看堆整体概况

```
jcmd 1234 GC.heap_info
```

输出：新生代/老年代/元空间大小、使用率、GC 收集器类型、GC 次数耗时。

#### （2）生成堆 Dump 文件（OOM 必备）

```
# 完整堆dump（包含不可达对象）
jcmd 1234 GC.dump --live=true /tmp/heapdump.hprof

# 只dump存活对象
jcmd 1234 GC.dump /tmp/heap.hprof
```

文件后续用 MAT、JProfiler、VisualVM 分析内存泄漏。

#### （3）类统计、元空间信息

```
# 打印类加载统计（替代jmap -clstats）
jcmd 1234 GC.class_stats

# 元空间详细信息
jcmd 1234 VM.metaspace
```

### 4. GC 统计与执行 GC

```
# 手动触发Full GC（谨慎使用！生产别乱执行）
jcmd 1234 GC.run

# GC 汇总统计（GC次数、总耗时）
jcmd 1234 GC.stats
```

### 5. JFR 性能录制（重量级，生产性能分析）

JFR = Java Flight Recorder，Java 飞行记录仪，JDK11+ 开源，JDK8 商业版。

#### 简单录制示例

```
# 录制30秒，保存到文件
jcmd 1234 JFR.start duration=30s filename=app.jfr

# 查看正在录制的任务
jcmd 1234 JFR.check

# 手动停止录制
jcmd 1234 JFR.stop
```

录制后的 `.jfr` 文件用 `jfr` 命令解析或用 JDK Mission Control（JMC）可视化分析：CPU、内存、IO、锁、GC、方法调用耗时。

### 6. 其他实用命令

```
# 列出所有被加载的class
jcmd 1234 VM.class_hierarchy

# 打印NIO缓冲区、Direct Buffer内存
jcmd 1234 VM.native_memory summary

# 强制打印所有JVM日志
jcmd 1234 VM.log list
```

## 三、jcmd 与传统工具对比（面试必问）

| 传统工具          | jcmd 等价命令                           | 用途          |
|---------------|-------------------------------------|-------------|
| jps           | jcmd                                | 列出Java进程    |
| jstack PID    | jcmd PID Thread.print               | 线程栈、死锁      |
| jmap -heap    | jcmd PID GC.heap_info               | 堆内存概况       |
| jmap -dump    | jcmd PID GC.dump                    | 生成hprof堆快照  |
| jmap -clstats | jcmd PID GC.class_stats             | 类加载统计       |
| jinfo         | jcmd PID VM.flags / VM.command_line | JVM参数查看动态修改 |
| jstat         | jcmd PID GC.stats                   | GC统计        |
| jfr 独立命令      | jcmd PID JFR.*                      | 飞行录制        |

**核心优势一句话：**
jcmd 单一入口，减少记一堆工具命令的成本，Attach 机制统一，稳定性更好，支持动态改参数、JFR 录制等高级能力。

---

# 第二部分：jcmd 高频面试题（含标准答案）

## 1. 说说 jcmd 是什么，解决什么问题？

**答**
jcmd 是 JDK7 及以上自带的 JVM 诊断命令行工具，基于 Attach API 附加到运行中的 Java 进程。
它整合了 jps、jstack、jmap、jinfo、jfr 等多款工具的能力，用于线上无停机排查：线程死锁、CPU 过高、内存泄漏、GC
频繁、元空间溢出、方法耗时分析（JFR），还能动态修改部分 JVM 参数，是生产环境首选轻量级排查工具。

## 2. jcmd 执行报错无法 attach 进程，常见原因？

**答**

1. **操作系统用户不一致**：启动 Java 进程是 app 用户，执行 jcmd 是 root/其他用户，权限拒绝；
2. 使用了 JRE 而非完整 JDK，没有 jcmd 程序；
3. JVM 启动参数关闭了 Attach 机制（`-XX:+DisableAttachMechanism`）；
4. Linux 下 `/tmp` 目录清理导致 `.java_pidxxx` 套接字文件被删除；
5. 容器环境（Docker）PID 命名空间隔离，宿主机无法直接 attach 容器内进程，要进入容器内部执行。

## 3. jcmd 动态修改 JVM 参数有什么限制？

**答**

1. 只能修改被标记为 `manageable` 的参数；
2. 像 `-Xmx`、`-Xms` 堆内存大小这类**不可动态调整**，只能启动时指定；
3. 修改只对当前 JVM 进程生效，重启失效，如需永久生效要改启动脚本；
4. 生产慎用 GC.run 手动 Full GC，会触发 STW，影响业务吞吐量。

## 4. 排查线上 CPU 100% 飙升，用 jcmd 完整排查步骤？

**标准流程**

1. `top` 找到占用 CPU 最高的 Java 进程 PID；
2. `top -Hp PID` 找到消耗 CPU 的线程 TID（十进制）；
3. jcmd 导出线程栈：`jcmd PID Thread.print > thread.log`；
4. 将 TID 转成十六进制，在日志中搜索对应线程，定位死循环、无限递归、大量计算的代码；
5. 结合 GC.heap_info 看是否频繁 FullGC 导致 CPU 拉高。

## 5. OOM 内存泄漏如何用 jcmd 定位？

**步骤**

1. 先用 `jcmd PID GC.heap_info` 查看老年代、元空间占用，判断是堆溢出还是元空间溢出；
2. 执行堆快照导出：`jcmd PID GC.dump --live=true dump.hprof`；
3. 下载 hprof 文件，用 Eclipse MAT 分析：查找大对象、可疑集合、ThreadLocal 未释放、静态集合内存泄露、非堆 DirectBuffer 泄漏；
4. 辅助命令：`jcmd PID VM.metaspace` 排查类加载过多导致的元空间 OOM。

## 6. JFR 在 jcmd 中起到什么作用？适用什么场景？

**答**
JFR（Java飞行记录器）是低开销的性能剖析工具，jcmd 可以直接触发录制。
适用场景：

- 偶发的卡顿、GC 停顿、接口超时、锁竞争激烈；
- 长时间运行的性能瓶颈，需要看方法调用栈、IO、数据库、同步锁、GC 细节；
  优点：运行时开销极低（通常 <2%），可以长期后台录制，事后用 JMC 可视化分析。

## 7. Thread.print 加 `-l` 参数的意义？

**答**
`-l` 会额外打印**java.util.concurrent 锁的占用信息**，不仅仅是 synchronized 监视器锁，能完整检测 JUC
显式锁（ReentrantLock）造成的死锁，纯 jstack 默认对 AQS 锁展示不全。

## 8. jcmd GC.run 手动触发 Full GC 有什么风险？

**答**

1. 会触发全局 STW（Stop-The-World），所有业务线程暂停，高并发场景直接造成大量请求超时；
2. CMS/G1/ZGC 收集器一次 Full GC 耗时不可控；
3. 频繁手动 GC 会增加 GC 线程 CPU 消耗，加剧系统负载；
   **结论：生产环境禁止随意执行 GC.run。**

## 9. jcmd VM.native_memory 命令作用？

**答**
查看 JVM **本地内存（Native Memory）** 使用情况，用于排查堆外内存泄漏：

- Direct ByteBuffer 直接内存溢出；
- JNI 代码内存泄漏；
- 元空间、线程栈、JVM 内部开销占用过高。

## 10. jcmd 和 Arthas 定位怎么选？（延伸高频反问）

**对比回答**

1. **jcmd**：JDK 原生自带，无需引入任何依赖、无需启动 agent，零侵入，适合容器、受限环境、紧急故障兜底排查；缺点是交互弱，不能实时反编译类、在线热更新、方法耗时打点。
2. **Arthas**：阿里开源诊断工具，功能更强，在线监控方法耗时、反编译、动态改日志、热修复、追踪调用链；缺点需要上传 jar 包附加
   agent，部分严格安全环境不允许。
   **生产最佳实践**：常备 Arthas 做日常性能分析，jcmd 作为兜底应急方案。

---

# 四、生产环境排查万能脚本（可直接复制）

```
#!/bin/bash
PID=$1
if [ -z "$PID" ];then
  echo "Usage: sh jcmd_check.sh PID"
  exit 1
fi

# 1. 导出线程栈
jcmd $PID Thread.print -l > thread_dump_$(date +%Y%m%d_%H%M).log

# 2. GC堆信息
jcmd $PID GC.heap_info > gc_heap_info.log

# 3. JVM启动参数
jcmd $PID VM.command_line > jvm_args.log

# 4. 生效JVM参数
jcmd $PID VM.flags -all > jvm_flags.log

echo "排查文件已生成"
```
