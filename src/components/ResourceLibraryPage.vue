<template>
  <div class="dashboard-landing">
    <div class="fullscreen">
      <div class="loading" ref="loadingEl">
        <div class="loadbox"><span class="load-spin"></span> 页面加载中...</div>
      </div>
      <div class="head">
        <div class="weather"><span id="showTime">{{ showTime }}</span></div>
        <h1>东盟资源库</h1>
      </div>
      <div class="mainbox">
        <ul class="clearfix">
          <li>
            <div class="boxall" style="height:500px;">
              <div class="alltitle">领域数据 TOP 10</div>
              <div class="navboxall" id="echart5"></div>
            </div>
            <div class="boxall" style="height:420px;">
              <div class="alltitle">各学院贡献占比分析</div>
              <div class="navboxall" id="echart1"></div>
            </div>
          </li>
          <li>
            <div class="boxall" style="height:195px">
              <div class="clearfix navboxall" style="height: 100%">
                <div class="pulll_left num">
                  <div class="numbt">语料库总容量<span>(GB)</span></div>
                  <div class="numtxt">{{ corpusOverview.totalCapacity }} </div>
                </div>
                <div class="pulll_right zhibiao">
                  <div class="zb1"><span>文本数量</span>
                    <div id="zb1"></div>
                  </div>
                  <div class="zb2"><span>音频数量</span>
                    <div id="zb2"></div>
                  </div>
                  <div class="zb3"><span>视频数量</span>
                    <div id="zb3"></div>
                  </div>
                  <div class="zb4"><span>图像数量</span>
                    <div id="zb4"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="boxall" style="height:350px">
              <div class="alltitle">语料库贡献者 TOP 15</div>
              <div class="navboxall" id="echart4"></div>
            </div>
            <div class="boxall" style="height:360px">
              <div class="alltitle">语料收集趋势分析 (最近30天)</div>
              <div class="navboxall" id="echart3"></div>
            </div>
          </li>
          <li>
            <div class="boxall" style="height:430px">
              <div class="alltitle">语料库国家分类</div>
              <div class="navboxall">
                <table class="table1" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tbody>
                    <tr>
                      <th scope="col">排名</th>
                      <th scope="col">国家</th>
                      <th scope="col">语料集数量</th>
                      <th scope="col">语料容量(GB)</th>
                      <th scope="col">文件数量</th>
                    </tr>
                    <tr v-for="(row, index) in countryRows" :key="row.country">
                      <td><span>{{ index + 1 }}</span></td>
                      <td>{{ row.country }}</td>
                      <td>{{ row.corpusCount }}</td>
                      <td>{{ row.totalCapacityGb }}</td>
                      <td>{{ row.filesCount }}</td>
                    </tr>
                    <tr v-if="countryRows.length === 0">
                      <td colspan="5" style="text-align:center;color:#aaa;">暂无数据</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="boxall" style="height:490px;">
              <div class="alltitle">语料库最新动态</div>
              <div class="navboxall">
                <div class="wraptit">
                  <span>上传人</span><span>学院</span><span>语料集</span><span>日期</span>
                </div>
                <div class="wrap" ref="recentWrapRef" style="overflow:auto; max-height: 380px;">
                  <ul>
                    <li v-for="item in recentUploads" :key="item.id">
                      <p>
                        <span>{{ item.contributorName }}</span>
                        <span>{{ item.contributorCollege }}</span>
                        <span>{{ item.corpusName }}</span>
                        <span>{{ item.uploadTime }}</span>
                      </p>
                    </li>
                    <li v-if="recentUploads.length === 0">
                      <p style="text-align:center;color:#aaa;">暂无数据</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as echarts from 'echarts'
import '../assets/dashboard-screen.css'
import { getContributorAnalysis, getCorpusOverview, getTimeSeriesAnalysis, getCollegeOverview, getDomainOverview } from '../services/dashboard'
import { getCountryDistribution } from '../services/dashboard'
import { getRecentUploads } from '../services/dashboard'

const showTime = ref('')
const loadingEl = ref(null)

let intervalId = null
let resizeHandlers = []
let recentScrollTimer = null

const contributorNames = ref([])
const contributorCorpusCounts = ref([])
const contributorTotalCapacityGbs = ref([])
const corpusOverview = ref({ totalCapacity: '0' })

const colleges = ref([])
const collegeNames = ref([])
const collegeCorpusCounts = ref([])
const collegeTotalCapacityGbs = ref([])

// 添加国家分布表数据
const countryRows = ref([])

// 最近上传语料信息
const recentUploads = ref([])
const recentWrapRef = ref(null)

// 添加领域分析数据
const domainAnalysis = ref({
    domainNames: [],
    domainValues: [],
    domainPercentages: []
})

// 添加语料类型分布数据
const corpusTypeDistribution = ref({
    textFiles: { count: 0, percentage: 0 },
    audioFiles: { count: 0, percentage: 0 },
    videoFiles: { count: 0, percentage: 0 },
    imageFiles: { count: 0, percentage: 0 }
})

// 添加时间序列分析数据
const timeSeriesData = ref({
    dates: [],
    dailyCorpusAdded: [],
    dailyFilesAdded: [],
    dailyCapacityAdded: []
})

async function loadDomainAnalysis() {
    try {
        const res = await getDomainOverview()
        const list = Array.isArray(res?.data) ? res.data : []

        // 计算总数用于百分比计算
        const totalCount = list.reduce((sum, item) => sum + (Number(item.totalCapacityGb) || 0), 0)

        domainAnalysis.value = {
            domainNames: list.map(item => item.domain || '未知领域'),
            domainValues: list.map(item => Number(item.totalCapacityGb) || 0),
            domainPercentages: list.map(item => {
                const count = Number(item.totalCapacityGb) || 0
                return totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
            })
        }
    } catch (e) {
        console.log('加载领域分析数据失败:', e)
        // fallback to empty data on error
        domainAnalysis.value = {
            domainNames: [],
            domainValues: [],
            domainPercentages: []
        }
    }
}

async function loadContributorAnalysis() {
    try {
        const res = await getContributorAnalysis()
        const list = Array.isArray(res?.data) ? res.data : []
        contributorNames.value = list.map(item => item.contributorName || '').slice(0, 15)
        contributorCorpusCounts.value = list.map(item => Number(item.corpusCount || 0))
        contributorTotalCapacityGbs.value = list.map(item => Number(item.totalCapacityGb || 0))
    } catch (e) {
        console.log(e)
        // fallback to empty arrays on error
        contributorNames.value = []
        contributorCorpusCounts.value = []
        contributorTotalCapacityGbs.value = []
    }
}

async function loadCollegeOverview() {
    try {
        const res = await getCollegeOverview()
        const list = Array.isArray(res?.data) ? res.data : []
        colleges.value = list.map(item => ({ name: item.college, value: item.totalCapacityGb }))
        collegeNames.value = list.map(item => item.college || '')
        collegeCorpusCounts.value = list.map(item => Number(item.corpusCount || 0))
        collegeTotalCapacityGbs.value = list.map(item => Number(item.totalCapacityGb || 0))
    } catch (e) {
        console.log(e)
        // fallback to empty arrays on error
        collegeNames.value = []
        collegeCorpusCounts.value = []
        collegeTotalCapacityGbs.value = []
    }
}

async function loadCorpusOverview() {
    try {
        const res = await getCorpusOverview()
        if (res?.data && res.data.length > 0) {
            const data = res.data[0]
            corpusOverview.value = {
                totalCapacity: data.totalCapacityGb || '0'
            }
            // 更新语料类型分布数据
            corpusTypeDistribution.value = {
                textFiles: {
                    count: data.totalTextFiles || 0,
                    percentage: data.textFilesPercentage || 0
                },
                audioFiles: {
                    count: data.totalAudioFiles || 0,
                    percentage: data.audioFilesPercentage || 0
                },
                videoFiles: {
                    count: data.totalVideoFiles || 0,
                    percentage: data.videoFilesPercentage || 0
                },
                imageFiles: {
                    count: data.totalImageFiles || 0,
                    percentage: data.imageFilesPercentage || 0
                }
            }
        }
    } catch (e) {
        console.log(e)
        corpusOverview.value = { totalCapacity: '0' }
        corpusTypeDistribution.value = {
            textFiles: { count: 0, percentage: 0 },
            audioFiles: { count: 0, percentage: 0 },
            videoFiles: { count: 0, percentage: 0 },
            imageFiles: { count: 0, percentage: 0 }
        }
    }
}

async function loadTimeSeriesAnalysis() {
    try {
        const res = await getTimeSeriesAnalysis()
        const list = Array.isArray(res?.data) ? res.data : []

        // 按日期排序，确保数据按时间顺序排列
        const sortedData = list.sort((a, b) => {
            const dateA = new Date(a.contributionDate)
            const dateB = new Date(b.contributionDate)
            return dateA - dateB
        })

        // 提取最近30天的数据
        const recentData = sortedData.slice(-30)

        timeSeriesData.value = {
            dates: recentData.map(item => {
                const date = new Date(item.contributionDate)
                return `${date.getMonth() + 1}/${date.getDate()}`
            }),
            dailyCorpusAdded: recentData.map(item => Number(item.dailyCorpusAdded || 0)),
            dailyFilesAdded: recentData.map(item => Number(item.dailyFilesAdded || 0)),
            dailyCapacityAdded: recentData.map(item => Number(item.dailyCapacityAdded || 0))
        }
    } catch (e) {
        console.log(e)
        // fallback to empty data on error
        timeSeriesData.value = {
            dates: [],
            dailyCorpusAdded: [],
            dailyFilesAdded: [],
            dailyCapacityAdded: []
        }
    }
}

async function loadCountryDistribution() {
    try {
        const res = await getCountryDistribution()
        const list = Array.isArray(res?.data) ? res.data : []
        // 期望后端字段：country, corpusCount, totalCapacityGb, fileCount
        countryRows.value = list.map(item => ({
            country: item.country || '未知',
            corpusCount: Number(item.corpusCount || 0),
            totalCapacityGb: Number(item.totalCapacityGb || 0),
            filesCount: Number(item.filesCount || 0)
        }))
    } catch (e) {
        console.log('加载国家分布失败:', e)
        countryRows.value = []
    }
}

async function loadRecentUploads() {
    try {
        const res = await getRecentUploads()
        const list = Array.isArray(res?.data) ? res.data : []
        recentUploads.value = list
    } catch (e) {
        console.log('加载最近上传语料失败:', e)
        recentUploads.value = []
    }
}

function startRecentAutoScroll() {
    const container = recentWrapRef.value
    if (!container) return
    const listEl = container.querySelector('ul')
    if (!listEl) return
    // 如果元素不足滚动，复制一份以实现无缝滚动
    if (listEl.children.length > 0 && listEl.children.length < 8) {
        listEl.innerHTML = listEl.innerHTML + listEl.innerHTML
    }
    let scrollTop = 0
    const step = 1 // 像素
    const interval = 30 // ms
    const maxScroll = listEl.scrollHeight - container.clientHeight
    const tick = () => {
        if (maxScroll <= 0) return
        scrollTop += step
        if (scrollTop >= maxScroll) {
            scrollTop = 0
        }
        container.scrollTop = scrollTop
    }
    stopRecentAutoScroll()
    recentScrollTimer = window.setInterval(tick, interval)
    // 悬停暂停
    container.addEventListener('mouseenter', stopRecentAutoScroll)
    container.addEventListener('mouseleave', () => {
        stopRecentAutoScroll()
        recentScrollTimer = window.setInterval(tick, interval)
    })
}

function stopRecentAutoScroll() {
    if (recentScrollTimer) {
        window.clearInterval(recentScrollTimer)
        recentScrollTimer = null
    }
}

function updateClock() {
    const dt = new Date()
    const y = dt.getFullYear()
    const mt = dt.getMonth() + 1
    const day = dt.getDate()
    const h = dt.getHours()
    const m = dt.getMinutes()
    const s = dt.getSeconds()
    showTime.value = `${y}年${mt}月${day}日${h}时${m}分${s}秒`
}

function initResizeFor(chart) {
    const handler = () => chart.resize()
    window.addEventListener('resize', handler)
    resizeHandlers.push({ chart, handler })
}

function echarts_1() {
    const el = document.getElementById('echart1')
    if (!el) return
    const myChart = echarts.init(el)
    // 使用学院数据
    const names = collegeNames.value
    const data = colleges.value
    const option = {
        tooltip: { trigger: 'item', formatter: '{b} : {c}GB({d}%)' },
        legend: {
            type: 'scroll',
            left: '67%',
            top: '10%',
            itemWidth: 10,
            itemHeight: 10,
            itemGap: 15,
            orient: 'vertical',
            tooltip: { show: true },
            textStyle: {
                color: 'rgba(255,255,255,.6)',
                fontSize: 14,
                overflow: 'truncate',
                width: 120
            },
            data: names
        },
        calculable: true,
        series: [{
            name: '学院贡献',
            color: ['#62c98d', '#2f89cf', '#4cb9cf', '#53b666', '#62c98d', '#205acf', '#c9c862', '#c98b62', '#c962b9', '#7562c9', '#c96262', '#c25775', '#00b7be'],
            type: 'pie', radius: [30, 130], center: ['33%', '50%'], label: {
                show: true, position: 'inside', formatter: '{d}%', color: '#fff', fontSize: 12, textShadowBlur: 2,
                textShadowColor: 'rgba(0, 0, 0, 0.5)'
            },
            emphasis: { label: { show: true, fontSize: 14, color: '#fff' } }, data: data
        }]
    }
    myChart.setOption(option)
    initResizeFor(myChart)
}

function echarts_3() {
    const el = document.getElementById('echart3')
    if (!el) return
    const myChart = echarts.init(el)

    // 使用真实的时间序列数据
    const dates = timeSeriesData.value.dates
    const corpusData = timeSeriesData.value.dailyCapacityAdded
    const filesData = timeSeriesData.value.dailyFilesAdded

    const option = {
        tooltip: { trigger: 'axis', axisPointer: { lineStyle: { color: '#57617B' } } },
        legend: {
            data: ['每日新增语料容量(GB)', '每日新增文件数(份)'],
            top: '0',
            textStyle: { color: '#fff' },
            itemGap: 20,
        },
        grid: { top: '10%', right: '30', bottom: '30', left: '30' },
        xAxis: [{
            type: 'category',
            boundaryGap: false,
            axisLabel: { show: true, textStyle: { color: '#fff' } },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,.6)' } },
            data: dates
        }, {}],
        yAxis: [{
            name: '每日新增语料容量(GB)',
            nameTextStyle: { color: '#fff' },
            alignTicks: true,
            axisLabel: { show: true, color: '#fff' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,.6)' } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,.6)' } }
        }, {
            name: '每日新增文件数(份)',
            nameTextStyle: { color: '#fff' },
            alignTicks: true,
            axisLabel: { show: true, textStyle: { color: '#fff' } },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,.6)' } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,.6)' } }
        }],
        series: [
            {
                name: '每日新增语料容量(GB)', type: 'line', smooth: true, symbol: 'circle', symbolSize: 8, yAxisIndex: 0,
                lineStyle: { width: 2 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(145, 204, 117, 0.5)' },
                            { offset: 1, color: 'rgba(145, 204, 117, 0.1)' }
                        ]
                    }
                },
                itemStyle: { color: '#cdba00', borderColor: 'rgba(137,189,2,0.27)', borderWidth: 12 },
                data: corpusData
            },
            {
                name: '每日新增文件数(份)', type: 'line', smooth: true, symbolSize: 8, symbol: 'circle', yAxisIndex: 1,
                lineStyle: { width: 2 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [

                            { offset: 0, color: 'rgba(24, 163, 64, 0.3)' },
                            { offset: 1, color: 'rgba(0, 0, 0, 0.1)' }
                        ]
                    }
                },
                itemStyle: { color: '#277ace', borderColor: 'rgba(0,136,212,0.2)', borderWidth: 12 },
                data: filesData
            }
        ]
    }
    myChart.setOption(option)
    setupAutoTooltip(myChart, option, 3000)
    initResizeFor(myChart)
}

function echarts_4() {
    const el = document.getElementById('echart4')
    if (!el) return
    const myChart = echarts.init(el)
    const names = contributorNames.value
    const seriesBar1 = contributorCorpusCounts.value
    const seriesBar2 = contributorTotalCapacityGbs.value
    const option = {
        tooltip: { trigger: 'axis', axisPointer: { lineStyle: { color: '#57617B' } } },
        legend: {
            data: [{ name: '上传语料数量(份)' }, { name: '上传语料容量(GB)' }],
            top: '0%',
            textStyle: { color: 'rgba(255,255,255,0.9)' }
        },
        xAxis: [{
            type: 'category',
            data: names,
            axisLine: { lineStyle: { color: 'rgba(255,255,255,.6)' } },
            axisLabel: { textStyle: { color: '#fff', fontSize: 14 } },
        }],
        yAxis: [
            {
                type: 'value', name: '上传语料数量(份)',
                nameTextStyle: { color: '#fff' },
                axisLabel: { show: true, color: '#fff' },
                alignTicks: true,
                axisLine: { lineStyle: { color: 'rgba(255,255,255,.6)' } },
                splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,.6)' } },
            },
            {
                type: 'value', name: '上传语料容量(GB)',
                nameTextStyle: { color: '#fff' },
                axisLabel: { show: true, color: '#fff', },
                alignTicks: true,
                axisLine: { lineStyle: { color: 'rgba(255,255,255,.6)' } },
                splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,.6)' } },
            },
        ],
        grid: { top: '10%', right: '30', bottom: '30', left: '30' },
        series: [
            {
                name: '上传语料数量(份)', type: 'bar', data: seriesBar1, barWidth: 'auto', yAxisIndex: 0, min: 0,
                itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#609db8' }, { offset: 1, color: '#609db8' }], globalCoord: false } },
                label: { show: true, position: 'top', formatter: '{c}', color: '#fff', fontSize: 12 }
            },
            {
                name: '上传语料容量(GB)', type: 'bar', data: seriesBar2, barWidth: 'auto', yAxisIndex: 1, min: 0,
                itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#66b8a7' }, { offset: 1, color: '#66b8a7' }], globalCoord: false } },
                label: { show: true, position: 'top', formatter: '{c}', color: '#fff', fontSize: 12 }
            },
        ]
    }
    myChart.setOption(option)
    setupAutoTooltip(myChart, option, 3000)
    initResizeFor(myChart)
}

function echarts_5() {
    const el = document.getElementById('echart5')
    if (!el) return
    const myChart = echarts.init(el)

    // 使用真实的领域分析数据
    const domainNames = domainAnalysis.value.domainNames.slice().reverse()
    const domainPercentages = domainAnalysis.value.domainPercentages.slice().reverse()
    const domainValues = domainAnalysis.value.domainValues.slice().reverse()

    // 确保有数据显示
    const yAxisData = domainNames.length > 0 ? domainNames : ['暂无数据']
    const seriesData = domainPercentages.length > 0 ? domainPercentages : [0]
    const backgroundData = Array(yAxisData.length).fill(100)

    const option = {
        tooltip: {
            show: true,
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: function (params) {
                if (params && params.length > 0 && domainNames.length > 0) {
                    const dataIndex = params[0].dataIndex
                    const domainName = domainNames[dataIndex]
                    const percentage = domainPercentages[dataIndex]
                    const count = domainValues[dataIndex]
                    return `${domainName}<br/>语料容量: ${count}GB<br/>占比: ${percentage}%`
                }
                return ''
            }
        },
        grid: { top: '0%', left: '0', right: '4%', bottom: '5%' },
        xAxis: {
            min: 0,
            max: 100,
            splitLine: { show: false },
            axisTick: { show: false },
            axisLine: { show: false },
            axisLabel: { show: false }
        },
        yAxis: {
            data: yAxisData,
            axisTick: { show: false },
            axisLine: { show: false },
            axisLabel: {
                color: 'rgba(255,255,255,.6)',
                fontSize: 14,
                interval: 0,
                formatter: function (value) {
                    // 限制显示长度，避免文字过长
                    return value.length > 8 ? value.substring(0, 8) + '...' : value
                }
            }
        },
        series: [
            {
                name: '领域占比',
                type: 'bar',
                label: {
                    show: true,
                    zlevel: 10000,
                    position: 'right',
                    padding: 10,
                    color: '#49bcf7',
                    fontSize: 14,
                    formatter: function (params) {
                        return params.value > 0 ? `${params.value}%` : ''
                    }
                },
                itemStyle: { color: '#49bcf7' },
                barWidth: '15',
                data: seriesData,
                z: 10
            },
            {
                name: '背景',
                type: 'bar',
                barGap: '-100%',
                itemStyle: { color: '#fff', opacity: 0.1 },
                barWidth: '15',
                data: backgroundData,
                z: 5,
                silent: true
            }
        ]
    }
    myChart.setOption(option)
    setupAutoTooltip(myChart, option, 3000)
    initResizeFor(myChart)
}

function zb1() {
    const el = document.getElementById('zb1')
    if (!el) return
    const myChart = echarts.init(el)
    const data = corpusTypeDistribution.value.textFiles
    const v1 = data.count
    const v2 = data.percentage // 转换为百分比
    const option = {
        series: [{
            type: 'pie', radius: ['70%', '80%'], color: '#49bcf7', hoverAnimation: false,
            label: { show: true, position: 'center', formatter: [`{a|${v1}份}`, `{b|占比${v2}%}`].join('\n'), rich: { a: { color: '#fff', fontSize: 10, lineHeight: 28 }, b: { color: '#aaa', fontSize: 12 } } },
            data: [
                { value: v2, name: '文本文件' },
                { value: 100 - v2, name: '其他文件', label: { show: false }, itemStyle: { color: 'rgba(255,255,255,.2)' }, emphasis: { itemStyle: { color: '#fff' } } }
            ]
        }]
    }
    myChart.setOption(option)
    initResizeFor(myChart)
}

function zb2() {
    const el = document.getElementById('zb2')
    if (!el) return
    const myChart = echarts.init(el)
    const data = corpusTypeDistribution.value.audioFiles
    const v1 = data.count
    const v2 = data.percentage // 转换为百分比
    const option = {
        series: [{
            type: 'pie', radius: ['70%', '80%'], color: '#cdba00', hoverAnimation: false,
            label: { show: true, position: 'center', formatter: [`{a|${v1}份}`, `{b|占比${v2}%}`].join('\n'), rich: { a: { color: '#fff', fontSize: 10, lineHeight: 28 }, b: { color: '#aaa', fontSize: 12 } } },
            data: [
                { value: v2, name: '音频文件' },
                { value: 100 - v2, name: '其他文件', label: { show: false }, itemStyle: { color: 'rgba(255,255,255,.2)' }, emphasis: { itemStyle: { color: '#fff' } } }
            ]
        }]
    }
    myChart.setOption(option)
    initResizeFor(myChart)
}

function zb3() {
    const el = document.getElementById('zb3')
    if (!el) return
    const myChart = echarts.init(el)
    const data = corpusTypeDistribution.value.videoFiles
    const v1 = data.count
    const v2 = data.percentage // 转换为百分比
    const option = {
        series: [{
            type: 'pie', radius: ['70%', '80%'], color: '#62c98d', hoverAnimation: false,
            label: { show: true, position: 'center', formatter: [`{a|${v1}份}`, `{b|占比${v2}%}`].join('\n'), rich: { a: { color: '#fff', fontSize: 10, lineHeight: 28 }, b: { color: '#aaa', fontSize: 12 } } },
            data: [
                { value: v2, name: '视频文件' },
                { value: 100 - v2, name: '其他文件', label: { show: false }, itemStyle: { color: 'rgba(255,255,255,.2)' }, emphasis: { itemStyle: { color: '#fff' } } }
            ]
        }]
    }
    myChart.setOption(option)
    initResizeFor(myChart)
}

function zb4() {
    const el = document.getElementById('zb4')
    if (!el) return
    const myChart = echarts.init(el)
    const data = corpusTypeDistribution.value.imageFiles
    const v1 = data.count
    const v2 = data.percentage // 转换为百分比
    const option = {
        series: [{
            type: 'pie', radius: ['70%', '80%'], color: '#62c98d', hoverAnimation: false,
            label: { show: true, position: 'center', formatter: [`{a|${v1}份}`, `{b|占比${v2}%}`].join('\n'), rich: { a: { color: '#fff', fontSize: 10, lineHeight: 28 }, b: { color: '#aaa', fontSize: 12 } } },
            data: [
                { value: v2, name: '图像文件' },
                { value: 100 - v2, name: '其他文件', label: { show: false }, itemStyle: { color: 'rgba(255,255,255,.2)' }, emphasis: { itemStyle: { color: '#fff' } } }
            ]
        }]
    }
    myChart.setOption(option)
    initResizeFor(myChart)
}

/**
 * 设置 ECharts Tooltip 自动播放
 * @param {echarts.ECharts} myChart ECharts 实例
 * @param {echarts.EChartsOption} option 图表的配置项
 * @param {number} [interval=3000] 轮播间隔，单位毫秒
 */
function setupAutoTooltip(myChart, option, interval = 3000) {
    let currentIndex = -1; // 当前高亮的索引
    let timerId = null; // 定时器ID

    // 播放的函数
    const play = () => {
        const dataLen = option.series[0]?.data?.length;
        if (!dataLen) {
            return;
        }

        // 使用 post-increment，确保从第一个 (index 0) 开始
        currentIndex = (currentIndex + 1) % dataLen;

        // 核心：调用 dispatchAction 来显示 tooltip
        myChart.dispatchAction({
            type: 'showTip',
            seriesIndex: 0, // 通常我们只关心第一个系列
            dataIndex: currentIndex,
        });

        // 同时，对于 axis trigger，高亮对应的轴指针
        myChart.dispatchAction({
            type: 'highlight',
            seriesIndex: 0,
            dataIndex: currentIndex,
        });
    };

    // 开始播放的函数
    const startPlay = () => {
        // 防止重复启动
        if (timerId) {
            clearInterval(timerId);
        }
        timerId = setInterval(play, interval);
    };

    // 停止播放的函数
    const stopPlay = () => {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        // 取消高亮
        myChart.dispatchAction({
            type: 'downplay',
            seriesIndex: 0,
            dataIndex: currentIndex,
        });
    };

    // 监听鼠标事件，实现悬浮时暂停，离开时恢复
    myChart.on('mouseover', () => {
        stopPlay();
    });

    myChart.on('mouseout', () => {
        startPlay();
    });

    // 初始启动
    startPlay();
}

onMounted(async () => {
    if (loadingEl.value) loadingEl.value.style.display = 'block'

    await Promise.all([
        loadContributorAnalysis(),
        loadCorpusOverview(),
        loadTimeSeriesAnalysis(),
        loadCollegeOverview(),
        loadDomainAnalysis(),
        loadCountryDistribution(),
        loadRecentUploads()
    ])

    echarts_1()
    echarts_3()
    echarts_4()
    echarts_5()

    zb1()
    zb2()
    zb3()
    zb4()

    // 启动最近上传自动滚动
    startRecentAutoScroll()

    // start clock
    updateClock()
    intervalId = window.setInterval(updateClock, 1000)

    requestAnimationFrame(() => {
        if (loadingEl.value) loadingEl.value.style.display = 'none'
    })
})

onBeforeUnmount(() => {
    if (intervalId) clearInterval(intervalId)
    // remove resize handlers
    resizeHandlers.forEach(({ handler }) => window.removeEventListener('resize', handler))
    stopRecentAutoScroll()
})
</script>
