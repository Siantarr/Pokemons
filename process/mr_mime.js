import { BaseCharacter } from '/process/BaseCharacter.js';
import { createModelMatrix, createMesh, drawObject } from '../CreateObject.js';
import { MeshUtilsCurves, rotateAroundAxis } from '../MeshUtilsCurves.js';
import { MeshUtils } from '../MeshUtils.js';
import * as Curves from '../curves.js';
import { makeModel } from "../bone.js"; // Hanya butuh makeModel
import { GL, attribs } from '../main.js';
import { setLocalRotationAxisAngle } from '../bone.js';

// --- Ambil alias glMatrix dari scope global (window) ---
// (Pastikan gl-matrix-min.js sudah di-load di HTML)
const vec3 = window.vec3;
const mat4 = window.mat4;
// --- BATAS PERBAIKAN ---


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

        // --- 3. `this.skeleton` ---
         this.skeleton = {
            hip: this.createBone("hip", null, { translate: [0, 0.9, 0] }), 
            torso: this.createBone("torso", "hip", { translate: [0, 1.5, 0] }),
            head: this.createBone("head", "torso", { translate: [0, 1.5, 1] }),
            eyeL: this.createBone("eyeL", "head", { translate: [-0.5, 0.6, 0.6] }),
            eyeR: this.createBone("eyeR", "head", { translate: [0.5, 0.6, 0.6] }),
            shoulderL: this.createBone("shoulderL", "torso", { translate: [-1.7, 1.0, 0], rotate: [{ axis: 'z', angle: -Math.PI / 2 }]}),
            upperArmL: this.createBone("upperArmL", "shoulderL", { translate: [0, -1, 0] }),
            elbowL: this.createBone("elbowL", "upperArmL", { translate: [0, -1.3, 0] }),
            lowerArmL: this.createBone("lowerArmL", "elbowL", { translate: [0, -0.2, 0] }),
            handL: this.createBone("handL", "lowerArmL", { translate: [0, -1.5, 0] }),
            shoulderR: this.createBone("shoulderR", "torso", { translate: [1.7, 1.0, 0], rotate: [{ axis: 'z', angle: Math.PI / 2 }]}),
            upperArmR: this.createBone("upperArmR", "shoulderR", { translate: [0, -1.0, 0] }),
            elbowR: this.createBone("elbowR", "upperArmR", { translate: [0, -1.3, 0] }),
            lowerArmR: this.createBone("lowerArmR", "elbowR", { translate: [0, -0.2, 0] }),
            handR: this.createBone("handR", "lowerArmR", { translate: [0, -1.5, 0] }),
            upperLegL: this.createBone("upperLegL", "hip", { translate: [1, -0.1, 0] }),
            kneeL: this.createBone("kneeL", "upperLegL", { translate: [0, -1.5, 0] }),
            lowerLegL: this.createBone("lowerLegL", "kneeL", { translate: [0, -0.2, 0] }),
            footL: this.createBone("footL", "lowerLegL", { translate: [0, -1.5, 0] }),
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
            hairLOffset: createModelMatrix({ translate: [0.9, 1, -0.85], rotate: [{ axis: 'z', angle: -Math.PI / 8 }] }),
            hairROffset: createModelMatrix({ translate: [-0.9, 1, -0.85], rotate: [{ axis: 'z', angle: Math.PI / 8 }] }),
            hairBottom1LOffset: createModelMatrix({translate: [-2,0.6,-0.8],rotate: [{axis:'y',angle:Math.PI/2},{axis:'x',angle:-Math.PI/4}],scale: [1,1,1.3]}),
            hairBottom2LOffset: createModelMatrix({translate: [-2.5,0.7,-0.8],rotate: [{axis:'y',angle:Math.PI/2},{axis:'x',angle:-Math.PI/3 - 0.01}],scale: [0.3,0.8,0.9]}),
            hairBottom3LOffset: createModelMatrix({translate: [-3.5,1.51,-0.82],rotate: [{axis:'y',angle:Math.PI/2},{axis:'x',angle:-Math.PI/7}],scale: [0.2,0.35,2.3]}),
            hairBottom1ROffset: createModelMatrix({translate: [2,0.6,-0.8],rotate: [{axis:'y',angle:-Math.PI/2},{axis:'x',angle:-Math.PI/4}],scale: [1,1,1.3]}),
            hairBottom2ROffset: createModelMatrix({translate: [2.5,0.7,-0.8],rotate: [{axis:'y',angle:-Math.PI/2},{axis:'x',angle:-Math.PI/3 - 0.01}],scale: [0.3,0.8,0.9]}),
            hairBottom3ROffset: createModelMatrix({translate: [3.5,1.51,-0.82],rotate: [{axis:'y',angle:-Math.PI/2},{axis:'x',angle:-Math.PI/7}],scale: [0.2,0.35,2.3]}),
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
            shoeLOffset: createModelMatrix({ translate: [0, 0.1, 1.8], rotate: [{ axis: 'x', angle: -Math.PI  }], scale: [0.5, 1, 1.7] }),
            shoeROffset: createModelMatrix({ translate: [0, 0.1, 1.8], rotate: [{ axis: 'x', angle: -Math.PI }], scale: [0.5, 1, 1.7] }),
            shoeTipLOffset: createModelMatrix({ translate: [0, 0.1, 1.6] }),
            shoeTipROffset: createModelMatrix({ translate: [0, 0.1, 1.6] }),
            backShoeLOffset: createModelMatrix({ translate: [0, 0.1, -0.5], scale: [0.4, 1, 2] }),
            backShoeROffset: createModelMatrix({ translate: [0, 0.1, -0.5], scale: [0.4, 1, 2] })
        };
        // Simpan posisi Y awal hip
        this.initialHipY = this.skeleton.hip.localSpec.translate ? this.skeleton.hip.localSpec.translate[1] : 0.9;
        
        // *** BARU: Simpan posisi kaki awal untuk pivot lean ***
        // Kita butuh posisi world, jadi panggil updateWorld dulu
        this.updateWorld(); 
        const footLWorldPos = vec3.transformMat4([], [0,0,0], this.skeleton.footL.worldMatrix);
        const footRWorldPos = vec3.transformMat4([], [0,0,0], this.skeleton.footR.worldMatrix);
        // Asumsikan pivot Y sedikit di bawah titik bone kaki (sesuaikan jika perlu)
        const pivotYOffset = -0.1; 
        this.leanPivotPoint = [
            (footLWorldPos[0] + footRWorldPos[0]) / 2, 
            Math.min(footLWorldPos[1], footRWorldPos[1]) + pivotYOffset, 
            (footLWorldPos[2] + footRWorldPos[2]) / 2
        ];
        // Sumbu rotasi untuk lean (misal, miring ke depan-kiri berarti rotasi di sumbu X positif dan Z positif)
        // Sumbu rotasi adalah TEGAK LURUS arah miring. Arah miring = Z- & X- -> Sumbu = X+ & Z+
        this.leanAxisDir = vec3.normalize([], [1, 0, 1]); 

    } // Akhir constructor()
    
 
    // --- animate() ---
    animate(time) {
        // --- Konstanta Animasi ---
        // Sudut Default
        const defaultShoulderAngleL_Down = -Math.PI/ 9;
        const defaultShoulderAngleR_Down = Math.PI / 9;
        // Target Angkat Tangan (jika masih dipakai)
        const shoulderRaiseTargetAngleL = -Math.PI / 1.5;
        const shoulderRaiseTargetAngleR = Math.PI / 1.5;
        // Konstanta T-Pose Z (untuk referensi)
        const tPoseShoulderLAngleZ = -Math.PI / 2;
        const tPoseShoulderRAngleZ = Math.PI / 2;

        // Timing & Durasi
        const blinkInterval = 4000; const blinkDuration = 200; const blinkPeak = 100;
        const initialDelay = 1000;
        const actionRaiseDuration = 1500; // (Mungkin tidak dipakai lagi, tapi biarkan)
        const actionLowerDuration = 1000; // (Mungkin tidak dipakai lagi, tapi biarkan)
        const walkDelay = 1000;
        const walkDuration = 3000;
        const postWalkDelay = 500;
        // *** BARU: Timing untuk Kincir Angin ***
        const windmillStartDelay = 500;    // Jeda setelah berhenti jalan
        // Kincir angin akan berputar terus menerus setelah dimulai

        // Hitung Waktu Mulai Fase (Hanya perlu sampai kincir angin dimulai)
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
        // *** Waktu Mulai Kincir Angin ***
        const windmillStartTime = walkEndTimeSeq + postWalkDelay + windmillStartDelay;
        // SequenceEndTime tidak relevan karena kincir berputar terus

        const totalArmActionDuration = (actionRaiseDuration + actionLowerDuration + actionRaiseDuration + actionLowerDuration);
        const headShakeStartTime = action1RaiseStartTime;
        const headShakeEndTime = action2LowerEndTime;

        // Parameter Aksi (Kepala)
        // const maxHandRotateY_Action = Math.PI / 8; // (Tidak dipakai lagi)
        const maxHeadShakeAngle = Math.PI / 10;

        // Parameter Jalan
        const walkDistance = 6.0; const walkCycleDuration = 1000; const maxLegSwingAngle = Math.PI / 6;

        // *** BARU: Parameter Kincir Angin Diagonal ***
        const windmillAxisDirL = vec3.normalize([], [0, 1, 1]); // Sumbu Kiri: Diagonal Y+ Z+
        const windmillAxisDirR = vec3.normalize([], [0, 1, -1]);// Sumbu Kanan: Diagonal Y+ Z-
        const windmillSpeed = Math.PI / 1000; // Satu putaran penuh (2*PI) setiap 2 detik

        // --- Inisialisasi Nilai Transformasi ---
        let eyeScaleY = 1.0; let headRotateY = 0;
        let shoulderLAngleZ_target = defaultShoulderAngleL_Down; // Target Z (hanya sebelum kincir)
        let shoulderRAngleZ_target = defaultShoulderAngleR_Down; // Target Z (hanya sebelum kincir)
        let currentElbowLAngleZ = 0; let currentElbowRAngleZ = 0; // Jaga lengan lurus saat kincir
        let currentHandLAngleY = 0; let currentHandRAngleY = 0;
        let thighAngleL = 0; let thighAngleR = 0;
        let kneeAngleL = 0; let kneeAngleR = 0;
        let footAngleL = 0; let footAngleR = 0;
        let arbitraryShoulderLRotation = null;
        let arbitraryShoulderRRotation = null;

        const originalHipY = this.initialHipY;
        let currentHipPosition = [0, originalHipY, 0];


        // --- 1. Logika Kedipan Mata ---
        // ... (tetap sama) ...
        const timeInBlinkCycle = time % blinkInterval;
        if (timeInBlinkCycle < blinkDuration) { /* ... */ } else { eyeScaleY = 1.0; }
        if (this.skeleton.eyeL) { /* ... terapkan ... */ }
        if (this.skeleton.eyeR) { /* ... terapkan ... */ }

        // --- 2. Logika Sequence Utama ---
        // Gelengan Kepala
        // ... (tetap sama) ...
        if (time >= headShakeStartTime && time < headShakeEndTime) {
            const headPhaseT = (time - headShakeStartTime) / totalArmActionDuration;
            headRotateY = Math.sin(headPhaseT * 2 * Math.PI) * maxHeadShakeAngle;
        } else {
            headRotateY = 0;
        }

        // Gerakan Jalan -> Kincir Angin
        if (time < walkStartTimeSeq) {
             // Fase Diam Awal (Sebelum Jalan) - Set Lengan ke Bawah
            shoulderLAngleZ_target = defaultShoulderAngleL_Down;
            shoulderRAngleZ_target = defaultShoulderAngleR_Down;
            currentElbowLAngleZ = 0; currentElbowRAngleZ = 0;
            currentHandLAngleY = 0; currentHandRAngleY = 0;
            currentHipPosition = [0, originalHipY, 0];
            arbitraryShoulderLRotation = null; arbitraryShoulderRRotation = null; // Pastikan null

        } else if (time < walkEndTimeSeq) { /* Fase Jalan Maju */
            // Lengan tetap di bawah
            shoulderLAngleZ_target = defaultShoulderAngleL_Down; shoulderRAngleZ_target = defaultShoulderAngleR_Down;
            currentHandLAngleY = 0; currentHandRAngleY = 0;
            currentElbowLAngleZ = 0; currentElbowRAngleZ = 0;
            arbitraryShoulderLRotation = null; arbitraryShoulderRRotation = null; // Pastikan null

            // Animasi kaki dan posisi
            // ... (logika ayunan kaki) ...
             const walkPhaseT = (time - walkStartTimeSeq) / walkDuration;
            const smoothWalkProgress = Math.sin(walkPhaseT * Math.PI / 2);
            currentHipPosition = [0, originalHipY, smoothWalkProgress * walkDistance];
            const timeSinceWalkStart = time - walkStartTimeSeq;
            const t_walkCycle = (timeSinceWalkStart % walkCycleDuration) / walkCycleDuration;
            const swing = Math.sin(t_walkCycle * 2 * Math.PI);
            thighAngleL = swing * maxLegSwingAngle; thighAngleR = -swing * maxLegSwingAngle;
            kneeAngleL = Math.max(0, swing) * (Math.PI / 8); kneeAngleR = Math.max(0, -swing) * (Math.PI / 8);
            footAngleL = 0; footAngleR = 0;

        // *** BARU: Fase Kincir Angin ***
        } else { // Mulai dari windmillStartTime dan seterusnya
           currentHipPosition = [0, originalHipY, walkDistance]; // Kaki diam di posisi akhir jalan
           thighAngleL = 0; thighAngleR = 0; kneeAngleL = 0; kneeAngleR = 0; footAngleL = 0; footAngleR = 0;

           // Hitung sudut putaran kincir
           const timeInWindmill = time - windmillStartTime;
           const currentWindmillAngle = timeInWindmill * windmillSpeed;

           // Buat rotasi sembarang untuk KEDUA bahu
           arbitraryShoulderLRotation = {
               angle: currentWindmillAngle,
               axis: { point: [0,0,0], dir: windmillAxisDirL } // Sumbu Kiri
           };
           arbitraryShoulderRRotation = {
               angle: currentWindmillAngle, // <<< Sudut sama (sinkron)
               axis: { point: [0,0,0], dir: windmillAxisDirR } // <<< Sumbu Kanan
           };

           // Jaga siku dan tangan lurus (atau sedikit tekuk jika diinginkan)
           currentElbowLAngleZ = 0; // Lurus
           currentElbowRAngleZ = 0; // Lurus
           currentHandLAngleY = 0;
           currentHandRAngleY = 0;

           // Target Z tidak digunakan
           shoulderLAngleZ_target = 0; shoulderRAngleZ_target = 0;
        }

        // --- Terapkan Transformasi ---
        // Kepala
        if (this.skeleton.head) {
             setLocalRotationAxisAngle(this.skeleton.head, 'y', headRotateY);
             setLocalRotationAxisAngle(this.skeleton.head, 'x', 0);
             setLocalRotationAxisAngle(this.skeleton.head, 'z', 0);
        }

        // --- Bahu Kiri ---
        const currentShoulderLSpec = this.skeleton.shoulderL.localSpec || {translate: [-1.7, 1.0, 0], rotate: [], scale:[1,1,1]};
        let finalShoulderLRotations = [];
        // Terapkan rotasi Z TARGET (jika tidak kincir) atau T-Pose Z (jika kincir)
        let baseZAngleL = arbitraryShoulderLRotation ? tPoseShoulderLAngleZ : shoulderLAngleZ_target;
        if (baseZAngleL !== 0) {
             finalShoulderLRotations.push({ axis: 'z', angle: baseZAngleL });
        }
        // Tambahkan rotasi kincir jika ada
        if (arbitraryShoulderLRotation) {
            finalShoulderLRotations.push(arbitraryShoulderLRotation);
        }
        this.skeleton.shoulderL.setLocalSpec({
            translate: currentShoulderLSpec.translate,
            rotate: finalShoulderLRotations,
            scale: currentShoulderLSpec.scale
        });
        // Terapkan siku dan tangan kiri
        setLocalRotationAxisAngle(this.skeleton.elbowL, 'z', currentElbowLAngleZ);
        setLocalRotationAxisAngle(this.skeleton.handL, 'y', currentHandLAngleY);


        // --- Bahu Kanan ---
        const currentShoulderRSpec = this.skeleton.shoulderR.localSpec || {translate: [1.7, 1.0, 0], rotate: [], scale:[1,1,1]};
        let finalShoulderRRotations = [];
        // Terapkan rotasi Z TARGET (jika tidak kincir) atau T-Pose Z (jika kincir)
        let baseZAngleR = arbitraryShoulderRRotation ? tPoseShoulderRAngleZ : shoulderRAngleZ_target;
        if (baseZAngleR !== 0) {
             finalShoulderRRotations.push({ axis: 'z', angle: baseZAngleR });
        }
        // Tambahkan rotasi kincir jika ada
        if (arbitraryShoulderRRotation) {
            finalShoulderRRotations.push(arbitraryShoulderRRotation);
        }
        this.skeleton.shoulderR.setLocalSpec({
            translate: currentShoulderRSpec.translate,
            rotate: finalShoulderRRotations,
            scale: currentShoulderRSpec.scale
        });
        // Terapkan siku dan tangan kanan
        setLocalRotationAxisAngle(this.skeleton.elbowR, 'z', currentElbowRAngleZ);
        setLocalRotationAxisAngle(this.skeleton.handR, 'y', currentHandRAngleY);


        // Hip (Hanya Posisi)
        const currentHipSpec = this.skeleton.hip.localSpec || { translate: [0, 0.9, 0], rotate: [], scale: [1,1,1] };
        this.skeleton.hip.setLocalSpec({ translate: currentHipPosition, rotate: [], scale: currentHipSpec.scale });

        // Kaki
        setLocalRotationAxisAngle(this.skeleton.upperLegL, 'x', thighAngleL);
        setLocalRotationAxisAngle(this.skeleton.upperLegR, 'x', thighAngleR);
        setLocalRotationAxisAngle(this.skeleton.kneeL, 'x', kneeAngleL);
        setLocalRotationAxisAngle(this.skeleton.kneeR, 'x', kneeAngleR);
        setLocalRotationAxisAngle(this.skeleton.footL, 'x', footAngleL);
        setLocalRotationAxisAngle(this.skeleton.footR, 'x', footAngleR);

        // Torso
        setLocalRotationAxisAngle(this.skeleton.torso, 'x', 0);
        setLocalRotationAxisAngle(this.skeleton.torso, 'y', 0);
        setLocalRotationAxisAngle(this.skeleton.torso, 'z', 0);

        // Update World Matrix
        this.updateWorld();
    } // Akhir fungsi animate()


    // drawObject() tetap sama seperti sebelumnya
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
        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.lowerArmR, this.offsetMesh.lowerArmLOffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.upperLegL, this.offsetMesh.upperLegLOffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.lowerLegL, this.offsetMesh.lowerLegLOffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.upperLegR, this.offsetMesh.upperLegROffset), C_CREAM, GL.TRIANGLES);
        drawObject(this.meshes.limbMesh.solid.buffers, makeModel(this.skeleton.lowerLegR, this.offsetMesh.lowerLegLOffset), C_CREAM, GL.TRIANGLES);
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