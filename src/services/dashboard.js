// 东盟资源库数据服务。
// 当前返回本地演示数据；接入真实后端时，把各函数替换为 HTTP 请求（保持 res.data 结构），组件无需改动。
const respond = data => new Promise(resolve => setTimeout(() => resolve({ data }), 250))

const corpusOverview = [{
  totalCapacityGb: '12,800',
  totalTextFiles: 128600, textFilesPercentage: 54,
  totalAudioFiles: 42300, audioFilesPercentage: 21,
  totalVideoFiles: 18750, videoFilesPercentage: 15,
  totalImageFiles: 26480, imageFilesPercentage: 10,
}]

const collegeOverview = [
  { college: '外国语学院', corpusCount: 132, totalCapacityGb: 1280 },
  { college: '文学院', corpusCount: 98, totalCapacityGb: 960 },
  { college: '新闻与传播学院', corpusCount: 86, totalCapacityGb: 840 },
  { college: '国际学院', corpusCount: 74, totalCapacityGb: 760 },
  { college: '东盟研究院', corpusCount: 70, totalCapacityGb: 720 },
  { college: '法学院', corpusCount: 55, totalCapacityGb: 560 },
  { college: '商学院', corpusCount: 48, totalCapacityGb: 480 },
  { college: '教育学院', corpusCount: 36, totalCapacityGb: 360 },
]

const contributorAnalysis = [
  { contributorName: '陈明远', corpusCount: 46, totalCapacityGb: 420 },
  { contributorName: '李思颖', corpusCount: 41, totalCapacityGb: 386 },
  { contributorName: '黄俊杰', corpusCount: 38, totalCapacityGb: 342 },
  { contributorName: '梁晓雯', corpusCount: 34, totalCapacityGb: 315 },
  { contributorName: '刘文博', corpusCount: 31, totalCapacityGb: 288 },
  { contributorName: '王晓婷', corpusCount: 29, totalCapacityGb: 260 },
  { contributorName: '赵子轩', corpusCount: 26, totalCapacityGb: 241 },
  { contributorName: '周雅琴', corpusCount: 24, totalCapacityGb: 218 },
  { contributorName: '吴国强', corpusCount: 22, totalCapacityGb: 197 },
  { contributorName: '郑海琳', corpusCount: 20, totalCapacityGb: 176 },
  { contributorName: '孙浩然', corpusCount: 18, totalCapacityGb: 158 },
  { contributorName: '林静怡', corpusCount: 16, totalCapacityGb: 139 },
  { contributorName: '何志远', corpusCount: 14, totalCapacityGb: 121 },
  { contributorName: '郭佳琪', corpusCount: 12, totalCapacityGb: 104 },
  { contributorName: '罗建华', corpusCount: 11, totalCapacityGb: 92 },
]

const domainOverview = [
  { domain: '新闻报刊', totalCapacityGb: 2680 },
  { domain: '政府公文', totalCapacityGb: 2140 },
  { domain: '法律法条', totalCapacityGb: 1890 },
  { domain: '社交媒体', totalCapacityGb: 1560 },
  { domain: '学术论文', totalCapacityGb: 1340 },
  { domain: '教材教辅', totalCapacityGb: 1120 },
  { domain: '影视字幕', totalCapacityGb: 890 },
  { domain: '电商评论', totalCapacityGb: 720 },
  { domain: '演讲访谈', totalCapacityGb: 560 },
  { domain: '医疗文本', totalCapacityGb: 430 },
]

const countryDistribution = [
  { country: '越南', corpusCount: 86, totalCapacityGb: 3120, fileCount: 45200 },
  { country: '泰国', corpusCount: 64, totalCapacityGb: 2380, fileCount: 36100 },
  { country: '印度尼西亚', corpusCount: 58, totalCapacityGb: 2210, fileCount: 34800 },
  { country: '马来西亚', corpusCount: 47, totalCapacityGb: 1760, fileCount: 27400 },
  { country: '菲律宾', corpusCount: 38, totalCapacityGb: 1290, fileCount: 19600 },
  { country: '新加坡', corpusCount: 35, totalCapacityGb: 1140, fileCount: 17800 },
  { country: '柬埔寨', corpusCount: 26, totalCapacityGb: 830, fileCount: 12100 },
  { country: '老挝', corpusCount: 24, totalCapacityGb: 760, fileCount: 10900 },
  { country: '缅甸', corpusCount: 19, totalCapacityGb: 590, fileCount: 8600 },
  { country: '文莱', corpusCount: 8, totalCapacityGb: 210, fileCount: 3200 },
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
const timeSeriesAnalysis = Array.from({ length: 30 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - index))
  const pad = value => String(value).padStart(2, '0')
  const wave = Math.sin(index / 4.6) * 8 + Math.cos(index / 2.9) * 5
  return {
    contributionDate: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    dailyCorpusAdded: Math.max(1, Math.round(10 + wave)),
    dailyFilesAdded: Math.max(12, Math.round(140 + wave * 9 + index * 1.6)),
    dailyCapacityAdded: Math.max(6, Math.round(62 + wave * 2.4 + index)),
  }
})

export function getCorpusOverview() { return respond(corpusOverview) }
export function getCollegeOverview() { return respond(collegeOverview) }
export function getContributorAnalysis() { return respond(contributorAnalysis) }
export function getDomainOverview() { return respond(domainOverview) }
export function getCountryDistribution() { return respond(countryDistribution) }
export function getRecentUploads() { return respond(recentUploads) }
export function getTimeSeriesAnalysis() { return respond(timeSeriesAnalysis) }
