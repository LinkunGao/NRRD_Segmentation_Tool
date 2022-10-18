<template>
  <div class="nav">
    <div class="content">
      <el-slider
        v-model="sliceNum"
        :max="p.max"
        @input="onChangeSlider"
        show-input
      />
      <div class="arrows">
        <span @click="onMagnificationClick(0.2)"
          ><ion-icon name="add-circle-outline"></ion-icon
        ></span>
        <span @click="onMagnificationClick(-0.2)"
          ><ion-icon name="remove-circle-outline"></ion-icon
        ></span>
        <span @click="onSwitchSliceOrientation('x')"
          ><img class="image" src="../assets/images/x.ico" alt=""
        /></span>
        <span @click="onSwitchSliceOrientation('z')"
          ><img class="image" src="../assets/images/z.ico" alt=""
        /></span>
        <span @click="onSwitchSliceOrientation('y')"
          ><img class="image" src="../assets/images/y.ico" alt=""
        /></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// <ion-icon name="chevron-down-circle-outline"></ion-icon>
import { ref, reactive, toRefs, watchEffect } from "vue";
type Props = {
  fileNum: number;
  min?: number;
  max?: number;
  immediateSliceNum?: number;
  contrastIndex?: number;
};
let p = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 160,
  immediateSliceNum: 0,
  contrastIndex: 0,
});
const state = reactive(p);
const { max, immediateSliceNum, contrastIndex } = toRefs(state);
const sliceNum = ref(0);
let preViousSliceNum = p.min;
let previousMax = 0;
let isShowContrast = false;
let count = 0;
let magnification = 1;

const emit = defineEmits([
  "onSliceChange",
  "resetMainAreaSize",
  "onChangeOrientation",
]);

const onSwitchSliceOrientation = (axis: string) => {
  emit("onChangeOrientation", axis);
};

const onMagnificationClick = (factor: number) => {
  magnification += factor;
  if (magnification > 8) {
    magnification = 8;
  }
  if (magnification < 1) {
    magnification = 1;
  }
  emit("resetMainAreaSize", magnification);
};

const onChangeSlider = () => {
  const step = sliceNum.value - preViousSliceNum;
  emit("onSliceChange", step);
  preViousSliceNum += step;
};

watchEffect(() => {
  if (isShowContrast) {
    sliceNum.value = immediateSliceNum.value * p.fileNum + contrastIndex.value;
  } else {
    sliceNum.value = immediateSliceNum.value;
  }
});

watchEffect(() => {
  if (max.value > previousMax) {
    sliceNum.value = sliceNum.value * p.fileNum;
    if (count !== 0) isShowContrast = true;
    count++;
  }
  if (max.value < previousMax) {
    sliceNum.value = Math.floor(sliceNum.value / p.fileNum);
    isShowContrast = false;
  }
  preViousSliceNum = sliceNum.value;
  previousMax = max.value;
});
</script>

<style scoped>
.el-slider {
  max-width: 30vw;
  margin-right: 10px;
  --el-slider__bar-bg-color: red !important;
}
.nav {
  position: fixed;
  bottom: 10px;
  height: 60px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
.nav .content {
  position: relative;
  width: 70%;
  height: 100%;
  background-color: #edf1f4;
  padding: 0 20px;
  border-radius: 10px;
  box-shadow: 0 30px 30px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
}
.nav .content .arrows {
  display: flex;
  align-items: center;
}
.nav .content .arrows span {
  position: relative;
  padding: 10px;
  box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.1), -5px -5px 20px #fff;
  margin: 5px;
  cursor: pointer;
  user-select: none;
  min-width: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2em;
  color: #666;
  border: 2px solid #edf1f4;
  box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.1), -5px -5px 10px #fff;
  border-radius: 10px;
  cursor: pointer;
}
.nav .content .arrows span:active {
  box-shadow: inset 5px 5px 10px rgba(0, 0, 0, 0.1), inset -5px -5px 10px #fff;
  color: #f44336;
}
.image {
  width: 1em;
  height: 1em;
}
</style>
