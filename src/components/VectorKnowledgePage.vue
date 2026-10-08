<script setup>
import { ref } from 'vue'
import { Database, Play } from 'lucide-vue-next'
import TaskProgressPanel from './TaskProgressPanel.vue'
const task = ref(null)
const chunkSize = ref(800), overlapSize = ref(120), embeddingModel = ref('中文多语种文本向量模型')
const stages = ['文本切片', '向量嵌入', '索引构建']
const logs = [
  { text: '实体关系文本已切片', threshold: 18 },
  { text: '向量嵌入计算中', threshold: 48 },
  { text: '知识库索引已生成', threshold: 84 },
]
</script>

<template>
  <div class="process-layout corpus-step-layout">
    <section class="panel process-panel">
      <div class="panel-heading"><div><h2>向量知识库配置</h2><p>设置文本切片与向量索引参数</p></div></div>
      <div class="vector-summary"><div class="vector-icon"><Database :size="22"/></div><div><strong>广西—东盟资源知识库</strong><span>待处理语料：30 份 · 146 个实体 · 218 条关系</span></div></div>
      <div class="form-label">文本切片长度</div><div class="field-with-unit"><input v-model.number="chunkSize" class="text-input" type="number" min="100" max="4000"/><span>字符 / 片段</span></div>
      <div class="form-label">片段重叠长度</div><div class="field-with-unit"><input v-model.number="overlapSize" class="text-input" type="number" min="0" :max="Math.max(0,chunkSize-1)"/><span>字符</span></div>
      <div class="form-label">嵌入模型</div><select v-model="embeddingModel" class="native-select"><option>中文多语种文本向量模型</option><option>通用语义向量模型</option></select>
      <div class="intake-summary"><span>索引策略</span><b>文本向量 + 实体关系元数据</b></div>
      <div class="intake-summary"><span>当前配置</span><b>{{chunkSize}} / {{overlapSize}} 字符 · {{embeddingModel}}</b></div>
      <div class="run-foot"><span>预计耗时约 <b>12 分钟</b></span><button class="button primary" :disabled="chunkSize<100 || overlapSize<0 || overlapSize>=chunkSize" @click="task?.startTask()"><Play :size="14"/>构建知识库</button></div>
    </section>
    <TaskProgressPanel ref="task" title="向量知识库构建进度" :stages="stages" :logs="logs" result="向量索引已就绪，可执行语义检索与知识关联。"/>
  </div>
</template>
