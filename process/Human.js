import { BaseCharacter } from '/process/BaseCharacter.js';
import { createModelMatrix, createMesh, drawObject, applyTransformToMesh, recenterMesh } from '../CreateObject.js';
import { MeshUtilsCurves, rotateAroundAxis, animateAlongCurve } from '../MeshUtilsCurves.js';
import { MeshUtils } from '../MeshUtils.js';
import * as Curves from '../curves.js';
import { meshToCSG, CSGBuilder } from "../csgOperation.js";
import { makeModel } from "../bone.js";
import { GL, attribs } from '../main.js'

export class HumanCharacter extends BaseCharacter {
    constructor() {
        super();

        // TODO MESH
        // disini membuat mesh solid danatau wireframe
        // INGAT di akhir parameter ada cutOptions = null, deferBuffer = true secara default (tidak di cut dan tidak perlu di buffer)
        // Penjelasan BUFFER: anggep aja hasil akhir/final dari objek tersebut, jika di buffer/deferBuffer = False. 
        // DEFERBUFFER: TRUE JIKA PAKAI CSG (Mau beberapa mesh di union / intersect / subtract)
        // generator, { params = null, solid = true, wire = true , cutOptions = null, deferBuffer = true}

        this.meshes = {
            ell: createMesh(MeshUtils.generateEllipsoid, { params: [0.8, 0.5, 0.6, 40, 60], options: { wire: false }, deferBuffer: true }),
            cube: createMesh(MeshUtils.generateBox, { params: [1, 1, 1], deferBuffer: true }),
        }

        // NOTE #1 CSG Apply Mesh dulu, jika CSG (subtract/union/intersect). Ingat deferBuffer harus true
        const cubeMesh = applyTransformToMesh(this.meshes.cube.solid.mesh, {
            translate: [0, 1, 0],
            rotate: [
                { axis: "x", angle: Math.PI / 4 },      // rotasi 45° sumbu X
                { axis: "y", angle: Math.PI / 3 },      // rotasi 60° sumbu Y
                { axis: "z", angle: Math.PI / 6 }]      // rotasi 30° sumbu Z
        });

        const ellipsoidMesh = applyTransformToMesh(this.meshes.ell.solid.mesh, {
            translate: [0, 1, 0],
            rotate: [{ axis: "x", angle: Math.PI / 2 }]
        });

        // #2 Konversi ke CSG
        const cubeCSG = meshToCSG(cubeMesh);
        const ellCSG = meshToCSG(ellipsoidMesh);

        // #3 Operasi boolean: cube dipotong sphere (bisa lanjut dengan objek lain)
        // #4 Konversi kembali ke mesh
        const holeOnCubeMesh = new CSGBuilder(cubeCSG)
            .subtract(ellCSG)
            .toMesh();

        // #5 Recenter kalau mau (biar ke tengah 0,0,0)
        recenterMesh(holeOnCubeMesh)

        //MESH
        this.meshes = {
            ...this.meshes, //add dari sebelumnya
            bodyMesh: createMesh(MeshUtils.generateBox, { params: [1.0, 1.6, 0.5], deferBuffer: false, options: { wire: false } }),
            chestMesh: createMesh(MeshUtils.generateBox, { params: [0.9, 0.9, 0.45], deferBuffer: false }),

            upperArmMesh: createMesh(MeshUtils.generateBox, { params: [0.28, 0.9, 0.28], deferBuffer: false }),
            lowerArmMesh: createMesh(MeshUtils.generateBox, { params: [0.24, 0.7, 0.24], deferBuffer: false }),
            handMesh: createMesh(MeshUtils.generateBox, { params: [0.18, 0.28, 0.12], deferBuffer: false }),

            upperLegMesh: createMesh(MeshUtils.generateBox, { params: [0.4, 1.0, 0.4], deferBuffer: false }),
            lowerLegMesh: createMesh(MeshUtils.generateBox, { params: [0.35, 0.9, 0.35], deferBuffer: false }),
            footMesh: createMesh(MeshUtils.generateBox, { params: [0.35, 0.18, 0.28], deferBuffer: false }),

            // #6 Buffer mesh hasil mesh ke GPU
            holeOnCubeMesh: MeshUtils.createMeshBuffers(GL, holeOnCubeMesh, attribs)

        }
        // TODO #7 Buat Bone
        // build skeleton (hip/root -> spine -> chest -> neck -> head) --- HIERARKI
        //
        //  hip
        //  ├── spine
        //  │   └── chest
        //  │       ├── neck → head
        //  │       ├── leftShoulder → leftUpperArm → leftLowerArm → leftHand
        //  │       └── rightShoulder → rightUpperArm → rightLowerArm → rightHand
        //  ├── leftUpperLeg → leftLowerLeg → leftFoot
        //  └── rightUpperLeg → rightLowerLeg → rightFoot
        //

        this.skeleton = {
            hip: this.createBone("hip", null, { translate: [0, 0, 0] }),
            spine: this.createBone("spine", "hip", { translate: [0, 0.6, 0] }),
            chest: this.createBone("chest", "spine", { translate: [0, 0.7, 0] }),
            neck: this.createBone("neck", "chest", { translate: [0, 0.55, 0] }),
            head: this.createBone("head", "neck", { translate: [0, 0, 0] }),
            // left arm chain
            leftShoulder: this.createBone("leftShoulder", "chest", { translate: [0, 0, 0] }),
            leftUpperArm: this.createBone("leftUpperArm", "leftShoulder", { translate: [0, -0.45, 0] }),
            leftLowerArm: this.createBone("leftLowerArm", "leftUpperArm", { translate: [0, 0, 0] }),
            leftHand: this.createBone("leftHand", "leftLowerArm", { translate: [0, 0, 0] }),
            // right arm chain
            rightShoulder: this.createBone("rightShoulder", "chest", { translate: [0, 0, 0] }),
            rightUpperArm: this.createBone("rightUpperArm", "rightShoulder", { translate: [0, -0.45, 0] }),
            rightLowerArm: this.createBone("rightLowerArm", "rightUpperArm", { translate: [0, 0, 0] }),
            rightHand: this.createBone("rightHand", "rightLowerArm", { translate: [0, 0, 0] }),
            // left leg chain
            leftUpperLeg: this.createBone("leftUpperLeg", "hip", { translate: [0, 0, 0] }),
            leftLowerLeg: this.createBone("leftLowerLeg", "leftUpperLeg", { translate: [0, 0, 0] }),
            leftFoot: this.createBone("leftFoot", "leftLowerLeg", { translate: [0, -0.6, 0] }),
            // right leg chain
            rightUpperLeg: this.createBone("rightUpperLeg", "hip", { translate: [0, 0, 0] }),
            rightLowerLeg: this.createBone("rightLowerLeg", "rightUpperLeg", { translate: [0, 0, 0] }),
            rightFoot: this.createBone("rightFoot", "rightLowerLeg", { translate: [0, -0.6, 0] }),
        }

        this.updateWorld();

        // TODO #8 Create Model Matrix 
        // ALIGN MESH dengan Bone
        this.offsetMesh = {
            bodyOffset: createModelMatrix({ translate: [0, 0.8, 0] }),   // put body mesh above hip
            chestOffset: createModelMatrix({ translate: [0, 0, 0] }),
            upperArmOffset: createModelMatrix({ translate: [0, 0, 0] }),
            lowerArmOffset: createModelMatrix({ translate: [0, -0.1, 0] }),
            handOffset: createModelMatrix({ translate: [0, -0.18, 0] }),
            upperLegOffset: createModelMatrix({ translate: [0, -0.5, 0] }),
            lowerLegOffset: createModelMatrix({ translate: [0, -0.5, 0] }),
            footOffset: createModelMatrix({ translate: [0, -0.25, 0.15] }),
            holeOnCubeOffset: createModelMatrix({ translate: [0, 0.5, 0] })
        }
    }

    animate(time) {
        // TODO
        const t = time * 0.001;


        // // Slight bounce of hip
        // this.skeleton.hip.setLocalSpec({ translate: [0, 0, 0] });

        // // head slight look around
        const curveFunc = (t) => Curves.helixCurve(t, 8, 0.2);
        animateAlongCurve(this.skeleton.head, curveFunc, t, 2, "pingpong");

        // // arms swing opposite to legs
        // this.skeleton.leftShoulder.setLocalSpec({
        //     translate: [-0.7, 0.45, 0],
        //     rotate: [{ axis: [1, 1, 0], angle: t * (2 * Math.PI) / 5 }]
        // }); // rotate di sumbu x dan y

        // this.skeleton.rightShoulder.setLocalSpec({
        //     translate: [0.7, 0.45, 0],
        //     rotate: [{ axis: { point: [0, 0, 0], dir: [1, 0, 0] }, angle: t * (2 * Math.PI) / 5 }]
        // }); // jadi rusak

        // // elbow bend a little (lower arm)
        // this.skeleton.leftLowerArm.setLocalSpec({
        //     translate: [0, -0.6, 0],
        //     rotate: [{ axis: "z", angle: Math.abs(Math.sin(t * Math.cos(t))) * 0.2 }]
        // });
        // this.skeleton.rightLowerArm.setLocalSpec({
        //     translate: [0, -0.6, 0],
        //     rotate: [{ axis: "z", angle: -Math.abs(Math.sin(t * Math.cos(t) + Math.PI)) * 0.2 }]
        // });

        // // legs swing (hip)
        // this.skeleton.leftUpperLeg.setLocalSpec({
        //     translate: [-0.3, 0, 0],
        //     rotate: [{ axis: "x", angle: Math.cos(t) / 2 }]
        // });
        // this.skeleton.rightUpperLeg.setLocalSpec({
        //     translate: [0.3, 0, 0],
        //     rotate: [{ axis: "x", angle: -Math.cos(t) / 2 }]
        // });

        // // knees bend depending on swing
        // this.skeleton.leftLowerLeg.setLocalSpec({
        //     translate: [0, -1.0, 0],
        //     rotate: [{ axis: "x", angle: Math.max(0, -Math.cos(t) / 2) * 0.8 }]
        // });
        // this.skeleton.rightLowerLeg.setLocalSpec({
        //     translate: [0, -1.0, 0],
        //     rotate: [{ axis: "x", angle: Math.max(0, -Math.cos(t) / 2) * 0.8 }]
        // });

        this.updateWorld();
    }

    drawObject() {
        // TODO
        // madeModel params -> bone, offset
        // drawObject params -> buffers, model, color, mode

        //HUMAN
        // drawObject(this.meshes.bodyMesh.solid.buffers, makeModel(this.skeleton.hip, this.offsetMesh.bodyOffset), [0.2, 0.6, 0.9], GL.TRIANGLES);

        // // chest
        // drawObject(this.meshes.chestMesh.solid.buffers, makeModel(this.skeleton.chest, this.offsetMesh.chestOffset), [0.15, 0.5, 0.8], GL.TRIANGLES);

        // head
        drawObject(this.meshes.holeOnCubeMesh, makeModel(this.skeleton.head, this.offsetMesh.holeOnCubeOffset), [1.0, 0.8, 0.6], GL.TRIANGLES);

        // // left arm
        // drawObject(this.meshes.upperArmMesh.solid.buffers, makeModel(this.skeleton.leftUpperArm, this.offsetMesh.upperArmOffset), [0.8, 0.2, 0.2], GL.TRIANGLES);
        // drawObject(this.meshes.lowerArmMesh.solid.buffers, makeModel(this.skeleton.leftLowerArm, this.offsetMesh.lowerArmOffset), [0.7, 0.2, 0.2], GL.TRIANGLES);
        // drawObject(this.meshes.handMesh.solid.buffers, makeModel(this.skeleton.leftHand, this.offsetMesh.handOffset), [0.9, 0.6, 0.5], GL.TRIANGLES);

        // // right arm
        // drawObject(this.meshes.upperArmMesh.solid.buffers, makeModel(this.skeleton.rightUpperArm, this.offsetMesh.upperArmOffset), [0.8, 0.2, 0.2], GL.TRIANGLES);
        // drawObject(this.meshes.lowerArmMesh.solid.buffers, makeModel(this.skeleton.rightLowerArm, this.offsetMesh.lowerArmOffset), [0.7, 0.2, 0.2], GL.TRIANGLES);
        // drawObject(this.meshes.handMesh.solid.buffers, makeModel(this.skeleton.rightHand, this.offsetMesh.handOffset), [0.9, 0.6, 0.5], GL.TRIANGLES);

        // // left legs
        // drawObject(this.meshes.upperLegMesh.solid.buffers, makeModel(this.skeleton.leftUpperLeg, this.offsetMesh.upperLegOffset), [0.2, 0.2, 0.2], GL.TRIANGLES);
        // drawObject(this.meshes.lowerLegMesh.solid.buffers, makeModel(this.skeleton.leftLowerLeg, this.offsetMesh.lowerLegOffset), [0.15, 0.15, 0.15], GL.TRIANGLES);
        // drawObject(this.meshes.footMesh.solid.buffers, makeModel(this.skeleton.leftFoot, this.offsetMesh.footOffset), [0.1, 0.1, 0.1], GL.TRIANGLES);

        // // right legs
        // drawObject(this.meshes.upperLegMesh.solid.buffers, makeModel(this.skeleton.rightUpperLeg, this.offsetMesh.upperLegOffset), [0.2, 0.2, 0.2], GL.TRIANGLES);
        // drawObject(this.meshes.lowerLegMesh.solid.buffers, makeModel(this.skeleton.rightLowerLeg, this.offsetMesh.lowerLegOffset), [0.15, 0.15, 0.15], GL.TRIANGLES);
        // drawObject(this.meshes.footMesh.solid.buffers, makeModel(this.skeleton.rightFoot, this.offsetMesh.footOffset), [0.1, 0.1, 0.1], GL.TRIANGLES);
    }
}
