<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { CircleHelp, Download, Layers3, MapPin, RefreshCw, Search, X } from 'lucide-vue-next'
import { drag as d3Drag, select, zoom as d3Zoom, zoomIdentity, zoomTransform } from 'd3'

const props = defineProps({ title: { type: String, default: '多模态知识图谱' } })
const graphData = ref({ title: '广西与东盟多模态知识图谱', nodes: [], edges: [] })
const graphNodes = ref([])
const graphEdges = ref([])
const originalPositions = ref(new Map())
const selectedGraphNode = ref(null)
const regionFilter = ref('全部区域')
const typeFilter = ref('全部节点')
const searchInput = ref('')
const searchKeyword = ref('')
const zoom = ref(100)
const graphPopover = ref(null)
const popoverPosition = ref({ left: 16, top: 16 })
const refreshedAt = ref('')
const graphCanvas = ref(null)
const graphSvg = ref(null)
const baseScale = 0.58
const isLoading = ref(true)
const loadError = ref('')
const isPanning = ref(false)
const lastSnapshotAt = ref('')
const graphChangeEvents = ref([])
const graphTypeCounts = computed(() => {
  const counts = new Map()
  graphNodes.value.forEach(node => counts.set(node.type, (counts.get(node.type) || 0) + 1))
  return counts
})
let zoomBehavior
let d3Nodes = []
let d3NodeById = new Map()
let d3Edges = []
const nodeSearchIndex = shallowRef(new Map())
let searchTimer

const nodeTypeLabels = {
  region: '国家 / 地区', city: '广西地级市', county: '县 / 区', province: '一级行政区',
  company: '企业', mine: '矿区 / 项目', resource: '资源实体', document: '来源资料',
}
const nodeTypeOrder = ['region', 'city', 'county', 'province', 'company', 'mine', 'resource', 'document']
const snapshotStorageKey = 'gx-asean-knowledge-graph-snapshot-v1'

function radiusFor(node) {
  return node.type === 'region' ? 42 : ['city', 'company', 'mine'].includes(node.type) ? 34 : 29
}

function colorFor(type) {
  return ({ region: '#f59e0b', city: '#3b82f6', county: '#14b8a6', province: '#8b5cf6', company: '#ec4899', mine: '#c2410c', resource: '#84cc16', document: '#06b6d4' })[type] || '#64748b'
}

function setupD3() {
  if (!graphSvg.value || !graphCanvas.value) return
  const svg = select(graphSvg.value)
  const width = graphCanvas.value.clientWidth
  const height = graphCanvas.value.clientHeight
  zoomBehavior = d3Zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([baseScale * 0.6, baseScale * 1.6])
    .filter(event => !event.target.closest?.('.kg-d3-node') && (!event.button || event.button === 0))
    .on('start', event => { isPanning.value = event.sourceEvent?.type === 'mousedown' || event.sourceEvent?.type === 'touchstart' })
    .on('zoom', event => {
      svg.select('.kg-world').attr('transform', event.transform)
      zoom.value = Math.max(60, Math.min(160, Math.round(event.transform.k / baseScale * 100)))
      updatePopoverPosition()
    })
    .on('end', () => { isPanning.value = false })
  svg.call(zoomBehavior).on('dblclick.zoom', null)
  const initial = zoomIdentity.translate(width / 2 - 1738 * baseScale, height / 2 - 2290 * baseScale).scale(baseScale)
  svg.call(zoomBehavior.transform, initial)
}

function renderD3Graph() {
  if (!graphSvg.value) return
  const svg = select(graphSvg.value).select('.kg-world')
  const visibleIds = new Set(visibleNodes.value.map(node => node.id))
  d3Nodes = visibleNodes.value.map(node => ({ ...node, radius: radiusFor(node) }))
  d3NodeById = new Map(d3Nodes.map(node => [node.id, node]))
  d3Edges = visibleEdges.value.filter(edge => visibleIds.has(edge.from) && visibleIds.has(edge.to))

  const linkSelection = svg.select('.kg-links').selectAll('line').data(d3Edges, edge => `${edge.from}-${edge.to}-${edge.type}`)
  linkSelection.exit().remove()
  linkSelection.enter().append('line').attr('class', 'kg-d3-link').merge(linkSelection)
    .attr('data-from', edge => edge.from).attr('data-to', edge => edge.to)
    .attr('class', edge => `kg-d3-link ${edge.type.replace(/[^\w-]/g, '-')}`)

  const nodeSelection = svg.select('.kg-nodes').selectAll('g.kg-d3-node').data(d3Nodes, node => node.id)
  nodeSelection.exit().remove()
  const entered = nodeSelection.enter().append('g').attr('class', 'kg-d3-node').attr('role', 'button').attr('tabindex', 0)
  entered.append('circle').attr('class', 'kg-node-dot')
  entered.append('text').attr('class', 'kg-node-label').attr('dy', 4)
  entered.append('title')
  const merged = entered.merge(nodeSelection)
    .attr('class', node => `kg-d3-node ${node.type}${node.id === selectedGraphNode.value ? ' selected' : ''}`)
    .on('click', (event, node) => { event.stopPropagation(); selectedGraphNode.value = node.id })
    .on('keydown', (event, node) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectedGraphNode.value = node.id } })
  merged.select('circle').attr('r', node => node.radius).attr('fill', node => colorFor(node.type))
  merged.select('.kg-node-label').text(node => node.label).attr('x', 0).attr('y', 0).attr('dy', '.35em')
  merged.select('title').text(node => `${node.label}${node.sub ? ` · ${node.sub}` : ''}${node.attributesText ? ` · ${node.attributesText}` : ''}`)

  merged.call(d3Drag()
    .filter(event => !event.button)
    .on('start', (event, node) => { event.sourceEvent.stopPropagation(); node.fx = node.x; node.fy = node.y })
    .on('drag', (event, node) => {
      node.fx = node.x = event.x
      node.fy = node.y = event.y
      const sourceNode = graphNodes.value.find(item => item.id === node.id)
      if (sourceNode) { sourceNode.x = node.x; sourceNode.y = node.y }
      updateD3Positions(node.id)
    })
    .on('end', (event, node) => { node.fx = null; node.fy = null }))

  updateD3Positions()
}

function updateD3Positions(movedNodeId = null) {
  if (!graphSvg.value) return
  const world = select(graphSvg.value).select('.kg-world')
  const nodeSelection = world.select('.kg-nodes').selectAll('g.kg-d3-node')
  if (movedNodeId) nodeSelection.filter(node => node.id === movedNodeId).attr('transform', node => `translate(${node.x},${node.y})`)
  else nodeSelection.attr('transform', node => `translate(${node.x},${node.y})`)
  const linkSelection = world.select('.kg-links').selectAll('line')
  const linksToUpdate = movedNodeId ? linkSelection.filter(edge => edge.from === movedNodeId || edge.to === movedNodeId) : linkSelection
  linksToUpdate.each(function (edge) {
    const source = d3NodeById.get(edge.from), target = d3NodeById.get(edge.to)
    if (!source || !target) return
    select(this).attr('x1', source.x).attr('y1', source.y).attr('x2', target.x).attr('y2', target.y)
  })
  if (!movedNodeId) linkSelection.classed('related', edge => edge.from === selectedGraphNode.value || edge.to === selectedGraphNode.value)
  if (!movedNodeId || movedNodeId === selectedGraphNode.value) updatePopoverPosition()
}

function updatePopoverPosition() {
  const node = selectedNode.value
  const world = graphSvg.value?.querySelector('.kg-world')
  if (!node || !world || !graphCanvas.value || !graphPopover.value) return
  const matrix = world.getScreenCTM()
  if (!matrix) return
  const point = graphSvg.value.createSVGPoint()
  point.x = node.x
  point.y = node.y
  const screenPoint = point.matrixTransform(matrix)
  const bounds = graphCanvas.value.getBoundingClientRect()
  const cardWidth = graphPopover.value.offsetWidth || 320
  const cardHeight = graphPopover.value.offsetHeight || 250
  const anchorX = screenPoint.x - bounds.left
  const anchorY = screenPoint.y - bounds.top
  const left = anchorX + cardWidth + 26 <= bounds.width - 10 ? anchorX + 22 : anchorX - cardWidth - 22
  let top = anchorY - cardHeight - 18
  if (top < 10) top = anchorY + 24
  popoverPosition.value = {
    left: Math.max(10, Math.min(bounds.width - cardWidth - 10, left)),
    top: Math.max(10, Math.min(bounds.height - cardHeight - 10, top)),
  }
}

function formatTimestamp(date) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const part = type => parts.find(item => item.type === type)?.value || '00'
  return `${part('year')}年${part('month')}月${part('day')}日 ${part('hour')}:${part('minute')}:${part('second')}`
}

function countByType(records, keyOf, typeOf) {
  const result = {}
  records.forEach(record => {
    const key = keyOf(record)
    if (key) result[typeOf(record)] = (result[typeOf(record)] || 0) + 1
  })
  return result
}

function snapshotGraphChanges() {
  const timestamp = new Date().toISOString()
  lastSnapshotAt.value = formatTimestamp(new Date(timestamp))
  const currentNodes = Object.fromEntries(graphData.value.nodes.map(node => [node.id, node.type]))
  const currentEdges = Object.fromEntries(graphData.value.edges.map(edge => [`${edge.from}\u001f${edge.type}\u001f${edge.to}`, edge.type]))
  const current = { nodes: currentNodes, edges: currentEdges }
  let previous
  try {
    previous = JSON.parse(localStorage.getItem(snapshotStorageKey) || 'null')
  } catch {
    previous = null
  }
  let storedEvents = []
  try {
    storedEvents = JSON.parse(localStorage.getItem(`${snapshotStorageKey}-events`) || '[]')
    if (!Array.isArray(storedEvents)) storedEvents = []
  } catch {
    storedEvents = []
  }
  if (previous?.nodes && previous?.edges) {
    const addedNodes = Object.entries(current.nodes).filter(([id, type]) => previous.nodes[id] !== type).map(([id, type]) => ({ id, type }))
    const removedNodes = Object.entries(previous.nodes).filter(([id, type]) => current.nodes[id] !== type).map(([id, type]) => ({ id, type }))
    const addedEdges = Object.entries(current.edges).filter(([id]) => !(id in previous.edges)).map(([id, type]) => ({ id, type }))
    const removedEdges = Object.entries(previous.edges).filter(([id]) => !(id in current.edges)).map(([id, type]) => ({ id, type }))
    const event = {
      timestamp,
      addedNodes: countByType(addedNodes, item => item.id, item => item.type),
      removedNodes: countByType(removedNodes, item => item.id, item => item.type),
      addedEdges: countByType(addedEdges, item => item.id, item => item.type),
      removedEdges: countByType(removedEdges, item => item.id, item => item.type),
      baseline: false,
    }
    if (addedNodes.length || removedNodes.length || addedEdges.length || removedEdges.length) {
      graphChangeEvents.value = [{ ...event, id: timestamp }, ...storedEvents].slice(0, 12)
      try {
        localStorage.setItem(`${snapshotStorageKey}-events`, JSON.stringify(graphChangeEvents.value))
      } catch {
        // The graph remains usable when browser storage is unavailable.
      }
    } else {
      graphChangeEvents.value = storedEvents.slice(0, 12)
    }
  } else {
    graphChangeEvents.value = [{ id: timestamp, timestamp, baseline: true, nodeTotal: graphData.value.nodes.length, relationTotal: graphData.value.edges.length }]
    try {
      localStorage.setItem(`${snapshotStorageKey}-events`, JSON.stringify(graphChangeEvents.value))
    } catch {
      // The graph remains usable when browser storage is unavailable.
    }
  }
  try {
    localStorage.setItem(snapshotStorageKey, JSON.stringify(current))
  } catch {
    // The graph remains usable when browser storage is unavailable.
  }
}

function eventChanges(event) {
  if (event.baseline) return [`已建立数据基线：${event.nodeTotal} 个节点，${event.relationTotal} 条关系`]
  return [
    ...Object.entries(event.addedNodes || {}).map(([type, count]) => `新增${nodeTypeLabels[type] || type} ${count}`),
    ...Object.entries(event.removedNodes || {}).map(([type, count]) => `减少${nodeTypeLabels[type] || type} ${count}`),
    ...Object.entries(event.addedEdges || {}).map(([type, count]) => `新增关系「${type}」 ${count}`),
    ...Object.entries(event.removedEdges || {}).map(([type, count]) => `减少关系「${type}」 ${count}`),
  ]
}

function displayTimestamp(timestamp) {
  return formatTimestamp(new Date(timestamp))
}

function setZoom(next) {
  if (!zoomBehavior || !graphSvg.value) return
  const value = Math.max(60, Math.min(160, next))
  select(graphSvg.value).call(zoomBehavior.scaleTo, baseScale * value / 100)
}

function focusNode(node) {
  if (!node || !graphSvg.value || !graphCanvas.value || !zoomBehavior) return
  const scale = zoomTransform(graphSvg.value).k
  const width = graphCanvas.value.clientWidth
  const height = graphCanvas.value.clientHeight
  const transform = zoomIdentity.translate(width / 2 - node.x * scale, height / 2 - node.y * scale).scale(scale)
  select(graphSvg.value).call(zoomBehavior.transform, transform)
}

function clearFilters() {
  regionFilter.value = '全部区域'
  typeFilter.value = '全部节点'
  searchInput.value = ''
  searchKeyword.value = ''
}

function resetGraph() {
  graphNodes.value.forEach(node => {
    const original = originalPositions.value.get(node.id)
    if (original) { node.x = original.x; node.y = original.y }
  })
  clearFilters()
  selectedGraphNode.value = null
  zoom.value = 100
  nextTick(() => {
    if (!graphSvg.value || !zoomBehavior) return
    renderD3Graph()
    const width = graphCanvas.value.clientWidth, height = graphCanvas.value.clientHeight
    const initial = zoomIdentity.translate(width / 2 - 1738 * baseScale, height / 2 - 2290 * baseScale).scale(baseScale)
    select(graphSvg.value).call(zoomBehavior.transform, initial)
  })
  refreshedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function exportGraph() {
  const nodes = visibleNodes.value.map(({ id, label, type, sub, attributes, evidence, x, y }) => ({ id, label, type, sub, attributes, evidence, x, y }))
  const nodeIds = new Set(nodes.map(node => node.id))
  const edges = visibleEdges.value.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to))
  const blob = new Blob([JSON.stringify({ title: graphData.value.title, exportedAt: new Date().toISOString(), nodes, edges }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '广西与东盟多模态知识图谱.json'
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/guangxi-asean-knowledge-graph.json`)
    if (!response.ok) throw new Error(`图谱数据文件请求失败（${response.status}）`)
    graphData.value = await response.json()
    graphNodes.value = graphData.value.nodes.map(node => ({ ...node }))
    graphEdges.value = graphData.value.edges.map(edge => ({ ...edge }))
    nodeSearchIndex.value = new Map(graphNodes.value.map(node => [node.id, [
      node.label, node.sub, nodeTypeLabels[node.type], node.attributesText,
      node.evidence, JSON.stringify(node.attributes || {}),
    ].filter(Boolean).join(' ').toLowerCase()]))
    snapshotGraphChanges()
    await nextTick()
    await new Promise(resolve => requestAnimationFrame(resolve))
    originalPositions.value = new Map(graphNodes.value.map(node => [node.id, { x: node.x, y: node.y }]))
    await nextTick()
    await new Promise(resolve => requestAnimationFrame(resolve))
    setupD3()
    renderD3Graph()
    if (searchKeyword.value && visibleNodes.value.length) focusNode(visibleNodes.value[0])
    else if (regionFilter.value !== '全部区域') focusNode(graphNodes.value.find(node => node.id === regionFilter.value))
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '图谱数据载入失败'
  } finally {
    isLoading.value = false
  }
})

const regionOptions = computed(() => {
  const memberIds = new Set(graphEdges.value.filter(edge => edge.from === 'region-asean' && edge.type === '成员国').map(edge => edge.to))
  return graphNodes.value.filter(node => node.id === 'region-guangxi' || memberIds.has(node.id)).map(node => ({ id: node.id, label: node.label }))
})
const selectedNode = computed(() => graphNodes.value.find(node => node.id === selectedGraphNode.value))
const selectedAttributeEntries = computed(() => Object.entries(selectedNode.value?.attributes || {}).filter(([, value]) => value !== undefined && value !== null && value !== '').slice(0, 6).map(([key, value]) => ({
  key,
  value: Array.isArray(value) ? `${value.slice(0, 2).map(item => typeof item === 'object' && item !== null ? Object.values(item).filter(part => typeof part !== 'object').join(' ') : String(item)).join('、')}${value.length > 2 ? ` 等${value.length}项` : ''}` : typeof value === 'object' ? JSON.stringify(value) : String(value),
})))

const visibleNodes = computed(() => {
  let scopedIds = null
  const selectedRegion = graphNodes.value.find(node => node.id === regionFilter.value)
  if (selectedRegion) {
    const hierarchyRelations = new Set(['下辖地级市', '下辖县级行政区', '成员国', '下辖一级行政区', '划分规划区'])
    scopedIds = new Set([selectedRegion.id])
    for (let depth = 0; depth < 5; depth += 1) {
      graphEdges.value.forEach(edge => {
        if (hierarchyRelations.has(edge.type) && scopedIds.has(edge.from)) scopedIds.add(edge.to)
      })
    }
    const connectedEntities = new Set(scopedIds)
    graphEdges.value.forEach(edge => {
      if (!scopedIds.has(edge.from) && !scopedIds.has(edge.to)) return
      const otherId = scopedIds.has(edge.from) ? edge.to : edge.from
      const related = graphNodes.value.find(node => node.id === otherId)
      if (related && ['mine', 'resource', 'company', 'document'].includes(related.type)) connectedEntities.add(related.id)
    })
    graphEdges.value.forEach(edge => {
      if (!connectedEntities.has(edge.from)) return
      const source = graphNodes.value.find(node => node.id === edge.from)
      const destination = graphNodes.value.find(node => node.id === edge.to)
      if (['mine', 'company'].includes(source?.type) && destination && ['resource', 'company', 'document'].includes(destination.type)) connectedEntities.add(destination.id)
    })
    scopedIds = connectedEntities
  }

  const terms = searchKeyword.value.split(/\s+/).filter(Boolean)
  return graphNodes.value.filter(node =>
    (!scopedIds || scopedIds.has(node.id))
    && (typeFilter.value === '全部节点' || node.type === typeFilter.value)
    && (!terms.length || terms.every(term => nodeSearchIndex.value.get(node.id)?.includes(term))),
  )
})

const visibleEdges = computed(() => {
  const visibleIds = new Set(visibleNodes.value.map(node => node.id))
  return graphEdges.value.filter(edge => visibleIds.has(edge.from) && visibleIds.has(edge.to))
})

watch(searchInput, value => {
  clearTimeout(searchTimer)
  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    searchKeyword.value = ''
    return
  }
  searchTimer = setTimeout(() => { searchKeyword.value = normalized }, 180)
})
onUnmounted(() => clearTimeout(searchTimer))

watch([visibleNodes, visibleEdges], () => {
  if (selectedGraphNode.value && !visibleNodes.value.some(node => node.id === selectedGraphNode.value)) selectedGraphNode.value = null
  if (!isLoading.value) renderD3Graph()
})
watch(regionFilter, async value => {
  if (value === '全部区域') return
  await nextTick()
  if (!isLoading.value) focusNode(graphNodes.value.find(node => node.id === value))
})
watch(searchKeyword, async value => {
  if (!value) return
  await nextTick()
  if (!isLoading.value && visibleNodes.value.length) focusNode(visibleNodes.value[0])
})
watch(selectedGraphNode, value => {
  const svg = select(graphSvg.value)
  svg.selectAll('.kg-d3-node').classed('selected', node => node.id === value)
  svg.select('.kg-links').selectAll('.kg-d3-link').classed('related', edge => edge.from === value || edge.to === value)
  nextTick(updatePopoverPosition)
})

const selectedRelationships = computed(() => {
  if (!selectedNode.value) return []
  return graphEdges.value.filter(edge => edge.from === selectedNode.value.id || edge.to === selectedNode.value.id).map(edge => {
    const isSource = edge.from === selectedNode.value.id
    const otherId = isSource ? edge.to : edge.from
    return { ...edge, direction: isSource ? '指向' : '关联自', other: graphNodes.value.find(node => node.id === otherId) }
  }).filter(item => item.other).slice(0, 40)
})

</script>

<template>
  <div class="graph-toolbar panel knowledge-graph-toolbar">
    <div class="graph-filters">
      <label class="graph-filter"><MapPin :size="14"/><select v-model="regionFilter" aria-label="筛选区域" :disabled="isLoading||!!loadError"><option value="全部区域">全部区域</option><option v-for="region in regionOptions" :key="region.id" :value="region.id">{{region.label}}</option></select></label>
      <label class="graph-filter"><Layers3 :size="14"/><select v-model="typeFilter" aria-label="筛选节点类型" :disabled="isLoading||!!loadError"><option value="全部节点">全部节点类型</option><option v-for="type in nodeTypeOrder" :key="type" :value="type">{{nodeTypeLabels[type]}}</option></select></label>
      <div class="graph-keyword-filter"><Search :size="14"/><input v-model="searchInput" type="search" placeholder="搜索节点名称或属性" aria-label="搜索节点名称或属性" :disabled="isLoading||!!loadError"/><button v-if="searchInput" type="button" aria-label="清除关键词" @click="searchInput='';searchKeyword='' "><X :size="14"/></button></div>
    </div>
    <div class="graph-actions"><span class="graph-count">{{isLoading?'载入图谱…':`${visibleNodes.length} 个节点 · ${visibleEdges.length} 条关系`}}<span v-if="refreshedAt"> · {{refreshedAt}}</span></span><button class="icon-btn" title="恢复初始布局并重置筛选" @click="resetGraph"><RefreshCw :size="15"/></button><button class="button secondary" :disabled="isLoading||!!loadError" @click="exportGraph"><Download :size="14"/>导出当前图谱</button></div>
  </div>
  <section class="panel knowledge-graph">
    <div class="kg-title"><div><h2>{{props.title === '多模态知识图谱' ? '广西与东盟多模态知识图谱' : props.title}}</h2></div><div class="graph-zoom"><button :disabled="zoom<=60" @click="setZoom(zoom-10)">−</button><span>{{zoom}}%</span><button :disabled="zoom>=160" @click="setZoom(zoom+10)">+</button></div></div>
    <div class="graph-canvas interactive-graph" ref="graphCanvas" :class="{'is-panning':isPanning}">
      <p v-if="loadError" class="graph-source-note">{{loadError}}</p>
      <svg ref="graphSvg" role="img" aria-label="广西与东盟国家、行政区、企业及资源知识图谱"><g class="kg-world"><g class="kg-links"></g><g class="kg-nodes"></g></g></svg>
      <div v-if="isLoading" class="graph-loading" role="status" aria-live="polite">
        <span class="graph-loading-spinner"></span>
        <strong>正在载入知识图谱</strong>
        <small>正在读取节点、属性与关系数据</small>
      </div>
      <div v-if="!isLoading&&!loadError&&!visibleNodes.length" class="graph-filter-empty" role="status"><strong>没有符合条件的节点</strong><small>调整区域、节点类型或关键词后重试</small><button type="button" @click="clearFilters">清除筛选</button></div>
      <aside v-if="selectedNode" ref="graphPopover" class="graph-node-popover" :style="{left:`${popoverPosition.left}px`,top:`${popoverPosition.top}px`}" @pointerdown.stop @mousedown.stop>
        <header><div><span class="graph-popover-type">{{({region:'国家 / 地区',city:'广西地级市',province:'一级行政区',county:'县 / 区',company:'企业',mine:'矿区 / 项目',resource:'资源实体',document:'来源资料'})[selectedNode.type]||selectedNode.type}}</span><h3>{{selectedNode.label}}</h3></div><button type="button" aria-label="关闭节点信息" @click="selectedGraphNode=null">×</button></header>
        <p v-if="selectedNode.sub" class="graph-popover-sub">{{selectedNode.sub}}</p>
        <div v-if="selectedAttributeEntries.length" class="graph-popover-attributes"><div v-for="item in selectedAttributeEntries" :key="item.key"><b>{{item.key}}</b><span>{{item.value}}</span></div></div>
        <p v-else class="graph-popover-summary">{{selectedNode.attributesText||'暂无补充属性'}}</p>
        <div v-if="selectedRelationships.length" class="graph-popover-relations"><strong>关联节点 · {{selectedRelationships.length}}</strong><span v-for="relation in selectedRelationships.slice(0,4)" :key="`${relation.from}-${relation.to}`">{{relation.type}} · {{relation.other.label}}</span></div>
        <small v-if="selectedNode.evidence" class="graph-popover-source">来源：{{selectedNode.evidence}}</small>
      </aside>
    </div>
    <div class="kg-legend graph-type-legend"><span v-for="type in nodeTypeOrder" :key="type"><i class="legend-node" :style="{background:colorFor(type)}"></i>{{nodeTypeLabels[type]}}</span><span><i class="legend-edge"></i>关系连线</span><span class="legend-hint"><CircleHelp :size="13"/>拖动空白处平移 · 点击节点查看关系</span></div>
  </section>
  <section class="panel graph-statistics">
    <div class="graph-statistics-heading"><div><h2>知识图谱数据统计</h2><p>按节点类型汇总当前数据，并记录每次载入时的增删变化</p></div><small v-if="lastSnapshotAt">最近检查：{{lastSnapshotAt}}</small></div>
    <div class="graph-stat-cards">
      <article class="graph-stat-card graph-stat-total"><span>知识节点总数</span><b>{{graphNodes.length.toLocaleString('zh-CN')}}</b></article>
      <article class="graph-stat-card graph-stat-relations"><span>关系总数</span><b>{{graphEdges.length.toLocaleString('zh-CN')}}</b></article>
      <article v-for="type in nodeTypeOrder" :key="type" class="graph-stat-card" :style="{'--stat-color':colorFor(type)}"><span><i></i>{{nodeTypeLabels[type]}}</span><b>{{(graphTypeCounts.get(type)||0).toLocaleString('zh-CN')}}</b></article>
    </div>
    <div class="graph-change-history"><div class="graph-change-heading"><h3>节点与关系变化记录</h3><small>按当前浏览器保存的数据快照比较</small></div>
      <div v-if="graphChangeEvents.length" class="graph-change-list"><article v-for="event in graphChangeEvents" :key="event.id" class="graph-change-event"><time>{{displayTimestamp(event.timestamp)}}</time><div><span v-for="(change,index) in eventChanges(event)" :key="`${event.id}-${index}`" :class="{'graph-change-baseline':event.baseline}">{{change}}</span></div></article></div>
      <p v-else class="graph-no-change">已与上次载入的数据核对，暂无节点或关系增删。</p>
    </div>
  </section>
</template>

<style>
.knowledge-graph-toolbar{gap:12px}.knowledge-graph-toolbar .graph-filters{display:flex;align-items:center;flex-wrap:wrap;gap:9px;flex:1;min-width:0}.knowledge-graph-toolbar .graph-filter{min-width:170px}.knowledge-graph-toolbar .graph-filter select:disabled{cursor:not-allowed;opacity:.6}
.graph-keyword-filter{display:flex;align-items:center;gap:8px;flex:1 1 220px;max-width:380px;height:36px;padding:0 10px;border:1px solid #e3eae5;border-radius:7px;background:#fff;color:#728078;box-shadow:0 1px 2px #25362c08;transition:border-color .15s,box-shadow .15s}.graph-keyword-filter:focus-within{border-color:#d59a3a;box-shadow:0 0 0 3px #fff2d9}.graph-keyword-filter input{min-width:0;flex:1;width:100%;height:100%;border:0;outline:0;background:transparent;color:#52635a;font-size:12px}.graph-keyword-filter input::placeholder{color:#9ca69e}.graph-keyword-filter input::-webkit-search-cancel-button{display:none}.graph-keyword-filter button{display:grid;place-items:center;width:22px;height:22px;padding:0;border:0;border-radius:5px;background:#f6f3eb;color:#867964;cursor:pointer}.graph-keyword-filter button:hover{background:#f8e8c7;color:#9b6318}
.graph-filter-empty{position:absolute;z-index:3;top:50%;left:50%;display:flex;align-items:center;flex-direction:column;gap:8px;width:min(300px,calc(100% - 32px));padding:22px;border:1px solid #f0e1c6;border-radius:12px;background:#fffdf9f2;box-shadow:0 12px 28px #7055271a;text-align:center;transform:translate(-50%,-50%)}.graph-filter-empty strong{color:#69502a;font-size:14px}.graph-filter-empty small{color:#98876b;font-size:11px}.graph-filter-empty button{margin-top:3px;padding:6px 12px;border:1px solid #ebcf9b;border-radius:6px;background:#fff5df;color:#986119;font-size:11px;cursor:pointer}
.knowledge-graph .graph-canvas.interactive-graph{height:560px;overflow:hidden;position:relative;border:1px solid #f0e5d1;border-radius:10px;background:radial-gradient(ellipse at 50% 48%,#fffdf8 0%,#fffaf0 72%,#fff8e9 100%);touch-action:none;user-select:none}
.knowledge-graph .interactive-graph>svg{display:block;width:100%;height:100%;overflow:hidden}
.knowledge-graph .interactive-graph.is-panning{cursor:grabbing}
.knowledge-graph .interactive-graph:not(.is-panning)>svg{cursor:grab}
.kg-d3-link{stroke:#e9d7b7;stroke-width:1.25;stroke-opacity:.7;pointer-events:none;transition:stroke .16s,stroke-width .16s,stroke-opacity .16s}
.kg-d3-link.related{stroke:#e59520;stroke-width:2.3;stroke-opacity:.95}
.kg-d3-node{cursor:grab;outline:none}
.kg-d3-node:active{cursor:grabbing}
.kg-node-dot{stroke:#fffaf0;stroke-width:3;vector-effect:non-scaling-stroke;transition:stroke .12s}
.kg-d3-node.region .kg-node-dot{stroke:#fff4d8;stroke-width:4}
.kg-d3-node.company .kg-node-dot{stroke:#fff0cf}
.kg-d3-node.resource .kg-node-dot{stroke:#fff7d7}
.kg-d3-node:hover .kg-node-dot,.kg-d3-node.selected .kg-node-dot,.kg-d3-node:focus-visible .kg-node-dot{stroke:#70420c;stroke-width:4}
.kg-node-label{fill:#51380f;font-family:'Noto Sans SC',sans-serif;font-size:15px;font-weight:650;text-anchor:middle;dominant-baseline:central;paint-order:stroke;stroke:#fffdf8;stroke-width:3px;stroke-linejoin:round;pointer-events:none;overflow:visible}
.graph-node-popover{position:absolute;z-index:5;width:min(340px,calc(100% - 20px));max-height:calc(100% - 20px);overflow:auto;padding:15px 16px;border:1px solid #efcf8f;border-radius:12px;background:#fffefa;box-shadow:0 12px 36px #7a541d38;color:#5f5139;pointer-events:auto}
.graph-node-popover header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.graph-node-popover header h3{margin:4px 0 0;color:#553a16;font-size:16px;line-height:1.35;font-weight:700}
.graph-node-popover header button{display:grid;place-items:center;width:26px;height:26px;border:0;border-radius:7px;background:#fff4dc;color:#9b6a20;font-size:19px;line-height:1;cursor:pointer}
.graph-popover-type{display:inline-flex;padding:3px 7px;border-radius:10px;background:#fff1cf;color:#a56814;font-size:10px;font-weight:650}
.graph-popover-sub{margin:7px 0 0;color:#987a4b;font-size:11px}
.graph-popover-attributes{display:grid;gap:7px;margin-top:12px}
.graph-popover-attributes>div{display:grid;grid-template-columns:minmax(72px,auto) 1fr;gap:10px;padding-top:7px;border-top:1px solid #f5ead4;font-size:11px;line-height:1.55}
.graph-popover-attributes b{color:#9b6a20;font-weight:650}
.graph-popover-attributes span{color:#5f5b51;overflow-wrap:anywhere}
.graph-popover-summary{margin:12px 0 0;font-size:11px;line-height:1.6}
.graph-popover-relations{display:grid;gap:5px;margin-top:12px;padding-top:10px;border-top:1px solid #f0e2c6}
.graph-popover-relations strong{color:#8b5a14;font-size:11px}
.graph-popover-relations span{color:#73644b;font-size:10px;line-height:1.5}
.graph-popover-source{display:block;margin-top:10px;color:#9a8a6c;font-size:9px;line-height:1.5}
.knowledge-graph .legend-node.amber{background:#f7a928}.knowledge-graph .legend-node.gold{background:#f8ca64}.knowledge-graph .legend-node.orange{background:#e99122}.knowledge-graph .legend-node.yellow{background:#ffd166}
.knowledge-graph .legend-edge{border-color:#e3b566}
.knowledge-graph .legend-hint{color:#a57328}
.knowledge-graph .graph-loading{position:absolute;z-index:4;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:11px;background:rgba(255,252,245,.96);color:#67502e}
.graph-loading strong{font-size:15px;font-weight:650}.graph-loading small{color:#978568;font-size:11px}
.graph-loading-spinner{width:28px;height:28px;border:3px solid #f2dfbd;border-top-color:#e89b24;border-radius:50%;animation:graph-load-spin .8s linear infinite}
@keyframes graph-load-spin{to{transform:rotate(360deg)}}
.graph-type-legend{flex-wrap:wrap;row-gap:9px}.graph-type-legend>span{display:inline-flex;align-items:center;gap:5px}.graph-type-legend .legend-node{width:9px;height:9px;border:1px solid #ffffff;border-radius:50%;box-shadow:0 0 0 1px #a88b5b55}
.graph-statistics{margin-top:14px;padding:18px 20px}
.graph-statistics-heading,.graph-change-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:14px}
.graph-statistics-heading h2{margin:0;color:#4b4335;font-size:15px}.graph-statistics-heading p{margin:5px 0 0;color:#938b7c;font-size:11px}.graph-statistics-heading>small,.graph-change-heading>small{color:#a09580;font-size:10px}
.graph-stat-cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-top:16px}
.graph-stat-card{min-height:74px;padding:12px 13px;border:1px solid #eee8dc;border-radius:9px;background:#fffefa}
.graph-stat-card>span{display:flex;align-items:center;gap:7px;color:#827969;font-size:10px}.graph-stat-card>span i{width:8px;height:8px;border-radius:50%;background:var(--stat-color,#d5ae67)}
.graph-stat-card>b{display:block;margin-top:7px;color:#574a33;font-size:20px;font-weight:650;line-height:1}
.graph-stat-total{border-color:#f3dba9;background:linear-gradient(135deg,#fff8e8,#fffdf6)}.graph-stat-total>b{color:#bd7511}
.graph-stat-relations{border-color:#e6e9ec;background:linear-gradient(135deg,#f7f9fb,#fff)}.graph-stat-relations>b{color:#526575}
.graph-change-history{margin-top:18px;padding-top:14px;border-top:1px solid #f0ece4}
.graph-change-heading h3{margin:0;color:#5f5545;font-size:12px;font-weight:650}
.graph-change-list{display:grid;gap:8px;margin-top:11px}.graph-change-event{display:grid;grid-template-columns:190px 1fr;align-items:start;gap:12px;padding:9px 11px;border:1px solid #f0ece5;border-radius:8px;background:#fff}
.graph-change-event time{color:#8d7956;font-size:10px;line-height:1.8;white-space:nowrap}
.graph-change-event>div{display:flex;flex-wrap:wrap;gap:6px}
.graph-change-event>div>span{padding:4px 7px;border-radius:12px;background:#edf8ef;color:#357346;font-size:10px;line-height:1.3}
.graph-change-event>div>span.graph-change-baseline{background:#fff4da;color:#9b6a20}
.graph-no-change{margin:12px 0 0;color:#978d7d;font-size:10px}
@media(max-width:900px){.graph-stat-cards{grid-template-columns:repeat(3,minmax(0,1fr))}.graph-change-event{grid-template-columns:1fr;gap:4px}}
@media(max-width:560px){.graph-statistics{padding:14px}.graph-stat-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.graph-statistics-heading,.graph-change-heading{align-items:flex-start;flex-direction:column}}
@media(max-width:720px){.knowledge-graph .graph-canvas.interactive-graph{height:460px}}
@media(max-width:720px){.knowledge-graph-toolbar .graph-filters{width:100%}.knowledge-graph-toolbar .graph-filter{flex:1 1 150px;min-width:0}.graph-keyword-filter{max-width:none;flex-basis:100%}}
</style>
