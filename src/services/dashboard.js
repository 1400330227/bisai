// 东盟资源库数据服务。
// 当前返回本地演示数据；接入真实后端时，把各函数替换为 HTTP 请求（保持 res.data 结构），组件无需改动。
const respond = data => new Promise(resolve => setTimeout(() => resolve({ data }), 250))

// 语料库总容量 2476GB：文本 1436GB(58%) · 音频 545GB(22%) · 视频 297GB(12%) · 图像 198GB(8%)
const corpusOverview = [{
  totalCapacityGb: '2476',
  totalTextFiles: 62100, textFilesPercentage: 58,
  totalAudioFiles: 18400, audioFilesPercentage: 22,
  totalVideoFiles: 5300, videoFilesPercentage: 12,
  totalImageFiles: 9600, imageFilesPercentage: 8,
}]

// 各学院贡献占比：8 个学院合计 2476GB（占满全库）
const collegeOverview = [
  { college: '外国语学院', corpusCount: 86, totalCapacityGb: 562 },
  { college: '文学院', corpusCount: 64, totalCapacityGb: 428 },
  { college: '新闻与传播学院', corpusCount: 52, totalCapacityGb: 376 },
  { college: '国际学院', corpusCount: 47, totalCapacityGb: 338 },
  { college: '东盟研究院', corpusCount: 42, totalCapacityGb: 305 },
  { college: '法学院', corpusCount: 30, totalCapacityGb: 214 },
  { college: '商学院', corpusCount: 21, totalCapacityGb: 152 },
  { college: '教育学院', corpusCount: 14, totalCapacityGb: 101 },
]

// 贡献者 TOP 15：容量合计 1273GB（约占全库一半）
const contributorAnalysis = [
  { contributorName: '陈明远', corpusCount: 34, totalCapacityGb: 186 },
  { contributorName: '李思颖', corpusCount: 30, totalCapacityGb: 162 },
  { contributorName: '黄俊杰', corpusCount: 27, totalCapacityGb: 143 },
  { contributorName: '梁晓雯', corpusCount: 24, totalCapacityGb: 128 },
  { contributorName: '刘文博', corpusCount: 21, totalCapacityGb: 112 },
  { contributorName: '王晓婷', corpusCount: 18, totalCapacityGb: 97 },
  { contributorName: '赵子轩', corpusCount: 16, totalCapacityGb: 86 },
  { contributorName: '周雅琴', corpusCount: 14, totalCapacityGb: 74 },
  { contributorName: '吴国强', corpusCount: 12, totalCapacityGb: 63 },
  { contributorName: '郑海琳', corpusCount: 10, totalCapacityGb: 54 },
  { contributorName: '孙浩然', corpusCount: 9, totalCapacityGb: 47 },
  { contributorName: '林静怡', corpusCount: 8, totalCapacityGb: 40 },
  { contributorName: '何志远', corpusCount: 7, totalCapacityGb: 33 },
  { contributorName: '郭佳琪', corpusCount: 6, totalCapacityGb: 27 },
  { contributorName: '罗建华', corpusCount: 5, totalCapacityGb: 21 },
]

// 领域 TOP 10：容量合计 2190GB（占全库约 88%，其余为长尾领域）
const domainOverview = [
  { domain: '新闻报刊', totalCapacityGb: 460 },
  { domain: '政府公文', totalCapacityGb: 390 },
  { domain: '法律法条', totalCapacityGb: 340 },
  { domain: '社交媒体', totalCapacityGb: 285 },
  { domain: '学术论文', totalCapacityGb: 235 },
  { domain: '教材教辅', totalCapacityGb: 185 },
  { domain: '影视字幕', totalCapacityGb: 115 },
  { domain: '电商评论', totalCapacityGb: 90 },
  { domain: '演讲访谈', totalCapacityGb: 55 },
  { domain: '医疗文本', totalCapacityGb: 35 },
]

// 语料库国家分类：10 国容量合计 2476GB，文件数量合计约 8.8 万份（均非 0）
const countryDistribution = [
  { country: '越南', corpusCount: 86, totalCapacityGb: 682, filesCount: 26200 },
  { country: '泰国', corpusCount: 64, totalCapacityGb: 436, filesCount: 14800 },
  { country: '印度尼西亚', corpusCount: 58, totalCapacityGb: 398, filesCount: 13100 },
  { country: '马来西亚', corpusCount: 47, totalCapacityGb: 286, filesCount: 9600 },
  { country: '菲律宾', corpusCount: 38, totalCapacityGb: 198, filesCount: 6800 },
  { country: '新加坡', corpusCount: 35, totalCapacityGb: 172, filesCount: 5900 },
  { country: '柬埔寨', corpusCount: 26, totalCapacityGb: 112, filesCount: 4200 },
  { country: '老挝', corpusCount: 24, totalCapacityGb: 94, filesCount: 3600 },
  { country: '缅甸', corpusCount: 19, totalCapacityGb: 62, filesCount: 2400 },
  { country: '文莱', corpusCount: 8, totalCapacityGb: 36, filesCount: 1400 },
]

const corpusNames = ['越南语新闻语料集', '泰语政府公文语料集', '印尼语社交媒体语料集', '马来语法律文本语料集', '越南语影视字幕语料集', '泰语教材教辅语料集', '菲律宾语新闻语料集', '老挝语演讲访谈语料集', '缅甸语电商评论语料集', '柬埔寨语法律文本语料集']

const recentUploads = contributorAnalysis.slice(0, 10).map((item, index) => {
  const date = new Date()
  date.setDate(date.getDate() - index)
  date.setHours(9 + (index * 2) % 9, (index * 17) % 60, 0, 0)
  const pad = value => String(value).padStart(2, '0')
  return {
    id: index + 1,
    contributorName: item.contributorName,
    contributorCollege: collegeOverview[index % collegeOverview.length].college,
    corpusName: corpusNames[index],
    uploadTime: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
})

// 生成最近 30 天的收集趋势（确定性伪数据，避免每次刷新都变化）
// 30 天合计约 180GB / 1.4 万文件，相对 2476GB 全库为合理增量
const timeSeriesAnalysis = Array.from({ length: 30 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - index))
  const pad = value => String(value).padStart(2, '0')
  const wave = Math.sin(index / 4.6) * 1.8 + Math.cos(index / 2.9) * 1.2
  return {
    contributionDate: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    dailyCorpusAdded: Math.max(1, Math.round(2.2 + wave * 0.5)),
    dailyFilesAdded: Math.max(80, Math.round(420 + wave * 90 + index * 6)),
    dailyCapacityAdded: Math.max(2, Math.round(5.5 + wave * 1.6 + index * 0.05)),
  }
})

export function getCorpusOverview() { return respond(corpusOverview) }
export function getCollegeOverview() { return respond(collegeOverview) }
export function getContributorAnalysis() { return respond(contributorAnalysis) }
export function getDomainOverview() { return respond(domainOverview) }
export function getCountryDistribution() { return respond(countryDistribution) }
export function getRecentUploads() { return respond(recentUploads) }
export function getTimeSeriesAnalysis() { return respond(timeSeriesAnalysis) }
