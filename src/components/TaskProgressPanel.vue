<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { Activity, BadgeCheck, Check, Circle, Clock3, FileSearch, Layers3, LoaderCircle, Network, RotateCcw, ScanText } from 'lucide-vue-next'

const props = defineProps({
  title: { type: String, required: true },
  stages: { type: Array, required: true },
  logs: { type: Array, default: () => [] },
  result: { type: String, default: '处理完成，结果已就绪。' },
  estimatedMinutes: { type: Number, default: 7 },
})
const emit = defineEmits(['complete', 'reset'])
const running = ref(false), done = ref(false), progress = ref(0), stageIndex = ref(0)
const activeLogIndex = computed(() => props.logs.findIndex(log => progress.value < log.threshold))
const stageIcons = [FileSearch, ScanText, Network, BadgeCheck]
const stageDescriptions = ['读取文件并识别文档、表格与图像格式', '抽取资源、区域、企业等核心实体', '建立实体关系并完成结果校验', '保存结构化结果并更新知识库']
const elapsedLabel = ref('00:00')
let timer, elapsedSeconds = 0, totalSeconds = 0
const currentStage = () => {
  if (props.stages.length < 2) return 0
  return Math.min(props.stages.length - 1, Math.floor(progress.value / 100 * props.stages.length))
}
const startTask = () => {
  clearInterval(timer)
  done.value = false; running.value = true; progress.value = 0; stageIndex.value = 0
  elapsedSeconds = 0; elapsedLabel.value = '00:00'; totalSeconds = Math.max(300, Math.min(600, Math.round(props.estimatedMinutes * 60)))
  timer = setInterval(() => {
    elapsedSeconds += 1
    elapsedLabel.value = `${String(Math.floor(elapsedSeconds / 60)).padStart(2,'0')}:${String(elapsedSeconds % 60).padStart(2,'0')}`
    const elapsedRatio = Math.min(1, elapsedSeconds / totalSeconds)
    // Scan quickly, spend most time on inference, then finish validation.
    const nextProgress = elapsedRatio < 0.2
      ? elapsedRatio / 0.2 * 18
      : elapsedRatio < 0.8
        ? 18 + (elapsedRatio - 0.2) / 0.6 * 54
        : 72 + (elapsedRatio - 0.8) / 0.2 * 28
    progress.value = Math.min(100, nextProgress)
    stageIndex.value = currentStage()
    if (elapsedSeconds >= totalSeconds) {
      clearInterval(timer); running.value = false; done.value = true; emit('complete')
    }
  }, 1000)
}
const resetTask = () => {
  clearInterval(timer); running.value = false; done.value = false; progress.value = 0; stageIndex.value = 0; elapsedSeconds = 0; elapsedLabel.value = '00:00'; totalSeconds = 0; emit('reset')
}
onUnmounted(() => clearInterval(timer))
defineExpose({ startTask, resetTask })
</script>

<template>
  <section class="panel progress-panel">
    <div class="panel-heading">
      <div><h2>任务进度</h2><p>{{title}}</p></div>
      <button class="icon-btn" @click="resetTask"><RotateCcw :size="16"/></button>
    </div>
    <div class="progress-overview"><div class="progress-overview-icon"><Activity :size="18"/></div><div><strong>{{running?'任务正在处理':done?'本次任务已完成':'抽取任务已就绪'}}</strong><span>{{running?stages[stageIndex]:done?result:'开始后可查看各阶段状态与处理日志'}}</span></div><span class="progress-state" :class="{running,done}">{{running?'处理中':done?'已完成':'待启动'}}</span></div>
    <div class="progress-stats"><div><Clock3 :size="14"/><span>已用时</span><b>{{elapsedLabel}}</b></div><div><Layers3 :size="14"/><span>处理阶段</span><b>{{running||done?`${Math.min(stageIndex+1,stages.length)} / ${stages.length}`:`0 / ${stages.length}`}}</b></div><div><Network :size="14"/><span>关系构建</span><b>{{done?'已完成':running?'进行中':'待开始'}}</b></div></div>
    <div class="progress-stage-list"><div v-for="(stage,index) in stages" :key="stage" class="progress-stage" :class="{active:running&&index===stageIndex,complete:done||progress>=((index+1)/stages.length)*100}"><span class="progress-stage-number">{{String(index+1).padStart(2,'0')}}</span><span class="progress-stage-icon"><LoaderCircle v-if="running&&index===stageIndex" :size="15" class="progress-spinner"/><Check v-else-if="done||progress>=((index+1)/stages.length)*100" :size="14"/><component v-else :is="stageIcons[index%stageIcons.length]" :size="14"/></span><span class="progress-stage-copy"><b>{{stage}}</b><small>{{stageDescriptions[index]||'整理并保存本阶段处理结果'}}</small></span><span class="progress-stage-state">{{done||progress>=((index+1)/stages.length)*100?'已完成':running&&index===stageIndex?'执行中':'等待中'}}</span></div></div>
    <div v-if="running || done" class="task-progress-content">
      <div class="progress-meta"><strong class="progress-current-task"><LoaderCircle v-if="running" :size="15" class="progress-spinner"/><Check v-else :size="15" class="progress-complete-icon"/>{{done ? '处理完成' : stages[stageIndex]}}</strong><span>{{done ? '已完成' : `预计剩余 ${Math.max(1, Math.ceil((totalSeconds - elapsedSeconds) / 60))} 分钟`}}</span></div>
      <div class="progress-track"><i :style="{width: `${progress}%`}"/></div>
      <div class="progress-numbers"><b>{{Math.floor(progress)}}%</b><span>{{done ? '任务已完成' : `正在执行第 ${stageIndex + 1} / ${stages.length} 阶段`}}</span></div>
      <div class="progress-log-heading"><FileSearch :size="14"/><strong>处理日志</strong><span>{{logs.length}} 个步骤</span></div><div class="log-list">
        <div v-for="(log, index) in logs" :key="log.threshold" class="log-entry" :class="{dim: !done && index !== activeLogIndex && progress < log.threshold, active: running && index === activeLogIndex, complete: done || progress >= log.threshold}">
          <span class="log-mark"><LoaderCircle v-if="running && index===activeLogIndex" :size="13" class="progress-spinner"/><Check v-else-if="done || progress>=log.threshold" :size="12"/><Circle v-else :size="10"/></span><span>{{done || progress>=log.threshold ? log.text : running && index===activeLogIndex ? (log.runningText || log.text) : (log.pendingText || log.text)}}</span>
        </div>
      </div>
      <div v-if="done" class="result-callout"><Check :size="15"/><span><b>处理完成</b> · {{result}}</span></div>
    </div>
  </section>
</template>
