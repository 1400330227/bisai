<script setup>
import { computed, ref } from 'vue'
import { Check, FileSearch, Play, UploadCloud } from 'lucide-vue-next'
import TaskProgressPanel from './TaskProgressPanel.vue'
import { estimateTaskMinutes, randomTaskBaseline } from '../utils/taskEstimate'
const task = ref(null)
const taskName = ref('广西—东盟关键矿产语料抽取')
const intakeMode = ref('本地文件')
const sourceCategories = ['矿产资源报告', '企业供需清单', '政务公开资料', '区域与产业资料', '自定义来源']
const sourceCategory = ref('矿产资源报告')
const customSource = ref('')
try {
  sourceCategory.value = localStorage.getItem('corpus-intake:source-category') || sourceCategory.value
  customSource.value = localStorage.getItem('corpus-intake:custom-source') || ''
} catch { /* storage may be unavailable */ }
const sourceName = computed(() => sourceCategory.value === '自定义来源' ? customSource.value.trim() || '自定义来源' : sourceCategory.value)
const saveSourceSettings = () => {
  try {
    localStorage.setItem('corpus-intake:source-category', sourceCategory.value)
    localStorage.setItem('corpus-intake:custom-source', customSource.value)
  } catch { /* keep the current settings for this session */ }
}
const files = ref([])
const publicUrl = ref('')
const fileInput = ref(null)
const draggingFiles = ref(false)
const baselineMinutes = ref(randomTaskBaseline())
const defaultImportTime = () => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  date.setHours(12, 53, 37, 0)
  return date.toISOString()
}
const lastImportedAt = ref(defaultImportTime())
try { lastImportedAt.value = localStorage.getItem('corpus-intake:last-imported-at') || lastImportedAt.value } catch { /* storage may be unavailable */ }
const formattedImportTime = computed(() => {
  if (!lastImportedAt.value) return '尚未导入'
  const date = new Date(lastImportedAt.value)
  if (Number.isNaN(date.getTime())) return '尚未导入'
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
})
const recordImportTime = () => {
  lastImportedAt.value = new Date().toISOString()
  try { localStorage.setItem('corpus-intake:last-imported-at', lastImportedAt.value) } catch { /* keep the current time for this session */ }
}
const fileSummary = computed(() => files.value.length ? `${files.value.length} 份材料 · ${(files.value.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1)} MB` : '使用内置案例语料')
const estimatedMinutes = computed(() => {
  const sizeMb = files.value.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024
  const materialLoad = files.value.length ? Math.ceil(files.value.length / 10) + Math.floor(sizeMb / 30) : 1
  return estimateTaskMinutes(baselineMinutes.value, Math.min(4, materialLoad + (intakeMode.value === '公开资料' && publicUrl.value.trim() ? 1 : 0)))
})
const selectFiles = event => { const selected = Array.from(event.target.files || []); if (selected.length) { files.value = [...files.value, ...selected]; recordImportTime() } event.target.value = '' }
const dropFiles = event => { draggingFiles.value = false; const dropped = Array.from(event.dataTransfer?.files || []); if (dropped.length) { files.value = [...files.value, ...dropped]; recordImportTime() } }
const removeFile = index => { files.value.splice(index, 1) }
const startExtraction = () => {
  baselineMinutes.value = randomTaskBaseline()
  if (intakeMode.value === '公开资料' && publicUrl.value.trim()) { files.value.push({ name: publicUrl.value.trim(), size: 0 }); recordImportTime() }
  task.value?.startTask()
}
const stages = ['资料读取与格式识别', '资源与区域实体提取', '实体关系整理']
const logs = [
  { text: '已读取多模态资料并完成格式识别', runningText: '正在读取多模态资料并完成格式识别', pendingText: '待读取多模态资料并完成格式识别', threshold: 15 },
  { text: '已提取资源、地区与企业实体', runningText: '正在提取资源、地区与企业实体', pendingText: '待提取资源、地区与企业实体', threshold: 48 },
  { text: '已完成实体关系整理', runningText: '正在整理实体关系', pendingText: '待整理实体关系', threshold: 82 },
]
</script>

<template>
  <div class="process-layout corpus-step-layout">
    <section class="panel process-panel">
      <div class="panel-heading corpus-panel-heading"><div><h2>语料接入与抽取</h2><p>配置来源并启动实体、属性和关系抽取</p></div><div class="last-import-meta"><span>上次导入时间</span><b>{{formattedImportTime}}</b></div></div>
      <div class="form-label">任务名称</div><input class="text-input" v-model="taskName" placeholder="输入任务名称"/>
      <div class="form-label source-label">语料来源</div>
      <label class="corpus-source-setting"><span>来源类别</span><select v-model="sourceCategory" class="native-select" @change="saveSourceSettings"><option v-for="category in sourceCategories" :key="category">{{category}}</option></select></label>
      <input v-if="sourceCategory==='自定义来源'" v-model="customSource" class="text-input corpus-custom-source" placeholder="输入自定义来源名称" @input="saveSourceSettings"/>
      <div class="source-select"><div class="source-type"><FileSearch :size="18"/><span><strong>{{sourceName}}</strong><small>当前任务所选语料来源类别</small></span><Check :size="16"/></div><div class="source-count">{{fileSummary}}</div></div>
      <div class="form-label">接入方式</div>
      <div class="intake-options"><button type="button" class="intake-option" :class="{selected:intakeMode==='本地文件'}" @click="intakeMode='本地文件'"><UploadCloud :size="19"/><span><b>本地文件</b><small>PDF、DOCX、XLSX、CSV</small></span></button><button type="button" class="intake-option" :class="{selected:intakeMode==='公开资料'}" @click="intakeMode='公开资料'"><FileSearch :size="19"/><span><b>公开资料</b><small>网页与报告链接</small></span></button></div>
      <div v-if="intakeMode==='本地文件'" class="corpus-upload" :class="{dragging:draggingFiles}" @dragover.prevent="draggingFiles=true" @dragleave.prevent="draggingFiles=false" @drop.prevent="dropFiles">
        <input id="corpus-file-input" ref="fileInput" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.html,.htm,.txt" class="corpus-file-input" @change="selectFiles"/>
        <label for="corpus-file-input" class="corpus-upload-prompt"><span class="corpus-upload-icon"><UploadCloud :size="20"/></span><span class="corpus-upload-copy"><strong>拖放文件到这里，或 <em>浏览文件</em></strong><small>支持 PDF、DOCX、XLSX、CSV、HTML 和 TXT</small></span><span class="corpus-upload-action">选择文件</span></label>
        <div v-if="files.length" class="corpus-file-list"><div v-for="(file,index) in files" :key="`${file.name}-${index}`"><FileSearch :size="14"/><span :title="file.name">{{file.name}}</span><small>{{(file.size/1024/1024).toFixed(1)}} MB</small><button type="button" aria-label="移除文件" @click="removeFile(index)">×</button></div></div>
      </div>
      <label v-else class="public-url-field"><span>网页或报告链接</span><input v-model="publicUrl" class="text-input" type="url" placeholder="https://example.com/report"/></label>
      <div class="intake-summary"><span>支持格式</span><b>PDF · DOCX · XLSX · CSV · HTML</b></div>
      <div class="run-foot"><span>预计耗时约 <b>{{estimatedMinutes}} 分钟</b></span><button class="button primary" :disabled="!taskName.trim()" @click="startExtraction"><Play :size="14"/>开始抽取</button></div>
    </section>
    <TaskProgressPanel ref="task" title="语料抽取进度" :stages="stages" :logs="logs" :estimated-minutes="estimatedMinutes" result="已提取资源与区域实体，可继续构建向量知识库。"/>
  </div>
</template>
