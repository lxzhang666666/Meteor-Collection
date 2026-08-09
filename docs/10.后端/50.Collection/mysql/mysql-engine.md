---
title: mysql-engine
date: 2026-08-09 14:56:24
permalink: /pages/1d1600/
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
# mysql
## 引擎 engine
> MyISAM、InnoDB、MERGE、MEMORY(HEAP)、BDB(BerkeleyDB)、EXAMPLE、FEDERATED、ARCHIVE、CSV、BLACKHOLE

<p>MySQL支持数个存储引擎作为对不同表的类型的处理器。MySQL存储引擎包括处理事务安全表的引擎和处理非事务安全表的引擎：</p>

<ul><li><p>MyISAM管理非事务表。它提供高速存储和检索，以及全文搜索能力。MyISAM在所有MySQL配置里被支持，它是默认的存储引擎，除非你配置MySQL默认使用另外一个引擎。</p>

</li><li><p>MEMORY存储引擎提供"内存中"表。MERGE存储引擎允许集合将被处理同样的MyISAM表作为一个单独的表。就像MyISAM一样，MEMORY和MERGE存储引擎处理非事务表，这两个引擎也都被默认包含在MySQL中。</p>

<p>注释：MEMORY存储引擎正式地被确定为HEAP引擎。

</p></li><li><p>InnoDB和BDB存储引擎提供事务安全表。BDB被包含在为支持它的操作系统发布的MySQL-Max二进制分发版里。InnoDB也默认被包括在所 有MySQL 5.1二进制分发版里，你可以按照喜好通过配置MySQL来允许或禁止任一引擎。

</p></li><li><p> EXAMPLE存储引擎是一个"存根"引擎，它不做什么。你可以用这个引擎创建表，但没有数据被存储于其中或从其中检索。这个引擎的目的是服务，在 MySQL源代码中的一个例子，它演示说明如何开始编写新存储引擎。同样，它的主要兴趣是对开发者。

</p></li><li><p> NDB Cluster是被MySQL Cluster用来实现分割到多台计算机上的表的存储引擎。它在MySQL-Max 5.1二进制分发版里提供。这个存储引擎当前只被Linux, Solaris, 和Mac OS X 支持。在未来的MySQL分发版中，我们想要添加其它平台对这个引擎的支持，包括Windows。

</p></li><li><p>ARCHIVE存储引擎被用来无索引地，非常小地覆盖存储的大量数据。

</p></li><li><p> CSV存储引擎把数据以逗号分隔的格式存储在文本文件中。

</p></li><li><p>BLACKHOLE存储引擎接受但不存储数据，并且检索总是返回一个空集。

</p></li><li><p>FEDERATED存储引擎把数据存在远程数据库中。在MySQL 5.1中，它只和MySQL一起工作，使用MySQL C Client API。在未来的分发版中，我们想要让它使用其它驱动器或客户端连接方法连接到另外的数据源。</p></li></ul>

### MyISAM 和 InnoBD
<table class="reference"> 
 <tbody> 
  <tr> 
   <td> <strong>&nbsp; </strong><br> <br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;<strong>MyISAM</strong><br> <br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;<strong>InnoDB</strong><br> <br> &nbsp;&nbsp; </td> 
  </tr> 
  <tr> 
   <td> &nbsp;&nbsp;<strong>构成上的区别：</strong><br> <br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;每个MyISAM在磁盘上存储成三个文件。第一个文件的名字以表的名字开始，扩展名指出文件类型。<br> <br> &nbsp;&nbsp;.frm文件存储表定义。<br> <br> &nbsp;&nbsp;数据文件的扩展名为.MYD (MYData)。<br> <br> &nbsp;&nbsp;索引文件的扩展名是.MYI (MYIndex)。<br> <br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;基于磁盘的资源是InnoDB表空间数据文件和它的日志文件，InnoDB 表的大小只受限于操作系统文件的大小，一般为 2GB<br> &nbsp;&nbsp; </td> 
  </tr> 
  <tr> 
   <td> &nbsp;&nbsp;<strong>事务处理上方面</strong><strong>:</strong><br> <br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;MyISAM类型的表强调的是性能，其执行数度比InnoDB类型更快，但是不提供事务支持<br> <br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;InnoDB提供事务支持事务，外部键（foreign key<span></span>）等高级数据库功能<br> <br> &nbsp;&nbsp; </td> 
  </tr> 
  <tr> 
   <td> &nbsp;&nbsp;<strong>SELECT&nbsp;&nbsp; UPDATE,INSERT</strong><strong>，</strong><strong>Delete</strong><strong>操作</strong><br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;如果执行大量的SELECT，MyISAM是更好的选择<br> <br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;<strong>1.</strong>如果你的数据执行大量的<strong>INSERT</strong><strong>或</strong><strong>UPDATE</strong>，出于性能方面的考虑，应该使用InnoDB表<br> <br> &nbsp;&nbsp;<strong>2.DELETE&nbsp;&nbsp; FROM table</strong>时，InnoDB不会重新建立表，而是一行一行的删除。<br> <br> &nbsp;&nbsp;<strong>3.LOAD&nbsp;&nbsp; TABLE FROM MASTER</strong>操作对InnoDB是不起作用的，解决方法是首先把InnoDB表改成MyISAM表，导入数据后再改成InnoDB表，但是对于使用的额外的InnoDB特性（例如外键）的表不适用<br> <br> &nbsp;&nbsp; </td> 
  </tr> 
  <tr> 
   <td> &nbsp;&nbsp;<strong>对</strong><strong>AUTO_INCREMENT</strong><strong>的操作</strong><br> <br> &nbsp;&nbsp;<br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;每表一个AUTO_INCREMEN列的内部处理。<br> <br> &nbsp;&nbsp;<strong>MyISAM</strong><strong>为</strong><strong>INSERT</strong><strong>和</strong><strong>UPDATE</strong><strong>操作自动更新这一列</strong>。这使得AUTO_INCREMENT列更快（至少10%）。在序列顶的值被删除之后就不能再利用。(当AUTO_INCREMENT列被定义为多列索引的最后一列，可以出现重使用从序列顶部删除的值的情况）。<br> <br> &nbsp;&nbsp;AUTO_INCREMENT值可用ALTER TABLE或myisamch来重置<br> <br> &nbsp;&nbsp;对于AUTO_INCREMENT类型的字段，InnoDB中必须包含只有该字段的索引，但是在MyISAM表中，可以和其他字段一起建立联合索引<br> <br> &nbsp;&nbsp;更好和更快的auto_increment处理<br> <br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;如果你为一个表指定AUTO_INCREMENT列，在数据词典里的InnoDB表句柄包含一个名为自动增长计数器的计数器，它被用在为该列赋新值。<br> <br> &nbsp;&nbsp;自动增长计数器仅被存储在主内存中，而不是存在磁盘上<br> <br> &nbsp;&nbsp;关于该计算器的算法实现，请参考<br> <br> &nbsp;&nbsp;<strong>AUTO_INCREMENT</strong><strong>列在</strong><strong>InnoDB</strong><strong>里如何工作</strong><br> <br> &nbsp;&nbsp; </td> 
  </tr> 
  <tr> 
   <td> &nbsp;&nbsp;<strong>表的具体行数</strong><br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;select count(*) from table,MyISAM只要简单的读出保存好的行数，注意的是，当count(*)语句包含&nbsp;&nbsp; where条件时，两种表的操作是一样的<br> <br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;InnoDB 中不保存表的具体行数，也就是说，执行select count(*) from table时，InnoDB要扫描一遍整个表来计算有多少行<br> <br> &nbsp;&nbsp; </td> 
  </tr> 
  <tr> 
   <td> &nbsp;&nbsp;<strong>锁</strong><br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;表锁<br> <br> &nbsp;&nbsp; </td> 
   <td> &nbsp;&nbsp;提供行锁(locking on row level)，提供与 Oracle 类型一致的不加锁读取(non-locking read in<br> &nbsp;&nbsp; SELECTs)，另外，InnoDB表的行锁也不是绝对的，如果在执行一个SQL语句时MySQL不能确定要扫描的范围，InnoDB表同样会锁全表， 例如update table set num=1 where name like "%aaa%" </td> 
  </tr> 
 </tbody> 
</table>




[参考文献](https://www.runoob.com/w3cnote/mysql-different-nnodb-myisam.html) https://www.runoob.com/w3cnote/mysql-different-nnodb-myisam.html