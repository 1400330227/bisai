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

app.get('/api/geocode', async (req, res) => {
  const address = typeof req.query.address === 'string' ? req.query.address.trim() : ''
  const company = typeof req.query.company === 'string' ? req.query.company.trim() : ''
  if (!address) return res.status(400).json({ error: '请提供企业所在地地址。' })
  if (address.length > 300) return res.status(413).json({ error: '地址长度不能超过 300 个字符。' })
  if (company.length > 120) return res.status(413).json({ error: '企业名称长度不能超过 120 个字符。' })
  if (!process.env.AMAP_WEB_SERVICE_KEY) {
    return res.status(503).json({ error: '未配置高德 Web 服务 Key；地图显示使用的 Web 端 Key 不能用于地址解析。' })
  }

  try {
    if (company) {
      const city = address.match(/[\u4e00-\u9fff]{2,10}(?:市|州|盟|地区)/)?.[0]
      const searchParams = new URLSearchParams({ key: process.env.AMAP_WEB_SERVICE_KEY, keywords: company, output: 'JSON', offset: '20', page: '1' })
      if (city) { searchParams.set('city', city); searchParams.set('citylimit', 'true') }
      const searchResponse = await fetch(`https://restapi.amap.com/v3/place/text?${searchParams}`, { signal: AbortSignal.timeout(8000) })
      if (searchResponse.ok) {
        const searchPayload = await searchResponse.json()
        const coreName = value => String(value || '').toLowerCase().replace(/[\s（）()·、，,]/g, '').replace(/股份有限公司|有限责任公司|有限公司|集团公司|集团|公司/g, '')
        const targetName = coreName(company)
        const matchingPoi = searchPayload.status === '1' && searchPayload.pois?.find(poi => {
          const poiName = coreName(poi.name)
          return poiName.length >= 3 && targetName.length >= 3 && (targetName.includes(poiName) || poiName.includes(targetName))
        })
        const [longitude, latitude] = String(matchingPoi?.location || '').split(',').map(Number)
        if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
          return res.json({ longitude, latitude, level: '企业POI', formattedAddress: [matchingPoi.name, matchingPoi.address].filter(Boolean).join(' · ') })
        }
      }
    }
    const params = new URLSearchParams({ key: process.env.AMAP_WEB_SERVICE_KEY, address, output: 'JSON' })
    const upstream = await fetch(`https://restapi.amap.com/v3/geocode/geo?${params}`, { signal: AbortSignal.timeout(8000) })
    if (!upstream.ok) throw new Error(`AMap geocoder HTTP ${upstream.status}`)
    const payload = await upstream.json()
    const result = payload.status === '1' ? payload.geocodes?.[0] : null
    const [longitude, latitude] = String(result?.location || '').split(',').map(Number)
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return res.status(404).json({ error: payload.info || '高德未能解析该地址。' })
    }
    return res.json({ longitude, latitude, level: result.level || '', formattedAddress: result.formatted_address || address })
  } catch (error) {
    console.error('AMap geocode request failed:', error?.message || error)
    return res.status(502).json({ error: '高德地址解析暂时失败，请检查 Web 服务 Key 和网络。' })
  }
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
