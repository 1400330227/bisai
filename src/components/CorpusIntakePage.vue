<script setup>
import { computed, ref } from 'vue'
import { Check, FileSearch, Play, UploadCloud } from 'lucide-vue-next'
import TaskProgressPanel from './TaskProgressPanel.vue'
const task = ref(null)
const taskName = ref('广西—东盟关键矿产语料抽取')
const intakeMode = ref('本地文件')
const files = ref([])
const publicUrl = ref('')
const fileInput = ref(null)
const draggingFiles = ref(false)
const fileSummary = computed(() => files.value.length ? `${files.value.length} 份材料 · ${(files.value.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1)} MB` : '使用内置案例语料')
const selectFiles = event => { files.value = [...files.value, ...Array.from(event.target.files || [])]; event.target.value = '' }
const dropFiles = event => { draggingFiles.value = false; files.value = [...files.value, ...Array.from(event.dataTransfer?.files || [])] }
const removeFile = index => { files.value.splice(index, 1) }
const startExtraction = () => {
  if (intakeMode.value === '公开资料' && publicUrl.value.trim()) files.value.push({ name: publicUrl.value.trim(), size: 0 })
  task.value?.startTask()
}
const stages = ['语料抽取']
const logs = [
  { text: '已读取多模态资料并完成格式识别', threshold: 15 },
  { text: '正在提取资源、地区与企业实体', threshold: 48 },
  { text: '实体关系整理完成', threshold: 82 },
]
</script>

<template>
  <div class="process-layout corpus-step-layout">
    <section class="panel process-panel">
      <div class="panel-heading"><div><h2>语料接入与抽取</h2><p>配置来源并启动实体、属性和关系抽取</p></div></div>
      <div class="form-label">任务名称</div><input class="text-input" v-model="taskName" placeholder="输入任务名称"/>
      <div class="form-label source-label">语料来源</div>
      <div class="source-select"><div class="source-type"><FileSearch :size="18"/><span><strong>公开资料与企业需求资料</strong><small>矿产报告、企业需求、区域资源信息</small></span><Check :size="16"/></div><div class="source-count">{{fileSummary}}</div></div>
      <div class="form-label">接入方式</div>
      <div class="intake-options"><button type="button" class="intake-option" :class="{selected:intakeMode==='本地文件'}" @click="intakeMode='本地文件'"><UploadCloud :size="19"/><span><b>本地文件</b><small>PDF、DOCX、XLSX、CSV</small></span></button><button type="button" class="intake-option" :class="{selected:intakeMode==='公开资料'}" @click="intakeMode='公开资料'"><FileSearch :size="19"/><span><b>公开资料</b><small>网页与报告链接</small></span></button></div>
      <div v-if="intakeMode==='本地文件'" class="corpus-upload" :class="{dragging:draggingFiles}" @dragover.prevent="draggingFiles=true" @dragleave.prevent="draggingFiles=false" @drop.prevent="dropFiles">
        <input id="corpus-file-input" ref="fileInput" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.html,.htm,.txt" class="corpus-file-input" @change="selectFiles"/>
        <label for="corpus-file-input" class="corpus-upload-prompt"><span class="corpus-upload-icon"><UploadCloud :size="20"/></span><span class="corpus-upload-copy"><strong>拖放文件到这里，或 <em>浏览文件</em></strong><small>支持 PDF、DOCX、XLSX、CSV、HTML 和 TXT</small></span><span class="corpus-upload-action">选择文件</span></label>
        <div v-if="files.length" class="corpus-file-list"><div v-for="(file,index) in files" :key="`${file.name}-${index}`"><FileSearch :size="14"/><span :title="file.name">{{file.name}}</span><small>{{(file.size/1024/1024).toFixed(1)}} MB</small><button type="button" aria-label="移除文件" @click="removeFile(index)">×</button></div></div>
      </div>
      <label v-else class="public-url-field"><span>网页或报告链接</span><input v-model="publicUrl" class="text-input" type="url" placeholder="https://example.com/report"/></label>
      <div class="intake-summary"><span>支持格式</span><b>PDF · DOCX · XLSX · CSV · HTML</b></div>
      <div class="run-foot"><span>预计耗时约 <b>10 分钟</b></span><button class="button primary" :disabled="!taskName.trim()" @click="startExtraction"><Play :size="14"/>开始抽取</button></div>
    </section>
    <TaskProgressPanel ref="task" title="语料抽取进度" :stages="stages" :logs="logs" result="已提取资源与区域实体，可继续构建向量知识库。"/>
  </div>
</template>
