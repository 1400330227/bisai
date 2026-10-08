<script setup>
import { computed, ref, watch } from 'vue'
import { Building2, Pickaxe, MapPin, Sparkles, ArrowUpRight, Check, Filter, ChevronDown, RefreshCw } from 'lucide-vue-next'
import { companies, resources, resourceIndex, findResourceInfo } from '../data/supplyData'
const props=defineProps({initialView:{type:String,default:'需求语义解析'}})
const emit=defineEmits(['navigate'])
const matchingTabs=['需求语义解析','双向智能匹配','潜在合作方推荐','企业供需知识图谱']
const currentTab=ref(matchingTabs.includes(props.initialView)?props.initialView:matchingTabs[0])
watch(()=>props.initialView,value=>{if(matchingTabs.includes(value))currentTab.value=value})
const changeTab=tab=>{currentTab.value=tab;emit('navigate',tab,'供需智能对接')}
const matchingUpdated=ref(''), done=ref(false)
const refreshMatching=()=>{matchingUpdated.value=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}
const allCountries = '全部国家/地区', allProvinces = '全部省份', allCities = '全部城市', allDistricts = '全部区县'
const countryFilter = ref(allCountries), provinceFilter = ref(allProvinces), cityFilter = ref(allCities), districtFilter = ref(allDistricts)
const countryNames = [
  ['越南', /越南|越北|越南北部/], ['印度尼西亚', /印度尼西亚|印尼/], ['泰国', /泰国/], ['马来西亚', /马来西亚/],
  ['老挝', /老挝/], ['缅甸', /缅甸/], ['柬埔寨', /柬埔寨/], ['菲律宾', /菲律宾/], ['文莱', /文莱/], ['新加坡', /新加坡/], ['东帝汶', /东帝汶|帝汶/],
]
const aseanCountries = ['文莱', '柬埔寨', '印度尼西亚', '老挝', '马来西亚', '缅甸', '菲律宾', '新加坡', '泰国', '东帝汶', '越南']
const chinaProvinces = ['北京市','天津市','河北省','山西省','内蒙古自治区','辽宁省','吉林省','黑龙江省','上海市','江苏省','浙江省','安徽省','福建省','江西省','山东省','河南省','湖北省','湖南省','广东省','广西壮族自治区','海南省','重庆市','四川省','贵州省','云南省','西藏自治区','陕西省','甘肃省','青海省','宁夏回族自治区','新疆维吾尔自治区','台湾省','香港特别行政区','澳门特别行政区']
const guangxiAdministrativeDivisions = {
  '南宁市':['兴宁区','青秀区','江南区','西乡塘区','良庆区','邕宁区','武鸣区','横州市','隆安县','马山县','上林县','宾阳县'],
  '柳州市':['城中区','鱼峰区','柳南区','柳北区','柳江区','柳城县','鹿寨县','融安县','融水苗族自治县','三江侗族自治县'],
  '桂林市':['秀峰区','叠彩区','象山区','七星区','雁山区','临桂区','荔浦市','阳朔县','灵川县','全州县','兴安县','永福县','灌阳县','龙胜各族自治县','资源县','平乐县','恭城瑶族自治县'],
  '梧州市':['万秀区','长洲区','龙圩区','岑溪市','苍梧县','藤县','蒙山县'],
  '北海市':['海城区','银海区','铁山港区','合浦县'],
  '防城港市':['港口区','防城区','东兴市','上思县'],
  '钦州市':['钦南区','钦北区','灵山县','浦北县'],
  '贵港市':['港北区','港南区','覃塘区','桂平市','平南县'],
  '玉林市':['玉州区','福绵区','北流市','容县','陆川县','博白县','兴业县'],
  '百色市':['右江区','田阳区','靖西市','平果市','田东县','德保县','那坡县','凌云县','乐业县','田林县','西林县','隆林各族自治县'],
  '贺州市':['八步区','平桂区','昭平县','钟山县','富川瑶族自治县'],
  '河池市':['金城江区','宜州区','南丹县','天峨县','凤山县','东兰县','罗城仫佬族自治县','环江毛南族自治县','巴马瑶族自治县','都安瑶族自治县','大化瑶族自治县'],
  '来宾市':['兴宾区','合山市','忻城县','象州县','武宣县','金秀瑶族自治县'],
  '崇左市':['江州区','凭祥市','扶绥县','宁明县','龙州县','大新县','天等县'],
}
const parseCompanyLocation = company => {
  const raw = String(company.location || '').split(/[；;]/)[0].replace(/[（(].*$/, '').replace(/^总部|^基地|^所在地/, '').trim()
  const country = countryNames.find(([, pattern]) => pattern.test(raw))?.[0] || '中国'
  const province = country === '中国'
    ? (raw.includes('广西') ? '广西壮族自治区' : raw.match(/([一-鿿]{2,}(?:省|自治区|特别行政区))/)?.[1] || '广西壮族自治区')
    : raw.match(/([一-鿿]{2,}(?:省|州|自治区|地区))/)?.[1] || '未细分省级地区'
  const cityMatch = raw.match(/([一-鿿]{2,}?(?:市|自治州|地区|盟))/)
  const city = cityMatch?.[1] || '未细分城市'
  const remainder = cityMatch ? raw.slice((cityMatch.index || 0) + cityMatch[0].length).replace(/^[·、,，\s]+/, '') : ''
  const district = remainder.match(/^([一-鿿]{2,}?(?:自治县|自治旗|新区|经开区|开发区|区|县|市|旗))/)?.[1] || '未细分区县'
  return { country, province, city, district }
}
const companyLocations = computed(() => companies.map(company => ({ company, ...parseCompanyLocation(company) })))
const countryOptions = computed(() => [allCountries, '中国', ...aseanCountries, ...new Set(companyLocations.value.map(item => item.country).filter(country => country !== '中国' && !aseanCountries.includes(country)))])
const filterControlWidth = options => `${Math.min(340, Math.max(165, Math.max(0, ...options.map(option => Array.from(String(option)).length)) * 14 + 62))}px`
const provinceOptions = computed(() => {
  const observed = companyLocations.value.filter(item => countryFilter.value === allCountries || item.country === countryFilter.value).map(item => item.province)
  const options = countryFilter.value === '中国' || countryFilter.value === allCountries ? [...chinaProvinces, ...observed] : observed
  return [allProvinces, ...new Set(options)]
})
const cityOptions = computed(() => {
  if ((countryFilter.value === allCountries || countryFilter.value === '中国') && (provinceFilter.value === allProvinces || provinceFilter.value === '广西壮族自治区')) {
    return [allCities, ...new Set([...Object.keys(guangxiAdministrativeDivisions), ...companyLocations.value.filter(item => item.country === '中国').map(item => item.city)])]
  }
  return [allCities, ...new Set(companyLocations.value.filter(item => (countryFilter.value === allCountries || item.country === countryFilter.value) && (provinceFilter.value === allProvinces || item.province === provinceFilter.value)).map(item => item.city))]
})
const districtOptions = computed(() => {
  const guangxiCities = cityFilter.value === allCities ? Object.keys(guangxiAdministrativeDivisions) : [cityFilter.value]
  const completeGuangxiList = (countryFilter.value === allCountries || countryFilter.value === '中国') && (provinceFilter.value === allProvinces || provinceFilter.value === '广西壮族自治区')
    ? guangxiCities.flatMap(city => guangxiAdministrativeDivisions[city] || [])
    : []
  const observed = companyLocations.value.filter(item => (countryFilter.value === allCountries || item.country === countryFilter.value) && (provinceFilter.value === allProvinces || item.province === provinceFilter.value) && (cityFilter.value === allCities || item.city === cityFilter.value)).map(item => item.district)
  return [allDistricts, ...new Set([...completeGuangxiList, ...observed])]
})
const changeCountry = () => { provinceFilter.value = allProvinces; cityFilter.value = allCities; districtFilter.value = allDistricts }
const changeProvince = () => { cityFilter.value = allCities; districtFilter.value = allDistricts }
const changeCity = () => { districtFilter.value = allDistricts }
const demandText = ref('我司计划在广西建设年产 8 万吨的电池材料生产线，未来一年需要稳定采购高纯锰矿，并希望优先对接广西及越南北部具备持续供货能力的矿山或贸易企业。')
const parsedDemand = ref(null)
const parseDemand = () => {
  const text = demandText.value.trim()
  if (!text) { parsedDemand.value = null; done.value = false; return }
  const quantity = text.match(/[\d,.]+\s*(?:万吨|吨|万\s*吨)(?:\/年|每年)?/)
  const resource = resources.find(item => text.includes(item)) || (text.includes('锰') ? '高纯锰矿' : '待确认资源')
  const regions = ['广西','越南','老挝','泰国','印度尼西亚','马来西亚','柬埔寨','缅甸','菲律宾','文莱','新加坡'].filter(item => text.includes(item))
  parsedDemand.value = { company: companies.find(item => text.includes(item.name))?.name || '当前需求企业', resource, region: regions.join(' · ') || '未指定区域', quantity: quantity?.[0] || '未识别数量', purpose: text.includes('电池') ? '电池材料' : '待确认用途', period: text.match(/未来\s*\d+\s*(?:个月|年)/)?.[0] || '未指定时限', text }
  done.value = true
}
const selectedCompany = ref(companies[0]?.name || '')
const selectedResource = ref(resources[0] || '')
const companyRecord = computed(() => companies.find(company => company.name === selectedCompany.value) || companies[0])
const companyNeeds = computed(() => companyRecord.value?.needs || [])
const resourceCompanies = computed(() => companies.filter(company => company.needs.includes(selectedResource.value)))
const areaInfo = resource => {
  const row = findResourceInfo(resource)
  return row ? [{ area: row.location, grade: row.quantity, kind: '需求量级' }] : [{ area: '企业所在地', grade: '未单列需求量级', kind: '需求信息' }]
}
const graphCompanies = computed(() => resourceCompanies.value.slice(0, 12))
const graphNodePoints = computed(() => graphCompanies.value.map((company, index) => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI / Math.max(graphCompanies.value.length, 1))
  return { ...company, x: 460 + Math.cos(angle) * 310, y: 265 + Math.sin(angle) * 190 }
}))
const graphSummary = computed(() => findResourceInfo(selectedResource.value))
const matchingRows = computed(() => companyLocations.value.filter(item =>
  (countryFilter.value === allCountries || item.country === countryFilter.value) &&
  (provinceFilter.value === allProvinces || item.province === provinceFilter.value) &&
  (cityFilter.value === allCities || item.city === cityFilter.value) &&
  (districtFilter.value === allDistricts || item.district === districtFilter.value)
).map(item => item.company).slice(0, 100))
const resourceLinkCount = computed(() => companies.reduce((total, company) => total + company.needs.length, 0))
const highCertaintyCount = computed(() => companies.filter(company => company.certainty === '高').length)
const shortGraphName = name => name.replace(/（.*?）/g, '').replace(/股份有限公司|有限责任公司|有限公司|集团有限责任公司|集团有限公司/g, '').slice(0, 7)
const xmlSafe = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const shortCompany = name => {
  const chars = Array.from(name)
  return Array.from({ length: Math.ceil(chars.length / 5) }, (_, index) => chars.slice(index * 5, index * 5 + 5).join(''))
}
const shortResource = name => [name]
const resourceTooltipLines = resource => [`${resource}需求地区`, ...areaInfo(resource).map(item => `${item.area} · ${item.kind} ${item.grade}`), '未披露项不展示']
const makeRecommendationSvg = (sourceName, sourceLines, targets, targetKind, sourceTooltip = sourceName, layoutHeightOverride) => {
  const layoutHeight = Math.max(560, layoutHeightOverride || targets.length * 88 + 64)
  const source = { x: 132, y: layoutHeight / 2, r: targetKind === 'company' ? 50 : 63 }, targetStart = (layoutHeight - (targets.length - 1) * 88) / 2, targetY = targets.map((_, i) => targets.length === 1 ? layoutHeight / 2 : targetStart + i * 88), targetX = 525, targetR = targetKind === 'resource' ? 36 : 40
  const sourceText = sourceLines.map((line, i) => `<tspan x="${source.x}" dy="${i ? 13 : 0}">${xmlSafe(line)}</tspan>`).join('')
  const targetNodes = targets.map((item, i) => {
    const lines = item.lines.map((line, j) => `<tspan x="${targetX}" dy="${j ? 13 : 0}">${xmlSafe(line)}</tspan>`).join('')
    const tooltip = Array.isArray(item.tooltip) ? item.tooltip.join('\n') : item.tooltip || item.title || ''
    const tipX = 282, tipY = Math.max(8, Math.min(layoutHeight - 120, targetY[i] - 58))
    const tooltipBox = makeSvgTooltip(tooltip.split('\n'), tipX, tipY)
    const labelY = targetY[i] - ((item.lines.length - 1) * 6.5)
    return `<g class="rec-svg-node ${targetKind}" tabindex="0" aria-label="${xmlSafe(tooltip)}" data-node-id="target-${i}"><circle cx="${targetX}" cy="${targetY[i]}" r="${targetR}"/><text x="${targetX}" y="${labelY}">${lines}</text>${tooltipBox}</g>`
  }).join('')
  const sourceTip = Array.isArray(sourceTooltip) ? sourceTooltip.join('\n') : sourceTooltip
  const links = targetY.map((y, i) => {
    const dx = targetX - source.x, dy = y - source.y, length = Math.hypot(dx, dy)
    const x1 = source.x + source.r * dx / length, y1 = source.y + source.r * dy / length
    const x2 = targetX - targetR * dx / length, y2 = y - targetR * dy / length
    return `<line data-source="source" data-target="target-${i}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`
  }).join('')
  const sourceTooltipBox = makeSvgTooltip(String(sourceTip).split('\n'), 202, Math.max(8, source.y - 80))
  const sourceLabelY = source.y - ((sourceLines.length - 1) * 6.5)
  return `<svg style="height:${layoutHeight}px" viewBox="0 0 660 ${layoutHeight}" role="img" aria-label="${xmlSafe(sourceName)}的一对多供需关系"><g class="rec-svg-links">${links}</g><g class="rec-svg-node source ${targetKind==='company'?'resource-source-svg':''}" tabindex="0" aria-label="${xmlSafe(sourceTip)}" data-node-id="source"><circle cx="${source.x}" cy="${source.y}" r="${source.r}"/><text x="${source.x}" y="${sourceLabelY}">${sourceText}</text>${sourceTooltipBox}</g>${targetNodes}</svg>`
}
const makeSvgTooltip = (lines, x, y) => {
  const wrapped = lines.flatMap(line => { const chars = Array.from(String(line)); const chunks = []; while (chars.length) chunks.push(chars.splice(0, 18).join('')); return chunks })
  const safe = wrapped.map(xmlSafe), height = 20 + safe.length * 16
  const text = safe.map((line, i) => `<tspan x="10" dy="${i ? 16 : 0}" class="${i ? 'tooltip-line' : 'tooltip-title'}">${line}</tspan>`).join('')
  return `<g class="rec-svg-tooltip" transform="translate(${x} ${y})"><rect width="230" height="${height}" rx="7"/><text x="10" y="18">${text}</text></g>`
}
const companyRecommendSvg = computed(() => makeRecommendationSvg(companyRecord.value?.name || selectedCompany.value, shortCompany(companyRecord.value?.name || selectedCompany.value), companyNeeds.value.map(resource => ({ lines: shortResource(resource), tooltip: resourceTooltipLines(resource) })), 'resource'))
const resourceRecommendSvg = computed(() => makeRecommendationSvg(selectedResource.value, shortResource(selectedResource.value), resourceCompanies.value.map(company => ({ lines: shortCompany(company.name), tooltip: [company.name, company.location, company.demand] })), 'company', resourceTooltipLines(selectedResource.value)))
let recommendationDrag = null
const pointOnSvg = (svg, event) => { const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY; return point.matrixTransform(svg.getScreenCTM().inverse()) }
const beginRecommendationDrag = (event) => {
  const node = event.target.closest?.('.rec-svg-node'), wrapper = event.currentTarget, svg = wrapper.querySelector('svg')
  if (!node || !svg) return
  const point = pointOnSvg(svg, event), circle = node.querySelector('circle')
  recommendationDrag = { node, svg, id: node.dataset.nodeId, start: point, dx: Number(node.dataset.dx || 0), dy: Number(node.dataset.dy || 0), cx: Number(circle.getAttribute('cx')), cy: Number(circle.getAttribute('cy')), r: Number(circle.getAttribute('r')), lines: [...svg.querySelectorAll('.rec-svg-links line')].map(line => ({ line, x1: Number(line.getAttribute('x1')), y1: Number(line.getAttribute('y1')), x2: Number(line.getAttribute('x2')), y2: Number(line.getAttribute('y2')) })) }
  wrapper.setPointerCapture?.(event.pointerId); event.preventDefault()
}
const moveRecommendationNode = (event) => {
  if (!recommendationDrag) return
  const d = recommendationDrag, p = pointOnSvg(d.svg, event), box = d.svg.viewBox.baseVal
  const dx0 = p.x - d.start.x, dy0 = p.y - d.start.y
  const dx = Math.max(d.r - d.cx, Math.min(box.width - d.r - d.cx, d.dx + dx0)), dy = Math.max(d.r - d.cy, Math.min(box.height - d.r - d.cy, d.dy + dy0))
  const mx = dx - d.dx, my = dy - d.dy
  d.node.dataset.dx = dx; d.node.dataset.dy = dy; d.node.setAttribute('transform', `translate(${dx} ${dy})`)
  d.lines.forEach(({line,x1,y1,x2,y2}) => { if (line.dataset.source === d.id) { line.setAttribute('x1', x1 + mx); line.setAttribute('y1', y1 + my) } if (line.dataset.target === d.id) { line.setAttribute('x2', x2 + mx); line.setAttribute('y2', y2 + my) } })
}
const endRecommendationDrag = () => { recommendationDrag = null }

</script>
<template>
          <div class="match-tabs"><button :class="{on:currentTab==='需求语义解析'}" @click="changeTab('需求语义解析')">需求语义解析</button><button :class="{on:currentTab==='双向智能匹配'}" @click="changeTab('双向智能匹配')">双向智能匹配</button><button :class="{on:currentTab==='潜在合作方推荐'}" @click="changeTab('潜在合作方推荐')">潜在合作方推荐</button><button :class="{on:currentTab==='企业供需知识图谱'}" @click="changeTab('企业供需知识图谱')">企业供需知识图谱</button><span class="tabs-spacer"></span></div>
          <template v-if="currentTab==='企业供需知识图谱'"><section class="panel supply-graph-panel"><div class="supply-graph-heading"><div><div class="eyebrow">企业关系网络</div><h2>共享需求资源的企业关联</h2><p>选择资源查看有该项需求的企业；企业通过共同需求资源建立关系。</p></div><label class="supply-resource-select"><span>筛选资源</span><select v-model="selectedResource" class="native-select"><option v-for="resource in resources" :key="resource">{{resource}}</option></select></label></div><div class="supply-graph-meta"><span><b>{{companies.length}}</b> 家企业</span><span><b>{{resources.length}}</b> 类需求资源</span><span><b>{{resourceCompanies.length}}</b> 家企业需要「{{selectedResource}}」</span><span v-if="graphSummary">需求统计：{{graphSummary.location}} · {{graphSummary.quantity}}</span></div><div class="supply-graph-canvas"><svg viewBox="0 0 920 530" role="img" :aria-label="`${selectedResource}企业供需关系图`"><g class="supply-graph-links"><line v-for="node in graphNodePoints" :key="`edge-${node.id}`" x1="460" y1="265" :x2="node.x" :y2="node.y"/></g><g v-for="node in graphNodePoints" :key="node.id" class="supply-company-node" :transform="`translate(${node.x} ${node.y})`"><title>{{node.name}} · {{node.location}} · {{node.demand}}</title><circle r="47"/><text y="-3">{{shortGraphName(node.name)}}</text><text class="supply-node-location" y="14">{{node.location.slice(0, 9)}}</text></g><g class="supply-resource-node" transform="translate(460 265)"><circle r="62"/><text y="-2">{{selectedResource}}</text><text class="supply-resource-count" y="18">{{resourceCompanies.length}} 家需求企业</text></g></svg><div v-if="!graphNodePoints.length" class="supply-graph-empty">当前资源暂无企业需求记录</div></div><p class="supply-graph-note" v-if="resourceCompanies.length>12">图中展示前 12 家企业，请切换资源或查看下方企业清单了解其余 {{resourceCompanies.length-12}} 家。</p><div class="supply-company-list"><div v-for="company in resourceCompanies" :key="company.id" class="supply-company-row"><span class="supply-company-dot"></span><div><strong>{{company.name}}</strong><small>{{company.industry}} · {{company.location}}</small></div><span class="supply-demand-text">{{company.demand}}</span><span class="certainty-chip">确定性 {{company.certainty}}</span></div></div></section></template>
          <template v-else-if="currentTab==='潜在合作方推荐'"><div class="recommend-grid"><section class="panel recommend-card"><div class="recommend-head"><div><div class="eyebrow">企业找资源</div><h2>企业需求分布</h2><p>企业节点位于左侧，右侧列出所需资源</p></div><Building2 class="recommend-icon" :size="20"/></div><select v-model="selectedCompany" class="native-select"><option v-for="company in companies" :key="company.id" :value="company.name">{{company.name}}</option></select><div class="recommendation-network" @pointerdown="beginRecommendationDrag" @pointermove="moveRecommendationNode" @pointerup="endRecommendationDrag" @pointercancel="endRecommendationDrag"><div v-html="companyRecommendSvg"></div></div><div class="recommend-legend"><span><i class="legend-node green"></i>需求企业</span><span><i class="legend-node gray"></i>资源</span><span><i class="legend-line"></i>需求关系</span></div></section><section class="panel recommend-card"><div class="recommend-head"><div><div class="eyebrow">资源找企业</div><h2>资源需求企业</h2><p>资源节点位于左侧，右侧列出需求企业</p></div><Pickaxe class="recommend-icon" :size="20"/></div><select v-model="selectedResource" class="native-select"><option v-for="resource in resources" :key="resource">{{resource}}</option></select><div class="recommendation-network" @pointerdown="beginRecommendationDrag" @pointermove="moveRecommendationNode" @pointerup="endRecommendationDrag" @pointercancel="endRecommendationDrag"><div v-html="resourceRecommendSvg"></div></div><div class="recommend-legend"><span><i class="legend-node green"></i>资源</span><span><i class="legend-node gray"></i>需求企业</span><span><i class="legend-line"></i>采购需求关系</span></div></section></div></template>
          <template v-else-if="currentTab==='双向智能匹配'"><div class="match-summary"><div class="panel summary-box"><span>企业总数</span><b>{{companies.length}} <small>家</small></b></div><div class="panel summary-box"><span>企业资源需求关系</span><b>{{resourceLinkCount}} <small>条</small></b><i>统计企业资源需求关系</i></div><div class="panel summary-box"><span>需求确定性为高</span><b>{{highCertaintyCount}} <small>家</small></b><i>按需求确定性统计</i></div><div class="panel summary-action"><div><strong>资源需求关系</strong><span>{{resourceIndex.length}} 类资源</span><small v-if="matchingUpdated">汇总时间 {{matchingUpdated}}</small></div><button class="button primary" @click="refreshMatching"><RefreshCw :size="14"/>重新汇总</button></div></div><section class="panel matching-table"><div class="panel-heading"><div><h2>企业资源需求清单</h2><p>企业、资源需求、所在地和需求量级 · {{matchingRows.length}} 家</p></div><div class="location-cascade"><label class="graph-filter" :style="{ width: filterControlWidth(countryOptions) }"><Filter :size="14"/><select v-model="countryFilter" @change="changeCountry"><option v-for="country in countryOptions" :key="country">{{country}}</option></select></label><label class="graph-filter" :style="{ width: filterControlWidth(provinceOptions) }"><select v-model="provinceFilter" @change="changeProvince"><option v-for="province in provinceOptions" :key="province">{{province}}</option><option v-if="provinceOptions.length===1" disabled>暂无省级数据</option></select></label><label class="graph-filter" :style="{ width: filterControlWidth(cityOptions) }"><select v-model="cityFilter" @change="changeCity"><option v-for="city in cityOptions" :key="city">{{city}}</option><option v-if="cityOptions.length===1" disabled>暂无城市数据</option></select></label><label class="graph-filter" :style="{ width: filterControlWidth(districtOptions) }"><select v-model="districtFilter"><option v-for="district in districtOptions" :key="district">{{district}}</option><option v-if="districtOptions.length===1" disabled>暂无区县数据</option></select></label></div></div><div class="matching-table-scroll"><table><thead><tr><th>需求企业</th><th>所需自然资源</th><th>企业所在地</th><th>需求量级</th><th>确定性</th></tr></thead><tbody><tr v-for="company in matchingRows" :key="company.id"><td><span class="file-chip"><Building2 :size="14"/>{{company.name}}</span></td><td class="matching-needs-cell">{{company.needs.join('、')}}</td><td class="matching-location-cell">{{company.location}}</td><td class="matching-demand-cell">{{company.demand}}</td><td>{{company.certainty}}</td></tr><tr v-if="!matchingRows.length"><td colspan="5" class="matching-empty">该国家/地区当前没有企业记录。补充对应企业数据后，可继续按省、市、区县筛选。</td></tr></tbody></table></div></section></template>
          <template v-else><div class="semantic-grid"><section class="panel semantic-input"><div class="panel-heading"><div><h2>企业原始需求</h2><p>将自然语言拆解成可匹配的结构化需求要素</p></div></div><p class="semantic-purpose">此功能识别资源品类、数量、目标区域、用途和时限，并组织为“企业 → 采购需求 → 资源 / 区域”的知识关系，供后续供需匹配使用。</p><textarea v-model="demandText"></textarea><div class="semantic-foot"><span><Sparkles :size="14"/>解析后可检查并调整识别结果</span><button class="button primary" @click="parseDemand"><Sparkles :size="14"/>解析需求</button></div></section><section class="panel semantic-result"><div class="panel-heading"><div><h2>结构化需求关系</h2><p>解析结果形成企业—需求—资源关系</p></div></div><div class="semantic-diagram"><div class="semantic-node company-node"><Building2 :size="17"/><span><small>需求企业</small><b>{{parsedDemand?.company || '等待需求解析'}}</b></span></div><div class="semantic-edge"><span>需求采购</span></div><div class="semantic-node resource-node"><Pickaxe :size="17"/><span><small>资源类型</small><b>{{parsedDemand?.resource || '待识别资源'}}</b></span></div><div class="semantic-edge"><span>优先区域</span></div><div class="semantic-node region-node"><MapPin :size="17"/><span><small>目标区域</small><b>{{parsedDemand?.region || '待识别区域'}}</b></span></div></div><div class="entity-tags"><span>需求量 <b>{{parsedDemand?.quantity || '待识别'}}</b></span><span>用途 <b>{{parsedDemand?.purpose || '待识别'}}</b></span><span>时限 <b>{{parsedDemand?.period || '待识别'}}</b></span><span>供货 <b>{{parsedDemand?.text?.includes('稳定')?'稳定持续':'待确认'}}</b></span></div><div v-if="done" class="result-callout"><Check :size="15"/>需求已解析，可进入双向智能匹配</div><button class="full-link" @click="changeTab('双向智能匹配')">查看匹配资源 <ArrowUpRight :size="14"/></button></section></div></template>
</template>





