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
const matchingUpdated=ref(false), done=ref(false)
const refreshMatching=()=>{matchingUpdated.value=true}
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
const matchingRows = computed(() => companies.slice(0, 12))
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
          <template v-else-if="currentTab==='双向智能匹配'"><div class="match-summary"><div class="panel summary-box"><span>企业总数</span><b>{{companies.length}} <small>家</small></b></div><div class="panel summary-box"><span>企业资源需求关系</span><b>{{resourceLinkCount}} <small>条</small></b><i>统计企业资源需求关系</i></div><div class="panel summary-box"><span>需求确定性为高</span><b>{{highCertaintyCount}} <small>家</small></b><i>按需求确定性统计</i></div><div class="panel summary-action"><div><strong>资源需求关系</strong><span>{{resourceIndex.length}} 类资源</span></div><button class="button primary" @click="refreshMatching"><RefreshCw :size="14"/>重新汇总</button></div></div><section class="panel matching-table"><div class="panel-heading"><div><h2>企业资源需求清单</h2><p>企业、资源需求、所在地和需求量级</p></div><span class="filter-select"><Filter :size="14"/>全部企业</span></div><table><thead><tr><th>需求企业</th><th>所需自然资源</th><th>企业所在地</th><th>需求量级</th><th>确定性</th></tr></thead><tbody><tr v-for="company in matchingRows" :key="company.id"><td><span class="file-chip"><Building2 :size="14"/>{{company.name}}</span></td><td>{{company.needs.join('、')}}</td><td>{{company.location}}</td><td>{{company.demand}}</td><td>{{company.certainty}}</td></tr></tbody></table></section></template>
          <template v-else><div class="semantic-grid"><section class="panel semantic-input"><div class="panel-heading"><div><h2>企业原始需求</h2><p>输入自然语言，提取结构化需求要素</p></div></div><textarea>我司计划在广西建设年产 8 万吨的电池材料生产线，未来一年需要稳定采购高纯锰矿，并希望优先对接广西及越南北部具备持续供货能力的矿山或贸易企业。</textarea><div class="semantic-foot"><span><Sparkles :size="14"/>系统将识别资源品类、数量、区域、用途与时间要求</span><button class="button primary" @click="done=true"><Sparkles :size="14"/>解析需求</button></div></section><section class="panel semantic-result"><div class="panel-heading"><div><h2>知识图谱需求</h2><p>解析结果将形成企业—需求—资源关系</p></div></div><div class="semantic-diagram"><div class="semantic-node company-node"><Building2 :size="17"/><span><small>需求企业</small><b>南宁新能源材料</b></span></div><div class="semantic-edge"><span>需求采购</span></div><div class="semantic-node resource-node"><Pickaxe :size="17"/><span><small>资源类型</small><b>高纯锰矿</b></span></div><div class="semantic-edge"><span>优先区域</span></div><div class="semantic-node region-node"><MapPin :size="17"/><span><small>目标区域</small><b>广西 · 越南北部</b></span></div></div><div class="entity-tags"><span>需求量 <b>8 万吨/年</b></span><span>用途 <b>电池材料</b></span><span>时限 <b>未来 12 个月</b></span><span>供货 <b>稳定持续</b></span></div><div v-if="done" class="result-callout"><Check :size="15"/>需求已解析，可进入双向智能匹配</div><button class="full-link" @click="changeTab('双向智能匹配')">查看匹配资源 <ArrowUpRight :size="14"/></button></section></div></template>
</template>
