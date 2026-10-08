import companiesCsv from './companies.csv?raw'
import resourceIndexCsv from './resource-demand-index.csv?raw'

function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1 }
      else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell); if (row.some(value => value.trim())) rows.push(row)
      row = []; cell = ''
    } else cell += char
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const resourceAliases = [
  ['铝土矿', /铝土/], ['铁矿石', /铁矿/], ['废钢', /废钢/], ['煤', /煤|焦炭|焦煤/],
  ['锰矿', /锰/], ['锡矿', /锡/], ['锌矿', /锌/], ['铅锑矿', /铅|锑/],
  ['铜精矿', /铜/], ['镍资源', /镍|MHP/i], ['钴资源', /钴/], ['锂资源', /锂/],
  ['磷矿', /磷矿/], ['硫磺', /硫磺|硫/], ['石灰石', /石灰石|石灰岩/],
  ['砂岩', /砂岩/], ['石英砂', /石英砂/], ['纯碱', /纯碱/], ['大理岩/方解石', /大理岩|方解石/],
  ['原油', /原油/], ['原盐', /原盐|海盐|卤水/], ['丙烷', /丙烷/], ['甘蔗', /甘蔗/],
  ['桉木/木片', /木片|木质原料|桉木|松木|阔叶木|杂木/], ['竹', /竹/], ['钢材', /钢材|钢板|钢/],
  ['氧化铝', /氧化铝/], ['氟化铝', /氟化铝/], ['铸铝', /铸铝/], ['铝', /铝/],
  ['天然气', /天然气/], ['橡胶', /橡胶/], ['电力', /^(电|电力|热力|汽)$/],
  ['取水', /^(取水|水|取水权)$/], ['阳极炭块', /阳极炭/],
  ['重晶石', /重晶石/], ['白云石', /白云石/], ['石膏', /石膏/],
  ['粘土', /粘土|黏土/], ['铁质校正料', /铁质校正料/], ['烧结矿/球团矿', /烧结矿|球团矿/],
  ['萤石', /萤石/], ['硫酸', /硫酸/], ['蔗渣燃料', /蔗渣/], ['双氧水', /双氧水/],
  ['烧碱', /烧碱/], ['甲醇', /甲醇/], ['尿素', /尿素/], ['石墨', /石墨/],
  ['磷酸铁', /磷酸铁/], ['电池材料', /电池材料/], ['生铁', /生铁/],
]
const normalizeResource = value => {
  const text = value.trim().replace(/[（(][^）)]*[）)]/g, '').replace(/未披露|（.*$/g, '').trim()
  if (!text || /海运|船运|水运|进钦州|码头|自有基地|主要来自|进口船/i.test(text)) return ''
  return resourceAliases.find(([, pattern]) => pattern.test(text))?.[0] || text
}
function splitTopLevel(value) {
  const parts = []
  let part = '', depth = 0
  for (const char of value) {
    if (char === '（' || char === '(') depth += 1
    if (char === '）' || char === ')') depth = Math.max(0, depth - 1)
    if (depth === 0 && /[、，,；;\/／]/.test(char)) {
      if (part.trim()) parts.push(part.trim())
      part = ''
    } else part += char
  }
  if (part.trim()) parts.push(part.trim())
  return parts
}
const splitNeeds = value => [...new Set(splitTopLevel(value).map(normalizeResource).filter(Boolean))]

// UTF-8 CSV files exported by spreadsheet apps often start with a BOM.
const rows = parseCsv(companiesCsv.replace(/^\uFEFF/, ''))
const companyHeader = rows.find(row => row[0] === '序号')
const header = new Map(companyHeader.map((name, index) => [name, index]))
const mainCompanies = rows.filter(row => /^\d+$/.test(row[0]?.trim() || '')).map(row => ({
  id: `company-${row[0]}`,
  name: row[header.get('企业名称')],
  industry: row[header.get('行业分组')],
  location: row[header.get('所在地')],
  intro: row[header.get('公司简介')],
  needs: splitNeeds(row[header.get('所需自然资源')] || ''),
  demand: row[header.get('需求量级')],
  certainty: row[header.get('需求确定性')],
  alternative: false,
}))
const alternativeHeaderIndex = rows.findIndex(row => row[0]?.startsWith('【备选】'))
const alternativeCompanies = rows.slice(alternativeHeaderIndex + 1).map((row, index) => {
  const description = row[2] || ''
  const needText = description.match(/所需：([^。；]+)/)?.[1] || ''
  return {
    id: `alternative-${index + 1}`,
    name: row[0],
    industry: '备选企业',
    location: row[1],
    intro: description,
    needs: splitNeeds(needText),
    demand: description.match(/所需：[^。；]+/)?.[0] || '需求量级待核实',
    certainty: description.match(/确定性：([^。；]+)/)?.[1] || '待核实',
    alternative: true,
  }
}).filter(company => company.name)

const resourceRows = parseCsv(resourceIndexCsv).slice(1).map(([resource, companyText, location, quantity]) => ({
  resource,
  companies: companyText,
  location,
  quantity,
})).filter(row => row.resource)

export const companies = [...mainCompanies, ...alternativeCompanies]
export const resourceIndex = resourceRows
export const resources = [...new Set(companies.flatMap(company => company.needs))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
export const findResourceInfo = resource => resourceIndex.find(item => {
  if (normalizeResource(item.resource) === resource || item.resource.includes(resource) || resource.includes(normalizeResource(item.resource))) return true
  return item.resource.split(/[、，,；;\/／]+/).some(term => {
    const normalized = normalizeResource(term)
    return normalized === resource || normalized.startsWith(resource) || resource.startsWith(normalized)
  })
})
