import http from "./http";
import { INrrds, IExportMask } from "@/models/dataType";

export async function useNrrdFilesCount() {
  const count = http.get<INrrds>("/total_nrrds");

  return count;
}

export async function useSendMarks(body: IExportMask) {
  const success = http.post<boolean>("/save_mask", body);
  return success;
}
