// 资源需求匹配引擎（纯前端，规则驱动，不调用任何模型）
// 数据来源：广西企业供需对接清单（36 家）+ 资源需求反向索引（19 条）
import { ENTERPRISES, BACKUP, RESOURCE_INDEX } from '../data/supplyDemand.js'
import { lookupEndowment } from '../data/resourceEndowment.js'

/* ---------- 1. 输入关键词 → 归一化资源 ---------- */
// 用户可能写行业/产品/原料的各种叫法，这里把它们归到语料里的资源口径上
const ALIAS = {
  铝土矿: ['铝土矿', '铝矿', '氧化铝', '电解铝', '铝锭', '铝材', '铝型材', '铝加工', '铝合金', '铝制品', '铝厂', '铝业'],
  铁矿石: ['铁矿石', '铁矿', '钢铁', '钢材', '炼钢', '钢厂', '钢企', '不锈钢', '特钢', '生铁', '汽车板', '机械制造', '装备制造'],
  废钢: ['废钢', '短流程'],
  煤: ['焦煤', '焦炭', '喷吹煤', '动力煤', '无烟煤', '原料煤', '煤化工', '煤炭', '用煤'],
  锰矿石: ['锰矿', '锰矿石', '电解锰', '电解二氧化锰', '硫酸锰', '高纯硫酸锰'],
  锰硅合金: ['锰硅'],
  锡: ['锡矿', '锡精矿', '锡锭', '锡材', '焊锡'],
  锌: ['锌矿', '锌精矿', '锌锭', '镀锌'],
  铅锑: ['铅锌', '铅矿', '铅精矿', '锑', '铅锑'],
  铜: ['铜矿', '铜精矿', '阴极铜', '电解铜', '铜材', '铜箔', '铜线', '铜管', '铜业'],
  镍: ['镍矿', '红土镍矿', '冰镍', '高冰镍', '硫化镍', '硫酸镍', '电解镍', '镍钴', '三元前驱体', '前驱体', 'MHP'],
  钴: ['钴矿', '硫酸钴', '电解钴', '钴中间品'],
  锂: ['锂矿', '锂辉石', '碳酸锂', '氢氧化锂', '锂盐', '磷酸铁锂', '三元材料', '正极材料', '锂电池', '储能电池'],
  磷矿: ['磷矿', '磷矿石', '磷酸', '磷化工', '磷酸铁'],
  硫磺: ['硫磺', '硫酸', '制酸'],
  石灰石: ['石灰石', '石灰岩', '水泥', '熟料', '混凝土', '建材', '水泥厂'],
  石英砂: ['石英砂', '硅砂', '低铁石英砂', '玻璃', '浮法玻璃', '光伏玻璃', '硅质原料'],
  碳酸钙原料: ['碳酸钙', '重钙', '轻钙', '纳米钙', '方解石', '大理岩', '粉体', '重质碳酸钙'],
  白云石: ['白云石'],
  石膏: ['石膏'],
  粘土: ['粘土', '页岩', '陶瓷', '砖瓦'],
  砂岩: ['砂岩'],
  重晶石: ['重晶石'],
  萤石: ['萤石'],
  纯碱: ['纯碱', '苏打'],
  原油: ['原油', '炼油', '炼化', '乙烯', '石化', '石油'],
  原盐: ['原盐', '氯碱', '烧碱', '聚氯乙烯', 'PVC', '海盐', '卤水'],
  丙烷: ['丙烷', 'PDH', '丙烯', '脱氢'],
  甘蔗: ['甘蔗', '制糖', '糖厂', '制糖企业', '榨季', '蔗区'],
  木质原料: ['桉木', '桉树', '木片', '木材', '木质原料', '造纸', '浆纸', '纸浆', '造纸厂', '人造板', '纤维板', '密度板', '刨花板', '家具', '家居', '板材'],
  竹: ['竹', '以竹代塑', '竹制品', '竹纤维'],
  电力: ['电力', '用电', '电耗', '绿电', '自备电厂'],
  水: ['取水', '取水权', '用水', '水资源'],
  天然气: ['天然气', '燃气'],
  橡胶: ['橡胶', '轮胎'],
  稀土: ['稀土', '永磁'],
}

/* 综合成「别名 → 归一化资源」的反查表（长词优先，避免「电」吃掉「电解铝」） */
const ALIAS_KEYS = Object.keys(ALIAS)
  .flatMap(canon => ALIAS[canon].map(k => ({ k, canon })))
  .sort((a, b) => b.k.length - a.k.length)

/* 数据里的资源项 → 归一化资源名 */
const CANON_RULES = [
  [/铝土矿/, '铝土矿'], [/氧化铝/, '氧化铝'], [/铁矿石|铁矿/, '铁矿石'],
  [/废钢/, '废钢'], [/锰硅/, '锰硅合金'], [/锰矿/, '锰矿石'],
  [/锡/, '锡'], [/锌/, '锌'], [/铅|锑/, '铅锑'], [/铜/, '铜'],
  [/镍/, '镍'], [/钴/, '钴'], [/锂/, '锂'], [/磷/, '磷矿'], [/硫/, '硫磺'],
  [/石灰石|石灰岩/, '石灰石'], [/石英砂|硅质/, '石英砂'],
  [/大理岩|方解石|碳酸钙/, '碳酸钙原料'],
  [/白云石/, '白云石'], [/石膏/, '石膏'], [/粘土/, '粘土'], [/砂岩/, '砂岩'],
  [/重晶石/, '重晶石'], [/萤石/, '萤石'], [/纯碱/, '纯碱'],
  [/原油/, '原油'], [/原盐/, '原盐'], [/丙烷/, '丙烷'],
  [/甘蔗/, '甘蔗'], [/桉木|木片|木质|木材/, '木质原料'], [/竹/, '竹'],
  [/煤|焦/, '煤'], [/钢/, '钢材'], [/天然气/, '天然气'], [/橡胶/, '橡胶'],
  [/稀土/, '稀土'], [/取水|水/, '水'], [/电/, '电力'], [/热力/, '电力'],
]
export function canonResource(item) {
  const t = String(item).split('（')[0].trim()
  for (const [re, c] of CANON_RULES) if (re.test(t)) return c
  return t
}

/* 省份/城市，用于加权 */
const PLACES = ['南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色',
  '贺州', '河池', '来宾', '崇左', '平果', '德保', '靖西', '南丹', '岑溪', '大新', '博白',
  '合浦', '铁山港', '龙潭', '企沙', '武宣', '兴业', '平南', '覃塘', '上林', '龙州']

/* ---------- 2. 识别输入里的关键词 ---------- */
export function extractTerms(text) {
  const q = String(text || '')
  const hits = []
  for (const { k, canon } of ALIAS_KEYS) {
    if (q.includes(k) && !hits.some(h => h.canon === canon && h.k === k)) hits.push({ k, canon })
  }
  return hits
}

/* ---------- 2.5 资源普及度权重 ----------
   电力、取水几乎家家都要，若按命中企业数累加，它们会永远霸榜。
   这里用「企业总数 / 需要该资源的企业数」开方做权重，稀有资源自然上浮。 */
let _DF = null
function resourceDF() {
  if (_DF) return _DF
  const m = new Map()
  for (const e of ENTERPRISES) {
    for (const c of new Set(e.needs.map(canonResource))) m.set(c, (m.get(c) || 0) + 1)
  }
  _DF = m
  return m
}
function idf(canon) {
  const df = resourceDF().get(canon) || 1
  // 指数压到 0.35：既要让「电力/取水」这类全民资源下沉，又不能把
  // 「砂岩/石膏」这种只被水泥厂需要的小辅料抬到主料石灰石前头
  return Math.pow(ENTERPRISES.length / (1 + df), 0.35)
}

/* 需求条目在企业档案里越靠前，越可能是主料 */
function posWeight(i) { return i === 0 ? 2 : (i === 1 ? 1.3 : (i === 2 ? 1.1 : 1)) }

/* ---------- 3. 企业打分 ---------- */
function scoreEnterprise(e, terms, q) {
  const entText = e.intro + e.group + e.needsRaw + e.place
  const needsCanon = e.needs.map(canonResource)
  let score = 0
  const hitKinds = new Set()

  for (const t of terms) {
    // 企业档案里本身就写了用户说的那个词 → 最相关（比如输入「水泥」，
    // 水泥厂简介里就有「水泥」，而铝厂只是碰巧也需求石灰石）
    const literal = entText.includes(t.k)
    const inNeeds = needsCanon.includes(t.canon)
    const exact = q.includes(t.canon) // 用户直接点了资源本名，如「石灰石」

    if (literal) { score += 5; hitKinds.add(t.k) }
    else if (inNeeds) { score += exact ? 5 : 1.5 }
    else if (entText.includes(t.canon)) { score += 2 }

    // 需求条目里命中，且不是「碰巧」——再加一档
    if (!literal && inNeeds && exact) hitKinds.add(t.canon)
  }
  for (const p of PLACES) {
    if (q.includes(p) && e.place.includes(p)) { score += 3; hitKinds.add(p) }
  }
  return { score, hitKinds: [...hitKinds] }
}

/* ---------- 4. 主入口 ---------- */
export function runMatch(text) {
  const q = String(text || '').trim()
  const terms = extractTerms(q)

  const scored = ENTERPRISES
    .map(e => ({ e, ...scoreEnterprise(e, terms, q) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)

  // 只保留与最高分同量级的企业，避免把「碰巧也需求该资源」的无关企业带进来
  const maxScore = scored.length ? scored[0].score : 0
  const strong = scored.filter(x => x.score >= Math.max(maxScore * 0.35, 1))
  const topEnterprises = strong.slice(0, 6)

  // 推荐资源：命中的企业按分数加权汇总（主料位次加权），再乘资源普及度权重
  const resMap = new Map()
  for (const { e, score } of strong.slice(0, 10)) {
    e.needs.forEach((need, i) => {
      const c = canonResource(need)
      if (!resMap.has(c)) resMap.set(c, { name: c, score: 0, enterprises: [], sample: need, df: resourceDF().get(c) || 1 })
      const r = resMap.get(c)
      r.score += score * posWeight(i)
      if (r.enterprises.length < 4 && !r.enterprises.includes(e.name)) r.enterprises.push(e.name)
    })
  }
  for (const r of resMap.values()) r.score *= idf(r.name)

  const resources = [...resMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(r => {
      // 优先挑「需求企业里含本次匹配到的企业」的那条反向索引，避免张冠李戴；
      // 找不到就只认归一化后完全同名的，宁缺毋滥
      const idx = RESOURCE_INDEX.find(x => x.companies && r.enterprises.some(n => x.companies.includes(n.slice(0, 8))))
        || RESOURCE_INDEX.find(x => canonResource(x.resource) === r.name)
      // 供给侧：这份资源在广西 / 东盟哪里有、有多少（来自另一份公开数据）
      const supply = lookupEndowment(r.name)
      return { ...r, evidence: idx || null, supply }
    })

  return {
    ok: terms.length > 0 && strong.length > 0,
    terms,
    resources,
    enterprises: topEnterprises.map(x => ({
      name: x.e.name, group: x.e.group, place: x.e.place,
      needs: x.e.needs, scale: x.e.scale, certainty: x.e.certainty,
      hits: x.hitKinds, score: Math.round(x.score),
    })),
    pool: { enterprises: ENTERPRISES.length + BACKUP.length, resources: RESOURCE_INDEX.length, matched: strong.length },
  }
}

/* 空态下的示例问题 */
export const EXAMPLES = [
  { icon: '铝', text: '我们要建一条铝型材生产线，需要哪些矿产？' },
  { icon: '泥', text: '新建水泥熟料线，主要原料从哪来？' },
  { icon: '电', text: '做三元锂电池前驱体，需要哪些金属原料？' },
  { icon: '纸', text: '造纸厂，木片和浆料的需求量大概多少？' },
]
