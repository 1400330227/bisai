<script setup>
// 「地图可视化 → 资源分布图」
// 地图本身是一个自包含的单文件页面（放在 public/ 下，Vite 会原样拷进 dist/），
// 这里只做一层容器 + iframe 嵌入，不把它的逻辑搬进 Vue。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
const resourceMapUrl = `${import.meta.env.BASE_URL}resource-map.html`
const mapFrame = ref(null)
const mapReady = ref(false)
const resourceCategories = ref([])
const selectedCategory = ref('mineral')
const selectedResource = ref('Sn')
const selectedLevel = ref('region')
const selectedCategoryInfo = computed(() => resourceCategories.value.find(category => category.key === selectedCategory.value))
const resourceOptions = computed(() => selectedCategoryInfo.value?.items || [])
const levelOptions = computed(() => selectedCategoryInfo.value?.levels || [])

function handleMapMessage(event) {
  if (event.source !== mapFrame.value?.contentWindow || event.origin !== window.location.origin) return
  const message = event.data
  if (!message || message.type !== 'resource-map-options') return
  resourceCategories.value = message.categories || []
  selectedCategory.value = message.selected?.category || resourceCategories.value[0]?.key || ''
  selectedResource.value = message.selected?.resource || selectedCategoryInfo.value?.items?.[0]?.key || ''
  selectedLevel.value = message.selected?.level || selectedCategoryInfo.value?.levels?.[0]?.key || ''
}

function requestMapOptions() {
  mapReady.value = true
  mapFrame.value?.contentWindow?.postMessage({ type: 'resource-map-options-request' }, window.location.origin)
}

function sendMapSelection() {
  if (!mapReady.value) return
  mapFrame.value?.contentWindow?.postMessage({
    type: 'resource-map-selection',
    category: selectedCategory.value,
    resource: selectedResource.value,
    level: selectedLevel.value,
  }, window.location.origin)
}

function changeCategory() {
  const category = selectedCategoryInfo.value
  selectedResource.value = category?.items?.[0]?.key || ''
  selectedLevel.value = category?.levels?.[0]?.key || ''
  sendMapSelection()
}

onMounted(() => window.addEventListener('message', handleMapMessage))
onBeforeUnmount(() => window.removeEventListener('message', handleMapMessage))
</script>

<template>
  <section class="map-page">
    <header class="map-page-heading">
      <div class="map-heading-title"><span>REGIONAL RESOURCE ATLAS</span><h1>广西及东盟资源分布地图</h1><p>按资源类别与行政层级浏览区域分布、数据口径及重点资源点。</p></div>
      <div class="map-filters" aria-label="地图资源筛选">
        <label><span>资源类别</span><select v-model="selectedCategory" class="map-select" @change="changeCategory"><option v-for="category in resourceCategories" :key="category.key" :value="category.key">{{category.name}}</option></select></label>
        <label><span>资源项目</span><select v-model="selectedResource" class="map-select" @change="sendMapSelection"><option v-for="resource in resourceOptions" :key="resource.key" :value="resource.key">{{resource.label}}</option></select></label>
        <label><span>统计层级</span><select v-model="selectedLevel" class="map-select" @change="sendMapSelection"><option v-for="level in levelOptions" :key="level.key" :value="level.key">{{level.name}}</option></select></label>
      </div>
    </header>
    <div class="map-panel">
      <iframe
        class="map-frame"
        ref="mapFrame"
        :src="resourceMapUrl"
        @load="requestMapOptions"
        title="广西及东盟资源分布图"
      ></iframe>
    </div>
  </section>
</template>

<style scoped>
.map-page{display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;min-height:calc(100vh - 175px)}
.map-page-heading{display:flex;align-items:center;justify-content:space-between;gap:18px}
.map-page-heading>div:first-child>span{display:block;margin-bottom:4px;color:#6680a8;font-size:9px;font-weight:700;letter-spacing:1.4px}
.map-page-heading h1{margin:0;color:#142747;font-size:21px;font-weight:700;letter-spacing:-.35px}
.map-page-heading p{margin:5px 0 0;color:#6a7890;font-size:11px}
.map-filters{display:flex;align-items:flex-end;gap:8px;padding:8px;border:1px solid #d9e3f1;border-radius:11px;background:linear-gradient(135deg,#fff,#f6f8fc);box-shadow:0 4px 14px #14264a0a}
.map-filters label{display:grid;gap:4px;min-width:112px}
.map-filters label>span{padding-left:2px;color:#657894;font-size:9px;font-weight:650}
.map-select{height:32px;max-width:175px;padding:0 25px 0 9px;border:1px solid #d7e1ef;border-radius:7px;background:#fff;color:#1c3153;font-size:10.5px;outline:none}
.map-select:focus{border-color:#6f95d6;box-shadow:0 0 0 3px #2563eb14}
.map-panel{min-height:0;background:#fff;border:1px solid #d9e2ee;border-radius:10px;box-shadow:0 5px 18px #14264a0c;padding:5px;overflow:hidden}
.map-frame {
  display: block;
  width: 100%;
  height: calc(100vh - 239px);
  min-height: 450px;
  border: 0;
  border-radius: 7px;
  background: #e8eef4;
}
@media(max-width:1050px){.map-page-heading{align-items:flex-start;flex-direction:column}.map-filters{width:100%;align-items:center}.map-filters label{flex:1;min-width:0}.map-select{width:100%;max-width:none}}
@media(max-width:800px){.map-page{min-height:calc(100vh - 150px)}.map-filters{flex-wrap:wrap}.map-filters label{flex:1 1 130px}.map-frame{height:calc(100vh - 260px);min-height:400px}}
</style>
