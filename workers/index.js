/**
 * Meteor Blog API — Cloudflare Worker
 *
 * 提供文章读写接口，连接 MongoDB Atlas Data API。
 *
 * ## 部署前准备（在 MongoDB Atlas 控制台操作）
 *
 * 1. 打开 https://cloud.mongodb.com/ ，选择你的集群
 * 2. 左侧菜单 → "API" → "Data API"
 * 3. 如果还没有 App，点击 "Enable Data API"，App ID 形如 `myapp-xxxxx`
 * 4. 记住你的 Group ID（在集群详情页顶部可以看到，形如 `5f8a1b2c3d4e5f6a7b8c9d0e`）
 * 5. 点击 "API Keys" 标签页 → "Add New API Key"
 *    - 选择 "Read & Write" 权限
 *    - 记录 Public Key 和 Private Key
 *
 * ## 环境变量配置（在 Cloudflare Workers 面板或 wrangler.toml 中设置）
 *
 * | 变量名                     | 说明                                          |
 * | -------------------------- | --------------------------------------------- |
 * | ATLAS_DATA_API_PUBLIC_KEY  | Data API 的 Public Key                        |
 * | ATLAS_DATA_API_PRIVATE_KEY | Data API 的 Private Key                       |
 * | ATLAS_GROUP_ID             | MongoDB Atlas 的 Group ID（集群所在组）       |
 * | ATLAS_APP_ID               | Data API 的 App ID（形如 myapp-xxxxx）        |
 * | WRITE_SECRET               | 写操作的密钥（用于保护 POST 接口）            |
 *
 * ## 环境变量配置（在 wrangler.toml [vars] 中设置，用于本地开发）
 *
 * 同上方变量名，可在 wrangler.toml 的 [vars] 块中配置。
 */

// DB_NAME 和 COLLECTION 从 wrangler.toml [vars] 或 Workers 面板环境变量获取
// 默认值兜底，防止未配置时崩溃
const DEFAULT_DB = 'blog';
const DEFAULT_COLLECTION = 'articles';

// slug 格式校验：只允许字母、数字、连字符、下划线和斜杠
const SLUG_REGEX = /^[\w\-\/]+$/;

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/**
 * 构造 Data API 认证头
 */
function getAuthHeaders(publicKey, privateKey) {
  const auth = btoa(`${publicKey}:${privateKey}`);
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${auth}`,
  };
}

/**
 * 构造 Data API 基础 URL
 * 格式: https://realm.mongodb.com/api/client/v2.0/group/{groupId}/app/{appId}
 */
function buildDataApiUrl(groupId, appId) {
  return `https://realm.mongodb.com/api/client/v2.0/group/${groupId}/app/${appId}`;
}

/**
 * 验证 slug 格式，防止 NoSQL 注入
 */
function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_REGEX.test(slug);
}

// ---------------------------------------------------------------------------
// API 函数
// ---------------------------------------------------------------------------

/**
 * 从 MongoDB Atlas 查询单篇文章
 * @param {string} slug - 文章 slug（对应数据库中的 _id）
 * @param {object} env  - Workers 环境变量
 * @returns {object|null} 文章对象，未找到返回 null
 */
async function fetchArticle(slug, env) {
  if (!isValidSlug(slug)) {
    console.error('fetchArticle: invalid slug format');
    return null;
  }

  const db = env.DB_NAME || DEFAULT_DB;
  const coll = env.COLLECTION || DEFAULT_COLLECTION;
  const baseUrl = buildDataApiUrl(env.ATLAS_GROUP_ID, env.ATLAS_APP_ID);

  // 使用 POST body 传递 filter，避免 NoSQL 注入
  const endpoint = `${baseUrl}/query/${db}/${coll}`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(env.ATLAS_DATA_API_PUBLIC_KEY, env.ATLAS_DATA_API_PRIVATE_KEY),
      body: JSON.stringify({ filter: { _id: slug } }),
    });

    if (!res.ok) {
      console.error(`fetchArticle HTTP ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = await res.json();
    // Data API 返回 { results: [...] } 或直接返回数组，视版本而定
    const results = Array.isArray(data) ? data : (data.results || []);
    return results.length > 0 ? results[0] : null;
  } catch (e) {
    console.error('fetchArticle error:', e.message);
    return null;
  }
}

/**
 * 保存/更新文章（upsert）
 * @param {object} articleData - { slug, title, content }
 * @param {object} env         - Workers 环境变量
 * @returns {boolean} 是否成功
 */
async function saveArticle(articleData, env) {
  if (!isValidSlug(articleData.slug)) {
    console.error('saveArticle: invalid slug format');
    return false;
  }

  const db = env.DB_NAME || DEFAULT_DB;
  const coll = env.COLLECTION || DEFAULT_COLLECTION;
  const baseUrl = buildDataApiUrl(env.ATLAS_GROUP_ID, env.ATLAS_APP_ID);

  // 先尝试查询文档是否存在
  const queryEndpoint = `${baseUrl}/query/${db}/${coll}`;
  try {
    const res = await fetch(queryEndpoint, {
      method: 'POST',
      headers: getAuthHeaders(env.ATLAS_DATA_API_PUBLIC_KEY, env.ATLAS_DATA_API_PRIVATE_KEY),
      body: JSON.stringify({ filter: { _id: articleData.slug } }),
    });

    if (!res.ok) {
      console.error(`saveArticle query failed: ${res.status} ${await res.text()}`);
      // fallback: 直接尝试更新或插入
      return await upsertArticle(articleData, env);
    }

    const data = await res.json();
    const results = Array.isArray(data) ? data : (data.results || []);
    const exists = results.length > 0;

    if (exists) {
      // 更新已有文章
      return await updateArticle(articleData, env);
    } else {
      // 插入新文章
      return await insertArticle(articleData, env);
    }
  } catch (e) {
    console.error('saveArticle error:', e.message);
    return false;
  }
}

/**
 * 插入新文章
 */
async function insertArticle(articleData, env) {
  const db = env.DB_NAME || DEFAULT_DB;
  const coll = env.COLLECTION || DEFAULT_COLLECTION;
  const baseUrl = buildDataApiUrl(env.ATLAS_GROUP_ID, env.ATLAS_APP_ID);
  const endpoint = `${baseUrl}/data/${db}/${coll}`;

  const doc = {
    _id: articleData.slug,
    title: articleData.title,
    content: articleData.content,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(env.ATLAS_DATA_API_PUBLIC_KEY, env.ATLAS_DATA_API_PRIVATE_KEY),
      body: JSON.stringify(doc),
    });
    return res.ok;
  } catch (e) {
    console.error('insertArticle error:', e.message);
    return false;
  }
}

/**
 * 更新已有文章
 */
async function updateArticle(articleData, env) {
  const db = env.DB_NAME || DEFAULT_DB;
  const coll = env.COLLECTION || DEFAULT_COLLECTION;
  const baseUrl = buildDataApiUrl(env.ATLAS_GROUP_ID, env.ATLAS_APP_ID);
  const endpoint = `${baseUrl}/data/${db}/${coll}/${encodeURIComponent(articleData.slug)}`;

  const doc = {
    title: articleData.title,
    content: articleData.content,
    updatedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: getAuthHeaders(env.ATLAS_DATA_API_PUBLIC_KEY, env.ATLAS_DATA_API_PRIVATE_KEY),
      body: JSON.stringify(doc),
    });
    return res.ok;
  } catch (e) {
    console.error('updateArticle error:', e.message);
    return false;
  }
}

/**
 * 直接 upsert（当查询失败时作为 fallback）
 * 策略：先尝试 PATCH（更新），如果返回 404 则 POST（插入）
 */
async function upsertArticle(articleData, env) {
  const db = env.DB_NAME || DEFAULT_DB;
  const coll = env.COLLECTION || DEFAULT_COLLECTION;
  const baseUrl = buildDataApiUrl(env.ATLAS_GROUP_ID, env.ATLAS_APP_ID);
  const endpoint = `${baseUrl}/data/${db}/${coll}`;

  // 先尝试 PATCH（更新），如果返回 404 则 POST（插入）
  const patchUrl = `${endpoint}/${encodeURIComponent(articleData.slug)}`;
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: getAuthHeaders(env.ATLAS_DATA_API_PUBLIC_KEY, env.ATLAS_DATA_API_PRIVATE_KEY),
    body: JSON.stringify({
      title: articleData.title,
      content: articleData.content,
      updatedAt: new Date().toISOString(),
    }),
  });

  if (patchRes.ok || patchRes.status === 204) {
    return true;
  }

  if (patchRes.status === 404) {
    // 文档不存在，尝试插入
    const doc = {
      _id: articleData.slug,
      title: articleData.title,
      content: articleData.content,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const postRes = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(env.ATLAS_DATA_API_PUBLIC_KEY, env.ATLAS_DATA_API_PRIVATE_KEY),
      body: JSON.stringify(doc),
    });
    return postRes.ok;
  }

  console.error('upsertArticle failed:', patchRes.status);
  return false;
}

// ---------------------------------------------------------------------------
// Worker 主逻辑
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 统一 CORS 头辅助函数
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
    };

    // CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // ── GET /api/article/:slug ──────────────────────────────────────────────
    const getMatch = path.match(/^\/api\/article\/(.+)$/);
    if (request.method === 'GET' && getMatch) {
      const slug = getMatch[1]; // URL pathname 已被自动解码，无需再次 decodeURIComponent
      const article = await fetchArticle(slug, env);

      if (!article) {
        return Response.json({ notFound: true }, {
          status: 404,
          headers: corsHeaders,
        });
      }

      // 格式化响应：去掉内部字段，只返回前端需要的字段
      const { _id, title, content, updatedAt, createdAt, ...rest } = article;
      return Response.json({
        slug: _id,
        title,
        content,
        updatedAt,
        createdAt,
        ...rest,
      }, {
        headers: corsHeaders,
      });
    }

    // ── POST /api/article ───────────────────────────────────────────────────
    if (request.method === 'POST' && path === '/api/article') {
      // 验证写操作密钥
      const secret = request.headers.get('Authorization')?.replace('Bearer ', '') || '';
      if (!env.WRITE_SECRET || secret !== env.WRITE_SECRET) {
        return Response.json(
          { success: false, error: 'Unauthorized' },
          { status: 401, headers: corsHeaders }
        );
      }

      try {
        const body = await request.json();

        // 基础校验
        if (!body.slug || !body.title || body.content === undefined) {
          return Response.json(
            { success: false, error: 'Missing required fields: slug, title, content' },
            { status: 400, headers: corsHeaders }
          );
        }

        const ok = await saveArticle(body, env);

        if (!ok) {
          return Response.json(
            { success: false, error: 'Database write failed' },
            { status: 500, headers: corsHeaders }
          );
        }

        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (e) {
        return Response.json(
          { success: false, error: e.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // ── 404 ─────────────────────────────────────────────────────────────────
    return Response.json(
      { error: 'Not Found' },
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  },
};
