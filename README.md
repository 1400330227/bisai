# 广西—东盟自然资源协同平台

## 启动

```bash
npm install
```

本项目语义解析使用阿里云百炼的千问 OpenAI 兼容接口。在项目根目录复制 `.env.example` 为 `.env`，填写百炼 API Key，并按控制台实际开通的模型调整模型名和服务地域地址：

```env
DASHSCOPE_API_KEY=你的百炼API-Key
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
API_PORT=3001
```

然后运行：

```bash
npm run dev
```

该命令会同时启动 Vue 页面和语义解析 API。Vite 将 `/api` 请求代理到本地 API 服务。模型密钥只由服务端读取，不要放入 `VITE_` 前缀的前端变量中。

需求语义解析页面会将企业自然语言需求发送到 `/api/semantic-parse`，千问以 JSON 格式返回企业、资源、区域、数量、用途、时限及关系三元组。模型处理期间显示动态进度状态；返回后展示解析结果，服务未配置或请求失败时会显示错误原因。

`.env` 已加入忽略规则，不会被 Git 跟踪。`.env.example` 只提供配置项示例。
