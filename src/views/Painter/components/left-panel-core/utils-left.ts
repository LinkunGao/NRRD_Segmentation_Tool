import * as Copper from "copper3d";

export function addNameToLoadedMeshes(nrrdMesh:Copper.nrrdMeshesType, name:string){

    nrrdMesh.x.name = name + " sagittal";
    nrrdMesh.y.name = name + " coronal";
    nrrdMesh.z.name = name + " axial";
}