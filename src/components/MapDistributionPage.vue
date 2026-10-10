<script setup>
// 「地图可视化 → 资源分布图」
// 地图本身是一个自包含的单文件页面（放在 public/ 下，Vite 会原样拷进 dist/），
// 这里只做一层容器 + iframe 嵌入，不把它的逻辑搬进 Vue。
const resourceMapUrl = `${import.meta.env.BASE_URL}resource-map.html`
</script>

<template>
  <div class="map-panel">
    <iframe
      class="map-frame"
      :src="resourceMapUrl"
      title="广西及东盟资源分布图"
    ></iframe>
  </div>
</template>

<style scoped>
.map-panel {
  background: #fff;
  border: 1px solid #e9eeeb;
  border-radius: 9px;
  box-shadow: 0 1px 2px #24352e05;
  padding: 6px;
  overflow: hidden;
}
.map-frame {
  display: block;
  width: 100%;
  height: calc(100vh - 268px);
  min-height: 520px;
  border: 0;
  border-radius: 6px;
  background: #e8eef4;
}
</style>
