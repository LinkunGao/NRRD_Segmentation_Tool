import { defineStore } from "pinia";
import { ref } from "vue";
import {
  useNrrdCaseNames,
  useInitMasks,
  useNrrdCase,
  useReplaceMask,
  useSaveMasks,
  useMask,
  useMaskNrrd,
  useMaskObjMesh,
  useClearMaskMesh,
  useNrrdRegisterCase,
  useNrrdOriginCase
} from "@/utils/api";
import {
  INrrdCaseNames,
  IExportMask,
  ICaseUrls,
  ICaseRegUrls,
  IExportMasks,
  IReplaceMask,
  IMaskMesh,
  IRegRquest,
} from "@/models/dataType";
import { type } from "os";

export const useFileCountStore = defineStore("filesCount", () => {
  const cases = ref<INrrdCaseNames>();
  const getFilesNames = async () => {
    cases.value = await useNrrdCaseNames();
  };
  return {
    cases,
    getFilesNames,
  };
});

export const useNrrdCaseUrlsStore = defineStore("getCaseFiles", () => {
  const caseUrls = ref<ICaseUrls>();
  const getCaseFileUrls = async (name: string) => {
    caseUrls.value = await useNrrdCase(name);
  };

  return {
    caseUrls,
    getCaseFileUrls,
  };
});

export const useRegNrrdUrlsStore = defineStore("getRegNrrdFiles", () => {
  const regUrls = ref<ICaseRegUrls>();
  const getRegNrrdUrls = async (requestInfo:IRegRquest) => {
    regUrls.value = await useNrrdRegisterCase(requestInfo);
  };

  return {
    regUrls,
    getRegNrrdUrls,
  };
});

export const useOriginNrrdUrlsStore = defineStore("getOriginNrrdFiles", () => {
  const originUrls = ref<ICaseRegUrls>();
  const getOriginNrrdUrls = async (name: string) => {
    originUrls.value = await useNrrdOriginCase(name);
  };

  return {
    originUrls,
    getOriginNrrdUrls,
  };
});

export const useInitMarksStore = defineStore("initMasks", () => {
  const success = ref<boolean>(false);
  const sendInitMask = async (body: IExportMasks) => {
    success.value = await useInitMasks(body);
  };

  return {
    success,
    sendInitMask,
  };
});

export const useReplaceMarksStore = defineStore("replaceMask", () => {
  const success = ref<boolean>(false);
  const sendReplaceMask = async (body: IReplaceMask) => {
    success.value = await useReplaceMask(body);
  };

  return {
    success,
    sendReplaceMask,
  };
});

export const useSaveMasksStore = defineStore("saveMasks", () => {
  const success = ref<boolean>(false);
  const sendSaveMask = async (name: string) => {
    success.value = await useSaveMasks(name);
  };
  return {
    success,
    sendSaveMask,
  };
});

export const useMaskStore = defineStore("getMasks", () => {
  const maskBackend = ref<string>();
  const getMaskDataBackend = async (name: string) => {
    maskBackend.value = (await useMask(name)) as string;
  };
  return {
    maskBackend,
    getMaskDataBackend,
  };
});

export const useMaskNrrdStore = defineStore("getMaskNrrd",()=>{
  const maskNrrd = ref<string>();
  const getMaskNrrd =async (name:string) => {
    maskNrrd.value = (await useMaskNrrd(name)) as string
  };
  return {
    maskNrrd,
    getMaskNrrd
  }
})

export const useMaskMeshObjStore = defineStore("getMaskMesh",()=>{
  
  const maskMeshObj = ref<IMaskMesh>({});
  const getMaskMeshObj =async (name:string) => {
    maskMeshObj.value = (await useMaskObjMesh(name)) as IMaskMesh
  };
  return {
    maskMeshObj,
    getMaskMeshObj
  }
})

export const useClearMaskMeshStore = defineStore("clearMaskMesh",()=>{
  const clearMeshResult = ref<string>();
  const clearMaskMeshObj =async (name:string) => {
    clearMeshResult.value = (await useClearMaskMesh(name)) as string
  };
  return {
    clearMeshResult,
    clearMaskMeshObj
  }
})