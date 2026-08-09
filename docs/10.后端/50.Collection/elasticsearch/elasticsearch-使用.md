# ElasticSearch

[官网](https://www.elastic.co/cn/elasticsearch)

> Elasticsearch 是一个分布式、RESTful 风格的搜索和数据分析引擎，能够解决不断涌现出的各种用例。 作为 Elastic Stack 的核心，它集中存储您的数据，帮助您发现意料之中以及意料之外的情况。

## ES 对比 MySql

| MySql         | ES                    |
|---------------|-----------------------| 
| database(数据库) | index(索引)             |  
| table(表)      | type(类型)              |
| row(行)        | document(文档)          |
| column(字段)    | field(字段)             |
| schema(图式)      | mapping(映射)           |
| index(索引)     | everything is indexed |
| sql           | query dsl             |


1. 创建索引：put  index_name

```shell
#创建索引
PUT /user

#创建索引，并指定配置  //number_of_shards 分片数 number_of_replicas 备份数
PUT /user        
{
  "settings":{
    "index":{
      "number_of_shards":3, 
      "number_of_replicas":1
    }
  }
}
```

2. 查询索引设置

```shell
#查看素有索引的设置
GET _all/_settings       

#单独查询某个索引的设置 
GET /user/_settings
```

2.1 映射
```text
1 映射分类
1.1 静态映射
1.2 动态映射
2 核心类型
2.1 字符串类型
2.2 数字类型
2.3 日期类型
2.4 布尔类型
2.5 binary 类型
2.6 range 类型
3 复合类型
3.1 数组类型
3.2 object 类型
3.3 nested 类型
4 地理类型
4.1 geo_point 地理坐标
4.2 geo_shape 地理图形
5 特殊类型
5.1 ip 类型
5.2token_count 类型
6. mapping 属性
```
### 映射分类
> 在 Elasticsearch 中，映射可分为动态映射和静态映射。在关系型数据库中写入数据之前首先要建表，在建表语句中声明字段的属性，在 Elasticsearch 中，则不必如此，Elasticsearch 最重要的功能之一就是让你尽可能快地开始探索数据，文档写入 Elasticsearch 中，它会根据字段的类型自动识别，这种机制称为动态映射，而静态映射则是写入数据之前对字段的属性进行手工设置。

### 静态映射
静态映射是在创建索引时手工指定索引映射，和 SQL 中在建表语句中指定字段属性类似。相比动态映射，通过静态映射可以添加更详细、更精准的配置信息，例子如下：
```shell
PUT /user/_mapping
{
  "properties": {
    "title": {
      "type": "text",
      "analyzer": "ik_max_word",
      "search_analyzer": "ik_smart",
      "similarity": "BM25",
      "store": true
    },
    "summary": {
      "type": "text",
      "analyzer": "ik_max_word",
      "search_analyzer": "ik_smart",
      "similarity": "BM25"
    },
    "content": {
      "type": "text",
      "analyzer": "ik_max_word",
      "search_analyzer": "ik_smart",
      "similarity": "BM25",
      "store": true
    }
  }
},
"question_and_anwser": {
  "_all": {
    "enabled": false
  },
  "properties": {
    "question": {
      "type": "text",
      "analyzer": "ik_max_word",
      "search_analyzer": "ik_smart",
      "similarity": "BM25"
    },
    "anwser": {
      "type": "text",
      "analyzer": "ik_max_word",
      "search_analyzer": "ik_smart",
      "similarity": "BM25"
    },
    "question_user_id": {
      "type": "long"
    },
    "anwser_user_id": {
      "type": "long"
    },
    "create_time": {
      "type": "date",
      "format": "strict_date_optional_time || epoch_mills"
    }
  }
}
```
```shell
#修改映射:新增字段
PUT user/userinfo/_mapping
{
  "properties": {
    "name":{
      "type": "text",
      "analyzer": "ik_max_word",
      "search_analyzer": "ik_smart",
      "similarity": "BM25",
      "store": true
    }
  }
}
```

3. 添加数据：POST

```shell
POST /user/userinfo/     
{
  "name":"water",
  "age":26,
  "birthday":"1999-11-11"
}
 
POST /user/userinfo/1   
{
  "name":"wate2r",
  "age":25,
  "birthday":"1999-12-12"
}


POST /user/userinfo/2   
{
  "name":"water11",
  "age":125,
  "birthday":"1999-12-12",
  "hight":12,
  "title":"adadsas"
}

POST /user/userinfo/3   
{
  "name":"water11",
  "age":26,
  "birthday":"1999-12-12",
  "hight":12,
  "title":"adadsa22ASASs"
}

#查询索引
GET /user/_search
{
  "query": {
    "match_all": {}
  }
}
```

4. 查询数据

```shell
GET /user/userinfo/sPz5_IIBwTSM86mMz6aH
 
GET /user/userinfo/1
```
4.1 带条件查询数据
```shell
GET user/userinfo/_search
#按name查找
GET user/userinfo/_search?q=name:water11  
#按interest查找，并按照height升序排序
GET user/userinfo/_search?q=name:water11&sort=age:asc   
```
4.2 query条件查询
4.2.1 term、terms、分页查询
> term、terms查询， query会去倒排索引中寻找确切的term，它并不知道分词器的存在，这种查询适合keyword、numeric、date等明确值的
分页： from、size，from  从第几条数据开始展示，size 一页展示多少条数据
```shell
#term：查询某个字段里含有某个关键词的文档
GET user/userinfo/_search
{
  "query":{
    "term":{"name":"water11"}
  }
}
 
 
#terms：查询某个字段里含有多个关键词的文档
GET user/userinfo/_search
{
  "query":{
    "terms":{
      "name":["water11","water"]
    }
  }
}
 
# //从第三条开始展示，索引从0开始计  //展示2条
GET user/userinfo/_search
{
  "from": 2, 
  "size":2,
  "query":{
    "terms":{
      "name":["water11","water"]
    }
  }
}
```
4.2.2 match、march_all查询
> match， query 知道分词器的存在，会对field进行分词操作，然后再查询，它和term区别可以理解为term是精确查询，这边match模糊查询。match_all用来查询全部。
```shell

```

5. 修改数据----PUT(覆盖数据)/POST(修改数据)

```shell
#覆盖数据
PUT /user/userinfo/1
{
    "name": "water11",
    "age": 24,
    "birthday": "1999-12-12",
    "work":"programmer"
}

#使用put修改对象字段，不仅可以修改字段的值，还可以添加或删除一些字段。如上面user1中_id=1的对象原来没有work属性，我们可以使用新的带有work属性的对象将它替换。
POST /user/userinfo/1/_update
{
  "doc": {"age":23}
}

#使用POST修改，需要使用_update函数，且将要修改字段包裹在 “doc”中 。注意，这里也可以为对象添加新的字段，如果“doc”中的字段，在目标对象中不存在，则会在目标对象中添加新的字段。
POST /user/userinfo/1/_update
{
  "doc": {"height":65}
}
```

6. 删除数据----DELETE

```shell
#删除数据
DELETE /user/userinfo/sPz5_IIBwTSM86mMz6aH
```

7. 批量查询数据multiGet

```shell
#批量查询
GET /_mget
{
  "docs":[
    {
      "_index":"user",
      "_type":"userinfo",    
      "_id":"1",            
      "_source":"name"     
    },
    {
      "_index":"user",
      "_type":"userinfo",
      "_id":"2",
      "_source":["name","age"]
    },
    {
      "_index":"user",
      "_type":"userinfo",
      "_id":"3"
    }
  ]
}

#优化批量查询
GET /user/userinfo/_mget
{
    "docs":[
    { 
      "_id":"1",
      "_source":"name"
    },
    { 
      "_id":"2",
      "_source":["name","age"]
    },
    { 
      "_id":"3"
    }
  ]
}

#再次优化  还可以使用 ids 代替 docs：
GET /user/userinfo/_mget
{
  "ids":["1","2","3"]
}
#这样查询，不能选在要查询的字段，会把对象中的所有字段都查询出来。
```

8. 多index多type查询

```shell
#多Index查询
GET _all/user,item/_search
```

### 练习使用
```shell
#查询所有index
GET _cat/indices
#创建 my_project 库
PUT /my_project
#删除 my_project 库
DELETE /my_project
#查看 my_project 配置
GET /my_project/_settings
#创建索引，并指定配置  //number_of_shards 分片数（不支持创建后修改） number_of_replicas 备份数
PUT /my_project        
{
  "settings":{
    "index":{
      "number_of_shards":3, 
      "number_of_replicas":1
    }
  }
}
#
GET my_project/_mapping

#修改映射:新增字段
PUT my_project/users/_mapping
{
  "properties": {
    "name":{
      "type": "text",
      "analyzer": "ik_max_word",
      "search_analyzer": "ik_smart",
      "similarity": "BM25",
      "store": true
    }
  }
}

PUT my_project/_mapping
{

      "properties": {
        "card": {
          "type": "text",
          "analyzer": "ik_max_word",
          "search_analyzer": "ik_smart",
          "similarity": "BM25",
          "store": true
        },
        "name": {
          "type": "text",
          "analyzer": "ik_max_word",
          "search_analyzer": "ik_smart",
          "similarity": "BM25"
        },
        "created_by": {
          "type": "text",
          "analyzer": "ik_max_word",
          "search_analyzer": "ik_smart",
          "similarity": "BM25",
          "store": true
        },
        "modified_by": {
          "type": "text",
          "analyzer": "ik_max_word",
          "search_analyzer": "ik_smart",
          "similarity": "BM25",
          "store": true
        },
        "created_time": {
          "type": "date",
          "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
        },
        "modified_time": {
          "type": "date",
          "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
        }
      }
    
  
}

POST /my_project/_doc/1
{
  "name":"water",
  "card":"21111116",
  "created_by":"2XX",
  "modified_by":"XXX",
  "created_time":"1999-11-12 12:00:00",
  "modified_time":"1999-11-12 12:00:00"
} 

GET my_project/_search
{
    "from":1,
    "size":1,
    "query":{
        "match":{
            "name":{
                "query":"string"
          
            }
        }
    },
    "sort":[
        {
            "_score":{
                "order":"desc"
            }
        }
    ]
}


DELETE /my_project/_doc/-N9pg4MB4Lptsh5no38E
```
