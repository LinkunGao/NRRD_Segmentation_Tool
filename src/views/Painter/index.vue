<template>
  <div id="bg" ref="base_container">
    <div ref="intro">
      <Intro />
    </div>
    <div ref="c_gui" id="gui"></div>
    <div ref="nrrd_c" class="nrrd_c"></div>
    <NavBar
      :file-num="fileNum"
      :max="max"
      :immediate-slice-num="immediateSliceNum"
      :contrast-index="contrastNum"
      :init-slice-index="initSliceIndex"
      @on-slice-change="getSliceChangedNum"
      @reset-main-area-size="resetMainAreaSize"
      @on-change-orientation="resetSlicesOrientation"
      @on-open-dialog="onOpenDialog"
    ></NavBar>
    <Upload
      :dialog="dialog"
      @on-close-dialog="onCloseDialog"
      @get-load-files-urls="readyToLoad"
    ></Upload>
  </div>
</template>
<script setup lang="ts">
import { GUI } from "dat.gui";
import * as Copper from "copper3d_visualisation";
import "copper3d_visualisation/dist/css/style.css";
import Intro from "./intro.vue";
import NavBar from "@/components/NavBar.vue";
import Upload from "@/components/Upload.vue";
import { onMounted, ref, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { useFileCountStore } from "@/store/pinia_store";

let appRenderer: Copper.copperRenderer;
let max = ref(0);
let immediateSliceNum = ref(0);
let contrastNum = ref(0);
let fileNum = ref(0);
let initSliceIndex = ref(0);
let dialog = ref(false);

let base_container = ref<HTMLDivElement>();
let intro = ref<HTMLDivElement>();
let c_gui = ref<HTMLDivElement>();
let nrrd_c = ref<HTMLDivElement>();

let scene: Copper.copperScene | undefined;
let pre_slices = ref();

let gui = new GUI({ width: 300, autoPlace: false });
let nrrdTools: Copper.nrrd_tools;
let loadBarMain: Copper.loadingBarType;
let allSlices: Array<any> = [];
let urls: Array<string> = [];

let filesCount = ref(0);
let selectedContrastFolder: GUI;
let firstLoad = true;

type selecedType = {
  [key: string]: boolean;
};

const { count } = storeToRefs(useFileCountStore());
const { getFilesCountNum } = useFileCountStore();

onMounted(async () => {
  // await getFilesCountNum();
  // console.log(count.value.count);

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

  setupGui();
  loadModel("nrrd_tools");
  appRenderer.animate();
});

const readyToLoad = (urlsArray: Array<string>) => {
  fileNum.value = urlsArray.length;
  urls = urlsArray;
  if (urls.length > 0) loadAllNrrds(urls);
};

const onOpenDialog = (flag: boolean) => {
  dialog.value = flag;
};
const onCloseDialog = (flag: boolean) => {
  dialog.value = flag;
};

const resetSlicesOrientation = (axis: "x" | "y" | "z") => {
  nrrdTools.setSliceOrientation(axis);
  max.value = nrrdTools.getMaxSliceNum()[1];
  const { currentIndex, contrastIndex } =
    nrrdTools.getCurrentSlicesNumAndContrastNum();
  immediateSliceNum.value = currentIndex;
  contrastNum.value = contrastIndex;
};
const getSliceChangedNum = (sliceNum: number) => {
  nrrdTools.setSliceMoving(sliceNum);
};
const resetMainAreaSize = (factor: number) => {
  nrrdTools.setMainAreaSize(factor);
};

watchEffect(() => {
  if (
    filesCount.value != 0 &&
    allSlices.length != 0 &&
    filesCount.value === urls.length
  ) {
    console.log("All files ready!");
    nrrdTools.clear();
    allSlices.sort((a: any, b: any) => {
      return a.order - b.order;
    });
    nrrdTools.setShowInMainArea(true);
    nrrdTools.setAllSlices(allSlices);
    initSliceIndex.value = nrrdTools.getCurrentSliceIndex();

    const getSliceNum = (index: number, contrastindex: number) => {
      immediateSliceNum.value = index;
      contrastNum.value = contrastindex;
    };
    if (firstLoad) {
      nrrdTools.drag({
        showNumber: true,
        getSliceNum,
      });
      nrrdTools.draw(scene as Copper.copperScene, gui);

      scene?.addPreRenderCallbackFunction(nrrdTools.start);
    } else {
      nrrdTools.redrawMianPreOnDisplayCanvas();
    }

    max.value = nrrdTools.getMaxSliceNum()[1];
    setTimeout(() => {
      initSliceIndex.value = 0;
      filesCount.value = 0;
    }, 1000);
    firstLoad = false;

    const selectedState: selecedType = {};

    for (let i = 0; i < allSlices.length; i++) {
      if (i == 0) {
        selectedState["pre"] = true;
      } else {
        const key = "contrast" + i;
        selectedState[key] = true;
      }
    }

    nrrdTools.removeGuiFolderChilden(selectedContrastFolder);
    for (let i = 0; i < allSlices.length; i++) {
      let name = "";
      i === 0 ? (name = "pre") : (name = "contrast" + i);
      selectedContrastFolder.add(selectedState, name).onChange((flag) => {
        if (flag) {
          fileNum.value += 1;
          nrrdTools.addSkip(i);
        } else {
          fileNum.value -= 1;
          nrrdTools.removeSkip(i);
        }
        const maxNum = nrrdTools.getMaxSliceNum()[1];
        if (maxNum) {
          max.value = maxNum;
          const { currentIndex, contrastIndex } =
            nrrdTools.getCurrentSlicesNumAndContrastNum();

          immediateSliceNum.value = currentIndex;
          contrastNum.value = contrastIndex + 1;
        }
      });
    }
  }
});

function loadModel(name: string) {
  scene = appRenderer.getSceneByName(name) as Copper.copperScene;
  if (scene == undefined) {
    scene = appRenderer.createScene(name) as Copper.copperScene;

    if (scene) {
      appRenderer.setCurrentScene(scene);

      if (scene) {
        scene.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view.json");
      }
      Copper.setHDRFilePath("/NRRD_Segmentation_Tool/venice_sunset_1k.hdr");
      scene.updateBackground("#18e5a7", "#ff00ff");
    }

    appRenderer.updateEnvironment();

    urls = [
      "/NRRD_Segmentation_Tool/nrrd/case1/pre.nrrd",
      "/NRRD_Segmentation_Tool/nrrd/case1/c1.nrrd",
      "/NRRD_Segmentation_Tool/nrrd/case1/c2.nrrd",
      "/NRRD_Segmentation_Tool/nrrd/case1/c3.nrrd",
      "/NRRD_Segmentation_Tool/nrrd/case1/c4.nrrd",
    ];
    loadAllNrrds(urls);
  }
}

const loadAllNrrds = (urls: Array<string>) => {
  fileNum.value = urls.length;
  allSlices = [];
  const mainPreArea = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
    // gui?: GUI
  ) => {
    const newNrrdSlice = Object.assign(nrrdSlices, { order: 0 });
    allSlices.push(newNrrdSlice);
    pre_slices.value = nrrdSlices;

    filesCount.value += 1;
  };
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
        filesCount.value += 1;
      }
    );
  }
};

function setupGui() {
  const state = {
    introduction: true,
    showContrast: false,
    switchCase: "case1",
  };
  gui
    .add(state, "introduction")
    .name("Intro Panel")
    .onChange((flag) => {
      flag
        ? ((intro.value as HTMLDivElement).style.display = "flex")
        : ((intro.value as HTMLDivElement).style.display = "none");
    });

  gui
    .add(state, "switchCase", ["case1", "case2", "case3"])
    .onChange((value) => {
      switch (value) {
        case "case1":
          urls = [
            "/NRRD_Segmentation_Tool/nrrd/case1/pre.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case1/c1.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case1/c2.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case1/c3.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case1/c4.nrrd",
          ];
          break;
        case "case2":
          urls = [
            "/NRRD_Segmentation_Tool/nrrd/case2/pre.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case2/c1.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case2/c2.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case2/c3.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case2/c4.nrrd",
          ];
          break;
        case "case3":
          urls = [
            "/NRRD_Segmentation_Tool/nrrd/case3/pre.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case3/c1.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case3/c2.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case3/c3.nrrd",
            "/NRRD_Segmentation_Tool/nrrd/case3/c4.nrrd",
          ];
          break;
      }
      readyToLoad(urls);
    });
  // gui.add(state, "showContrast").onChange((flag) => {
  //   nrrdTools.setShowInMainArea(flag);
  //   isAxisClicked.value = false;
  //   if (flag) {
  //     max.value = nrrdTools.getMaxSliceNum()[1];
  //   } else {
  //     max.value = nrrdTools.getMaxSliceNum()[0];
  //   }
  // });
  selectedContrastFolder = gui.addFolder("select display contrast");
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

.copper3D_loading_progress {
  color: darkgray !important;
  text-align: center;
  width: 60vw;
}
/* h3 {
  color: crimson;
}
.intro p {
  font-size: 0.8em;
  color: darkgray;
  width: 100%;
} */
</style>
