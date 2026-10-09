<script setup>
import { computed, ref } from 'vue'
import { Check, Play, SlidersHorizontal } from 'lucide-vue-next'
import TaskProgressPanel from './TaskProgressPanel.vue'
import { estimateTaskMinutes, randomTaskBaseline } from '../utils/taskEstimate'
const task = ref(null), resolved = ref(false)
const rules = ref({ merge: true, aliases: true, relations: true, missing: true })
const threshold = ref(80)
const baselineMinutes = ref(randomTaskBaseline())
const estimatedMinutes = computed(() => estimateTaskMinutes(baselineMinutes.value, Math.ceil(Object.values(rules.value).filter(Boolean).length / 2) + (threshold.value < 70 ? 1 : 0)))
const stages = ['实体对齐', '关系校验', '可用性判断']
const logs = [
  { text: '已完成同名实体合并与别名归一', runningText: '正在合并同名实体并归一别名', pendingText: '待合并同名实体并归一别名', threshold: 20 },
  { text: '已完成关系类型与属性一致性校验', runningText: '正在校验关系类型与属性一致性', pendingText: '待校验关系类型与属性一致性', threshold: 55 },
  { text: '已完成语料可用性评估', runningText: '正在评估语料可用性', pendingText: '待评估语料可用性', threshold: 85 },
]
const startResolution = () => { baselineMinutes.value = randomTaskBaseline(); resolved.value = false; task.value?.startTask() }
const reset = () => { resolved.value = false }
</script>

<template>
  <div class="process-layout corpus-step-layout">
    <section class="panel process-panel">
      <div class="panel-heading"><div><h2>抽取结果消解</h2><p>对实体关系去重、校验并判断语料可用性</p></div></div>
      <div class="vector-summary"><div class="vector-icon"><SlidersHorizontal :size="22"/></div><div><strong>待消解数据</strong><span>146 个实体 · 218 条关系 · 30 份来源资料</span></div></div>
      <div class="form-label">消解规则</div>
      <div class="resolution-rules"><label><input v-model="rules.merge" type="checkbox"/> 同名实体合并</label><label><input v-model="rules.aliases" type="checkbox"/> 别名与简称归一</label><label><input v-model="rules.relations" type="checkbox"/> 关系类型校验</label><label><input v-model="rules.missing" type="checkbox"/> 缺失属性标记</label></div>
      <div class="form-label">可用性阈值</div><div class="field-with-unit"><input v-model.number="threshold" class="text-input" type="number" min="0" max="100"/><span>分及以上判为可用</span></div>
      <div class="intake-summary"><span>结果输出</span><b>消歧实体、关系质量与可用性标签</b></div>
      <div class="run-foot"><span>预计耗时约 <b>{{estimatedMinutes}} 分钟</b></span><button class="button primary" @click="startResolution"><Play :size="14"/>开始消解</button></div>
      <div v-if="resolved" class="resolution-result"><Check :size="17"/><span><b>可用语料 28 / 30 份</b><small>识别实体 146 个 · 有效关系 203 条 · 消歧准确率 93.2%</small></span></div>
    </section>
    <TaskProgressPanel ref="task" title="结果消解进度" :stages="stages" :logs="logs" :estimated-minutes="estimatedMinutes" result="可用语料与消解结果已生成。" @complete="resolved=true" @reset="reset"/>
  </div>
</template>
