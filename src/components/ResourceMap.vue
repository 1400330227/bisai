<script setup>
// 内嵌 SVG 广西地图：把匹配到的企业按「所在地」标点，编号与下方企业列表一一对应
import { computed } from 'vue'
import { GX_RINGS, PREFECTURES, COUNTIES } from '../data/guangxiGeo.js'

const props = defineProps({
  items: { type: Array, default: () => [] }, // runMatch 结果里的 enterprises（含 place）
})

/* 把「百色市平果市」「崇左龙州」这类所在地，落到某个县/市的中心点 */
const SUFFIX = /(瑶族自治县|毛南族自治县|仫佬族自治县|各族自治县|自治县|市辖区|市|县|区)$/
const core = n => String(n).replace(SUFFIX, '')
function locate(place) {
  const q = String(place || '')
  // 1) 县/区全名
  let hit = COUNTIES.find(c => q.includes(c.n))
  // 2) 简称（长的优先，避免「平果」被别的盖掉）
  if (!hit) {
    const byLen = [...COUNTIES].sort((a, b) => core(b.n).length - core(a.n).length)
    hit = byLen.find(c => { const k = core(c.n); return k.length >= 2 && q.includes(k) })
  }
  if (hit) return { lng: hit.c[0], lat: hit.c[1], label: hit.n }
  // 3) 地级市
  const ph = PREFECTURES.find(p => q.includes(p.n) || q.includes(core(p.n)))
  if (ph) return { lng: ph.c[0], lat: ph.c[1], label: ph.n }
  return null
}

/* lng/lat → SVG 坐标（按中心纬度做等距圆柱校正） */
const bounds = computed(() => {
  const pts = GX_RINGS.flat()
  const lngs = pts.map(p => p[0])
  const lats = pts.map(p => p[1])
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const cosLat = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180)
  const W = 640, PAD = 16
  const scale = (W - PAD * 2) / ((maxLng - minLng) * cosLat)
  const H = Math.round(PAD * 2 + (maxLat - minLat) * scale)
  return { W, H, minLng, minLat, scale, cosLat, PAD }
})
const px = lng => bounds.value.PAD + (lng - bounds.value.minLng) * bounds.value.cosLat * bounds.value.scale
const py = lat => bounds.value.H - bounds.value.PAD - (lat - bounds.value.minLat) * bounds.value.scale

const outline = computed(() =>
  GX_RINGS.map(r => 'M' + r.map(p => px(p[0]).toFixed(1) + ' ' + py(p[1]).toFixed(1)).join(' L ') + ' Z'))

const markers = computed(() => {
  const seen = new Map()
  return props.items
    .map((it, i) => {
      const loc = locate(it.place)
      if (!loc) return null
      // 同县的点错开一点，别叠成一坨
      const dup = seen.get(loc.label) || 0
      seen.set(loc.label, dup + 1)
      const ang = dup * 2.2, off = dup ? 9 : 0
      return {
        x: px(loc.lng) + Math.cos(ang) * off,
        y: py(loc.lat) + Math.sin(ang) * off,
        idx: i + 1,
        label: loc.label,
        name: it.name,
      }
    })
    .filter(Boolean)
})
const unlocated = computed(() => props.items.length - markers.value.length)
</script>

<template>
  <div class="gxmap">
    <div class="gxmap-head">
      <span class="t">资源需求地图</span>
      <span class="s">编号对应下方企业列表 · 广西</span>
    </div>
    <svg :viewBox="'0 0 ' + bounds.W + ' ' + bounds.H" role="img" aria-label="广西资源需求地图">
      <path v-for="(d, i) in outline" :key="i" :d="d" class="land" />
      <g v-for="m in markers" :key="m.idx">
        <circle class="halo" :cx="m.x" :cy="m.y" r="10" />
        <circle class="mk" :cx="m.x" :cy="m.y" r="6" />
        <text class="num" :x="m.x" :y="m.y + 3.4">{{ m.idx }}</text>
      </g>
    </svg>
    <div class="gxmap-foot">
      <span v-for="m in markers.slice(0, 8)" :key="m.idx" class="chip">
        <b>{{ m.idx }}</b>{{ m.label }}
      </span>
      <span v-if="unlocated > 0" class="muted">另有 {{ unlocated }} 家未能定位</span>
    </div>
  </div>
</template>

<style scoped>
.gxmap { background: linear-gradient(165deg, #eef5f1, #e7f0ea); border: 1px solid #e2ebe5; border-radius: 10px; padding: 11px 12px 9px; }
.gxmap-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.gxmap-head .t { font-size: 12px; font-weight: 600; color: #35594a; }
.gxmap-head .s { font-size: 9.5px; color: #94a39c; }
.gxmap svg { display: block; width: 100%; height: auto; }
.land { fill: #ffffff; stroke: #bcd4c6; stroke-width: 1; }
.halo { fill: #4f9c76; opacity: .16; }
.mk { fill: #2f6f52; stroke: #ffffff; stroke-width: 1.6; }
.num { fill: #ffffff; font-size: 7.5px; font-weight: 700; text-anchor: middle; }
.gxmap-foot { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: #5f7269; background: #fff; border: 1px solid #e6ece8; padding: 2px 8px; border-radius: 999px; }
.chip b { color: #2f6f52; font-weight: 700; }
.muted { font-size: 10px; color: #9aa49f; align-self: center; }
</style>
