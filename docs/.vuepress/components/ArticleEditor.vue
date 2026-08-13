<template>
  <div
    class="article-editor"
    :style="{ bottom: pos.bottom + 'px', right: pos.right + 'px' }"
    v-show="showComponent"
    @mousedown.self="startDrag"
  >
    <!-- 悬浮按钮 -->
    <button
      class="ae-toggle-btn"
      :class="{ 'ae-active': isOpen }"
      @click="!dragging && toggleEditor()"
    >
      {{ isOpen ? "✕" : "✏️" }}
    </button>

    <!-- 编辑面板 -->
    <div class="ae-panel" v-show="isOpen">
      <!-- 头部 -->
      <div class="ae-header" @mousedown.self="startDrag">
        <span class="ae-title">编辑文章</span>
        <button class="ae-close" @click="closePanel">×</button>
      </div>

      <!-- 编辑表单 -->
      <div class="ae-form">
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
      <div class="ae-preview" v-if="!editing">
        <div class="ae-preview-header">预览</div>
        <div v-html="renderedContent" class="ae-preview-content"></div>
      </div>
    </div>
  </div>
</template>

<script>
// ====== 配置区 ======
const API_BASE = 'https://meteor-collection.vercel.app'

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
      saving: false,
      saveStatus: '',
      article: { ...DEFAULT_ARTICLE },
      rawContent: '',
      editing: false,
      writeKey: '',   // 用户输入的写入密钥（仅用于 POST）
      showKeyInput: false, // 是否显示密钥输入框
      pos: { bottom: 40, right: 40 }, // 按钮位置（距底部、右侧像素）
      dragging: false,
    }
  },
  computed: {
    showComponent() {
      // 仅在标注了 source: db 的动态文章页面显示编辑按钮
      if (this.$route.path === '/') return false
      if (this.$frontmatter.article === false) return false
      if (this.$frontmatter.source !== 'db') return false
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
      if (!this.editing) {
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
      this.saveStatus = ''
    },
    startDrag(e) {
      this.dragging = true
      const startX = e.clientX
      const startY = e.clientY
      const startBottom = this.pos.bottom
      const startRight = this.pos.right
      const winW = window.innerWidth
      const winH = window.innerHeight
      const btnSize = 50

      const onMove = (ev) => {
        const dx = startX - ev.clientX
        const dy = ev.clientY - startY
        this.pos.right = Math.max(0, Math.min(winW - btnSize, startRight + dx))
        this.pos.bottom = Math.max(0, Math.min(winH - btnSize, startBottom + dy))
      }
      const onUp = () => {
        this.dragging = false
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
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
        } else {
          this.article = { ...DEFAULT_ARTICLE }
          this.rawContent = ''
        }
        this.editing = false
        this.showKeyInput = false
        this.writeKey = ''
      } catch (e) {
        this.saveStatus = '网络错误'
        setTimeout(() => { this.saveStatus = '' }, 3000)
        this.article = { ...DEFAULT_ARTICLE }
        this.rawContent = ''
      }
    },
    async saveArticle() {
      // 首次保存或密钥未输入时，弹出密钥输入框
      if (!this.writeKey) {
        this.showKeyInput = true
        return
      }

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
            'Authorization': `Bearer ${this.writeKey}`
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
          this.showKeyInput = false
          setTimeout(() => { this.loadArticle() }, 500)
          setTimeout(() => { this.saveStatus = '' }, 3000)
        } else {
          if (res.status === 401) {
            this.saveStatus = '密钥无效，请重新输入'
            this.showKeyInput = true
            this.writeKey = ''
          } else {
            this.saveStatus = data.error || '保存失败'
          }
          setTimeout(() => { this.saveStatus = '' }, 3000)
        }
      } catch (e) {
        this.saveStatus = '网络错误'
        setTimeout(() => { this.saveStatus = '' }, 3000)
      }
      this.saving = false
    },
    confirmKey() {
      // 用户输入密钥后点击确认，再次触发保存
      this.showKeyInput = false
      this.saveArticle()
    },
    cancelEdit() {
      this.loadArticle()
      this.editing = false
    },
    getPermalink() {
      return this.$frontmatter.permalink || this.$route.path
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

/* 密钥输入区 */
.ae-key-input {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.ae-key-input .ae-input {
  flex: 1;
}

.ae-hint {
  font-size: 0.75rem;
  color: #999;
  margin: 0;
  width: 100%;
  text-align: center;
}

/* 输入框通用样式 */
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
