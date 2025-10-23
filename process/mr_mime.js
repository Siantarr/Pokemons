import { BaseCharacter } from '/process/BaseCharacter.js';
import { createModelMatrix, createMesh, drawObject } from '../CreateObject.js';
import { MeshUtilsCurves, rotateAroundAxis } from '../MeshUtilsCurves.js';
import { MeshUtils } from '../MeshUtils.js';
import * as Curves from '../curves.js';
import { makeModel } from "../bone.js"; // Hanya butuh makeModel
import { GL, attribs } from '../main.js';
import { setLocalRotationAxisAngle } from '../bone.js';

export class mr_mime extends BaseCharacter {
    constructor() {
        super();

        // --- 1. Definisi Kurva ---
        const hairCurveL = Curves.cubicBezier3D(
            [0, 0, 0],    
            [1.0, 0.4, 0.1], 
            [1, 3, 0],    
            [2.6, 0.3, 0]    
        );
        const hairCurveR = Curves.cubicBezier3D(
            [0, 0, 0],    
            [-1.0, 0.4, 0.1], 
            [-1, 3, 0],    
            [-2.6, 0.3, 0]   
        );
        const shoeTipCurve = Curves.cubicBezier3D(
            [0,0,0],
            [0,0,0.3],
            [0,1,0.2],
            [0,0.7,-0.8]);

        const mouthCurve = Curves.cubicBezier3D(
            [-0.6, 0.1, 0.7],  // p0 (kiri)
            [-0.3, -0.1, 0.7], // p1 (kontrol kiri, ditarik ke bawah)
            [ 0.3, -0.1, 0.7], // p2 (kontrol kanan, ditarik ke bawah)
            [ 0.6, 0.1, 0.7]   // p3 (kanan)
        );

        // --- 2. `this.meshes` ---
        this.meshes = {
            bodyMesh: createMesh(MeshUtils.generateEllipsoid, { params: [1.8, 2, 1.8, 32, 32], deferBuffer: false }),
            headMesh: createMesh(MeshUtils.generateEllipsoid, { params: [1.2, 1.2, 1.2, 32, 32], deferBuffer: false }),
            
            jointMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.3, 0.3, 0.3, 16, 10], deferBuffer: false }),
            limbMesh: createMesh(MeshUtils.generateEllipticalCylinder, { params: [0.2, 0.2, 0.2, 0.2, 1.5, 16, 1], deferBuffer: false }),
            handMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.55, 0.3, 0.65, 16, 16], deferBuffer: false }),

            fingerMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.15, 0.2, 0.55, 16, 16], deferBuffer: false }), 
        

            shoeMesh: createMesh(MeshUtils.generateEllipticParaboloid, { params: [1, 0.5, 3, 1, 16, 16], deferBuffer: false }),
            shoeTipMesh: createMesh(MeshUtilsCurves.generateVariableTube, { params: [shoeTipCurve, 0, 1, 20, [0.1, 0.15, 0.1], 8], deferBuffer: false }),
            backShoeMesh: createMesh(MeshUtils.generateEllipticParaboloid, { params: [3, 1, 5, 0.3, 16, 16], deferBuffer: false}),

            //Hair
            hairMeshL: createMesh(MeshUtilsCurves.generateVariableTube, { params: [hairCurveL, 0, 0.67, 30, [0.4, 0.3, 0.1], 16], deferBuffer: false }),
            hairMeshR: createMesh(MeshUtilsCurves.generateVariableTube, { params: [hairCurveR, 0, 0.67, 30, [0.4, 0.3, 0.1], 16], deferBuffer: false }),
            hairBottom1: createMesh(MeshUtils.generateEllipticParaboloid, { params: [0.5, 0.5, 1, 0.5, 16, 16], deferBuffer: false }), 
            hairBottom2: createMesh(MeshUtils.generateEllipticParaboloid, { params: [1, 0.6, 1, 1, 16, 16], deferBuffer: false }), 
            hairBottom3: createMesh(MeshUtils.generateEllipticParaboloid, { params: [0.5, 0.26, 0.3, 0.4, 16, 16], deferBuffer: false }), 

            redDotMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.4, 0.4, 0.1, 16, 16], deferBuffer: false }),
            cheekDotMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.3, 0.4, 0.2, 16, 16], deferBuffer: false }),
            eyeMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.25, 0.3, 0.2, 16, 16], deferBuffer: false }),
            eyeBallMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.1, 0.1, 0.1, 8, 8], deferBuffer: false }),

            mouthMesh: createMesh(MeshUtilsCurves.generateVariableTube, { 
                params: [
                    mouthCurve, // Kurva yang baru dibuat
                    0, 1,       // tMin, tMax
                    20,         // tSteps (segmen)
                    0.05,       // radius (tipis)
                    8           // radialSteps (segi 8)
                ], 
                deferBuffer: false 
            }),
        };

        // --- 3. `this.skeleton` (Tanpa tulang jari, T-Pose Awal) ---
         this.skeleton = {

            hip: this.createBone("hip", null, { translate: [0, 0.9, 0] }), 
            torso: this.createBone("torso", "hip", { translate: [0, 1.5, 0] }),
            head: this.createBone("head", "torso", { translate: [0, 1.5, 1] }),

            eyeL: this.createBone("eyeL", "head", { translate: [-0.5, 0.6, 0.6] }),
            eyeR: this.createBone("eyeR", "head", { translate: [0.5, 0.6, 0.6] }),

            //LEFT HAND
            shoulderL: this.createBone("shoulderL", "torso", {
                translate: [-1.7, 1.0, 0], // Kiri = X negatif
                rotate: [{ axis: 'z', angle: -Math.PI / 2 }]
            }),
            upperArmL: this.createBone("upperArmL", "shoulderL", { translate: [0, -1, 0] }),
            elbowL: this.createBone("elbowL", "upperArmL", { translate: [0, -1.3, 0] }),
            lowerArmL: this.createBone("lowerArmL", "elbowL", { translate: [0, -0.2, 0] }),
            handL: this.createBone("handL", "lowerArmL", { translate: [0, -1.5, 0] }),

            //RIGHT HAND
            shoulderR: this.createBone("shoulderR", "torso", {
                translate: [1.7, 1.0, 0], 
                rotate: [{ axis: 'z', angle: Math.PI / 2 }]
             }),
            upperArmR: this.createBone("upperArmR", "shoulderR", { translate: [0, -1.0, 0] }),
            elbowR: this.createBone("elbowR", "upperArmR", { translate: [0, -1.3, 0] }),
            lowerArmR: this.createBone("lowerArmR", "elbowR", { translate: [0, -0.2, 0] }),
            handR: this.createBone("handR", "lowerArmR", { translate: [0, -1.5, 0] }),

            //LEFT LEG
            upperLegL: this.createBone("upperLegL", "hip", { translate: [1, -0.1, 0] }),
            kneeL: this.createBone("kneeL", "upperLegL", { translate: [0, -1.5, 0] }),
            lowerLegL: this.createBone("lowerLegL", "kneeL", { translate: [0, -0.2, 0] }),
            footL: this.createBone("footL", "lowerLegL", { translate: [0, -1.5, 0] }),

            //RIGHT LEG
            upperLegR: this.createBone("upperLegR", "hip", { translate: [-1, -0.1, 0] }),
            kneeR: this.createBone("kneeR", "upperLegR", { translate: [0, -1.5, 0] }),
            lowerLegR: this.createBone("lowerLegR", "kneeR", { translate: [0, -0.2, 0] }),
            footR: this.createBone("footR", "lowerLegR", { translate: [0, -1.5, 0] }),
        };

        // --- 4. `this.updateWorld()` ---
        this.updateWorld();

        // --- 5. `this.offsetMesh` ---
        
        const limbOffset = createModelMatrix({ translate: [0, -0.5, 0] });
        
        this.offsetMesh = {
            bodyOffset: createModelMatrix({ translate: [0, 0, 0], scale: [1, 1, 0.8] }),
            headOffset: createModelMatrix({ translate: [0, 0.2, -0.6], scale: [1.25, 1.2, 1.2]  }),

            redDotStomach: createModelMatrix({ translate: [0, -0.5, 1.1], scale: [2, 2, 4] , rotate: [{ axis: 'x', angle: 63}] }),

            //Hair
            hairLOffset: createModelMatrix({ translate: [0.9, 1, -0.85], rotate: [{ axis: 'z', angle: -Math.PI / 8 }] }),
            hairROffset: createModelMatrix({ translate: [-0.9, 1, -0.85], rotate: [{ axis: 'z', angle: Math.PI / 8 }] }),

            hairBottom1LOffset: createModelMatrix({translate: [-2,0.6,-0.8],rotate: [{axis:'y',angle:Math.PI/2},{axis:'x',angle:-Math.PI/4}],scale: [1,1,1.3]}),
            hairBottom2LOffset: createModelMatrix({translate: [-2.5,0.7,-0.8],rotate: [{axis:'y',angle:Math.PI/2},{axis:'x',angle:-Math.PI/3 - 0.01}],scale: [0.3,0.8,0.9]}),
            hairBottom3LOffset: createModelMatrix({translate: [-3.5,1.51,-0.82],rotate: [{axis:'y',angle:Math.PI/2},{axis:'x',angle:-Math.PI/7}],scale: [0.2,0.35,2.3]}),

            hairBottom1ROffset: createModelMatrix({translate: [2,0.6,-0.8],rotate: [{axis:'y',angle:-Math.PI/2},{axis:'x',angle:-Math.PI/4}],scale: [1,1,1.3]}),
            hairBottom2ROffset: createModelMatrix({translate: [2.5,0.7,-0.8],rotate: [{axis:'y',angle:-Math.PI/2},{axis:'x',angle:-Math.PI/3 - 0.01}],scale: [0.3,0.8,0.9]}),
            hairBottom3ROffset: createModelMatrix({translate: [3.5,1.51,-0.82],rotate: [{axis:'y',angle:-Math.PI/2},{axis:'x',angle:-Math.PI/7}],scale: [0.2,0.35,2.3]}),

            //Cheek
            cheekLOffset: createModelMatrix({ translate: [0.9, -0.1, 0.5], rotate: [{ axis: 'y', angle: -100 }] }),
            cheekROffset: createModelMatrix({ translate: [-0.9, -0.1, 0.5 ], rotate: [{ axis: 'y', angle: 100 }] }),

            eyeROffset: createModelMatrix({ rotate: [{ axis: 'y', angle: Math.PI / 12 }] }),
            eyeLOffset: createModelMatrix({ rotate: [{ axis: 'y', angle: -Math.PI / 12 }] }),
            eyeBallLOffset: createModelMatrix({ translate: [0, 0, 0.15], rotate: [{ axis: 'y', angle: -Math.PI / 12 }] }),
            eyeBallROffset: createModelMatrix({ translate: [0, 0, 0.15], rotate: [{ axis: 'y', angle: Math.PI / 12 }] }),
            mouthOffset: createModelMatrix({translate: [0, -0.2, 0.05], scale: [1, 0.7, 1]}),

            shoulderLOffset: createModelMatrix({scale: [3, 3, 3]}),
            shoulderROffset: createModelMatrix({scale: [3, 3, 3]}),

            legShoulderLOffset : createModelMatrix({scale: [2, 2, 2]}),
            legShoulderROffset : createModelMatrix({scale: [2, 2, 2]}),

            elbowLOffset: createModelMatrix({scale: [0.8, 0.8, 0.8]}),
            elbowROffset: createModelMatrix({scale: [0.8, 0.8, 0.8]}),

            kneeLOffset: createModelMatrix({}),
            kneeROffset: createModelMatrix({}),

            upperArmLOffset: limbOffset,
            lowerArmLOffset: limbOffset,
            upperArmROffset: limbOffset,
            lowerArmROffset: limbOffset,
            
            handLOffset: createModelMatrix({ translate: [0, 0, 0], rotate: [{ axis: 'x', angle: Math.PI / 2 }] }),
            handROffset: createModelMatrix({ translate: [0, 0, 0], rotate: [{ axis: 'x', angle: Math.PI / 2 }] }),
            fingerLOffset: createModelMatrix({ translate: [-0.4, 0.2, 0], rotate: [{ axis: 'y', angle: Math.PI / 2 }] }),
            fingerROffset: createModelMatrix({ translate: [0.4, 0.2, 0], rotate: [{ axis: 'y', angle: Math.PI / 2 }] }),


            upperLegLOffset: limbOffset,
            lowerLegLOffset: limbOffset,
            upperLegROffset: limbOffset,
            lowerLegROffset: limbOffset,

            shoeLOffset: createModelMatrix({ translate: [0, 0.1, 1.8], 
                rotate: [{ axis: 'x', angle: -Math.PI  }], scale: [0.5, 1, 1.7] }),
            shoeROffset: createModelMatrix({ translate: [0, 0.1, 1.8], 
                rotate: [{ axis: 'x', angle: -Math.PI }], scale: [0.5, 1, 1.7] }),
            shoeTipLOffset: createModelMatrix({ translate: [0, 0.1, 1.6] }),
            shoeTipROffset: createModelMatrix({ translate: [0, 0.1, 1.6] }),
            backShoeLOffset: createModelMatrix({ translate: [0, 0.1, -0.5], scale: [0.4, 1, 2] }),
            backShoeROffset: createModelMatrix({ translate: [0, 0.1, -0.5], scale: [0.4, 1, 2] })
        };
        // =================================================================
    }

    // --- animate() ---
    // --- animate() ---
    animate(time) {
        // --- Sudut Default Tangan Turun ---
        const defaultShoulderAngleL_Down = -Math.PI/ 9; // 150 deg
        const defaultShoulderAngleR_Down = Math.PI / 9;  // 150 deg

        // --- Timing & Durasi ---
        const blinkInterval = 4000; const blinkDuration = 200; const blinkPeak = 100;

        // Sequence: Diam -> [ (Geleng Sekali & Angkat Tangan) -> Turun Tangan ] x2 -> Jeda -> Jalan
        const initialDelay = 1000;
        const actionRaiseDuration = 1500; // Durasi Angkat Tangan
        const actionLowerDuration = 1000; // Durasi Turunkan Tangan
        const walkDelay = 1000;
        const walkDuration = 3000;
        const postWalkDelay = 500;       // Jeda setelah berhenti jalan
        const crouchDuration = 1000;

        // Hitung waktu mulai dan selesai untuk setiap fase
        const action1RaiseStartTime = initialDelay;
        const action1RaiseEndTime = action1RaiseStartTime + actionRaiseDuration;
        const action1LowerStartTime = action1RaiseEndTime;
        const action1LowerEndTime = action1LowerStartTime + actionLowerDuration;
        const action2RaiseStartTime = action1LowerEndTime;
        const action2RaiseEndTime = action2RaiseStartTime + actionRaiseDuration;
        const action2LowerStartTime = action2RaiseEndTime;
        const action2LowerEndTime = action2LowerStartTime + actionLowerDuration;
        const walkStartTimeSeq = action2LowerEndTime + walkDelay;
        const walkEndTimeSeq = walkStartTimeSeq + walkDuration;

        const crouchStartTime = walkEndTimeSeq + postWalkDelay;
        const crouchEndTime = crouchStartTime + crouchDuration;
        const sequenceEndTime = crouchEndTime;

        // Hitung total durasi gerakan tangan untuk kepala
        const totalArmActionDuration = (actionRaiseDuration + actionLowerDuration + actionRaiseDuration + actionLowerDuration);
        const headShakeStartTime = action1RaiseStartTime; // Mulai geleng saat tangan mulai naik pertama kali
        const headShakeEndTime = action2LowerEndTime;     // Berhenti geleng saat tangan selesai turun kedua kali

        // Parameter Aksi
        const shoulderRaiseTargetAngleL = -Math.PI / 1.5;
        const shoulderRaiseTargetAngleR = Math.PI / 1.5;
        const maxHandRotateY = Math.PI / 8;
        const maxHeadShakeAngle = Math.PI / 10;

        // Parameter Jalan
        const walkDistance = 6.0; const walkCycleDuration = 1000; const maxLegSwingAngle = Math.PI / 6;
        const maxKneeBendAngle = Math.PI / 1.8; // Sudut tekuk lutut
        const hipDropAmount = -0.5;

        // --- Inisialisasi Nilai Transformasi ---
        let eyeScaleY = 1.0; let headRotateY = 0;
        let shoulderLAngleZ = defaultShoulderAngleL_Down;
        let shoulderRAngleZ = defaultShoulderAngleR_Down;
        let elbowLAngleZ = 0; let elbowRAngleZ = 0;
        let handLAngleY = 0; let handRAngleY = 0;
        let legAngleL = 0; let legAngleR = 0;
        let kneeAngleL = 0; let kneeAngleR = 0;
        const originalHipY = this.skeleton.hip.localSpec.translate ? this.skeleton.hip.localSpec.translate[1] : 0.9;
        let currentHipPosition = [0, originalHipY, 0];

        // --- 1. Logika Kedipan Mata (Independen) ---
        const timeInBlinkCycle = time % blinkInterval;
        if (timeInBlinkCycle < blinkDuration) {
            let t_blink_progress;
            if (timeInBlinkCycle < blinkPeak) { t_blink_progress = timeInBlinkCycle / blinkPeak; eyeScaleY = 1.0 - (0.95 * t_blink_progress); }
            else { t_blink_progress = (timeInBlinkCycle - blinkPeak) / (blinkDuration - blinkPeak); eyeScaleY = 0.05 + (0.95 * t_blink_progress); }
        } else { eyeScaleY = 1.0; }
        const currentSpecL_eye = this.skeleton.eyeL.localSpec;
        this.skeleton.eyeL.setLocalSpec({ translate: currentSpecL_eye.translate, rotate: currentSpecL_eye.rotate, scale: [1.0, eyeScaleY, 1.0] });
        const currentSpecR_eye = this.skeleton.eyeR.localSpec;
        this.skeleton.eyeR.setLocalSpec({ translate: currentSpecR_eye.translate, rotate: currentSpecR_eye.rotate, scale: [1.0, eyeScaleY, 1.0] });

        // --- 2. Logika Sequence Utama ---
        let inSequence = true;

        // Logika Gelengan Kepala (Satu siklus penuh selama gerakan tangan)
        if (time >= headShakeStartTime && time < headShakeEndTime) {
            const headPhaseT = (time - headShakeStartTime) / totalArmActionDuration;
            // Gunakan siklus sinus penuh (2 * PI) untuk gerakan bolak-balik
            headRotateY = Math.sin(headPhaseT * 2 * Math.PI) * maxHeadShakeAngle;
        } else {
            headRotateY = 0; // Kepala lurus di luar durasi ini
        }

        // Logika Gerakan Tangan dan Jalan (berurutan)
        if (time < action1RaiseStartTime) {
            // Fase Diam Awal
            shoulderLAngleZ = defaultShoulderAngleL_Down; shoulderRAngleZ = defaultShoulderAngleR_Down;
            elbowLAngleZ = 0; elbowRAngleZ = 0; handLAngleY = 0; handRAngleY = 0;
            currentHipPosition = [0, originalHipY, 0]; legAngleL = 0; legAngleR = 0;
            inSequence = false;

        } else if (time < action1RaiseEndTime) {
            // Fase Angkat Tangan Pertama
            const phaseT = (time - action1RaiseStartTime) / actionRaiseDuration;
            const smoothProgress = Math.sin(phaseT * Math.PI / 2);
            shoulderLAngleZ = defaultShoulderAngleL_Down + smoothProgress * (shoulderRaiseTargetAngleL - defaultShoulderAngleL_Down);
            shoulderRAngleZ = defaultShoulderAngleR_Down + smoothProgress * (shoulderRaiseTargetAngleR - defaultShoulderAngleR_Down);
            elbowLAngleZ = 0; elbowRAngleZ = 0;
            handLAngleY = smoothProgress * -maxHandRotateY;
            handRAngleY = smoothProgress * maxHandRotateY;
            currentHipPosition = [0, originalHipY, 0]; legAngleL = 0; legAngleR = 0;

        } else if (time < action1LowerEndTime) {
            // Fase Turunkan Tangan Pertama
            const phaseT = (time - action1LowerStartTime) / actionLowerDuration;
            const smoothProgress = Math.sin(phaseT * Math.PI / 2);
            shoulderLAngleZ = shoulderRaiseTargetAngleL + smoothProgress * (defaultShoulderAngleL_Down - shoulderRaiseTargetAngleL);
            shoulderRAngleZ = shoulderRaiseTargetAngleR + smoothProgress * (defaultShoulderAngleR_Down - shoulderRaiseTargetAngleR);
            elbowLAngleZ = 0; elbowRAngleZ = 0;
            handLAngleY = (1.0 - smoothProgress) * -maxHandRotateY;
            handRAngleY = (1.0 - smoothProgress) * maxHandRotateY;
            currentHipPosition = [0, originalHipY, 0]; legAngleL = 0; legAngleR = 0;

        } else if (time < action2RaiseEndTime) {
            // Fase Angkat Tangan Kedua
            const phaseT = (time - action2RaiseStartTime) / actionRaiseDuration;
            const smoothProgress = Math.sin(phaseT * Math.PI / 2);
            shoulderLAngleZ = defaultShoulderAngleL_Down + smoothProgress * (shoulderRaiseTargetAngleL - defaultShoulderAngleL_Down);
            shoulderRAngleZ = defaultShoulderAngleR_Down + smoothProgress * (shoulderRaiseTargetAngleR - defaultShoulderAngleR_Down);
            elbowLAngleZ = 0; elbowRAngleZ = 0;
            handLAngleY = smoothProgress * -maxHandRotateY;
            handRAngleY = smoothProgress * maxHandRotateY;
            currentHipPosition = [0, originalHipY, 0]; legAngleL = 0; legAngleR = 0;

        } else if (time < action2LowerEndTime) {
            // Fase Turunkan Tangan Kedua
            const phaseT = (time - action2LowerStartTime) / actionLowerDuration;
            const smoothProgress = Math.sin(phaseT * Math.PI / 2);
            shoulderLAngleZ = shoulderRaiseTargetAngleL + smoothProgress * (defaultShoulderAngleL_Down - shoulderRaiseTargetAngleL);
            shoulderRAngleZ = shoulderRaiseTargetAngleR + smoothProgress * (defaultShoulderAngleR_Down - shoulderRaiseTargetAngleR);
            elbowLAngleZ = 0; elbowRAngleZ = 0;
            handLAngleY = (1.0 - smoothProgress) * -maxHandRotateY;
            handRAngleY = (1.0 - smoothProgress) * maxHandRotateY;
            currentHipPosition = [0, originalHipY, 0]; legAngleL = 0; legAngleR = 0;

        } else if (time < walkStartTimeSeq) {
            // Fase Jeda Sebelum Jalan
            shoulderLAngleZ = defaultShoulderAngleL_Down; shoulderRAngleZ = defaultShoulderAngleR_Down;
            elbowLAngleZ = 0; elbowRAngleZ = 0; handLAngleY = 0; handRAngleY = 0;
            currentHipPosition = [0, originalHipY, 0]; legAngleL = 0; legAngleR = 0;

        } else if (time < walkEndTimeSeq) {
            // Fase Jalan Maju
            shoulderLAngleZ = defaultShoulderAngleL_Down; shoulderRAngleZ = defaultShoulderAngleR_Down;
            elbowLAngleZ = 0; elbowRAngleZ = 0; handLAngleY = 0; handRAngleY = 0;

            const walkPhaseT = (time - walkStartTimeSeq) / walkDuration;
            const smoothWalkProgress = Math.sin(walkPhaseT * Math.PI / 2);
            currentHipPosition = [0, originalHipY, smoothWalkProgress * walkDistance]; // Maju

            const timeSinceWalkStart = time - walkStartTimeSeq;
            const t_walkCycle = (timeSinceWalkStart % walkCycleDuration) / walkCycleDuration;
            const swing = Math.sin(t_walkCycle * 2 * Math.PI);
            legAngleL = swing * maxLegSwingAngle;
            legAngleR = -swing * maxLegSwingAngle;

        } else if (time < crouchStartTime) {
            // Berhenti di posisi akhir jalan
           shoulderLAngleZ = defaultShoulderAngleL_Down; shoulderRAngleZ = defaultShoulderAngleR_Down;
           elbowLAngleZ = 0; elbowRAngleZ = 0; handLAngleY = 0; handRAngleY = 0;
           currentHipPosition = [0, originalHipY, walkDistance]; // Tetap di Z = walkDistance
           legAngleL = 0; legAngleR = 0; kneeAngleL = 0; kneeAngleR = 0; // Kaki berhenti & lurus

       // --->>> BARU: Fase Jongkok <<<---
       } else if (time < crouchEndTime) {
           // Jongkok di posisi akhir jalan
           shoulderLAngleZ = defaultShoulderAngleL_Down; shoulderRAngleZ = defaultShoulderAngleR_Down;
           elbowLAngleZ = 0; elbowRAngleZ = 0; handLAngleY = 0; handRAngleY = 0; // Tangan tetap turun

           const phaseT = (time - crouchStartTime) / crouchDuration;
           const smoothProgress = Math.sin(phaseT * Math.PI / 2); // Ease out

           // Turunkan Hip Y dan tekuk lutut
           currentHipPosition = [0, originalHipY + smoothProgress * hipDropAmount, walkDistance];
           legAngleL = 0; legAngleR = 0; // Paha tetap lurus relatif ke hip
           kneeAngleL = smoothProgress * maxKneeBendAngle; // Tekuk lutut
           kneeAngleR = smoothProgress * maxKneeBendAngle;

       } else {
           // Setelah sequence selesai / Tetap Jongkok di Posisi Akhir
           shoulderLAngleZ = defaultShoulderAngleL_Down; shoulderRAngleZ = defaultShoulderAngleR_Down;
           elbowLAngleZ = 0; elbowRAngleZ = 0; handLAngleY = 0; handRAngleY = 0;
           currentHipPosition = [0, originalHipY + hipDropAmount, walkDistance]; // Tetap jongkok di Z = walkDistance
           legAngleL = 0; legAngleR = 0;
           kneeAngleL = maxKneeBendAngle; kneeAngleR = maxKneeBendAngle; // Lutut tetap tekuk
           inSequence = false;
       }

        // --- Terapkan Transformasi ---
        // Kepala
        const currentHeadSpec = this.skeleton.head.localSpec;
        setLocalRotationAxisAngle(this.skeleton.head, 'y', headRotateY); // HeadRotateY dihitung di blok terpisah
        this.skeleton.head.setLocalSpec({ translate: currentHeadSpec.translate, scale: [1.0, 1.0, 1.0] });

        // Tangan Kiri
        setLocalRotationAxisAngle(this.skeleton.shoulderL, 'z', shoulderLAngleZ);
        setLocalRotationAxisAngle(this.skeleton.elbowL, 'z', elbowLAngleZ);
        setLocalRotationAxisAngle(this.skeleton.handL, 'y', handLAngleY);

        // Tangan Kanan
        setLocalRotationAxisAngle(this.skeleton.shoulderR, 'z', shoulderRAngleZ);
        setLocalRotationAxisAngle(this.skeleton.elbowR, 'z', elbowRAngleZ);
        setLocalRotationAxisAngle(this.skeleton.handR, 'y', handRAngleY);

        // Hip (Posisi)
        this.skeleton.hip.setLocalSpec({ translate: currentHipPosition, rotate: [], scale: [1,1,1] });

        // Kaki (Rotasi)
        setLocalRotationAxisAngle(this.skeleton.upperLegL, 'x', legAngleL);
        setLocalRotationAxisAngle(this.skeleton.upperLegR, 'x', legAngleR);
        setLocalRotationAxisAngle(this.skeleton.kneeL, 'x', 0);
        setLocalRotationAxisAngle(this.skeleton.kneeR, 'x', 0);

        // Torso (Pastikan tidak lean/sway)
        setLocalRotationAxisAngle(this.skeleton.torso, 'x', 0);
        setLocalRotationAxisAngle(this.skeleton.torso, 'z', 0);

        // Update World Matrix
        this.updateWorld();
    } // Akhir fungsi animate()

    drawObject() {
        const C_PINK = [1.0, 0.71, 0.76];
        const C_CREAM = [1.0, 0.89, 0.83];
        const C_BLUE = [0.2, 0.53, 0.8];
        const C_WHITE = [1.0, 1.0, 1.0];
        const C_BLACK = [0.1, 0.1, 0.1];

        //BODY
        drawObject(this.meshes.bodyMesh.solid.buffers, makeModel(this.skeleton.torso, this.offsetMesh.bodyOffset), C_WHITE, GL.TRIANGLES);
        drawObject(this.meshes.redDotMesh.solid.buffers, makeModel(this.skeleton.torso, this.offsetMesh.redDotStomach), C_PINK, GL.TRIANGLES);

        //KEPALA
        drawObject(this.meshes.headMesh.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.headOffset), C_CREAM, GL.TRIANGLES);

        //RAMBUT
        drawObject(this.meshes.hairMeshL.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.hairLOffset), C_BLUE, GL.TRIANGLES);
        drawObject(this.meshes.hairMeshR.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.hairROffset), C_BLUE, GL.TRIANGLES);
       
        drawObject(this.meshes.hairBottom1.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.hairBottom1LOffset), C_BLUE, GL.TRIANGLES);
        drawObject(this.meshes.hairBottom2.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.hairBottom2LOffset), C_BLUE, GL.TRIANGLES);
        drawObject(this.meshes.hairBottom3.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.hairBottom3LOffset), C_BLUE, GL.TRIANGLES);
        
        drawObject(this.meshes.hairBottom1.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.hairBottom1ROffset), C_BLUE, GL.TRIANGLES);
        drawObject(this.meshes.hairBottom2.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.hairBottom2ROffset), C_BLUE, GL.TRIANGLES);
        drawObject(this.meshes.hairBottom3.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.hairBottom3ROffset), C_BLUE, GL.TRIANGLES);

        //MUKA
        drawObject(this.meshes.cheekDotMesh.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.cheekLOffset), C_PINK, GL.TRIANGLES);
        drawObject(this.meshes.cheekDotMesh.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.cheekROffset), C_PINK, GL.TRIANGLES);
        drawObject(this.meshes.eyeMesh.solid.buffers, makeModel(this.skeleton.eyeL, this.offsetMesh.eyeLOffset), C_WHITE, GL.TRIANGLES);
        drawObject(this.meshes.eyeMesh.solid.buffers, makeModel(this.skeleton.eyeR, this.offsetMesh.eyeROffset), C_WHITE, GL.TRIANGLES);
        drawObject(this.meshes.eyeBallMesh.solid.buffers, makeModel(this.skeleton.eyeL, this.offsetMesh.eyeBallLOffset), C_BLACK, GL.TRIANGLES);
        drawObject(this.meshes.eyeBallMesh.solid.buffers, makeModel(this.skeleton.eyeR, this.offsetMesh.eyeBallROffset), C_BLACK, GL.TRIANGLES);
        drawObject(this.meshes.mouthMesh.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.mouthOffset), C_BLACK, GL.TRIANGLES);


        drawObject(this.meshes.jointMesh.solid.buffers, makeModel(this.skeleton.shoulderL, this.offsetMesh.shoulderLOffset), C_PINK, GL.TRIANGLES);
        drawObject(this.meshes.jointMesh.solid.buffers, makeModel(this.skeleton.shoulderR, this.offsetMesh.shoulderROffset), C_PINK, GL.TRIANGLES);
        drawObject(this.meshes.jointMesh.solid.buffers, makeModel(this.skeleton.elbowL, this.offsetMesh.elbowLOffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.jointMesh.solid.buffers, makeModel(this.skeleton.elbowR, this.offsetMesh.elbowROffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.jointMesh.solid.buffers, makeModel(this.skeleton.kneeL, this.offsetMesh.kneeLOffset), C_WHITE, GL.TRIANGLES);
        drawObject(this.meshes.jointMesh.solid.buffers, makeModel(this.skeleton.kneeR, this.offsetMesh.kneeROffset), C_WHITE, GL.TRIANGLES);
        drawObject(this.meshes.jointMesh.solid.buffers, makeModel(this.skeleton.upperLegL, this.offsetMesh.legShoulderLOffset), C_PINK, GL.TRIANGLES);
        drawObject(this.meshes.jointMesh.solid.buffers, makeModel(this.skeleton.upperLegR, this.offsetMesh.legShoulderROffset), C_PINK, GL.TRIANGLES);

        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.upperArmL, this.offsetMesh.upperArmLOffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.lowerArmL, this.offsetMesh.lowerArmLOffset), C_CREAM, GL.TRIANGLES);

        drawObject(this.meshes.fingerMesh.solid.buffers, makeModel(this.skeleton.handL, this.offsetMesh.fingerLOffset), C_WHITE, GL.TRIANGLES);
        drawObject(this.meshes.fingerMesh.solid.buffers, makeModel(this.skeleton.handR, this.offsetMesh.fingerROffset), C_WHITE, GL.TRIANGLES);


        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.upperArmR, this.offsetMesh.upperArmROffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.lowerArmR, this.offsetMesh.lowerArmROffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.upperLegL, this.offsetMesh.upperLegLOffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.lowerLegL, this.offsetMesh.lowerLegLOffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.upperLegR, this.offsetMesh.upperLegROffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.lowerLegR, this.offsetMesh.lowerLegROffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.handMesh.solid.buffers, makeModel(this.skeleton.handL, this.offsetMesh.handLOffset), C_WHITE, GL.TRIANGLES);
        drawObject(this.meshes.handMesh.solid.buffers, makeModel(this.skeleton.handR, this.offsetMesh.handROffset), C_WHITE, GL.TRIANGLES);

      
    

        // --- SEPATU (BIRU) ---
        drawObject(this.meshes.shoeMesh.solid.buffers, makeModel(this.skeleton.footL, this.offsetMesh.shoeLOffset), C_BLUE, GL.TRIANGLES);
        drawObject(this.meshes.shoeMesh.solid.buffers, makeModel(this.skeleton.footR, this.offsetMesh.shoeROffset), C_BLUE, GL.TRIANGLES);
        drawObject(this.meshes.shoeTipMesh.solid.buffers, makeModel(this.skeleton.footL, this.offsetMesh.shoeTipLOffset), C_BLUE, GL.TRIANGLES);
        drawObject(this.meshes.shoeTipMesh.solid.buffers, makeModel(this.skeleton.footR, this.offsetMesh.shoeTipROffset), C_BLUE, GL.TRIANGLES);
        drawObject(this.meshes.backShoeMesh.solid.buffers, makeModel(this.skeleton.footL, this.offsetMesh.backShoeLOffset), C_BLUE, GL.TRIANGLES);
        drawObject(this.meshes.backShoeMesh.solid.buffers, makeModel(this.skeleton.footR, this.offsetMesh.backShoeROffset), C_BLUE, GL.TRIANGLES);
    }
}