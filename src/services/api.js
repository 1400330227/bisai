// 模拟后端接口：语料记录的创建、查询与文件上传均落在本地 localStorage，
// 上传进度由定时器模拟并支持取消。接入真实后端时，将本文件替换为 axios 实例即可（接口签名一致）。
const CORPUS_KEY = 'resource-upload:corpus-list'

const loadList = () => {
  try { return JSON.parse(localStorage.getItem(CORPUS_KEY) || '[]') } catch { return [] }
}
const saveList = list => {
  try { localStorage.setItem(CORPUS_KEY, JSON.stringify(list)) } catch { /* 本地不可用时仅保留会话内数据 */ }
}

const api = {
  get(url, config = {}) {
    if (url === '/corpus/my-corpus') {
      const params = config.params || {}
      const list = loadList()
      const records = params.collectionName
        ? list.filter(item => params.searchType === 'accurate'
          ? item.collectionName === params.collectionName
          : String(item.collectionName || '').includes(params.collectionName))
        : list
      return new Promise(resolve => setTimeout(() => resolve({ data: { records, total: records.length } }), 200))
    }
    return Promise.resolve({ data: null })
  },

  post(url, payload, config = {}) {
    if (url === '/corpus') {
      const list = loadList()
      const corpusId = `corpus-${Date.now()}`
      list.unshift({ ...payload, corpusId, createdAt: new Date().toISOString() })
      saveList(list)
      return new Promise(resolve => setTimeout(() => resolve({ data: { corpusId } }), 300))
    }

    if (url === '/corpus/upload') {
      const file = payload && typeof payload.get === 'function' ? payload.get('file') : null
      const total = (file && file.size) || 1024 * 1024
      const { onUploadProgress, signal } = config
      return new Promise((resolve, reject) => {
        let loaded = 0
        const timer = setInterval(() => {
          if (signal && signal.aborted) {
            clearInterval(timer)
            const error = new Error('上传已取消')
            error.name = 'AbortError'
            reject(error)
            return
          }
          loaded = Math.min(total, loaded + Math.max(1, Math.round(total * (0.15 + Math.random() * 0.3))))
          if (onUploadProgress) onUploadProgress({ loaded, total, lengthComputable: true })
          if (loaded >= total) {
            clearInterval(timer)
            setTimeout(() => resolve({ data: { fileName: (file && file.name) || 'file' } }), 120)
          }
        }, 90)
      })
    }

    return Promise.resolve({ data: null })
  },
}

export default api
