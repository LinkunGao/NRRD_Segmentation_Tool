<template>
  <div class="nav">
    <div class="content">
      <div class="arrows">
        <span @click="onPreviousSlice"
          ><ion-icon name="chevron-back-outline"></ion-icon
        ></span>
        <span @click="onNextSlice"
          ><ion-icon name="chevron-forward-outline"></ion-icon
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Props = {
  min?: number;
  max?: number;
};
let p = withDefaults(defineProps<Props>(), { min: 0, max: 160 });

let sliceNum = 0;
const emit = defineEmits(["onSliceChange"]);
const onNextSlice = () => {
  if (p.max && p.max != 0) {
    if (sliceNum < p.max) sliceNum++;
    emit("onSliceChange", 1);
  }
};
const onPreviousSlice = () => {
  if (p.min >= 0) {
    if (sliceNum > p.min) sliceNum--;
    emit("onSliceChange", -1);
  }
};
</script>

<style scoped>
.nav {
  position: fixed;
  bottom: 10px;
  height: 60px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
.nav .content {
  position: relative;
  width: 50%;
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
  margin: 10px;
  cursor: pointer;
  user-select: none;
  min-width: 40px;
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
</style>
