import { defineStore } from "pinia";
import { ref } from "vue";
import {
  useNrrdCaseNames,
  useInitMasks,
  useNrrdCase,
  useReplaceMask,
} from "@/utils/api";
import {
  INrrdCaseNames,
  IExportMask,
  ICaseUrls,
  IExportMasks,
  IReplaceMask,
} from "@/models/dataType";

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
