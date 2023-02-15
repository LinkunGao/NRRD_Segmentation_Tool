import { defineStore } from "pinia";
import { ref } from "vue";
import { useNrrdFilesCount, useSendMarks } from "@/utils/api";
import { INrrds, IExportMask } from "@/models/dataType";

export const useFileCountStore = defineStore("filesCount", () => {
  const count = ref<INrrds>({});
  const getFilesCountNum = async () => {
    count.value = await useNrrdFilesCount();
  };

  return {
    count,
    getFilesCountNum,
  };
});

export const useSendMarksStore = defineStore("sendMasks", () => {
  const success = ref<boolean>(false);
  const sendmaksApi = async (body: IExportMask) => {
    success.value = await useSendMarks(body);
  };

  return {
    success,
    sendmaksApi,
  };
});
