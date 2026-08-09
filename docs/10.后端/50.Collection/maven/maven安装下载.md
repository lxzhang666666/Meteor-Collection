# maven

> Maven项目对象模型（POM）是一个项目管理工具软件，可以通过简短的信息描述来管理项目的构造，报告和文档。
> 除了具有构建程序的功能外，Maven还提供了高级项目管理工具。由于Maven的默认构建规则具有很高的可重用性，因此通常可以使用两到三行Maven构建脚本来构建简单的项目。由于Maven的面向项目的方法，许多ApacheJakarta项目在发布时都使用Maven，并且采用Maven的公司项目所占的比例持续增长。

## Maven是干什么用

### 功能一：

> Maven主要用于解决导入依赖于Java类的jar和编译Java项目的主要问题。（最早手动导入jar，并使用Ant编译Java项目）
> 依赖的jar包由pom.xml文件中的dependency属性管理，并且jar包包含类文件和一些必要的资源文件。当然，它可以构建项目，管理依赖关系并生成简单的单元测试报告。

### 功能二：

> 例如，上一个项目导入了jar。它通过副本导入到项目中，并且jar之间存在依赖关系和冲突。Maven解决了这些问题，但是当互联网速度不佳时，这很烦人。使用专用服务器关系解决此问题。

### 功能三：

> Jar包管理，以防止jar之间的依赖关系冲突。在组之间建立私有服务。每个人都使用通用的maven配置文件，而不是手动下载jar。pom文件将自动管理下载的jar包。

### 功能四：

> Maven是基于项目对象模型的软件项目管理工具，可以通过一小段描述信息来管理项目的构造，报告和文档。Maven可以轻松地帮助您管理项目报告，生成站点，管理jar文件等。例如：项目开发中的第三方jar引用。在开发过程中，合作成员引用的jar版本可能会有所不同，并且同一jar的不同版本可能会重复引用。可以通过使用Maven关联jar来配置引用的jar的版本，以避免冲突。

## maven下载

Maven 官方下载地址：http://maven.apache.org/download.cgi，进入下载页面，找到下载文件，如下所示：
![image](http://mvnbook.com/static/image/maven-down.png)

## maven 安装

下载完 Maven 之后，解压即可，如下图所示：
![image](http://mvnbook.com/static/image/maven-decompression.png)

## Maven 配置环境变量

环境变量，顾名思义，是一种变量，用于提供环境信息。它是给谁提供环境信息呢？答案是：命令行程序。
我们在命令行程序中执行某个命令的时候，操作系统是如何知道这个命令所对应的程序呢？这个时候，环境变量就被派上了用场。命令行程序从环境变量中找到这个命令所对应的程序，然后执行此程序。
接下来，我们需要配置Maven的环境变量。
第一步，新建第一个环境变量MAVEN_HOME，如下所示：
![image](http://mvnbook.com/static/image/maven-environment-variable.png)
变量名：MAVEN_HOME
变量值：E:\maven2022\apache-maven-3.8.5
提醒：变量值部分根据自己的情况，自行设置即可，也就是Maven的解压文件目录。
第二步，编辑Path变量，新增：%MAVEN_HOME%\bin，如下所示：
![image](http://mvnbook.com/static/image/maven-path-environment-variable.png)

> 提醒：
> 当项目比较大时，使用Maven生成项目需要占用大量内存，如果超过Java默认的最大可用内存，则会报java.lang.OutOfMemeoryError。 解决此问题为设置MAVEN_OPTS环境变量，此方法一次设定，一劳永逸，为推荐方法。
> MAVEN_OPTS环境变量设置方法：在环境变量中添加一个新变量名为MAVEN_OPTS,值为-Xms128m -Xmx512m（数值可以自定义，Xms为初始内存，即最小内存，Xmx为最大内存）
> ![image](http://mvnbook.com/static/image/maven-opts.png)

最后，验证是否安装成功。现在我们打开 cmd，输入：
`mvn -v `
我想你一定会看到一些信息，如下图所示：
![image](http://mvnbook.com/static/image/maven.png)
恭喜你，Maven 安装成功！

