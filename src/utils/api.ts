import http from "./http";
import {
  INrrdCaseNames,
  IExportMask,
  ICaseUrls,
  IExportMasks,
  IReplaceMask,
} from "@/models/dataType";
import JSZip from "jszip";

export async function useNrrdCaseNames() {
  const count = http.get<INrrdCaseNames>("/cases");
  return count;
}

export async function useNrrdCase(name: string): Promise<ICaseUrls> {
  return new Promise((resolve, reject) => {
    let urls: ICaseUrls = { nrrdUrls: [], jsonUrl: "" };
    http.getZip("/case", { name }).then((zipBlob) => {
      const zip = new JSZip();
      // Extract the contents of the zip archive
      zip.loadAsync(zipBlob as any).then((contents) => {
        const nrrdNames = [];
        let jsonName = "";
        for (let prop in contents.files) {
          if (prop.includes(".nrrd")) {
            nrrdNames.push(prop);
          } else if (prop.includes(".json")) {
            jsonName = prop;
          }
        }

        const promises: any = [];
        nrrdNames.forEach((name) => {
          const file = contents.files[name];
          promises.push(file.async("arraybuffer"));
        });
        if (jsonName !== "") {
          const file = contents.files[jsonName];
          promises.push(file.async("arraybuffer"));
        }
        Promise.all(promises)
          .then((values) => {
            values.forEach((item, index) => {
              if (jsonName !== "" && index === values.length - 1) {
                urls.jsonUrl = URL.createObjectURL(new Blob([item]));
              } else {
                urls.nrrdUrls.push(URL.createObjectURL(new Blob([item])));
              }
            });

            resolve(urls);
          })
          .catch((err) => {
            reject(err);
          });
      });
    });
  });
}

export async function useInitMasks(body: IExportMasks) {
  const success = http.post<boolean>("/mask/init", body);
  return success;
}

export async function useReplaceMask(body: IReplaceMask) {
  const success = http.post<boolean>("/mask/replace", body);
  return success;
}
