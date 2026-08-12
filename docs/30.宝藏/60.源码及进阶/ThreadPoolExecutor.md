# ThreadPoolExecutor 线程池 完整源码级深度解析（独立模块）

## 1. 类顶层结构与核心成员变量（JDK8）

```
public class ThreadPoolExecutor extends AbstractExecutorService {
    // 核心控制变量：ctl 复合变量，高3位表示线程池状态，低29位表示有效工作线程数
    private final AtomicInteger ctl = new AtomicInteger(ctlOf(RUNNING, 0));
    private static final int COUNT_BITS = Integer.SIZE - 3; // 29位存线程数量
    private static final int CAPACITY   = (1 << COUNT_BITS) - 1; // 最大线程容量

    // 线程池5种状态（高位3位）
    private static final int RUNNING    = -1 << COUNT_BITS; // 接收新任务、处理队列任务
    private static final int SHUTDOWN   =  0 << COUNT_BITS; // 不接收新任务，执行队列剩余
    private static final int STOP       =  1 << COUNT_BITS; // 中断正在执行任务，丢弃队列
    private static final int TIDYING    =  2 << COUNT_BITS; // 所有线程终止，准备执行钩子
    private static final int TERMINATED =  3 << COUNT_BITS; // 彻底关闭完成

    // 位运算工具方法
    private static int runStateOf(int c)     { return c & ~CAPACITY; }
    private static int workerCountOf(int c)  { return c & CAPACITY; }
    private static int ctlOf(int rs, int wc) { return rs | wc; }

    // 核心参数
    private final int corePoolSize;        // 核心线程数
    private final int maximumPoolSize;      // 最大线程数
    private final long keepAliveTime;       // 非核心线程空闲存活时间
    private final TimeUnit unit;
    private final BlockingQueue<Runnable> workQueue; // 阻塞队列
    private final ThreadFactory threadFactory;       // 线程创建工厂
    private volatile RejectedExecutionHandler handler; // 拒绝策略

    // Worker工作线程集合
    private final HashSet<Worker> workers = new HashSet<>();
    private final ReentrantLock mainLock = new ReentrantLock();
    private Condition termination = mainLock.newCondition();
}
```

### 核心变量解读

1. **ctl 原子复合变量设计精髓**
   用一个 `AtomicInteger` 同时存储 **运行状态 + 当前工作线程总数**，通过位运算拆分，保证CAS操作原子性，避免多线程下两次独立变量更新出现数据不一致。
2. 状态流转不可逆：
   `RUNNING → SHUTDOWN → STOP → TIDYING → TERMINATED`

## 2. 核心内部类 Worker 源码（线程复用的根本）

```
private final class Worker extends AbstractQueuedSynchronizer implements Runnable {
    final Thread thread; // 绑定的执行线程
    Runnable firstTask;  // 第一个执行任务
    volatile long completedTasks; // 完成任务计数器

    Worker(Runnable firstTask) {
        setState(-1); // 初始禁止中断，防止线程刚创建就被中断
        this.firstTask = firstTask;
        this.thread = getThreadFactory().newThread(this);
    }

    // 线程启动入口，run() 委托runWorker
    public void run() {
        runWorker(this);
    }

    // AQS独占锁实现：锁用于标记线程是否正在执行任务
    protected boolean isHeldExclusively() { return getState() != 0; }
    protected boolean tryAcquire(int unused) {
        if (compareAndSetState(0, 1)) {
            setExclusiveOwnerThread(Thread.currentThread());
            return true;
        }
        return false;
    }
    protected boolean tryRelease(int unused) {
        setExclusiveOwnerThread(null);
        setState(0);
        return true;
    }
    public void lock()        { acquire(1); }
    public boolean tryLock()  { return tryAcquire(1); }
    public void unlock()      { release(1); }
    public boolean isLocked() { return isHeldExclusively(); }

    // 关闭时中断线程
    void interruptIfStarted() {
        Thread t = thread;
        if (getState() >= 0 && t != null && !t.isInterrupted()) {
            t.interrupt();
        }
    }
}
```

### Worker 设计3个关键点

1. 继承AQS自定义独占锁：**加锁=正在执行任务；解锁=空闲**，`shutdown()` 时只会中断空闲Worker，不会打断正在运行的业务任务；
2. 构造方法 `setState(-1)`：规避线程启动前被外部中断；
3. 自身实现Runnable，线程start后执行`runWorker()`循环拉取任务，实现**线程复用**。

## 3. 入口方法 execute() 完整源码+三段式逻辑拆解

```
public void execute(Runnable command) {
    if (command == null)
        throw new NullPointerException();
    int c = ctl.get();

    // 分支1：当前工作线程 < 核心线程数 → 直接新建核心线程执行
    if (workerCountOf(c) < corePoolSize) {
        if (addWorker(command, true))
            return;
        c = ctl.get(); // 添加失败，重新读取ctl
    }

    // 分支2：核心线程已满，线程池RUNNING状态，任务入阻塞队列
    if (isRunning(c) && workQueue.offer(command)) {
        int recheck = ctl.get();
        // 二次校验：线程池已关闭，移除任务执行拒绝策略
        if (! isRunning(recheck) && remove(command))
            reject(command);
        // 队列有任务但无存活线程，兜底创建一个非核心线程
        else if (workerCountOf(recheck) == 0)
            addWorker(null, false);
    }

    // 分支3：队列也满了，尝试创建非核心线程；失败执行拒绝策略
    else if (!addWorker(command, false))
        reject(command);
}
```

### 三段执行规则（背诵版）

1. 线程数 < corePoolSize → 创建核心线程；
2. 核心线程满，队列未满 → 任务丢阻塞队列；
3. 队列已满，线程数 < maximumPoolSize → 创建非核心线程；
4. 总线程达到max → 触发拒绝策略。

## 4. addWorker 创建工作线程源码

```
private boolean addWorker(Runnable firstTask, boolean core) {
    retry:
    for (;;) {
        int c = ctl.get();
        int rs = runStateOf(c);

        // 状态校验：SHUTDOWN及以上，不新建线程（特殊：SHUTDOWN+队列有任务可建）
        if (rs >= SHUTDOWN &&
            ! (rs == SHUTDOWN && firstTask == null && ! workQueue.isEmpty()))
            return false;

        for (;;) {
            int wc = workerCountOf(c);
            // 超过容量、超过核心/最大线程数，直接返回
            if (wc >= CAPACITY ||
                wc >= (core ? corePoolSize : maximumPoolSize))
                return false;
            // CAS递增线程计数，跳出循环
            if (ctl.compareAndSet(c, ctlOf(rs, wc + 1)))
                break retry;
            c = ctl.get();
            if (runStateOf(c) != rs)
                continue retry;
        }
    }

    // CAS计数成功，实例化Worker
    Worker w = new Worker(firstTask);
    Thread t = w.thread;
    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        int rs = runStateOf(ctl.get());
        if (rs < SHUTDOWN ||
            (rs == SHUTDOWN && firstTask == null)) {
            if (t.isAlive())
                throw new IllegalThreadStateException();
            workers.add(w);
        } else {
            return false;
        }
    } finally {
        mainLock.unlock();
    }
    t.start(); // 启动线程，执行Worker.run() → runWorker()
    return true;
}
```

## 5. 核心循环 runWorker() 线程复用逻辑（重中之重）

```
final void runWorker(Worker w) {
    Thread wt = Thread.currentThread();
    Runnable task = w.firstTask;
    w.firstTask = null;
    w.unlock(); // 释放初始-1状态，允许外部中断
    boolean completedAbruptly = true;
    try {
        // 循环：当前任务不为空 或者 从队列获取到任务
        while (task != null || (task = getTask()) != null) {
            w.lock(); // 加锁标记正在执行任务
            // 线程池STOP状态强制中断
            if ((runStateAtLeast(ctl.get(), STOP) ||
                 (Thread.interrupted() && runStateAtLeast(ctl.get(), STOP)))
                && !wt.isInterrupted())
                wt.interrupt();

            try {
                beforeExecute(wt, task); // 前置钩子
                Throwable thrown = null;
                try {
                    task.run(); // 执行用户任务
                } catch (RuntimeException x) {
                    thrown = x; throw x;
                } catch (Error x) {
                    thrown = x; throw x;
                } catch (Throwable x) {
                    thrown = x; throw new Error(x);
                } finally {
                    afterExecute(task, thrown); // 后置钩子
                }
            } finally {
                task = null;
                w.completedTasks++;
                w.unlock(); // 解锁变为空闲状态
            }
        }
        completedAbruptly = false;
    } finally {
        processWorkerExit(w, completedAbruptly); // 线程退出销毁
    }
}
```

### 逻辑总结

Worker 死循环调用 `getTask()` 从阻塞队列拉取任务，有任务就执行，无任务阻塞等待；一旦`getTask()`返回null，当前线程销毁。

## 6. getTask() 空闲线程回收源码（区分核心/非核心线程）

```
private Runnable getTask() {
    boolean timed = false; // 是否开启超时控制
    for (;;) {
        int c = ctl.get();
        int rs = runStateOf(c);

        // 线程池STOP及以上 或 SHUTDOWN且队列为空，返回null销毁线程
        if (rs >= SHUTDOWN && (rs >= STOP || workQueue.isEmpty())) {
            decrementWorkerCount();
            return null;
        }

        int wc = workerCountOf(c);
        // 开启超时：线程数>核心线程数 或者 核心线程允许超时
        timed = wc > corePoolSize || allowCoreThreadTimeOut;

        Runnable r = null;
        try {
            // 超时阻塞拉取（非核心） / 永久阻塞（核心）
            if (timed)
                r = workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS);
            else
                r = workQueue.take();
        } catch (InterruptedException x) {
            continue;
        }

        // 超时没拿到任务，返回null，销毁当前线程
        if (r != null)
            return r;
        if (timed && wc > corePoolSize) {
            decrementWorkerCount();
            return null;
        }
    }
}
```

### 关键结论

1. 线程数 ≤ corePoolSize：`take()` 永久阻塞，**核心线程默认不会被回收**；
2. 线程数 > corePoolSize：`poll(keepAliveTime)` 超时等待，超时销毁非核心线程；
3. `allowCoreThreadTimeOut=true` 可以让核心线程也支持超时回收。

## 7. 四种拒绝策略源码极简

1. **AbortPolicy（默认）**：直接抛 `RejectedExecutionException`
2. **DiscardPolicy**：静默丢弃任务，无任何异常
3. **DiscardOldestPolicy**：丢弃队列队首最老任务，重试execute
4. **CallerRunsPolicy**：让提交任务的主线程执行该任务

## 8. 高频面试答疑（ThreadPoolExecutor专属）

### Q1 为什么Worker要继承AQS？

答：用AQS独占锁标记线程工作状态，`lock()`代表正在执行业务，`unlock()`代表空闲。调用`shutdown()`时只会中断空闲Worker，避免粗暴打断运行中的任务。

### Q2 核心线程为什么默认不会销毁？

答：`getTask()`中核心线程执行`workQueue.take()`无限阻塞，只有队列有任务才被唤醒，无任务时挂起不占用CPU，不会退出循环。

### Q3 ctl为什么要用复合原子变量？

答：状态和线程数量必须原子更新，分开两个变量会出现并发不一致，CAS一次修改int保证线程安全。

### Q4 shutdown() 和 shutdownNow() 区别？

- shutdown：状态切SHUTDOWN，不再接收新任务，执行完队列剩余任务，中断空闲线程；
- shutdownNow：状态切STOP，清空队列，中断所有正在执行的Worker，返回未执行任务列表。

---