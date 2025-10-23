import { BaseCharacter } from '/process/BaseCharacter.js';
import { createModelMatrix, createMesh, drawObject, applyTransformToMesh, recenterMesh, cutMesh } from '../CreateObject.js';
import { MeshUtilsCurves, rotateAroundAxis } from '../MeshUtilsCurves.js';
import { MeshUtils } from '../MeshUtils.js';
import * as Curves from '../curves.js';
import { meshToCSG, CSGBuilder } from "../csgOperation.js";
import { makeModel, applyBoneOffsetMesh, getAxisAngle } from "../bone.js";
import { GL, attribs } from '../main.js'

export class mr_rime extends BaseCharacter {
    constructor() {
        super();

        const upperHat = createMesh(MeshUtils.generateEllipsoid, { params: [1.5, 1.3, 1.5, 32, 64], deferBuffer: false });
        // const hatCloser = createMesh(MeshUtils.generateHyperboloid2Sheets, { params: [1, 1, 0.5, 32, 32, 1.0], cutOptions: { percent: 0.5, axis: "z", keep: "lower" }, deferBuffer: false });


        //MESH 
        this.meshes = {
            // upperHat: upperHat,


            lowerBody: createMesh(MeshUtils.generateEllipsoid, { params: [2.25, 1.85, 2.05, 32, 64], deferBuffer: false }),
            whiteBelly: createMesh(MeshUtils.generateEllipsoid, { params: [1.6, 1.6, 1, 32, 64], deferBuffer: false }),
            redBelly: createMesh(MeshUtils.generateEllipsoid, { params: [0.9, 0.7, 0.5, 32, 64], deferBuffer: false }),
            yellowBelly: createMesh(MeshUtils.generateEllipsoid, { params: [0.3, 0.4, 0.3, 32, 64], deferBuffer: false }),

            // blackClothes:createMesh(MeshUtils.generateEllipsoid, { params: [1.6, 1.9, 1.6, 32, 64], deferBuffer: false }),
            // backblackClothes:createMesh(MeshUtils.generateEllipsoid, { params: [2, 2, 1.5, 32, 64], deferBuffer: false }),
            // backblackClothes:createMesh(MeshUtils.generateEllipsoid, { params: [2, 2, 1.5, 32, 64], deferBuffer: false }),

            //HEAD
            blackHead: createMesh(MeshUtils.generateEllipsoid, { params: [1.3, 1, 1, 32, 64], deferBuffer: false }),
            face: createMesh(MeshUtils.generateEllipsoid, { params: [1.17, 0.95, 1, 32, 64], deferBuffer: false }),

            eyes: createMesh(MeshUtils.generateEllipsoid, { params: [0.3, 0.38, 0.1, 32, 64], deferBuffer: false }),

            upperMustache: createMesh(MeshUtils.generateEllipticalCone, { params: [0.5, 0.1, 0.35, 32], deferBuffer: false }),
            lowerMustache: createMesh(MeshUtils.generateEllipticParaboloid, { params: [0.8, 0.3, 1, 0.1, 32, 16], deferBuffer: false }),

            //BODY
            upperBlackClothes: createMesh(MeshUtils.generateEllipticParaboloid, { params: [1.8, 1.6, 1.8, 1.2, 32, 16], deferBuffer: false }),
            sideBlackShoulder: createMesh(MeshUtils.generateEllipsoid, { params: [0.45, 0.45, 0.45, 32, 64], deferBuffer: false }),


            sideBlackClothes: createMesh(MeshUtils.generateEllipticParaboloid, { params: [2.7, 3, 3, 1.6, 32, 16], deferBuffer: false }),
            backBlackClothes: createMesh(MeshUtils.generateEllipsoid, { params: [1.6, 1.8, 1, 32, 64], deferBuffer: false }),

            arm: createMesh(MeshUtils.generateEllipticalCylinder, { params: [0.15, 0.15, 0.15, 0.15, 1.6, 32, 1, true], deferBuffer: false }),
            elbow: createMesh(MeshUtils.generateEllipsoid, { params: [0.15, 0.15, 0.15, 32, 64], deferBuffer: false }),

            // HANDS
            fingers: createMesh(MeshUtils.generateEllipsoid, { params: [0.45, 0.45, 0.2, 32, 64], deferBuffer: false }),
            hands: createMesh(MeshUtils.generateEllipsoid, { params: [0.5, 0.4, 0.2, 32, 64], deferBuffer: false }),
            thumbs: createMesh(MeshUtils.generateEllipsoid, { params: [0.4, 0.2, 0.2, 32, 64], deferBuffer: false }),





        }

        this.offsetMesh = {

            lowerBodyOffset: createModelMatrix({
                translate: [0, -0.7, 0]
            }),
            whiteBellyOffset: createModelMatrix({
                translate: [0, -0.3, 1.1]
            }),


            //UPPER
            upperBlackClothesOffset: createModelMatrix({
                translate: [0, 0.15, 0],
                rotate: [
                    { axis: "x", angle: Math.PI / 2 },
                ]
            }),

            rightShoulderOffset: createModelMatrix({
                translate: [0, 0, 0],

            }),

            leftShoulderOffset: createModelMatrix({
                translate: [0, 0, 0],
            }),

            //HEAD
            blackHeadOffset: createModelMatrix({
                translate: [0, 0, 0],
            }),
            faceOffset: createModelMatrix({
                translate: [0, 0, 0.1],
            }),

            //MUSTACHE
            upperMustacheOffset: createModelMatrix({
                translate: [0, -0.35, 1.1],
            }),
            rightLowerMustacheOffset: createModelMatrix({
                translate: [-0.25, -0.45, 1.1],
                rotate: [
                    { axis: "x", angle: Math.PI / -2 }
                ]
            }),
            leftLowerMustacheOffset: createModelMatrix({
                translate: [0.25, -0.45, 1.1],
                rotate: [
                    { axis: "x", angle: Math.PI / -2 }
                ]
            }),

            //EYES
            outerWhiteRightEye: createModelMatrix({
                translate: [-0.4, 0.05, 1],
                rotate: [
                    { axis: "y", angle: Math.PI / -16 }
                ]
            }),
            outerWhiteLeftEye: createModelMatrix({
                translate: [0.4, 0.05, 1],
                rotate: [
                    { axis: "y", angle: Math.PI / 16 }
                ]
            }),
            yellowRightEye: createModelMatrix({
                translate: [-0.38, 0.06, 1.01],
                scale: [0.84, 0.84, 1],
                rotate: [
                    { axis: "y", angle: Math.PI / -16 }
                ]
            }),
            yellowLeftEye: createModelMatrix({
                translate: [0.38, 0.06, 1.01],
                scale: [0.84, 0.84, 1],
                rotate: [
                    { axis: "y", angle: Math.PI / 16 }
                ]
            }),
            innerWhiteRightEye: createModelMatrix({
                translate: [-0.347, 0.068, 1.02],
                scale: [0.55, 0.55, 1],
                rotate: [
                    { axis: "y", angle: Math.PI / -16 }
                ]
            }),
            innerWhiteLeftEye: createModelMatrix({
                translate: [0.347, 0.068, 1.02],
                scale: [0.55, 0.55, 1],
                rotate: [
                    { axis: "y", angle: Math.PI / 16 }
                ]
            }),


            //ARMS
            //  UPPER ARMS
            upperRightArmOffset: createModelMatrix({
                translate: [-1, 0, 0],
                rotate: [
                    { axis: "z", angle: Math.PI / 2 }
                ]
            }),
            upperLeftArmOffset: createModelMatrix({
                translate: [1, 0, 0],
                rotate: [
                    { axis: "z", angle: Math.PI / 2 }
                ]
            }),

            //  ELBOW
            elbowOffset: createModelMatrix({
                translate: [0, 0, 0],
            }),

            //  LOWER ARMS
            lowerRightArmOffset: createModelMatrix({
                translate: [-0.8, 0, 0],
                rotate: [
                    { axis: "z", angle: Math.PI / 2 }
                ]
            }),
            lowerLeftArmOffset: createModelMatrix({
                translate: [0.8, 0, 0],
                rotate: [
                    { axis: "z", angle: Math.PI / 2 }
                ]
            }),

            //  HANDS
            rightFingersOffset: createModelMatrix({
                translate: [-0.3, 0, 0],
            }),
            leftFingersOffset: createModelMatrix({
                translate: [0.3, 0, 0],
            }),

            rightThumbsOffset: createModelMatrix({
                translate: [0, 0.3, 0],
                rotate: [
                    { axis: "z", angle: Math.PI / -3 }
                ]
            }),
            leftThumbsOffset: createModelMatrix({
                translate: [0, 0.3, 0],
                rotate: [
                    { axis: "z", angle: Math.PI / 3 }
                ]
            }),

            rightHandOffset: createModelMatrix({
                translate: [0, 0, 0],
            }),
            leftHandOffset: createModelMatrix({
                translate: [0, 0, 0],
            }),




            //LOWER
            rightBlackClothesOffset: createModelMatrix({
                translate: [-2.1, 1.2, 0],
                rotate: [
                    { axis: "y", angle: Math.PI / 2 },
                    { axis: "x", angle: Math.PI / 5 },
                ]
            }),
            leftBlackClothesOffset: createModelMatrix({
                translate: [2.1, 1.2, 0],
                rotate: [
                    { axis: "y", angle: Math.PI / -2 },
                    { axis: "x", angle: Math.PI / 5 },
                ]
            }),
            backBlackClothesOffset: createModelMatrix({
                translate: [0, -0.1, -1.1],
                rotate: [
                    { axis: "x", angle: Math.PI / 16 },

                ]
            }),



            //ACCESSORIES
            redBellyOffset: createModelMatrix({
                translate: [0, 0.35, 2]
            }),
            leftYellowBellyOffset: createModelMatrix({
                translate: [-1.5, 0.3, 1.4]
            }),
            rightYellowBellyOffset: createModelMatrix({
                translate: [1.5, 0.3, 1.4]
            }),

        }

        this.skeleton = {
            hip: this.createBone("hip", null, { translate: [0, 0, 0] }),
            neck: this.createBone("neck", "hip", { translate: [0, 2.5, 0] }),
            head: this.createBone("head", "neck", { translate: [0, 1, 0] }),

            rightShoulder: this.createBone("rightShoulder", "neck", { translate: [-1.05, -0.2, 0] }),
            leftShoulder: this.createBone("leftShoulder", "neck", { translate: [1.05, -0.2, 0] }),

            rightElbow: this.createBone("rightElbow", "rightShoulder", { translate: [-1.8, 0, 0] }),
            leftElbow: this.createBone("leftElbow", "leftShoulder", { translate: [1.8, 0, 0] }),

            rightHand: this.createBone("rightHand", "rightElbow", { translate: [-1.8, 0, 0] }),
            leftHand: this.createBone("leftHand", "leftElbow", { translate: [1.8, 0, 0] }),




            hat: this.createBone("hat", "head", { translate: [0, 0, 0] }),



        }

        this.updateWorld();
    }

    animate(time) {

        this.updateWorld();
    }


    drawObject() {
        //Shoes and staff color 0.514, 0.792, 0.957
        //face 0.91, 0.78, 0.808
        //BLACK 0.392, 0.361, 0.467

        //HEAD
        drawObject(this.meshes.blackHead.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.blackHeadOffset), [0.392, 0.361, 0.467], GL.TRIANGLES)
        drawObject(this.meshes.face.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.faceOffset), [0.91, 0.78, 0.808], GL.TRIANGLES)
        //  OUTER WHITE EYES
        drawObject(this.meshes.eyes.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.outerWhiteRightEye), [1, 1, 1], GL.TRIANGLES)
        drawObject(this.meshes.eyes.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.outerWhiteLeftEye), [1, 1, 1], GL.TRIANGLES)
        //  YELLOW EYES
        drawObject(this.meshes.eyes.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.yellowRightEye), [0.863, 0.741, 0.475], GL.TRIANGLES)
        drawObject(this.meshes.eyes.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.yellowLeftEye), [0.863, 0.741, 0.475], GL.TRIANGLES)
        //  INNER WHITE EYES
        drawObject(this.meshes.eyes.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.innerWhiteRightEye), [1, 1, 1], GL.TRIANGLES)
        drawObject(this.meshes.eyes.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.innerWhiteLeftEye), [1, 1, 1], GL.TRIANGLES)


        // MUSTACHE
        drawObject(this.meshes.upperMustache.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.upperMustacheOffset), [0.392, 0.361, 0.467], GL.TRIANGLES)
        drawObject(this.meshes.lowerMustache.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.leftLowerMustacheOffset), [0.392, 0.361, 0.467], GL.TRIANGLES)
        drawObject(this.meshes.lowerMustache.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.rightLowerMustacheOffset), [0.392, 0.361, 0.467], GL.TRIANGLES)





        //LOWER BLUE BODY
        drawObject(this.meshes.lowerBody.solid.buffers, makeModel(this.skeleton.hip, this.offsetMesh.lowerBodyOffset), [0.341, 0.549, 0.957], GL.TRIANGLES)

        //WHITE BELLY
        drawObject(this.meshes.whiteBelly.solid.buffers, makeModel(this.skeleton.hip, this.offsetMesh.whiteBellyOffset), [1, 1, 1], GL.TRIANGLES)

        //LOWER BLACK CLOTHES
        drawObject(this.meshes.sideBlackClothes.solid.buffers, makeModel(this.skeleton.hip, this.offsetMesh.leftBlackClothesOffset), [0.392, 0.361, 0.467], GL.TRIANGLES)
        drawObject(this.meshes.sideBlackClothes.solid.buffers, makeModel(this.skeleton.hip, this.offsetMesh.rightBlackClothesOffset), [0.392, 0.361, 0.467], GL.TRIANGLES)

        //BLACK SHOULDER
        drawObject(this.meshes.sideBlackShoulder.solid.buffers, makeModel(this.skeleton.leftShoulder, this.offsetMesh.rightShoulderOffset), [0.392, 0.361, 0.467], GL.TRIANGLES)
        drawObject(this.meshes.sideBlackShoulder.solid.buffers, makeModel(this.skeleton.rightShoulder, this.offsetMesh.leftShoulderOffset), [0.392, 0.361, 0.467], GL.TRIANGLES)

        //BACK BLACK CLOTHES
        drawObject(this.meshes.backBlackClothes.solid.buffers, makeModel(this.skeleton.hip, this.offsetMesh.backBlackClothesOffset), [0.392, 0.361, 0.467], GL.TRIANGLES)

        //UPPER BLACK CLOTHES
        drawObject(this.meshes.upperBlackClothes.solid.buffers, makeModel(this.skeleton.neck, this.offsetMesh.upperBlackClothesOffset), [0.392, 0.361, 0.467], GL.TRIANGLES)

        //ACCESSORIES
        drawObject(this.meshes.redBelly.solid.buffers, makeModel(this.skeleton.hip, this.offsetMesh.redBellyOffset), [0.529, 0.267, 0.345], GL.TRIANGLES)
        drawObject(this.meshes.yellowBelly.solid.buffers, makeModel(this.skeleton.hip, this.offsetMesh.leftYellowBellyOffset), [0.957, 0.816, 0.463], GL.TRIANGLES)
        drawObject(this.meshes.yellowBelly.solid.buffers, makeModel(this.skeleton.hip, this.offsetMesh.rightYellowBellyOffset), [0.957, 0.816, 0.463], GL.TRIANGLES)


        //ARMS
        //  UPPER ARMS
        drawObject(this.meshes.arm.solid.buffers, makeModel(this.skeleton.rightShoulder, this.offsetMesh.upperRightArmOffset), [0.341, 0.549, 0.957], GL.TRIANGLES)
        drawObject(this.meshes.arm.solid.buffers, makeModel(this.skeleton.leftShoulder, this.offsetMesh.upperLeftArmOffset), [0.341, 0.549, 0.957], GL.TRIANGLES)
        //  ELBOW
        drawObject(this.meshes.elbow.solid.buffers, makeModel(this.skeleton.rightElbow, this.offsetMesh.elbowOffset), [0.341, 0.549, 0.957], GL.TRIANGLES)
        drawObject(this.meshes.elbow.solid.buffers, makeModel(this.skeleton.leftElbow, this.offsetMesh.elbowOffset), [0.341, 0.549, 0.957], GL.TRIANGLES)
        //  LOWER ARMS
        drawObject(this.meshes.arm.solid.buffers, makeModel(this.skeleton.rightElbow, this.offsetMesh.lowerRightArmOffset), [0.341, 0.549, 0.957], GL.TRIANGLES)
        drawObject(this.meshes.arm.solid.buffers, makeModel(this.skeleton.leftElbow, this.offsetMesh.lowerLeftArmOffset), [0.341, 0.549, 0.957], GL.TRIANGLES)
        //  HANDS
        drawObject(this.meshes.hands.solid.buffers, makeModel(this.skeleton.rightHand, this.offsetMesh.rightHandOffset), [0.941, 0.914, 0.937], GL.TRIANGLES)
        drawObject(this.meshes.hands.solid.buffers, makeModel(this.skeleton.leftHand, this.offsetMesh.leftHandOffset), [0.941, 0.914, 0.937], GL.TRIANGLES)

        drawObject(this.meshes.thumbs.solid.buffers, makeModel(this.skeleton.rightHand, this.offsetMesh.rightThumbsOffset), [0.941, 0.914, 0.937], GL.TRIANGLES)
        drawObject(this.meshes.thumbs.solid.buffers, makeModel(this.skeleton.leftHand, this.offsetMesh.leftThumbsOffset), [0.941, 0.914, 0.937], GL.TRIANGLES)

        drawObject(this.meshes.fingers.solid.buffers, makeModel(this.skeleton.rightHand, this.offsetMesh.rightFingersOffset), [0.941, 0.914, 0.937], GL.TRIANGLES)
        drawObject(this.meshes.fingers.solid.buffers, makeModel(this.skeleton.leftHand, this.offsetMesh.leftFingersOffset), [0.941, 0.914, 0.937], GL.TRIANGLES)


    }
}