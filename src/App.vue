<template>
  <div id="bg" ref="base_container">
    <div class="intro" ref="intro">
      <h3>How to use:</h3>
      <p><strong>--> Zoom:</strong> Use mouse wheel.</p>
      <p><strong>--> Pan: </strong> Use mouse right click + drag image.</p>
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
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";
import { getCurrentInstance, onMounted, ref } from "vue";

let refs = null;
let bg: HTMLDivElement = ref<any>(null);
let appRenderer: Copper.copperMSceneRenderer;
let intro: HTMLDivElement = ref<any>(null);
let gui: GUI;
let nrrdTools: Copper.nrrd_tools;
let loadBarMain: Copper.loadingBarType;
let loadBar1: Copper.loadingBarType;
let loadBar2: Copper.loadingBarType;
let loadBar3: Copper.loadingBarType;
let loadBar4: Copper.loadingBarType;

onMounted(() => {
  console.log(
    "%cNRRD Segmentation App %cBeta:v1.2.0",
    "padding: 3px;color:white; background:#d94607",
    "padding: 3px;color:white; background:#219EBC"
  );

  let { $refs } = (getCurrentInstance() as any).proxy;
  refs = $refs;
  bg = refs.base_container;
  intro = refs.intro;

  appRenderer = new Copper.copperMSceneRenderer(bg, 1);
  nrrdTools = new Copper.nrrd_tools(appRenderer.sceneInfos[0].container);
  nrrdTools.addContrastDisplay();
  loadBarMain = Copper.loading();
  loadBar1 = Copper.loading();
  loadBar2 = Copper.loading();
  loadBar3 = Copper.loading();
  loadBar4 = Copper.loading();

  nrrdTools.mainDisplayArea.appendChild(loadBarMain.loadingContainer);
  nrrdTools.contrast1Area.appendChild(loadBar1.loadingContainer);
  nrrdTools.contrast2Area.appendChild(loadBar2.loadingContainer);
  nrrdTools.contrast3Area.appendChild(loadBar3.loadingContainer);
  nrrdTools.contrast4Area.appendChild(loadBar4.loadingContainer);

  appRenderer.sceneInfos[0].addSubView();

  gui = appRenderer.sceneInfos[0].gui;
  const urls = [
    "/NRRD_Segmentation_Tool/nrrd/ax dyn pre.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 1st pass.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 2nd pass.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 3rd pass.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 4th pass.nrrd",
  ];
  loadNrrd(urls, "nrrd0", appRenderer.sceneInfos[0]);

  setupGui();
  appRenderer.animate();
});

function loadNrrd(
  urls: Array<string>,
  name: string,
  sceneIn: Copper.copperMScene
) {
  const mainPreArea = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
    // gui?: GUI
  ) => {
    /**
     * for test 1 view
     * */
    appRenderer.sceneInfos[0].loadViewUrl("/copper3d_examples/nrrd_view.json");
    // appRenderer.sceneInfos[0].scene.add(nrrdMesh.z);

    appRenderer.sceneInfos[0].subScene.add(nrrdMesh.z);
    nrrdTools.setVolumeAndSlice(volume, nrrdSlices.z);

    nrrdTools.dragImageWithMode(sceneIn.controls as TrackballControls, {
      mode: "mode1",
      showNumber: true,
    });
    nrrdTools.draw(sceneIn.controls as TrackballControls, sceneIn, sceneIn.gui);
    appRenderer.sceneInfos[0].addPreRenderCallbackFunction(nrrdTools.start);
  };
  const contrast1Area = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
  ) => {
    nrrdTools.setContrast1OriginCanvas(nrrdSlices.z);
  };
  const contrast2Area = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
  ) => {
    nrrdTools.setContrast2OriginCanvas(nrrdSlices.z);
  };
  const contrast3Area = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
  ) => {
    nrrdTools.setContrast3OriginCanvas(nrrdSlices.z);
  };
  const contrast4Area = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
  ) => {
    nrrdTools.setContrast4OriginCanvas(nrrdSlices.z);
  };
  if (sceneIn) {
    sceneIn?.loadNrrd(urls[0], loadBarMain, mainPreArea);
    sceneIn?.loadNrrd(urls[1], loadBar1, contrast1Area);
    sceneIn?.loadNrrd(urls[2], loadBar2, contrast2Area);
    sceneIn?.loadNrrd(urls[3], loadBar3, contrast3Area);
    sceneIn?.loadNrrd(urls[4], loadBar4, contrast4Area);
    sceneIn.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view.json");
  }
  sceneIn.updateBackground("#18e5a7", "#ff00ff");
  Copper.setHDRFilePath("/NRRD_Segmentation_Tool/venice_sunset_1k.hdr");
  appRenderer.updateEnvironment(sceneIn);
}

function setupGui() {
  const state = {
    introduction: true,
    contrastSize: 200,
  };
  gui
    .add(state, "introduction")
    .name("Intro Panel")
    .onChange((flag) => {
      flag ? (intro.style.display = "flex") : (intro.style.display = "none");
    });
  gui
    .add(state, "contrastSize")
    .min(100)
    .max(400)
    .onChange((size) => {
      nrrdTools.setContrastSize(size, size);
      nrrdTools.updateContrastArea();
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
  display: grid;
  grid-template-areas:
    "z z m m m"
    "c1 c2 m m m"
    "c1 c2 m m m"
    "c1 c2 m m m"
    "c3 c4 m m m"
    "c3 c4 m m m"
    "c3 c4 m m m"
    "b b m m m";
  gap: 10px;
}
.copper3D_mainDisplay {
  position: relative;
  grid-area: m;
}
.copper3D_contrast1 {
  grid-area: c1;
  background-color: rgba(130, 39, 39, 0.1);
}
.copper3D_contrast2 {
  grid-area: c2;
  background-color: rgba(102, 51, 153, 0.3);
}
.copper3D_contrast3 {
  grid-area: c3;
  background-color: rgba(126, 60, 60, 0.3);
}
.copper3D_contrast4 {
  grid-area: c4;
  background-color: rgba(45, 192, 19, 0.3);
}
.intro {
  display: flex;
  flex-direction: column;
  /* justify-content: center; */
  align-items: center;
  position: fixed;
  left: 30px;
  top: 30px;
  padding: 20px;
  width: 300px;
  min-height: 400px;
  background-color: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.9);
  border-radius: 10px;
  z-index: 10;
}

h3 {
  color: crimson;
}
.intro p {
  /* color: darkcyan; */
  color: #ef5e0a;
  width: 100%;
}
</style>
