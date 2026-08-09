# Maven

## **项目**

`<project>元素是描述符的根源。 下表列出了所有可能的子元素。`

| 元素 | 元素 | 描述 |
| --- | --- | --- |
| modelVersion                         | String                 | 声明这个pom符合那个maven版本的项目描述                                                                                         |
| Parent                               | Parent                 | 父项目，如果存在就直接说明并给出坐标（group ID, artifact ID ,version）                                                         |
| groupId                              | String                 | 一个项目的一个全局惟一的标识符。 正常的使用完全限定的包名来区别于其他项目(如类似的名称。 org.apache.maven )。                  |
| artifactId                           | String                 | 组ID之下的唯一模块ID，是在maven生成和引用的时候定位的唯一标识。（一般包括jar和源代码source）                                   |
| Version                              | String                 | 项目的版本                                                                                                                     |
| Packaging                            | String                 | 项目的打包类型 例如：jar、war、ear、pom。并且可以定制插件封装自己想要的类型。默认的类型是：jar                                 |
| Name                                 | String                 | 项目的全名                                                                                                                     |
| 描述                                 | String                 | 项目的描述                                                                                                                     |
| url                                  | String                 | 项目主页的网址默认值是：父路径+ (artifactId或 project.directory 属性)                                                          |
| inceptionYear                        | String                 | 生成版权声明等                                                                                                                 |
| organization                         | Organization           | 项目所属组织的各种属性（版权声明和链接等）                                                                                     |
| licenses/license*                    | List          | 项目许可授权等                                                                                                                 |
| developers/developer*                | List        | 项目开发者                                                                                                                     |
| contributors/contributor*            | List      | 贡献者                                                                                                                         |
| mailingLists/mailingList*            | List      | 项目邮件列表                                                                                                                   |
| Prerequisites                        | Prerequisites          | 项目构建的先决条件                                                                                                             |
| modules/module*                      | List           | 模块                                                                                                                           |
| Scm                                  | Scm                    | 规范使用的SCM项目,如CVS,Subversion等。                                                                                         |
| issueManagement                      | IssueManagement        | 项目信息管理                                                                                                                   |
| ciManagement                         | CiManagement           | 项目持续集成信息                                                                                                               |
| distributionManagement               | DistributionManagement | 项目部署管理                                                                                                                   |
| properties/key=value*                | Properties             | 属性配置项                                                                                                                     |
| dependencyManagement                 | DependencyManagement   | 默认继承这个项目的依赖关系，并且在当前pom文件中没有明确声明的依赖可以在此指定使用的具体版本                                    |
| dependencies/dependency*             | List       | 描述了当前项目的依赖关系                                                                                                       |
| repositories/repository*             | List       | 发现远程存储库列表和扩展的依赖关系。                                                                                           |
| pluginRepositories/pluginRepository* | List       | 发现插件的列表的远程存储库构建和报                                                                                             |
| build                                | Build                  | 构建项目所需的信息。                                                                                                           |
| reports                              | DOM                    | 目前已经弃用                                                                                                                   |
| reporting                            | Reporting              | 这个元素包括报告的规范插件使用Maven-generated网站生成报告。 这些报告将运行当用户执行 mvn网站 。 所有的报告将包括在导航栏浏览。 |
| profiles/profile*                    | List          | 构建配置文件的清单，可以根据不同的环境配置不同的配置项信息。在构建过程中通过-P pid激活                                         |

## **Parent**

`<parent>父项目的标签，包含可以定位父项目的坐标。注：子元素已经固定不可扩展，并且必须是具体值。`

| 元素         | 类型   | 描述                                            |
| -------------- | -------- | ------------------------------------------------- |
| groupId      | String | 父项目的组ID                                    |
| artifactId   | String | 父项目的模块ID                                  |
| version      | String | 父项目的版本号                                  |
| relativePath | String | 父项目pom文件的相对路径默认值是 : . . / pom.xml |

## **组织**

指定的组织产生这个项目。

| 元素 | 类型   | 描述               |
| ------ | -------- | -------------------- |
| Name | String | 完整的组织的名称。 |
| url  | String | 组织的主页的网址。 |

## **许可证**

描述项目的许可。这是用于生成项目的授权页面的网站,除了考虑在其他报告和验证。为项目列出的许可项目本身,而不是依赖。

| 元素         | 类型   | 描述                                                                                                          |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| name         | String | 完整的法律许可的名称。                                                                                        |
| url          | String | 官方网址许可文本。                                                                                            |
| distribution | String | 这个项目的主要方法可能分布。**回购**可能从Maven存储库下载吗**手册**用户必须手动下载并安装的依赖。 |
| comments     | String | 附录信息与本授权。                                                                                            |

## **开发人员**

这个项目的提交者之一。

| 元素                  | 类型         | 描述               |
| ----------------------- | -------------- | -------------------- |
| Id                    | String       | 开发人的唯一身份ID |
| Name                  | String       | 开发人的全名       |
| Email                 | String       | 邮箱               |
| url                   | String       | 网站               |
| Organization          | String       | 所属组织           |
| organizationUrl       | String       | 组织地址           |
| roles/role*           | List | 角色               |
| Timezone              | String       | 时区               |
| properties/key=value* | Properties   | 配置项             |

## **邮寄名单**

这个元素描述所有与一个项目相关的邮件列表。自动生成网站引用这些信息。

| **元素**             | **类型** | **描述**                                                        | 
| ---------------------------- | ------ |---------------------------------------------------------------|
| name | String | 邮件列表名                                                         | 
| subscribe | String | 电子邮件地址或链接,可用于订阅邮件列表。如果这是一个电子邮件地址,一个 mailto:                   链接将自动创建文档时创建的。 |
| unsubscribe | String | 电子邮件地址或链接,可以用来取消订阅邮件列表。如果这是一个电子邮件地址,一个 mailto: 链接将自动创建文档时创建的。 |
| post | String | 电子邮件地址或链接,可用于发布的邮件列表。如果这是一个电子邮件地址,一个 mailto: 链接将自动创建文档时创建的。   | 
|archive | String | 链接到一个url可以浏览邮件列表归档                                            | 
| otherArchives/otherArchive* | List | URL备用链接                                                       |

## **先决条件**

描述项目的先决条件。

| 元素  | 类型   | 描述                                              |
| ------- | -------- | --------------------------------------------------- |
| maven | String | Maven插件工作所需要的maven的最低版本默认值是：2.0 |

## 供应链管理

《SCM》 元素包含所需信息的SCM(源代码控制管理)项目。

| 元素                | 类型   | 描述                                                                     |
| --------------------- | -------- | -------------------------------------------------------------------------- |
| Connection          | String | 源代码控制管理系统描述存储库URL以及如何连接到存储库中（只读）            |
| DeveloperConnection | Sring  | 就想connection但是不是只读的                                             |
| Tag                 | String | 当前代码的标签。 默认情况下,在开发过程中设置为自己的想法。默认值是：head |
| url                 | String | 项目的可浏览的SCM的URL存储库                                             |

## **issueManagement**

问题跟踪信息或bug跟踪系统用于管理这个项目。

| 元素   | 属性   | 描述         |
| -------- | -------- | -------------- |
| System | String | 项目管理名称 |
| url    | String | 项目管理地址 |

## **ciManagement**

`< CiManagement > 元素包含所需信息的持续集成系统项目`

| 元素                | 属性           | 描述                                                               |
| --------------------- | ---------------- | -------------------------------------------------------------------- |
| System              | String         | 持续集成的名字                                                     |
| url                 | String         | 持续集成的web页面地址                                              |
| Notifiers/notifier* | List | 配置通知开发人员/用户当构建失败,包括用户信息和通知模式（通知列表） |

## **通知人**

`<Notifier>配置一个方法通知用户/开发人员,如果构建失败。`

| 元素                     | 类型       | 描述                                    |
| -------------------------- | ------------ | ----------------------------------------- |
| 类型                     | String     | 通知方式默认是邮件                      |
| SendOnError              | Boolean    | 是否在error的时候发送通知默认为true     |
| sendOnFail               | Boolean    | --                                      |
| SendOnSuccess            | Boolean    | --                                      |
| sendOnWarning            | Boolean    | --                                      |
| Address                  | String     | 弃用 。 在哪里发送通知,如电子邮件地址。 |
| configuration/key=value* | Properties | 扩展配置特定于本通知。                  |

## distributionManagement

这个元素描述所有项目属于分布。 它主要是用于部署的工件和生成的网站建设。

| 元素               | 类型                 | 描述                                                                                             |
| -------------------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| Repository         | DeploymentRepository | 信息需要生成的工件项目部署到远程存储库。                                                         |
| snapshotRepository | DeploymentRepository | 在哪里部署工件的快照。 如果没有,它默认 < repository > 元素。                                     |
| Site               | Site                 | 部署项目的web站点所需的信息。                                                                    |
| downloadUrl        | String               | 项目的下载页面的URL。 如果没有用户将提到的主页 。 这是给协助定位构件库中没有由于许可限制。 |
| relocation         | relocation           | 工件的搬迁信息如果已经搬到一个新的组ID和/或工件ID。                                              |
| status             | String               |                                                                                                  |

## **存储库**

库包含部署所需的信息到远程存储库。

| 元素          | 类型             | 描述                                                                                                                                  |
| --------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| uniqueVersion | Boolean          | 是否为快照分配一个惟一的版本由时间戳和构建数字,或每次使用相同的版本默认值是 :true。                                                   |
| Releases      | RepositoryPolicy | 如何处理从这个存储库下载的版本。                                                                                                      |
| Snapshots     | RepositoryPolicy | 如何处理从这个存储库下载的快照。                                                                                                      |
| Id            | String           | 存储库的惟一标识符。 这是用于匹配的配置存储库 settings.xml 例如,文件。 此外,使用的标识符是在POM继承和注入检测存储库配置文件应该合并。 |
| name          | String           | 友好的名字                                                                                                                            |
| url           | String           | 存储库地址                                                                                                                            |
| Layout        | String           | 布局这个存储库使用的类型——可以定位和存储工件legacy or default默认值是:default。                                                     |

## **网站**

`<site>部署所需的信息网站。`

| 元素 | 类型   | 描述                                                                                                               |
| ------ | -------- | -------------------------------------------------------------------------------------------------------------------- |
| Id   | String | 部署的惟一标识符的位置。 这是用于匹配的网站配置 settings.xml 例如,文件。                                           |
| Name | String |                                                                                                                    |
| url  | String | 网站的url位置部署,在表单中 协议:/ /主机名/路径 。默认值是 :父母值(+路径调整)+(artifactId或 project.directory 属性) |

## **relocation**

描述一个工件已经采取行动。如果任何值都省略了,它被认为是与之前相同。

| 标签       | 类型   | 描述       |
| ------------ | -------- | ------------ |
| groupId    | String |            |
| artifactId | String |            |
| Version    | String |            |
| Message    | String | 额外的消息 |

## **dependencyManagement**

依赖的管理

| 元素                     | 类型             | 描述                                                                             |
| -------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| dependencies/dependency* | List | 这里指定的依赖关系不习惯直到POM中引用。 这允许一个“标准”版本的规范特定的依赖。 |

## **dependency**

项目的依赖描述

| 元素                  | 类型            | 描述                                                                                                                                                                               |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| groupId               | String          |                                                                                                                                                                                    |
| artifactId            | String          |                                                                                                                                                                                    |
| Version               | String          |                                                                                                                                                                                    |
| 类型                  | String          | 依赖类型默认是jar                                                                                                                                                                  |
| Classifier            | String          | 依赖分析器区分两个工件,属于同一POM但是建造不同。 例如, jdk14 和 jdk15 。例如,指连接构件 source 和 javadoc                                                                          |
| Scope                 | String          | 依赖的范围 编译 , 运行时 ,测试 ,系统 ,提供 。 用于计算各种类路径用于编译,测试,等等。 它也有助于确定哪些工件包括这个项目的分布。 有关更多信息,请参见 依赖机制 。 默认范围是 编译 。 |
| Systempath            | String          | 仅支持系统依赖，并且是绝对路径                                                                                                                                                     |
| exclusions/exclusion* | List | 用来忽略（排除）依赖中的某些子依赖                                                                                                                                                 |
| optional              | String          | 表明该库的依赖是可选的，决定是否会传递。另外虽然是字符串，但是语义上实际是Boolean类型的 默认是false（传递）                                                                        |

## exclusion

元素包含排除工件项目所需信息。（不需要版本号并且可以使用*排除所有）

| 元素       | 类型   | 描述       |
| ------------ | -------- | ------------ |
| artifactId | String | 排除的模块 |
| groupId    | String | 排除的组   |

## **repository**

存储库包含所需的信息与远程存储库建立连接。

| **标签**              | **类型**   | **描述**               | 
|------------------------------------------------------------------------------------ | ------------------ | ---------------------------------------------------------- |
| [releases](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_releases)   |
RepositoryPolicy | 控制怎么样从这个资源库下载版本 |
| [snapshots](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_snapshots) |
RepositoryPolicy | 控制怎么样从这个资源库下载快照 | | id | String | 存储库的唯一标识、 | | name | String | 名字 | | url |
String | 存储库地址 | | layout | String | 指定存储库使用的类型可以是legacyordefault默认值是default |

## **pluginRepository**

存储库包含所需的信息与远程存储库建立连接。

| **标签**           | **类型**   | **描述**       | 
|------------------------------------------------------------------------------------ |------------------ | ------------------------------------------------------------ |
| [releases](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_releases)   |
RepositoryPolicy | 控制怎么样从这个资源库下载版本 |
| [snapshots](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_snapshots) |
RepositoryPolicy | 控制怎么样从这个资源库下载快照 | | id | String | 存储的唯一ID，和setting文件中的profile对应 | | name | String
| 名字 | | url | String | 存储库地址protocol://hostname/path. | | layout | String | 指定存储库使用的类型可以是legacy or
default默认值是default |

## **build**

元素包含构建项目所需信息。超级POM中定义的默认值。

| 标签 | 类型 | 描述|
|--------------------------------------------------------------------------------------------------- | ------------------ |------------------------------------------------------------------------------------------------------------------------------------------------------------------------| 
| sourceDirectory | String | 该元素指定一个目录包含项目的来源。 生成的构建系统将从这个目录编译源代码时,项目建设。 给定的路径是相对于项目描述符。 默认值是 src/ main / java 。 | 
| scriptSourceDirectory | String | 该元素指定一个目录包含项目的脚本来源。这个目录从sourceDirectory是不同的,在将其内容复制到输出目录在大多数情况下(由于脚本解释而不是编译)。 默认值是 src / main / scripts 。 | 
|testSourceDirectory | String | 该元素指定一个目录包含项目的单元测试源。 生成的构建系统将编译项目正在测试时这些目录。 给定的路径是相对于项目描述符。 默认值是 src/test/ java 。 | 
| outputDirectory | String | 编译应用程序类放置的目录。 默认值是target/classes. | 
|testOutputDirectory | String | 编译测试类放置的目录。 默认值是target/test-classes. |
|extensions/[extension](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_extension)*| List | 用于构建扩展使用 | | defaultGoal | String | 默认目标Maven 2(或阶段)执行时没有指定的项目。请注意,对于多模块构建,只有顶级项目的默认目标是相关的,即孩子的默认目标模块将被忽略。 因为Maven 3,多个目标/阶段可以由空格隔开 |
|resources/[resource](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_resource)*| List | 这个元素描述了类路径的所有资源,如与一个项目相关的属性文件。 这些资源通常是包含在最终的方案。 默认是src/main/resources. | 
|testResources/[testResource](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_testResource)*| List | 这个元素描述所有的类路径等资源属性文件与一个项目相关的单元测试。 默认是src/test/resources. | 
| directory | String |生成的目录所有文件构建被放置。 默认值是target. | 
| finalName | String | 文件名(不包括扩展,没有路径信息),生产的工件将被称为。默认值是${artifactId}-${version}. | 
| filters/filter*| List | 过滤器属性的列表文件启用过滤时使用 |
| [pluginManagement](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_pluginManagement)| PluginManagement | 默认插件信息供参考的项目来源于这一个。 这个插件配置不会或绑定到生命周期得到解决,除非引用。 为给定的插件将会覆盖任何本地配置插件的完整定义。 | |plugins/[plugin](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_plugin)*| List | 插件列表 |

## **extension**

描述了一个构建扩展来使用。

| 标签       | 类型   | 描述                                      |
| ------------ | -------- | ------------------------------------------- |
| groupId    | String | The group ID of the extension's artifact. |
| artifactId | String | The artifact ID of the extension.         |
| version    | String | The version of the extension.             |

## **resource**

这个元素描述所有与一个项目相关的类路径资源或单元测试。

| 标签              | 类型         | 描述                                                                                                                                                                                                                                    |
| ------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| targetPath        | String       | 描述资源目标路径。 是相对于target / classes目录的路径(即。 $ { project.build.outputDirectory } )。 例如,如果您希望该资源出现在一个特定的包( org.apache.maven.messages ),您必须指定该元素的值: org/apache/maven/messages 。 这不是必需的 |
| filtering         | String       | 资源是否过滤用parameterised值替换标记。properties元素和属性的文件中列出 filters元素。 注意:虽然这个字段的类型 String 因为技术原因,语义类型实际上是 boolean 。 默认值是 false 。                                                         |
| directory         | String       | 描述资源存储的目录。 POM的路径是相对的。                                                                                                                                                                                                |
| includes/include* | List | 包含列表                                                                                                                                                                                                                                |
| excludes/exclude* | List | 忽略列表                                                                                                                                                                                                                                |

## **testResource**

这个元素描述所有与一个项目相关的类路径资源或单元测试。

| 标签              | 类型         | 描述 |
| ------------------- | -------------- | ------ |
| targetPath        | String       |
| filtering         | String       |
| directory         | String       |
| includes/include* | List | . |
| excludes/exclude* | List |

## **pluginManagement**

部分管理中使用的缺省插件信息

| 标签                                                                                  | 类型         | 描述           |
| --------------------------------------------------------------------------------------- | -------------- | ---------------- |
| plugins/[plugin](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_plugin)* | List | 使用的插件列表 |

## plugin

元素包含一个插件所需的信息。

| 标签                                                                                               | 类型                  | 描述 |
| ---------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| groupId                                                                                            | String                |
| artifactId                                                                                         | String                |
| version                                                                                            | String                | 版本(或有效范围的版本)的插件使用。 |
| extensions                                                                                         | String                | 是否加载Maven扩展处理程序(如包装和类型)从这个插件。 由于性能原因,这应该只在必要时启用。 注意:虽然这个字段的类型String 因为技术原因,语义类型实际上是 Boolean 。 默认值是false。 |
| executions/[execution](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_execution)*     | List | 多个规格的一组目标执行构建生命周期期间,每个有(可能)不同的配置。 |
| dependencies/[dependency](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_dependency)* | List      | 附加依赖项,这个项目需要介绍插件的类加载器。 |
| goals                                                                                              | DOM                   | 弃用 |
| inherited                                                                                          | String                | 配置是否可以传播到子项目注意:虽然这个字段的类型String因为技术原因,语义类型实际上是Boolean。 默认值是true。 |
| configuration                                                                                      | DOM                   | 待完成 |

## execution

元素包含所需信息的执行插件。

| 标签          | 类型         | 描述                                                                                                       |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| id            | String       | 标签的标识符的执行目标在构建和匹配执行合并在继承和概要文件注入。默认值是default                            |
| phase         | String       | 绑定目标的构建生命周期阶段执行。 如果省略,将被绑定到默认的目标阶段指定的插件。                             |
| goals/goal*   | List | 执行给定的配置                                                                                             |
| inherited     | String       | 配置是否可以传播到子项目注意:虽然这个字段的类型String因为技术原因,语义类型实际上是Boolean。 默认值是true。 |
| configuration | DOM          |

## reporting

部分的管理报告和它们的配置。

| 标签                                                                                  | 类型               | 描述                                                                                                                                                               |
| --------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| excludeDefaults                                                                       | String             | 如果这是真的,那么默认的报告不包括在站点的一代。 这包括报告的“项目信息”菜单。 注意:虽然这个字段的类型String因为技术原因,语义类型实际上是Boolean。 默认值是false。 |
| outputDirectory                                                                       | String             | 存储所有生成的报告的地址。 默认值是$ { project.build.directory } /site。                                                                                           |
| plugins/[plugin](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_plugin)* | List | 报告使用和配置插件。                                                                                                                                               |

## **plugin**

元素包含所需信息的报告插件。

| 标签                                                                                           | 类型            | 描述                                                         |
| ------------------------------------------------------------------------------------------------ | ----------------- | -------------------------------------------------------------- |
| groupId                                                                                        | String          | -                                                            |
| artifactId                                                                                     | String          | -                                                            |
| version                                                                                        | String          | -                                                            |
| reportSets/[reportSet](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_reportSet)* | List | **
报告生成的多种规则，每一个规则都不同，构建基本相同** |
| inherited                                                                                      | String          | -                                                            |
| configuration                                                                                  | DOM             | -                                                            |

## reportSet

表示一组报告和配置用于生成它们。

| 标签            | 类型         | 描述                                                                      |
| ----------------- | -------------- | --------------------------------------------------------------------------- |
| id              | String       | 这个报告的唯一id,在POM继承和概要文件注入用于合并的报告集。默认值是default |
| reports/report* | List | 这个插件的列表报告应该来自这个集合                                        |
| inherited       | String       | -                                                                         |
| configuration   | DOM          | -                                                                         |

## **profile**

修改的构建过程激活基于环境参数或命令行参数。

| 标签                                                                                                                 | 类型                   | 描述                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                                                                                                                   | String                 | 构建是的唯一标识，默认值是default                                                                                                                                                       |
| [activation](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_activation)                                 | Activation             | 激活的条件                                                                                                                                                                              |
| [build](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_build)                                           | BuildBase              | 项目构建所需的信息.                                                                                                                                                                     |
| modules/module*                                                                                                      | List           | 模块(有时称为子项目)建立作为这个项目的一部分。 每个模块是列出包含模块的目录的相对路径。 与默认url的计算方式一致的从父母,建议模块名称匹配工件id。                                        |
| [distributionManagement](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_distributionManagement)         | DistributionManagement | 项目分布信息,让网站的部署和工件分别到远程web服务器和存储库。                                                                                                                            |
| properties/key=value*                                                                                                | Properties             | 配置项                                                                                                                                                                                  |
| [dependencyManagement](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_dependencyManagement)             | DependencyManagement   | 默认继承这一项目的依赖信息。 在本节中不会立即解决的依赖关系。 相反,当一个POM源自这一声明依赖所描述的一个匹配的groupId,artifactId版本和从这个部分用于其他值,如果他们不是已经指定的依赖。 |
| dependencies/[dependency](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_dependency)*                   | List       | 这个元素描述所有与一个项目相关的依赖关系。 这些依赖关系是用来构造一个类路径在构建过程中为您的项目。 他们是自动从这个项目中定义的存储库下载。 看到 依赖机制 为更多的信息。               |
| repositories/[repository](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_repository)*                   | List       | 远程存储库列表和扩展的依赖关系                                                                                                                                                          |
| pluginRepositories/[pluginRepository](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_pluginRepository)* | List       | 插件的列表的远程存储库构建和报告。                                                                                                                                                      |
| reports                                                                                                              | DOM                    | 弃用                                                                                                                                                                                    |
| [reporting](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_reporting)                                   | Reporting              | 这个元素包括报告的规范插件使用Maven-generated网站生成报告。 这些报告将运行当用户执行mvn site。 所有的报告将包括在导航栏浏览。                                                           |

## **activation**

建立运行时环境中的条件将触发自动包含构建配置文件。可以定义多个条件,必须满足所有激活配置文件。

| 标签                                                                             | 类型               | 描述                                                                                                              |
| ---------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| activeByDefault                                                                  | boolean            | 默认是否激活，除非是用-p激活某个配置默认值是false                                                                 |
| jdk                                                                              | String             | 指定匹配的jdk例如, 1.4 只在jdk 1.4版本,激活 1.4 ! 匹配任何不是1.4版本的JDK。 支持范围: [1.5,) JDK 1.5最低时激活。 |
| [os](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_os)             | ActivationOS       | 指定该概要文件将被激活时检测到匹配的操作系统属性。                                                                |
| [property](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_property) | ActivationProperty | 指定该概要文件将被激活时,这个系统属性指定。                                                                       |
| [file](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_file)         | ActivationFile     | 指定这个档案将会激活基于文件的存在。                                                                              |

## **os**

这是一个催化剂,将检测操作系统的属性来激活自己的形象。

| 标签    | 类型   | 描述                                                                                      |
| --------- | -------- | ------------------------------------------------------------------------------------------- |
| name    | String | 操作系统的名称被用来激活配置文件。 这必须准确匹配 $ { os.name } Java属性,如 Windows XP 。 |
| family  | String | 操作系统的一般家庭用于激活配置文件,例如Windows或unix。                                    |
| arch    | String | 操作系统的架构用于激活配置文件。                                                          |
| version | String | 版本的操作系统被用来激活配置文件。                                                        |

## **property**

这是属性规范用于激活一个概要文件。如果该值字段为空,然后指定属性的存在将激活概要文件,否则它区分大小写的匹配属性值。

| 标签  | 类型   | 描述                 |
| ------- | -------- | ---------------------- |
| name  | String | 激活需要的必须属性名 |
| value | String | 激活需要的必须属性值 |

## **file**

这是文件规范用于激活配置文件。的missing值是一个文件的位置需要存在,如果它不,这个概要文件将被激活。另一方面,exists将测试存在的文件,如果是,这个概要文件将被激活。为这些文件规范仅限于变量插值$
{ basedir }系统属性和请求属性。

| 标签    | 类型   | 描述               |
| --------- | -------- | -------------------- |
| missing | String | 必须必能存在的文件 |
| exists  | String | 必须要存在的文件   |

## build

构建通用的信息。

|标签                                                                         |类型 | 描述|
| --------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| defaultGoal                                                                                             | String           | 默认目标Maven 2(或阶段)执行时没有指定的项目。请注意,对于多模块构建,只有顶级项目的默认目标是相关的,即孩子的默认目标模块将被忽略。因为Maven 3,多个目标/阶段可以由空格隔开 |
| resources/[resource](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_resource)*             | List   | 这个元素描述了类路径的所有资源,如与一个项目相关的属性文件。这些资源通常是包含在最终的方案。默认值是src/main/resources.                                                  |
| testResources/[testResource](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_testResource)* | List   | 这个元素描述所有的类路径等资源属性文件与一个项目相关的单元测试。默认值是src/test/resources.                                                                             |
| directory                                                                                               | String           | 成的目录所有文件构建被放置。默认值是target。                                                                                                                            |
| finalName                                                                                               | String           | 文件名(不包括扩展,没有路径信息),生产的工件将被称为。默认值是 ${artifactId}-${version}.                                                                                  |
| filters/filter*                                                                                         | List     | 过滤器属性的列表文件启用过滤时使用。                                                                                                                                    |
| [pluginManagement](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_pluginManagement)        | PluginManagement | 默认插件信息供参考的项目来源于这一个。这个插件配置不会或绑定到生命周期得到解决,除非引用。为给定的插件将会覆盖任何本地配置插件的完整定义。                               |
| plugins/[plugin](http://maven.apache.org/ref/3.5.0/maven-model/maven.html#class_plugin)*                   | List     | 使用的插件列表。                                                                                                                                                        |

