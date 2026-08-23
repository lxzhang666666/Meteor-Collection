# 动态文章编辑系统 - 部署指南

## 概述

这是一个基于 Vercel + MongoDB Atlas 的动态文章编辑系统，可以让你的 VuePress 博客支持在线编辑文章并实时保存。

## 架构

```
浏览器（GitHub Pages）
  ↓ fetch GET/POST /api/article
Vercel Serverless Functions（免费托管）
  ↓ mongodb driver
MongoDB Atlas（免费 M0 集群）
```

## 部署步骤

### 1. MongoDB Atlas 配置

1. 登录 https://cloud.mongodb.com/
2. 创建集群（或选择已有的 M0 免费集群）
3. 点击 **Database Access** → **Add New Database User**
   - 设置用户名和密码
   - 权限：Read and write to any database
4. 点击 **Network Access** → **Add IP Address**
   - 添加 `0.0.0.0/0`（允许 Vercel 访问）
5. 点击 **Clusters** → **Connect** → **Connect your application**
   - 复制连接字符串（Connection String Only）
   - 格式：`mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`

### 2. Vercel 部署

1. 登录 https://vercel.com/ 或用 GitHub 账号登录
2. 点击 **New Project**
3. 导入你的 GitHub 仓库 `lxzhang666666/Meteor-Collection`
4. 在 **Environment Variables** 中添加：
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
   DB_NAME=blog
   COLLECTION=articles
   WRITE_SECRET=your-random-secret-string
   ```
5. 点击 **Deploy**
6. 部署完成后，记录你的 Vercel 地址（如 `https://meteor-blog.vercel.app`）

### 3. 替换 API 地址

编辑 `docs/.vuepress/components/ArticleEditor.vue` 第 67 行：

```javascript
const API_BASE = 'https://meteor-blog.vercel.app'  // 替换为你的 Vercel 地址
```

或者构建时通过环境变量注入：

```bash
API_BASE=https://meteor-blog.vercel.app yarn build
```

### 4. 使用文章标记

在 Markdown 文件的 frontmatter 中添加 `source: db`：

```yaml
---
title: 我的文章标题
date: 2024-01-01
tags:
  - 学习
source: db  # 标记此文章从 MongoDB 动态加载
---
```

只有添加了 `source: db` 的文章才会从 MongoDB 读取内容。其他文章继续使用本地文件。

### 5. 首次使用

1. 访问任意文章页面
2. 点击右下角的编辑按钮（✏️）
3. 输入密码 `meteor2024`
4. 编辑内容并点击"保存"
5. 内容将保存到 MongoDB Atlas

## 安全说明

- **密码**：前端密码 `meteor2024` 仅供原型验证，生产环境建议修改或通过环境变量传入
- **WRITE_SECRET**：在 Vercel 环境变量中设置，用于保护写操作 API
- **MONGODB_URI**：必须保密，不要提交到代码仓库

## 后续优化

- [ ] 添加文章版本历史（记录每次编辑变更）
- [ ] 实现富文本编辑器（替代纯 Markdown textarea）
- [ ] 添加图片上传功能（对接图床）
- [ ] 实现基于角色的访问控制（不同用户不同权限）
