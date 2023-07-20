import * as Copper from "copper3d";

export interface INrrdCaseNames {
  names: string[];
  details: Array<IDetails>;
  [proName: string]: any;
}

export interface IDetails {
  name: string;
  masked: false;
  has_mesh:boolean;
}

export interface IStoredMasks{
  label1: IExportMask[];
  label2: IExportMask[];
  label3: IExportMask[];
  hasData:false;
}

export interface IExportMask {
  caseId?: number;
  sliceIndex?: number;
  dataFormat?: string;
  width?: number;
  height?: number;
  voxelSpacing?: number[];
  spaceOrigin?: number[];
  data?: number[];
  [proName: string]: any;
}

export interface IExportMasks {
  caseId: string;
  masks: IStoredMasks;
}

export interface IReplaceMask {
  caseId: string;
  sliceId: number;
  label:string;
  mask: number[];
}

export interface IMaskMesh {
  maskMeshObjUrl?: string;
  meshVolume?:number;
}

export interface IParams {
  params: unknown;
  responseType?: string;
}

export interface ICaseUrls {
  nrrdUrls: Array<string>;
  jsonUrl?: string;
}
export interface ICaseRegUrls {
  nrrdUrls: Array<string>;
}

export interface ILoadUrls {
  [proName: string]: any;
}

export interface ICaseDetails{
  currentCaseId:string;
  details:Array<IDetails>;
  maskNrrd:string
}

export interface IRegRquest{
  name:string,
  radius?: number,
  origin?: number[]
}

export interface ILoadedMeshes{
  x:THREE.Mesh;
  y:THREE.Mesh;
  z:THREE.Mesh;
  order:number;
}

export interface ISliceIndex {
  x:number;
  y:number;
  z:number;
}

export interface ILeftRightData{
  maskNrrdMeshes:Copper.nrrdMeshesType; 
  maskSlices:Copper.nrrdSliceType; 
  url:string;
  register:boolean;
}