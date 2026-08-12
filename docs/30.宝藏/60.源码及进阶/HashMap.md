# JDK8 HashMap 与 ConcurrentHashMap 完整源码深度解析 + 高频面试题大全

## 总前置基础

### 1. 核心底层通用概念（两者共用）

1. **哈希表本质**：数组+链表/红黑树的散列表，核心目标：**哈希寻址O(1)，解决哈希碰撞**
2. 哈希碰撞：不同key计算出相同hash值，JDK8用**链地址法**（链表挂载冲突元素）
3. 扰动函数（hash()）：高低位异或，减少低位哈希冲突，`h ^ (h >>> 16)`
4. 负载因子 loadFactor：默认0.75，阈值=容量*负载因子，达到阈值触发扩容resize
5. 桶（bucket）：数组table的每一个下标位置称为一个桶
6. 链表转红黑树条件：链表长度≥8 且 数组容量≥64；树退化为链表：红黑树节点≤6
7. 容量规则：table长度永远是**2的幂次**，通过`tab[i = (n - 1) & hash]`快速取模定位下标

---

# 第一部分 JDK8 HashMap 逐行源码完整解析

## 一、类定义与核心成员变量

```
public class HashMap<K,V> extends AbstractMap<K,V>
    implements Map<K,V>, Cloneable, Serializable {

    // 序列化版本号
    private static final long serialVersionUID = 362498820763181265L;

    // 默认初始容量 1<<4 = 16（必须2的幂）
    static final int DEFAULT_INITIAL_CAPACITY = 1 << 4;
    // 最大容量 2^30
    static final int MAXIMUM_CAPACITY = 1 << 30;
    // 默认负载因子 0.75
    static final float DEFAULT_LOAD_FACTOR = 0.75f;

    // 链表转红黑树阈值：链表长度>=8 转为红黑树
    static final int TREEIFY_THRESHOLD = 8;
    // 红黑树退链表阈值：树节点<=6 转回单向链表
    static final int UNTREEIFY_THRESHOLD = 6;
    // 链表转树的最小数组容量：数组小于64时只扩容不树化
    static final int MIN_TREEIFY_CAPACITY = 64;

    // 核心哈希桶数组，存储Node节点，首次使用懒加载初始化
    transient Node<K,V>[] table;
    // entrySet缓存
    transient Set<Map.Entry<K,V>> entrySet;
    // 当前存储键值对总数量
    transient int size;
    // 修改次数，用于快速失败fail-fast迭代器
    transient int modCount;
    // 扩容阈值，threshold = capacity * loadFactor
    int threshold;
    // 负载因子
    final float loadFactor;
}
```

### 变量重点解读

1. **table懒加载**：构造方法只赋值负载因子，不创建数组，第一次put才初始化，节省内存
2. **modCount**：迭代遍历过程中如果modCount被修改（新增/删除元素），迭代器抛出`ConcurrentModificationException`快速失败
3. **为什么负载因子0.75**：空间利用率与哈希碰撞概率的折中，0.5太浪费空间，1碰撞极多

## 二、内部节点结构

### 1. 普通链表节点 Node（单向链表）

```
static class Node<K,V> implements Map.Entry<K,V> {
    final int hash;        // key的哈希值
    final K key;
    V value;
    Node<K,V> next;        // 下一个节点指针

    Node(int hash, K key, V value, Node<K,V> next) {
        this.hash = hash;
        this.key = key;
        this.value = value;
        this.next = next;
    }
    // get/set/equals/hashCode 省略
}
```

### 2. 红黑树节点 TreeNode（继承LinkedHashMap.Entry）

```
static final class TreeNode<K,V> extends LinkedHashMap.Entry<K,V> {
    TreeNode<K,V> parent;  // 父节点
    TreeNode<K,V> left;    // 左子树
    TreeNode<K,V> right;   // 右子树
    TreeNode<K,V> prev;    // 双向链表前驱（树退化链表用）
    boolean red;           // 红黑树颜色标记

    TreeNode(int hash, K k, V v, Node<K,V> next) {
        super(hash, k, v, next);
    }
    // 红黑树插入、旋转、查找、删除、树化、解树化大量方法省略
}
```

>
> JDK8优化关键点：JDK7只有链表，JDK8冲突过长转为红黑树，查询复杂度从O(n)降到O(logn)

## 三、核心工具方法逐行解析

### 1. hash() 扰动函数（重中之重）

```
static final int hash(Object key) {
    int h;
    // 1. key为null，hash=0，固定放在table[0]桶
    // 2. key.hashCode() 无符号右移16位，和原hash异或
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

**作用拆解**

- 对象hashCode一般只高位有值，数组长度是2的幂，`(n-1)&hash`只取低位，高位直接浪费
- 右移16位把高位打散到低位，高低位混合参与寻址，大幅降低哈希碰撞概率
- null键合法，全部落在下标0位置

### 2. tableSizeFor() 保证容量为2的幂

```
static final int tableSizeFor(int cap) {
    int n = cap - 1;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    return (n < 0) ? 1 : (n >= MAXIMUM_CAPACITY) ? MAXIMUM_CAPACITY : n + 1;
}
```

逻辑：把传入数字最高位1后面全部填充为1，最后+1得到最近的2次幂
例：cap=17 → n=16 → 移位全1=31 → +1=32

## 四、构造方法解析（3个构造器）

```
// 1. 指定初始容量+负载因子
public HashMap(int initialCapacity, float loadFactor) {
    if (initialCapacity < 0)
        throw new IllegalArgumentException("Illegal initial capacity: " + initialCapacity);
    if (initialCapacity > MAXIMUM_CAPACITY)
        initialCapacity = MAXIMUM_CAPACITY;
    if (loadFactor <= 0 || Float.isNaN(loadFactor))
        throw new IllegalArgumentException("Illegal load factor: " + loadFactor);
    this.loadFactor = loadFactor;
    // 计算最近2次幂作为阈值，此时table还未创建
    this.threshold = tableSizeFor(initialCapacity);
}

// 2. 只指定初始容量，负载因子默认0.75
public HashMap(int initialCapacity) {
    this(initialCapacity, DEFAULT_LOAD_FACTOR);
}

// 3. 无参构造，全部默认
public HashMap() {
    this.loadFactor = DEFAULT_LOAD_FACTOR;
    // threshold初始为0，首次put再赋值
}
```

**核心：所有构造方法都不初始化table数组，懒加载，第一次put执行resize()创建数组**

## 五、最核心 put() 方法 & putVal() 逐行拆解

### 外层入口 put

```
public V put(K key, V value) {
    // 计算hash，调用内部putVal
    return putVal(hash(key), key, value, false, true);
}
```

### 底层核心 putVal 完整逻辑（注释逐行）

```
final V putVal(int hash, K key, V value, boolean onlyIfAbsent, boolean evict) {
    Node<K,V>[] tab; Node<K,V> p; int n, i;

    // 步骤1：判断table是否为空/长度0，执行resize初始化数组
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;

    // 步骤2：计算桶下标 i = (数组长度-1) & hash
    // 该桶为空，直接新建Node放入桶中
    if ((p = tab[i = (n - 1) & hash]) == null)
        tab[i] = newNode(hash, key, value, null);

    // 步骤3：桶不为空，发生哈希碰撞
    else {
        Node<K,V> e; K k;
        // 3.1 桶首节点key完全相等（hash一致+地址/equals相等），覆盖旧值
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            e = p;

        // 3.2 判断当前桶是红黑树节点，调用树的插入方法 putTreeVal
        else if (p instanceof TreeNode)
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);

        // 3.3 普通单向链表，循环遍历链表尾部插入
        else {
            for (int binCount = 0; ; ++binCount) {
                // 遍历到链表末尾，追加新节点
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null);
                    // 链表长度达到8，执行treeifyBin链表转红黑树
                    if (binCount >= TREEIFY_THRESHOLD - 1)
                        treeifyBin(tab, i);
                    break;
                }
                // 遍历过程中找到相同key，跳出循环覆盖
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    break;
                p = e;
            }
        }

        // 找到存在的key，执行value覆盖逻辑
        if (e != null) {
            V oldValue = e.value;
            // onlyIfAbsent=true时不覆盖（putIfAbsent调用）
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            afterNodeAccess(e); // LinkedHashMap回调，HashMap空实现
            return oldValue; // 返回被覆盖的旧值
        }
    }

    // 步骤4：新增节点，修改次数+1，size自增
    ++modCount;
    if (++size > threshold)
        resize(); // 超过阈值，执行扩容
    afterNodeInsertion(evict); // LinkedHashMap回调
    return null; // 新增元素返回null
}
```

### putVal 完整执行流程图总结

1. 数组未初始化 → resize创建默认16长度数组
2. 计算下标，桶为空直接放新节点
3. 桶头key重复 → 直接覆盖value
4. 桶是红黑树 → 树内插入
5. 桶是链表：尾部追加，长度到8触发树化
6. 新增成功size++，超过阈值扩容

## 六、resize() 扩容方法（JDK8重大优化点）

### JDK7 VS JDK8 resize 核心差异

- JDK7：扩容后链表全部从头重新计算hash，倒序迁移，并发下会**循环链表死循环**
- JDK8：利用`hash & oldCap`分为两条链表，**原位置i 或 i+oldCap**，顺序迁移，无死循环风险

```
final Node<K,V>[] resize() {
    Node<K,V>[] oldTab = table;
    int oldCap = (oldTab == null) ? 0 : oldTab.length;
    int oldThr = threshold;
    int newCap, newThr = 0;

    // 情况1：原数组已存在，正常扩容
    if (oldCap > 0) {
        // 达到最大容量，阈值设为Integer最大值，不再扩容
        if (oldCap >= MAXIMUM_CAPACITY) {
            threshold = Integer.MAX_VALUE;
            return oldTab;
        }
        // 新容量 = 旧容量 << 1 翻倍（2倍扩容）
        else if ((newCap = oldCap << 1) < MAXIMUM_CAPACITY &&
                 oldCap >= DEFAULT_INITIAL_CAPACITY)
            newThr = oldThr << 1; // 阈值同步翻倍
    }
    // 情况2：构造方法指定了初始容量，第一次初始化数组
    else if (oldThr > 0)
        newCap = oldThr;
    // 情况3：无参构造首次初始化，默认16容量，阈值12
    else {
        newCap = DEFAULT_INITIAL_CAPACITY;
        newThr = (int)(DEFAULT_LOAD_FACTOR * DEFAULT_INITIAL_CAPACITY);
    }

    // 计算新阈值
    if (newThr == 0) {
        float ft = (float)newCap * loadFactor;
        newThr = (newCap < MAXIMUM_CAPACITY && ft < (float)MAXIMUM_CAPACITY ?
                  (int)ft : Integer.MAX_VALUE);
    }
    threshold = newThr;

    // 创建新数组
    @SuppressWarnings({"rawtypes","unchecked"})
    Node<K,V>[] newTab = (Node<K,V>[])new Node[newCap];
    table = newTab;

    // 旧数组数据迁移核心逻辑
    if (oldTab != null) {
        for (int j = 0; j < oldCap; ++j) {
            Node<K,V> e;
            if ((e = oldTab[j]) != null) {
                oldTab[j] = null; // 原桶置空帮助GC

                // 1. 单个节点，直接重新寻址放入新数组
                if (e.next == null)
                    newTab[e.hash & (newCap - 1)] = e;

                // 2. 红黑树节点，树拆分迁移，少于6个自动退化为链表
                else if (e instanceof TreeNode)
                    ((TreeNode<K,V>)e).split(this, newTab, j, oldCap);

                // 3. 链表拆分迁移（JDK8精髓）
                else {
                    // 低位链表：hash & oldCap == 0 → 留在原下标j
                    Node<K,V> loHead = null, loTail = null;
                    // 高位链表：hash & oldCap !=0 → 放到 j+oldCap 下标
                    Node<K,V> hiHead = null, hiTail = null;
                    Node<K,V> next;

                    do {
                        next = e.next;
                        // 哈希值第oldCap位为0，归属低位链
                        if ((e.hash & oldCap) == 0) {
                            if (loTail == null)
                                loHead = e;
                            else
                                loTail.next = e;
                            loTail = e;
                        }
                        // 高位链
                        else {
                            if (hiTail == null)
                                hiHead = e;
                            else
                                hiTail.next = e;
                            hiTail = e;
                        }
                    } while ((e = next) != null);

                    // 低位链表放回原位置j
                    if (loTail != null) {
                        loTail.next = null;
                        newTab[j] = loHead;
                    }
                    // 高位链表放到 j+oldCap
                    if (hiTail != null) {
                        hiTail.next = null;
                        newTab[j + oldCap] = hiHead;
                    }
                }
            }
        }
    }
    return newTab;
}
```

#### 扩容迁移核心原理

旧容量`oldCap=16(10000)`，新容量32(100000)
`hash & oldCap`只有两种结果：0 或 1

- 0：`(31)&hash` = `(15)&hash` → 下标不变
- 1：下标 = 原下标 + 16
  不需要重新计算hash，只做链表拆分，顺序保留，彻底解决JDK7并发扩容死链问题

## 七、get() 查询方法源码

```
public V get(Object key) {
    Node<K,V> e;
    return (e = getNode(hash(key), key)) == null ? null : e.value;
}

final Node<K,V> getNode(int hash, Object key) {
    Node<K,V>[] tab; Node<K,V> first, e; int n; K k;
    // 数组为空 或 桶首节点为空直接返回null
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (first = tab[(n - 1) & hash]) != null) {

        // 桶头节点匹配直接返回
        if (first.hash == hash &&
            ((k = first.key) == key || (key != null && key.equals(k))))
            return first;

        if ((e = first.next) != null) {
            // 红黑树调用树查找
            if (first instanceof TreeNode)
                return ((TreeNode<K,V>)first).getTreeNode(hash, key);

            // 链表循环遍历查找
            do {
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    return e;
            } while ((e = e.next) != null);
        }
    }
    return null;
}
```

## 八、remove 删除源码简要逻辑

1. 计算hash定位桶
2. 判断桶类型（单个节点/链表/红黑树）找到目标节点
3. 链表修改指针、红黑树执行树删除平衡
4. modCount++，size--，红黑树节点数≤6触发untreeify退化为链表

## 九、HashMap 致命缺陷（引出ConcurrentHashMap）

1. **线程不安全**：多线程并发put、resize、remove会出现：数据丢失、链表循环死锁、size统计错误
2. 迭代器fail-fast，并发遍历修改直接抛异常
3. 没有任何同步锁机制，生产环境多线程禁止直接使用HashMap

---

# 第二部分 JDK8 ConcurrentHashMap 完整源码解析

## 一、设计总纲领（JDK7 vs JDK8 架构巨变）

1. **JDK7 CHM**：分段锁Segment（继承ReentrantLock），默认16个Segment，锁粒度大，并发上限16
2. **JDK8 CHM**：**取消Segment分段锁，改用CAS + synchronized 锁桶头节点**，锁粒度降到单个哈希桶，并发能力指数级提升
3. 底层数据结构和HashMap完全一致：数组+链表+红黑树，树化规则一模一样
4. 新增大量并发控制字段、自旋CAS操作、扩容协助机制、size计数原子类

## 二、核心静态常量（和HashMap大部分一致，新增并发常量）

```
public class ConcurrentHashMap<K,V> extends AbstractMap<K,V>
    implements ConcurrentMap<K,V>, Serializable {

    // 树化、退树、最小容量完全同HashMap
    static final int TREEIFY_THRESHOLD = 8;
    static final int UNTREEIFY_THRESHOLD = 6;
    static final int MIN_TREEIFY_CAPACITY = 64;

    // 数组扩容时的标记，table[i]置为ForwardingNode，表示正在迁移
    static final int MOVED     = -1;
    // 红黑树根节点标记
    static final int TREEBIN   = -2;
    // 预留节点
    static final int RESERVED  = -3;
    // 基础偏移量
    static final int HASH_BITS = 0x7fffffff;
}
```

### 特殊占位节点（JDK8 CHM核心并发标记）

1. **ForwardingNode**：hash=MOVED(-1)，当前桶正在扩容迁移，线程发现该节点会协助扩容
2. **TreeBin**：hash=TREEBIN(-2)，红黑树的根封装节点，负责树的读写锁控制
3. **ReservationNode**：hash=RESERVED(-3)，computeIfAbsent占位

## 三、核心成员变量（并发重点）

```
// 哈希桶数组，volatile修饰，保证多线程可见性
transient volatile Node<K,V>[] table;
// 扩容过程中的新数组，volatile
private transient volatile Node<K,V>[] nextTable;
// 扩容控制标记：高16位扩容状态，低16位下一个迁移桶下标
private transient volatile int transferIndex;

// 计数核心：LongAdder分段累加思想，解决高并发size统计CAS自旋竞争
private transient volatile long baseCount;
// 扩容触发阈值
private transient volatile int sizeCtl;
// 负载因子
private final float loadFactor;
```

### sizeCtl 状态超级重要（面试高频）

- **sizeCtl = 0**：table未初始化
- **sizeCtl > 0**：正常状态，代表扩容阈值（同HashMap threshold）
- **sizeCtl = -1**：正在初始化table
- **sizeCtl < -1**：低16位n = sizeCtl+2，代表有n个线程正在协助扩容

## 四、内部节点结构（复用HashMap，新增并发节点）

1. Node：和HashMap一致，**val和next用volatile修饰保证可见性**

```
static class Node<K,V> implements Map.Entry<K,V> {
    final int hash;
    final K key;
    volatile V val;
    volatile Node<K,V> next;
}
```

2. TreeNode：红黑树节点，同HashMap
3. ForwardingNode、TreeBin、ReservationNode 三个并发控制虚拟节点

## 五、初始化逻辑 initTable()（CAS保证单线程初始化）

```
private final Node<K,V>[] initTable() {
    Node<K,V>[] tab; int sc;
    while ((tab = table) == null || tab.length == 0) {
        // sizeCtl<0 说明其他线程正在初始化，自旋等待
        if ((sc = sizeCtl) < 0)
            Thread.yield();
        // CAS尝试将sizeCtl从0改为-1，抢占初始化锁
        else if (U.compareAndSwapInt(this, SIZECTL, sc, -1)) {
            try {
                // 双重检查防止多线程CAS并发
                if ((tab = table) == null || tab.length == 0) {
                    int n = (sc > 0) ? sc : DEFAULT_CAPACITY;
                    @SuppressWarnings("unchecked")
                    Node<K,V>[] nt = (Node<K,V>[])new Node<?,?>[n];
                    table = tab = nt;
                    // 设置扩容阈值 n*0.75
                    sc = n - (n >>> 2);
                }
            } finally {
                // 初始化完成，恢复sizeCtl为阈值
                sizeCtl = sc;
            }
            break;
        }
    }
    return tab;
}
```

**核心：通过CAS修改sizeCtl=-1加锁，保证只有一个线程初始化数组，其余线程自旋让出CPU**

## 六、核心 put() → putVal() 逐行源码解析

```
public V put(K key, V value) {
    return putVal(hash(key), key, value, false);
}

final V putVal(int hash, K key, V value, boolean onlyIfAbsent) {
    Node<K,V>[] tab; Node<K,V> p; int n, i;
    if (key == null || value == null) throw new NullPointerException();

    // 1. 数组未初始化，调用initTable初始化
    if ((tab = table) == null || (n = tab.length) == 0)
        tab = initTable();

    // 2. 定位桶下标，桶为空，直接CAS插入新Node（无锁）
    if ((p = tab[i = (n - 1) & hash]) == null)
        if (casTabAt(tab, i, null, new Node<K,V>(hash, key, value, null)))
            break;

    // 3. 当前桶是ForwardingNode，说明正在扩容，当前线程协助扩容
    else if (p.hash == MOVED)
        tab = helpTransfer(tab, p);

    // 4. 桶已存在元素，加synchronized锁锁住桶头节点p
    else {
        V oldVal = null;
        // 锁粒度：单个桶头对象，不锁整个数组
        synchronized (p) {
            // 双重校验，防止加锁期间桶被扩容迁移
            if (tabAt(tab, i) == p) {
                // 4.1 桶头key重复，覆盖
                if (p.hash == hash &&
                    ((k = p.key) == key || (key != null && key.equals(k))))
                    oldVal = p.val;
                // 4.2 红黑树节点，树插入
                else if (p instanceof TreeNode)
                    oldVal = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
                // 4.3 链表尾部追加
                else {
                    for (int binCount = 0; ; ++binCount) {
                        if ((e = p.next) == null) {
                            p.next = new Node<K,V>(hash, key, value, null);
                            // 链表长度8，树化
                            if (binCount >= TREEIFY_THRESHOLD - 1)
                                treeifyBin(tab, i);
                            break;
                        }
                        if (e.hash == hash &&
                            ((k = e.key) == key || (key != null && key.equals(k)))) {
                            oldVal = e.val;
                            break;
                        }
                        p = e;
                    }
                }
            }
        }

        // 覆盖旧值返回
        if (oldVal != null) {
            if (!onlyIfAbsent)
                p.val = value;
            return oldVal;
        }
    }

    // 5. 新增元素，计数累加，判断是否触发扩容
    addCount(1L, binCount);
    return null;
}
```

### putVal 并发核心规则总结

1. 空桶：**CAS无锁直接插入**，性能最高
2. 桶在扩容（ForwardingNode）：当前线程**协助扩容transfer**
3. 桶有数据：**synchronized 锁住桶首Node对象**，只锁单个桶，极大提升并发度
4. 链表树化规则、红黑树逻辑和HashMap完全一致
5. 新增元素调用`addCount`基于LongAdder做原子计数，并校验扩容

## 七、transfer() 扩容迁移机制（JDK8 CHM灵魂）

### 核心特性

1. 多线程**协同扩容**：一个线程触发扩容后，其他线程put/get发现ForwardingNode都会帮忙迁移数据
2. 原数组table，新数组nextTable，扩容为2倍
3. 每个线程认领一段桶区间（transferIndex递减），互不抢占
4. 迁移完成后旧table节点全部标记为ForwardingNode，下次访问直接路由到新数组
5. 扩容期间读写均可并发执行，不会阻塞全局

### 扩容简要流程

1. 触发条件：`size > sizeCtl`，CAS修改sizeCtl为负数进入扩容状态
2. 初始化nextTable为原数组2倍长度
3. transferIndex从数组末尾向前分配迁移任务块
4. 每个线程认领一批桶，加synchronized锁桶头，拆分链表/红黑树迁移
5. 迁移完毕将原桶设置为ForwardingNode
6. 所有桶迁移完成，nextTable赋值给table，清空nextTable，恢复sizeCtl阈值

## 八、size() 总数统计 addCount & LongAdder 分段计数

### 为什么不用AtomicInteger/AtomicLong？

高并发下大量CAS自旋失败，性能极差。JDK8 CHM用**LongAdder分段累加**：

1. baseCount：基础计数值
2. CounterCell[] cells：分段单元格数组，多个线程分散到不同cell累加
3. size = baseCount + sum(cells)
   **将单点CAS竞争分散到多个数组槽位，超高并发下性能碾压AtomicLong**

源码核心方法`addCount()`：新增元素时累加计数，计数完成判断是否需要触发transfer扩容。

## 九、get() 查询无锁设计（极致并发）

```
public V get(Object key) {
    Node<K,V>[] tab; Node<K,V> e, p; int n, eh; K ek;
    int h = spread(key.hashCode()); // 扰动函数
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (e = tabAt(tab, (n - 1) & h)) != null) {
        // 桶头命中
        if ((eh = e.hash) == h) {
            if ((ek = e.key) == key || (key != null && key.equals(ek)))
                return e.val;
        }
        // 扩容中，去新数组查询
        else if (eh < 0)
            return (p = e.find(h, key)) != null ? p.val : null;
        // 链表循环查找
        while ((e = e.next) != null) {
            if (e.hash == h &&
                ((ek = e.key) == key || (key != null && key.equals(ek))))
                return e.val;
        }
    }
    return null;
}
```

**查询全程无锁**：依靠volatile可见性保证节点val、next最新，只有碰到ForwardingNode转发到新数组，读性能拉满。

## 十、remove 删除逻辑

1. 定位桶，遇到ForwardingNode先协助扩容
2. synchronized锁定桶头节点
3. 链表删除指针重定向 / 红黑树删除平衡
4. 删除后节点数≤6触发退树化
5. addCount(-1)递减总数量

## 十一、JDK8 CHM 并发安全核心三板斧总结

1. **volatile**：table、nextTable、sizeCtl、Node.val/next 保证多线程可见性
2. **CAS自旋**：初始化数组、空桶插入、修改sizeCtl状态、LongAdder计数
3. **synchronized 锁桶头**：哈希桶有数据时锁定单个Node，锁粒度极小，并发效率极高

---

# 第三部分 高频面试题（HashMap + ConcurrentHashMap）分模块

## 模块一：HashMap 基础面试题（入门→深度）

### 1. HashMap 底层数据结构？JDK7和JDK8区别？

**JDK7**：数组+单向链表，头插法插入，无红黑树，扩容并发死循环
**JDK8**：数组+单向链表+红黑树，尾插法，链表长度≥8且容量≥64树化，扩容高低位拆分无死链，优化hash扰动函数

### 2. 为什么容量必须是2的幂？

`index = (table.length -1) & hash` 替代取模运算`hash % length`，位运算效率极高；只有2的幂时`n-1`二进制全为1，哈希分布均匀，减少碰撞。

### 3. hash()扰动函数为什么要高低位异或 h^(h>>>16)？

hashCode大多高位有效，数组寻址只看低位，高位信息丢失加剧碰撞；右移16位将高位数据混入低位，让哈希值分布更离散，降低冲突概率。

### 4. 负载因子0.75为什么是最优值？

负载因子越小，阈值越低，扩容越频繁，空间占用大、碰撞少；越大空间利用率高但碰撞严重。0.75是泊松分布下链表长度达到8概率极低的平衡点。

### 5. 链表转红黑树两个条件？为什么两个条件？

条件：链表长度>=8 **并且** 数组容量>=64
原因：数组容量过小（比如16），扩容就能打散链表，不需要树化；红黑树维护旋转、平衡成本高于链表，小容量优先扩容。

### 6. JDK8扩容如何避免JDK7死循环？

JDK7头插法，扩容后链表倒置，并发多线程rehash形成环形链表，get死循环。
JDK8通过`hash & oldCap`拆分高低两条链表，原顺序迁移，指针不会反向，彻底规避死链。

### 7. HashMap为什么线程不安全？具体哪些场景出问题？

1. 并发put扩容死循环（JDK7）
2. 并发put覆盖数据，导致元素丢失
3. size计数并发累加不准确
4. 迭代遍历修改触发fail-fast抛出ConcurrentModificationException

### 8. null可以作为key吗？存储在哪个下标？

可以，hash方法判定key==null直接返回0，固定存放在table[0]桶，只能存一个null key，重复会覆盖。

### 9. equals和hashCode重写规则，为什么？

规则：equals相等的两个对象，hashCode必须相等；hashCode相等equals不一定相等。
HashMap通过hashCode定位桶，equals精确匹配key，只重写一个会导致相同逻辑对象存到不同桶，无法覆盖更新。

### 10. treeifyBin 树化完整逻辑？

先判断数组容量是否≥64，不足直接resize扩容；满足则将单向链表转为双向TreeNode红黑树结构，方便后续树平衡和退化。

## 模块二：ConcurrentHashMap JDK8 深度面试题（核心高频）

### 1. JDK7和JDK8 ConcurrentHashMap 架构核心差异？

| 版本 | 锁机制 | 底层结构 | 并发粒度 | 扩容 |
| --- | --- | --- | --- | --- |
| JDK7 | Segment分段锁（ReentrantLock） | 数组+链表 | Segment段级别，默认16并发 | 单线程扩容 |
| JDK8 | CAS + synchronized锁桶头 | 数组+链表+红黑树 | 单个哈希桶级别 | 多线程协助扩容transfer |

### 2. JDK8 CHM 为什么放弃Segment改用synchronized？

1. synchronized经过JDK6+锁优化（偏向锁→轻量级锁→重量级锁），性能大幅提升，不比ReentrantLock差
2. Segment占用大量内存，锁粒度太粗，最多16并发；锁单个桶理论并发上限等于数组长度，并发度极大提升
3. 架构简化，红黑树、扩容协助更容易实现

### 3. CHM sizeCtl变量各个值代表什么含义？

- =0：table未初始化
- >
> 0：正常运行状态，等于扩容阈值threshold
- =-1：正在执行数组初始化initTable
- <-1：低16位绝对值为正在协助扩容的线程数量，负数代表扩容进行中

### 4. put方法完整加锁流程？

1. table未初始化：CAS修改sizeCtl=-1独占初始化
2. 桶为空：CAS无锁插入Node
3. 桶是ForwardingNode：当前线程调用helpTransfer协助扩容
4. 桶有元素：**synchronized锁定桶首Node对象**，链表/红黑树插入，仅锁定单个桶，不影响其他桶并发读写

### 5. ForwardingNode作用？扩容如何多线程协助？

ForwardingNode hash=-1，标记该桶正在迁移：

- put/remove碰到：线程阻塞并加入transfer协助扩容
- get碰到：调用find方法路由到新nextTable数组查询
  扩容时transfer方法通过transferIndex分配桶任务，多个线程分段认领桶迁移，加速扩容。

### 6. CHM get方法为什么全程无锁？怎么保证可见性？

1. table、nextTable用volatile修饰，数组引用可见
2. Node内部val、next字段volatile修饰，节点值和下一个指针多线程立即可见
3. 仅遇到ForwardingNode转发查询新数组，无任何同步锁，读性能极强

### 7. CHM统计size为什么用LongAdder而不用AtomicLong？

高并发下AtomicLong大量线程竞争同一个变量CAS，自旋空转CPU消耗高；
LongAdder采用**分段Cell数组**，线程哈希分散到不同Cell累加，最终baseCount+所有Cell总和为总size，超高并发下吞吐量提升数十倍。

### 8. CHM红黑树TreeBin节点作用？

TreeBin封装红黑树根节点，内部维护读写锁：读共享、写独占，保证红黑树结构修改（插入、删除、旋转）时线程安全，防止并发修改破坏树结构。

### 9. CHM哪些操作会触发扩容？

1. put新增元素后总size超过sizeCtl阈值，触发transfer扩容
2. 链表长度达到8触发treeifyBin时，如果数组容量不足64，优先扩容而非树化
3. 任意线程访问到ForwardingNode节点，主动协助扩容

### 10. CHM是否允许key/value为null？为什么？

**不允许**，put时直接抛NPE。
原因：并发环境下无法区分key=null是不存在还是存储了null，多线程get返回null无法判断语义，HashMap单线程无歧义所以允许。

## 模块三：对比类综合面试题（终极高频）

### 1. HashMap、Hashtable、ConcurrentHashMap三者区别

1. Hashtable：方法加synchronized锁整个对象，并发极差，容量默认11（非2次幂），线程安全但废弃，允许null键值
2. HashMap：无锁线程不安全，2次幂容量，单线程性能最优
3. ConcurrentHashMap：分段桶锁，并发安全，多线程场景首选

### 2. 为什么多线程环境优先用CHM而不是Collections.synchronizedMap(new HashMap())？

Collections.synchronizedMap是给HashMap所有方法加对象锁，**锁粒度是整个Map**，任意操作互斥串行执行；
CHM锁粒度是单个哈希桶，多桶可并行读写，并发吞吐量差距巨大。

### 3. CHM迭代器是fail-fast还是fail-safe？

**fail-safe**，基于底层table快照遍历，并发修改不会抛出异常，读取的是迭代创建时的快照数据，弱一致性。HashMap是fail-fast，直接抛异常。

### 4. JDK8 CHM synchronized锁对象为什么是桶头Node，而不是其他？

1. 每个桶独立，互不影响，锁粒度最小
2. Node对象不会被GC回收，生命周期稳定
3. 桶为空用CAS无锁，只有冲突才加锁，最大化性能

## 模块四：深挖扩展压轴面试题（大厂深度提问）

1. 红黑树相比平衡二叉树、AVL树优势？插入删除旋转次数更少，综合读写性能更适合哈希表冲突场景
2. 负载因子如果改成0.5或者1会有什么后果？
3. CHM transfer扩容时如何保证数据迁移原子性？
4. LongAdder的Cell数组扩容机制？
5. TreeBin的读写锁实现原理，为什么树结构需要加读写锁？
6. HashMap批量putAll为什么也要校验扩容？
7. 为什么TreeNode要保留双向链表prev指针？为了红黑树退化链表时快速遍历重构单向链表

---

# 附加总结背诵版

## HashMap JDK8 一句话核心

数组（2次幂）+链表+红黑树，扰动函数高低位异或，尾插法，扩容高低位拆分规避死循环，懒加载数组，modCount快速失败，单线程高性能，多线程不安全。

## ConcurrentHashMap JDK8 一句话核心

废弃Segment分段锁，采用**CAS + volatile + 桶头synchronized**三重并发保障，get无锁读，多线程协助扩容transfer，LongAdder分段计数，TreeBin树读写锁，锁粒度极致细化，高并发下线程安全首选。