import { BaseCharacter } from '/process/BaseCharacter.js';
import { createModelMatrix, createMesh, drawObject, applyTransformToMesh, recenterMesh } from '../CreateObject.js';
import { MeshUtilsCurves } from '../MeshUtilsCurves.js';
import { MeshUtils } from '../MeshUtils.js';
import * as Curves from '../curves.js';
import { meshToCSG, CSGBuilder } from "../csgOperation.js";
import { makeModel } from "../bone.js";
import { GL, attribs } from '../main.js'

export class FILE_INI_JANGAN_DIUBAH extends BaseCharacter {
    constructor() {
        super();


    }

    animate(time) {

    }


    drawObject(){
        
    }
}