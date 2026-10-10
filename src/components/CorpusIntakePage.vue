<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
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
const activeTaskHistoryId = ref(null)
const intakeHistory = ref([])
const makeSampleHistory = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(16, 42, 0, 0)
  const samples = [
    { taskName:'广西—东盟关键矿产资料抽取', source:'矿产资源报告', method:'本地文件', names:['广西关键矿产资源年度报告.pdf','东盟矿业投资概览.docx'] },
    { taskName:'越南北部矿产资料汇总', source:'区域与产业资料', method:'公开资料', names:['越南北部矿产规划资料链接'] },
    { taskName:'企业供需清单接入', source:'企业供需清单', method:'本地文件', names:['重点企业资源需求清单.xlsx','企业供需补充说明.docx'] },
    { taskName:'东盟资源禀赋资料整理', source:'政务公开资料', method:'本地文件', names:['东盟国家资源禀赋资料集.pdf'] },
    { taskName:'区域产业资料接入', source:'区域与产业资料', method:'本地文件', names:['广西产业链与园区资料.csv'] },
  ]
  return samples.map((sample,index)=>{
    const timestamp = new Date(yesterday)
    timestamp.setDate(timestamp.getDate() - index * 2)
    timestamp.setHours(16 - index, 42 - index * 5, 0, 0)
    return { id:`sample-intake-${index+1}`, timestamp:timestamp.toISOString(), taskName:sample.taskName, source:sample.source, method:sample.method, files:sample.names.map(name=>({name,size:0})), demo:true }
  })
}
try {
  const storedHistory = JSON.parse(localStorage.getItem('corpus-intake:history') || '[]')
  const hasStoredHistory = Array.isArray(storedHistory) && storedHistory.length > 0
  const history = hasStoredHistory ? storedHistory : []
  const hasSampleRecords = history.some(record => record.demo)
  intakeHistory.value = [...history, ...(hasSampleRecords ? [] : makeSampleHistory())]
    .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0,20)
  localStorage.setItem('corpus-intake:history', JSON.stringify(intakeHistory.value))
} catch { intakeHistory.value = makeSampleHistory() }
const lastImportedAt = computed(() => intakeHistory.value[0]?.timestamp || '')
const formattedImportTime = computed(() => {
  if (!lastImportedAt.value) return '尚未导入'
  const date = new Date(lastImportedAt.value)
  if (Number.isNaN(date.getTime())) return '尚未导入'
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
})
const recordImportTime = (addedFiles = []) => {
  const timestamp = new Date().toISOString()
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp, taskName: taskName.value.trim() || '未命名语料接入', source: sourceName.value, method: intakeMode.value, files: addedFiles.map(file => ({ name: file.name, size: file.size || 0 })) }
  intakeHistory.value = [entry, ...intakeHistory.value].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20)
  try { localStorage.setItem('corpus-intake:history', JSON.stringify(intakeHistory.value)) } catch { /* keep history for this session */ }
}
const recordTaskStart = () => {
  const timestamp = new Date().toISOString()
  const taskFiles = files.value.length ? files.value.map(file=>({name:file.name,size:file.size||0})) : [{name:'使用内置案例语料',size:0}]
  const entry = { id:`task-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, timestamp, taskName:taskName.value.trim()||'未命名语料接入', source:sourceName.value, method:intakeMode.value, files:taskFiles, status:'处理中' }
  activeTaskHistoryId.value = entry.id
  intakeHistory.value = [entry,...intakeHistory.value].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,20)
  try { localStorage.setItem('corpus-intake:history',JSON.stringify(intakeHistory.value)) } catch { /* keep history for this session */ }
}
const finishIntakeTask = () => {
  if (!activeTaskHistoryId.value) return
  const timestamp = new Date().toISOString()
  intakeHistory.value = intakeHistory.value.map(record => record.id===activeTaskHistoryId.value ? {...record,timestamp,status:'处理完成',completedAt:timestamp} : record)
    .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,20)
  try { localStorage.setItem('corpus-intake:history',JSON.stringify(intakeHistory.value)) } catch { /* keep history for this session */ }
  activeTaskHistoryId.value = null
  scrollTimelineToLatest()
}
const formatHistoryTime = value => new Intl.DateTimeFormat('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(value))
const formatTimelineTime = value => new Intl.DateTimeFormat('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(value))
const timelineHistory = computed(() => [...intakeHistory.value].reverse())
const intakeTimelineViewport = ref(null)
const activeTimelineRecord = ref(null)
const tooltipPosition = ref({ left: 0, top: 0, placement: 'above' })
const showTimelineTooltip = async (record,event) => {
  activeTimelineRecord.value = record
  await nextTick()
  const node = event.currentTarget.querySelector('.timeline-node').getBoundingClientRect()
  const popup = document.getElementById('intake-history-tooltip')
  const popupHeight = popup?.offsetHeight || 140
  const popupWidth = popup?.offsetWidth || 280
  const above = node.top >= popupHeight + 10
  const center = Math.max(popupWidth / 2 + 12, Math.min(window.innerWidth - popupWidth / 2 - 12, node.left + node.width / 2))
  tooltipPosition.value = { left: center, top: above ? node.top - 5 : node.bottom + 5, placement: above ? 'above' : 'below' }
}
const hideTimelineTooltip = () => { activeTimelineRecord.value = null }
const scrollTimelineToLatest = async () => {
  await nextTick()
  const viewport = intakeTimelineViewport.value
  if (viewport) viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth
}
onMounted(scrollTimelineToLatest)
watch(() => intakeHistory.value[0]?.id, scrollTimelineToLatest)
const fileSummary = computed(() => files.value.length ? `${files.value.length} 份材料 · ${(files.value.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1)} MB` : '使用内置案例语料')
const estimatedMinutes = computed(() => {
  const sizeMb = files.value.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024
  const materialLoad = files.value.length ? Math.ceil(files.value.length / 10) + Math.floor(sizeMb / 30) : 1
  return estimateTaskMinutes(baselineMinutes.value, Math.min(4, materialLoad + (intakeMode.value === '公开资料' && publicUrl.value.trim() ? 1 : 0)))
})
const selectFiles = event => { const selected = Array.from(event.target.files || []); if (selected.length) { files.value = [...files.value, ...selected]; recordImportTime(selected) } event.target.value = '' }
const dropFiles = event => { draggingFiles.value = false; const dropped = Array.from(event.dataTransfer?.files || []); if (dropped.length) { files.value = [...files.value, ...dropped]; recordImportTime(dropped) } }
const removeFile = index => { files.value.splice(index, 1) }
const startExtraction = () => {
  baselineMinutes.value = randomTaskBaseline()
  if (intakeMode.value === '公开资料' && publicUrl.value.trim()) files.value.push({ name: publicUrl.value.trim(), size: 0 })
  recordTaskStart()
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
  <div class="corpus-intake-page">
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
      <div class="run-foot"><span>预计耗时约 <b>{{estimatedMinutes}} 分钟</b></span><button class="button primary" :disabled="!taskName.trim()" @click="startExtraction"><Play :size="14"/>开始处理</button></div>
    </section>
    <div class="corpus-side-stack">
      <section class="panel intake-history"><div class="intake-history-heading"><div><h2>历史接入记录</h2><p>旧记录在左，最新记录在右 · 悬停节点查看接入资料</p></div><span class="history-count">{{intakeHistory.length}} 条记录</span></div><div v-if="intakeHistory.length" ref="intakeTimelineViewport" class="intake-timeline-viewport"><div class="intake-timeline" :style="{minWidth:`${Math.max(timelineHistory.length*150,600)}px`}"><button v-for="(record,index) in timelineHistory" :key="record.id" type="button" class="timeline-event" :class="{latest:record.id===intakeHistory[0]?.id,first:index===0,last:index===timelineHistory.length-1}" :aria-label="`${formatHistoryTime(record.timestamp)}，${record.taskName}，${record.files.length}份资料`" @mouseenter="showTimelineTooltip(record,$event)" @focus="showTimelineTooltip(record,$event)" @mouseleave="hideTimelineTooltip" @blur="hideTimelineTooltip"><span class="timeline-node"><Check v-if="record.id===intakeHistory[0]?.id" :size="12"/><span v-else>{{String(index+1).padStart(2,'0')}}</span></span><time class="timeline-date">{{formatTimelineTime(record.timestamp)}}</time></button></div></div><div v-else class="intake-history-empty"><FileSearch :size="17"/>尚无接入记录。选择文件或提交公开资料链接后，记录会显示在这里。</div><Teleport to="body"><Transition name="timeline-pop"><div v-if="activeTimelineRecord" id="intake-history-tooltip" class="timeline-tooltip timeline-tooltip-floating" :class="tooltipPosition.placement" :style="{left:`${tooltipPosition.left}px`,top:`${tooltipPosition.top}px`}"><span class="timeline-tooltip-top"><b>{{activeTimelineRecord.taskName}}</b><small>{{formatHistoryTime(activeTimelineRecord.timestamp)}}</small></span><span class="timeline-tooltip-meta">{{activeTimelineRecord.source}} · {{activeTimelineRecord.method}}<i :class="activeTimelineRecord.status==='处理完成'?'complete':''">{{activeTimelineRecord.status||'资料已接入'}}</i><i v-if="activeTimelineRecord.demo">示例</i></span><span class="timeline-tooltip-files"><FileSearch :size="15"/><span>{{activeTimelineRecord.files.map(file=>file.name).join('、')}}</span></span><span class="timeline-tooltip-count">{{activeTimelineRecord.files.length}} 份资料</span></div></Transition></Teleport></section>
      <TaskProgressPanel ref="task" title="语料抽取进度" :stages="stages" :logs="logs" :estimated-minutes="estimatedMinutes" result="已提取资源与区域实体，可继续构建向量知识库。" @complete="finishIntakeTask"/>
    </div>
  </div>
  </div>
</template>
