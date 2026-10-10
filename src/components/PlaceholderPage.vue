<script setup>
import { computed, ref, watch } from 'vue'
import { Check, ChevronLeft, ChevronRight, Download, Eye, FileUp, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-vue-next'
import { companies } from '../data/supplyData'

const props = defineProps({ title: { type: String, required: true } })
const storageKey = computed(() => `resource-workspace:${props.title}`)
const rows = ref([]), query = ref(''), regionFilter = ref('全部地区'), statusFilter = ref('全部状态')
const currentPage = ref(1), pageSize = 10, modalOpen = ref(false), editingId = ref(null), selected = ref(null)
const importInput = ref(null), notice = ref('')
const form = ref(blankRecord())
function blankRecord() { return { name: '', category: '', location: '', companies: '', demand: '', status: '待完善', description: '' } }

const resourceRows = () => {
  const links = companies.flatMap(company => company.needs.map(resource => ({ resource, company })))
  const unique = [...new Set(links.map(link => link.resource))]
  return unique.map((resource, index) => {
    const matches = links.filter(link => link.resource === resource)
    return { id: `resource-${index}`, name: resource, category: categoryOf(resource), location: [...new Set(matches.map(item => item.company.location.split(/[（(]/)[0]))].join('、'), companies: matches.map(item => item.company.name).join('、'), demand: matches.map(item => item.company.demand).filter(Boolean).slice(0, 2).join('；'), status: matches.some(item => item.company.certainty === '高') ? '已核实' : '待核实', description: `${matches.length} 家企业列出该项需求` }
  })
}
function categoryOf(resource) {
  if (/矿|矿石|精矿/.test(resource)) return '矿产资源'
  if (/电|热力|煤|天然气|原油/.test(resource)) return '能源资源'
  if (/木|竹|甘蔗/.test(resource)) return '林业与农业资源'
  return '工业原料'
}
function baseRows() {
  if (props.title.includes('用户')) return [
    { id: 'u1', name: '管理员', category: '平台管理员', location: '广西', companies: '平台运营', demand: '管理员', status: '启用', description: '系统管理员账户' },
    { id: 'u2', name: '资源审核员', category: '审核人员', location: '广西', companies: '资源管理', demand: '审核员', status: '启用', description: '负责资源信息审核' },
    { id: 'u3', name: '企业用户', category: '企业账户', location: '广西及东盟', companies: '供需对接', demand: '普通用户', status: '启用', description: '维护企业需求信息' },
  ]
  if (props.title.includes('操作日志')) return [
    { id: 'l1', name: '资源目录查看', category: '资源管理', location: '广西', companies: '管理员', demand: '今天 09:42', status: '成功', description: '查看矿产资源目录' },
    { id: 'l2', name: '需求关系更新', category: '供需对接', location: '钦州', companies: '管理员', demand: '今天 09:18', status: '成功', description: '更新企业资源需求关系' },
    { id: 'l3', name: '知识图谱查询', category: '知识图谱', location: '广西及东盟', companies: '资源审核员', demand: '昨天 16:30', status: '成功', description: '筛选区域资源关系' },
  ]
  if (props.title.includes('设置')) return [
    { id: 's1', name: '默认区域', category: '显示设置', location: '广西及东盟', companies: '所有用户', demand: '', status: '启用', description: '工作台默认展示区域' },
    { id: 's2', name: '需求审核', category: '流程设置', location: '平台', companies: '资源审核员', demand: '', status: '启用', description: '企业需求提交后进入审核队列' },
    { id: 's3', name: '图谱关系提示', category: '图谱设置', location: '平台', companies: '所有用户', demand: '', status: '启用', description: '显示资源、地区和需求之间的关系' },
  ]
  if (props.title.includes('缺失')) return resourceRows().filter(row => row.status !== '已核实').map(row => ({ ...row, status: '待补充', description: `${row.description}；需补充资源所在地或需求量级` }))
  if (props.title.includes('区域') || props.title.includes('分布') || props.title.includes('地图') || props.title.includes('禀赋')) {
    const regions = [...new Set(companies.map(company => company.location.split(/[（(·]/)[0].trim()).filter(Boolean))]
    return regions.map((region, index) => {
      const group = companies.filter(company => company.location.includes(region))
      return { id: `region-${index}`, name: region, category: '区域资源与需求', location: region, companies: group.map(company => company.name).join('、'), demand: `${group.length} 家企业`, status: '已整理', description: [...new Set(group.flatMap(company => company.needs))].slice(0, 8).join('、') }
    })
  }
  return resourceRows()
}
function loadRows() {
  let stored = null
  try { stored = JSON.parse(localStorage.getItem(storageKey.value) || 'null') } catch { stored = null }
  rows.value = Array.isArray(stored) ? stored : baseRows()
  currentPage.value = 1; selected.value = null; notice.value = ''
}
function persist() {
  try { localStorage.setItem(storageKey.value, JSON.stringify(rows.value)) } catch { notice.value = '浏览器无法保存本地修改' }
}
watch(storageKey, loadRows, { immediate: true })

const isUserPage = computed(() => props.title.includes('用户'))
const isLogPage = computed(() => props.title.includes('日志'))
const isMapPage = computed(() => props.title.includes('区域') || props.title.includes('分布') || props.title.includes('地图') || props.title.includes('禀赋'))
const regionOptions = computed(() => ['全部地区', ...new Set(rows.value.map(row => row.location).filter(Boolean))])
const statusOptions = computed(() => ['全部状态', ...new Set(rows.value.map(row => row.status).filter(Boolean))])
const filteredRows = computed(() => rows.value.filter(row => {
  const text = Object.values(row).join(' ').toLowerCase()
  return (!query.value || text.includes(query.value.trim().toLowerCase())) && (regionFilter.value === '全部地区' || row.location === regionFilter.value) && (statusFilter.value === '全部状态' || row.status === statusFilter.value)
}))
const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)))
const pagedRows = computed(() => filteredRows.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
watch([query, regionFilter, statusFilter], () => { currentPage.value = 1 })
const pageHeading = computed(() => isMapPage.value ? '区域数据概览' : isUserPage.value ? '账户与权限' : isLogPage.value ? '操作记录' : '数据目录')
const columnHeadings = computed(() => isUserPage.value ? ['名称', '角色', '范围', '关联模块', '状态'] : isLogPage.value ? ['操作', '模块', '范围', '操作人', '时间'] : ['名称', '类别', '所在地 / 区域', '关联企业', '需求量级 / 状态'])
const openCreate = () => { editingId.value = null; form.value = blankRecord(); modalOpen.value = true }
const openEdit = row => { editingId.value = row.id; form.value = { ...row }; modalOpen.value = true }
const saveRecord = () => {
  const name = form.value.name.trim()
  if (!name) { notice.value = '请填写名称'; return }
  if (editingId.value) rows.value = rows.value.map(row => row.id === editingId.value ? { ...row, ...form.value } : row)
  else rows.value.unshift({ ...form.value, id: `local-${Date.now()}` })
  persist(); modalOpen.value = false; notice.value = editingId.value ? '修改已保存' : '记录已添加'
}
const deleteRecord = row => { rows.value = rows.value.filter(item => item.id !== row.id); if (selected.value?.id === row.id) selected.value = null; persist(); notice.value = '记录已删除' }
const setStatus = (row, status) => { rows.value = rows.value.map(item => item.id === row.id ? { ...item, status } : item); persist(); notice.value = `已更新为“${status}”` }
const refreshRows = () => { loadRows(); notice.value = '数据已刷新' }
function exportRows() {
  const keys = ['name', 'category', 'location', 'companies', 'demand', 'status', 'description']
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = ['名称,类别,所在地,关联企业,需求量级,状态,说明', ...filteredRows.value.map(row => keys.map(key => quote(row[key])).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = `${props.title}.csv`; link.click(); URL.revokeObjectURL(url)
}
function parseCsv(text) {
  const out = []; let row = [], cell = '', quote = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"' && quote && text[i + 1] === '"') { cell += '"'; i += 1 }
    else if (char === '"') quote = !quote
    else if (char === ',' && !quote) { row.push(cell); cell = '' }
    else if ((char === '\n' || char === '\r') && !quote) { if (char === '\r' && text[i + 1] === '\n') i += 1; row.push(cell); if (row.some(item => item.trim())) out.push(row); row = []; cell = '' }
    else cell += char
  }
  if (cell || row.length) { row.push(cell); out.push(row) }
  return out
}
async function importFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const text = (await file.text()).replace(/^\uFEFF/, '')
    const data = parseCsv(text), headers = data.shift().map(value => value.trim())
    const imported = data.map((values, index) => ({
      id: `import-${Date.now()}-${index}`, name: values[headers.findIndex(h => /名称|资源|企业/.test(h))] || values[0] || '',
      category: values[headers.findIndex(h => /类别|类型|行业/.test(h))] || '',
      location: values[headers.findIndex(h => /地区|所在地|区域/.test(h))] || '',
      companies: values[headers.findIndex(h => /企业|公司/.test(h))] || '',
      demand: values[headers.findIndex(h => /需求量|数量|规模/.test(h))] || '', status: '待核实', description: values.join(' · '),
    })).filter(row => row.name)
    rows.value.unshift(...imported); persist(); notice.value = `已导入 ${imported.length} 条记录`
  } catch { notice.value = '文件读取失败，请确认 CSV 格式' }
  event.target.value = ''
}
</script>

<template>
  <section class="panel workspace-data-page">
    <div class="workspace-page-heading"><div><span class="eyebrow">{{pageHeading}}</span><h2>{{title}}</h2><p>{{isMapPage ? '按区域查看关联资源与企业需求。' : '可检索、筛选、维护和导出当前页面数据。'}}</p></div><div class="workspace-page-actions"><button class="button secondary" @click="refreshRows"><RefreshCw :size="14"/>刷新</button><button class="button secondary" @click="exportRows"><Download :size="14"/>导出 CSV</button><button class="button secondary" @click="importInput?.click()"><FileUp :size="14"/>导入 CSV</button><input ref="importInput" class="hidden-file-input" type="file" accept=".csv,text/csv" @change="importFile"/><button class="button primary" @click="openCreate"><Plus :size="14"/>新增记录</button></div></div>
    <div class="workspace-filters"><label class="workspace-search"><Search :size="16"/><input v-model="query" placeholder="搜索名称、企业、资源或地区"/></label><select v-model="regionFilter" class="native-select"><option v-for="region in regionOptions" :key="region">{{region}}</option></select><select v-model="statusFilter" class="native-select"><option v-for="status in statusOptions" :key="status">{{status}}</option></select><span class="workspace-total">{{filteredRows.length}} 条记录</span></div>
    <div v-if="notice" class="workspace-notice"><span>{{notice}}</span><button @click="notice=''" aria-label="关闭"><X :size="14"/></button></div>
    <div class="table-wrap workspace-table-wrap"><table><thead><tr><th v-for="heading in columnHeadings" :key="heading">{{heading}}</th><th>操作</th></tr></thead><tbody><tr v-for="row in pagedRows" :key="row.id"><td><strong>{{row.name}}</strong><small class="workspace-secondary">{{row.description}}</small></td><td>{{row.category || '—'}}</td><td>{{row.location || '—'}}</td><td>{{row.companies || '—'}}</td><td><span :class="['workspace-status', {pending: /待/.test(row.status), good: /已核实|启用|成功/.test(row.status)}]">{{row.demand || row.status}}</span></td><td class="workspace-row-actions"><button class="icon-btn" title="详情" @click="selected=row"><Eye :size="15"/></button><button class="icon-btn" title="编辑" @click="openEdit(row)"><Pencil :size="15"/></button><button v-if="title.includes('审核') || title.includes('缺失')" class="icon-btn approve-action" title="标记完成" @click="setStatus(row, '已核实')"><Check :size="15"/></button><button class="icon-btn delete-action" title="删除" @click="deleteRecord(row)"><Trash2 :size="15"/></button></td></tr><tr v-if="!pagedRows.length"><td colspan="6" class="workspace-empty">没有符合条件的记录</td></tr></tbody></table></div>
    <div class="workspace-pagination"><span>第 {{currentPage}} / {{pageCount}} 页</span><div><button class="icon-btn" :disabled="currentPage<=1" @click="currentPage--"><ChevronLeft :size="16"/></button><button class="icon-btn" :disabled="currentPage>=pageCount" @click="currentPage++"><ChevronRight :size="16"/></button></div></div>
    <aside v-if="selected" class="workspace-detail"><div><strong>{{selected.name}}</strong><button class="icon-btn" @click="selected=null"><X :size="15"/></button></div><p>{{selected.description || '暂无说明'}}</p><dl><dt>类别</dt><dd>{{selected.category || '—'}}</dd><dt>所在地</dt><dd>{{selected.location || '—'}}</dd><dt>关联企业</dt><dd>{{selected.companies || '—'}}</dd><dt>需求量级</dt><dd>{{selected.demand || '—'}}</dd><dt>状态</dt><dd>{{selected.status || '—'}}</dd></dl></aside>
  </section>
  <div v-if="modalOpen" class="workspace-modal-backdrop" @click.self="modalOpen=false"><form class="workspace-modal" @submit.prevent="saveRecord"><div class="workspace-modal-heading"><h2>{{editingId ? '编辑记录' : '新增记录'}}</h2><button type="button" class="icon-btn" @click="modalOpen=false"><X :size="16"/></button></div><label>名称<input v-model="form.name" required maxlength="100"/></label><label>类别<input v-model="form.category"/></label><label>所在地 / 区域<input v-model="form.location"/></label><label>关联企业<input v-model="form.companies"/></label><label>需求量级 / 状态<input v-model="form.demand"/></label><label>状态<input v-model="form.status"/></label><label>说明<textarea v-model="form.description" rows="3"/></label><div class="workspace-modal-actions"><button type="button" class="button secondary" @click="modalOpen=false">取消</button><button type="submit" class="button primary">保存</button></div></form></div>
</template>
