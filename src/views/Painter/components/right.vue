<template>
  <div id="bg_2" ref="base_container_2">
    <div v-show="openLoading" ref="loading_c" class="loading"></div>
    <div class="value-panel">
      <div><span>Tumuor volume:</span> <span>{{ volume }}</span></div>
      <div><span>Tumuor extent:</span> <span>71</span></div>
      <div class="skin"><span>Skin:</span> <span>27 mm</span></div>
      <div class="ribcage"><span>Ribcage:</span> <span>36 mm</span></div>
      <div class="nipple"><span>Nipple:</span> <span>L: 53 mm</span></div>
    </div>
    <div ref="c_gui" id="gui"></div>
    <!-- <button class="btn" @click="getMaskNrrdHandle">load mask</button> -->
  </div>
</template>

<script setup lang="ts">
import { GUI } from "dat.gui";
import * as THREE from "three";
import * as Copper from "copper3d_visualisation";
import "copper3d_visualisation/dist/css/style.css";
// import * as Copper from "@/ts/index"
import { getCurrentInstance, onMounted, ref } from "vue";
import emitter from "@/utils/bus";
import { storeToRefs } from "pinia";
import {
  useMaskNrrdStore,
  useMaskMeshObjStore
} from "@/store/pinia_store";
import {
  ICaseDetails
} from "@/models/dataType"
import {findCurrentCase} from "../tools"
let refs = null;
let bg: HTMLDivElement = ref<any>(null);
let appRenderer: Copper.copperRenderer;
let c_gui: HTMLDivElement = ref<any>(null);
let loading_c = ref<HTMLDivElement>();
let loadBar1: Copper.loadingBarType;
let casename: string
let oldMeshes: Array<THREE.Object3D> = []
let copperScene: Copper.copperScene
let socket = new WebSocket("ws://127.0.0.1:8000/ws");
let loadBarMain: Copper.loadingBarType;
let loadingContainer: HTMLDivElement;
let timer:NodeJS.Timer
let openLoading = ref(false);
let volume = ref(0)
let guiState = {
  Sagittal: true,
  Axial: true,
  Coronal: true
}

const { maskNrrd } = storeToRefs(useMaskNrrdStore());
const { getMaskNrrd } = useMaskNrrdStore();
const { maskMeshObj } = storeToRefs(useMaskMeshObjStore());
const { getMaskMeshObj } = useMaskMeshObjStore();

onMounted(() => {
  let { $refs } = (getCurrentInstance() as any).proxy;
  refs = $refs;
  bg = refs.base_container_2;
  c_gui = refs.c_gui;

  loadBarMain = Copper.loading();

  loadingContainer = loadBarMain.loadingContainer;
  (loading_c.value as HTMLDivElement).appendChild(loadingContainer);
  
  socket.onopen = function (e){
    console.log("socket send...");
    socket.send("Frontend socket connect!")
  }
  
  socket.onmessage = function (event){
    if(typeof event.data === "string"){
      if(event.data === "delete"){
        volume.value = 0;
        loadNrrd(maskNrrd.value as string,"", c_gui);
      }else{
        const volumeJson = JSON.parse(event.data)
        volume.value = Math.ceil(volumeJson.volume)
      }
      clearInterval(timer as NodeJS.Timer)
    }else{
      const blob = new Blob([event.data], {type:"model/obj"})
      const url = URL.createObjectURL(blob)
      maskMeshObj.value.maskMeshObjUrl = url
      loadNrrd(maskNrrd.value as string, maskMeshObj.value.maskMeshObjUrl as string, c_gui);
      loadingContainer.style.display = "none";
    }
    openLoading.value = false;
    
  }

  appRenderer = new Copper.copperRenderer(bg);

  loadBar1 = Copper.loading();

  appRenderer.container.appendChild(loadBar1.loadingContainer);

  initScene("display_nrrd");

  emitter.on("saveMesh", ()=>{
    loadingContainer.style.display = "flex";
    openLoading.value = true;
    timer = requestUpdateMesh()
  })

  emitter.on("casename", async (case_details) => {
    const case_infos:ICaseDetails = (case_details as ICaseDetails)
    const case_detail = findCurrentCase(
        case_infos.details,
        case_infos.currentCaseId
      );
    
    casename = case_infos.currentCaseId;
    await getMaskNrrd(casename);
    if(case_detail.has_mesh){
      await getMaskMeshObj(casename);
      volume.value = Math.ceil(maskMeshObj.value.meshVolume as number)
      loadNrrd(maskNrrd.value as string, maskMeshObj.value.maskMeshObjUrl as string, c_gui);
      // loadNrrd(maskNrrd.value as string, "/NRRD_Segmentation_Tool/mesh_spacing.obj" as string, c_gui);
    }else{
      loadNrrd(maskNrrd.value as string,"", c_gui);
    } 
  })
  appRenderer.animate();
});

// async function getMaskNrrdHandle() {
//   if (casename) {
//     await getMaskNrrd(casename);
//     loadNrrd(maskNrrd.value as string,"/NRRD_Segmentation_Tool/mask.obj", c_gui);
//   }
// }

function requestUpdateMesh(){
 const intervalId = setInterval(()=>{
    socket.send("Frontend socket connect!")
  }, 1000);
 return intervalId
}

function initScene(name:string){
  copperScene = appRenderer.getSceneByName(name) as Copper.copperScene;
  if (copperScene == undefined) {
    copperScene = appRenderer.createScene(name) as Copper.copperScene;
    appRenderer.setCurrentScene(copperScene);
    copperScene.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view.json");
      emitter.on("resize", () => {
        copperScene?.onWindowResize();
      });
      copperScene.updateBackground("#8b6d96", "#18e5e5");
    Copper.setHDRFilePath("venice_sunset_1k.hdr");
    appRenderer.updateEnvironment();
  }
}


function loadNrrd(url: string,url_1:string, c_gui: any) {
  removeOldMeshes()
    const opts: Copper.optsType = {
      openGui: true,
      container: c_gui,
    };
    if (!!copperScene) {
      const nrrdCallback = (
      volume: any,
      nrrdMesh: Copper.nrrdMeshesType,
      nrrdSlices: Copper.nrrdSliceType,
      gui?: GUI
    ) => {

        const origin = volume.header.space_origin.map((num:any)=>Number(num));
        const spacing = volume.spacing;
        const ras = volume.RASDimensions;
        
        
        const x_bias = - ( origin[0] * 2 + ras[0] ) / 2;
        const y_bias = - ( origin[1] * 2 + ras[1] ) / 2;
        const z_bias = - ( origin[2] * 2 + ras[2] ) / 2;
        (gui as GUI).closed = true;
        gui?.add(guiState, "Axial").onChange((flag)=>{
          nrrdMesh.z.visible = flag
        })
        gui?.add(guiState, "Sagittal").onChange((flag)=>{
          nrrdMesh.x.visible = flag
        })
        gui?.add(guiState, "Coronal").onChange((flag)=>{
          nrrdMesh.y.visible = flag
        })
        nrrdMesh.x.visible = guiState.Sagittal;
        nrrdMesh.y.visible = guiState.Coronal;
        nrrdMesh.z.visible = guiState.Axial;
        copperScene.addObject(nrrdMesh.x);
        copperScene.addObject(nrrdMesh.y);
        copperScene.addObject(nrrdMesh.z);
        oldMeshes.push(nrrdMesh.x,nrrdMesh.y,nrrdMesh.z)
        copperScene.controls.rotateSpeed = 1.5;
    
        if(url_1){
          copperScene.loadOBJ(url_1, (content)=>{
            oldMeshes.push(content)
            content.position.set(x_bias, y_bias, z_bias);
            
           
            content.position.set(x_bias, y_bias, z_bias);
            const box = new THREE.Box3().setFromObject(content);
            const size = box.getSize(new THREE.Vector3()).length();
            const center = box.getCenter(new THREE.Vector3());
            
            // reset nrrd slice
            nrrdSlices.x.index = nrrdSlices.x.RSAMaxIndex/2 + center.x
            nrrdSlices.y.index = nrrdSlices.y.RSAMaxIndex/2 + center.y
            nrrdSlices.z.index = nrrdSlices.z.RSAMaxIndex/2 + center.z
            nrrdSlices.x.repaint.call(nrrdSlices.x);
            nrrdSlices.y.repaint.call(nrrdSlices.y);
            nrrdSlices.z.repaint.call(nrrdSlices.z);
            
            // bg.onclick = (ev)=>{
            //   const x = ev.offsetX;
            //   const y = ev.offsetY;
            //   const p = copperScene.pickSpecifiedModel([nrrdMesh.x,nrrdMesh.y,nrrdMesh.z],{x,y})
            //   console.log(p);
              
            // }

          })
        }
      };

      (copperScene as Copper.copperScene).loadNrrd(url, loadBar1,true, nrrdCallback, opts);
    }
}

function removeOldMeshes(){
  if(!!copperScene){
    (copperScene as Copper.copperScene).scene.remove(...oldMeshes)
  }
}
</script>

<style scoped>
#bg_2 {
  width: 100%;
  height: 100%;
  position: relative;
  /* overflow: hidden;
  position: relative; */
}
#gui {
  position: absolute;
  top: 0;
  right: 0;
}

.loading {
  /* position: fixed; */
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.value-panel {
  position: absolute;
  width: 200px;
  height: 130px;
  background-color: rgba(0, 0, 0, 0.7);
  border: 1px solid black;
  border-radius: 10px;
  padding: 10px 15px;
  /* display: flex; */
  /* align-items: center; */
  /* justify-content: center; */
}
.value-panel > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.skin{
  color: yellow;
}
.ribcage{
  color: darkcyan;
}
.nipple{
  color: hotpink;
}

.btn {
  position: absolute;
  bottom: 10px;
  right: 20px;
}
button {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100px;
  border-radius: 2px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;

  background-color: #f9f9f9;
  cursor: pointer;
  transition: border-color 0.25s;
  z-index: 999;
}
button:hover {
  border-color: #646cff;
  background-color: rgba(0, 0, 0, 0.1);
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}
</style>
