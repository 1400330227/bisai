import 'dotenv/config'
import express from 'express'
import OpenAI from 'openai'

const app = express()
const port = Number(process.env.API_PORT || 3001)
app.use(express.json({ limit: '32kb' }))

const demandSchema = {
  type: 'object',
  properties: {
    company: { type: 'string' },
    resource: { type: 'string' },
    region: { type: 'string' },
    quantity: { type: 'string' },
    purpose: { type: 'string' },
    period: { type: 'string' },
    supplyPreference: { type: 'string' },
    confidence: { type: 'number' },
    relations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          predicate: { type: 'string' },
          target: { type: 'string' },
          evidence: { type: 'string' },
        },
        required: ['source', 'predicate', 'target', 'evidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['company', 'resource', 'region', 'quantity', 'purpose', 'period', 'supplyPreference', 'confidence', 'relations'],
  additionalProperties: false,
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(process.env.DASHSCOPE_API_KEY && process.env.QWEN_MODEL) })
})

app.post('/api/semantic-parse', async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
  if (!text) return res.status(400).json({ error: '请输入企业需求内容。' })
  if (text.length > 6000) return res.status(413).json({ error: '需求文本不能超过 6000 个字符。' })
  if (!process.env.DASHSCOPE_API_KEY || !process.env.QWEN_MODEL) {
    return res.status(503).json({ error: '千问服务尚未配置。请在项目根目录的 .env 中设置 DASHSCOPE_API_KEY 和 QWEN_MODEL。' })
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    })
    const response = await openai.chat.completions.create({
      model: process.env.QWEN_MODEL,
      messages: [
        { role: 'system', content: [
        '你是矿产资源供需需求解析器。把自然语言企业需求解析成结构化字段和知识图谱三元组。',
        '只依据用户给出的文本抽取，不推测企业身份、资源数量、地区、用途或时限。',
        '未提及的字段填写“未识别”；confidence 为 0 到 1 的数值。',
        'relations 中每条关系要使用明确的主体、谓词、客体；evidence 摘录或概括对应原文，不得添加原文不存在的事实。',
        'resource 使用需求原文中的资源称谓，不要擅自补充资源规格。',
        `只输出一个合法 JSON 对象，字段必须符合此结构：${JSON.stringify(demandSchema)}`,
      ].join('\n') },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    })

    const content = response.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) throw new Error('Qwen returned an empty response')
    const parsed = JSON.parse(content)
    for (const key of demandSchema.required) {
      if (!(key in parsed)) throw new Error(`Qwen response is missing ${key}`)
    }
    return res.json(parsed)
  } catch (error) {
    console.error('Semantic parse request failed:', error?.message || error)
    return res.status(502).json({ error: '模型解析失败，请检查服务配置后重试。' })
  }
})

app.listen(port, '127.0.0.1', () => console.log(`Semantic API listening on http://127.0.0.1:${port}`))
