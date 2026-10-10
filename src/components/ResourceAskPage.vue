<script setup>
// 「供需智能对接 → 资源需求智能问答」
// 输入企业简介 / 资源需求 → 走一遍模拟检索 → 给出可能需要的矿产与自然资源
import { ref, computed, nextTick } from 'vue'
import {
  Send, Sparkles, Layers3, MapPin, Check, Loader2, AlertCircle, RotateCcw, Database, FileUp,
  FileText, X,
} from 'lucide-vue-next'
import { runMatch, EXAMPLES } from '../utils/resourceMatcher.js'
import ResourceMap from './ResourceMap.vue'

const STEPS = [
  '解析企业画像与工艺关键词',
  '匹配行业分组与资源需求库',
  '交叉核对需求量级与确定性',
  '汇总推荐资源清单',
]

const messages = ref([])        // { role:'user'|'bot', text?, file?, result?, pending?, steps:[] }
const draft = ref('')
const busy = ref(false)
const threadEl = ref(null)
const fileInput = ref(null)
// 上传的文件先挂在输入框里，**点提交才分析**；之后的分析都用这份文件
const pendingFile = ref(null)   // { name, size, text, hint }

const canSend = computed(() => (draft.value.trim().length > 0 || !!pendingFile.value) && !busy.value)

const wait = ms => new Promise(r => setTimeout(r, ms))

function fmtSize(n) {
  if (n == null) return ''
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(2) + ' KB'
  return (n / 1024 / 1024).toFixed(2) + ' MB'
}

/* 上传文档：只把文件挂到输入框上，不立即分析（纯 UI 演示，没有真实的大模型调用）
   txt/md/csv 直接读文本；doc/docx/pdf 这类二进制文档只取文件名 */
const TEXT_EXT = /\.(txt|md|csv|json|log)$/i
async function onFile(e) {
  const f = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!f) return
  const size = fmtSize(f.size)
  if (TEXT_EXT.test(f.name)) {
    const content = await f.text()
    pendingFile.value = { name: f.name, size, text: content.slice(0, 3000), hint: '' }
  } else {
    pendingFile.value = { name: f.name, size, text: f.name, hint: '二进制文档，以文件名识别' }
  }
}
function pickFile() { if (!busy.value && fileInput.value) fileInput.value.click() }
function removeFile() { if (!busy.value) pendingFile.value = null }

/* 供给侧文案：广西 / 东盟 各自的合计与最大来源地。
   某一侧没有记录时明确说出来，避免被误读成"那边没有这个资源"。 */
function supplyText(s) {
  if (!s) return ''
  const f = x => Number(x).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
  const parts = []
  if (s.gxTotal != null) parts.push('广西 ' + f(s.gxTotal) + ' ' + s.unit + (s.gx[0] ? '（' + s.gx[0].n + '）' : ''))
  if (s.aseanTotal != null) parts.push('东盟 ' + f(s.aseanTotal) + ' ' + s.unit + (s.asean[0] ? '（' + s.asean[0].n + '最大）' : ''))
  if (!parts.length) return '这份公开数据里暂无可比记录'
  if (s.gxTotal == null) parts.push('（这份表未收录广西口径）')
  if (s.aseanTotal == null) parts.push('（这份表未收录东盟口径）')
  return parts.join(' · ')
}

async function scrollBottom() {
  await nextTick()
  if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
}

async function submit(text) {
  const typed = (text ?? draft.value).trim()
  const file = pendingFile.value
  if ((!typed && !file) || busy.value) return
  busy.value = true
  // 挂了文件时，分析一律基于文件内容 —— 输入的文字照常显示在气泡里，但不参与分析（UI 演示）
  const analyze = file ? file.text : typed
  draft.value = ''
  messages.value.push({ role: 'user', text: typed, file: file ? file.name : null, fromFile: file ? file.name : null })
  messages.value.push({ role: 'bot', pending: true, steps: STEPS.map(s => ({ label: s, done: false })) })
  // 注意：必须从数组里取回响应式代理再改。直接改上面那个字面量对象，
  // 改的是原始 target，不会触发依赖更新，进度条会永远停在第一步。
  const bot = messages.value[messages.value.length - 1]
  await scrollBottom()

  // 进度动画：总时长随机 2-3 秒，四步依次点亮，每步停留时间再抖一点
  const total = 2000 + Math.random() * 1000
  const base = total / STEPS.length
  for (let i = 0; i < STEPS.length; i++) {
    await wait(Math.round(base * (0.7 + Math.random() * 0.6)))
    bot.steps[i].done = true
    await scrollBottom()
  }

  bot.result = runMatch(analyze)
  bot.basedOnFile = file ? file.name : null
  bot.pending = false
  busy.value = false
  await scrollBottom()
}

function reset() {
  messages.value = []
  draft.value = ''
  busy.value = false
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    submit()
  }
}
</script>

<template>
  <div class="ask">
    <input ref="fileInput" type="file" class="sr-only"
           accept=".txt,.md,.csv,.json,.log,.doc,.docx,.pdf" @change="onFile" />
    <!-- 空态：居中欢迎 + 输入框 -->
    <div v-if="!messages.length" class="hero">
      <div class="hero-badge"><MapPin :size="15" />广西 · 东盟资源协同</div>
      <h2><Sparkles :size="22" />你好，有什么我能帮你的吗？</h2>
      <p class="hero-sub">
        描述你的公司或资源需求，我会从 <b>41 家企业档案</b> 与 <b>19 条资源需求反向索引</b>
        里找出你可能需要的矿产与自然资源。
      </p>

      <div class="composer hero-composer">
        <!-- 上传的文件先挂在这里，点发送才分析 -->
        <div v-if="pendingFile" class="attached">
          <div class="att-icon"><FileText :size="18" /></div>
          <div class="att-info">
            <strong :title="pendingFile.name">{{ pendingFile.name }}</strong>
            <span>{{ pendingFile.size }}<template v-if="pendingFile.hint"> · {{ pendingFile.hint }}</template></span>
          </div>
          <button class="att-del" type="button" title="移除附件" @click="removeFile"><X :size="14" /></button>
        </div>
        <textarea
          v-model="draft"
          rows="2"
          placeholder="给 资源助手 发送消息，例如：我们做铝型材加工，主要缺什么原料？"
          @keydown="onKeydown"
        ></textarea>
        <div class="composer-foot">
          <button class="chip as-btn" type="button" title="上传公司简介文档（txt / md / csv / docx / pdf）" @click="pickFile">
            <FileUp :size="13" />上传文档
          </button>
          <span class="chip"><Database :size="13" />企业档案 41 家</span>
          <span class="chip"><Layers3 :size="13" />资源索引 19 类</span>
          <button class="send" :disabled="!canSend" title="发送" @click="submit()">
            <Send :size="16" />
          </button>
        </div>
      </div>

      <div class="examples">
        <button v-for="ex in EXAMPLES" :key="ex.text" class="example" @click="submit(ex.text)">
          <i>{{ ex.icon }}</i>{{ ex.text }}
        </button>
      </div>
    </div>

    <!-- 会话态 -->
    <div v-else class="chat">
      <div ref="threadEl" class="thread">
        <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
          <div v-if="m.role === 'user'" class="bubble user-bubble">
            <span v-if="m.file" class="file-chip"><FileUp :size="12" />{{ m.file }}</span>
            <span class="user-text">{{ m.text }}</span>
            <div v-if="m.fromFile" class="file-based">本次分析基于已上传的「{{ m.fromFile }}」</div>
          </div>

          <div v-else class="bubble bot-bubble">
            <!-- 检索进度 -->
            <div v-if="m.pending" class="progress">
              <div class="progress-head"><Loader2 class="spin" :size="15" />正在检索…</div>
              <ul>
                <li v-for="(s, si) in m.steps" :key="si" :class="{ done: s.done, active: !s.done && (si === 0 || m.steps[si - 1].done) }">
                  <Check v-if="s.done" :size="13" />
                  <Loader2 v-else-if="si === 0 || m.steps[si - 1].done" class="spin" :size="13" />
                  <span v-else class="dot"></span>
                  {{ s.label }}
                </li>
              </ul>
            </div>

            <!-- 结果 -->
            <template v-else>
              <div v-if="!m.result.ok" class="empty-result">
                <AlertCircle :size="15" />
                <div>
                  <strong>没能识别到具体的资源或行业关键词。</strong>
                  <p>试着写得更具体些，比如提到行业（铝加工 / 水泥 / 钢铁 / 锂电 / 造纸 / 制糖）或原料（铝土矿、石灰石、木片、甘蔗……）。</p>
                </div>
              </div>

              <template v-else>
                <div class="terms">
                  <span class="terms-label">识别到的关键词</span>
                  <span v-for="t in m.result.terms" :key="t.k" class="term">{{ t.k }}</span>
                </div>

                <h3 class="sec-h">可能需要的资源</h3>
                <div class="res-list">
                  <div v-for="(r, ri) in m.result.resources" :key="r.name" class="res-row">
                    <span class="res-rank" :class="'r' + (ri + 1)">{{ ri + 1 }}</span>
                    <div class="res-main">
                      <div class="res-name">
                        {{ r.name }}
                        <small v-if="r.df >= 12" title="多数企业都有此项需求">普遍需求</small>
                      </div>
                      <div class="res-rel">关联 {{ r.enterprises.length }} 家企业：{{ r.enterprises.join('、') }}</div>
                      <div v-if="r.evidence" class="res-evi">
                        需求侧参考：{{ r.evidence.companies }} —— {{ r.evidence.scale }}
                      </div>
                      <div v-if="r.supply" class="res-sup">
                        <span class="sup-tag">供给</span>{{ supplyText(r.supply) || '这份公开数据里暂无可比记录' }}
                      </div>
                    </div>
                  </div>
                </div>

                <ResourceMap :items="m.result.enterprises" />

                <h3 class="sec-h">同类企业参考 <small>（{{ m.result.pool.matched }} 家高度相关）</small></h3>
                <div class="ent-list">
                  <div v-for="(e, ei) in m.result.enterprises" :key="e.name" class="ent-row">
                    <div class="ent-top">
                      <span class="ent-idx">{{ ei + 1 }}</span>
                      <strong>{{ e.name }}</strong>
                      <span class="ent-cert" :class="e.certainty.startsWith('高') ? 'hi' : 'mid'">确定性 {{ e.certainty.split('（')[0] }}</span>
                    </div>
                    <div class="ent-meta">{{ e.group }} · {{ e.place }}</div>
                    <div class="ent-needs">{{ e.needs.join('、') }}</div>
                    <div class="ent-scale">{{ e.scale }}</div>
                  </div>
                </div>

                <p class="disclaimer">
                  依据 {{ m.result.pool.enterprises }} 家企业档案与 {{ m.result.pool.resources }} 条资源需求反向索引匹配，
                  仅作供需线索参考，实际采购以企业公开披露与商务尽调为准。
                </p>
              </template>
            </template>
          </div>
        </div>
      </div>

      <div class="composer docked">
        <div v-if="pendingFile" class="attached">
          <div class="att-icon"><FileText :size="18" /></div>
          <div class="att-info">
            <strong :title="pendingFile.name">{{ pendingFile.name }}</strong>
            <span>{{ pendingFile.size }}<template v-if="pendingFile.hint"> · {{ pendingFile.hint }}</template></span>
          </div>
          <button class="att-del" type="button" title="移除附件" @click="removeFile"><X :size="14" /></button>
        </div>
        <textarea
          v-model="draft"
          rows="1"
          placeholder="继续提问，或换一家企业再试…"
          @keydown="onKeydown"
        ></textarea>
        <div class="composer-foot">
          <button class="ghost" title="清空对话" @click="reset"><RotateCcw :size="13" />重新开始</button>
          <button class="chip as-btn" type="button" title="上传公司简介文档" @click="pickFile"><FileUp :size="13" /></button>
          <button class="send" :disabled="!canSend" title="发送" @click="submit()"><Send :size="16" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ask { display: flex; flex-direction: column; min-height: calc(100vh - 250px); }

/* ---------- 空态 ---------- */
.hero { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0 30px; text-align: center; }
.hero-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #698074; background: #f2f6f4; border: 1px solid #e6ece8; padding: 5px 12px; border-radius: 999px; }
.hero h2 { display: flex; align-items: center; gap: 10px; margin: 18px 0 0; font-size: 25px; font-weight: 600; letter-spacing: -.5px; color: #25352f; }
.hero h2 svg { color: #4b8a6b; }
.hero-sub { margin: 10px 0 26px; font-size: 12.5px; color: #84908a; line-height: 1.7; max-width: 560px; }
.hero-sub b { color: #4f6b5e; font-weight: 600; }

/* ---------- 输入框 ---------- */
.composer { background: #fff; border: 1px solid #e4eae7; border-radius: 16px; padding: 12px 14px 10px; box-shadow: 0 6px 24px -10px rgba(36, 53, 46, .18); }
.hero-composer { width: min(680px, 100%); }
.composer textarea { width: 100%; border: 0; outline: none; resize: none; font: inherit; font-size: 13px; line-height: 1.6; color: #26353b; background: transparent; max-height: 130px; }
.composer textarea::placeholder { color: #a3ada8; }
.composer-foot { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: #7b8982; background: #f6f8f7; border: 1px solid #eef1ef; padding: 4px 9px; border-radius: 999px; }
.chip.as-btn { cursor: pointer; font-family: inherit; transition: .18s; }
.chip.as-btn:hover { background: #eef5f1; border-color: #d5e4db; color: #376a4d; }
/* 挂在输入框里的附件卡片（上传后、提交前） */
.attached { display: flex; align-items: center; gap: 9px; padding: 8px 10px; margin-bottom: 9px; background: #f7f9f8; border: 1px solid #eaf0ec; border-radius: 10px; text-align: left; }
.att-icon { flex: none; width: 32px; height: 32px; border-radius: 8px; background: #e8f0fb; color: #2f6f9c; display: grid; place-items: center; }
.att-info { min-width: 0; flex: 1; }
.att-info strong { display: block; font-size: 12px; font-weight: 500; color: #2c3f36; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.att-info span { display: block; font-size: 10.5px; color: #9aa49f; margin-top: 1px; }
.att-del { flex: none; width: 22px; height: 22px; border: 0; border-radius: 6px; background: transparent; color: #9aa49f; display: grid; place-items: center; cursor: pointer; transition: .15s; }
.att-del:hover { background: #eef2f0; color: #5f6f68; }
.file-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; background: rgba(255, 255, 255, .18); border: 1px solid rgba(255, 255, 255, .3); padding: 2px 8px; border-radius: 999px; margin-right: 8px; vertical-align: 1px; }
.user-text { white-space: pre-wrap; word-break: break-word; }
.file-based { margin-top: 6px; padding-top: 5px; border-top: 1px solid rgba(255, 255, 255, .28); font-size: 10px; color: rgba(255, 255, 255, .82); }
.ent-idx { flex: none; width: 18px; height: 18px; border-radius: 5px; background: #2f6f52; color: #fff; font-size: 10px; font-weight: 700; display: grid; place-items: center; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.send { margin-left: auto; width: 34px; height: 34px; border: 0; border-radius: 50%; display: grid; place-items: center; background: #346f57; color: #fff; transition: .18s; }
.send:hover:not(:disabled) { background: #2c604b; }
.send:disabled { background: #dfe6e2; color: #a9b5af; cursor: default; }
.ghost { display: inline-flex; align-items: center; gap: 5px; border: 1px solid #e4eae7; background: #fff; color: #6c7a74; font-size: 11px; padding: 6px 11px; border-radius: 8px; }
.ghost:hover { background: #f7f9f8; }

/* ---------- 示例 ---------- */
.examples { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 20px; max-width: 700px; }
.example { display: inline-flex; align-items: center; gap: 7px; border: 1px solid #e7ecea; background: #fff; color: #5f6f68; font-size: 11.5px; padding: 8px 13px; border-radius: 999px; transition: .18s; }
.example:hover { border-color: #cfe0d6; background: #f4f9f6; color: #2f6349; }
.example i { font-style: normal; width: 18px; height: 18px; border-radius: 5px; background: #eaf2ee; color: #3d7a5c; display: grid; place-items: center; font-size: 10px; font-weight: 700; }

/* ---------- 会话 ---------- */
.chat { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.thread { flex: 1; overflow-y: auto; padding: 4px 2px 16px; display: flex; flex-direction: column; gap: 16px; }
.msg { display: flex; }
.msg.user { justify-content: flex-end; }
.bubble { max-width: 92%; border-radius: 14px; padding: 13px 16px; font-size: 12.5px; line-height: 1.7; }
.user-bubble { background: #346f57; color: #fff; border-bottom-right-radius: 5px; }
.bot-bubble { background: #fff; border: 1px solid #e9eeeb; box-shadow: 0 1px 2px #24352e05; width: 100%; }
.composer.docked { margin-top: 4px; }

/* ---------- 进度 ---------- */
.progress-head { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #3c6e59; font-weight: 600; }
.progress ul { list-style: none; margin: 11px 0 2px; padding: 0; }
.progress li { display: flex; align-items: center; gap: 9px; font-size: 11.5px; color: #a2aca7; padding: 4px 0; transition: color .3s; }
.progress li.active { color: #5c7b6c; }
.progress li.done { color: #43664f; }
.progress li svg { flex: none; }
.progress .dot { width: 13px; display: inline-flex; justify-content: center; color: #d3dbd6; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ---------- 结果 ---------- */
.terms { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 14px; }
.terms-label { font-size: 10.5px; color: #9aa49f; margin-right: 2px; }
.term { font-size: 11px; color: #35684f; background: #eef5f1; border: 1px solid #e0ebe5; padding: 3px 9px; border-radius: 999px; }
.sec-h { margin: 16px 0 9px; font-size: 12px; font-weight: 600; color: #34453e; }
.sec-h small { color: #9aa49f; font-weight: 400; }

.res-list { display: flex; flex-direction: column; gap: 8px; }
.res-row { display: flex; gap: 10px; padding: 10px 12px; border: 1px solid #eef1ef; border-radius: 10px; background: #fcfdfd; }
.res-rank { flex: none; width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; font-size: 10.5px; font-weight: 700; color: #fff; background: #b8c4bf; }
.res-rank.r1 { background: linear-gradient(135deg, #4f9c76, #2f6f52); }
.res-rank.r2 { background: linear-gradient(135deg, #7aa892, #4a8068); }
.res-rank.r3 { background: linear-gradient(135deg, #9dbcad, #6d9a84); }
.res-main { min-width: 0; }
.res-name { font-size: 12.5px; font-weight: 600; color: #2c3f36; }
.res-name small { margin-left: 6px; font-size: 9px; font-weight: 500; color: #a4a38a; background: #f7f5ec; border: 1px solid #eae6d6; padding: 1px 6px; border-radius: 999px; vertical-align: 1px; }
.res-rel { font-size: 11px; color: #7d8a85; margin-top: 4px; }
.res-evi { font-size: 10.5px; color: #8d9a94; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #eef1ef; line-height: 1.6; }
.res-sup { font-size: 10.5px; color: #4f7a63; margin-top: 5px; padding: 5px 8px; background: #f2f8f4; border-radius: 6px; line-height: 1.6; }
.sup-tag { display: inline-block; font-size: 9px; font-weight: 600; color: #fff; background: #4f9c76; padding: 1px 6px; border-radius: 4px; margin-right: 6px; vertical-align: 1px; }

.ent-list { display: flex; flex-direction: column; gap: 8px; }
.ent-row { padding: 10px 12px; border: 1px solid #eef1ef; border-radius: 10px; }
.ent-top { display: flex; align-items: center; gap: 8px; }
.ent-top strong { font-size: 12px; color: #2c3f36; font-weight: 600; }
.ent-cert { font-size: 9.5px; padding: 2px 7px; border-radius: 999px; }
.ent-cert.hi { color: #376a4d; background: #edf5f0; }
.ent-cert.mid { color: #8a7a52; background: #f8f5ec; }
.ent-meta { font-size: 10.5px; color: #98a29d; margin-top: 4px; }
.ent-needs { font-size: 11px; color: #5f7a6d; margin-top: 5px; }
.ent-scale { font-size: 10.5px; color: #8d9a94; margin-top: 4px; line-height: 1.6; }

.empty-result { display: flex; gap: 9px; color: #8a7a52; }
.empty-result strong { display: block; font-size: 12.5px; color: #6d6046; }
.empty-result p { margin: 5px 0 0; font-size: 11.5px; line-height: 1.7; color: #8d9a94; }
.disclaimer { margin: 14px 0 0; padding-top: 10px; border-top: 1px solid #f0f2f1; font-size: 10.5px; color: #9aa49f; line-height: 1.7; }
</style>
