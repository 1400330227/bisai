import { companies, resourceIndex } from './supplyData'
import { knowledgeResourceTables } from './knowledgeResourceTables'

let nextId = 0
const nodes = []
const edges = []
const nodeByKey = new Map()
const edgeKeys = new Set()
const formatAttributes = attributes => Object.entries(attributes || {}).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([name, value]) => {
  if (Array.isArray(value) && value.some(item => item && typeof item === 'object')) {
    const preview = value.slice(0, 3).map(item => [item.地区, item.指标, item.数量, item.单位].filter(Boolean).join(' ')).join('；')
    return `${name}：${value.length}条${preview ? `（${preview}${value.length > 3 ? '；…' : ''}）` : ''}`
  }
  return `${name}：${Array.isArray(value) ? value.join('、') : typeof value === 'object' ? JSON.stringify(value) : value}`
}).join('；')
const addNode = ({ key, id, label, type, sub = '', attributes = {}, evidence = '' }) => {
  const nodeKey = key || `${type}:${label}`
  if (nodeByKey.has(nodeKey)) {
    const existing = nodeByKey.get(nodeKey)
    Object.assign(existing.attributes, attributes)
    existing.attributesText = formatAttributes(existing.attributes)
    if (sub && !existing.sub) existing.sub = sub
    if (evidence && !existing.evidence) existing.evidence = evidence
    return existing
  }
  const node = { id: id || `kg-${++nextId}`, label, type, sub, attributes, attributesText: formatAttributes(attributes), evidence }
  nodes.push(node)
  nodeByKey.set(nodeKey, node)
  return node
}
const appendAttribute = (node, name, value) => {
  const values = node.attributes[name] || (node.attributes[name] = [])
  if (!values.includes(value)) values.push(value)
  node.attributesText = formatAttributes(node.attributes)
}
const addEdge = (from, to, type, evidence = '') => {
  if (!from || !to || from.id === to.id) return
  const key = `${from.id}|${to.id}|${type}`
  if (edgeKeys.has(key)) return
  edgeKeys.add(key)
  edges.push({ from: from.id, to: to.id, type, evidence })
}
const tableRows = name => Object.values(knowledgeResourceTables[name] || {}).map(row => Object.values(row))

const guangxi = addNode({ key: 'region:guangxi', id: 'region-guangxi', label: '广西壮族自治区', type: 'region', sub: '自治区 · 2025年常住人口 4,989 万', attributes: { 行政层级: '自治区', 首府: '南宁市', 常住人口: '4,989万人（2025）', 地级行政区: 14, 县级行政区: 111 }, evidence: '行政区与人口：广西壮族自治区人民政府、自治区统计局和民政厅（2026-03-25）' })
const asean = addNode({ key: 'region:asean', id: 'region-asean', label: '东盟', type: 'region', sub: '区域合作组织 · 11 个成员国', attributes: { 成员国数: 11, 口径: '截至2026年，含东帝汶' }, evidence: '成员与区域合作：ASEAN 官方门户；东帝汶于2025年10月加入' })
addEdge(guangxi, asean, '面向东盟合作', '广西2025年重点工作包括深化与东盟务实合作、推进中越跨境经济合作区试点')

const divisions = [
  ['南宁市','兴宁区、青秀区、江南区、西乡塘区、良庆区、邕宁区、武鸣区、隆安县、马山县、上林县、宾阳县、横州市'],
  ['柳州市','城中区、鱼峰区、柳南区、柳北区、柳江区、柳城县、鹿寨县、融安县、融水苗族自治县、三江侗族自治县'],
  ['桂林市','秀峰区、叠彩区、象山区、七星区、雁山区、临桂区、阳朔县、灵川县、全州县、兴安县、永福县、灌阳县、龙胜各族自治县、资源县、平乐县、恭城瑶族自治县、荔浦市'],
  ['梧州市','万秀区、长洲区、龙圩区、苍梧县、藤县、蒙山县、岑溪市'],
  ['北海市','海城区、银海区、铁山港区、合浦县'],
  ['防城港市','港口区、防城区、上思县、东兴市'],
  ['钦州市','钦南区、钦北区、灵山县、浦北县'],
  ['贵港市','港北区、港南区、覃塘区、平南县、桂平市'],
  ['玉林市','玉州区、福绵区、容县、陆川县、博白县、兴业县、北流市'],
  ['百色市','右江区、田阳区、田东县、德保县、那坡县、凌云县、乐业县、田林县、西林县、隆林各族自治县、靖西市、平果市'],
  ['贺州市','八步区、平桂区、昭平县、钟山县、富川瑶族自治县'],
  ['河池市','金城江区、宜州区、南丹县、天峨县、凤山县、东兰县、罗城仫佬族自治县、环江毛南族自治县、巴马瑶族自治县、都安瑶族自治县、大化瑶族自治县'],
  ['来宾市','兴宾区、忻城县、象州县、武宣县、金秀瑶族自治县、合山市'],
  ['崇左市','江州区、扶绥县、宁明县、龙州县、大新县、天等县、凭祥市'],
]
const gxCities = new Map()
const gxCounties = new Map()
divisions.forEach(([cityName, countyText], cityIndex) => {
  const city = addNode({ key: `city:${cityName}`, id: `gx-city-${cityIndex + 1}`, label: cityName, type: 'city', sub: '广西 · 地级市', attributes: { 行政层级: '地级市', 所属地区: '广西壮族自治区', 县级行政区数量: countyText.split('、').length }, evidence: '广西壮族自治区人民政府《区划人口》，2025年行政区划' })
  gxCities.set(cityName, city)
  addEdge(guangxi, city, '下辖地级市')
  countyText.split('、').forEach((countyName, countyIndex) => {
    const county = addNode({ key: `county:${cityName}:${countyName}`, id: `gx-county-${cityIndex + 1}-${countyIndex + 1}`, label: countyName, type: 'county', sub: `${cityName} · 县级行政区`, attributes: { 行政层级: '县级行政区', 所属地级市: cityName, 所属地区: '广西壮族自治区' }, evidence: '广西壮族自治区人民政府《区划人口》，2025年行政区划' })
    gxCounties.set(countyName, county)
    addEdge(city, county, '下辖县级行政区')
  })
})

const countryData = [
  { id:'brunei', label:'文莱', capital:'斯里巴加湾市', units:'都东区、马来奕区、文莱摩拉区、淡布隆区' },
  { id:'cambodia', label:'柬埔寨', capital:'金边', units:'班迭棉吉省、马德望省、磅湛省、磅清扬省、磅士卑省、磅通省、贡布省、干丹省、白马省、西哈努克省、戈公省、桔井省、蒙多基里省、奥多棉吉省、拜林省、金边市、柏威夏省、菩萨省、波罗勉省、腊塔纳基里省、暹粒省、上丁省、柴桢省、茶胶省、特本克蒙省' },
  { id:'indonesia', label:'印度尼西亚', capital:'雅加达', units:'亚齐省、北苏门答腊省、西苏门答腊省、廖内省、占碑省、南苏门答腊省、明古鲁省、楠榜省、邦加-勿里洞群岛省、廖内群岛省、雅加达首都特区、西爪哇省、中爪哇省、日惹特区、东爪哇省、万丹省、巴厘省、西努沙登加拉省、东努沙登加拉省、西加里曼丹省、中加里曼丹省、南加里曼丹省、东加里曼丹省、北加里曼丹省、北苏拉威西省、中苏拉威西省、南苏拉威西省、东南苏拉威西省、哥伦打洛省、西苏拉威西省、马鲁古省、北马鲁古省、西巴布亚省、西南巴布亚省、巴布亚省、南巴布亚省、中巴布亚省、高地巴布亚省' },
  { id:'laos', label:'老挝', capital:'万象', units:'阿速坡省、博胶省、波里坎赛省、占巴塞省、华潘省、甘蒙省、琅南塔省、琅勃拉邦省、乌多姆赛省、丰沙里省、沙拉湾省、沙湾拿吉省、色贡省、万象省、赛宋本省、川圹省、万象市' },
  { id:'malaysia', label:'马来西亚', capital:'吉隆坡', units:'玻璃市、吉打州、槟城、霹雳州、雪兰莪、森美兰、马六甲、柔佛、彭亨、吉兰丹、登嘉楼、沙巴、砂拉越、吉隆坡联邦直辖区、布城联邦直辖区、纳闽联邦直辖区' },
  { id:'myanmar', label:'缅甸', capital:'内比都', units:'克钦邦、克耶邦、克伦邦、钦邦、孟邦、若开邦、掸邦、实皆省、德林达依省、勃固省、马圭省、曼德勒省、仰光省、伊洛瓦底省、内比都联邦区' },
  { id:'philippines', label:'菲律宾', capital:'马尼拉', units:'伊罗戈区、卡加延河谷区、中吕宋区、卡拉巴松区、民马罗巴区、比科尔区、西米沙鄢区、内格罗斯岛区、中米沙鄢区、东米沙鄢区、三宝颜半岛区、北棉兰老区、达沃区、索科斯克萨尔根区、卡拉加区、科迪勒拉行政区、国家首都区、邦萨摩洛自治区' },
  { id:'singapore', label:'新加坡', capital:'新加坡', units:'中区规划区、东区规划区、北区规划区、东北区规划区、西区规划区' },
  { id:'thailand', label:'泰国', capital:'曼谷', units:'春武里府、罗勇府、尖竹汶府、达叻府、呵叻府、北碧府、素叻他尼府、宋卡府、普吉府、甲米府、曼谷' },
  { id:'vietnam', label:'越南', capital:'河内', units:'河内市、顺化市、莱州省、奠边省、山罗省、谅山省、广宁省、清化省、乂安省、河静省、高平省、宣光省、老街省、太原省、富寿省、北宁省、兴安省、海防市、宁平省、广治省、岘港市、广义省、嘉莱省、庆和省、林同省、多乐省、胡志明市、同奈省、西宁省、芹苴市、永隆省、同塔省、金瓯省、安江省' },
  { id:'timor-leste', label:'东帝汶', capital:'帝力', units:'艾莱乌市镇、阿伊纳罗市镇、包考市镇、博博纳罗市镇、科瓦利马市镇、帝力市镇、埃尔梅拉市镇、劳滕市镇、利基萨市镇、马纳图托市镇、马努法希市镇、维克克市镇、阿陶罗市镇、欧库西市镇' },
]
const countryAliases = { '印度尼西亚': ['印度尼西亚', '印尼', '印度尼西亞'], '马来西亚': ['马来西亚'], '越南': ['越南'], '老挝': ['老挝', '寮国'], '缅甸': ['缅甸'], '泰国': ['泰国'], '柬埔寨': ['柬埔寨'], '菲律宾': ['菲律宾'], '文莱': ['文莱'], '新加坡': ['新加坡'], '东帝汶': ['东帝汶'] }
const countries = new Map()
countryData.forEach(({ id, label, capital, units }) => {
  const completeUnits = ['越南', '马来西亚', '印度尼西亚', '菲律宾', '柬埔寨', '缅甸', '老挝', '文莱', '东帝汶'].includes(label)
  const country = addNode({ key: `country:${id}`, id: `asean-${id}`, label, type: 'region', sub: `东盟成员国 · 首都 ${capital}`, attributes: { 行政层级: '国家', 首都: capital, 区域单元口径: label === '新加坡' ? '一级规划区样例' : completeUnits ? '一级行政区清单' : '资源重点行政区样例（非完整清单）', 资源摘要: '' }, evidence: '国家与成员身份：ASEAN 官方门户；行政区域名称按各国公开区划资料整理，部分为资源重点地区样例' })
  countries.set(label, country)
  addEdge(asean, country, '成员国')
  units.split('、').forEach((unit, index) => {
    const subdivision = addNode({ key: `asean-unit:${id}:${unit}`, id: `asean-unit-${id}-${index + 1}`, label: unit, type: 'province', sub: `${label} · ${label === '新加坡' ? '规划区' : completeUnits ? '一级行政区' : '资源重点行政区样例'}`, attributes: { 行政层级: label === '新加坡' ? '规划区' : '一级行政区', 所属国家: label, 区划口径: label === '新加坡' ? '城市规划区' : completeUnits ? '一级行政区清单' : '资源重点行政区样例（非完整清单）' }, evidence: label === '越南' ? '2025-07-01起施行的34个省级行政单位；越南政府第19/2025/QĐ-TTg号决定' : '所属国家公开行政区划；新加坡采用规划区口径；部分国家仅列与资源相关的代表区域' })
    addEdge(country, subdivision, label === '新加坡' ? '划分规划区' : '下辖一级行政区')
  })
})
const vietnam = countries.get('越南')
addEdge(guangxi, vietnam, '陆地接壤', '广西与越南接壤；广西百色重点开发开放试验区官方介绍')
addEdge(gxCities.get('百色市'), vietnam, '陆地接壤', '广西壮族自治区投资促进局：百色市南与越南交界')

const sourceWorkbook = addNode({ key: 'document:resource-workbook', id: 'doc-resource-workbook', label: '广西与东盟资源数据表', type: 'document', sub: '用户提供 · XLSX', attributes: { 数据范围: '广西市县、东盟矿产能源、自然资源', 更新口径: '按原表记录' }, evidence: '用户提供的《广西与东盟十国_主要矿产与自然资源.xlsx》；表内保留基准年份与来源说明' })
const sourceNarrative = addNode({ key: 'document:resource-narrative', id: 'doc-resource-narrative', label: '广西与东盟资源说明', type: 'document', sub: '用户提供 · DOCX', attributes: { 数据范围: '主要矿产、自然资源与口径说明' }, evidence: '用户提供的《广西与东盟十国_主要矿产与自然资源.docx》；用于解释资源表来源、时点与统计口径' })
addEdge(sourceWorkbook, sourceNarrative, '数据口径说明')
const sourceCompanies = addNode({ key: 'document:company-csv', id: 'doc-company-csv', label: '广西企业供需清单', type: 'document', sub: '用户提供 · CSV', attributes: { 数据范围: '企业所在地、简介、需求资源、需求量级、确定性' }, evidence: '用户提供的《广西企业供需对接清单.csv》；反向索引另作为关联核对来源' })
const sourceDemandIndex = addNode({ key: 'document:demand-index', id: 'doc-demand-index', label: '资源需求反向索引', type: 'document', sub: '用户提供 · CSV', attributes: { 数据范围: '资源品种、需求企业、所在地、需求量级' }, evidence: '用户提供的《资源需求反向索引.csv》；用于核对资源与企业需求关联' })

const resourceByKey = new Map()
const normalizeResourceName = value => String(value || '').replace(/[（(][^）)]*[）)]/g, '').replace(/\s/g, '').replace(/矿石|精矿|矿砂|矿粉/g, '矿').replace(/炭/g, '煤')
const resourceCategory = name => /电力|电|煤|焦炭|焦煤|原油|油气|天然气|丙烷|柴油|汽油|水电/.test(name) ? '能源资源' : /铝|铁|锰|锌|铅|锑|锡|铜|镍|钴|锂|金|银|钨|钼|铬|稀土|钛|钒|钴|锗|镓|铟/.test(name) ? '金属资源' : /矿|石灰石|砂岩|石英|磷|硫|盐|石膏|萤石|粘土|白云石|重晶石|方解石/.test(name) ? '矿产资源' : '自然资源'
const getResource = (name, detail = {}) => {
  const label = String(name || '').trim()
  const key = normalizeResourceName(label)
  let node = resourceByKey.get(key)
  const category = resourceCategory(label)
  if (!node) {
    node = addNode({ key: `resource:${key}`, id: `resource-${++nextId}`, label, type: 'resource', sub: category, attributes: { 资源类别: category, 原始名称: label, 指标记录: [] }, evidence: '资源属性按名称和用户提供的矿产、能源与自然资源表分类' })
    resourceByKey.set(key, node)
  }
  if (detail.record) {
    node.attributes.指标记录.push(detail.record)
    node.attributesText = formatAttributes(node.attributes)
  }
  return node
}

const addLocalityNode = (label, type, parent, attrs, evidence, idSuffix) => {
  const node = addNode({ key: `${type}:${parent.id}:${label}:${idSuffix}`, id: `${type}-${++nextId}`, label, type, sub: attrs.资源 ? String(attrs.资源).slice(0, 20) : attrs.行政层级 || '', attributes: attrs, evidence })
  addEdge(parent, node, '资源分布于')
  return node
}
const companyCityLinks = company => {
  const text = String(company.location || '')
  const matchedCities = [...gxCities.entries()].filter(([name]) => text.includes(name)).map(([, node]) => node)
  const matchedCounties = [...gxCounties.entries()].filter(([name]) => text.includes(name)).map(([, node]) => node)
  matchedCities.forEach(city => addEdge(city, company, '企业所在地 / 项目地'))
  matchedCounties.forEach(county => addEdge(county, company, '企业所在地 / 项目地'))
  if (!matchedCities.length && !matchedCounties.length) {
    const countryMatch = [...countries.entries()].find(([name]) => text.includes(name))
    if (countryMatch) addEdge(countryMatch[1], company, '企业经营区域')
    else addEdge(guangxi, company, '企业经营区域（清单所在地）')
  }
}

const knownGroups = [
  ['广西华锡集团', /广西华锡集团/, '控股股东'], ['广投银海铝业', /广投银海铝业|广西投资集团/, '股东 / 控股集团'], ['中国铝业', /中国铝业/, '股东 / 控股集团'], ['五矿铝业', /五矿铝业/, '股东'],
  ['中金岭南', /中金岭南/, '母公司 / 收购方'], ['广东省广晟控股集团', /广晟控股/, '实际控制人'], ['金川集团', /金川集团/, '控股股东'], ['华润水泥控股', /华润水泥控股/, '母公司'],
  ['上海华谊控股集团', /上海华谊控股集团|上海华谊控股/, '母公司'], ['上海氯碱化工', /上海氯碱化工/, '母公司 / 关联企业'], ['中伟新材料股份', /中伟新材料股份/, '母公司'], ['浙江华友钴业', /浙江华友钴业/, '控股股东'],
  ['泰国两仪集团', /泰国两仪集团/, '中泰合资股东'], ['山东太阳控股集团', /山东太阳控股集团/, '母公司'], ['上汽集团', /上汽集团/, '合资股东'], ['通用汽车', /通用汽车/, '合资股东'],
  ['广西汽车集团', /广西汽车集团/, '合资股东'], ['比亚迪', /比亚迪/, '控股股东'], ['广西柳工集团', /广西柳工集团/, '控股股东'],
]
const groups = new Map()
const companyNodes = []
companies.forEach(company => {
  const overview = String(company.intro || '').split(/[。；;]/).filter(Boolean).slice(0, 2).join('；').slice(0, 170)
  const node = addNode({ key: `company:${company.id}`, id: `company-${company.id}`, label: company.name, type: 'company', sub: `${company.industry || '企业'} · ${String(company.location || '').slice(0, 20)}`, attributes: { 行政地址: company.location || '未提供', 行业: company.industry || '未提供', 需求资源: company.needs, 需求量级: company.demand || '未披露', 需求确定性: company.certainty || '待核实', 业务简介: overview, 企业类型: company.alternative ? '补充候选企业' : '企业清单记录' }, evidence: `来源：用户提供企业供需清单。简介：${overview}` })
  companyNodes.push(node)
  addEdge(node, sourceCompanies, '信息来源')
  companyCityLinks({ ...company, id: node.id })
  company.needs.forEach(resourceName => addEdge(node, getResource(resourceName), '需求资源'))
  knownGroups.forEach(([name, pattern, relation]) => {
    if (!pattern.test(company.intro || '')) return
    let group = groups.get(name)
    if (!group) {
      group = addNode({ key: `company-group:${name}`, id: `org-${groups.size + 1}`, label: name, type: 'company', sub: '集团 / 股东 / 合资方', attributes: { 企业类型: '集团或股东实体' }, evidence: '实体名称及关系词来自企业简介；具体持股比例以原始清单文字为准' })
      groups.set(name, group)
    }
    addEdge(node, group, relation, `企业简介出现“${name}”及股权、控股、隶属或合资表述`)
  })
  const overseasText = `${company.location || ''} ${company.intro || ''}`
  countryData.forEach(country => {
    if (!(countryAliases[country.label] || [country.label]).some(alias => overseasText.includes(alias))) return
    if (!/海外|境外|印尼|进口|项目|基地|合作|海运|供货|采购/.test(overseasText)) return
    addEdge(node, countries.get(country.label), '境外基地 / 供需关联', `企业简介提及${country.label}及海外项目、生产基地或供需活动；属于文本匹配关系`) 
  })
})

resourceIndex.forEach(row => {
  const resource = getResource(row.resource)
  resource.attributes.需求企业索引 = row.companies
  resource.attributes.需求所在地索引 = row.location
  resource.attributes.需求量级索引 = row.quantity
  resource.attributesText = formatAttributes(resource.attributes)
  addEdge(resource, sourceDemandIndex, '需求反向索引', `${row.resource}：${row.companies}；所在地：${row.location}；需求量级：${row.quantity}`)
  companyNodes.filter(company => String(row.companies || '').includes(company.label)).forEach(company => addEdge(company, sourceDemandIndex, '索引列出企业', `${row.resource}反向索引明确列出该企业`))
})

const [cityRows, countyRows, aseanRows, natureRows, refRows] = [
  tableRows('guangxiCityResources'), tableRows('guangxiCountyResources'), tableRows('aseanMineralResources'), tableRows('naturalResources'), tableRows('sourceReferences'),
]
cityRows.forEach((row, index) => {
  const [cityName, mineral, metric, quantity, unit, mine, note] = row
  const city = [...gxCities.entries()].find(([name]) => String(cityName).includes(name))?.[1] || guangxi
  const record = { 指标: metric, 数量: quantity, 单位: unit, 基准说明: note }
  appendAttribute(city, '资源指标', `${mineral}：${metric} ${quantity} ${unit}`)
  const resource = getResource(mineral, { record: { 地区: cityName, ...record, 依据: '用户提供资源工作簿·广西市级资源表' } })
  addEdge(city, resource, '资源分布 / 储量记录', String(note || ''))
  if (mine && !/未分项|未在市级表中分项/.test(String(mine))) {
    const site = addLocalityNode(String(mine).slice(0, 34), 'mine', city, { 所属市: cityName, 资源: mineral, 指标: metric, 数量: quantity, 单位: unit }, String(note || '来源：用户提供资源工作簿·广西市级资源表'), `city-${index}`)
    addEdge(site, resource, '矿区赋存资源')
  }
  addEdge(resource, sourceWorkbook, '数据来源')
})
countyRows.forEach((row, index) => {
  const [cityName, countyName, mineral, mine, quantity, unit, year, note] = row
  const city = gxCities.get(String(cityName)) || guangxi
  const countyNames = String(countyName).split(/[\/、，,；;]/).map(value => value.replace(/[（(][^）)]*[）)]/g, '').trim()).filter(Boolean)
  const parentCounties = [...new Set(countyNames.flatMap(part => [...gxCounties.entries()].filter(([name]) => part.includes(name) || name.includes(part)).map(([, node]) => node)))]
  const county = parentCounties[0] || addNode({ key: `county:extra:${countyName}`, id: `gx-county-extra-${index}`, label: String(countyName), type: 'county', sub: `${cityName} · 矿区记录`, attributes: { 行政层级: '县级行政区 / 资源地点', 所属地级市: cityName }, evidence: '县级资源地点来自用户提供资源工作簿；行政区名称以该表记录为准' })
  if (!parentCounties.length) addEdge(city, county, '资源地点位于')
  appendAttribute(county, '资源指标', `${mineral}：${quantity} ${unit}${year && year !== '—' ? `（${year}）` : ''}`)
  const resource = getResource(mineral, { record: { 地区: `${cityName}${countyName}`, 指标: '资源量 / 储量', 数量: quantity, 单位: unit, 基准年份: year, 依据: '用户提供资源工作簿·广西县级及矿区表' } })
  const site = addLocalityNode(String(mine).slice(0, 34), 'mine', county, { 所属市: cityName, 所属县: countyName, 资源: mineral, '资源量 / 储量': quantity, 单位: unit, 基准年份: year }, String(note || '来源：用户提供资源工作簿·广西县级及矿区表'), `county-${index}`)
  parentCounties.slice(1).forEach(parent => addEdge(parent, site, '矿区跨县分布'))
  addEdge(site, resource, '矿区赋存资源')
  addEdge(resource, sourceWorkbook, '数据来源')
})

const normalizeCountry = value => {
  const text = String(value || '')
  return countryData.find(country => (countryAliases[country.label] || [country.label]).some(alias => text.includes(alias)))?.label || ''
}
aseanRows.forEach((row, index) => {
  const [countryName, mineral, metric, quantity, unit, place, note] = row
  const country = countries.get(normalizeCountry(countryName))
  const resource = getResource(mineral, { record: { 地区: countryName, 指标: metric, 数量: quantity, 单位: unit, 依据: '用户提供资源工作簿·东盟矿产能源表' } })
  if (country) {
    country.attributes.资源摘要 = [...new Set([...(country.attributes.资源摘要 ? country.attributes.资源摘要.split('、') : []), String(mineral)])].join('、')
    country.attributesText = formatAttributes(country.attributes)
    addEdge(country, resource, '矿产 / 能源产出记录', String(note || ''))
    if (place && !/未发现|未公布|—/.test(String(place))) {
      const zone = addLocalityNode(String(place).slice(0, 30), 'mine', country, { 所属国家: country.label, 资源: mineral, 指标: metric, 数量: quantity, 单位: unit }, String(note || '来源：用户提供资源工作簿·东盟矿产能源表'), `asean-${index}`)
      addEdge(zone, resource, '产区 / 分布关联')
    }
  } else if (String(countryName).includes('东盟')) addEdge(asean, resource, '区域资源概览', String(note || ''))
  addEdge(resource, sourceWorkbook, '数据来源')
})
natureRows.forEach((row, index) => {
  const [regionName, resourceName, metric, quantity, unit, distribution, note] = row
  const resource = getResource(resourceName, { record: { 地区: regionName, 指标: metric, 数量: quantity, 单位: unit, 依据: '用户提供资源工作簿·农林及其他自然资源表' } })
  const territory = normalizeCountry(regionName) ? countries.get(normalizeCountry(regionName)) : String(regionName).includes('东盟') ? asean : guangxi
  appendAttribute(territory, '自然资源指标', `${resourceName}：${metric} ${quantity} ${unit}`)
  addEdge(territory, resource, '自然资源分布 / 指标', String(note || ''))
  const locations = String(distribution || '').split(/[、，,；;]/).map(part => part.trim()).filter(Boolean)
  locations.forEach(location => {
    const city = [...gxCities.entries()].find(([name]) => location.includes(name.replace('市', '')))?.[1]
    if (city) addEdge(city, resource, '市级自然资源分布', String(note || ''))
    const country = countryData.find(item => location.includes(item.label))
    if (country) addEdge(countries.get(country.label), resource, '国家自然资源分布', String(note || ''))
  })
  addEdge(resource, sourceWorkbook, '数据来源')
})

refRows.forEach((row, index) => {
  const [title, publisher, url] = row
  const document = addNode({ key: `document:reference:${index}`, id: `doc-ref-${index + 1}`, label: String(title || `资源来源 ${index + 1}`).slice(0, 24), type: 'document', sub: String(publisher || '公开来源').slice(0, 24), attributes: { 资料名称: title, 发布机构: publisher, 链接: url }, evidence: `${publisher || ''} · ${url || '未提供链接'}` })
  addEdge(sourceWorkbook, document, '收录来源')
})

const sharedResources = new Map()
companyNodes.forEach(company => company.attributes.需求资源.forEach(resourceName => {
  const key = normalizeResourceName(resourceName)
  const peers = sharedResources.get(key) || []
  peers.push(company)
  sharedResources.set(key, peers)
}))
sharedResources.forEach((peers, resourceKey) => {
  if (peers.length < 2) return
  const resource = resourceByKey.get(resourceKey)
  if (resource) addEdge(resource, sourceCompanies, '多企业共同需求索引', `${peers.length} 家企业在清单中关联该资源`)
})

export const corpusNodes = nodes
export const corpusEdges = edges
