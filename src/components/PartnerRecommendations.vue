<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Building2, MapPinned, Route, Layers3, Pickaxe, ArrowRight } from 'lucide-vue-next'

const props = defineProps({
  companies: { type: Array, required: true },
  resources: { type: Array, required: true },
})
const queryMode = ref('company')
const selectedCompanyName = ref(props.companies[0]?.name || '')
const selectedResource = ref(props.resources[0] || '')
const selectedPartnerId = ref('')
const selectedResourceCompanyId = ref('')
const pendingFocusCompanyId = ref('')
const mapElement = ref(null)
const mapError = ref('')
const tileError = ref(false)
const geocoding = ref(false)
const selectedCompany = computed(() => props.companies.find(item => item.name === selectedCompanyName.value) || props.companies[0])
const companyNeeds = computed(() => selectedCompany.value?.needs || [])

const cityCoordinates = {
  '南宁市':[108.32,22.82], '柳州市':[109.42,24.31], '桂林市':[110.29,25.27], '梧州市':[111.30,23.48],
  '北海市':[109.12,21.48], '防城港市':[108.35,21.62], '钦州市':[108.62,21.95], '贵港市':[109.60,23.11],
  '玉林市':[110.15,22.63], '百色市':[106.62,23.90], '贺州市':[111.55,24.41], '河池市':[108.06,24.70],
  '来宾市':[109.23,23.75], '崇左市':[107.35,22.40], '广州市':[113.26,23.13], '深圳市':[114.06,22.55],
  '昆明市':[102.83,24.88], '成都市':[104.07,30.67], '贵阳市':[106.63,26.65], '长沙市':[112.94,28.23],
  '海口市':[110.20,20.04], '上海市':[121.47,31.23], '北京市':[116.40,39.90],
}
const countryCoordinates = {
  '越南':[105.85,21.03], '泰国':[100.50,13.76], '老挝':[102.63,17.97], '柬埔寨':[104.92,11.56],
  '缅甸':[96.16,16.87], '马来西亚':[101.69,3.14], '新加坡':[103.82,1.35], '印度尼西亚':[106.85,-6.21],
  '菲律宾':[120.98,14.60], '文莱':[114.94,4.90], '东帝汶':[125.56,-8.56],
}
const provinceCoordinates = {
  '广西壮族自治区':[108.32,22.82], '云南省':[102.83,24.88], '广东省':[113.27,23.13], '贵州省':[106.63,26.65],
  '四川省':[104.07,30.67], '湖南省':[112.94,28.23], '海南省':[110.20,20.04], '福建省':[119.30,26.08],
  '浙江省':[120.15,30.27], '江苏省':[118.80,32.06], '山东省':[117.00,36.65], '河南省':[113.62,34.75],
  '江西省':[115.86,28.68], '湖北省':[114.30,30.59],
}
const geocodedLocations = ref({})
const amapPrecision = label => /POI/.test(String(label || '')) ? '企业位置' : /门牌|兴趣点|道路|街道|园区/.test(String(label || '')) ? '详细地址/园区' : /乡镇/.test(String(label || '')) ? '乡镇位置' : /区|县/.test(String(label || '')) ? '区县位置' : '市级位置'
const countryOf = company => {
  const value = String(company?.location || '')
  const aliases = [
    ['越南',/越南|越北/],['泰国',/泰国/],['老挝',/老挝/],['柬埔寨',/柬埔寨/],['缅甸',/缅甸/],
    ['马来西亚',/马来西亚/],['新加坡',/新加坡/],['印度尼西亚',/印度尼西亚|印尼/],['菲律宾',/菲律宾/],['文莱',/文莱/],['东帝汶',/东帝汶|帝汶/],
  ]
  return aliases.find(([,pattern]) => pattern.test(value))?.[0] || '中国'
}
const locationOf = company => {
  const stored = geocodedLocations.value[company?.id]
  if (stored) return stored
  const value = String(company?.location || '')
  const city = Object.keys(cityCoordinates).find(name => value.includes(name))
  const country = countryOf(company)
  const province = Object.keys(provinceCoordinates).find(name => value.includes(name))
  const [longitude,latitude] = city ? cityCoordinates[city] : countryCoordinates[country] || provinceCoordinates[province] || [114,27]
  return { longitude, latitude, label: value || city || (country === '中国' && !province ? '中国（地点未细分）' : province || country), precision: '行政区中心（待精确解析）' }
}
const sectorOf = company => company?.industry?.replace(/^[A-Z]\s*/,'').split(/[·/]/)[0]?.trim() || ''
const recommendations = computed(() => {
  const source = selectedCompany.value
  if (!source) return []
  const sourceCountry = countryOf(source)
  const sourceLocation = locationOf(source)
  return props.companies.filter(item => item.id !== source.id).map(company => {
    const commonResources = (source.needs || []).filter(resource => (company.needs || []).includes(resource))
    const location = locationOf(company)
    const sameCity = sourceLocation.label === location.label && sourceCountry === countryOf(company)
    const sameCountry = sourceCountry === countryOf(company)
    const sameSector = Boolean(sectorOf(source) && sectorOf(source) === sectorOf(company))
    const score = commonResources.length * 5 + (sameSector ? 2 : 0) + (sameCity ? 2 : sameCountry ? 1 : 0)
    if (score < 2) return null
    const basis = commonResources.length ? '共同需求资源' : sameSector ? '同产业关联' : sameCity ? '同区域关联' : '产业与区域关联'
    return {
      ...company, locationText:company.location, location, commonResources, score, basis,
      route: commonResources.length
        ? `${source.name} → ${commonResources.slice(0,3).join('、')} → ${company.name}`
        : `${source.name} → ${basis} → ${company.name}`,
    }
  }).filter(Boolean).sort((a,b) => b.score-a.score || a.name.localeCompare(b.name,'zh-CN'))
})
const activePartner = computed(() => recommendations.value.find(item => item.id === selectedPartnerId.value) || recommendations.value[0] || null)
const resourceMatches = computed(() => props.companies.filter(company => (company.needs || []).includes(selectedResource.value)).map(company => ({ ...company, locationText:company.location, location: locationOf(company) })))
const activeResourceCompany = computed(() => resourceMatches.value.find(item => item.id === selectedResourceCompanyId.value) || resourceMatches.value[0] || null)
const visibleMapCompanies = computed(() => queryMode.value === 'company'
  ? [
      ...(selectedCompany.value ? [{ ...selectedCompany.value, locationText:selectedCompany.value.location, location: locationOf(selectedCompany.value), mapRole:'source' }] : []),
      ...recommendations.value.map(item => ({ ...item, mapRole:item.id === activePartner.value?.id ? 'activePartner' : 'partner' })),
    ]
  : resourceMatches.value.map(item => ({ ...item, mapRole:'activeResource' })))
const mapPins = computed(() => visibleMapCompanies.value.reduce((groups,company) => {
  const key = `${company.location.longitude},${company.location.latitude}`
  const group = groups.find(item => item.key === key)
  if (group) group.companies.push(company)
  else groups.push({ key, latitude:company.location.latitude, longitude:company.location.longitude, label:company.location.label, companies:[company] })
  return groups
},[]))

let mapInstance
let AMap
let infoWindow
const geocodeCache = new Map()
// v5 drops the old city-centre-only cache produced while address resolution was skipped.
const cacheKey = 'gx-resource-amap-geocode-v5'
const loadGeocodeCache = () => {
  try { Object.entries(JSON.parse(localStorage.getItem(cacheKey) || '{}')).forEach(([key,value]) => geocodeCache.set(key,value)) } catch { /* ignore malformed cache */ }
}
const saveGeocodeCache = () => {
  try { localStorage.setItem(cacheKey, JSON.stringify(Object.fromEntries(geocodeCache))) } catch { /* storage may be unavailable */ }
}
const loadAmap = () => new Promise((resolve,reject) => {
  if (window.AMap) { resolve(window.AMap); return }
  const key = import.meta.env.VITE_AMAP_KEY
  const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE
  if (!key || !securityCode) { reject(new Error('请在 .env.local 配置高德地图 Key 和安全密钥')); return }
  window._AMapSecurityConfig = { securityJsCode: securityCode }
  const script = document.createElement('script')
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`
  script.async = true
  script.onload = () => resolve(window.AMap)
  script.onerror = () => reject(new Error('高德地图 SDK 加载失败'))
  document.head.appendChild(script)
})
const geocodeAddress = async company => {
  const rawLocation = company?.locationText ?? (typeof company?.location === 'string' ? company.location : '')
  const source = String(rawLocation || '').split(/[（(；;]/)[0].replace(/^(总部|基地|所在地)[:：]?/,'').trim()
  if (!source) return null
  const lookupKey = `${company.name}::${source}`
  const cache = geocodeCache.get(lookupKey)
  if (cache) return cache
  const query = new URLSearchParams({ address:source, company:company.name })
  const response = await fetch(`/api/geocode?${query}`)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '地址解析失败')
  const found = {
    longitude:payload.longitude,
    latitude:payload.latitude,
    label:payload.formattedAddress || source,
    precision:amapPrecision(payload.level),
    geocodeLevel:payload.level,
  }
  geocodeCache.set(lookupKey,found)
  saveGeocodeCache()
  return found
}
const resolveVisibleLocations = async () => {
  if (!AMap || !mapInstance) return
  const companiesToResolve = visibleMapCompanies.value.filter(company => !geocodedLocations.value[company.id])
  if (!companiesToResolve.length) return
  geocoding.value = true
  for (const company of companiesToResolve) {
    try {
      const result = await geocodeAddress(company)
      if (result) {
        mapError.value = ''
        geocodedLocations.value = { ...geocodedLocations.value, [company.id]: result }
      }
    } catch (error) {
      mapError.value = error?.message || '企业地址解析失败'
    }
  }
  geocoding.value = false
  renderMapMarkers(true)
  const currentTarget = queryMode.value === 'company'
    ? (selectedPartnerId.value ? activePartner.value : null)
    : (selectedResourceCompanyId.value ? activeResourceCompany.value : null)
  if (currentTarget) focusCompany(currentTarget)
}
const escapeHtml = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')
const iconFor = (role,count) => `<span class="company-map-marker ${role}"><i></i>${count > 1 ? `<b>${count}</b>` : ''}</span>`
const selectMapCompany = company => {
  if (queryMode.value === 'company' && company.mapRole === 'partner') selectedPartnerId.value = company.id
  if (queryMode.value === 'resource') selectedResourceCompanyId.value = company.id
}
const changeCompany = async () => {
  selectedPartnerId.value = ''
  await nextTick()
  renderMapMarkers()
  focusCompany(selectedCompany.value)
}
const changeResource = async () => {
  selectedResourceCompanyId.value = ''
  await nextTick()
  renderMapMarkers()
  focusCompany(activeResourceCompany.value)
}
const renderMapMarkers = (fitAll = false) => {
  if (!mapInstance || !AMap) return
  mapInstance.clearMap()
  const markers = []
  mapPins.value.forEach(pin => {
    const primary = pin.companies.some(item => item.mapRole === 'source')
    const selectedPartner = pin.companies.some(item => item.id === selectedPartnerId.value)
    const currentLocation = primary || pin.companies.some(item=>item.mapRole==='activeResource')
    const role = currentLocation ? `current${selectedPartner ? ' selected-contains' : ''}` : selectedPartner ? 'selectedPartner' : queryMode.value === 'resource' ? 'resource' : 'partner'
    const marker = new AMap.Marker({
      position:[pin.longitude,pin.latitude],
      content:iconFor(role,pin.companies.length),
      anchor:'bottom-center',
      offset:new AMap.Pixel(0,0),
    })
    const displayCompany = pin.companies.find(company=>company.mapRole==='source') || pin.companies[0]
    marker.setLabel({
      content:escapeHtml(displayCompany?.name || pin.label),
      direction:'right',
      offset:new AMap.Pixel(8,-4),
    })
    marker.on('click', () => {
      infoWindow.setContent(`<div class="company-map-popup"><strong>${escapeHtml(pin.label)}</strong><small class="map-precision">定位精度：${escapeHtml(pin.companies[0]?.location?.precision || '行政区中心')}</small>${pin.companies.map(company=>`<button type="button" data-company-id="${escapeHtml(company.id)}">${escapeHtml(company.name)}<small>${escapeHtml(company.location?.precision || '行政区中心')} · ${escapeHtml(company.mapRole === 'source' ? '当前企业' : company.mapRole === 'resource' ? `需求：${selectedResource.value}` : company.basis || '推荐企业')}</small></button>`).join('')}</div>`)
      infoWindow.open(mapInstance, marker.getPosition())
      window.setTimeout(() => document.querySelectorAll('.company-map-popup [data-company-id]').forEach(button => button.addEventListener('click', () => {
        const company = pin.companies.find(item => item.id === button.dataset.companyId)
        if (company) selectMapCompany(company)
        infoWindow.close()
      })),0)
    })
    markers.push(marker)
  })
  if (markers.length) mapInstance.add(markers)
  if (fitAll) {
    if (markers.length > 1) mapInstance.setFitView(markers,false,[48,48,48,48],17)
    else if (markers.length === 1) mapInstance.setZoomAndCenter(10,markers[0].getPosition())
    else mapInstance.setZoomAndCenter(5,[110,16])
  }
}
const focusCompany = company => {
  if (!company || !mapInstance) return
  const location = Number.isFinite(company.location?.latitude) ? company.location : locationOf(company)
  pendingFocusCompanyId.value = String(location.precision || '').includes('待精确解析') ? company.id : ''
  mapInstance.setZoomAndCenter(16,[location.longitude,location.latitude],true,450)
}
watch(() => [queryMode.value, selectedCompanyName.value, selectedResource.value, selectedPartnerId.value, selectedResourceCompanyId.value], async (current, previous = []) => {
  await nextTick()
  renderMapMarkers(current[0] !== previous[0])
  if (current[0] !== previous[0]) focusCompany(current[0] === 'company' ? selectedCompany.value : activeResourceCompany.value)
  else if (current[1] !== previous[1]) focusCompany(selectedCompany.value)
  else if (current[2] !== previous[2]) focusCompany(activeResourceCompany.value)
  else if (current[3] !== previous[3]) focusCompany(activePartner.value)
  else if (current[4] !== previous[4]) focusCompany(activeResourceCompany.value)
  resolveVisibleLocations()
})
watch(geocodedLocations, async () => {
  await nextTick()
  renderMapMarkers()
  if (pendingFocusCompanyId.value) {
    const target = visibleMapCompanies.value.find(company => company.id === pendingFocusCompanyId.value)
    if (target && !String(target.location?.precision || '').includes('待精确解析')) focusCompany(target)
  }
}, { deep:true })
onMounted(async () => {
  try {
    await nextTick()
    if (!mapElement.value) throw new Error('Map container is unavailable')
    loadGeocodeCache()
    AMap = await loadAmap()
    mapInstance = new AMap.Map(mapElement.value,{ viewMode:'2D', zoom:5, center:[110,16], resizeEnable:true })
    infoWindow = new AMap.InfoWindow({ offset:new AMap.Pixel(0,-28), closeWhenClickMap:true })
    renderMapMarkers(true)
    resolveVisibleLocations()
    mapInstance.on('complete', () => { tileError.value = false })
  } catch (error) {
    console.error('Recommendation map initialization failed:', error)
    mapError.value = error?.message || '地图暂时无法初始化；企业需求与推荐结果仍可使用。'
  }
})
onBeforeUnmount(() => { mapInstance?.destroy(); mapInstance = undefined })
</script>

<template>
  <section class="partner-page">
    <div class="partner-toolbar panel">
      <div class="partner-query-tabs" role="tablist" aria-label="合作方查询方式">
        <button :class="{ active:queryMode==='company' }" role="tab" :aria-selected="queryMode==='company'" @click="queryMode='company'"><Building2 :size="15"/>按企业查询</button>
        <button :class="{ active:queryMode==='resource' }" role="tab" :aria-selected="queryMode==='resource'" @click="queryMode='resource'"><Pickaxe :size="15"/>按资源查询</button>
      </div>
      <label v-if="queryMode==='company'" class="partner-query-picker"><span>需求企业</span><select v-model="selectedCompanyName" class="native-select" @change="changeCompany"><option v-for="company in companies" :key="company.id" :value="company.name">{{ company.name }}</option></select></label>
      <label v-else class="partner-query-picker"><span>需求资源</span><select v-model="selectedResource" class="native-select" @change="changeResource"><option v-for="resource in resources" :key="resource">{{ resource }}</option></select></label>
      <div class="partner-summary"><span><Building2 :size="15"/>{{ queryMode==='company' ? '关联企业' : '需求企业' }} <b>{{ queryMode==='company' ? recommendations.length : resourceMatches.length }}</b></span><span><Layers3 :size="15"/>地图标注已联动</span></div>
    </div>

    <div v-if="queryMode==='company'" class="company-needs panel">
      <div><strong>{{ selectedCompany?.name }}</strong><span>当前企业所需资源</span></div>
      <span v-for="resource in companyNeeds" :key="resource" class="need-chip"><Pickaxe :size="13"/>{{ resource }}</span>
      <span v-if="!companyNeeds.length" class="needs-empty">该企业暂无已录入的资源需求</span>
    </div>

    <div class="partner-layout">
      <section class="panel partner-list-panel">
        <div class="partner-section-heading"><div><h2>{{ queryMode==='company' ? '潜在合作方与对接路径' : `${selectedResource}需求企业` }}</h2><p>{{ queryMode==='company' ? '按共同需求资源、产业和区域关联度排序' : '列出供需清单中需要该资源的企业，点击可定位地图' }}</p></div><Route :size="20"/></div>

        <template v-if="queryMode==='company'">
          <div v-if="activePartner" class="partner-route-focus"><div class="partner-route-label"><span>当前对接路径</span><strong>{{ activePartner.basis }}</strong></div><div class="partner-route-text">{{ activePartner.route }}</div></div>
          <div class="partner-result-list">
            <button v-for="(partner,index) in recommendations" :key="partner.id" class="partner-result" :class="{ active:activePartner?.id===partner.id }" @click="selectedPartnerId=partner.id">
              <span class="partner-rank">{{ String(index+1).padStart(2,'0') }}</span><span class="partner-result-main"><strong>{{ partner.name }}</strong><small>{{ partner.industry }} · {{ partner.location.label }}</small><span class="partner-result-route"><i>{{ partner.basis }}</i><template v-if="partner.commonResources.length">{{ partner.commonResources.slice(0,3).join('、') }}</template><template v-else>可从产业与区域关联开展对接</template></span></span><span class="partner-score">关联分<b>{{ partner.score }}</b></span>
            </button>
            <div v-if="!recommendations.length" class="partner-empty">当前企业暂无可用关联线索。</div>
          </div>
          <p class="partner-data-note">推荐路径依据当前供需清单中的共同需求、产业与区域关系生成；样例数据未提供真实历史合作记录。关联分仅用于排序参考，不代表合作意向或成交概率。</p>
        </template>

        <div v-else class="partner-result-list resource-result-list">
          <button v-for="(company,index) in resourceMatches" :key="company.id" class="partner-result" :class="{ active:activeResourceCompany?.id===company.id }" @click="selectedResourceCompanyId=company.id;focusCompany(company)">
            <span class="partner-rank">{{ String(index+1).padStart(2,'0') }}</span><span class="partner-result-main"><strong>{{ company.name }}</strong><small>{{ company.industry }} · {{ company.location.label }}</small><span class="partner-result-route"><i>需求 {{ selectedResource }}</i>{{ company.demand }}</span></span><span class="partner-score">确定性<b>{{ company.certainty || '待核实' }}</b></span>
          </button>
          <div v-if="!resourceMatches.length" class="partner-empty">当前资源暂无企业需求记录。</div>
        </div>
      </section>

      <section class="panel partner-map-panel">
        <div class="partner-section-heading"><div><h2>{{ queryMode==='company' ? '推荐企业所在地' : '资源需求企业分布' }}</h2><p>高德地图按企业所在地地址解析；地址信息不足时显示到市县，并标注定位精度</p></div><MapPinned :size="20"/></div>
        <div class="partner-map-legend"><span><i class="map-dot primary"></i>{{ queryMode==='company' ? '当前企业' : '当前资源需求企业' }}</span><span v-if="queryMode==='company'"><i class="map-dot partner"></i>潜在合作方</span><span class="map-region-label">{{ geocoding ? '正在解析企业地址…' : `${mapPins.length} 个标注位置 · 可缩放拖动` }}</span></div>
        <div ref="mapElement" class="partner-map-canvas" aria-label="企业真实地图位置" role="application"></div>
        <p v-if="mapError" class="partner-map-message">{{ mapError }}</p><p v-else-if="tileError" class="partner-map-message">高德地图暂不可用，请检查网络或确认 Key 配置；企业推荐列表仍可使用。</p>
        <div v-if="queryMode==='company' && activePartner" class="partner-map-detail"><span><MapPinned :size="15"/><b>{{ activePartner.location.label }}</b></span><span>{{ activePartner.name }}</span><button @click="focusCompany(activePartner)">定位 <ArrowRight :size="14"/></button></div>
        <div v-else-if="queryMode==='resource' && activeResourceCompany" class="partner-map-detail"><span><MapPinned :size="15"/><b>{{ activeResourceCompany.location.label }}</b></span><span>{{ activeResourceCompany.name }}</span><button @click="focusCompany(activeResourceCompany)">定位 <ArrowRight :size="14"/></button></div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.partner-page{display:grid;gap:14px}.partner-toolbar{display:flex;align-items:center;gap:16px;padding:12px 16px}.partner-query-tabs{display:flex;gap:4px;padding:3px;border:1px solid #e8eeea;border-radius:7px;background:#f7faf8;flex:none}.partner-query-tabs button{height:31px;display:flex;align-items:center;gap:7px;padding:0 12px;border:0;border-radius:5px;background:transparent;color:#78867f;font-size:12px;white-space:nowrap}.partner-query-tabs button.active{background:white;color:#3e7355;box-shadow:0 1px 3px #26392f14}.partner-query-picker{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.partner-query-picker>span{font-size:12px;color:#6e7e75;white-space:nowrap}.partner-query-picker .native-select{margin:0;max-width:460px}.partner-summary{display:flex;align-items:center;gap:16px;color:#89968f;font-size:11px;white-space:nowrap}.partner-summary span{display:flex;align-items:center;gap:6px}.partner-summary svg{color:#6f927d}.partner-summary b{color:#426d53;font-size:15px}.company-needs{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:11px 15px}.company-needs>div{display:flex;align-items:baseline;gap:9px;margin-right:4px}.company-needs>div strong{font-size:12px;color:#516459}.company-needs>div span{font-size:11px;color:#8c9992}.need-chip{display:flex;align-items:center;gap:5px;border:1px solid #e5ece7;background:#f8fbf9;border-radius:14px;padding:5px 9px;color:#61766a;font-size:11px}.need-chip svg{color:#72917e}.needs-empty{color:#9aa49e;font-size:11px}.partner-layout{display:grid;grid-template-columns:minmax(420px,1fr) minmax(440px,1.02fr);gap:14px;align-items:stretch}.partner-list-panel,.partner-map-panel{padding:18px;min-width:0}.partner-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.partner-section-heading>svg{color:#7b9987;flex:none;margin-top:3px}.partner-section-heading h2{font-size:17px;color:#34483d;margin:0;font-weight:600}.partner-section-heading p{font-size:12px;color:#8b9891;margin:6px 0 0;line-height:1.5}.partner-route-focus{margin:16px 0 11px;padding:12px 13px;border:1px solid #e5ece7;border-radius:7px;background:#f8fbf9}.partner-route-label{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:11px;color:#829087}.partner-route-label strong{color:#4d795e;font-size:11px;font-weight:500}.partner-route-text{margin-top:8px;font-size:12px;line-height:1.7;color:#53665a;overflow-wrap:anywhere}.partner-result-list{max-height:470px;overflow:auto;padding-right:3px;margin-top:12px}.resource-result-list{margin-top:18px}.partner-result{width:100%;display:grid;grid-template-columns:31px minmax(0,1fr) auto;gap:10px;align-items:start;text-align:left;padding:12px 10px;border:0;border-bottom:1px solid #edf1ee;background:#fff;transition:background .15s}.partner-result:hover,.partner-result.active{background:#f6faf7}.partner-result.active{box-shadow:inset 3px 0 #5d8c6c}.partner-rank{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#eef4f0;color:#64836f;font-size:10px}.partner-result-main{min-width:0;display:grid;gap:4px}.partner-result-main strong{color:#43564a;font-size:13px;font-weight:600;overflow-wrap:anywhere}.partner-result-main small{color:#919c96;font-size:10px;line-height:1.5}.partner-result-route{display:flex;flex-wrap:wrap;gap:6px;align-items:center;color:#718177;font-size:10px;line-height:1.5;overflow-wrap:anywhere}.partner-result-route i{font-style:normal;color:#528064;background:#edf5ef;border-radius:10px;padding:2px 7px;white-space:nowrap}.partner-score{display:grid;justify-items:end;gap:3px;color:#9aa49e;font-size:9px;white-space:nowrap}.partner-score b{font-size:12px;color:#578266}.partner-data-note{font-size:10px;line-height:1.6;color:#9aa49e;margin:12px 1px 0}.partner-empty{padding:35px 10px;text-align:center;color:#8b9891;font-size:12px}.partner-map-legend{display:flex;align-items:center;gap:16px;margin:15px 0 8px;color:#7f8c85;font-size:10px}.partner-map-legend>span{display:flex;align-items:center;gap:6px}.map-dot{width:9px;height:9px;border-radius:50%;display:inline-block;background:#7b9c87}.map-dot.primary{background:#bd8a5d}.map-region-label{margin-left:auto;color:#9ba69f}.partner-map-canvas{height:460px;border:1px solid #edf1ee;border-radius:7px;overflow:hidden;background:#edf2ef}.partner-map-detail{display:flex;align-items:center;gap:10px;border-top:1px solid #eef1ef;margin-top:11px;padding-top:11px;color:#75837b;font-size:11px}.partner-map-detail>span:first-child{display:flex;align-items:center;gap:6px;color:#568067}.partner-map-detail>span:first-child b{font-weight:600}.partner-map-detail>span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.partner-map-detail button{display:flex;align-items:center;gap:4px;border:0;background:transparent;color:#528064;font-size:11px;white-space:nowrap}.partner-page :deep(.company-map-marker-wrap){background:transparent;border:0}.partner-page :deep(.company-map-marker){position:relative;width:24px;height:24px;display:grid;place-items:center;border:2px solid white;border-radius:50% 50% 50% 0;background:#6d987b;box-shadow:0 2px 8px #1d382d55;transform:rotate(-45deg)}.partner-page :deep(.company-map-marker i){width:7px;height:7px;border-radius:50%;background:white}.partner-page :deep(.company-map-marker.source){background:#b98250}.partner-page :deep(.company-map-marker.resource){background:#6386a1}.partner-page :deep(.company-map-marker b){position:absolute;top:-9px;right:-11px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#344f40;color:white;font-size:10px;line-height:17px;text-align:center;transform:rotate(45deg)}.partner-page :deep(.company-map-popup){min-width:190px;max-width:270px}.partner-page :deep(.company-map-popup>strong){display:block;padding:1px 2px 7px;color:#43574b;font-size:13px}.partner-page :deep(.company-map-popup button){display:block;width:100%;padding:7px 4px;border:0;border-top:1px solid #edf1ee;background:white;text-align:left;color:#4d6255;font-size:12px;cursor:pointer}.partner-page :deep(.company-map-popup button:hover){background:#f5f8f6}.partner-page :deep(.company-map-popup small){display:block;margin-top:3px;color:#929d97;font-size:10px}
.partner-page :deep(.company-map-marker.current){background:#c49b4c;transform:rotate(-45deg) scale(1.12)}
.partner-page :deep(.company-map-marker.selectedPartner){background:#4c86bd;transform:rotate(-45deg) scale(1.12)}.partner-page :deep(.company-map-marker.selected-contains)::before{content:"";position:absolute;inset:-5px;border:2px solid #4c86bd;border-radius:50% 50% 50% 0;transform:rotate(0deg)}
.partner-map-message{margin:8px 0 0;color:#9b715d;font-size:11px;line-height:1.5}
@media(max-width:1100px){.partner-layout{grid-template-columns:1fr}.partner-toolbar{align-items:stretch;flex-wrap:wrap}.partner-query-picker{flex-basis:calc(100% - 18px)}.partner-query-picker .native-select{max-width:none}.partner-map-canvas{height:390px}.partner-summary{margin-left:4px}}
</style>
