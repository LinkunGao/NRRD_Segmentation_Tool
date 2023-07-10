<template>
  <div class="split-container" ref="splitContainer">
    <div class="box left" ref="left_container" @dblclick="togglePanelActive('left')">
      <LeftPanel />
    </div>
    <div class="split-bar" ref="splitBar"></div>
    <div class="box right" ref="right_container" @dblclick="togglePanelActive('right')">
      <RightPanel />
    </div>
    <Logo />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import LeftPanel from "./components/left-panel-core/left.vue";
import RightPanel from "./components/right-panel-core/right.vue";
import emitter from "@/utils/bus";
import Logo from "@/components/logo.vue";

const splitContainer = ref<HTMLDivElement>();
const splitBar = ref<HTMLDivElement>();

const left_container = ref<HTMLDivElement>();
const right_container = ref<HTMLDivElement>();

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

function togglePanelActive(panel:string){
  
  switch (panel) {
    case "left":
      left_container.value?.classList.toggle("panel_active")
      
      break;
    case "right":
      right_container.value?.classList.toggle("panel_active")

    break;
  }
  emitter.emit("resize", true);
}
</script>

<style scoped>
.split-container {
  display: grid;
  grid-template-columns: 65% 35%;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  user-select: none;
}

.box {
  height: 100%;
}

.left {
  background-color: #ffcccc;
}
.panel_active{
  position: fixed;
  width: 100vw;
  z-index: 100;
}

.right {
  background-color: #6b6bd3;
}

.split-bar {
  position: absolute;
  top: 0;
  left: 65%;
  width: 2px;
  height: 100%;
  background-color: #555;
  cursor: col-resize;
  z-index: 99;
}
</style>
