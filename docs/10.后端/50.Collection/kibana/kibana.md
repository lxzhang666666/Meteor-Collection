# Kibana

```shell
docker run -d \
--name kibana \
-e ELASTICSEARCH_HOSTS=http://elasticsearch:9200 \
-v /Users/zhangbao/data/apps/kibana/data:/usr/share/kibana/data \
-v /Users/zhangbao/data/apps/kibana/plugins:/usr/share/kibana/plugins \
-v /Users/zhangbao/data/apps/kibana/config:/usr/share/kibana/config \
--net prod-network \
--ip 172.18.0.40 \
-p 5601:5601  \
kibana:7.17.5
```

#### windows
```shell
docker run -d `
--name kibana `
-e ELASTICSEARCH_HOSTS=http://elasticsearch:9200 `
-v E:\data\apps\kibana\data:/usr/share/kibana/data `
-v E:\data\apps\kibana\plugins:/usr/share/kibana/plugins `
-v E:\data\apps\kibana\config:/usr/share/kibana/config `
--net prod-network `
--ip 172.18.0.40 `
-p 5601:5601  `
kibana:7.17.5
```

编辑kibana.yml，在文件最后加上下面配置 即可汉化

>i18n.locale: "zh-CN"