<template>
  <div class="article-editor" v-show="showComponent">
    <!-- 悬浮按钮 -->
    <button
      class="ae-toggle-btn"
      :class="{ 'ae-active': isOpen }"
      @click="toggleEditor"
    >
      {{ isOpen ? "✕" : "✏️" }}
    </button>

    <!-- 编辑面板 -->
    <div class="ae-panel" v-show="isOpen">
      <!-- 头部 -->
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
        <button class="ae-btn ae-confirm" @click="checkPassword" :disabled="checking">
          {{ checking ? '验证中...' : '确认' }}
        </button>
        <p class="ae-hint">密码由博主提供</p>
        <p v-if="saveStatus" class="ae-status">{{ saveStatus }}</p>
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
          <button
            class="ae-btn ae-save"
            @click="saveArticle"
            :disabled="saving"
          >{{ saving ? '保存中...' : '保存' }}</button>
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
// ====== 配置区 ======
const API_BASE = 'https://meteor-collection.vercel.app'
const DEFAULT_PASSWORD = 'meteor2024'

// 默认文章模板
const DEFAULT_ARTICLE = {
  title: '',
  content: '# 请输入文章标题\n\n请输入 Markdown 内容...\n'
}

export default {
  name: 'ArticleEditor',
  data() {
    return {
      isOpen: false,
      authenticated: false,
      password: '',
      checking: false,
      saving: false,
      saveStatus: '',
      article: { ...DEFAULT_ARTICLE },
      rawContent: '',
      editing: false,
    }
  },
  computed: {
    showComponent() {
      // 仅在文章页显示：排除首页、article: false 的页面、404 页面
      if (this.$route.path === '/') return false
      // 如果 frontmatter 中 article 为 false，则不显示
      if (this.$frontmatter.article === false) return false
      return true
    },
    renderedContent() {
      if (typeof window.marked === 'function') {
        return window.marked(this.rawContent || '')
      }
      return '<p>未加载 marked 库</p>'
    }
  },
  watch: {
    rawContent() {
      // 内容变化时自动进入编辑模式
      if (this.authenticated && !this.editing) {
        this.editing = true
      }
    }
  },
  methods: {
    toggleEditor() {
      if (this.isOpen) {
        this.closePanel()
      } else {
        this.isOpen = true
        this.loadArticle()
      }
    },
    closePanel() {
      this.isOpen = false
    },
    async checkPassword() {
      this.checking = true
      this.saveStatus = ''
      await new Promise(r => setTimeout(r, 300)) // 模拟短暂验证延迟，给用户反馈
      if (this.password === DEFAULT_PASSWORD) {
        this.authenticated = true
        this.password = ''
        this.editing = false
        this.loadArticle()
      } else {
        this.saveStatus = '密码错误'
        setTimeout(() => { this.saveStatus = '' }, 2000)
      }
      this.checking = false
    },
    async loadArticle() {
      try {
        const permalink = this.getPermalink()
        if (!permalink) return
        const res = await fetch(`${API_BASE}/api/article?slug=${encodeURIComponent(permalink)}`)
        if (!res.ok) {
          this.saveStatus = '获取文章失败'
          setTimeout(() => { this.saveStatus = '' }, 3000)
          return
        }
        const data = await res.json()
        if (data.slug && data.content !== undefined) {
          this.article = { title: data.title || '', content: data.content || '' }
          this.rawContent = this.article.content || ''
        } else if (data.notFound) {
          // 文章不存在于数据库中，使用默认模板
          this.article = { ...DEFAULT_ARTICLE }
          this.rawContent = ''
        } else {
          this.article = { ...DEFAULT_ARTICLE }
          this.rawContent = ''
        }
      } catch (e) {
        this.saveStatus = '网络错误'
        setTimeout(() => { this.saveStatus = '' }, 3000)
        this.article = { ...DEFAULT_ARTICLE }
        this.rawContent = ''
      }
    },
    async saveArticle() {
      this.saving = true
      this.saveStatus = ''
      try {
        const slug = this.getPermalink()
        if (!slug) {
          this.saveStatus = '无法获取 slug'
          this.saving = false
          return
        }
        const res = await fetch(`${API_BASE}/api/article`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEFAULT_PASSWORD}`
          },
          body: JSON.stringify({
            slug,
            title: this.article.title,
            content: this.rawContent,
          })
        })
        const data = await res.json()
        if (data.success) {
          this.saveStatus = '保存成功'
          this.editing = false
          setTimeout(() => { this.loadArticle() }, 500)
          setTimeout(() => { this.saveStatus = '' }, 3000)
        } else {
          this.saveStatus = data.error || '保存失败'
          setTimeout(() => { this.saveStatus = '' }, 3000)
        }
      } catch (e) {
        this.saveStatus = '网络错误'
        setTimeout(() => { this.saveStatus = '' }, 3000)
      }
      this.saving = false
    },
    cancelEdit() {
      this.loadArticle()
      this.editing = false
    },
    getPermalink() {
      return this.$frontmatter.permalink || this.$route.path
    },
    isFourZeroFour(route) {
      let flag = true
      this.$site.pages.forEach((item) => {
        if (item.path === route.path) {
          flag = false
        }
      })
      return flag
    }
  }
}
</script>

<style scoped>
.article-editor {
  position: fixed;
  bottom: 40px;
  right: 40px;
  z-index: 1000;
}

/* 悬浮按钮 */
.ae-toggle-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  background: #11a8cd;
  color: #fff;
  font-size: 1.4rem;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ae-toggle-btn:hover {
  transform: scale(1.1);
}

.ae-toggle-btn.ae-active {
  background: #f44;
}

/* 编辑面板 */
.ae-panel {
  position: absolute;
  bottom: 60px;
  right: 0;
  width: 480px;
  max-width: calc(100vw - 60px);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: aeSlideUp 0.3s ease;
}

@keyframes aeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.ae-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #11a8cd;
  color: #fff;
}

.ae-title {
  font-weight: bold;
  font-size: 1rem;
}

.ae-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

/* 密码区 */
.ae-auth {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ae-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  outline: none;
}

.ae-input:focus {
  border-color: #11a8cd;
}

.ae-title-input {
  width: 100%;
  box-sizing: border-box;
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.ae-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: monospace;
  resize: vertical;
  outline: none;
  min-height: 200px;
}

.ae-textarea:focus {
  border-color: #11a8cd;
}

.ae-hint {
  font-size: 0.8rem;
  color: #999;
  margin: 0;
  text-align: center;
}

/* 按钮通用样式 */
.ae-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.ae-btn:hover:not(:disabled) {
  opacity: 0.8;
}

.ae-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ae-confirm {
  background: #11a8cd;
  color: #fff;
}

.ae-save {
  background: #11a8cd;
  color: #fff;
}

.ae-cancel {
  background: #eee;
  color: #333;
}

.ae-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.ae-status {
  margin: 8px 0 0;
  font-size: 0.85rem;
  text-align: center;
}

/* 预览区 */
.ae-preview {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
  border-top: 1px solid #eee;
}

.ae-preview-header {
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
  font-size: 0.95rem;
}

.ae-preview-content {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #333;
}

.ae-preview-content :deep(h1),
.ae-preview-content :deep(h2),
.ae-preview-content :deep(h3) {
  margin: 0.5em 0 0.3em;
}

.ae-preview-content :deep(p) {
  margin: 0.4em 0;
}

.ae-preview-content :deep(code) {
  background: #f0f0f0;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.85em;
}

.ae-preview-content :deep(pre) {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
