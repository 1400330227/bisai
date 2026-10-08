<script setup>
import { computed, ref } from 'vue'
import { Check, CircleHelp, GitMerge, Layers3, Play, RotateCcw, X } from 'lucide-vue-next'
import TaskProgressPanel from './TaskProgressPanel.vue'
import { estimateTaskMinutes, randomTaskBaseline } from '../utils/taskEstimate'

const task = ref(null)
const scope = ref('广西及东盟')
const completionTypes = ref({ relations: true, attributes: true, aliases: true })
const threshold = ref(75)
const taskState = ref('idle')
const baselineMinutes = ref(randomTaskBaseline())
const estimatedMinutes = computed(() => {
  const selectedTypeCount = Object.values(completionTypes.value).filter(Boolean).length
  const workload = (scope.value === '广西及东盟' ? 1 : 0) + (selectedTypeCount > 1 ? 1 : 0) + (threshold.value < 65 ? 1 : 0)
  return estimateTaskMinutes(baselineMinutes.value, workload)
})
const suggestionRows = ref([
  { id: 1, kind: 'relations', typeName: '缺失关系', source: '广西', relation: '拥有资源', target: '锰矿', evidence: '广西有色金属矿产资源分布资料', confidence: 96, status: '待确认' },
  { id: 2, kind: 'relations', typeName: '缺失关系', source: '越南', relation: '分布资源', target: '锡矿', evidence: '东盟矿产资源概况与区域报告', confidence: 88, status: '待确认' },
  { id: 3, kind: 'relations', typeName: '缺失关系', source: '印度尼西亚', relation: '主要产出', target: '镍矿', evidence: '印度尼西亚矿业与产业资料', confidence: 93, status: '待确认' },
  { id: 4, kind: 'relations', typeName: '缺失关系', source: '广西', relation: '与区域建立协作', target: '越南', evidence: '广西—越南跨境产业协作资料', confidence: 79, status: '待确认' },
  { id: 5, kind: 'relations', typeName: '缺失关系', source: '泰国', relation: '存在资源储量', target: '锡矿', evidence: '东盟矿产资源国别资料', confidence: 71, status: '待确认' },
  { id: 6, kind: 'attributes', typeName: '缺失属性', source: '铝土矿', relation: '资源类别', target: '有色金属矿产', evidence: '知识库资源分类体系', confidence: 91, status: '待确认' },
  { id: 7, kind: 'aliases', typeName: '实体别名', source: '印度尼西亚镍矿', relation: '常见称谓', target: '红土镍矿', evidence: '关联语料中的资源名称对齐', confidence: 83, status: '待确认' },
])
const scopedRows = computed(() => suggestionRows.value.filter(row => (scope.value === '广西及东盟' || row.source.includes(scope.value)) && completionTypes.value[row.kind]))
const pendingRows = computed(() => scopedRows.value.filter(row => row.status === '待确认' && row.confidence >= threshold.value))
const acceptedCount = computed(() => scopedRows.value.filter(row => row.status === '已补全').length)
const stages = ['图谱扫描与缺口识别', '候选知识检索', '实体关系推断', '置信度校验与入图']
const logs = [
  { text: '已识别实体属性与关系缺口', runningText: '正在扫描实体属性与关系缺口', pendingText: '待扫描实体属性与关系缺口', threshold: 10 },
  { text: '已从关联语料检索候选事实', runningText: '正在从关联语料检索候选事实', pendingText: '待检索候选事实', threshold: 30 },
  { text: '已完成实体对齐并推断缺失关系', runningText: '正在对齐实体并推断缺失关系', pendingText: '待对齐实体并推断缺失关系', threshold: 58 },
  { text: '已完成证据核验与置信度排序', runningText: '正在核验证据并排序置信度', pendingText: '待核验证据并排序置信度', threshold: 84 },
]
const startCompletion = () => {
  if (!Object.values(completionTypes.value).some(Boolean)) return
  baselineMinutes.value = randomTaskBaseline()
  taskState.value = 'running'
  task.value?.startTask()
}
const finishCompletion = () => { taskState.value = 'done' }
const resetCompletion = () => { taskState.value = 'idle' }
const updateRow = (row, status) => { row.status = status }
</script>

<template>
  <div class="fusion-page">
    <div class="fusion-layout">
      <section class="panel fusion-config">
        <div class="panel-heading"><div><h2>补全任务配置</h2><p>扫描知识图谱中的缺失项，并从关联语料寻找依据</p></div><GitMerge :size="20" class="fusion-heading-icon"/></div>
        <div class="fusion-data-card"><span class="fusion-data-icon"><Layers3 :size="20"/></span><div><strong>广西—东盟资源知识图谱</strong><small>146 个实体 · 203 条有效关系 · 30 份关联语料</small></div><button class="fusion-help" title="补全结果根据实体属性、关联语料与已有关系推断"><CircleHelp :size="16"/></button></div>
        <label class="fusion-field"><span>补全范围</span><select v-model="scope" class="native-select"><option>广西及东盟</option><option>广西</option><option>越南</option><option>印度尼西亚</option><option>泰国</option><option>马来西亚</option><option>老挝</option></select></label>
        <div class="fusion-field"><span>待补全知识类型</span><div class="fusion-checks"><label><input v-model="completionTypes.relations" type="checkbox"/>缺失关系</label><label><input v-model="completionTypes.attributes" type="checkbox"/>缺失属性</label><label><input v-model="completionTypes.aliases" type="checkbox"/>实体别名</label></div></div>
        <label class="fusion-field"><span>最低置信度 <b>{{threshold}}%</b></span><input v-model.number="threshold" class="fusion-range" type="range" min="50" max="98" step="1"/><small>低于阈值的候选项保留在待核验队列，不自动纳入图谱。</small></label>
        <div class="fusion-steps"><span><i>1</i>识别缺口</span><b></b><span><i>2</i>查找证据</span><b></b><span><i>3</i>关系推断</span><b></b><span><i>4</i>质量校验</span></div>
        <div class="run-foot"><span>预计耗时约 <b>{{estimatedMinutes}} 分钟</b></span><button class="button primary" :disabled="!Object.values(completionTypes).some(Boolean) || taskState==='running'" @click="startCompletion"><Play :size="14"/>{{taskState==='running'?'正在补全':'开始补全'}}</button></div>
      </section>
      <TaskProgressPanel ref="task" title="残缺知识补全进度" :stages="stages" :logs="logs" :estimated-minutes="estimatedMinutes" result="候选知识已完成推断与证据核验。请审核后纳入知识图谱。" @complete="finishCompletion" @reset="resetCompletion"/>
    </div>

    <section v-if="taskState==='done'" class="panel fusion-results">
      <div class="panel-heading fusion-results-heading"><div><h2>补全候选结果</h2><p>范围：{{scope}} · 置信度不低于 {{threshold}}% · 逐条审核后更新图谱</p></div><div class="fusion-result-stats"><span><b>{{pendingRows.length}}</b> 条待审核</span><span><b>{{acceptedCount}}</b> 条已纳入</span></div></div>
      <div class="fusion-table-wrap"><table><thead><tr><th>补全类型</th><th>源实体</th><th>推断关系</th><th>目标实体</th><th>证据来源</th><th>置信度</th><th>审核</th></tr></thead><tbody><tr v-for="row in scopedRows.filter(item=>item.confidence>=threshold)" :key="row.id"><td><span class="fusion-type">{{row.typeName}}</span></td><td><strong>{{row.source}}</strong></td><td><span class="fusion-relation">{{row.relation}}</span></td><td><strong>{{row.target}}</strong></td><td class="fusion-evidence">{{row.evidence}}</td><td><span class="fusion-confidence" :class="{low:row.confidence<80}">{{row.confidence}}%</span></td><td><span v-if="row.status==='已补全'" class="fusion-approved"><Check :size="13"/>已纳入</span><span v-else-if="row.status==='已忽略'" class="fusion-dismissed">已忽略</span><span v-else class="fusion-row-actions"><button title="纳入知识图谱" @click="updateRow(row,'已补全')"><Check :size="15"/></button><button title="忽略此建议" @click="updateRow(row,'已忽略')"><X :size="15"/></button></span></td></tr><tr v-if="!scopedRows.some(item=>item.confidence>=threshold)"><td colspan="7" class="fusion-empty">当前配置下没有候选项，可调整补全类型、范围或置信度阈值后查看。</td></tr></tbody></table></div>
      <div class="fusion-results-foot"><span>候选关系仅在审核通过后纳入本地知识图谱。</span><button class="button secondary" @click="task?.resetTask()"><RotateCcw :size="14"/>重新运行</button></div>
    </section>
  </div>
</template>
