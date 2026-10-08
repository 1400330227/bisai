<script setup>
import { onUnmounted, ref } from 'vue'
import { Activity, Check, RotateCcw } from 'lucide-vue-next'

const props = defineProps({
  title: { type: String, required: true },
  stages: { type: Array, required: true },
  logs: { type: Array, default: () => [] },
  result: { type: String, default: '处理完成，结果已就绪。' },
})
const emit = defineEmits(['complete', 'reset'])
const running = ref(false), done = ref(false), progress = ref(0), stageIndex = ref(0)
let timer, tick = 0
const currentStage = () => {
  if (props.stages.length < 2) return 0
  if (props.stages.length === 2) return progress.value < 58 ? 0 : 1
  return progress.value < 30 ? 0 : progress.value < 78 ? 1 : 2
}
const startTask = () => {
  clearInterval(timer)
  done.value = false; running.value = true; progress.value = 0; stageIndex.value = 0; tick = 0
  timer = setInterval(() => {
    tick += 1
    stageIndex.value = currentStage()
    const base = stageIndex.value === 0 ? 0.22 : stageIndex.value === 1 ? 0.13 : 0.20
    const fluctuation = tick % 17 < 5 ? 0.52 : tick % 11 < 3 ? 1.5 : 1
    progress.value = Math.min(100, progress.value + base * fluctuation)
    if (progress.value >= 100) {
      clearInterval(timer); running.value = false; done.value = true; emit('complete')
    }
  }, 1000)
}
const resetTask = () => {
  clearInterval(timer); running.value = false; done.value = false; progress.value = 0; stageIndex.value = 0; emit('reset')
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
      <div class="progress-meta"><strong>{{done ? '处理完成' : stages[stageIndex]}}</strong><span>{{done ? '已完成' : `预计剩余 ${Math.max(1, Math.ceil((100 - progress) * 0.10))} 分钟`}}</span></div>
      <div class="progress-track"><i :style="{width: `${progress}%`}"/></div>
      <div class="progress-numbers"><b>{{Math.floor(progress)}}%</b><span>{{done ? '任务已完成' : `正在执行第 ${stageIndex + 1} / ${stages.length} 阶段`}}</span></div>
      <div class="log-list">
        <div v-for="(log, index) in logs" :key="log" class="log-entry" :class="{dim: progress < log.threshold}">
          <span class="log-mark"><Check :size="12"/></span><span>{{log.text}}</span>
        </div>
      </div>
      <div v-if="done" class="result-callout"><Check :size="15"/><span><b>处理完成</b> · {{result}}</span></div>
    </div>
  </section>
</template>
