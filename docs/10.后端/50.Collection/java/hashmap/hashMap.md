---
title: hashMap
date: 2026-08-09 14:56:23
permalink: /pages/7640d6/
categories:
  - 后端
  - Collection
  - java
  - hashmap
tags:
  - 
author: 
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---
#HashMap

#HashMap的数据结构
数组+链表+红黑树

> 默认初始容量(数组默认大小):16，2的整数次方static final int DEFAULT_INITIAL_CAPACITY = 1 << 4;   最大容量static final int MAXIMUM_CAPACITY = 1 << 30; 默认负载因子static final float DEFAULT_LOAD_FACTOR = 0.75f;装载因子用来衡量HashMap满的程度，表示当map集合中存储的数据达到当前数组大小的75%则需要进行扩容;链表转红黑树边界static final int TREEIFY_THRESHOLD = 8; 红黑树转离链表边界static final int UNTREEIFY_THRESHOLD = 6; 树化最小表容量  static final int MIN_TREEIFY_CAPACITY = 64;哈希桶数组transient Node<K,V>[] table; 实际存储的元素个数transient int size; 当map里面的数据大于这个threshold就会进行扩容int threshold   阈值 = table.length * loadFactor

> 为什么槽位数必须使用2^n？  为了让哈希后的结果更加均匀
##hash冲突
> Hash冲突指的是在向Hash表中存数据时，首先要用Hash函数计算出该数据要存放的地址。但是在这个地址中已经有值存在，所以这个时候就发生了Hash冲突。也就是一句话：key值不同的元素可能会映象到哈希表的同一地址上
##hash闭环

###get

~~~
public V get(Object key) {
    Node<K,V> e;
    return (e = getNode(hash(key), key)) == null ? null : e.value;
}

final Node<K,V> getNode(int hash, Object key) {
    //tab 引用当前hashMap的散列表 first 桶位中的元素 e 临时node元素 n table数组长度 k 
    Node<K,V>[] tab; Node<K,V> first, e; int n; K k;
    // 符合条件则代表 有数据
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (first = tab[(n - 1) & hash]) != null) {
        // 第一种情况 定位出桶位元素  只有一个元素 则为需要返回的元素
        if (first.hash == hash && // always check first node
            ((k = first.key) == key || (key != null && key.equals(k))))
            return first;
        //  当前桶位不止一个元素 可能为链表 也可能为红黑树
        if ((e = first.next) != null) {
            // 第二种情况 红黑树
            if (first instanceof TreeNode)
                return ((TreeNode<K,V>)first).getTreeNode(hash, key);
            // 第三种情况 链表 遍历链表
            do {
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    return e;
            } while ((e = e.next) != null);
        }
    }
    return null;
}
~~~

###put

```
#put
public V put(K key, V value) {
    return putVal(hash(key), key, value, false, true);
}

#hash
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
1、如果key为空，那么hash值置为0。HashMap允许null作为键，虽然这样，因为null的hash值一定是0，而且null==null为真，所以HashMap里面最多只会有一个null键。而且这个null键一定是放在数组的第一个位置上。但是如果存在hash碰撞，该位置上形成链表了，那么null键对应的节点就不确定在链表中的哪个位置了（取决于插入顺序，并且每次扩容其在链表中的位置都可能会改变）。
2、如果key是个不为空的对象，那么将key的hashCode值h和h无符号右移16位后的值做异或运算，得到最终的hash值。

#putVal
final V putVal(int hash, K key, V value, boolean onlyIfAbsent,
               boolean evict) {
    Node<K,V>[] tab; Node<K,V> p; int n, i; // 定义元素数组、当前元素变量
    // 如果当前Map的元素数组为空 或者 数组长度为0，那么需要初始化元素数组
    // tab = resize() 初始化了元素数组，resize方法同时也可以实现数组扩容，可参见：resize方法解析
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;
    // 根据hash值和数组长度取摸计算出数组下标
    if ((p = tab[i = (n - 1) & hash]) == null) // 如果该位置不存在元素，那么创建一个新元素存储到数组的该位置。
        tab[i] = newNode(hash, key, value, null);
    else {
       // 如果该位置已经存在元素，说明有以下情况
        Node<K,V> e; K k; // e 用来指向根据key匹配到的元素
        // 如果要写入的key的hash值和当前元素的key的hash值相同，并且key也相等
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            // 用e指向到当前元素
            e = p;
        // 如果要写入的key的hash值和当前元素的key的hash值不同，或者key不相等，说明不是同一个key，要通过其他数据结构来存储新来的数据
        else if (p instanceof TreeNode)
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value); // 参见：putTreeVal方法解析
        else {
            // 运行到这里，说明采用链表结构来存储
            for (int binCount = 0; ; ++binCount) { // 要逐一对比看要写入的key是否和链表上的某个key相同
                if ((e = p.next) == null) { // 如果当前元素没有下一个节点
                    // 根据键值对创建一个新节点，挂到链表的尾部
                    p.next = newNode(hash, key, value, null);
                    //  如果链表上元素的个数已经达到了阀值（可以改变存储结构的临界值
                    TREEIFY_THRESHOLD = 8 (binCount 初始值为 0 达到7时 链表长度为8)
                    if (binCount >= TREEIFY_THRESHOLD - 1) // -1 for 1st
                        // 将该链表上所有元素改为TreeNode方式存储（是为了增加查询性能，元素越多，链表的查询性能越差） 或者 扩容
                        treeifyBin(tab, hash);  // 参见：treeifyBin方法解析
                    break;// 跳出循环，因为没有可遍历的元素了
                }
                 // 如果下一个节点的 hash值和key值都和要写入的hash 和 key相同
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    break; // 跳出循环，因为找到了相同的key对应的元素
                p = e;
            }
        }
        // 说明找了和要写入的key对应的元素，根据情况来决定是否覆盖值
        if (e != null) { // existing mapping for key
            V oldValue = e.value;  // 旧值
            if (!onlyIfAbsent || oldValue == null)   // 如果旧值为空  后者  指定了需要覆盖旧值，那么更改元素的值为新值
                e.value = value;
            afterNodeAccess(e); // 元素被访问之后的后置处理， LinkedHashMap中有具体实现   LinkedHashMap 如果accessOrder 为true 则每次访问改变排序顺序  并不能使用 KeySet遍历
            return oldValue; // 返回旧值
        }
    }
    
    // 执行到这里，说明是增加了新的元素，而不是替换了老的元素，所以相关计数需要累加
    
    ++modCount; // 修改计数器递增
    // 当前map的元素个数递增
    if (++size > threshold) // 如果当前map的元素个数大于了扩容阀值，那么需要扩容元素数组了
        resize();  // 元素数组扩容
    afterNodeInsertion(evict); // 添加新元素之后的后后置处理， LinkedHashMap中有具体实现
    return null; // 返回空
}
```

### resize
```
// 为了解决hash冲洗导致的链化影响的查询效率问题 扩容会缓解该问题
final Node<K,V>[] resize() {
    // 引用扩容之前的哈希表
    Node<K,V>[] oldTab = table;
    // 表示扩容之前table数组长度
    int oldCap = (oldTab == null) ? 0 : oldTab.length;
    // 扩容前的扩容阈值 出发本次扩容的阈值
    int oldThr = threshold;
    // 扩容之后 table大小  newThr 扩容之后的扩容阈值 下次扩容的条件
    int newCap, newThr = 0;
    // 条件成立 说明 hashMap中的散列表 已经初始化过了 试一次正常的扩容
    if (oldCap > 0) {
        // 扩容前的数组大小 已经打到最大阈值 则不扩容 且设置扩容阈值为int最大值 后续也不再扩容
        if (oldCap >= MAXIMUM_CAPACITY) {
            threshold = Integer.MAX_VALUE;
            return oldTab;
        }
        // oldCap 左移一位 实现数值翻倍 且赋值给newCap newCap小于数组最大值极限 且扩容之前的阈值>=16
        // 这种情况 则 下一次扩容的阈值 等于当前阈值翻倍 
        else if ((newCap = oldCap << 1) < MAXIMUM_CAPACITY &&
                 oldCap >= DEFAULT_INITIAL_CAPACITY)
            newThr = oldThr << 1; // double threshold
    }
    // oldCap == 0  说明hashMap中的散列表是null
    // 1. new Hash(initCap,loadFactor)
    // 2. new Hash(initCap)
    // 3. new Hash(map) 并且这个map有数据
    else if (oldThr > 0) // initial capacity was placed in threshold
        newCap = oldThr;
    // oldCap == 0  oldThr == 0 
    // new HahsMap(); 创建默认HashMap
    else {               // zero initial threshold signifies using defaults
        newCap = DEFAULT_INITIAL_CAPACITY;
        newThr = (int)(DEFAULT_LOAD_FACTOR * DEFAULT_INITIAL_CAPACITY);
    }
    
    // newThr 为零时 通过newCap和loadFactor 计算出一个新的newThr
    if (newThr == 0) {
        float ft = (float)newCap * loadFactor;
        newThr = (newCap < MAXIMUM_CAPACITY && ft < (float)MAXIMUM_CAPACITY ?
                  (int)ft : Integer.MAX_VALUE);
    }
    
    // 赋值新的扩容阈值条件
    threshold = newThr;
    
    // 创建出一个更长 更大的数组
    @SuppressWarnings({"rawtypes","unchecked"})
    Node<K,V>[] newTab = (Node<K,V>[])new Node[newCap];
    table = newTab;
    // 说明 hashMap本次扩容之前 table不为null
    if (oldTab != null) {
        for (int j = 0; j < oldCap; ++j) {
            // 当前node节点
            Node<K,V> e;
            // 说明当前桶位中有数据 但是数据 是单个数据 还是链表 还是红黑树 并不知道
            if ((e = oldTab[j]) != null) {
                // 赋值为null 方便JVM回收内存
                oldTab[j] = null;
                // 第一种情况 当前数据只有一个元素 从未发生碰撞 这种情况直接计算出当前元素应该存在新数组中的位置 然后放进去
                if (e.next == null)
                    newTab[e.hash & (newCap - 1)] = e;
                    
                // 判断当前桶位已经树化 
                else if (e instanceof TreeNode)
                    ((TreeNode<K,V>)e).split(this, newTab, j, oldCap);
                    
                // 第三张情况 链表 
                else { // preserve order
                    // 低位链表: 存放在扩容后的数组下标位置 与当前数组下标位置一致
                    Node<K,V> loHead = null, loTail = null;
                    // 高位链表: 存放在扩容后的数组下标位置 与当前数组下标位置 + 扩容之前的数组长度
                    Node<K,V> hiHead = null, hiTail = null;
                    Node<K,V> next;
                    do {
                        next = e.next;
                        // hash -> .... 1 1111  高位
                        // hash -> .... 0 1111  低位
                        // 0b 10000  & oldCap 可以计算 等于零时 属于为低位 等于1时数据为高位 
                        if ((e.hash & oldCap) == 0) {
                            if (loTail == null)
                                loHead = e;
                            else
                                loTail.next = e;
                            loTail = e;
                        }
                        else {
                            if (hiTail == null)
                                hiHead = e;
                            else
                                hiTail.next = e;
                            hiTail = e;
                        }
                    } while ((e = next) != null);
                    
                    // 如果 低位链表的末尾后面还有节点 赋值为null 让新数组下标为的原数组下标值的节点 等于低位数组的头节点 完成数组的变更
                    // 原数组值为3 此时 newTab[3] = loHead;
                    if (loTail != null) {
                        loTail.next = null;
                        newTab[j] = loHead;
                    }
                    
                    // 如果 高位链表的末尾后面还有节点 赋值为null 让新数组的原数组下标加老数组长度的节点 等于高位数组的头节点 完成数组的变更
                    // 原数组值为3 此时 newTab[3 + 16] = loHead;
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

### remove
~~~
public V remove(Object key) {
    Node<K,V> e;
    return (e = removeNode(hash(key), key, null, false, true)) == null ?
        null : e.value;
}


/**
 * Implements Map.remove and related methods
 *
 * @param hash hash for key
 * @param key the key
 * @param value the value to match if matchValue, else ignored
 * @param matchValue if true only remove if value is equal
 * @param movable if false do not move other nodes while removing
 * @return the node, or null if none
 */
final Node<K,V> removeNode(int hash, Object key, Object value,
                           boolean matchValue, boolean movable) {
    // tab 引用当前hashMap的散列表 p 当前node元素 n 表示散列表长度 index 表示寻址结果
    Node<K,V>[] tab; Node<K,V> p; int n, index;
    // 判断寻址后 对应桶位是否有数据
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (p = tab[index = (n - 1) & hash]) != null) {
        // 说明路由的桶位是有数据的 需要进行查找操作 并删除
        // node 查找到的结果 e 当前node的下一个元素
        Node<K,V> node = null, e; K k; V v;
        // 第一种情况 当前桶位中的元素 即为要删除的元素 
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            node = p;
        
        // 说明 当前桶位 要不是 链表 要不是 红黑树
        else if ((e = p.next) != null) {
            // 如果是红黑树 
            if (p instanceof TreeNode)
                // 则进行红黑树查找操作
                node = ((TreeNode<K,V>)p).getTreeNode(hash, key);
            else {
                // 链表情况 进行链表查找操作
                do {
                    if (e.hash == hash &&
                        ((k = e.key) == key ||
                         (key != null && key.equals(k)))) {
                        node = e;
                        break;
                    }
                    p = e;
                } while ((e = e.next) != null);
            }
        }
        
        // 边界判断 node不为空 且按照key查找到要删除数据
        if (node != null && (!matchValue || (v = node.value) == value ||
                             (value != null && value.equals(v)))) {
            //第一张情况 红黑树情况
            if (node instanceof TreeNode)
                // 进行树节点移除
                ((TreeNode<K,V>)node).removeTreeNode(this, tab, movable);
            // 第二张情况 链表   桶位元素即为要删除的元素 则将链表的下一个元素 放到桶位中 
            else if (node == p)
                tab[index] = node.next;
            // 第三张情况 链表且不为第一位元素  则将当前元素p的下一个元素 设置为要删除元素的下一个元素
            else
                p.next = node.next;
            ++modCount;
            --size;
            afterNodeRemoval(node);
            return node;
        }
    }
    return null;
}
~~~

### replace

~~~
@Override
public V replace(K key, V value) {
    Node<K,V> e;
    // 找到元素 如果存在 将旧元素替换成新值 
    if ((e = getNode(hash(key), key)) != null) {
        V oldValue = e.value;
        e.value = value;
        afterNodeAccess(e);
        return oldValue;
    }
    return null;
}


@Override
public boolean replace(K key, V oldValue, V newValue) {
    Node<K,V> e; V v;
    / 找到元素 如果存在 将旧元素替换成新值  并且多加一层 旧元素值对比判断
    if ((e = getNode(hash(key), key)) != null &&  
        ((v = e.value) == oldValue || (v != null && v.equals(oldValue)))) {
        e.value = newValue;
        afterNodeAccess(e);
        return true;
    }
    return false;
}
~~~

>对key进行了hashCode运算，得到一个32位的int值h,然后用h 异或 h>>>16位
> 
> 计算下标时把hash的高16位也参与进来了，掺杂的元素多了，那么生成的hash值的随机性会增大，减少了hash碰撞


![](https://testingcf.jsdelivr.net/gh/lxzhang666666/img-bed@main/images/HashCode.jpeg)

> HashMap中只有当链表的长度大于8并且数组的长度大于等于64 链表才会转换成红黑树  如果链表长度大于8但是数组长度小于64 put值时 会继续扩容 直至成为红黑树  当链表小于6时则退树  扩容运算 所有节点数>容器大小*0.75

## 红黑树特性

[红黑树.webp](../../assets/hashMap/%E7%BA%A2%E9%BB%91%E6%A0%91.webp)  
![红黑树](https://testingcf.jsdelivr.net/gh/lxzhang666666/img-bed@main/images/%E7%BA%A2%E9%BB%91%E6%A0%91.webp)
1. 每个节点要么是黑色 要么是红色
2. 跟节点是黑色
3. 每个叶子节点(NIL)是黑色
4. 每个红色节点的两个子节点 一定是黑色 不可能有两个红色节点相连
5. 任意节点到每个叶子节点的路径都包含数量相同的黑节点 俗称黑高！  
 5.1 如果一个节点存在黑节点 那么该节点肯定有两个子节点

红黑树是黑色完美平衡的树

## 左旋 右旋 变色
1. 变色 节点的颜色由红变黑或由黑变红
2. 左旋 以某个节点作为支点(旋转节点),其右子节点变为旋转节点的父节点,右子节点的左子节点变为旋转点的右子节点,左子节点保持不变
3. 右旋 以某个节点作为支点(旋转节点),其左子节点变为旋转节点的父节点,左子节点的右子节点变为旋转点的左子节点,右子节点保持不变


## 注意debug验证 HashMap 扩容 树化 退树时 需要配置debug
需要关闭以下配置
![HashMap-debug配置.png](../../assets/hashMap/HashMap-debug%E9%85%8D%E7%BD%AE.png)

> 需要保证 key的hashcode相同 这样才能制造hash冲突

### 代码
~~~java
    public static void main(String[] args) {
        Map<FixHashKey, Integer> hashMap = new HashMap<>(64);
        for (int i = 0; i <= 10; i++) {
            int rand = RandomUtils.nextInt(0, 1000);
            hashMap.put(new FixHashKey(i), rand);
        }
        for (int i = 0; i <= 10; i++) {
            hashMap.remove(new FixHashKey(i));
        }
    }


    static class FixHashKey {
        private final int id;
        public FixHashKey(int id) { this.id = id; }
        // 固定hashCode，全部落到同一个桶！制造冲突
        @Override
        public int hashCode() {
            return 1;
        }
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            FixHashKey that = (FixHashKey) o;
            return id == that.id;
        }
    }
~~~

验证jdk8 尾插法

![验证尾插法.png](../../assets/hashMap/%E9%AA%8C%E8%AF%81%E5%B0%BE%E6%8F%92%E6%B3%95.png)

验证jdk8 尾插法 可见第二个元素 放到了了next上 方便后续树化

![验证尾插法视图.png](../../assets/hashMap/%E9%AA%8C%E8%AF%81%E5%B0%BE%E6%8F%92%E6%B3%95%E8%A7%86%E5%9B%BE.png)

树化

![树化.png](../../assets/hashMap/%E6%A0%91%E5%8C%96.png)
![树化时链表个数.png](../../assets/hashMap/%E6%A0%91%E5%8C%96%E6%97%B6%E9%93%BE%E8%A1%A8%E4%B8%AA%E6%95%B0.png)
![树化隐藏为null的元素.png](../../assets/hashMap/%E6%A0%91%E5%8C%96%E9%9A%90%E8%97%8F%E4%B8%BAnull%E7%9A%84%E5%85%83%E7%B4%A0.png)

退树

![退树.png](../../assets/hashMap/%E9%80%80%E6%A0%91.png)
![退树时元素个数.png](../../assets/hashMap/%E9%80%80%E6%A0%91%E6%97%B6%E5%85%83%E7%B4%A0%E4%B8%AA%E6%95%B0.png)
![退树隐藏为null的元素.png](../../assets/hashMap/%E9%80%80%E6%A0%91%E9%9A%90%E8%97%8F%E4%B8%BAnull%E7%9A%84%E5%85%83%E7%B4%A0.png)

