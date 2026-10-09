<script setup>
import { computed, ref } from 'vue'
import { ArrowUpRight, CircleHelp, Download, Filter, Layers3, MapPin, RefreshCw } from 'lucide-vue-next'

const props = defineProps({ title: { type: String, default: '多模态知识图谱' } })
const metalGroups = [
  { id:'rare', label:'稀有金属', names:[['锂','Li'],['铷','Rb'],['铯','Cs'],['铍','Be'],['锆','Zr'],['铪','Hf'],['铌','Nb'],['钽','Ta']] },
  { id:'ree', label:'稀土金属', names:[['镧','La'],['铈','Ce'],['镨','Pr'],['钕','Nd'],['钷','Pm'],['钐','Sm'],['铕','Eu'],['钆','Gd'],['铽','Tb'],['镝','Dy'],['钬','Ho'],['铒','Er'],['铥','Tm'],['镱','Yb'],['镥','Lu'],['钇','Y'],['钪','Sc']] },
  { id:'dispersed', label:'稀散金属', names:[['镓','Ga'],['铟','In'],['铊','Tl'],['锗','Ge'],['镉','Cd'],['硒','Se'],['碲','Te'],['铼','Re']] },
  { id:'precious', label:'稀贵金属', names:[['铂','Pt'],['钯','Pd'],['铑','Rh'],['铱','Ir'],['锇','Os'],['钌','Ru'],['金','Au'],['银','Ag']] },
]
const regions = ['广西','越南','老挝','缅甸','泰国','柬埔寨','马来西亚','新加坡','印度尼西亚','文莱','菲律宾','东帝汶']
const initialNodes = [
  ...regions.map((label, index) => ({ id:`region-${index}`, label, type:'region', x:85, y:42+index*52 })),
  ...metalGroups.map((group, index) => ({ id:group.id, label:group.label, type:'category', x:360, y:[75,235,395,555][index] })),
  ...metalGroups.flatMap((group, groupIndex) => group.names.map(([label, symbol], index) => {
    const cols = group.id === 'ree' ? 5 : 4
    const rows = Math.ceil(group.names.length / cols)
    const row = Math.floor(index / cols), col = index % cols
    const centerY = [75,235,395,555][groupIndex]
    return { id:`metal-${symbol}`, label, sub:symbol, type:'resource', category:group.id, x:560+col*80, y:centerY-(rows-1)*22+row*44 }
  })),
  ...[['application-battery','储能材料',1080,125],['application-electronics','电子材料',1080,255],['application-aerospace','航空航天',1080,385],['application-catalyst','催化材料',1080,515]].map(([id,label,x,y])=>({id,label,type:'application',x,y})),
]
const initialEdges = [
  ...metalGroups.flatMap(group => group.names.map(([,symbol])=>({from:group.id,to:`metal-${symbol}`,type:'包含元素'}))),
  ...[
    ['region-0','rare','资源赋存'],['region-0','ree','资源赋存'],['region-0','dispersed','资源赋存'],['region-0','precious','资源赋存'],
    ['region-1','ree','资源供给'],['region-3','ree','资源供给'],['region-6','ree','加工产业'],['region-8','metal-Zr','资源供给'],
    ['rare','application-battery','产业应用'],['ree','application-electronics','产业应用'],['dispersed','application-electronics','产业应用'],['precious','application-catalyst','产业应用'],
  ].map(([from,to,type])=>({from,to,type})),
  ...[['region-0','region-1'],['region-0','region-2'],['region-0','region-4'],['region-0','region-6'],['region-0','region-8'],['region-0','region-10']].map(([from,to])=>({from,to,type:'区域协作'})),
]
const corpusNodes = [
  {id:'cgx',label:'广西',type:'region',x:88,y:100},{id:'cid',label:'印度尼西亚',type:'region',x:88,y:330},{id:'cvn',label:'越南',type:'region',x:88,y:475},{id:'cmm',label:'缅甸',type:'region',x:88,y:575},{id:'cmy',label:'马来西亚',type:'region',x:88,y:650},
  {id:'dachang',label:'大厂矿区',sub:'河池',type:'mine',x:310,y:70},{id:'xialei',label:'下雷锰矿区',sub:'崇左·大新',type:'mine',x:310,y:145},{id:'pingguo',label:'平果铝土矿区',sub:'百色',type:'mine',x:310,y:220},{id:'huashan',label:'花山稀土矿区',type:'mine',x:310,y:295},
  {id:'id-nickel',label:'镍矿供给',sub:'印尼矿业',type:'mine',x:310,y:370},{id:'vn-ree',label:'稀土资源',sub:'越南',type:'mine',x:310,y:455},{id:'mm-ree',label:'稀土资源',sub:'缅甸',type:'mine',x:310,y:555},{id:'my-processing',label:'稀土加工',sub:'马来西亚',type:'mine',x:310,y:650},
  {id:'tin-antimony',label:'锡·锑多金属',type:'resource',x:565,y:70},{id:'manganese',label:'锰矿',type:'resource',x:565,y:145},{id:'bauxite',label:'铝土矿',type:'resource',x:565,y:220},{id:'rare-earth',label:'稀土',type:'resource',x:565,y:295},{id:'nickel',label:'镍',type:'resource',x:565,y:370},{id:'vn-rare-earth',label:'稀土',type:'resource',x:565,y:455},{id:'mm-rare-earth',label:'稀土',type:'resource',x:565,y:555},{id:'my-rare-earth',label:'稀土',type:'resource',x:565,y:650},
  {id:'huaxi',label:'广西华锡有色',sub:'企业需求语料',type:'company',x:820,y:70},{id:'nfm',label:'南方锰业',sub:'企业需求语料',type:'company',x:820,y:145},{id:'chinalco',label:'中铝广西分公司',sub:'企业需求语料',type:'company',x:820,y:210},{id:'huayin',label:'广西华银铝业',sub:'企业需求语料',type:'company',x:820,y:275},{id:'zhongwei',label:'广西中伟新能源',sub:'采购需求语料',type:'company',x:820,y:370},
  {id:'doc-gx',label:'广西矿产资料',sub:'自然资源厅',evidence:'《广西的矿产资源》· 广西壮族自治区自然资源厅',type:'document',x:1080,y:160},{id:'doc-company',label:'企业供需清单',sub:'用户提供 CSV',evidence:'《广西企业供需对接清单.csv》· 用户提供企业需求语料',type:'document',x:1080,y:350},{id:'doc-usgs',label:'USGS 国家矿产摘要',sub:'印尼 / 越南',evidence:'U.S. Geological Survey · Indonesia and Vietnam country mineral summaries',type:'document',x:1080,y:475},{id:'doc-asean',label:'IEA 东盟矿产研究',sub:'区域产业资料',evidence:'IEA · ASEAN Energy Security Review: Critical Minerals Security Review',type:'document',x:1080,y:610},
]
const corpusEdges = [
  ...[['cgx','dachang'],['cgx','xialei'],['cgx','pingguo'],['cgx','huashan'],['cid','id-nickel'],['cvn','vn-ree'],['cmm','mm-ree'],['cmy','my-processing']].map(([from,to])=>({from,to,type:'位于区域'})),
  ...[['dachang','tin-antimony'],['xialei','manganese'],['pingguo','bauxite'],['huashan','rare-earth'],['id-nickel','nickel'],['vn-ree','vn-rare-earth'],['mm-ree','mm-rare-earth'],['my-processing','my-rare-earth']].map(([from,to])=>({from,to,type:'资源关联'})),
  ...[['tin-antimony','huaxi'],['manganese','nfm'],['bauxite','chinalco'],['bauxite','huayin'],['nickel','zhongwei']].map(([from,to])=>({from,to,type:'供需关系'})),
  ...[['tin-antimony','doc-gx'],['manganese','doc-gx'],['bauxite','doc-gx'],['rare-earth','doc-gx'],['huaxi','doc-company'],['nfm','doc-company'],['chinalco','doc-company'],['huayin','doc-company'],['zhongwei','doc-company'],['nickel','doc-usgs'],['vn-rare-earth','doc-usgs'],['mm-rare-earth','doc-asean'],['my-rare-earth','doc-asean']].map(([from,to])=>({from,to,type:'语料依据'})),
]
const graphMode = ref('corpus')
const graphNodes = ref(corpusNodes.map(node => ({ ...node })))
const graphEdges = ref(corpusEdges.map(edge => ({ ...edge })))
const graphCanvas = ref(null), graphLayer = ref(null), draggingGraphNode = ref(null), selectedGraphNode = ref(null)
const regionFilter = ref('全部区域'), typeFilter = ref('全部资源类型'), relationFilter = ref('全部关系')
const zoom = ref(100), showAllRegions = ref(false), refreshedAt = ref('')
function setGraphMode(mode) {
  graphMode.value = mode
  const nodes = mode === 'corpus' ? corpusNodes : initialNodes
  const edges = mode === 'corpus' ? corpusEdges : initialEdges
  graphNodes.value = nodes.map(node => ({ ...node })); graphEdges.value = edges.map(edge => ({ ...edge }))
  regionFilter.value = '全部区域'; typeFilter.value = '全部资源类型'; relationFilter.value = '全部关系'
  selectedGraphNode.value = null; zoom.value = 100; showAllRegions.value = false
}
const regionNames = computed(() => ['全部区域', ...graphNodes.value.filter(node => node.type === 'region').map(node => node.label)])
const visibleNodes = computed(() => graphNodes.value.filter(node => {
  const selectedRegion = graphNodes.value.find(item => item.type === 'region' && item.label === regionFilter.value)
  const relatedNodeIds = new Set(selectedRegion ? [selectedRegion.id] : [])
  if (selectedRegion) for (let depth=0; depth<5; depth+=1) graphEdges.value.forEach(edge => { if (relatedNodeIds.has(edge.from)) relatedNodeIds.add(edge.to) })
  const regionMatch = !selectedRegion || relatedNodeIds.has(node.id)
  const typeMatch = typeFilter.value === '全部资源类型' || node.type === typeFilter.value
  return regionMatch && typeMatch
}))
const visibleEdges = computed(() => graphEdges.value.filter(edge => {
  const relationMatch = relationFilter.value === '全部关系' || edge.type === relationFilter.value
  return relationMatch && visibleNodes.value.some(node => node.id === edge.from) && visibleNodes.value.some(node => node.id === edge.to)
}))
const selectedNode = computed(() => graphNodes.value.find(node => node.id === selectedGraphNode.value))
const graphTitle = computed(() => props.title === '知识融合与补全' ? '资源实体融合与关系补全' : '广西与东盟矿产资源关系网络')
const relationTypes = computed(() => [...new Set(graphEdges.value.map(edge => edge.type))])
function moveGraphNode(event) {
  if (!draggingGraphNode.value || !graphCanvas.value) return
  const svg = graphCanvas.value.querySelector('svg'), point = svg.createSVGPoint()
  point.x = event.clientX; point.y = event.clientY
  const position = point.matrixTransform(graphLayer.value.getScreenCTM().inverse())
  const node = graphNodes.value.find(item => item.id === draggingGraphNode.value)
  if (node) {
    const radius = node.type === 'category' ? 39 : node.type === 'region' ? 30 : node.type === 'application' ? 31 : node.type === 'mine' || node.type === 'company' || node.type === 'document' ? 30 : 23
    node.x = Math.max(radius + 5, Math.min(1195 - radius, position.x)); node.y = Math.max(radius + 5, Math.min(645 - radius, position.y))
  }
}
const endGraphDrag = () => { draggingGraphNode.value = null }
function resetGraph() {
  const nodes = graphMode.value === 'corpus' ? corpusNodes : initialNodes, edges = graphMode.value === 'corpus' ? corpusEdges : initialEdges
  graphNodes.value = nodes.map(node => ({ ...node })); graphEdges.value = edges.map(edge => ({ ...edge }));
  zoom.value = 100; selectedGraphNode.value = null; refreshedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
function exportGraph() {
  const links = visibleEdges.value.map(edge => ({ source: graphNodes.value.find(node => node.id === edge.from)?.label, target: graphNodes.value.find(node => node.id === edge.to)?.label, relation: edge.type }))
  const blob = new Blob([JSON.stringify({ nodes: visibleNodes.value, edges: links }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = '资源知识图谱.json'; link.click(); URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="graph-toolbar panel">
    <div class="graph-filters">
      <label class="graph-filter"><MapPin :size="14"/><select v-model="regionFilter"><option v-for="region in regionNames" :key="region">{{region}}</option></select></label>
      <label class="graph-filter"><Layers3 :size="14"/><select v-model="typeFilter"><option value="全部资源类型">全部节点</option><option value="region">国家 / 地区</option><option v-if="graphMode==='corpus'" value="mine">矿区 / 项目</option><option value="resource">资源实体{{graphMode==='elements'?' / 元素':''}}</option><option v-if="graphMode==='corpus'" value="company">企业实体</option><option v-if="graphMode==='corpus'" value="document">语料来源</option><option v-if="graphMode==='elements'" value="category">四稀分类</option><option v-if="graphMode==='elements'" value="application">产业应用</option></select></label>
      <label class="graph-filter"><Filter :size="14"/><select v-model="relationFilter"><option>全部关系</option><option v-for="type in relationTypes" :key="type">{{type}}</option></select></label>
    </div>
    <div class="graph-actions"><div class="graph-mode-switch"><button :class="{active:graphMode==='corpus'}" @click="setGraphMode('corpus')">语料实体关系</button><button :class="{active:graphMode==='elements'}" @click="setGraphMode('elements')">四稀元素谱系</button></div><span class="graph-count">{{visibleNodes.length}} 个节点 <i>·</i> {{visibleEdges.length}} 条关系<span v-if="refreshedAt"> · {{refreshedAt}}</span></span><button class="icon-btn" title="恢复初始布局" @click="resetGraph"><RefreshCw :size="15"/></button><button class="button secondary" @click="exportGraph"><Download :size="14"/>导出图谱</button></div>
  </div>
  <section class="panel knowledge-graph">
    <div class="kg-title"><div><h2>{{graphMode==='corpus'?'广西与东盟资源语料实体关系图谱':graphTitle}}</h2><p v-if="graphMode==='corpus'">区域 → 矿区/项目 → 资源 → 企业 → 语料来源 · 拖动节点调整布局</p><p v-else>完整展示四稀 41 种金属的分类与元素关系 · 拖动节点调整布局</p></div><div class="graph-zoom"><button :disabled="zoom<=60" @click="zoom=Math.max(60,zoom-10)">−</button><span>{{zoom}}%</span><button :disabled="zoom>=140" @click="zoom=Math.min(140,zoom+10)">+</button></div></div>
    <div class="graph-canvas interactive-graph" ref="graphCanvas" @pointermove="moveGraphNode" @pointerup="endGraphDrag" @pointercancel="endGraphDrag">
      <svg viewBox="0 0 1200 720" role="img" aria-label="可筛选、缩放和拖动的广西与东盟资源语料知识图谱">
          <g ref="graphLayer" :transform="`translate(${600*(1-zoom/100)} ${360*(1-zoom/100)}) scale(${zoom/100})`">
          <g v-if="graphMode==='corpus'" class="graph-column-labels"><text x="85" y="23">区域</text><text x="310" y="23">矿区 / 项目</text><text x="565" y="23">资源实体</text><text x="820" y="23">企业</text><text x="1080" y="23">语料来源</text></g>
          <defs><marker id="graph-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#9dada2"/></marker></defs>
          <g class="graph-links"><line v-for="(edge,index) in visibleEdges" :key="index" :x1="graphNodes.find(node=>node.id===edge.from).x" :y1="graphNodes.find(node=>node.id===edge.from).y" :x2="graphNodes.find(node=>node.id===edge.to).x" :y2="graphNodes.find(node=>node.id===edge.to).y" :class="edge.type" marker-end="url(#graph-arrow)"/><text v-for="edge in visibleEdges.filter(item=>item.from===selectedGraphNode||item.to===selectedGraphNode)" :key="`label-${edge.from}-${edge.to}`" class="graph-edge-label" :x="(graphNodes.find(node=>node.id===edge.from).x+graphNodes.find(node=>node.id===edge.to).x)/2" :y="(graphNodes.find(node=>node.id===edge.from).y+graphNodes.find(node=>node.id===edge.to).y)/2-5">{{edge.type}}</text></g>
          <g v-for="node in visibleNodes" :key="node.id" class="graph-node" :class="[node.type,node.category,{dragging:draggingGraphNode===node.id,focused:selectedGraphNode===node.id}]" :transform="`translate(${node.x} ${node.y})`" @pointerdown.stop.prevent="draggingGraphNode=node.id;$event.currentTarget.setPointerCapture($event.pointerId)" @click="selectedGraphNode=node.id"><title>{{node.evidence || node.label}}{{node.sub?` (${node.sub})`:''}} · {{visibleEdges.filter(edge=>edge.from===node.id||edge.to===node.id).length}} 条关联</title><circle :r="node.type==='category'?39:node.type==='region'?30:node.type==='application'?31:node.type==='mine'||node.type==='company'||node.type==='document'?30:23"/><text class="node-label" :class="{small:node.type==='region'||node.type==='document'||node.type==='mine'||node.type==='company'}" :y="node.sub ? -3 : 4">{{node.label}}</text><text v-if="node.sub" class="node-sub" y="13">{{node.sub}}</text></g>
        </g>
      </svg>
    </div>
    <div class="kg-legend"><span><i class="legend-node green"></i>国家 / 地区</span><span><i class="legend-node amber"></i>矿区 / 资源实体</span><span><i class="legend-node gray"></i>企业实体</span><span><i class="legend-node blue"></i>语料来源</span><span><i class="legend-edge"></i>关系连线</span><span class="legend-hint"><CircleHelp :size="13"/>拖动节点调整关系图</span></div>
  </section>
  <div class="graph-bottom"><section class="panel entity-panel"><div class="panel-heading"><div><h2>{{selectedNode ? `节点详情：${selectedNode.label}` : graphMode==='corpus'?'区域与语料实体':'四稀分类与元素'}}</h2><p>{{selectedNode ? `${visibleEdges.filter(edge=>edge.from===selectedNode.id||edge.to===selectedNode.id).map(edge=>edge.type).join('、') || '暂无关联关系'}` : graphMode==='corpus'?'语料关系图包含矿区、资源、企业和来源文档':'元素谱系按四类关键金属整理'}}</p><small v-if="selectedNode?.evidence" class="graph-selected-evidence">来源：{{selectedNode.evidence}}</small></div><button class="text-button" @click="showAllRegions=!showAllRegions">{{showAllRegions?'收起':'查看全部'}} <ArrowUpRight :size="13"/></button></div><div v-if="graphMode==='corpus'" class="entity-list"><div v-for="node in graphNodes.filter(item=>item.type==='region').slice(0,showAllRegions?12:3)" :key="node.id" @click="regionFilter=node.label"><span class="entity-country">{{node.label}}</span><span>{{graphEdges.filter(edge=>edge.from===node.id).map(edge=>graphNodes.find(item=>item.id===edge.to)?.label).filter(Boolean).join('、') || '暂无已核验资源关联'}}</span><small>点击筛选图谱区域</small></div></div><div v-else class="entity-list"><div v-for="group in metalGroups" :key="group.id"><span class="entity-country">{{group.label}} · {{group.names.length}} 种</span><span>{{group.names.map(([name,symbol])=>`${name} ${symbol}`).join('、')}}</span><small>点击上方筛选分类或元素</small></div></div><small class="graph-source-note" v-if="graphMode==='corpus'">区域矿产语料依据广西自然资源厅、USGS、IEA 及企业供需清单整理；关系边展示来源支持的语料关联。</small></section><section class="panel relation-panel"><div class="panel-heading"><div><h2>当前关系类型</h2><p>筛选结果中的关系构成</p></div></div><div class="relation-bars"><div v-for="type in relationTypes" :key="type"><span>{{type}}</span><b>{{visibleEdges.filter(edge=>edge.type===type).length}}</b><i><u :style="{width:`${visibleEdges.length?visibleEdges.filter(edge=>edge.type===type).length/visibleEdges.length*100:0}%`}"/></i></div></div></section></div>
</template>
