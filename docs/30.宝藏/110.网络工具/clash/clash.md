---
title: clash
date: 2026-08-09 14:56:23
permalink: /pages/9888bf/
categories:
  - 后端
  - Collection
  - clash
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# Clash Verge

## 扩展脚本

~~~javascript
// Define main function (script entry)

function main(config, profileName) {

  // ===============================
  // 定义你的 VLESS Reality 节点配置
  // ===============================

  const myProxy = {

    // 节点显示名称，在 Clash 中看到的名字
    name: "56-vless_reality_vision",

    // 代理类型，这里是 VLESS
    type: "vless",

    // 服务器 IP 地址
    server: "204.152.198.206",

    // 服务器端口
    port: 58190,

    // VLESS 用户 UUID
    uuid: "00329416-5353-4fd7-b530-b10d7c195a2d",


    // 网络类型
    network: "tcp",

    // 开启 TLS
    tls: true,

    // 允许 UDP 转发
    udp: true,


    // XTLS Vision 流控模式
    flow: "xtls-rprx-vision",


    // Reality 的 SNI 域名
    // 也就是伪装访问的域名
    servername: "www.lovelive-anime.jp",


    // Reality 配置
    "reality-opts": {

      // Reality 服务端公钥
      "public-key": "tnHXClIJuFirL3timT3k8WCoITReyZtu5UX18GRlyQw",

      // Reality short-id
      "short-id": "6ba85179e30d4fc2"
    },


    // TLS 客户端指纹
    // 模拟 Chrome 浏览器
    "client-fingerprint": "chrome"
  };



  // ===============================
  // 添加节点到配置的 proxies 列表
  // ===============================


  // 如果当前配置没有 proxies，则创建一个空数组
  if (!config.proxies) {

    config.proxies = [];

  }



  // 检查节点是否已经存在
  // 防止每次刷新配置重复添加
  const proxyExists = config.proxies.some(

    // 遍历所有节点，查找同名节点
    proxy => proxy.name === myProxy.name

  );



  // 如果节点不存在，则添加
  if (!proxyExists) {

    // unshift 添加到数组最前面
    // 这样节点会排在列表顶部
    config.proxies.unshift(myProxy);

  }




  // ===============================
  // 创建独立代理组「我的Reality」
  // ===============================



  // 如果配置不存在 proxy-groups
  // 则创建空数组
  if (!config["proxy-groups"]) {

    config["proxy-groups"] = [];

  }



  // 设置你的自定义代理组名称
  const groupName = "我的Reality";



  // 检查代理组是否已经存在
  // 防止重复创建
  const groupExists = config["proxy-groups"].some(

    // 查找同名代理组
    group => group.name === groupName

  );



  // 如果代理组不存在，则创建
  if (!groupExists) {


    // 创建一个 select 类型的手动选择组
    config["proxy-groups"].unshift({

      // 代理组名称
      name: groupName,


      // select 类型：
      // 手动选择里面的节点
      type: "select",


      // 这个组里面包含哪些代理
      proxies: [

        // 添加你的 Reality 节点
        myProxy.name,


        // 添加直连选项
        // 方便临时关闭代理
        "DIRECT"

      ]

    });

  }



  // ===============================
  // 返回修改后的完整配置
  // ===============================

  return config;

}
~~~

## 全局扩展覆写配置

目前不支持 代理 代理组配置 只支持 dns rules 配置

## 系统代理 与 TUN(虚拟网卡)的区别

### 系统代理（System Proxy）

设置
→ 网络和 Internet
→ 代理
→ 使用代理服务器

能代理：

✅ Chrome / Edge
✅ Firefox（如果使用系统代理）
✅ Telegram
✅ Discord
✅ 大部分普通软件

不能代理：

❌ 游戏
❌ Steam 部分流量
❌ 一些没有读取系统代理的软件
❌ 命令行程序（部分情况）

### TUN 模式
TUN 是虚拟网卡模式。

开启后 Clash 创建一个虚拟网卡：

类似：
应用程序
↓
Windows网络层
↓
Clash TUN虚拟网卡
↓
规则判断
↓
代理节点

TUN 可以代理：

✅ 浏览器
✅ 游戏
✅ Steam
✅ Windows商店
✅ Git
✅ Docker（部分情况）
✅ 命令行工具
✅ 大部分桌面软件