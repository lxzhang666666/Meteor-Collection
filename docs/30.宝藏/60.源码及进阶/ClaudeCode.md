# Java后端工程师精通 Claude Code 完整体系

## 一、先铺垫：我对Claude Code的整体使用架构（开场定调）

日常分为三层使用：

1. **规则约束层**：`CLAUDE.md` 项目全局规则 + `.claudeignore` 忽略文件，强制AI遵循团队Java编码规范；
2. **CLI执行层**：终端`claude`命令做批量文件修改、预览、重构、审计；
3. **IDE辅助层**：VS Code/IDEA插件做单文件调试、代码解释、局部优化；
   配套分工：简单CRUD、行内补全交给Codex驱动的GitHub Copilot，**架构重构、多文件联动、底层排查、工程化脚本全部交由Claude Code**。

---

# 二、Java开发 7大核心精通技能（用法+落地场景+核心配置）

## 技能1：项目规则固化 —— CLAUDE.md 强制约束AI生成Java代码规范（最体现专业度）

### 作用

统一AI输出风格，解决多人协作代码混乱、Spring注解滥用、MyBatis写法不统一问题，相当于给AI定项目《编码手册》。

### 存放位置

项目根目录 `./CLAUDE.md`

### 核心配置模板（直接可背）

```
# 本项目Java开发强制规则
## 1. 项目分层（SpringBoot + Maven多模块）
严格DDD分层：Controller → DTO → Service → Impl → Mapper → PO/Entity/VO
禁止在Controller写业务逻辑，禁止Mapper嵌套复杂SQL。

## 2. Spring注解规范
1. @Transactional 仅加在public方法，必须配置rollbackFor = Exception.class
2. 禁止this内部调用事务方法，如需自调用使用ApplicationContext获取代理对象
3. 全局异常统一使用GlobalExceptionHandler，所有业务异常抛自定义BusinessException
4. 入参校验使用jakarta.validation，Controller加@Valid、@NotBlank、@NotNull等注解

## 3. MyBatis-Plus强制规范
1. 查询必须拼接逻辑删除条件：deleted = 0
2. 禁止在XML中直接拼接${}，动态条件使用<if>标签
3. LambdaQueryWrapper/LambdaUpdateWrapper优先使用，防止字段硬编码
4. Mapper接口只做数据库操作，分页统一封装PageHelper

## 4. 日志、命名、返回体规范
1. 所有类注入private static final Logger log = LoggerFactory.getLogger(XXX.class);
2. 接口统一返回Result<T>，包含code、msg、data、timestamp
3. 数据库实体实现Serializable，用于MyBatis二级缓存序列化
4. 工具类统一放在com.xxx.common.util包，禁止重复工具类

## 5. AI修改红线
1. 不得修改application.yml、bootstrap.yml数据库密钥、Redis密码
2. 不得新增未评审的Maven依赖，新增依赖必须标注用途
3. 修改前先执行编译校验，不产生语法错误
4. 批量修改超过5个文件必须拆分指令
```

### 落地场景

1. 微服务多Module统一代码风格，3个开发同时用Claude改造不会出现Git大量冲突；
2. AI自动规避Spring事务失效、MP SQL注入、二级缓存序列化等经典Java坑；
3. 新人接手项目，AI自动按照既定架构生成代码，降低学习成本。

### 配套忽略文件 .claudeignore

```
target/
.idea/
.git/
*.yml
*.properties
docker/secrets/
```

**核心目的**：屏蔽配置文件、密钥、编译产物，杜绝敏感信息上传云端，应对企业安全要求。

---

## 技能2：CLI高阶命令体系（面试官最爱追问实操指令）

### 基础必用指令

1. 预览修改（Dry Run，安全第一）

```
claude --dry-run "重构订单模块，统一异常处理，给所有Service添加事务注解"
```

**场景**：大规模重构前先看AI改了哪些文件，避免一键改崩项目，体现风险意识。

2. 限定指定包路径修改（精准控制范围）

```
claude "只修改com.xxx.user包，给所有Mapper生成JUnit5+Mockito单元测试"
```

3. 只分析不改动，做代码评审

```
claude --analyze "扫描整个项目，找出SQL注入、线程池未关闭、@Transactional误用、空指针风险"
```

4. 生成工程化全套产物（Java后端高频）

```
claude "基于User.java实体，生成建表SQL、Controller、Service、Mapper、分页接口、Redis缓存逻辑、Dockerfile、JVM ZGC启动参数"
```

### 进阶批量重构指令（体现深度）

```
claude "将项目所有for循环改为Stream流式写法，统一日期工具类，替换所有SimpleDateFormat为DateTimeFormatter，修复并发线程安全问题"
```

### 面试一句话亮点

我所有批量文件操作都会先 `--dry-run` 预览，限定包路径，配合`.claudeignore`屏蔽配置文件，从源头控制AI越界修改、泄露密钥两大风险。

---

## 技能3：Java遗留项目DDD分层重构（Claude Code 碾压Codex核心场景）

### 使用方法

1. 上传整个Maven多模块工程；
2. 加载CLAUDE.md规则；
3. 分段下发重构指令，不要一次性全量重构。

### 标准指令示例

>
> 对com.xxx.order订单模块做DDD领域驱动重构：
>
>
> 1. 拆分为应用层、领域层、基础设施层；
> 2. 抽取订单领域实体、值对象、仓储接口；
> 3. 统一分布式锁Redisson实现，保证下单幂等；
> 4. 所有接口增加参数校验、全局日志、事务控制；
> 5. 输出重构后包结构图和改动说明。

### 落地场景

接手5年以上老旧单体SpringBoot项目，耦合严重、没有分层、事务混乱，人工重构3-5天，Claude Code半天完成多文件联动修改，自动处理类导入、依赖引用、方法调用断裂问题。

### Codex短板对比

Codex（Copilot）只能单文件修改，看不到全局依赖，重构后大量导包报错、方法找不到，几乎无法做架构级改造。

---

## 技能4：Spring 疑难BUG深度排查 + 框架底层源码拆解（Java后端核心竞争力）

### 使用方法两种模式

#### 模式1：粘贴异常堆栈一键定位根因

直接把OOM堆栈、事务失效、MyBatis缓存脏数据、Redis序列化异常、AOP拦截失效日志丢进去，指令模板：

>
> 分析这段Java异常堆栈，给出3种可能原因、修复代码、单元测试验证方法、长期规避规范。

#### 模式2：拆解底层源码，梳理面试原理

指令示例：

>
> 完整拆解MyBatis Mapper动态代理执行链路，画出MapperProxy → MapperMethod → BaseExecutor → 一级缓存 → 二级缓存完整调用流程，标注二级缓存TransactionalCache事务提交刷新机制。

### 高频Java排查场景（直接背）

1. `@Transactional` 失效：非public、this自调用、受检异常未回滚、传播行为配置错误；
2. MyBatis一级缓存跨SqlSession失效、二级缓存namespace整体清空脏数据；
3. JVM GC频繁、ZGC参数配置不合理、线程池内存泄漏；
4. Spring循环依赖、三级缓存解决原理；
5. Redisson分布式锁可重入、锁超时、死锁问题修复。

### 面试官加分点

Codex只能给修复代码，但不会讲底层原理；我用Claude Code不仅修复BUG，还会让它输出**底层执行机制、面试考点、避坑规范**，反向巩固自己的Java底层功底。

---

## 技能5：批量自动化单元测试生成（补齐Java项目测试短板）

### 使用方法

指定Service/Mapper路径，要求使用Mockito + JUnit5，覆盖分支、异常、事务回滚场景。

### 指令模板

>
> 给OrderPayServiceImpl编写单元测试，覆盖：正常支付、余额不足抛出业务异常、重复下单幂等拦截、异常触发事务回滚4个场景，使用Mockito模拟Mapper和Redis，添加Assert断言。

### 落地场景

1. 业务迭代后快速补齐测试用例，提升Jacoco覆盖率；
2. Mapper接口、定时任务、工具类批量生成边界测试；
3. AI写完测试用例后我人工Review，避免测试逻辑流于形式。

### 规范约束（写在CLAUDE.md里）

- 单元测试类放在src/test/java对应包下；
- 外部依赖全部Mockito Mock；
- 必须校验事务是否回滚、缓存是否清理。

---

## 技能6：Docker + Maven + JVM 工程化全套脚本生成（后端运维一体化）

### 使用方法

基于SpringBoot打包规则，一键生成部署整套配置。

#### 指令1：Docker打包与JVM调优

>
> 为当前SpringBoot项目编写Dockerfile、docker-compose.yml，使用分层构建减小镜像体积，JVM参数配置ZGC垃圾回收，设置Xms/Xmx，添加GC日志输出，适配Linux生产环境。

#### 指令2：Maven依赖治理

>
> 扫描pom.xml所有子模块，解决依赖版本冲突、重复依赖、未声明依赖，输出优化后的pom文件和依赖树说明。

### 核心配置要点（面试可讲）

1. Dockerfile采用多阶段构建，剥离JDK环境，降低镜像大小；
2. JVM参数统一使用ZGC，适配高并发微服务，设置GC日志便于线上排查；
3. Maven统一dependencyManagement版本锁定，杜绝版本漂移。

---

## 技能7：代码安全审计与技术债务清理（企业级价值）

### 使用指令

```
claude "全局审计项目所有Java代码，检查以下风险点并输出修复版本：
1. MyBatis ${}动态拼接导致SQL注入；
2. IO流、连接未关闭造成资源泄漏；
3. 线程池未手动销毁、无拒绝策略；
4. 密码、密钥硬编码；
5. 接口未做入参校验、越权访问漏洞；
6. 循环依赖、无用import、冗余工具类。"
```

### 落地价值

1. 上线前做安全扫描，减少渗透测试漏洞；
2. 清理多年迭代积累的技术债务，统一代码口径；
3. 形成审计报告，提交给团队做代码规范升级。

---

# 三、Claude Code 完整环境核心配置清单（面试官一问就显精通）

## 1. 环境变量配置（Linux/Mac终端）

```
# Claude Code API密钥配置
export CLAUDE_API_KEY="sk-xxx"
# 最大上下文读取文件数量，大型Maven项目调高
export CLAUDE_MAX_FILES=200
# 禁止自动提交修改，强制人工确认
export CLAUDE_AUTO_APPLY=false
```

## 2. 项目三大核心约束文件（固定三件套）

1. `CLAUDE.md`：Java代码架构、框架注解、MP写法、事务规则；
2. `.claudeignore`：屏蔽配置文件、密钥、编译产物、Git目录；
3. `.claude/config.yaml`（高级配置）

```
# 限制AI一次最多修改文件数
max_modified_files: 6
# 默认开启预览dry-run
default_dry_run: true
# 禁止自动新增Maven依赖
block_new_maven_dependencies: true
```

## 3. IDE插件配套配置（VS Code）

- 开启「项目规则自动加载」；
- 绑定`.claudeignore`过滤文件；
- 快捷键绑定`dry-run`预览命令。

---

# 四、Claude Code VS Codex（Copilot）最终结构化对比（面试背诵版）

| 维度 | OpenAI Codex（GitHub Copilot） | Claude Code（我深度落地用法） |
| --- | --- | --- |
| 核心定位 | 单文件局部代码补全引擎 | 项目级Agent重构与分析工作台 |
| Java适配 | 仅做CRUD、Lambda、SQL片段 | DDD重构、多Maven模块改造、Spring底层原理拆解 |
| 上下文能力 | 极小，无法感知全局依赖 | 百万Token读取整个工程，跨文件联动修改 |
| 成本模式 | 按月订阅，无限次调用 | 按Token计费，复杂Java重构消耗更高 |
| 安全管控 | 可关闭云端上传，内网更友好 | 需上传项目源码，涉密系统仅片段分析 |
| 学习门槛 | 零成本开箱即用 | CLI指令+规则文件配置，需要体系化规范 |
| 擅长场景 | 日常开发样板代码、快速敲代码 | BUG深度溯源、架构重构、测试批量生成、安全审计 |

### 分工策略（直接回答面试官）

1. **Codex（Copilot）**：日常写Controller入参、POJO、简单MP查询、Stream集合处理，利用毫秒级响应提升基础编码速度；
2. **Claude Code**：只投入高价值任务：遗留系统DDD拆分、疑难堆栈排查、单元测试批量生成、Docker/JVM部署脚本、全项目安全审计；
3. 管控底线：所有AI产出代码**人工终审**，核心交易、分布式事务、幂等逻辑自主手写，AI仅做评审和优化，杜绝技术债务与线上风险。

---

# 五、高频深挖面试题+标准答案（直接套用）

## 问题1：你配置过Claude Code的项目规则吗？怎么防止AI乱改项目、泄露密钥？

**回答**

1. 项目根目录创建`CLAUDE.md`，固化Java分层、Spring事务、MyBatis-Plus、日志返回体全套编码规则，约束AI修改边界；
2. 配置`.claudeignore`忽略yml配置、密钥文件、target编译目录、.git文件夹，避免敏感配置上传云端；
3. CLI命令强制先加`--dry-run`预览改动，限定修改包路径，在配置文件限制单次最大修改文件数量；
4. 内网涉密、金融资金系统不加载完整工程，只复制代码片段、异常堆栈做分析，从制度上规避数据安全风险。

## 问题2：用Claude做Spring事务相关代码重构，AI容易踩哪些坑？你如何校验？

**回答**
AI常犯4类错误：

1. `@Transactional`加到非public方法，AOP无法代理失效；
2. 同类内部this调用事务方法，绕过动态代理；
3. 未添加`rollbackFor = Exception.class`，受检异常不会回滚；
4. 嵌套事务传播行为REQUIRES_NEW、NESTED混用逻辑错误。
   我的校验方式：重构后逐行检查注解修饰符、调用方式，编写单元测试手动抛出异常验证事务是否正常回滚，同时把校验规则写入CLAUDE.md让AI后续自动规避。

## 问题3：多人团队使用Claude Code，如何统一代码风格，减少Git冲突？

1. 全团队共用一套`CLAUDE.md`规则，统一Spring注解、MP写法、异常封装、日志格式；
2. 拆分工具：简单编码统一用Copilot（Codex），只有单一负责人用Claude做批量重构；
3. 批量修改6个文件以上强制拆分指令，提交单独MR重点评审依赖新增、类结构改动；
4. 禁止多人同时用Claude修改同一个模块，降低合并冲突概率。

## 问题4：会不会依赖Claude导致Java底层能力退化？你怎么平衡工具与人的思考？

**回答**
我给自己定了三条硬性原则：

1. **架构顶层设计100%自主**：微服务拆分、分库分表、Seata分布式事务、缓存架构全部自己设计，AI只做落地代码实现；
2. **AI输出必反向学习**：让Claude写完复杂代码后，强制输出底层原理、并发风险、JVM参数逻辑，把工具当成结对编程导师；
3. **核心业务手写兜底**：支付、退款、幂等、对账、定时任务等资金链路代码自己编写，AI仅做代码评审、漏洞扫描、单元测试补充；
   工具只解放重复劳动，底层原理和业务边界永远由人把控。

---

# 六、30秒终极口述总结（面试收尾用）

在Java后端开发中，我将Claude Code定位为**项目级重构与深度问题分析的专业Agent工具**，通过`CLAUDE.md`编码规则文件、`.claudeignore`安全过滤、CLI预览执行三层体系管控它的输出，主要用于老旧SpringBoot项目DDD分层改造、Spring/MyBatis底层BUG溯源、批量单元测试生成、容器化部署脚本和代码安全审计；而日常简单CRUD、行内代码补全交由Codex驱动的GitHub Copilot完成，形成高低搭配的AI开发流水线，同时严格执行人工终审、核心业务自主编写、涉密项目隔离使用的风险管控规范，既提升开发效率，又不丢失自身底层技术架构把控能力。

------


# 面试完整版：Claude Code 四大核心技能组合
Superpowers + Context7 + Performance-Analyzer + pr-review-toolkit
统一包含：**安装命令、调用方式、Java后端真实场景、面试官高频提问&满分回答**

## 通用前置：技能安装基础命令
```bash
# 1. 查看已安装所有技能
skills list

# 2. 安装四大核心全套
npx skills add obra/superpowers
npx skills add context7
npx skills add performance-analyzer
npx skills add pr-review-toolkit

# 3. 卸载指令（备用）
skills remove xxx
```

---

# 一、Superpowers（工程标准化流水线套件，最核心）
## 1. 启用方式
```bash
# 全局激活Superpowers整套能力
/superpowers:using-superpowers
# 单个技能调用固定格式
/superpowers:技能名 具体需求
```

## 2. 14个内置高频Skill（Java后端只记8个最实用）
### （1）brainstorming 需求方案头脑风暴
**调用**
`/superpowers:brainstorming 设计订单支付防重复幂等机制`
**使用方法**
1. 自动读取项目现有组件：Redisson、MyBatis、全局异常、事务配置；
2. 自动输出多套技术方案（Redis令牌/数据库唯一索引/状态机）并对比优劣；
3. 生成设计文档归档，**必须人工确认方案后才允许编码**。
   **Java场景**
   支付、退款、库存扣减、Seata分布式事务、分库分表等高风险业务前期评审，避免AI写出有资金漏洞的代码。

### （2）writing-plans 大型任务拆解规划
**调用**
`/superpowers:writing-plans DDD重构老旧订单单体模块`
**使用方法**
把一次大重构拆解成顺序步骤：包分层→领域实体→仓储层改造→事务统一→MP逻辑删除→单元测试→代码评审。
**场景**
多年遗留SpringBoot单体拆微服务、Maven多模块代码统一整改，防止一次性批量改崩项目。

### （3）refactor-safely 安全无损重构
**调用**
`/superpowers:refactor-safely 将订单Service中多层if else改为策略模式，保证原有逻辑不变`
**使用方法**
重构前后自动执行 `mvn test` 校验行为一致性，只改代码结构不改业务输出。
**场景**
消除N+1查询、替换SimpleDateFormat、抽取公共工具类、消除循环依赖。

### （4）test-driven-development TDD测试驱动开发（面试含金量最高）
**调用**
`/superpowers:test-driven-development 用户余额扣减业务实现`
**固定流程**
1. 先写 JUnit5 + Mockito 测试用例（正常扣款、余额不足、重复请求、事务回滚）；
2. 再编写业务代码让用例全部跑通；
3. 最后精简重构代码。
   **场景**
   资金链路、库存、定时任务、第三方接口调用，提升Jacoco测试覆盖率，从源头规避逻辑BUG。

### （5）systematic-debugging 系统化深度排错
**调用**
`/superpowers:systematic-debugging 分析Spring事务回滚失败的异常堆栈`
**使用方法**
标准化四步：假设猜想→复现路径→根因定位→修复代码→测试验证，附带底层原理。
**Java高频场景**
- @Transactional失效（非public、this自调用、受检异常不回滚）
- MyBatis一二缓存脏数据
- JVM OOM、ZGC参数异常、线程池泄漏
- Redis序列化乱码、Redisson死锁

### （6）requesting-code-review 自动代码评审
**调用**
`/superpowers:requesting-code-review 评审com.order.service整个模块`
**审查Java维度**
Spring注解规范、MP SQL注入风险、N+1查询、IO未关闭、线程不安全、硬编码密钥、吞异常。

### （7）subagent-driven-development 多子代理并行开发
**调用**
`/superpowers:subagent-driven-development 并行完成用户CRUD、单元测试、MySQL建表SQL`
**场景**
微服务多模块同时开发，避免单轮上下文过载，提升大型脚手架生成效率。

### （8）verification-before-completion 完工前自动校验
**内置自动执行**
`mvn compile` 编译校验 + 单元测试运行 + 安全漏洞扫描 + 注释完整性检查。
**场景**
批量修改几十份Java文件后兜底，防止隐性语法错误与安全漏洞上线。

## 3. Superpowers 面试问答
### Q1：Superpowers和直接让Claude写代码最大区别是什么？
A：普通提问是AI直接输出代码，容易逻辑考虑不全；Superpowers强制走**先方案设计→任务拆解→TDD编码→安全重构→自动化测试→代码评审**完整软件工程闭环，所有改动可追溯、可验证，尤其Java资金类、事务类高风险模块能极大降低人为疏漏。

### Q2：用Superpowers做TDD在Java项目里解决了什么痛点？
A：后端普遍重编码、轻测试，TDD模式强制先写边界和异常测试用例，再实现业务，能保证事务回滚、幂等、并发异常都被覆盖，提高测试覆盖率，符合企业质量规范。

---

# 二、Context7 上下文持久化知识库（解决长会话失忆神器）
## 1. 安装&调用
```bash
npx skills add context7
# 查询项目知识库
/context7 query 查询项目中所有Redisson分布式锁的实现类
# 把项目规则入库
/context7 index .
```

## 2. 使用方法
1. 首次执行 `/context7 index .` 扫描整个Maven工程，把包结构、CLAUDE.md编码规范、数据库实体、工具类、配置规则存入向量持久化库；
2. 后续任意会话直接检索知识库，不需要反复粘贴规则、架构说明；
3. 超大项目减少Token消耗，避免上下文溢出。

## 3. Java后端落地场景
1. **老旧单体长期重构**：连续多日拆分DDD分层，AI不会忘记“禁止修改yml配置、事务必须加rollbackFor、MP强制逻辑删除”等约束；
2. **微服务多Module协作**：跨模块依赖、公共常量、工具类统一调取，不会出现导包错误；
3. **高频复用组件查询**：随时检索项目里已有的分布式锁、全局异常、分页工具、JWT拦截器，保证代码风格统一；
4. **新人接手项目**：一键生成项目架构说明、编码约束、技术栈全貌，降低上手成本。

## 4. 面试提问
### Q：为什么不用默认上下文，要额外装Context7？
A：默认会话关闭后记忆全部清空，大型Maven多模块项目每次重新加载CLAUDE.md和目录结构非常耗Token，还容易丢失约束；Context7做了项目知识库持久化，跨会话记忆架构与编码规范，重构稳定性更强，也减少AI越界修改风险。

---

# 三、Performance-Analyzer 代码性能分析工具
## 1. 安装与调用
```bash
npx skills add performance-analyzer
# 执行性能扫描
/performance-analyzer 分析com.order.service包性能瓶颈并输出优化方案
```

## 2. 使用方法
自动静态扫描Java代码，输出：问题代码行、性能影响、重构优化代码、优化原理。

## 3. Java精准排查场景（后端面试官最爱）
1. MyBatis N+1循环查询、未使用批量Batch插入/更新；
2. 循环内部new ObjectMapper、RedisTemplate、SimpleDateFormat，频繁创建重对象；
3. 字符串拼接大量使用`+`，未用StringBuilder/StringJoiner；
4. 线程池核心参数不合理、无拒绝策略导致任务堆积；
5. SQL缺少索引、分页不分页造成全表扫描；
6. 大对象未及时释放引发GC频繁、FullGC风险。

## 4. 面试回答模板
### Q：这个性能分析Skill在压测前怎么落地？
A：上线压测前对核心订单、支付、库存接口执行全局扫描，自动定位N+1查询、对象重复创建、线程池配置不当这类隐蔽性能问题，输出可直接替换的重构代码，提前解决接口RT过高、QPS上不去、JVM频繁GC的线上隐患。

---

# 四、pr-review-toolkit PR/MR代码评审工具箱
## 1. 安装与调用
```bash
npx skills add pr-review-toolkit
# 评审当前变更代码
/pr-review-toolkit review
# 专项测试覆盖率检查
/pr-review-toolkit test-coverage
```

## 2. 内置三大子能力
1. `pr-test-analyzer`：校验单元测试覆盖率、事务异常分支是否覆盖；
2. `silent-failure-hunter`：捕获空catch吞异常、无日志打印、静默失败；
3. `type-design-analyzer`：检查POJO/DTO/Entity设计规范、序列化实现。

## 3. Java落地场景
1. Git提交合并MR前自动化预审：检查try-catch只捕获不打日志，线上故障无法定位；
2. 校验@Transactional异常分支是否有测试用例覆盖，防止事务失效漏测；
3. 检查MyBatis实体是否实现Serializable，避免二级缓存序列化报错；
4. 拦截硬编码密码、SQL注入风险、未做参数校验的接口。

## 4. 面试提问
### Q：和Superpowers自带的review有什么区别？
A：Superpowers是开发过程中主动评审，pr-review-toolkit是**代码提交后、合并入主干前**的门禁式评审，侧重测试完整性、静默失败漏洞、POJO实体设计，作为CI流程的人工补充，守住上线最后一道质量关卡。

---

# 五、四大技能组合整体落地策略（面试终极背诵版）
1. **前期规划与标准化开发 → Superpowers**
   需求评审、DDD拆解、TDD测试驱动、安全重构、系统化排BUG，把AI开发纳入正规软件工程流程，管控高风险业务代码质量。

2. **长期项目架构记忆 → Context7**
   Maven多模块、遗留系统重构时持久化项目编码规范与组件结构，跨会话不丢失约束，降低Token损耗，保证代码一致性。

3. **性能瓶颈静态扫描 → Performance-Analyzer**
   核心业务上线前排查MyBatis、线程池、对象创建、SQL索引等Java典型性能问题，提前优化接口吞吐量。

4. **上线前最后质量门禁 → pr-review-toolkit**
   MR合并前自动检查测试覆盖率、吞异常漏洞、实体类设计、安全隐患，作为人工Code Review的辅助校验工具。

配套兜底规则：全部搭配项目根目录 `CLAUDE.md` 编码规范 + `.claudeignore` 屏蔽yml密钥、编译产物，形成一套完整、可管控、可审计的Claude Code Java后端AI开发体系。

---

# 六、一句话极简口述版（面试官直接加分）
我在Java后端项目里搭建了四层AI能力：用Superpowers做需求拆解、TDD开发、安全重构和标准化排错；用Context7持久化Maven项目架构，解决长会话失忆问题；用Performance-Analyzer扫描MyBatis N+1、线程池等性能隐患；最后通过pr-review-toolkit在MR合并前做上线门禁评审，再配合CLAUDE.md和忽略文件做安全管控，整套流程既提升开发效率，又严格把控代码质量、性能与线上风险。