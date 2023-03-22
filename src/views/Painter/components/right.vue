<template>
  <div id="bg_2" ref="base_container_2">
    <div ref="c_gui_2" id="gui_2"></div>
  </div>
</template>

<script setup lang="ts">
import { GUI } from "dat.gui";
import * as Copper from "copper3d_visualisation";
import "copper3d_visualisation/dist/css/style.css";
import { getCurrentInstance, onMounted, ref } from "vue";
import emitter from "@/utils/bus";
let refs = null;
let bg: HTMLDivElement = ref<any>(null);
let appRenderer: Copper.copperRenderer;
let c_gui: HTMLDivElement = ref<any>(null);
let nrrdTools: Copper.nrrd_tools;
let loadBar1: Copper.loadingBarType;
let loadBar2: Copper.loadingBarType;

onMounted(() => {
  let { $refs } = (getCurrentInstance() as any).proxy;
  refs = $refs;
  bg = refs.base_container_2;
  c_gui = refs.c_gui;

  appRenderer = new Copper.copperRenderer(bg);
  nrrdTools = new Copper.nrrd_tools(appRenderer.container);
  loadBar1 = Copper.loading();
  loadBar2 = Copper.loading();

  appRenderer.container.appendChild(loadBar1.loadingContainer);

  loadNrrd("/NRRD_Segmentation_Tool/mask.nrrd", "nrrd0", c_gui);

  appRenderer.animate();
});
function loadNrrd(url: string, name: string, c_gui: any) {
  let scene = appRenderer.getSceneByName(name) as Copper.copperScene;
  if (scene == undefined) {
    scene = appRenderer.createScene(name) as Copper.copperScene;
    appRenderer.setCurrentScene(scene);
    const opts: Copper.optsType = {
      openGui: true,
      container: c_gui,
    };

    const funa = (
      volume: any,
      nrrdMesh: Copper.nrrdMeshesType,
      nrrdSlices: Copper.nrrdSliceType,
      gui?: GUI
    ) => {
      scene.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view.json");
      (gui as GUI).closed = true;
      scene.addObject(nrrdMesh.x);
      scene.addObject(nrrdMesh.y);
      scene.addObject(nrrdMesh.z);
    };
    if (scene) {
      scene?.loadNrrd(url, loadBar1, funa, opts);
      scene.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view.json");
      emitter.on("resize", () => {
        scene?.onWindowResize();
      });
    }

    scene.updateBackground("#766", "#000");
    Copper.setHDRFilePath("venice_sunset_1k.hdr");
    appRenderer.updateEnvironment();
  }
}
</script>

<style scoped>
#bg_2 {
  width: 100%;
  height: 100%;
  /* overflow: hidden;
  position: relative; */
}
#bg_2 > canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
