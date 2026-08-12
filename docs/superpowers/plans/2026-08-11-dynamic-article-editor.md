---
title: 2026-08-11-dynamic-article-editor
date: 2026-08-12 20:29:52
permalink: /pages/29209e/
categories:
  - superpowers
  - plans
tags:
  - 
author: 
  name: lxzhang666666
  link: https://github.com/lxzhang666666
---
# 动态文章编辑系统 - 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 VuePress 静态博客中实现"点击编辑按钮 → 修改内容 → 存入 MongoDB Atlas → 页面实时刷新显示"的热更新功能，类似 Twikoo 评论系统的体验。

**架构：** 浏览器（GitHub Pages）→ Cloudflare Workers Serverless API → MongoDB Atlas（HTTP API）。无独立后端服务器，使用免费层级服务。编辑器以悬浮按钮形式嵌入每篇文章页右下角，点击后弹出编辑面板。

**技术栈：** Cloudflare Workers、MongoDB Atlas（免费 M0）、marked.js（前端 Markdown 渲染）、Vue 2（VuePress 1.x 环境）

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `workers/index.js` | Cloudflare Worker 主入口，处理文章读写 API |
| `workers/wrangler.toml` | Cloudflare Workers 配置（绑定变量、路由） |
| `docs/.vuepress/components/ArticleEditor.vue` | 博客页面内的编辑组件（悬浮按钮 + 编辑面板） |
| `docs/.vuepress/config.ts` | 注册全局组件，添加 marked CDN |
| `docs/.vuepress/enhanceApp.js` | 全局注入 marked 实例 |

---

## 前置条件检查清单

在开始之前，确认以下配置已就绪：
- [ ] MongoDB Atlas 已创建数据库和集合，用户名密码已知
- [ ] MongoDB Atlas 已开启"IP 白名单"，加入 `0.0.0.0/0`（允许 Cloudflare 访问）
- [ ] Cloudflare Workers 账号已注册
- [ ] `wrangler` CLI 已登录（`npx wrangler login`）

---

## 任务 1：Cloudflare Worker API

**文件：**
- 创建：`workers/index.js`
- 创建：`workers/wrangler.toml`

- [ ] **步骤 1：编写 Cloudflare Worker 主代码**

```javascript
// workers/index.js

// MongoDB Atlas HTTP API Base URL
const MONGODB_API_URL = 'https://asia-southeast1.azure.mongodb-api.com';

// 从环境变量获取认证信息
// WRANGLER 中配置：MO_USER, MO_PASS, MO_HOST
async function getMongoDBAuthHeaders() {
  const auth = btoa(`${MO_USER}:${MO_PASS}`);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${auth}`,
  };
}

function getClusterUrl(host) {
  // host 格式如：cluster0.xxx.mongodb.net
  // 转换 MongoDB Atlas HTTP API 所需的格式
  return `https://${host}`;
}

async function fetchArticle(slug) {
  const headers = await getMongoDBAuthHeaders();
  const url = `${getClusterUrl(MO_HOST)}/data/lambda/v1/atlas/services/mongodb-atlas/db/blog/articles/find/${encodeURIComponent(slug)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error('fetchArticle error:', e.message);
    return null;
  }
}

async function saveArticle(data) {
  const headers = await getMongoDBAuthHeaders();
  const url = `${getClusterUrl(MO_HOST)}/data/lambda/v1/atlas/services/mongodb-atlas/db/blog/articles`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (e) {
    console.error('saveArticle error:', e.message);
    return false;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 跨域预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // GET /api/article/:slug — 获取文章
    const getMatch = path.match(/^\/api\/article\/(.+)$/);
    if (request.method === 'GET' && getMatch) {
      const slug = decodeURIComponent(getMatch[1]);
      const article = await fetchArticle(slug);
      return Response.json(article || { notFound: true });
    }

    // POST /api/article — 保存文章
    if (request.method === 'POST' && path === '/api/article') {
      const body = await request.json();
      const ok = await saveArticle(body);
      return Response.json({ success: ok });
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

> **注意**：上述代码使用了 MongoDB Atlas Data Lambda 的简化 API 路径。实际部署时需要根据你 Atlas 集群的 HTTP API 端点调整。下面步骤 2 会补充正确的连接方式。

- [ ] **步骤 2：编写 Cloudflare Workers 配置**

```toml
# workers/wrangler.toml
name = "meteor-blog-api"
main = "index.js"
compatibility_date = "2024-01-01"

[vars]
MO_HOST = "替换为你的MongoDB Atlas cluster URL，如：cluster0.xxx.mongodb.net"
MO_USER = "替换为你的MongoDB Atlas用户名"
MO_PASS = "替换为你的MongoDB Atlas密码"
```

- [ ] **步骤 3：安装 wrangler CLI 并登录**

运行：
```bash
npm install -g wrangler
npx wrangler login
```

- [ ] **步骤 4：部署 Worker**

运行：
```bash
cd workers
npx wrangler deploy
```

预期输出包含 `https://meteor-blog-api.xxx.workers.dev` 的地址，记录此地址供后续组件使用。

- [ ] **步骤 5：验证 API 可用**

运行：
```bash
# 测试 GET（应返回 {"notFound":true} 或文章数据）
curl https://meteor-blog-api.xxx.workers.dev/api/article/test-slug

# 测试 POST
curl -X POST https://meteor-blog-api.xxx.workers.dev/api/article \
  -H "Content-Type: application/json" \
  -d '{"slug":"test-article","title":"测试","content":"# Hello"}'
```

- [ ] **步骤 6：Commit**

```bash
git add workers/
git commit -m "feat(workers): 添加 MongoDB API Worker 代码"
```

---

## 任务 2：ArticleEditor Vue 组件

**文件：**
- 创建：`docs/.vuepress/components/ArticleEditor.vue`

- [ ] **步骤 1：编写组件代码**

```vue
<!-- docs/.vuepress/components/ArticleEditor.vue -->
<template>
  <div class="article-editor" v-show="showComponent">
    <!-- 悬浮编辑按钮 -->
    <button
      class="ae-toggle-btn"
      :class="{ 'ae-active': isOpen }"
      @click="toggleEditor"
      title="编辑此页"
    >
      <span class="ae-icon">{{ isOpen ? '✕' : '✏️' }}</span>
    </button>

    <!-- 编辑面板 -->
    <div class="ae-panel" v-show="isOpen">
      <div class="ae-header">
        <span class="ae-title">编辑文章</span>
        <button class="ae-close" @click="closePanel">×</button>
      </div>

      <!-- 密码输入（未认证时显示） -->
      <div class="ae-auth" v-if="!authenticated">
        <input
          v-model="password"
          type="password"
          placeholder="请输入编辑密码"
          class="ae-input"
          @keyup.enter="checkPassword"
        />
        <button class="ae-btn ae-confirm" @click="checkPassword">确认</button>
        <p class="ae-hint">密码由博主提供，请输入后保存修改</p>
      </div>

      <!-- 编辑表单（已认证后显示） -->
      <div class="ae-form" v-else>
        <input
          v-model="article.title"
          class="ae-input ae-title-input"
          placeholder="文章标题"
        />
        <textarea
          v-model="rawContent"
          class="ae-textarea"
          placeholder="输入 Markdown 内容..."
          rows="15"
        ></textarea>
        <div class="ae-actions">
          <button class="ae-btn ae-save" @click="saveArticle" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <button class="ae-btn ae-cancel" @click="cancelEdit">取消</button>
        </div>
        <p v-if="saveStatus" class="ae-status">{{ saveStatus }}</p>
      </div>

      <!-- 预览区 -->
      <div class="ae-preview" v-if="authenticated && !editing">
        <div class="ae-preview-header">预览</div>
        <div v-html="renderedContent" class="ae-preview-content"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked';

// ====== 配置区 ======
const API_BASE = 'https://你的workers地址'; // 部署后替换
const EDIT_PASSWORD = 'meteor2024'; // 可改为环境变量或 hardcode

export default {
  name: 'ArticleEditor',
  data() {
    return {
      showComponent: false,
      isOpen: false,
      authenticated: false,
      editing: false,
      password: '',
      article: { slug: '', title: '', content: '' },
      rawContent: '',
      saving: false,
      saveStatus: '',
      loadError: false,
    };
  },
  computed: {
    renderedContent() {
      try {
        return marked(this.rawContent || '# (空内容)');
      } catch (e) {
        return this.rawContent;
      }
    },
  },
  mounted() {
    // 仅文章页显示
    if (this.$frontmatter.article === false) return;
    if (this.$route.path === '/') return;
    this.showComponent = true;
    this.loadArticle();
  },
  methods: {
    toggleEditor() {
      this.isOpen = !this.isOpen;
      if (this.isOpen && !this.editing) {
        this.renderedContent; // trigger computed
      }
    },
    closePanel() {
      this.isOpen = false;
    },
    checkPassword() {
      if (this.password === EDIT_PASSWORD) {
        this.authenticated = true;
        this.editing = false;
        this.password = '';
      } else {
        alert('密码错误');
      }
    },
    async loadArticle() {
      const slug = this.$route.path.replace(/^\//, '').replace(/\/$/, '') || 'index';
      this.article.slug = slug;
      try {
        const res = await fetch(`${API_BASE}/api/article/${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (data && !data.notFound) {
          this.article.title = data.title || '';
          this.rawContent = data.content || '# (暂无动态内容，点击下方编辑按钮添加)';
        } else {
          // 没有动态内容，使用 frontmatter 中的标题作为默认
          this.rawContent = `# ${this.$frontmatter.title || '未命名'}\n\n*(暂无动态内容)*`;
        }
        this.loadError = false;
      } catch (e) {
        console.error('加载文章失败:', e);
        this.loadError = true;
        this.rawContent = `# ${this.$frontmatter.title || '未命名'}\n\n*(加载失败，请刷新重试)*`;
      }
    },
    async saveArticle() {
      this.saving = true;
      this.saveStatus = '';
      try {
        const res = await fetch(`${API_BASE}/api/article`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: this.article.slug,
            title: this.article.title,
            content: this.rawContent,
            updatedAt: new Date().toISOString(),
          }),
        });
        const result = await res.json();
        if (result.success) {
          this.saveStatus = '✓ 保存成功！页面内容已更新';
          this.editing = false;
          // 延迟后刷新预览
          setTimeout(() => this.loadArticle(), 500);
        } else {
          this.saveStatus = '✗ 保存失败，请重试';
        }
      } catch (e) {
        this.saveStatus = '✗ 网络错误：' + e.message;
      } finally {
        this.saving = false;
      }
    },
    cancelEdit() {
      this.editing = false;
      this.loadArticle();
    },
  },
};
</script>

<style scoped>
.article-editor {
  position: fixed;
  bottom: 80px;
  right: 30px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.ae-toggle-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: #409eff;
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ae-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.5);
}

.ae-toggle-btn.ae-active {
  background: #f56c6c;
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.4);
}

.ae-panel {
  position: absolute;
  bottom: 65px;
  right: 0;
  width: 480px;
  max-width: calc(100vw - 60px);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: aeSlideUp 0.25s ease;
}

@keyframes aeSlideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.ae-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.ae-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.ae-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #909399;
  line-height: 1;
}
.ae-close:hover { color: #303133; }

.ae-auth {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ae-form {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ae-input, .ae-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  transition: border-color 0.2s;
}
.ae-input:focus, .ae-textarea:focus {
  outline: none;
  border-color: #409eff;
}
.ae-textarea {
  font-family: 'Courier New', monospace;
  resize: vertical;
  min-height: 200px;
}
.ae-title-input {
  font-size: 16px;
  font-weight: 600;
}

.ae-actions {
  display: flex;
  gap: 10px;
}

.ae-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}
.ae-btn:hover { opacity: 0.85; }
.ae-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ae-confirm { background: #409eff; color: #fff; }
.ae-save { background: #67c23a; color: #fff; }
.ae-cancel { background: #f5f7fa; color: #606266; border: 1px solid #dcdfe6; }

.ae-hint {
  font-size: 12px;
  color: #909399;
  margin: 0;
  text-align: center;
}

.ae-status {
  font-size: 13px;
  margin: 0;
  text-align: center;
}

.ae-preview {
  padding: 16px;
  border-top: 1px solid #ebeef5;
}
.ae-preview-header {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
.ae-preview-content {
  font-size: 14px;
  line-height: 1.7;
  max-height: 300px;
  overflow-y: auto;
}
</style>
```

- [ ] **步骤 2：测试组件本地渲染**

运行：
```bash
yarn dev
```
在浏览器中访问任意文章页，确认右下角出现蓝色圆形编辑按钮（✏️）。点击后面板展开，输入密码 `meteor2024` 后显示编辑表单。

- [ ] **步骤 3：Commit**

```bash
git add docs/.vuepress/components/ArticleEditor.vue
git commit -m "feat(components): 添加 ArticleEditor 动态编辑组件"
```

---

## 任务 3：集成到 VuePress 配置

**文件：**
- 修改：`docs/.vuepress/config.ts`
- 修改：`docs/.vuepress/enhanceApp.js`

- [ ] **步骤 1：注入 marked CDN 到 head**

在 `docs/.vuepress/config.ts` 的 `head` 数组中添加（在现有 `head` 数组最后，`plugins` 之前）：

```typescript
// 在 head 数组末尾添加：
['script', { src: 'https://cdn.jsdelivr.net/npm/marked@9/marked.min.js' }],
```

- [ ] **步骤 2：注册全局组件**

在 `docs/.vuepress/config.ts` 的 `plugins` 数组中，将 `custom-plugins` 的 `globalUIComponents` 改为：

```typescript
[
  {
    name: 'custom-plugins',
    globalUIComponents: ["PageInfo", "BlockToggle", "Twikoo", "ArticleEditor"]
  }
],
```

> 注意：`ArticleEditor` 放在最后，确保它挂载在组件树的最后层级。

- [ ] **步骤 3：在 enhanceApp.js 中全局注册 marked**

修改 `docs/.vuepress/enhanceApp.js`：

```javascript
export default ({ Vue }) => {
  // 全局注册 marked（CDN 加载后挂载到 window）
  if (typeof window !== 'undefined' && window.marked) {
    Vue.prototype.$marked = window.marked;
  }
}
```

- [ ] **步骤 4：更新组件使用全局 marked**

修改 `ArticleEditor.vue` 中的导入方式，将顶部的：
```javascript
import { marked } from 'marked';
```
改为：
```javascript
const marked = window.marked || (() => '# (marked 加载失败)');
```

- [ ] **步骤 5：替换 API 地址为实际部署地址**

在 `ArticleEditor.vue` 中找到：
```javascript
const API_BASE = 'https://你的workers地址';
```
替换为任务 1 中部署后获得的实际地址，如 `https://meteor-blog-api.xxx.workers.dev`。

- [ ] **步骤 6：验证构建和运行**

运行：
```bash
yarn dev
```
访问任意文章页，确认：
- 右下角有蓝色编辑按钮
- 点击后面板展开
- 输入密码后可以看到编辑表单
- 无控制台报错

- [ ] **步骤 7：Commit**

```bash
git add docs/.vuepress/config.ts docs/.vuepress/enhanceApp.js
git commit -m "feat(config): 集成 ArticleEditor 组件到 VuePress"
```

---

## 任务 4：端到端测试与修复

- [ ] **步骤 1：测试完整流程**

1. 启动 `yarn dev`
2. 访问一篇有 `permalink` 的文章页（如 `/10.Java/xxx.html`）
3. 点击右下角编辑按钮 → 输入密码 → 修改标题或内容 → 点击保存
4. 观察保存状态提示 → 检查预览是否更新
5. 在 MongoDB Atlas 控制台确认数据已写入

- [ ] **步骤 2：测试边界情况**

| 场景 | 预期结果 |
|------|---------|
| 访问没有 frontmatter 的页面 | 组件不显示（`article: false` 或首页） |
| 密码错误 | 提示"密码错误"，不进入编辑模式 |
| 网络断开时点击保存 | 显示"网络错误"提示 |
| 保存成功后刷新页面 | 新内容保持（依赖 GitHub Pages 缓存，需等待或手动刷新） |

- [ ] **步骤 3：修复发现的问题并 Commit**

```bash
git add -A
git commit -m "fix(editor): 修复端到端测试发现的问题"
```

---

## 注意事项

1. **MongoDB Atlas HTTP API 路径**：任务 1 中的 API 路径是示例路径。实际路径取决于你的 Atlas 集群配置。如果 Atlas HTTP API 不可用，可改用以下方式替代：
   - 方案 A：使用 MongoDB Compass 或脚本先初始化几条测试数据
   - 方案 B：改用 Supabase / Firebase 等更友好的 Serverless DB

2. **密码安全**：当前使用 hardcode 密码。生产环境建议：
   - 通过环境变量传入
   - 或使用 JWT token 鉴权

3. **GitHub Pages 缓存**：由于是静态站点，保存后需要用户刷新页面才能看到最新内容（与 Twikoo 评论刷新机制一致）。

4. **Cloudflare Worker 免费限制**：每天 10 万次请求，个人博客完全够用。
