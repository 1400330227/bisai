<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { Activity, Check, Circle, LoaderCircle, RotateCcw } from 'lucide-vue-next'

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
let timer, elapsedSeconds = 0, totalSeconds = 0
const currentStage = () => {
  if (props.stages.length < 2) return 0
  return Math.min(props.stages.length - 1, Math.floor(progress.value / 100 * props.stages.length))
}
const startTask = () => {
  clearInterval(timer)
  done.value = false; running.value = true; progress.value = 0; stageIndex.value = 0
  elapsedSeconds = 0; totalSeconds = Math.max(300, Math.min(600, Math.round(props.estimatedMinutes * 60)))
  timer = setInterval(() => {
    elapsedSeconds += 1
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
  clearInterval(timer); running.value = false; done.value = false; progress.value = 0; stageIndex.value = 0; elapsedSeconds = 0; totalSeconds = 0; emit('reset')
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
    <div v-if="!running && !done" class="empty-progress">
      <div class="empty-icon"><Activity :size="27"/></div>
      <strong>等待开始</strong>
      <span>启动任务后，这里将显示实时进度与预计剩余时间。</span>
    </div>
    <div v-else class="task-progress-content">
      <div class="progress-meta"><strong class="progress-current-task"><LoaderCircle v-if="running" :size="15" class="progress-spinner"/><Check v-else :size="15" class="progress-complete-icon"/>{{done ? '处理完成' : stages[stageIndex]}}</strong><span>{{done ? '已完成' : `预计剩余 ${Math.max(1, Math.ceil((totalSeconds - elapsedSeconds) / 60))} 分钟`}}</span></div>
      <div class="progress-track"><i :style="{width: `${progress}%`}"/></div>
      <div class="progress-numbers"><b>{{Math.floor(progress)}}%</b><span>{{done ? '任务已完成' : `正在执行第 ${stageIndex + 1} / ${stages.length} 阶段`}}</span></div>
      <div class="log-list">
        <div v-for="(log, index) in logs" :key="log.threshold" class="log-entry" :class="{dim: !done && index !== activeLogIndex && progress < log.threshold, active: running && index === activeLogIndex, complete: done || progress >= log.threshold}">
          <span class="log-mark"><LoaderCircle v-if="running && index===activeLogIndex" :size="13" class="progress-spinner"/><Check v-else-if="done || progress>=log.threshold" :size="12"/><Circle v-else :size="10"/></span><span>{{done || progress>=log.threshold ? log.text : running && index===activeLogIndex ? (log.runningText || log.text) : (log.pendingText || log.text)}}</span>
        </div>
      </div>
      <div v-if="done" class="result-callout"><Check :size="15"/><span><b>处理完成</b> · {{result}}</span></div>
    </div>
  </section>
</template>
