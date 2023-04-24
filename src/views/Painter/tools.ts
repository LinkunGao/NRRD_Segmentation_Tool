import { ILoadUrls } from "@/models/dataType";
import eraser_1 from "@/assets/eraser/circular-cursor_3.png";
import eraser_2 from "@/assets/eraser/circular-cursor_8.png";
import eraser_3 from "@/assets/eraser/circular-cursor_13.png";
import eraser_4 from "@/assets/eraser/circular-cursor_18.png";
import eraser_5 from "@/assets/eraser/circular-cursor_23.png";
import eraser_6 from "@/assets/eraser/circular-cursor_28.png";
import eraser_7 from "@/assets/eraser/circular-cursor_33.png";
import eraser_8 from "@/assets/eraser/circular-cursor_38.png";
import eraser_9 from "@/assets/eraser/circular-cursor_43.png";
import eraser_10 from "@/assets/eraser/circular-cursor_48.png";
import eraser_11 from "@/assets/eraser/circular-cursor_52.png";

type ITemp = {
  name: string;
  masked: boolean;
  has_mesh:boolean;
};

export function findCurrentCase(caseDetail: ITemp[], currentCaseName: string) {
  const result = caseDetail.filter((item) => {
    return item.name === currentCaseName;
  });
  return result[0];
}

export function revokeAppUrls(revokeUrls: ILoadUrls) {
  for (let key in revokeUrls) {
    const jsonUrl = revokeUrls[key].jsonUrl;
    const urls = revokeUrls[key].nrrdUrls as Array<string>;
    urls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    URL.revokeObjectURL(jsonUrl);
  }
}

export function getEraserUrlsForOffLine(){
  const urls = [eraser_1,eraser_2,eraser_3,eraser_4,eraser_5,eraser_6,eraser_7,eraser_8,eraser_9,eraser_10, eraser_11]
  return urls;
}
