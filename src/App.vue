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
        using ctrl+z (windows) / command+z (mac).
      </p>
    </div>
    <NavBar @on-slice-change="getSliceChangedNum"></NavBar>
  </div>
</template>
<script setup lang="ts">
import { GUI } from "dat.gui";
import * as Copper from "copper3d_visualisation";
import "copper3d_visualisation/dist/css/style.css";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";
import NavBar from "./components/NavBar.vue";
import { getCurrentInstance, onMounted, ref } from "vue";

let refs = null;
let base_container = ref<HTMLDivElement>();
let appRenderer: Copper.copperMSceneRenderer;
let intro: HTMLDivElement = ref<any>(null);
let gui: GUI;
let nrrdTools: Copper.nrrd_tools;
let loadBarMain: Copper.loadingBarType;
let readyMain = ref(false);
let readyC1 = ref(false);
let readyC2 = ref(false);
let readyC3 = ref(false);
let readyC4 = ref(false);

onMounted(() => {
  console.log(

    "%cNRRD Segmentation App %cBeta:v2.0.3",

    "padding: 3px;color:white; background:#d94607",
    "padding: 3px;color:white; background:#219EBC"
  );

  let { $refs } = (getCurrentInstance() as any).proxy;
  refs = $refs;
  intro = refs.intro;

  appRenderer = new Copper.copperMSceneRenderer(
    base_container.value as HTMLDivElement,
    1
  );
  nrrdTools = new Copper.nrrd_tools(appRenderer.sceneInfos[0].container);
  nrrdTools.setContrastDisplayInMainArea();
  loadBarMain = Copper.loading();

  nrrdTools.mainDisplayArea.appendChild(loadBarMain.loadingContainer);

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
const getSliceChangedNum = (sliceNum: number) => {
  if (readyMain && readyC1 && readyC2 && readyC3 && readyC4) {
    nrrdTools.setSliceMoving(sliceNum);
  }
};

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
    appRenderer.sceneInfos[0].subScene.add(nrrdMesh.z);
    nrrdTools.setVolumeAndSlice(volume, nrrdSlices.z);

    nrrdTools.dragImageWithMode(sceneIn.controls as TrackballControls, {
      mode: "mode1",
      showNumber: true,
    });
    nrrdTools.draw(sceneIn.controls as TrackballControls, sceneIn, sceneIn.gui);
    appRenderer.sceneInfos[0].addPreRenderCallbackFunction(nrrdTools.start);
    readyMain.value = true;
  };
  const contrast1Area = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
  ) => {
    nrrdTools.setContrast1OriginCanvas(nrrdSlices.z);
    readyC1.value = true;
  };
  const contrast2Area = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
  ) => {
    nrrdTools.setContrast2OriginCanvas(nrrdSlices.z);
    readyC2.value = true;
  };
  const contrast3Area = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
  ) => {
    nrrdTools.setContrast3OriginCanvas(nrrdSlices.z);
    readyC3.value = true;
  };
  const contrast4Area = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
  ) => {
    nrrdTools.setContrast4OriginCanvas(nrrdSlices.z);
    readyC4.value = true;
  };
  if (sceneIn) {
    sceneIn?.loadNrrd(urls[0], loadBarMain, mainPreArea);
    sceneIn?.loadNrrd(urls[1], loadBarMain, contrast1Area);
    sceneIn?.loadNrrd(urls[2], loadBarMain, contrast2Area);
    sceneIn?.loadNrrd(urls[3], loadBarMain, contrast3Area);
    sceneIn?.loadNrrd(urls[4], loadBarMain, contrast4Area);
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
  // gui
  //   .add(state, "contrastSize")
  //   .min(100)
  //   .max(400)
  //   .onChange((size) => {
  //     nrrdTools.setContrastSize(size, size);
  //     nrrdTools.updateContrastArea();
  //   });
}
</script>

<style>
#bg {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
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
  /* color: crimson; */
  font-size: 0.9em;
  font-weight: 700;
  color: rgba(26, 26, 26, 0.965);
  cursor: no-drop;
  transition: border-color 0.25s;
}
.copper3d_sliceNumber:hover {
  border-color: #eb4a05;
}
.copper3d_sliceNumber:focus,
.copper3d_sliceNumber:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

.copper3D_scene_div {
  display: flex;
  justify-content: center;
  align-items: center;
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
.copper3D_loading_progress {
  color: darkgray !important;
  text-align: center;
  width: 60vw;
}

h3 {
  color: crimson;
}
.intro p {
  /* color: darkcyan; */
  /* color: #ef5e0a; */
  font-size: 0.8em;
  color: darkgray;
  width: 100%;
}
</style>
