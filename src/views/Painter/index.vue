<template>
  <div class="split-container" ref="splitContainer">
    <div class="box left">
      <LeftPanel />
    </div>
    <div class="split-bar" ref="splitBar"></div>
    <div class="box right">
      <RightPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import LeftPanel from "./components/left.vue";
import RightPanel from "./components/right.vue";
import emitter from "@/utils/bus";

const splitContainer = ref<HTMLDivElement>();
const splitBar = ref<HTMLDivElement>();

let isDragging = false;
onMounted(() => {
  splitBar.value?.addEventListener("mousedown", function (e) {
    isDragging = true;
  });

  document.addEventListener("mousemove", function (e) {
    if (isDragging) {
      const containerRect = (
        splitContainer.value as HTMLDivElement
      ).getBoundingClientRect();
      const mousePosition = e.clientX - containerRect.left;

      const minLeft = containerRect.left;
      const maxLeft =
        containerRect.right - (splitBar.value as HTMLDivElement).offsetWidth;
      const percent = ((mousePosition - minLeft) / (maxLeft - minLeft)) * 100;
      if (percent < 1 || percent > 99) {
        return;
      }

      (splitBar.value as HTMLDivElement).style.left = percent + "%";
      (splitContainer.value as HTMLDivElement).style.gridTemplateColumns =
        percent + "% " + (100 - percent) + "%";
      emitter.emit("resize", true);
    }
  });

  document.addEventListener("mouseup", function (e) {
    isDragging = false;
  });
});
</script>

<style scoped>
.split-container {
  display: grid;
  grid-template-columns: 70% 30%;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  /* 使 .split-bar 的 left 值相对于 .split-container 定位 */
}

.box {
  height: 100%;
}

.left {
  background-color: #ffcccc;
}

.right {
  background-color: #6b6bd3;
}

.split-bar {
  position: absolute;
  top: 0;
  left: 70%;
  width: 2px;
  height: 100%;
  background-color: #555;
  cursor: col-resize;
  z-index: 99;
}
</style>
