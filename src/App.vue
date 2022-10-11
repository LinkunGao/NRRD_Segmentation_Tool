<template>
  <div id="bg" ref="base_container">
    <div class="intro" ref="intro">
      <h3>How to use:</h3>
      <p><strong>--> Zoom:</strong> Use mouse wheel.</p>
      <p><strong>--> Pan: </strong> Use mouse right click + drag image.</p>
      <p>
        <strong>--> Switch slice:</strong> Use mouse left click + drag image.
      </p>
      <p>
        <strong>--> Painting:</strong> Press `shift` key on your keyboard (don't
        release it), then use mouse left click to paint.
      </p>
      <p>
        <strong> --> Undo:</strong> 1. In GUI click undo; or 2. on keyborad
        using ctrl+z (windows) / command+z (mac).
      </p>
    </div>
    <div ref="c_gui" id="gui"></div>
    <div ref="nrrd_c" class="nrrd_c"></div>
    <NavBar
      :file-num="5"
      :max="max"
      :immediate-slice-num="immediateSliceNum"
      :contrast-index="contrastNum"
      @on-slice-change="getSliceChangedNum"
      @redraw-pre="redraw"
      @reset-main-area-size="resetMainAreaSize"
      @on-change-orientation="resetSlicesOrientation"
    ></NavBar>
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
let appRenderer: Copper.copperRenderer;
let max = ref(0);
let immediateSliceNum = ref(0);
let contrastNum = ref(0);

let base_container = ref<HTMLDivElement>();

let intro: HTMLDivElement = ref<any>(null);
let scene: Copper.copperScene | undefined;
let bg: HTMLDivElement = ref<any>(null);
let c_gui: HTMLDivElement = ref<any>(null);
let nrrd_c: HTMLDivElement = ref<any>(null);
let pre_slices = ref();

let gui = new GUI({ width: 300, autoPlace: false });
let nrrdTools: Copper.nrrd_tools;
let loadBarMain: Copper.loadingBarType;
let readyMain = ref(false);
let readyC1 = ref(false);
let readyC2 = ref(false);
let readyC3 = ref(false);
let readyC4 = ref(false);

onMounted(() => {
  console.log(
    "%cNRRD Segmentation App %cBeta:v2.1.0",

    "padding: 3px;color:white; background:#d94607",
    "padding: 3px;color:white; background:#219EBC"
  );

  let { $refs } = (getCurrentInstance() as any).proxy;
  refs = $refs;
  intro = refs.intro;

  bg = refs.base_container;
  c_gui = $refs.c_gui;
  nrrd_c = $refs.nrrd_c;
  c_gui.appendChild(gui.domElement);
  appRenderer = new Copper.copperRenderer(bg);
  nrrdTools = new Copper.nrrd_tools(nrrd_c);
  nrrdTools.setContrastDisplayInMainArea(5);
  nrrdTools.setShowInMainArea(false);
  loadBarMain = Copper.loading();
  nrrdTools.mainDisplayArea.appendChild(loadBarMain.loadingContainer);

  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyF") {
      Copper.fullScreenListenner(bg);
    }
  });

  const urls = [
    "/NRRD_Segmentation_Tool/nrrd/ax dyn pre.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 1st pass.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 2nd pass.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 3rd pass.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 4th pass.nrrd",
  ];

  setupGui();
  loadNrrd(urls, "nrrd_tools");
  appRenderer.animate();
});
const redraw = () => {
  nrrdTools.redrawDisplayCanvas();
};

const resetSlicesOrientation = (axis: string) => {
  console.log(pre_slices.value);

  console.log(axis);
  switch (axis) {
    case "x":
      // nrrdTools.setSliceOritention([pre_slices.value.x]);
      break;
    case "y":
      break;
    case "z":
      break;
  }
};
const getSliceChangedNum = (sliceNum: number) => {
  if (readyMain && readyC1 && readyC2 && readyC3 && readyC4) {
    // nrrdTools.setSyncsliceNum();
    // nrrdTools.updateIndex(sliceNum);
    // console.log(sliceNum);

    nrrdTools.setSliceMoving(sliceNum);
  }
};
const resetMainAreaSize = (factor: number) => {
  nrrdTools.setMainAreaSize(factor);
};

function loadNrrd(urls: Array<string>, name: string) {
  scene = appRenderer.getSceneByName(name) as Copper.copperScene;
  if (scene == undefined) {
    scene = appRenderer.createScene(name) as Copper.copperScene;
    if (scene) {
      appRenderer.setCurrentScene(scene);
      const mainPreArea = (
        volume: any,
        nrrdMesh: Copper.nrrdMeshesType,
        nrrdSlices: Copper.nrrdSliceType
        // gui?: GUI
      ) => {
        // scene?.subScene.add(nrrdMesh.z);
        pre_slices.value = nrrdSlices;
        nrrdTools.setVolumeAndSlice(volume, nrrdSlices.z);
        max.value = nrrdTools.getMaxSliceNum()[0];

        const getSliceNum = (index: number, contrastindex: number) => {
          immediateSliceNum.value = index;
          contrastNum.value = contrastindex;
        };

        nrrdTools.dragImageWithMode(scene?.controls as TrackballControls, {
          mode: "mode1",
          showNumber: true,
          getSliceNum,
        });
        nrrdTools.draw(
          scene?.controls as TrackballControls,
          scene as Copper.copperScene,
          gui
        );
        scene?.addPreRenderCallbackFunction(nrrdTools.start);
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

      scene?.loadNrrd(urls[0], loadBarMain, mainPreArea);
      scene?.loadNrrd(urls[1], loadBarMain, contrast1Area);
      scene?.loadNrrd(urls[2], loadBarMain, contrast2Area);
      scene?.loadNrrd(urls[3], loadBarMain, contrast3Area);
      scene?.loadNrrd(urls[4], loadBarMain, contrast4Area);
      scene.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view.json");

      Copper.setHDRFilePath("/NRRD_Segmentation_Tool/venice_sunset_1k.hdr");
      scene.updateBackground("#5454ad", "#18e5a7");
    }
  }
  appRenderer.updateEnvironment();
}

function setupGui() {
  const state = {
    introduction: true,
    showContrast: false,
  };
  gui
    .add(state, "introduction")
    .name("Intro Panel")
    .onChange((flag) => {
      flag ? (intro.style.display = "flex") : (intro.style.display = "none");
    });
  gui.add(state, "showContrast").onChange((flag) => {
    nrrdTools.setShowInMainArea(flag);
    if (flag) {
      max.value = nrrdTools.getMaxSliceNum()[1];
    } else {
      max.value = nrrdTools.getMaxSliceNum()[0];
    }
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
#gui {
  position: absolute;
  top: 1px;
  right: 0px;
  z-index: 100;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
.nrrd_c {
  position: fixed;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
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
