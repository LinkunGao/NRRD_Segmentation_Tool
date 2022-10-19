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
      :file-num="fileNum"
      :max="max"
      :immediate-slice-num="immediateSliceNum"
      :contrast-index="contrastNum"
      :is-axis-clicked="isAxisClicked"
      @on-slice-change="getSliceChangedNum"
      @reset-main-area-size="resetMainAreaSize"
      @on-change-orientation="resetSlicesOrientation"
      @on-open-dialog="onOpenDialog"
    ></NavBar>
    <Upload :dialog="dialog" @on-close-dialog="onCloseDialog"></Upload>
  </div>
</template>
<script setup lang="ts">
import { GUI } from "dat.gui";
import * as Copper from "copper3d_visualisation";
import "copper3d_visualisation/dist/css/style.css";
import NavBar from "./components/NavBar.vue";
import Upload from "./components/Upload.vue";
import { getCurrentInstance, onMounted, ref, watchEffect } from "vue";

// let refs = null;
let appRenderer: Copper.copperRenderer;
let max = ref(0);
let immediateSliceNum = ref(0);
let contrastNum = ref(0);
let fileNum = ref(0);

let base_container = ref<HTMLDivElement>();
let intro = ref<HTMLDivElement>();
let c_gui = ref<HTMLDivElement>();
let nrrd_c = ref<HTMLDivElement>();

let scene: Copper.copperScene | undefined;
let pre_slices = ref();

let gui = new GUI({ width: 300, autoPlace: false });
let nrrdTools: Copper.nrrd_tools;
let loadBarMain: Copper.loadingBarType;
let readyMain = ref(false);
let readyC1 = ref(false);
let readyC2 = ref(false);
let readyC3 = ref(false);
let readyC4 = ref(false);
let allSlices: Array<any> = [];
let isAxisClicked = ref(false);
let dialog = ref(false);

onMounted(() => {
  console.log(
    "%cNRRD Segmentation App %cBeta:v2.1.7",
    "padding: 3px;color:white; background:#d94607",
    "padding: 3px;color:white; background:#219EBC"
  );

  c_gui.value?.appendChild(gui.domElement);
  appRenderer = new Copper.copperRenderer(
    base_container.value as HTMLDivElement
  );

  nrrdTools = new Copper.nrrd_tools(nrrd_c.value as HTMLDivElement);

  loadBarMain = Copper.loading();
  (nrrd_c.value as HTMLDivElement).appendChild(loadBarMain.loadingContainer);

  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyF") {
      Copper.fullScreenListenner(base_container.value as HTMLDivElement);
    }
  });

  const urls = [
    "/NRRD_Segmentation_Tool/nrrd/ax dyn pre.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 1st pass.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 2nd pass.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 3rd pass.nrrd",
    "/NRRD_Segmentation_Tool/nrrd/ax dyn 4th pass.nrrd",
  ];

  fileNum.value = urls.length;

  setupGui();
  loadNrrd(urls, "nrrd_tools");
  appRenderer.animate();
});

const onOpenDialog = (flag: boolean) => {
  dialog.value = flag;
};
const onCloseDialog = (flag: boolean) => {
  dialog.value = flag;
};

const resetSlicesOrientation = (axis: "x" | "y" | "z") => {
  nrrdTools.setSliceOrientation(axis);
  const status = nrrdTools.getIsShowContrastState();
  isAxisClicked.value = true;
  if (status) {
    max.value = nrrdTools.getMaxSliceNum()[1];
  } else {
    max.value = nrrdTools.getMaxSliceNum()[0];
  }
};
const getSliceChangedNum = (sliceNum: number) => {
  if (
    readyMain.value &&
    readyC1.value &&
    readyC2.value &&
    readyC3.value &&
    readyC4.value
  ) {
    nrrdTools.setSliceMoving(sliceNum);
  }
};
const resetMainAreaSize = (factor: number) => {
  nrrdTools.setMainAreaSize(factor);
};

watchEffect(() => {
  if (
    readyMain.value &&
    readyC1.value &&
    readyC2.value &&
    readyC3.value &&
    readyC4.value
  ) {
    console.log("All files ready!");
    allSlices.sort((a: any, b: any) => {
      return a.order - b.order;
    });

    nrrdTools.setAllSlices(allSlices);
    const getSliceNum = (index: number, contrastindex: number) => {
      immediateSliceNum.value = index;
      contrastNum.value = contrastindex;
    };
    nrrdTools.drag({
      showNumber: true,
      getSliceNum,
    });
    nrrdTools.draw(scene as Copper.copperScene, gui);

    scene?.addPreRenderCallbackFunction(nrrdTools.start);

    max.value = nrrdTools.getMaxSliceNum()[0];
  }
});

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
        const newNrrdSlice = Object.assign(nrrdSlices, { order: 0 });
        allSlices.push(newNrrdSlice);
        // scene?.subScene.add(nrrdMesh.z);
        pre_slices.value = nrrdSlices;

        readyMain.value = true;
      };

      if (scene) {
        scene?.loadNrrd(urls[0], loadBarMain, mainPreArea);

        for (let i = 1; i < urls.length; i++) {
          scene?.loadNrrd(
            urls[i],
            loadBarMain,
            (
              volume: any,
              nrrdMesh: Copper.nrrdMeshesType,
              nrrdSlices: Copper.nrrdSliceType
            ) => {
              const newNrrdSlice = Object.assign(nrrdSlices, { order: i });
              allSlices.push(newNrrdSlice);
              let index = i;
              switch (index) {
                case 1:
                  readyC1.value = true;
                  break;
                case 2:
                  readyC2.value = true;
                  break;
                case 3:
                  readyC3.value = true;
                  break;
                case 4:
                  readyC4.value = true;
                  break;
              }
            }
          );
        }
        scene.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view.json");
      }

      Copper.setHDRFilePath("/NRRD_Segmentation_Tool/venice_sunset_1k.hdr");
      scene.updateBackground("#18e5a7", "#ff00ff");
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
      flag
        ? ((intro.value as HTMLDivElement).style.display = "flex")
        : ((intro.value as HTMLDivElement).style.display = "none");
    });
  gui.add(state, "showContrast").onChange((flag) => {
    nrrdTools.setShowInMainArea(flag);
    isAxisClicked.value = false;
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
