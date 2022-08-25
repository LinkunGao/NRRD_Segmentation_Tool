<template>
  <div id="bg" ref="base_container">
    <div class="intro" ref="intro">
      <h3>Introduction</h3>
      <p>
        <strong>--> Zoom:</strong> When your mouse hover on slice image, then
        use mouse wheel to zoom image.
      </p>
      <p>
        <strong>--> Pan: </strong> When your mouse hover on slice image, and use
        mouse right click on image, then drag image to pan.
      </p>
      <p>
        <strong>--> Switch slice:</strong> press shift on your keyboard (do not
        release it when you switch slice), then use mouse left click the image
        to drag up and down. When the switch is made to the image you want, you
        can release the shift key.
      </p>
      <p>
        <strong> --> Undo:</strong> 1. In GUI click undo; or 2. on keyborad
        using ctrl+z (windows) / command+z(mac).
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { GUI } from "dat.gui";
import * as Copper from "copper3d_visualisation";
import "copper3d_visualisation/dist/css/style.css";
import { getCurrentInstance, onMounted, ref } from "vue";

let refs = null;
let bg: HTMLDivElement = ref<any>(null);
let appRenderer: Copper.copperMSceneRenderer;
let intro: HTMLDivElement = ref<any>(null);
let gui: GUI;

onMounted(() => {
  console.log(
    "%cNRRD Segmentation App %cBeta:v1.1.2",
    "padding: 3px;color:white; background:#d94607",
    "padding: 3px;color:white; background:#219EBC"
  );

  let { $refs } = (getCurrentInstance() as any).proxy;
  refs = $refs;
  bg = refs.base_container;
  intro = refs.intro;

  appRenderer = new Copper.copperMSceneRenderer(bg, 1);

  appRenderer.sceneInfos[0].addSubView();

  gui = appRenderer.sceneInfos[0].gui;
  loadNrrd(
    "/Nrrd-Segmentation/nrrd/breast-224.nrrd",
    "nrrd0",
    appRenderer.sceneInfos[0]
  );
  setupGui();
  appRenderer.animate();
});

function loadNrrd(url: string, name: string, sceneIn: Copper.copperMScene) {
  const funa = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
  ) => {
    /**
     * for test 1 view
     * */
    sceneIn.loadViewUrl("/Nrrd-Segmentation/nrrd_view.json");
    sceneIn.subScene.add(nrrdMesh.z);
    sceneIn.dragImage(nrrdSlices.z, {
      mode: "mode1",
      showNumber: true,
    });
    appRenderer.sceneInfos[0].drawImage(
      nrrdSlices.z,
      appRenderer.sceneInfos[0]
    );
  };
  if (sceneIn) {
    sceneIn?.loadNrrd(url, funa);
    sceneIn.loadViewUrl("/Nrrd-Segmentation/nrrd_view.json");
  }
  sceneIn.updateBackground("#18e5a7", "#ff00ff");
  Copper.setHDRFilePath("/Nrrd-Segmentation/venice_sunset_1k.hdr");
  appRenderer.updateEnvironment(sceneIn);
}

function setupGui() {
  const state = {
    introduction: true,
  };
  gui.add(state, "introduction").onChange((flag) => {
    flag ? (intro.style.display = "flex") : (intro.style.display = "none");
  });
}
</script>

<style>
#bg {
  width: 100vw;
  height: 100vh;
  /* border: 1px solid palevioletred; */
}
.copper3d_sliceNumber {
  position: fixed !important;
  width: 300px;
  text-align: center;
  top: 5% !important;
  right: 1% !important;
  left: 0px !important;
  margin: 0 auto;
  border: 1px solid salmon;
  border-radius: 10px;
  padding: 5px;
  color: crimson;
}
.copper3D_scene_div {
  display: flex;
  justify-content: center;
  align-items: center;
}
.intro {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: fixed;
  left: 30px;
  top: 30px;
  padding: 20px;
  width: 300px;
  min-height: 400px;
  background-color: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 0, 0, 0.8);
  border-radius: 10px;
}

h3 {
  color: crimson;
}
p {
  /* color: darkcyan; */
  color: #d94607;
}
</style>
