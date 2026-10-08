<script setup>
import { computed, ref, watch } from 'vue'
import { Building2, Pickaxe, MapPin, Sparkles, ArrowUpRight, Check, Filter, ChevronDown, RefreshCw } from 'lucide-vue-next'
const props=defineProps({initialView:{type:String,default:'需求语义解析'}})
const emit=defineEmits(['navigate'])
const matchingTabs=['需求语义解析','双向智能匹配','潜在合作方推荐']
const currentTab=ref(matchingTabs.includes(props.initialView)?props.initialView:matchingTabs[0])
watch(()=>props.initialView,value=>{if(matchingTabs.includes(value))currentTab.value=value})
const changeTab=tab=>{currentTab.value=tab;emit('navigate',tab,'供需智能对接')}
const matchingUpdated=ref(false), done=ref(false)
const refreshMatching=()=>{matchingUpdated.value=true}
const companies = ['南宁新能源材料有限公司', '广西铝业科技集团', '柳州动力电池材料有限公司', '桂海绿色矿业有限公司']
const selectedCompany = ref(companies[0])
const selectedResource = ref('高纯锰矿')
const resources = ['高纯锰矿', '铝土矿', '镍矿', '锡矿', '稀土矿', '钾盐']
const companyNeeds = computed(() => selectedCompany.value.includes('铝业') ? ['铝土矿', '电力', '赤泥综合利用'] : selectedCompany.value.includes('动力') ? ['镍矿', '钴矿', '电池级锂盐'] : selectedCompany.value.includes('绿色') ? ['锰矿', '锡矿', '绿色勘查项目'] : ['高纯锰矿', '镍矿', '电池级碳酸锂'])
const resourceCompanies = computed(() => selectedResource.value === '高纯锰矿' ? ['南宁新能源材料有限公司', '越南北部合金材料股份公司', '广西锰业供应链有限公司'] : selectedResource.value === '铝土矿' ? ['广西铝业科技集团', '泰国东部氧化铝有限公司', '南方轻金属制造有限公司'] : selectedResource.value === '镍矿' ? ['柳州动力电池材料有限公司', '南宁新能源材料有限公司', '印尼群岛镍业合作社'] : ['桂海绿色矿业有限公司', '广西有色金属贸易公司', '东盟先进材料有限公司'])
const resourceAreas = {
  '高纯锰矿': [{ area: '广西 · 崇左', grade: '18–25% Mn', kind: '示意品位' }, { area: '越南 · 高平', grade: '16–23% Mn', kind: '示意品位' }, { area: '越南 · 老街', grade: '14–21% Mn', kind: '示意品位' }],
  '铝土矿': [{ area: '广西 · 百色', grade: '45–55% Al₂O₃', kind: '示意含量' }, { area: '越南 · 高平', grade: '40–52% Al₂O₃', kind: '示意含量' }, { area: '老挝 · 甘蒙', grade: '38–50% Al₂O₃', kind: '示意含量' }],
  '镍矿': [{ area: '印尼 · 苏拉威西', grade: '1.2–1.8% Ni', kind: '示意品位' }, { area: '印尼 · 北马鲁古', grade: '1.3–1.9% Ni', kind: '示意品位' }, { area: '越南 · 山罗', grade: '0.8–1.4% Ni', kind: '示意品位' }],
  '锡矿': [{ area: '广西 · 河池', grade: '0.3–0.8% Sn', kind: '示意品位' }, { area: '印尼 · 邦加勿里洞', grade: '0.2–0.6% Sn', kind: '示意品位' }, { area: '马来西亚 · 霹雳', grade: '0.1–0.4% Sn', kind: '示意品位' }],
  '稀土矿': [{ area: '广西 · 贺州', grade: '0.05–0.15% TREO', kind: '示意含量' }, { area: '越南 · 莱州', grade: '0.08–0.20% TREO', kind: '示意含量' }, { area: '老挝 · 北部', grade: '0.04–0.12% TREO', kind: '示意含量' }],
  '钾盐': [{ area: '老挝 · 甘蒙', grade: '8–18% K₂O', kind: '示意含量' }, { area: '泰国 · 东北部', grade: '10–20% K₂O', kind: '示意含量' }, { area: '广西 · 南宁周边', grade: '勘查数据待补', kind: '案例线索' }],
  '电力': [{ area: '广西 · 崇左', grade: '区域供给线索', kind: '示意供给' }, { area: '越南 · 北部', grade: '跨境互联线索', kind: '示意供给' }],
  '赤泥综合利用': [{ area: '广西 · 百色', grade: '氧化铝产业关联', kind: '案例线索' }, { area: '广西 · 靖西', grade: '固废利用线索', kind: '案例线索' }],
  '钴矿': [{ area: '印尼 · 苏拉威西', grade: '0.05–0.12% Co', kind: '示意品位' }, { area: '印尼 · 北马鲁古', grade: '0.06–0.15% Co', kind: '示意品位' }],
  '电池级锂盐': [{ area: '广西 · 南宁', grade: '加工需求点', kind: '案例线索' }, { area: '印尼 · 苏拉威西', grade: '供应链线索', kind: '案例线索' }],
}
const areaInfo = (resource) => resourceAreas[resource] || resourceAreas['高纯锰矿']
const xmlSafe = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const shortCompany = (name) => ({
  '南宁新能源材料有限公司': ['南宁新能源', '材料'], '越南北部合金材料股份公司': ['越南北部合金', '材料'], '广西锰业供应链有限公司': ['广西锰业', '供应链'],
  '广西铝业科技集团': ['广西铝业', '科技集团'], '泰国东部氧化铝有限公司': ['泰国东部', '氧化铝'], '南方轻金属制造有限公司': ['南方轻金属', '制造'],
  '柳州动力电池材料有限公司': ['柳州动力电池', '材料'], '印尼群岛镍业合作社': ['印尼群岛', '镍业合作'], '广西有色金属贸易公司': ['广西有色', '金属贸易'], '东盟先进材料有限公司': ['东盟先进', '材料'],
  '桂海绿色矿业有限公司': ['桂海绿色', '矿业']
}[name] || [name.slice(0, 5), name.slice(5, 9)])
const shortResource = (name) => name.length > 4 ? [name.slice(0, 3), name.slice(3)] : [name]
const resourceTooltipLines = (resource) => [`${resource}分布区域`, ...areaInfo(resource).map(item => `${item.area} · ${item.kind} ${item.grade}`), '数值为演示数据，非官方勘查结果']
const makeRecommendationSvg = (sourceName, sourceLines, targets, targetKind, sourceTooltip = sourceName) => {
  const source = { x: 132, y: 175, r: 63 }, targetY = [66, 175, 284], targetX = 525, targetR = 50
  const sourceText = sourceLines.map((line, i) => `<tspan x="${source.x}" dy="${i ? 15 : 0}">${xmlSafe(line)}</tspan>`).join('')
  const targetNodes = targets.map((item, i) => {
    const lines = item.lines.map((line, j) => `<tspan x="${targetX}" dy="${j ? 14 : 0}">${xmlSafe(line)}</tspan>`).join('')
    const tooltip = Array.isArray(item.tooltip) ? item.tooltip.join('\n') : item.tooltip || item.title || ''
    const tipX = 282, tipY = targetY[i] < 100 ? 105 : targetY[i] < 220 ? 40 : 182
    const tooltipBox = makeSvgTooltip(tooltip.split('\n'), tipX, tipY)
    return `<g class="rec-svg-node ${targetKind}" tabindex="0" aria-label="${xmlSafe(tooltip)}" data-node-id="target-${i}"><circle cx="${targetX}" cy="${targetY[i]}" r="${targetR}"/><text x="${targetX}" y="${targetY[i] - (item.lines.length > 1 ? 4 : -4)}">${lines}</text>${tooltipBox}</g>`
  }).join('')
  const sourceTip = Array.isArray(sourceTooltip) ? sourceTooltip.join('\n') : sourceTooltip
  const links = targetY.map((y, i) => {
    const dx = targetX - source.x, dy = y - source.y, length = Math.hypot(dx, dy)
    const x1 = source.x + source.r * dx / length, y1 = source.y + source.r * dy / length
    const x2 = targetX - targetR * dx / length, y2 = y - targetR * dy / length
    return `<line data-source="source" data-target="target-${i}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`
  }).join('')
  const sourceTooltipBox = makeSvgTooltip(String(sourceTip).split('\n'), 202, 102)
  return `<svg viewBox="0 0 660 350" role="img" aria-label="${xmlSafe(sourceName)}的一对多供需关系"><g class="rec-svg-links">${links}</g><g class="rec-svg-node source ${targetKind==='company'?'resource-source-svg':''}" tabindex="0" aria-label="${xmlSafe(sourceTip)}" data-node-id="source"><circle cx="${source.x}" cy="${source.y}" r="${source.r}"/><text x="${source.x}" y="${source.y - 7}">${sourceText}</text>${sourceTooltipBox}</g>${targetNodes}</svg>`
}
const makeSvgTooltip = (lines, x, y) => {
  const wrapped = lines.flatMap(line => { const chars = Array.from(String(line)); const chunks = []; while (chars.length) chunks.push(chars.splice(0, 18).join('')); return chunks })
  const safe = wrapped.map(xmlSafe), height = 20 + safe.length * 16
  const text = safe.map((line, i) => `<tspan x="10" dy="${i ? 16 : 0}" class="${i ? 'tooltip-line' : 'tooltip-title'}">${line}</tspan>`).join('')
  return `<g class="rec-svg-tooltip" transform="translate(${x} ${y})"><rect width="230" height="${height}" rx="7"/><text x="10" y="18">${text}</text></g>`
}
const companyRecommendSvg = computed(() => makeRecommendationSvg(selectedCompany.value, shortCompany(selectedCompany.value), companyNeeds.value.map(resource => ({ lines: shortResource(resource), tooltip: resourceTooltipLines(resource) })), 'resource'))
const resourceRecommendSvg = computed(() => makeRecommendationSvg(selectedResource.value, shortResource(selectedResource.value), resourceCompanies.value.map(company => ({ lines: shortCompany(company), tooltip: [company, '潜在需求企业'] })), 'company', resourceTooltipLines(selectedResource.value)))
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
          <div class="match-tabs"><button :class="{on:currentTab==='需求语义解析'}" @click="changeTab('需求语义解析')">需求语义解析</button><button :class="{on:currentTab==='双向智能匹配'}" @click="changeTab('双向智能匹配')">双向智能匹配</button><button :class="{on:currentTab==='潜在合作方推荐'}" @click="changeTab('潜在合作方推荐')">潜在合作方推荐</button><span class="tabs-spacer"></span><span class="case-tag"><span class="status-dot"></span>演示案例数据</span></div>
          <template v-if="currentTab==='潜在合作方推荐'"><div class="recommend-grid"><section class="panel recommend-card"><div class="recommend-head"><div><div class="eyebrow">企业找资源</div><h2>企业需求分布</h2><p>企业节点位于左侧，右侧列出所需资源</p></div><Building2 class="recommend-icon" :size="20"/></div><select v-model="selectedCompany" class="native-select"><option v-for="company in companies" :key="company">{{company}}</option></select><div class="recommendation-network" @pointerdown="beginRecommendationDrag" @pointermove="moveRecommendationNode" @pointerup="endRecommendationDrag" @pointercancel="endRecommendationDrag"><div v-html="companyRecommendSvg"></div></div><div class="recommend-legend"><span><i class="legend-node green"></i>需求企业</span><span><i class="legend-node gray"></i>资源</span><span><i class="legend-line"></i>需求关系</span></div></section><section class="panel recommend-card"><div class="recommend-head"><div><div class="eyebrow">资源找企业</div><h2>资源需求企业</h2><p>资源节点位于左侧，右侧列出需求企业</p></div><Pickaxe class="recommend-icon" :size="20"/></div><select v-model="selectedResource" class="native-select"><option v-for="resource in resources" :key="resource">{{resource}}</option></select><div class="recommendation-network" @pointerdown="beginRecommendationDrag" @pointermove="moveRecommendationNode" @pointerup="endRecommendationDrag" @pointercancel="endRecommendationDrag"><div v-html="resourceRecommendSvg"></div></div><div class="recommend-legend"><span><i class="legend-node green"></i>资源</span><span><i class="legend-node gray"></i>需求企业</span><span><i class="legend-line"></i>采购需求关系</span></div></section></div><div class="source-note">合作方、资源供需与匹配关系为交互演示案例。资源分布含量 / 品位范围是用于展示悬浮交互的模拟值，不代表官方勘查数据；实际应用应接入权威地质调查和企业授权数据。</div></template>
          <template v-else-if="currentTab==='双向智能匹配'"><div class="match-summary"><div class="panel summary-box"><span>已解析企业需求</span><b>42 <small>家</small></b><i>覆盖矿产、材料与加工环节</i></div><div class="panel summary-box"><span>发现供需匹配</span><b>86 <small>组</small></b><i>按资源、区域与用途排序</i></div><div class="panel summary-box"><span>高匹配线索</span><b>18 <small>组</small></b><i>匹配度 ≥ 80%</i></div><div class="panel summary-action"><div><strong>刷新匹配结果</strong><span>根据最新企业需求与资源语料重新计算</span></div><button class="button primary" @click="refreshMatching"><RefreshCw :size="14"/>立即匹配</button></div></div><section class="panel matching-table"><div class="panel-heading"><div><h2>推荐供需组合</h2><p>按语义相似度、空间距离和资源适配度综合排序</p></div><button class="filter-select"><Filter :size="14"/>全部区域 <ChevronDown :size="13"/></button></div><table><thead><tr><th>需求企业</th><th>需求资源</th><th>资源所在地</th><th>匹配依据</th><th>匹配度</th><th></th></tr></thead><tbody><tr v-for="(c,i) in ['南宁新能源材料有限公司','广西铝业科技集团','柳州动力电池材料有限公司','桂海绿色矿业有限公司','越南北部合金材料股份公司']" :key="c"><td><span class="file-chip"><Building2 :size="14"/>{{c}}</span></td><td>{{['高纯锰矿','铝土矿','镍矿','钾盐','锡矿'][i]}}</td><td>{{['广西崇左','广西百色','印尼苏拉威西','老挝甘蒙','越南北部'][i]}}</td><td>资源类型 + 用途语义</td><td><span class="match-meter"><i><u :style="{width:[92,87,81,76,72][i]+'%'}"></u></i><b>{{[92,87,81,76,72][i]}}%</b></span></td><td><button class="text-button">查看关系 <ArrowUpRight :size="13"/></button></td></tr></tbody></table></section><div class="source-note">匹配分数与企业资料为演示数据。实际匹配可融合资源质量、供货规模、距离、物流通道、合规与企业资质等条件。</div></template>
          <template v-else><div class="semantic-grid"><section class="panel semantic-input"><div class="panel-heading"><div><h2>企业原始需求</h2><p>输入自然语言，提取结构化需求要素</p></div><span class="badge demo-badge">示例文本</span></div><textarea>我司计划在广西建设年产 8 万吨的电池材料生产线，未来一年需要稳定采购高纯锰矿，并希望优先对接广西及越南北部具备持续供货能力的矿山或贸易企业。</textarea><div class="semantic-foot"><span><Sparkles :size="14"/>系统将识别资源品类、数量、区域、用途与时间要求</span><button class="button primary" @click="done=true"><Sparkles :size="14"/>解析需求</button></div></section><section class="panel semantic-result"><div class="panel-heading"><div><h2>知识图谱需求</h2><p>解析结果将形成企业—需求—资源关系</p></div></div><div class="semantic-diagram"><div class="semantic-node company-node"><Building2 :size="17"/><span><small>需求企业</small><b>南宁新能源材料</b></span></div><div class="semantic-edge"><span>需求采购</span><i></i></div><div class="semantic-node resource-node"><Pickaxe :size="17"/><span><small>资源类型</small><b>高纯锰矿</b></span></div><div class="semantic-edge"><span>优先区域</span><i></i></div><div class="semantic-node region-node"><MapPin :size="17"/><span><small>目标区域</small><b>广西 · 越南北部</b></span></div></div><div class="entity-tags"><span>需求量 <b>8 万吨/年</b></span><span>用途 <b>电池材料</b></span><span>时限 <b>未来 12 个月</b></span><span>供货 <b>稳定持续</b></span></div><div v-if="done" class="result-callout"><Check :size="15"/>需求已解析，可进入双向智能匹配</div><button class="full-link" @click="changeTab('双向智能匹配')">查看匹配资源 <ArrowUpRight :size="14"/></button></section></div><div class="source-note">企业与需求文本为案例演示，可替换为企业填写的真实需求。需求结构化后形成“企业—需求资源—目标区域—用途”知识关系。</div></template>
</template>
