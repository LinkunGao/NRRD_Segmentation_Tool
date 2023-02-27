import { defineStore } from "pinia";
import { ref } from "vue";
import { useNrrdCaseNames, useInitMarks, useNrrdCase } from "@/utils/api";
import {
  INrrdCaseNames,
  IExportMask,
  ICaseUrls,
  IExportMasks,
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
  const caseUrls = ref<ICaseUrls>([]);
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
    success.value = await useInitMarks(body);
  };

  return {
    success,
    sendInitMask,
  };
});
