export default [
    {
        text: '首页', link: '/'
    },
    {
        text: '后端', link: '/backend/',
        items: [
            {
                text: 'Java',
                link: '/java/',
                items: [
                    {text: 'Java基础', link: '/pages/b68651/'},
                    {text: 'Java进阶', link: '/pages/079032/'},
                    {text: 'Java容器', link: '/pages/892d69/'},
                    {text: 'Java并发编程', link: '/pages/5240d7/'},
                    {text: 'Java虚拟机', link: '/pages/6198af/'},
                ],
            },
            {
                text: '计算机基础',
                link: '/computer-basic/',
                items: [
                    {text: '数据结构与算法', link: '/pages/7f453c/'},
                    {text: '计算机网络', link: '/pages/4e9070/'},
                    {text: '操作系统', link: '/pages/27935a/'},
                    {text: 'Linux', link: '/pages/a766e8/'},
                ],
            },
            {
                text: '框架｜中间件',
                link: '/middleware/',
                items: [
                    {text: 'Spring', link: '/pages/a63f9f/'},
                    {text: 'MySQL', link: '/pages/23bee8/'},
                    {text: 'Redis', link: '/pages/258dd8/'},
                    {text: 'MQ', link: '/pages/6bb532/'},
                ],
            },
            {
                text: '架构',
                link: '/architecture/',
                items: [
                    {text: '分布式', link: '/pages/5d4819/'},
                    {text: '高并发', link: '/pages/ad036a/'},
                    {text: '高可用', link: '/pages/2d8d93/'},
                    {text: '架构', link: '/pages/1c4157/'},
                ],
            },
        ],
    },
    {
        text: '前端', link: '/frontend/',
        items: [
            {
                text: '框架',
                link: '/architecture/',
                items: [
                    {text: 'React', link: '/pages/1731df/'},
                    {text: '其他', link: '/pages/fdd4d1/'},
                ],
            },
        ],
    },
    {
        text: '宝藏', link: '/collection/',
        items: [
            {
                text: 'Java',
                link: '/collection/java/',
                items: [
                    {text: 'Java', link: '/pages/920601/'},
                    {text: 'HashMap', link: '/pages/7640d6/'},
                ],
            },
            {
                text: '计算机基础',
                link: '/collection/cs/'
            },
            {
                text: '框架',
                link: '/collection/framework/',
                items: [
                    {text: 'Spring', link: '/pages/c3caec/'},
                    {text: 'SpringBoot', link: '/pages/daa799/'},
                    {text: 'MyBatis-Plus', link: '/pages/94af7d/'},
                ],
            },
            {
                text: '中间件',
                link: '/collection/middleware/',
                items: [
                    {text: 'MySQL', link: '/pages/80c0db/'},
                    {text: 'Redis', link: '/pages/e34ed7/'},
                    {text: 'Nginx', link: '/pages/395030/'},
                    {text: 'Kafka', link: '/pages/e154af/'},
                ],
            },
            {
                text: '微服务',
                link: '/collection/microservice/',
                items: [
                    {text: 'Nacos', link: '/pages/3cd2b1/'},
                    {text: 'Zookeeper', link: '/pages/9e7ab2/'},
                ],
            }, {
                text: '源码及进阶',
                link: '/collection/sd-advance/',
                items: [
                    {text: 'Spring 循环依赖三级缓存源码', link: '/pages/cc005f/'},
                    {text: 'Java JUC 核心类深度源码解析', link: '/pages/d3aa38/'},
                    {text: '分布式秒杀系统设计', link: '/pages/99a556/'},
                    {text: '高并发短链接系统设计', link: '/pages/0b8a9c/'},
                ],
            },
            {
                text: '数据结构',
                link: '/collection/ds/',
                items: [
                    {text: '数据结构', link: '/pages/6c6c61/'},
                    {text: '红黑树', link: '/pages/8ea3f8/'},
                ],
            },
            {
                text: '算法',
                link: '/collection/algo/',
                items: [
                    {text: '算法复杂度', link: '/pages/7f453c/'},
                    {text: '排序算法', link: '/pages/5830fa/'},
                    {text: '最短路径', link: '/pages/1f3b89/'},
                ],
            },
            {
                text: 'DevOps',
                link: '/collection/devops/',
                items: [
                    {text: 'Docker', link: '/pages/37361e/'},
                    {text: 'Git', link: '/pages/095d29/'},
                    {text: 'Jenkins', link: '/pages/4c06f3/'},
                    {text: 'Maven', link: '/pages/50a3fd/'},
                ],
            },
            {
                text: '开发工具',
                link: '/collection/tools/'
            },
            {
                text: '网络工具',
                link: '/collection/network/'
            },
            {
                text: '其他',
                link: '/collection/others/'
            },
        ],
    },
    {
        text: '配置及工具', link: '/tools/',
        items: [
            {text: '实用工具', link: '/pages/59ba19/'},
            {
                text: '安装配置',
                link: '/install/',
                items: [
                    {text: 'Linux', link: '/pages/08fe43/'},
                    {text: 'Windows', link: '/pages/eae8e6/'},
                    {text: 'Mac', link: '/pages/f6b314/'},
                ],
            },
            {
                text: '开发工具',
                link: '/devTools/',
                items: [
                    {text: 'IDEA', link: '/pages/13c304/'},
                    {text: 'VsCode', link: '/pages/3f5859/'},
                ],
            },
        ],
    },
    {
        text: '更多', link: '/more/',
        items: [
            {text: '关于', link: '/pages/ec4e5b/'},
            {text: '收藏', link: '/pages/732fd9/'},
            {text: '草稿', link: '/pages/6b7239/'},
            {
                text: '索引',
                link: '/archives/',
                items: [
                    {text: '分类', link: '/categories/'},
                    {text: '标签', link: '/tags/'},
                    {text: '归档', link: '/archives/'},
                ],
            },
        ],
    },
]
