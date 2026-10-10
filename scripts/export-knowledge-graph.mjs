import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(projectRoot, 'public/data/guangxi-asean-knowledge-graph.json')
const vite = await createServer({ configFile: resolve(projectRoot, 'vite.config.js'), server: { middlewareMode: true }, appType: 'custom' })

function layoutGraph(nodes, edges) {
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const positions = new Map()
  const hierarchy = new Set(['下辖地级市', '下辖县级行政区', '成员国', '下辖一级行政区', '划分规划区'])
  const gxRoot = nodeById.get('region-guangxi')
  const aseanRoot = nodeById.get('region-asean')
  if (gxRoot) positions.set(gxRoot.id, { x: 900, y: 2300 })
  if (aseanRoot) positions.set(aseanRoot.id, { x: 4300, y: 2300 })

  const circleChildren = (parentId, center, radius) => {
    const children = edges.filter(edge => edge.from === parentId && hierarchy.has(edge.type)).map(edge => nodeById.get(edge.to)).filter(node => node && ['region', 'city', 'province', 'county'].includes(node.type))
    children.forEach((node, index) => {
      const angle = -Math.PI / 2 + Math.PI * 2 * index / Math.max(1, children.length)
      positions.set(node.id, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius })
    })
    return children
  }

  const gxCities = circleChildren('region-guangxi', positions.get('region-guangxi'), 690)
  gxCities.forEach(city => {
    const count = edges.filter(edge => edge.from === city.id && edge.type === '下辖县级行政区').length
    circleChildren(city.id, positions.get(city.id), Math.max(115, count * 10))
  })
  const countries = circleChildren('region-asean', positions.get('region-asean'), 1470)
  countries.forEach(country => {
    const count = edges.filter(edge => edge.from === country.id && hierarchy.has(edge.type)).length
    circleChildren(country.id, positions.get(country.id), Math.max(150, count * 9.5))
  })

  const isGeographic = node => node && ['region', 'city', 'province', 'county'].includes(node.type)
  const edgeAnchors = (node, predicate) => edges.flatMap(edge => {
    const neighborId = edge.from === node.id ? edge.to : edge.to === node.id ? edge.from : null
    if (!neighborId) return []
    const neighbor = nodeById.get(neighborId)
    return predicate(edge, neighbor) && positions.has(neighborId) ? [positions.get(neighborId)] : []
  })
  const centerOf = anchors => anchors.length ? anchors.reduce((sum, point) => ({ x: sum.x + point.x / anchors.length, y: sum.y + point.y / anchors.length }), { x: 0, y: 0 }) : { x: 900, y: 2300 }
  const passes = [
    { type: 'mine', predicate: (edge, neighbor) => isGeographic(neighbor) && /资源|产区|矿区/.test(edge.type) },
    { type: 'company', predicate: (edge, neighbor) => isGeographic(neighbor) && /企业所在地|境外基地|经营区域/.test(edge.type) },
    { type: 'resource', predicate: (edge, neighbor) => (isGeographic(neighbor) || neighbor?.type === 'mine') && /资源|产区|赋存|分布|产出/.test(edge.type) },
    { type: 'document', predicate: (edge, neighbor) => ['company', 'resource', 'mine', 'region', 'document'].includes(neighbor?.type) && !/多企业共同需求索引/.test(edge.type) },
  ]
  passes.forEach(({ type, predicate }) => {
    nodes.filter(node => node.type === type && !positions.has(node.id)).forEach(node => {
      const anchors = edgeAnchors(node, predicate)
      if (!anchors.length && type === 'company') {
        const relatedCompanies = edgeAnchors(node, (_, neighbor) => neighbor?.type === 'company')
        anchors.push(...relatedCompanies)
      }
      const center = centerOf(anchors)
      const hash = [...node.id].reduce((value, char) => (value * 33 + char.charCodeAt(0)) >>> 0, 5381)
      const angle = (hash % 3600) / 3600 * Math.PI * 2
      const distance = 34 + hash % (type === 'company' ? 165 : type === 'resource' ? 195 : 120)
      positions.set(node.id, { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance })
    })
  })
  nodes.filter(node => !positions.has(node.id)).forEach((node, index) => positions.set(node.id, { x: 2700 + (index % 9) * 90, y: 4100 + Math.floor(index / 9) * 90 }))

  const radiusOf = node => ({ region: 35, city: 30, province: 23, county: 21, mine: 25, resource: 25, company: 27, document: 20 }[node.type] || 23)
  const indexById = new Map(nodes.map((node, index) => [node.id, index]))
  const points = nodes.map(node => ({ ...positions.get(node.id), vx: 0, vy: 0, node }))
  const forceEdges = edges.flatMap(edge => {
    const source = indexById.get(edge.from), target = indexById.get(edge.to)
    if (source === undefined || target === undefined || /数据来源|信息来源|收录来源|多企业共同需求索引|数据口径说明/.test(edge.type)) return []
    return [{ source, target, length: hierarchy.has(edge.type) ? 175 : /需求资源|矿区赋存|所在地/.test(edge.type) ? 135 : 185, strength: hierarchy.has(edge.type) ? 0.006 : 0.0035 }]
  })

  for (let iteration = 0; iteration < 110; iteration += 1) {
    const grid = new Map()
    points.forEach((point, index) => {
      const key = `${Math.floor(point.x / 130)},${Math.floor(point.y / 130)}`
      const bucket = grid.get(key) || []
      bucket.push(index)
      grid.set(key, bucket)
    })
    const forces = points.map(() => ({ x: 0, y: 0 }))
    points.forEach((point, index) => {
      const cellX = Math.floor(point.x / 130), cellY = Math.floor(point.y / 130)
      for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
        for (const otherIndex of grid.get(`${cellX + dx},${cellY + dy}`) || []) {
          if (otherIndex <= index) continue
          const other = points[otherIndex]
          let x = other.x - point.x, y = other.y - point.y
          let distance = Math.hypot(x, y)
          if (!distance) { x = 0.1; y = 0.1; distance = Math.hypot(x, y) }
          const minimum = radiusOf(point.node) + radiusOf(other.node) + 18
          const separation = distance < minimum ? (minimum - distance) * 0.32 : distance < 115 ? (115 - distance) * 0.018 : 0
          if (separation) {
            const fx = x / distance * separation, fy = y / distance * separation
            forces[index].x -= fx; forces[index].y -= fy
            forces[otherIndex].x += fx; forces[otherIndex].y += fy
          }
        }
      }
    })
    forceEdges.forEach(({ source, target, length, strength }) => {
      const first = points[source], second = points[target]
      const x = second.x - first.x, y = second.y - first.y, distance = Math.hypot(x, y) || 1
      if (distance <= length) return
      const pull = (distance - length) * strength
      const fx = x / distance * pull, fy = y / distance * pull
      forces[source].x += fx; forces[source].y += fy
      forces[target].x -= fx; forces[target].y -= fy
    })
    points.forEach((point, index) => {
      const anchor = positions.get(point.node.id)
      point.vx = Math.max(-24, Math.min(24, (point.vx + forces[index].x + (anchor.x - point.x) * 0.012) * 0.68))
      point.vy = Math.max(-24, Math.min(24, (point.vy + forces[index].y + (anchor.y - point.y) * 0.012) * 0.68))
      point.x = Math.max(80, Math.min(6320, point.x + point.vx))
      point.y = Math.max(80, Math.min(4520, point.y + point.vy))
    })
  }
  return nodes.map((node, index) => ({ ...node, x: Math.round(points[index].x * 10) / 10, y: Math.round(points[index].y * 10) / 10 }))
}

function relaxGraphLayout(nodes, edges) {
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const radiusOf = node => node.type === 'region' ? 42 : ['city', 'company', 'mine'].includes(node.type) ? 34 : 29
  const simulationNodes = nodes.map(node => ({ ...node, radius: radiusOf(node), anchorX: node.x, anchorY: node.y }))
  const validIds = new Set(nodeById.keys())
  const links = edges.filter(edge => validIds.has(edge.from) && validIds.has(edge.to)).map(edge => ({ source: edge.from, target: edge.to, type: edge.type }))
  let seed = 123456789
  const seededRandom = () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 4294967296
  }
  forceSimulation(simulationNodes)
    .randomSource(seededRandom)
    .force('charge', forceManyBody().strength(-95).distanceMax(520))
    .force('link', forceLink(links).id(node => node.id).distance(edge => ['下辖地级市', '下辖县级行政区', '成员国', '下辖一级行政区', '划分规划区'].includes(edge.type) ? 245 : 290).strength(0.022))
    .force('collide', forceCollide(node => node.radius + 60).strength(0.96).iterations(3))
    .force('anchorX', forceX(node => node.anchorX).strength(0.018))
    .force('anchorY', forceY(node => node.anchorY).strength(0.018))
    .stop()
    .tick(360)
  return nodes.map((node, index) => ({
    ...node,
    x: Math.round(Math.max(90, Math.min(7510, simulationNodes[index].x + 450)) * 10) / 10,
    y: Math.round(Math.max(90, Math.min(5110, simulationNodes[index].y)) * 10) / 10,
  }))
}

try {
  const { corpusNodes, corpusEdges } = await vite.ssrLoadModule('/src/data/knowledgeGraphData.js')
  const nodes = relaxGraphLayout(layoutGraph(corpusNodes, corpusEdges), corpusEdges)
  const data = {
    title: '广西与东盟多模态知识图谱',
    generatedAt: new Date().toISOString(),
    nodes,
    edges: corpusEdges,
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  process.stdout.write(`导出完成：${data.nodes.length} 个节点，${data.edges.length} 条关系 -> ${outputPath}\n`)
} finally {
  await vite.close()
}
