---
title: 2026-08-11-dynamic-article-editor-design
date: 2026-08-12 20:27:01
permalink: /pages/b8e14f/
categories:
  - superpowers
  - specs
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# 动态文章编辑系统 - 设计文档

**日期**: 2026-08-11  
**目标**: 在 VuePress 静态博客中实现"编辑页面 → 存入 MongoDB → 页面回显"的热更新功能

---

## 架构概述

```
浏览器（GitHub Pages）
  ↓ fetch GET /api/article/:id
Cloudflare Workers（Serverless API）
  ↓ MongoDB driver
MongoDB Atlas（免费 M0 集群）
  ↑ POST /api/article（编辑保存）
```

**核心原则**: 无独立后端服务器，全部使用免费云服务。

---

## 数据模型

```javascript
// MongoDB collection: articles
{
  _id: string,           // 与 permalink 一致的路径 slug
  title: string,         // 文章标题
  content: string,       // Markdown 原文
  frontmatter: object,   // 前端额外字段（tags、categories 等）
  updatedAt: Date        // 最后更新时间
}
```

---

## 组成部分

### 1. Serverless API（Cloudflare Workers）

- **部署**: Cloudflare Workers（免费版，10万次/天）
- **数据库绑定**: Cloudflare Workers 原生支持 D1 / 或通过 MongoDB Node.js 驱动连接 Atlas
- **认证**: Basic Auth（用户名/密码由环境变量配置）
- **端点**:
  - `GET /api/article/:slug` — 获取单篇文章
  - `POST /api/article` — 保存/更新文章（需认证）

### 2. Vue 编辑器组件

- **位置**: `docs/.vuepress/components/ArticleEditor.vue`
- **功能**:
  - 页面加载时从 API 获取文章数据
  - 切换编辑/查看模式
  - 保存时 POST 到 API
  - 保存后自动刷新显示
- **Markdown 渲染**: 使用 `marked` 库在前端渲染（通过 CDN 引入）
- **权限控制**: 编辑时输入密码，密码比对通过后才可进入编辑模式

### 3. 配置修改

- `enhanceApp.js`: 注入 `marked` 全局实例
- `config.ts`: 注册 `ArticleEditor` 全局组件
- 各文章页面 frontmatter 中可通过 `dynamic: true` 控制是否启用动态编辑

---

## 工作流程

```
1. 用户访问文章页
   ↓
2. ArticleEditor 组件加载，调用 GET /api/article/:slug
   ↓
3. 如果 MongoDB 中有该文章 → 显示内容 + 编辑按钮
   如果 MongoDB 中没有 → 降级为正常 VuePress 静态渲染
   ↓
4. 用户点击"编辑"→ 输入密码 → 进入编辑模式
   ↓
5. 用户修改内容 → 点击"保存"→ POST /api/article
   ↓
6. API 写入 MongoDB → 返回成功
   ↓
7. 组件重新调用 GET 获取最新内容 → 页面实时刷新
```

---

## 安全考虑

- **Basic Auth**: API 请求头携带 `Authorization: Basic base64(user:pass)`
- **密码不硬编码**: 存储在 Cloudflare Workers 环境变量中
- **前端密码验证**: 编辑器组件也需输入密码才能进入编辑模式（双保险）
- **HTTPS 强制**: GitHub Pages 和 Cloudflare Workers 均自动 HTTPS

---

## 技术栈

| 组件 | 技术 | 费用 |
|------|------|------|
| 博客框架 | VuePress 1.9.5 | 免费 |
| 托管 | GitHub Pages | 免费 |
| API 服务 | Cloudflare Workers | 免费（10万请求/天） |
| 数据库 | MongoDB Atlas M0 | 免费（512MB） |
| Markdown 渲染 | marked.js | 免费 |

---

## 待解决/后续优化

- [ ] 版本历史（MongoDB 记录每次编辑变更）
- [ ] 协作编辑（多人同时编辑冲突处理）
- [ ] 富文本编辑器（替代纯 markdown textarea）
- [ ] 图片上传（图床集成）
- [ ] 更精细的权限（基于角色的访问控制）