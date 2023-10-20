<template>
  <div id="bg" ref="base_container">
    <div v-show="showIntro" ref="intro">
      <Intro />
    </div>
    <div ref="c_gui" id="gui"></div>
    <div ref="nrrd_c" class="nrrd_c"></div>
    <div class="navBar" ref="navBar">
      <NavBar
      :file-num="fileNum"
      :max="max"
      :immediate-slice-num="immediateSliceNum"
      :contrast-index="contrastNum"
      :init-slice-index="initSliceIndex"
      @on-slice-change="getSliceChangedNum"
      @reset-main-area-size="resetMainAreaSize"
      @on-change-orientation="resetSlicesOrientation"
      @on-save="onSaveMask"
      @on-open-dialog="onOpenDialog"
    ></NavBar>
    </div>
   
    <Upload
      :dialog="dialog"
      @on-close-dialog="onCloseDialog"
      @get-load-files-urls="readyToLoad"
    ></Upload>
  </div>
  <div>

    <Bottom />
  </div>
</template>
<script setup lang="ts">
import { GUI, GUIController } from "dat.gui";
import * as Copper from "copper3d";
import "copper3d/dist/css/style.css";
// import * as Copper from "@/ts/index";

import Intro from "../intro.vue";
import Bottom from "../bottom.vue";
import NavBar from "@/components/NavBar.vue";
import Upload from "@/components/Upload.vue";
import { onMounted, ref, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { IStoredMasks, IReplaceMask,ISaveSphere, ILoadUrls, IRegRquest,ILoadedMeshes, IRequests,ICaseUrls,IDetails } from "@/models/dataType";
import {addNameToLoadedMeshes} from "./utils-left";
import {
  useFileCountStore,
  useNrrdCaseUrlsStore,
  useInitMarksStore,
  useReplaceMarksStore,
  useSaveSphereStore,
  useSaveMasksStore,
  useMaskStore,
  useClearMaskMeshStore,
  useRegNrrdUrlsStore,
  useOriginNrrdUrlsStore,
  useNrrdCaseFileUrlsWithOrderStore,
} from "@/store/pinia_store";
import { findCurrentCase, revokeAppUrls, revokeRegisterNrrdImages, getEraserUrlsForOffLine, getCursorUrlsForOffLine } from "../../tools";
import {convertInitMaskData} from "@/utils/worker"
import emitter from "@/utils/bus";


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
let navBar = ref<HTMLDivElement>();

let scene: Copper.copperScene | undefined;
let pre_slices = ref();

let gui = new GUI({ width: 300, autoPlace: false });
let optsGui:GUI|undefined=undefined;
let nrrdTools: Copper.nrrd_tools;
let loadBarMain: Copper.loadingBarType;
let loadingContainer: HTMLDivElement, progress: HTMLDivElement;
let allSlices: Array<any> = [];
let defaultRegAllSlices: Array<any> = [];
let originAllSlices: Array<any> = [];
let allLoadedMeshes: Array<ILoadedMeshes> = [];
let defaultRegAllMeshes: Array<ILoadedMeshes> = [];
let originAllMeshes: Array<ILoadedMeshes> = [];
let regCkeckbox: GUIController
let urls: Array<string> = [];
let loadedUrls: ILoadUrls = {};

let filesCount = ref(0);
let selectedContrastFolder: GUI;
let firstLoad = true;
let loadCases = true;
let loadOrigin = false;

let currentCaseId = "";
let showIntro = ref(false)
let regCheckboxElement:HTMLInputElement;


let state = {
    introduction: showIntro.value,
    showContrast: false,
    switchCase: "",
    showRegisterImages:true,
    release: () => {
      revokeAppUrls(loadedUrls);
      loadedUrls = {};
    },
  };

type selecedType = {
  [key: string]: boolean;
};
// type TnrrdTools = {
//   spaceOrigin:{x:number[], y:number[], z:number[]};
//   sphereRadius:number;
//   [key: string]: any;
// }

let toolsState:any

const { cases } = storeToRefs(useFileCountStore());
const { getFilesNames } = useFileCountStore();
// const { caseUrls } = storeToRefs(useNrrdCaseUrlsStore());
// const { getCaseFileUrls } = useNrrdCaseUrlsStore();
// const { regUrls } = storeToRefs(useRegNrrdUrlsStore());
// const { getRegNrrdUrls } = useRegNrrdUrlsStore();
// const { originUrls } = storeToRefs(useOriginNrrdUrlsStore());
// const { getOriginNrrdUrls } = useOriginNrrdUrlsStore();
const { sendInitMask } = useInitMarksStore();
const { sendReplaceMask } = useReplaceMarksStore();
const { sendSaveSphere } = useSaveSphereStore();
const { sendSaveMask } = useSaveMasksStore();
const { maskBackend } = storeToRefs(useMaskStore());
const { getMaskDataBackend } = useMaskStore();
const { clearMaskMeshObj } = useClearMaskMeshStore();
const { getNrrdAndJsonFileUrls } = useNrrdCaseFileUrlsWithOrderStore();
const { caseUrls} = storeToRefs(useNrrdCaseFileUrlsWithOrderStore())
let originUrls= ref<ICaseUrls>({ nrrdUrls: [], jsonUrl: "" });
// web worker for send masks to backend
// const worker = new Worker(new URL("../../../../../utils/worker.ts", import.meta.url), {
//   type: "module",
// });

const eraserUrls = getEraserUrlsForOffLine();
const cursorUrls = getCursorUrlsForOffLine();

onMounted(async () => {
  await getInitData();
  c_gui.value?.appendChild(gui.domElement);
  appRenderer = new Copper.copperRenderer(
    base_container.value as HTMLDivElement
  );

  nrrdTools = new Copper.nrrd_tools(nrrd_c.value as HTMLDivElement);
  // for offline working
  
  nrrdTools.setEraserUrls(eraserUrls);
  nrrdTools.setPencilIconUrls(cursorUrls);

  // sphere plan b
  toolsState = nrrdTools.getNrrdToolsSettings()
  // toolsState.spherePlanB = false;

  loadBarMain = Copper.loading();

  loadingContainer = loadBarMain.loadingContainer;
  progress = loadBarMain.progress;

  (nrrd_c.value as HTMLDivElement).appendChild(loadBarMain.loadingContainer);

  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyF") {
      Copper.fullScreenListenner(base_container.value as HTMLDivElement);
    }
  });


  setupGui();
  loadModel("nrrd_tools");
  appRenderer.animate();

  emitter.on("leftFullScreen", (flag) => {
      if(flag){
        (navBar.value as HTMLDivElement).style.width = "90%";
      }else{
        (navBar.value as HTMLDivElement).style.width = "60%";
      }
    });
});

async function getInitData() {
  await getFilesNames();
}

const readyToLoad = (urlsArray: Array<string>, name:string) => {
  fileNum.value = urlsArray.length;
  urls = urlsArray;
  if (urls.length > 0){
    return new Promise<{meshes:Array<Copper.nrrdMeshesType>,slices:any[]}>((resolve, reject)=>{
      loadAllNrrds(urls, name, resolve, reject);
    })
  } 
};

const onSaveMask = async (flag: boolean) => {
  if (flag) {
    switchAnimationStatus("flex", "Saving masks data, please wait......");
    await sendSaveMask(currentCaseId);
    switchAnimationStatus("none");
    emitter.emit("saveMesh", true);
  }
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


const sendInitMaskToBackend = async () => {
  // const masksData = nrrdTools.paintImages.z;
  const masksData = {
    label1: nrrdTools.paintImagesLabel1.z,
    label2: nrrdTools.paintImagesLabel2.z,
    label3: nrrdTools.paintImagesLabel3.z,
  };
  const dimensions = nrrdTools.getCurrentImageDimension();
  const len = nrrdTools.paintImages.z.length;
  const width = dimensions[0];
  const height = dimensions[1];
  const voxelSpacing = nrrdTools.getVoxelSpacing();
  const spaceOrigin = nrrdTools.getSpaceOrigin();
  

  if (len > 0) { 
    const result = convertInitMaskData({
      masksData,
      len,
      width,
      height,
      voxelSpacing,
      spaceOrigin,
      msg: "init",
    });
  const body = {
    caseId: currentCaseId,
    masks: result.masks as IStoredMasks,
  };
  let start_c: unknown = new Date();
  await sendInitMask(body);
  let end_c: unknown = new Date();
  let timeDiff_c = (end_c as number) - (start_c as number);
  console.log(`axios send Time taken: ${timeDiff_c}ms`);
  console.log("send");
  }
};

const loadJsonMasks = (url: string) => {
  loadingContainer.style.display = "flex";
  progress.innerText = "Loading masks data......";

  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "json";
  xhr.onload = function () {
    if (xhr.status === 200) {
      const data = xhr.response;
      loadingContainer.style.display = "none";
      if (data === null) {
        console.log("data empty init");

        sendInitMaskToBackend();
      }
      
      nrrdTools.setMasksData(data, loadBarMain);
    }
  };
  xhr.send();
};

const setMaskData = () => {
  
  if (loadedUrls[currentCaseId]) {
    if (cases.value) {
      const currentCaseDetail = findCurrentCase(
        cases.value.details,
        currentCaseId
      );
      if (currentCaseDetail.masked) {
        if (caseUrls.value)
          loadJsonMasks(loadedUrls[currentCaseId].jsonUrl as string);
      } else {
        sendInitMaskToBackend();
      }
    }
  }
};

const switchAnimationStatus = (status: "flex" | "none", text?: string) => {
  loadingContainer.style.display = status;
  !!text && (progress.innerText = text);
};

const getSphereData =async ( 
      sphereOrigin:number[],
      sphereRadius:number
      ) => {
        const sphereData:ISaveSphere = {
          caseId: currentCaseId,
          sliceId:sphereOrigin[2],
          sphereRadiusMM: sphereRadius,
          sphereOriginMM:sphereOrigin
        }
        await sendSaveSphere(sphereData);    
}

const getMaskData = async (
  image: ImageData,
  sliceId: number,
  label:string,
  width: number,
  height: number,
  clearAllFlag?: boolean
) => {
  const copyImage = image.data.slice();

  const mask = [...copyImage];
  const body: IReplaceMask = {
    caseId: currentCaseId,
    sliceId,
    label,
    mask,
  };
  
  if (clearAllFlag) {
    clearMaskMeshObj(currentCaseId);
    sendInitMaskToBackend();
  } else {
    await sendReplaceMask(body);
  }
};

watchEffect(() => {
  
  if (
    filesCount.value != 0 &&
    allSlices.length != 0 &&
    filesCount.value === urls.length
  ) {
    console.log("All files ready!");

    allSlices.sort((a: any, b: any) => {
      return a.order - b.order;
    });
    allLoadedMeshes.sort((a: any, b: any) => {
      return a.order - b.order;
    });
    
    if(loadOrigin){

      nrrdTools.switchAllSlicesArrayData(allSlices);
      loadOrigin = false;
      switchAnimationStatus("none");
      setTimeout(()=>switchRegCheckBoxStatus(regCkeckbox.domElement, "auto", "1"), 1000);
      if(originAllSlices.length===0){
        originAllSlices = [...allSlices];
        originAllMeshes = [...allLoadedMeshes];
      } 

    }else{
    nrrdTools.clear();
    nrrdTools.setShowInMainArea(true);
    nrrdTools.setAllSlices(allSlices);
    
    defaultRegAllSlices = [...allSlices];
    defaultRegAllMeshes = [...allLoadedMeshes];

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
      nrrdTools.draw(scene as Copper.copperScene, gui, { getMaskData, getSphereData });
      scene?.addPreRenderCallbackFunction(nrrdTools.start);
      setUpGuiAfterLoading()
    } else {
      nrrdTools.redrawMianPreOnDisplayCanvas();
    }

    if (loadCases) {
      setMaskData();
    }

    max.value = nrrdTools.getMaxSliceNum()[1];

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
  setTimeout(() => {
      initSliceIndex.value = 0;
      filesCount.value = 0;
    }, 1000);
    firstLoad = false;
    loadCases = false;
}
   
});

async function loadModel(name: string) {
  scene = appRenderer.getSceneByName(name) as Copper.copperScene;
  if (scene == undefined) {
    scene = appRenderer.createScene(name) as Copper.copperScene;

    emitter.on("resize", () => {
      scene?.onWindowResize();
    });
    if (scene) {
      appRenderer.setCurrentScene(scene);

      if (scene) {
        scene.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view.json");
      }
      Copper.setHDRFilePath("/NRRD_Segmentation_Tool/venice_sunset_1k.hdr");
      // scene.updateBackground("#18e5a7", "#ff00ff");
      scene.updateBackground("#8b6d96", "#18e5e5");
    }

    appRenderer.updateEnvironment();

    if ((cases.value?.names as string[]).length > 0) {
      if (cases.value?.names) {
        switchAnimationStatus("flex", "Prepare Nrrd files, please wait......");
        currentCaseId = cases.value?.names[0];
        const details = cases.value?.details
       
        const requests = findRequestUrls(details,currentCaseId, "registration")
        
        await getNrrdAndJsonFileUrls(requests)

        // await getCaseFileUrls(cases.value?.names[0]);
        if (caseUrls.value) {
          urls = caseUrls.value.nrrdUrls;
          // every time switch cases, we store it
          loadedUrls[currentCaseId] = caseUrls.value;
          emitter.emit("casename", {currentCaseId,details,maskNrrd:urls[1]})
        }
        loadAllNrrds(urls, "registration");
      }
    }
  }
}

const findRequestUrls= (details:Array<IDetails>, caseId:string, type:"registration"|"origin")=>{
  const currentCaseDetails = details.filter((item)=>item.name===caseId)[0];
  const requests:Array<IRequests> = []
  if(type==="registration"){
    currentCaseDetails.file_paths.registration_nrrd_paths.forEach(filepath=>{
    requests.push({
      url: "/single-file",
      params: {path:filepath}
    })
   })
  }else if(type==="origin"){
    currentCaseDetails.file_paths.origin_nrrd_paths.forEach(filepath=>{
    requests.push({
      url: "/single-file",
      params: {path:filepath}
    })
   })
  }
 
  if(currentCaseDetails.masked){
    currentCaseDetails.file_paths.segmentation_manual_mask_paths.forEach(filepath=>{
      requests.push({
      url: "/single-file",
      params: {path:filepath}
    })
    })
  }
  return requests
}

const loadAllNrrds = (urls: Array<string>, name:string, resolve?:(value: {meshes:Array<Copper.nrrdMeshesType>,slices:any[]}) => void, reject?:(reason?: any) => void) => {
  switchAnimationStatus("none");
  fileNum.value = urls.length;
  
  allSlices = [];
  allLoadedMeshes = [];
  const mainPreArea = (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType
    // gui?: GUI
  ) => {
    addNameToLoadedMeshes(nrrdMesh, name);
    const newNrrdSlice = Object.assign(nrrdSlices, { order: 0 });
    const newNrrdMesh = Object.assign(nrrdMesh, { order: 0 });
    allSlices.push(newNrrdSlice);
    allLoadedMeshes.push(newNrrdMesh);
    pre_slices.value = nrrdSlices;
    filesCount.value += 1;
  };
  scene?.loadNrrd(urls[0], loadBarMain, true, mainPreArea);

  for (let i = 1; i < urls.length; i++) {
    scene?.loadNrrd(
      urls[i],
      loadBarMain,
      true,
      (
        volume: any,
        nrrdMesh: Copper.nrrdMeshesType,
        nrrdSlices: Copper.nrrdSliceType
      ) => {
        addNameToLoadedMeshes(nrrdMesh, name);
        const newNrrdSlice = Object.assign(nrrdSlices, { order: i });
        const newNrrdMesh = Object.assign(nrrdMesh, { order: i });
        allSlices.push(newNrrdSlice);
        allLoadedMeshes.push(newNrrdMesh);
        filesCount.value += 1;
        if(filesCount.value>=urls.length){
          allLoadedMeshes.sort((a: any, b: any) => {
            return a.order - b.order;
          });
          allSlices.sort((a: any, b: any) => {
            return a.order - b.order;
          });
         !!resolve && resolve({meshes:allLoadedMeshes, slices:allSlices});
        }
      }
    );
  }
};

function setupGui() {
  state.switchCase = cases.value?.names[0] as string
  gui
    .add(state, "introduction")
    .name("Intro Panel")
    .onChange((flag) => {
      // flag
      //   ? ((intro.value as HTMLDivElement).style.display = "flex")
      //   : ((intro.value as HTMLDivElement).style.display = "none");
      showIntro.value = flag
    });

  gui
    .add(state, "switchCase", cases.value?.names as string[])
    .onChange(async (caseId) => {
      switchAnimationStatus("flex", "Saving masks data, please wait......");
      // revoke the regsiter images
      if(!!originUrls.value&&originUrls.value.nrrdUrls.length>0){
        revokeRegisterNrrdImages(originUrls.value.nrrdUrls)
        originUrls.value.nrrdUrls.length = 0;
      }
      originAllSlices.length = 0;
      defaultRegAllSlices.length = 0;
      originAllMeshes.length = 0;
      defaultRegAllMeshes.length = 0;
      // temprary disable this function
      revokeAppUrls(loadedUrls);
      loadedUrls = {};

      currentCaseId = caseId;
      await getInitData();
      
      if (loadedUrls[caseId]) {
        switchAnimationStatus(
          "flex",
          "Prepare and Loading masks data, please wait......"
        );
        URL.revokeObjectURL(loadedUrls[caseId].jsonUrl);
        await getMaskDataBackend(caseId);
        loadedUrls[caseId].jsonUrl = maskBackend.value;
        urls = loadedUrls[caseId].nrrdUrls;
        if(!!caseUrls.value){
          caseUrls.value.nrrdUrls = urls
        }
      } else {
        switchAnimationStatus("flex", "Prepare Nrrd files, please wait......");
        // await getCaseFileUrls(value);
        
        const requests = findRequestUrls(cases.value?.details as Array<IDetails>, currentCaseId, "registration")
        await getNrrdAndJsonFileUrls(requests)
        
        if (!!caseUrls.value) {
          urls = caseUrls.value.nrrdUrls;
          loadedUrls[currentCaseId] = caseUrls.value;
          const details = cases.value?.details
          emitter.emit("casename", {currentCaseId,details, maskNrrd:urls[1]})
        }
      }
      
      readyToLoad(urls, "registration");
      loadCases = true;
      setUpGuiAfterLoading()
    });

  selectedContrastFolder = gui.addFolder("select display contrast");
  
}

function setUpGuiAfterLoading(){
  
  if(!!optsGui){
    
    gui.removeFolder(optsGui)
    optsGui = undefined;
    state.showRegisterImages = true;
  }
  optsGui = gui.addFolder("opts");
  regCkeckbox = optsGui.add(state,"showRegisterImages");
  regCheckboxElement = regCkeckbox.domElement.childNodes[0] as HTMLInputElement;
  regCkeckbox.onChange(async ()=>{

    if(regCheckboxElement.disabled ){
      state.showRegisterImages = !state.showRegisterImages;
      return;
    }

    switchRegCheckBoxStatus(regCkeckbox.domElement, "none", "0.5");
    loadOrigin = true;
    switchAnimationStatus(
          "flex",
          "Prepare and Loading data, please wait......"
        );
      if(!state.showRegisterImages){
        
        if(originAllSlices.length>0){
          allSlices = [...originAllSlices];
          allLoadedMeshes = [...originAllMeshes];
          filesCount.value = 5;
          emitter.emit("showRegBtnToRight",{maskNrrdMeshes:originAllMeshes[1],maskSlices:originAllSlices[1], url:urls[1], register:state.showRegisterImages})
          return;
        }

        const reQuestInfo:IRegRquest = {
          name:currentCaseId,
          radius: toolsState?.sphereRadius,
          origin: toolsState?.sphereOrigin.z
        }
        

        if(!(!!originUrls.value?.nrrdUrls&&originUrls.value?.nrrdUrls.length>0)){
          const requests = findRequestUrls(cases.value?.details as Array<IDetails>, reQuestInfo.name, "origin")
          await getNrrdAndJsonFileUrls(requests)
          originUrls.value = caseUrls.value as ICaseUrls
        } 
        if(!!originUrls.value?.nrrdUrls&&originUrls.value?.nrrdUrls.length>0){
          urls = originUrls.value.nrrdUrls;
          readyToLoad(urls, "origin")?.then((data)=>{
            emitter.emit("showRegBtnToRight",{maskNrrdMeshes:data.meshes[1], maskSlices:data.slices[1],url:urls[1],register:state.showRegisterImages})
          });
        }
        
      }else{        
        if(defaultRegAllSlices.length>0){
          allSlices = [...defaultRegAllSlices];
          allLoadedMeshes = [...defaultRegAllMeshes];
          emitter.emit("showRegBtnToRight",{maskNrrdMeshes:defaultRegAllMeshes[1],maskSlices:defaultRegAllSlices[1], url:urls[1], register:state.showRegisterImages})
          filesCount.value = 5;
          return;
        }
        if (caseUrls.value) {
          urls = caseUrls.value.nrrdUrls;
          readyToLoad(urls, "registration");
        }
      }
  })
  optsGui.add(state, "release");
  optsGui.closed = false;
}

function switchRegCheckBoxStatus(checkbox:HTMLElement, pointerEvents:"none"|"auto", opacity:"0.5"|"1" ){

  const inputBox = checkbox.childNodes[0] as HTMLInputElement
  inputBox.disabled = !inputBox.disabled;
  inputBox.readOnly = !inputBox.readOnly;
  checkbox.style.pointerEvents = pointerEvents;
  checkbox.style.opacity = opacity;

}

</script>

<style>
#bg {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  /* border: 1px solid palevioletred; */
}
#gui {
  /* position: fixed; */
  position: absolute;
  top: 0;
  right: 0;
  z-index: 100;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
.nrrd_c {
  /* position: fixed; */
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.navBar{
  position: fixed;
  bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60%;
}

.copper3d_sliceNumber {
  /* position: fixed !important; */
  position: relative;
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
