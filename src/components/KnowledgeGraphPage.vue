<script setup>
import { computed, ref } from 'vue'
import { ArrowUpRight, CircleHelp, Download, Filter, Layers3, MapPin, RefreshCw } from 'lucide-vue-next'

const props = defineProps({ title: { type: String, default: '多模态知识图谱' } })
const initialNodes = [
  { id: 'gx', label: '广西', type: 'region', x: 265, y: 125 }, { id: 'vn', label: '越南', type: 'region', x: 180, y: 270 },
  { id: 'id', label: '印度尼西亚', type: 'region', x: 315, y: 400 }, { id: 'th', label: '泰国', type: 'region', x: 625, y: 110 },
  { id: 'my', label: '马来西亚', type: 'region', x: 720, y: 235 }, { id: 'la', label: '老挝', type: 'region', x: 625, y: 405 },
  { id: 'mn', label: '锰矿', type: 'resource', x: 340, y: 75 }, { id: 'sn', label: '锡矿', type: 'resource', x: 540, y: 72 },
  { id: 'core', label: '矿产资源', sub: '协同网络', type: 'core', x: 450, y: 250 },
]
const initialEdges = [
  { from: 'core', to: 'gx', type: '资源分布' }, { from: 'core', to: 'vn', type: '资源分布' }, { from: 'core', to: 'id', type: '供需关系' },
  { from: 'core', to: 'th', type: '供需关系' }, { from: 'core', to: 'my', type: '供需关系' }, { from: 'core', to: 'la', type: '供需关系' },
  { from: 'gx', to: 'vn', type: '区域协作' }, { from: 'gx', to: 'mn', type: '资源分布' }, { from: 'th', to: 'my', type: '区域协作' },
  { from: 'th', to: 'sn', type: '资源分布' }, { from: 'vn', to: 'id', type: '区域协作' }, { from: 'my', to: 'la', type: '区域协作' },
  { from: 'id', to: 'la', type: '区域协作' }, { from: 'sn', to: 'th', type: '资源分布' }, { from: 'mn', to: 'gx', type: '资源分布' },
]
const graphNodes = ref(initialNodes.map(node => ({ ...node })))
const graphEdges = ref(initialEdges.map(edge => ({ ...edge })))
const graphCanvas = ref(null), graphLayer = ref(null), draggingGraphNode = ref(null), selectedGraphNode = ref(null)
const regionFilter = ref('全部区域'), typeFilter = ref('全部资源类型'), relationFilter = ref('全部关系')
const zoom = ref(100), showAllRegions = ref(false), refreshedAt = ref('')
const regionNames = computed(() => ['全部区域', ...graphNodes.value.filter(node => node.type === 'region').map(node => node.label)])
const visibleNodes = computed(() => graphNodes.value.filter(node => {
  const regionMatch = regionFilter.value === '全部区域' || node.type !== 'region' || node.label === regionFilter.value
  const typeMatch = typeFilter.value === '全部资源类型' || node.type === typeFilter.value
  return regionMatch && typeMatch
}))
const visibleEdges = computed(() => graphEdges.value.filter(edge => {
  const relationMatch = relationFilter.value === '全部关系' || edge.type === relationFilter.value
  return relationMatch && visibleNodes.value.some(node => node.id === edge.from) && visibleNodes.value.some(node => node.id === edge.to)
}))
const selectedNode = computed(() => graphNodes.value.find(node => node.id === selectedGraphNode.value))
const graphTitle = computed(() => props.title === '知识融合与补全' ? '资源实体融合与关系补全' : '广西与东盟矿产资源关系网络')
function moveGraphNode(event) {
  if (!draggingGraphNode.value || !graphCanvas.value) return
  const svg = graphCanvas.value.querySelector('svg'), point = svg.createSVGPoint()
  point.x = event.clientX; point.y = event.clientY
  const position = point.matrixTransform(graphLayer.value.getScreenCTM().inverse())
  const node = graphNodes.value.find(item => item.id === draggingGraphNode.value)
  if (node) {
    const radius = node.type === 'core' ? 43 : node.type === 'region' ? 33 : 27
    node.x = Math.max(radius + 5, Math.min(895 - radius, position.x)); node.y = Math.max(radius + 5, Math.min(505 - radius, position.y))
  }
}
const endGraphDrag = () => { draggingGraphNode.value = null }
function resetGraph() {
  graphNodes.value = initialNodes.map(node => ({ ...node })); graphEdges.value = initialEdges.map(edge => ({ ...edge }));
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
      <label class="graph-filter"><Layers3 :size="14"/><select v-model="typeFilter"><option value="全部资源类型">全部节点</option><option value="region">国家 / 地区</option><option value="resource">矿产资源</option><option value="core">关系中心</option></select></label>
      <label class="graph-filter"><Filter :size="14"/><select v-model="relationFilter"><option>全部关系</option><option>资源分布</option><option>供需关系</option><option>区域协作</option></select></label>
    </div>
    <div class="graph-actions"><span class="graph-count">{{visibleNodes.length}} 个节点 <i>·</i> {{visibleEdges.length}} 条关系<span v-if="refreshedAt"> · {{refreshedAt}}</span></span><button class="icon-btn" title="恢复初始布局" @click="resetGraph"><RefreshCw :size="15"/></button><button class="button secondary" @click="exportGraph"><Download :size="14"/>导出图谱</button></div>
  </div>
  <section class="panel knowledge-graph">
    <div class="kg-title"><div><h2>{{graphTitle}}</h2><p>拖动节点调整布局 · 点击节点查看关系详情</p></div><div class="graph-zoom"><button :disabled="zoom<=60" @click="zoom=Math.max(60,zoom-10)">−</button><span>{{zoom}}%</span><button :disabled="zoom>=140" @click="zoom=Math.min(140,zoom+10)">+</button></div></div>
    <div class="graph-canvas interactive-graph" ref="graphCanvas" @pointermove="moveGraphNode" @pointerup="endGraphDrag" @pointercancel="endGraphDrag">
      <svg viewBox="0 0 900 510" role="img" aria-label="可筛选、缩放和拖动的广西与东盟矿产资源知识图谱">
          <g ref="graphLayer" :transform="`translate(${450*(1-zoom/100)} ${255*(1-zoom/100)}) scale(${zoom/100})`">
          <g class="graph-links"><line v-for="(edge,index) in visibleEdges" :key="index" :x1="graphNodes.find(node=>node.id===edge.from).x" :y1="graphNodes.find(node=>node.id===edge.from).y" :x2="graphNodes.find(node=>node.id===edge.to).x" :y2="graphNodes.find(node=>node.id===edge.to).y" :class="edge.type"/></g>
          <g v-for="node in visibleNodes" :key="node.id" class="graph-node" :class="[node.type,{dragging:draggingGraphNode===node.id,focused:selectedGraphNode===node.id}]" :transform="`translate(${node.x} ${node.y})`" @pointerdown.stop.prevent="draggingGraphNode=node.id;$event.currentTarget.setPointerCapture($event.pointerId)" @click="selectedGraphNode=node.id"><title>{{node.label}} · {{visibleEdges.filter(edge=>edge.from===node.id||edge.to===node.id).length}} 条关联</title><circle :r="node.type==='core'?43:node.type==='region'?33:27"/><text class="node-label" y="4">{{node.label}}</text><text v-if="node.sub" class="node-sub" y="18">{{node.sub}}</text></g>
        </g>
      </svg>
    </div>
    <div class="kg-legend"><span><i class="legend-node green"></i>国家 / 地区</span><span><i class="legend-node gray"></i>矿产资源</span><span><i class="legend-node amber"></i>关系中心</span><span><i class="legend-edge"></i>关系连线</span><span class="legend-hint"><CircleHelp :size="13"/>拖动节点调整关系图</span></div>
  </section>
  <div class="graph-bottom"><section class="panel entity-panel"><div class="panel-heading"><div><h2>{{selectedNode ? `节点详情：${selectedNode.label}` : '重点区域资源'}}</h2><p>{{selectedNode ? `${visibleEdges.filter(edge=>edge.from===selectedNode.id||edge.to===selectedNode.id).map(edge=>edge.type).join('、') || '暂无关联关系'}` : '选择节点查看其关联关系'}}</p></div><button class="text-button" @click="showAllRegions=!showAllRegions">{{showAllRegions?'收起':'查看全部'}} <ArrowUpRight :size="13"/></button></div><div class="entity-list"><div v-for="node in graphNodes.filter(item=>item.type==='region').slice(0,showAllRegions?10:3)" :key="node.id" @click="regionFilter=node.label"><span class="entity-country">{{node.label}}</span><span>{{graphNodes.filter(item=>item.type==='resource').map(item=>item.label).join('、')}}</span><small>点击筛选图谱区域</small></div></div></section><section class="panel relation-panel"><div class="panel-heading"><div><h2>当前关系类型</h2><p>筛选结果中的关系构成</p></div></div><div class="relation-bars"><div v-for="type in ['资源分布','供需关系','区域协作']" :key="type"><span>{{type}}</span><b>{{visibleEdges.filter(edge=>edge.type===type).length}}</b><i><u :style="{width:`${visibleEdges.length?visibleEdges.filter(edge=>edge.type===type).length/visibleEdges.length*100:0}%`}"/></i></div></div></section></div>
</template>
