<template>
  <div id="bg_2" ref="bg">
    <div v-show="openLoading" ref="loading_c" class="loading"></div>
    <div class="value-panel">
      <div><span>Tumour volume:</span> <span>{{ volume }} cm<sup>3</sup></span></div>
      <div><span>Tumour extent:</span> <span>71 mm</span></div>
      <div class="skin"><span>Skin:</span> <span>27 mm</span></div>
      <div class="ribcage"><span>Ribcage:</span> <span>36 mm</span></div>
      <div class="nipple"><span>Nipple:</span> <span>{{ nippleDist }} mm</span></div>
      <div class="nipple"><span></span> <span>{{ nippleClock }}</span></div>
    </div>
    <div ref="c_gui" id="gui"></div>
    <!-- <button class="btn" @click="getMaskNrrdHandle">load mask</button> -->
    <Drawer @on-view-single-click="handleViewSigleClick" @on-view-double-click="handleViewsDoubleClick"/>
  </div>
</template>

<script setup lang="ts">
import { GUI } from "dat.gui";
import * as THREE from "three";
import * as Copper from "copper3d";
import createKDTree from "copper3d-tree";
import "copper3d/dist/css/style.css";
// import * as Copper from "@/ts/index"
import { getCurrentInstance, onMounted, ref, onBeforeUnmount } from "vue";
import Drawer from "@/components/drawer.vue";
import emitter from "@/utils/bus";
import { storeToRefs } from "pinia";
import {
  useMaskNrrdStore,
  useMaskMeshObjStore,
  useNipplePointsStore
} from "@/store/pinia_store";
import {
  ICaseDetails,
  ISliceIndex,
  ILeftRightData,
  INipplePoints
} from "@/models/dataType"
import {findCurrentCase, transformMeshPointToImageSpace,getClosestNipple} from "../../tools";
import {PanelOperationManager, valideClock, deepClone} from "./utils-right";

let refs = null;
let bg= ref<HTMLDivElement>();
let appRenderer: Copper.copperRenderer;
let panelOperator:PanelOperationManager;
let c_gui: HTMLDivElement = ref<any>(null);
let loading_c = ref<HTMLDivElement>();
let loadBar1: Copper.loadingBarType;
let casename: string
let allRightPanelMeshes: Array<THREE.Object3D> = []
let loadNrrdMeshes:Copper.nrrdMeshesType;
let loadNrrdSlices: Copper.nrrdSliceType;
let registrationMeshes: Copper.nrrdMeshesType|undefined;
let registrationSlices: Copper.nrrdSliceType|undefined;
let originMeshes: Copper.nrrdMeshesType|undefined;
let originSlices: Copper.nrrdSliceType|undefined;
let copperScene: Copper.copperScene;
let socket = new WebSocket("ws://127.0.0.1:8000/ws");
let preObjModelUrl:string|undefined = undefined;
let loadBarMain: Copper.loadingBarType;
let loadingContainer: HTMLDivElement;
let timer:NodeJS.Timer
let openLoading = ref(false);
let volume = ref(0);
let nippleDist = ref("L: 0");
let nippleClock = ref("@ 0:0");
let tumourCenter;
let nippleCentralLimit = 10;
let nippleTl:number[] = [];
let nippleTr:number[] = [];
let tumourSliceIndex:ISliceIndex = {
  x:0,
  y:0,
  z:0
}
let recordSliceIndex:ISliceIndex = {
  x:0,
  y:0,
  z:0
}
let guiState = {
  Sagittal: true,
  Axial: true,
  Coronal: true
}

// for deal with single/double click on a div
let clickCount = 0;
let clickTimer:any = null;
let validFlag = false;

const { maskNrrd } = storeToRefs(useMaskNrrdStore());
const { getMaskNrrd } = useMaskNrrdStore();
const { maskMeshObj } = storeToRefs(useMaskMeshObjStore());
const { getMaskMeshObj } = useMaskMeshObjStore();
const {nipplePoints} = storeToRefs(useNipplePointsStore());
const {getNipplePoints} = useNipplePointsStore();

onMounted(() => {
  let { $refs } = (getCurrentInstance() as any).proxy;
  refs = $refs;
  // bg = refs.base_container_2;
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
        volume.value = Math.ceil(volumeJson.volume)/1000;
      }
      clearInterval(timer as NodeJS.Timer)
    }else{
      const blob = new Blob([event.data], {type:"model/obj"});
      const url = URL.createObjectURL(blob);
      maskMeshObj.value.maskMeshObjUrl = url;
     
      loadNrrd(maskNrrd.value as string, maskMeshObj.value.maskMeshObjUrl as string, c_gui);
      loadingContainer.style.display = "none";

      if(typeof preObjModelUrl === "string"){
      URL.revokeObjectURL(preObjModelUrl)
      preObjModelUrl = url;
    }
    }
    openLoading.value = false;
  }

  appRenderer = new Copper.copperRenderer(bg.value as HTMLDivElement, {guiOpen:false, logarithmicDepthBuffer:true});
  panelOperator = new PanelOperationManager(bg.value as HTMLDivElement);


  loadBar1 = Copper.loading();

  // appRenderer.container.appendChild(loadBar1.loadingContainer);

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
    // await getMaskNrrd(casename);
    maskNrrd.value = case_infos.maskNrrd;
    
    if(case_detail.has_mesh){
      await getMaskMeshObj(casename);
      
      volume.value = Math.ceil(maskMeshObj.value.meshVolume as number)/1000;
      loadNrrd(maskNrrd.value as string, maskMeshObj.value.maskMeshObjUrl as string, c_gui);

      preObjModelUrl = maskMeshObj.value.maskMeshObjUrl;
      
      // loadNrrd(maskNrrd.value as string, "/NRRD_Segmentation_Tool/mesh_spacing.obj" as string, c_gui);
    }else{
      loadNrrd(maskNrrd.value as string,"", c_gui);
      initPanelValue()
    } 
  })

  emitter.on("showRegBtnToRight",(data)=>{
    const res = data as ILeftRightData;
    // removeOldMeshes([nrrdMeshes.x, nrrdMeshes.y, nrrdMeshes.z]);
    
    const recordSliceIndex = {
      x:loadNrrdSlices.x.index,
      y:loadNrrdSlices.y.index,
      z:loadNrrdSlices.z.index,
    }
    
    if(originMeshes === undefined && originSlices ===undefined){
      copperScene.loadNrrd(
        res.url, 
        loadBar1, 
        true, 
        ( volume: any,
          nrrdMesh: Copper.nrrdMeshesType,
          nrrdSlices: Copper.nrrdSliceType,)=>{
            nrrdMesh.x.name = "origin sagittal";
            nrrdMesh.y.name = "origin coronal";
            nrrdMesh.z.name = "origin axial";
            originMeshes = nrrdMesh;
            originSlices = nrrdSlices;
            allRightPanelMeshes.push(...[originMeshes.x,originMeshes.y,originMeshes.z]);
            if(registrationMeshes)
              copperScene.scene.remove(...[registrationMeshes.x,registrationMeshes.y,registrationMeshes.z])
            loadNrrdMeshes = originMeshes as Copper.nrrdMeshesType;
            loadNrrdSlices = originSlices as Copper.nrrdSliceType;
            resetSliceIndex(recordSliceIndex)
            copperScene.scene.add(...[loadNrrdMeshes.x, loadNrrdMeshes.y, loadNrrdMeshes.z])
      },
      {
        openGui: false,
      });
    }else{
      if(res.register){
        if(originMeshes)
          copperScene.scene.remove(...[originMeshes.x,originMeshes.y,originMeshes.z])
        loadNrrdMeshes = registrationMeshes as Copper.nrrdMeshesType;
        loadNrrdSlices = registrationSlices as Copper.nrrdSliceType;
      }else{
        if(registrationMeshes)
          copperScene.scene.remove(...[registrationMeshes.x,registrationMeshes.y,registrationMeshes.z])
        loadNrrdMeshes = originMeshes as Copper.nrrdMeshesType;
        loadNrrdSlices = originSlices as Copper.nrrdSliceType;
      }  
      resetSliceIndex(recordSliceIndex)
      copperScene.scene.add(...[loadNrrdMeshes.x, loadNrrdMeshes.y, loadNrrdMeshes.z])
    }

    
    
    // nrrdMeshes = res.maskNrrdMeshes as Copper.nrrdMeshesType;
    // copperScene.scene.add(...[nrrdMeshes.x, nrrdMeshes.y, nrrdMeshes.z]);
    // const updateIndex:ISliceIndex = {
    //   x:loadNrrdSlices.x.index,
    //   y:loadNrrdSlices.y.index,
    //   z:loadNrrdSlices.z.index
    // }
    // console.time()
    // loadNrrdSlices = deepClone(res.maskSlices);
    // console.log(loadNrrdSlices);
    // console.timeEnd()
    // resetSliceIndex(updateIndex)

  })
  appRenderer.animate();
});

onBeforeUnmount(()=>{
  if(typeof preObjModelUrl == "string"){
        URL.revokeObjectURL(preObjModelUrl)
      }
})
// async function getMaskNrrdHandle() {
//   if (casename) {
//     await getMaskNrrd(casename);
//     loadNrrd(maskNrrd.value as string,"/NRRD_Segmentation_Tool/mask.obj", c_gui);
//   }
// }

function initPanelValue(){
  volume.value = 0;
  nippleDist.value = "L 0";
  nippleClock.value =  "@ 0:0";
}

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

    // config controls
    const controls = copperScene.controls as Copper.Copper3dTrackballControls
    // controls.noPan = true;
    controls.mouseButtons = {
      LEFT:THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.ROTATE,
      RIGHT: THREE.MOUSE.PAN
    }
    controls.rotateSpeed = 3.0;

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
  removeOldMeshes(allRightPanelMeshes);
  registrationMeshes = undefined;
  originMeshes = undefined;
  registrationSlices = undefined;
  originSlices = undefined;

  // remove GUI
  const opts: Copper.optsType = {
    openGui: false,
    // container: c_gui,
  };
  if (!!copperScene) {
    const nrrdCallback = async (
    volume: any,
    nrrdMesh: Copper.nrrdMeshesType,
    nrrdSlices: Copper.nrrdSliceType,
    gui?: GUI
  ) => {

      // volume.windowHigh = 2000;
      // volume.windowLow = 82;
      // volume.repaintAllSlices();


      const origin = volume.header.space_origin.map((num:any)=>Number(num));
      const spacing = volume.spacing;
      const ras = volume.RASDimensions; // mm
      const dimensions = volume.dimensions; // pixels
      
      const x_bias = - ( origin[0] * 2 + ras[0] ) / 2;
      const y_bias = - ( origin[1] * 2 + ras[1] ) / 2;
      const z_bias = - ( origin[2] * 2 + ras[2] ) / 2;

      // createOriginSphere(origin,ras,spacing,x_bias,y_bias,z_bias);
      loadNrrdMeshes = registrationMeshes = nrrdMesh;
      loadNrrdSlices = registrationSlices = nrrdSlices;
      const bias = new THREE.Vector3(x_bias,y_bias,z_bias);

      nrrdMesh.x.visible = guiState.Sagittal;
      nrrdMesh.y.visible = guiState.Coronal;
      nrrdMesh.z.visible = guiState.Axial;
      nrrdMesh.x.name = "Sagittal";
      nrrdMesh.y.name = "Cornal";
      nrrdMesh.z.name = "Axial";
      copperScene.addObject(nrrdMesh.x);
      copperScene.addObject(nrrdMesh.y);
      copperScene.addObject(nrrdMesh.z);
      allRightPanelMeshes.push(nrrdMesh.x,nrrdMesh.y,nrrdMesh.z)
      copperScene.controls.rotateSpeed = 3.5;
      copperScene.controls.panSpeed = 0.5;
      
  
      if(url_1){
        copperScene.loadOBJ(url_1, (content)=>{
          allRightPanelMeshes.push(content)
          
          content.position.set(bias.x,bias.y, bias.z);
          const tumourMesh = content.children[0] as THREE.Mesh;
          const tumourMaterial = tumourMesh.material as THREE.MeshStandardMaterial;
          // tumourMaterial.color = new THREE.Color("green");
    
          tumourMesh.renderOrder = 1;
          loadNrrdMeshes.z.renderOrder = 2;
          
          const box = new THREE.Box3().setFromObject(content);
          const size = box.getSize(new THREE.Vector3()).length();
          tumourCenter = box.getCenter(new THREE.Vector3());
          
          // reset nrrd slice
          nrrdSlices.x.index = tumourSliceIndex.x = nrrdSlices.x.RSAMaxIndex/2 + tumourCenter.x;
          nrrdSlices.y.index = tumourSliceIndex.y = nrrdSlices.y.RSAMaxIndex/2 + tumourCenter.y;
          nrrdSlices.z.index = tumourSliceIndex.z = nrrdSlices.z.RSAMaxIndex/2 + tumourCenter.z;
          nrrdSlices.x.repaint.call(nrrdSlices.x);
          nrrdSlices.y.repaint.call(nrrdSlices.y);
          nrrdSlices.z.repaint.call(nrrdSlices.z);
          
          
          loadBreastModel(gui as GUI, origin, spacing,dimensions,bias,tumourCenter,nrrdMesh)
        })
      }else{
        loadBreastModel(gui as GUI, origin, spacing,dimensions,bias)
      }
    };

    (copperScene as Copper.copperScene).loadNrrd(url, loadBar1, true, nrrdCallback, opts);
  }
}



async function loadBreastModel(guiControl:GUI, origin:number[], spacing:number[],dimensions:number[],bias:THREE.Vector3, tumourCenter?:THREE.Vector3,nrrdMesh?: Copper.nrrdMeshesType){
  const geometryR = new THREE.SphereGeometry(5, 32, 16);
  const geometryL = new THREE.SphereGeometry(5, 32, 16);
  const material = new THREE.MeshBasicMaterial({color:"hotpink"});
  const sphereL = new THREE.Mesh(geometryL, material);
  const sphereR = new THREE.Mesh(geometryR, material);

   //  todo load nipple data
  await getNipplePoints(casename)
  const nippleResult = !!nipplePoints.value
      
  if(nippleResult){
      const nipples = nipplePoints.value as INipplePoints
      const l =nipples.nodes.left_nipple;
            const r =  nipples.nodes.right_nipple;
            const nipplesPos = [l,r];   
            
            nippleTl = transformMeshPointToImageSpace(nipplesPos[0], origin, spacing, dimensions, bias);
            nippleTr = transformMeshPointToImageSpace(nipplesPos[1], origin, spacing, dimensions, bias);
        
        if(!!tumourCenter){
          // const nippleTree = createKDTree(nipplesPos);
          // const idx = nippleTree.nn([tumourCenter.x,tumourCenter.y,tumourCenter.z])
          // console.log(idx);
          const nippleLeft = new THREE.Vector3(nippleTl[0],nippleTl[1],nippleTl[2]);
          const nippleRight = new THREE.Vector3(nippleTr[0],nippleTr[1],nippleTr[2]);
          const clockInfo =  getClosestNipple(nippleLeft,nippleRight,tumourCenter);
          
          nippleDist.value = clockInfo.dist;
          console.log( clockInfo.radial_distance, nippleCentralLimit);
          
          if(clockInfo.radial_distance < nippleCentralLimit){
            nippleClock.value = "central";
          }else{
            nippleClock.value = "@ "+ clockInfo.timeStr
          }
        }

        
        // valide(tl,tr,nrrdMesh)
        sphereL.position.set( nippleTl[0], nippleTl[1], nippleTl[2]);
        sphereR.position.set( nippleTr[0], nippleTr[1], nippleTr[2]);

        copperScene.addObject(sphereR)
        copperScene.addObject(sphereL)

        allRightPanelMeshes.push(sphereL)
        allRightPanelMeshes.push(sphereR)
  } 
}

function removeOldMeshes(meshSet:THREE.Object3D<THREE.Event>[]){
  if(!!copperScene){
    (copperScene as Copper.copperScene).scene.remove(...meshSet);
    meshSet.forEach(element => {
      element.traverse((case_mesh)=>{
        if((case_mesh as THREE.Mesh).isMesh){
          (case_mesh as THREE.Mesh).geometry.dispose();
        }
      })
    });
    meshSet.length = 0; 
   }
}


const resetSliceIndex = (sliceIndex:ISliceIndex) => {
  loadNrrdSlices.x.index = sliceIndex.x;
  loadNrrdSlices.y.index = sliceIndex.y;
  loadNrrdSlices.z.index = sliceIndex.z;
  loadNrrdSlices.x.repaint.call(loadNrrdSlices.x);
  loadNrrdSlices.y.repaint.call(loadNrrdSlices.y);
  loadNrrdSlices.z.repaint.call(loadNrrdSlices.z);
}

const resetNrrdImage = ()=>{
  panelOperator.dispose();
  copperScene.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view.json");
  loadNrrdMeshes.x.visible = true;
  loadNrrdMeshes.y.visible = true;
  loadNrrdMeshes.z.visible = true;
  valideClock(false,copperScene, bg.value as HTMLElement);
  copperScene.controls.reset();
  copperScene.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  resetSliceIndex(tumourSliceIndex);
}



const handleViewSigleClick = (view:string)=>{
  panelOperator.start()
  copperScene.controls.mouseButtons.LEFT = -1;
  clickCount ++;
  if(clickCount===1){
    clickTimer = setTimeout(()=>{
      switch (view) {
        case "sagittal":
          loadNrrdMeshes.x.visible = true;
          loadNrrdMeshes.y.visible = false;
          loadNrrdMeshes.z.visible = false;
          panelOperator.setSlicePrams(loadNrrdSlices.x);
          break;
        case "axial":
          loadNrrdMeshes.x.visible = false;
          loadNrrdMeshes.y.visible = false;
          loadNrrdMeshes.z.visible = true;
          panelOperator.setSlicePrams(loadNrrdSlices.z);
          break;
        case "coronal":
          loadNrrdMeshes.x.visible = false;
          loadNrrdMeshes.y.visible = true;
          loadNrrdMeshes.z.visible = false;
          panelOperator.setSlicePrams(loadNrrdSlices.y);
          break;
        case "clock":
          validFlag = !validFlag;
          valideClock(validFlag,copperScene, bg.value as HTMLElement, nippleTl,nippleTr,loadNrrdMeshes);
          break;
        case "reset":
          resetNrrdImage();
          break;
      }
      clickCount=0  
    },200)
  }
  
}

const handleViewsDoubleClick = (view:string)=>{
  !!clickTimer && clearTimeout(clickTimer);
  clickCount = 0;
  copperScene.controls.mouseButtons.LEFT = -1;
  copperScene.controls.reset();
  switch (view) {
    case "sagittal":
      loadNrrdMeshes.x.visible = true;
      loadNrrdMeshes.y.visible = false;
      loadNrrdMeshes.z.visible = false;
      panelOperator.setSlicePrams(loadNrrdSlices.x);
      copperScene.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view_sagittal.json");
      break;
    
    case "axial":
      loadNrrdMeshes.x.visible = false;
      loadNrrdMeshes.y.visible = false;
      loadNrrdMeshes.z.visible = true;
      panelOperator.setSlicePrams(loadNrrdSlices.z);
      copperScene.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view.json");
      break;
  
    case "coronal":
      loadNrrdMeshes.x.visible = false;
      loadNrrdMeshes.y.visible = true;
      loadNrrdMeshes.z.visible = false;
      panelOperator.setSlicePrams(loadNrrdSlices.y);
      copperScene.loadViewUrl("/NRRD_Segmentation_Tool/nrrd_view_coronal.json");
      break;
  } 
}
</script>

<style scoped>
#bg_2 {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
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
  left: 0px;
  top: 0px;
  width: 200px;
  height: 150px;
  background-color: rgba(0, 0, 0, 0.7);
  border: 1px solid black;
  border-radius: 10px;
  padding: 10px 15px;
  font-size: smaller;
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
