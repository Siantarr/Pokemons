import { BaseCharacter } from '/process/BaseCharacter.js';
import { createModelMatrix, createMesh, drawObject, applyTransformToMesh, recenterMesh } from '../CreateObject.js';
import { MeshUtilsCurves, animateAlongCurve, rotateAroundAxis } from '../MeshUtilsCurves.js';
import { MeshUtils } from '../MeshUtils.js';
import * as Curves from '../curves.js';
import { makeModel } from "../bone.js";
import { GL, attribs } from '../main.js'
// Di bagian atas file mime_jr.js
import { setLocalRotationAxisAngle } from "../bone.js";
import { applyBoneOffsetMesh } from "../bone.js";


export class mime_jr extends BaseCharacter {
    constructor() {
        super();

        const bezierCurve = Curves.cubicBezier3D(
            [0, 0, 0],   // p0 (awal)
            [-2, 2, 0],   // p1 (kontrol 1)
            [0.5, 1.5, 0.5], // p2 (kontrol 2)
            [0.5, 1.5, 0.5], // p2 (kontrol 2)
        );

        // const mouthCurve = Curves.cubicBezier3D(
        //     [-0.5, 0, 0],    // p0 (titik awal, kiri)
        //     [-0.4, -0.3, 0], // p1 (kontrol 1, menarik kurva ke bawah)
        //     [0.4, -0.3, 0],  // p2 (kontrol 2, menarik kurva ke bawah)
        //     [0.5, 0, 0]      // p3 (titik akhir, kanan)
        // );


        // === PEMBUATAN MESH MULUT 2D SECARA MANUAL ===

        // 1. Definisikan dua kurva: bibir atas dan bawah
        const mouthUpperCurve = Curves.cubicBezier3D(
            [-0.5, 0, -0.04],    // p0 (kiri atas)
            [-0.4, -0.1, 0.05],   // p1 (kontrol)
            [0.4, -0.1, 0.07],    // p2 (kontrol)
            [0.5, 0, -0.04]      // p3 (kanan atas)
        );

        const mouthLowerCurve = Curves.cubicBezier3D(
            [-0.5, 0, -0.04],      // p0 (kiri bawah)
            [-0.4, -0.5, -0.05],  // p1 (kontrol)
            [0.4, -0.5, -0.01],   // p2 (kontrol)
            [0.5, 0, -0.04]        // p3 (kanan bawah)
        );

        const toungeUpperCurve = Curves.cubicBezier3D(
            [-0.2, 0, -0.04],    // p0 (kiri atas)
            [-0.1, 0.3, 0.05],   // p1 (kontrol)
            [0.1, 0.3, 0.07],    // p2 (kontrol)
            [0.2, 0, -0.04]      // p3 (kanan atas)
        );

        const toungeLowerCurve = Curves.cubicBezier3D(
            [-0.2, 0, -0.04],      // p0 (kiri bawah)
            [-0.1, -0.05, -0.05],  // p1 (kontrol)
            [0.1, -0.05, -0.01],   // p2 (kontrol)
            [0.2, 0, -0.04]        // p3 (kanan bawah)
        );

        // 2. Ambil sampel titik dari kedua kurva
        const mouthSegments = 30; // Jumlah segmen untuk kehalusan
        const upperPoints = [];
        const lowerPoints = [];
        const toungeupperPoints = [];
        const toungelowerPoints = [];
        for (let i = 0; i <= mouthSegments; i++) {
            const t = i / mouthSegments;
            upperPoints.push(mouthUpperCurve(t));
            lowerPoints.push(mouthLowerCurve(t));
            toungeupperPoints.push(toungeUpperCurve(t));
            toungelowerPoints.push(toungeLowerCurve(t));
        }

        // 3. Bangun array 'positions' dan 'indices' untuk mesh pengisi
        const mouthFillPositions = [];
        const mouthFillIndices = [];
        const toungeFillPositions = [];
        const toungeFillIndices = [];

        // Gabungkan semua titik ke dalam satu array posisi
        upperPoints.forEach(p => mouthFillPositions.push(...p));
        lowerPoints.forEach(p => mouthFillPositions.push(...p));

        toungeupperPoints.forEach(p => toungeFillPositions.push(...p));
        toungelowerPoints.forEach(p => toungeFillPositions.push(...p));

        // "Jahit" titik-titik menjadi segitiga (membuat 'quad strip')
        const numPointsPerCurve = mouthSegments + 1;
        for (let i = 0; i < mouthSegments; i++) {
            const topLeft = i;
            const topRight = i + 1;
            const bottomLeft = i + numPointsPerCurve;
            const bottomRight = i + 1 + numPointsPerCurve;

            // Segitiga pertama: kiri atas, kiri bawah, kanan atas
            mouthFillIndices.push(topLeft, bottomLeft, topRight);
            // Segitiga kedua: kiri bawah, kanan bawah, kanan atas
            mouthFillIndices.push(bottomLeft, bottomRight, topRight);
            // Segitiga pertama: kiri atas, kiri bawah, kanan atas
            toungeFillIndices.push(topLeft, bottomLeft, topRight);
            // Segitiga kedua: kiri bawah, kanan bawah, kanan atas
            toungeFillIndices.push(bottomLeft, bottomRight, topRight);
        }

        // Buat objek mesh mentah (raw mesh)
        const mouthFillRawMesh = {
            positions: new Float32Array(mouthFillPositions),
            // Kita bisa hitung normal agar pencahayaan tetap berfungsi
            normals: MeshUtils.computeNormals(new Float32Array(mouthFillPositions), mouthFillIndices),
            indices: new Uint16Array(mouthFillIndices)
        };
        const toungeFillRawMesh = {
            positions: new Float32Array(toungeFillPositions),
            // Kita bisa hitung normal agar pencahayaan tetap berfungsi
            normals: MeshUtils.computeNormals(new Float32Array(toungeFillPositions), toungeFillIndices),
            indices: new Uint16Array(toungeFillIndices)
        };

        //MESH 
        this.meshes = {
            // BODY and BALL
            bodyMesh: createMesh(MeshUtils.generateEllipticParaboloid, { params: [1, 1, 1.1, 1.5, 32, 16], deferBuffer: false }),
            ballMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.47, 0.47, 0.47, 32, 64], deferBuffer: false }),
            redDotBodyMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.3, 0.3, 0.3, 32, 64], deferBuffer: false }),

            // HEAD and HAIR
            headMesh: createMesh(MeshUtils.generateEllipsoid, { params: [1.4, 1.1, 1.4, 32, 64], deferBuffer: false }),
            leftHairMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.6, 0.7, 0.8, 32, 64], deferBuffer: false }),
            rightHairMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.6, 0.7, 0.8, 32, 64], deferBuffer: false }),
            backHairMesh: createMesh(MeshUtils.generateEllipsoid, { params: [1.5, 0.78, 1, 32, 64], deferBuffer: false }),
            topHairMesh: createMesh(MeshUtils.generateTorus, { params: [0.45, 0.9, 64, 64], deferBuffer: false }),
            hatCoverMesh: createMesh(MeshUtils.generateEllipticParaboloid, { params: [0.35, 0.35, 1, 0.4, 32, 16], deferBuffer: false }),
            coneHatMesh: createMesh(MeshUtils.generateCone, { params: [0.2, 1, 32], deferBuffer: false }),
            topHatMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.3, 0.3, 0.3, 32, 64], deferBuffer: false }),

            // NOSE and EYES
            noseMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.35, 0.3, 0.3, 32, 64], deferBuffer: false }),
            eyeMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.2, 0.3, 0.05, 32, 64], deferBuffer: false }),
            doteyeMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.05, 0.1, 0.005, 32, 64], deferBuffer: false }),

            // ARMS
            upperArmMesh: createMesh(MeshUtils.generateEllipticalCylinder, { params: [0.05, 0.05, 0.05, 0.05, 1.2], deferBuffer: false }),
            lowerArmMesh: createMesh(MeshUtils.generateEllipticalCylinder, { params: [0.05, 0.05, 0.05, 0.05, 0.7], deferBuffer: false }),
            armEngselMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.05, 0.05, 0.05, 32, 64], deferBuffer: false }),
            palmBaseMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.5, 0.1, 0.2, 32, 64], deferBuffer: false }),
            // upperPalmMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.3, 0.15, 0.2, 32, 64], deferBuffer: false }),

            //BOTTOM and LEGS
            legMesh: createMesh(MeshUtils.generateEllipticParaboloid, { params: [0.5, 0.5, 0.75, 1, 32, 16], deferBuffer: false }),
            legEngselMesh: createMesh(MeshUtils.generateEllipsoid, { params: [0.55, 0.55, 0.55, 32, 64], deferBuffer: false }),
            buttMesh: createMesh(MeshUtils.generateEllipsoid, { params: [1, 0.8, 1, 32, 64], deferBuffer: false }),

            // CURVES
            hatMesh: createMesh(MeshUtilsCurves.generateVariableTube,
                {
                    params: [bezierCurve, 0, 1, 50, [0.8, 0.5, 0.3, 0.2], 24], deferBuffer: false
                }),

            // mouthMesh: createMesh(MeshUtilsCurves.generateVariableTube, {
            //     params: [mouthCurve, 0, 1, 50, [0.05], 8], deferBuffer: false
            // }),

            // === MESH MULUT BARU ===
            mouthFillMesh: { solid: { mesh: mouthFillRawMesh, buffers: MeshUtils.createMeshBuffers(GL, mouthFillRawMesh, attribs) } },
            upperLipOutlineMesh: createMesh(MeshUtilsCurves.generateVariableTube, {
                params: [mouthUpperCurve, 0, 1, mouthSegments, [0.002], 8], // Sangat tipis
                deferBuffer: false
            }),
            lowerLipOutlineMesh: createMesh(MeshUtilsCurves.generateVariableTube, {
                params: [mouthLowerCurve, 0, 1, mouthSegments, [0.002], 8], // Sangat tipis
                deferBuffer: false
            }),

            // TOUNGE
            toungeFillMesh: { solid: { mesh: toungeFillRawMesh, buffers: MeshUtils.createMeshBuffers(GL, toungeFillRawMesh, attribs) } },
            upperToungeOutlineMesh: createMesh(MeshUtilsCurves.generateVariableTube, {
                params: [toungeUpperCurve, 0, 1, mouthSegments, [0.002], 8], // Sangat tipis
                deferBuffer: false
            }),
            lowerToungeOutlineMesh: createMesh(MeshUtilsCurves.generateVariableTube, {
                params: [toungeLowerCurve, 0, 1, mouthSegments, [0.002], 8], // Sangat tipis
                deferBuffer: false
            }),

            // #6 Buffer mesh hasil mesh ke GPU
            // holeOnCubeMesh: MeshUtils.createMeshBuffers(GL, holeOnCubeMesh, attribs)

        }

        this.skeleton = {
            neck: this.createBone("neck", null, { translate: [0, 0, 0] }),
            head: this.createBone("head", "neck", { translate: [0, 0.9, 0] }),

            //HAIR
            lefthair: this.createBone("lefthair", "head", { translate: [1.4, 0, 0] }),
            righthair: this.createBone("righthair", "head", { translate: [-1.4, 0, 0] }),
            backhair: this.createBone("backhair", "head", { translate: [0, 0, -0.8] }),
            tophair: this.createBone("tophair", "head", { translate: [0, 0.78, -0.1] }),

            //NOSE and MOUTH
            nose: this.createBone("nose", "head", { translate: [0, -0.1, 1.4] }),
            // Di dalam this.skeleton
            mouth: this.createBone("mouth", "head", { translate: [0, -0.5, 1.2] }),
            tongue: this.createBone("tongue", "mouth", { translate: [0, -0.3, -0.14] }),

            //EYES
            lefteye: this.createBone("lefteye", "head", { translate: [-0.7, 0, 1.2] }),
            righteye: this.createBone("righteye", "head", { translate: [0.7, 0, 1.2] }),
            leftdotteye: this.createBone("leftdoteye", "lefteye", { translate: [0, 0, 0.06] }),
            rightdotteye: this.createBone("rightdoteye", "righteye", { translate: [0, 0, 0.06] }),

            //SHOULDER n ARM
            shoulder: this.createBone("shoulder", "neck", { translate: [0, -0.3, 0] }),
            hip: this.createBone("hip", "shoulder", { translate: [0, -1., 0] }),
            leftUpperArm: this.createBone("leftUpperArm", "shoulder", { translate: [-0.5, 0, 0] }),
            rightUpperArm: this.createBone("rightUpperArm", "shoulder", { translate: [0.5, 0, 0] }),
            leftLowerArm: this.createBone("leftLowerArm", "leftUpperArm", { translate: [-1.1, 0, 0] }),
            rightLowerArm: this.createBone("rightLowerArm", "rightUpperArm", { translate: [1.1, 0, 0] }),
            leftPalmArm: this.createBone("leftPalmArm", "leftLowerArm", { translate: [-0.67, 0, 0] }),
            rightPalmArm: this.createBone("rightPalmArm", "rightLowerArm", { translate: [0.67, 0, 0] }),

            // BALL BODY
            ball1: this.createBone("ball", "hip", { translate: [-0.4, 0, 1] }),
            ball2: this.createBone("ball", "hip", { translate: [0.4, 0, 1] }),
            ball3: this.createBone("ball", "hip", { translate: [-1, 0, 0.43] }),
            ball4: this.createBone("ball", "hip", { translate: [1, 0, 0.43] }),
            ball5: this.createBone("ball", "hip", { translate: [0.9, 0, -0.4] }),
            ball6: this.createBone("ball", "hip", { translate: [-0.9, 0, -0.4] }),
            ball7: this.createBone("ball", "hip", { translate: [0.4, 0, -1] }),
            ball8: this.createBone("ball", "hip", { translate: [-0.4, 0, -1] }),

            // BOTTOM and LEG
            butt: this.createBone("butt", "hip", { translate: [0, -0.1, 0] }),
            leftLeg: this.createBone("leftLeg", "butt", { translate: [-0.5, -0.5, 0] }),
            rightLeg: this.createBone("rightLeg", "butt", { translate: [0.5, -0.5, 0] }),
            hat: this.createBone("hat", "tophair", { translate: [0, 0.1, -0.3] }),



        }

        this.updateWorld();

        this.offsetMesh = {
            //BODY and BALL
            bodyOffset: createModelMatrix({
                translate: [0, 0.3, 0], rotate: [
                    { axis: "x", angle: Math.PI / 2 },] // rotasi 90° sumbu X
            }),
            ballOffset: createModelMatrix({ translate: [0, 0, 0] }),
            leftUpperArmOffset: createModelMatrix({
                translate: [-0.5, 0, 0], rotate: [
                    { axis: "z", angle: Math.PI / 2 },
                ]
            }),
            redDotBodyOffset: createModelMatrix({ translate: [0, 0.6, 0.8] }),


            //HEAD and HAIR
            headOffset: createModelMatrix({ translate: [0, 0, 0] }),
            lefthairOffset: createModelMatrix({ translate: [0, 0, 0] }),
            righthairOffset: createModelMatrix({ translate: [0, 0, 0] }),
            backhairOffset: createModelMatrix({ translate: [0, 0, 0] }),
            tophairOffset: createModelMatrix({ translate: [0, 0, 0] }),

            // HAT
            hatOffset: createModelMatrix({
                translate: [0, 0, 0], rotate: [
                    { axis: "y", angle: Math.PI / 2 },
                ]
            }),
            hatCoverOffset: createModelMatrix({
                translate: [0.54, 1.51, -0.88], rotate: [
                    { axis: "y", angle: -Math.PI / 25 },
                    { axis: "z", angle: Math.PI / 30 }
                ]
            }),
            hatConeOffset: createModelMatrix({
                translate: [0.52, 1.51, -0.62], rotate: [
                    { axis: "x", angle: Math.PI / 10 },
                ]
            }),
            topHatOffset: createModelMatrix({
                translate: [0.5, 2.5, -0.35]
            }),


            // NOSE and EYES
            noseOffset: createModelMatrix({ translate: [0, 0, 0] }),
            lefteyeOffset: createModelMatrix({
                translate: [0, 0, 0], rotate: [
                    { axis: "y", angle: -Math.PI / 6 },
                ]
            }),
            righteyeOffset: createModelMatrix({
                translate: [0, 0, 0], rotate: [
                    { axis: "y", angle: Math.PI / 6 },
                ]
            }),
            leftdoteyeOffset: createModelMatrix({
                translate: [0, 0, 0], rotate: [
                    { axis: "y", angle: -Math.PI / 6 },
                ]
            }),
            rightdoteyeOffset: createModelMatrix({
                translate: [0, 0, 0], rotate: [
                    { axis: "y", angle: Math.PI / 6 },
                ]
            }),
            mouthOffset: createModelMatrix({
                translate: [0, 0, 0], rotate: [
                    { axis: "x", angle: Math.PI / 6 },
                ]
            }),
            tongueOffset: createModelMatrix({
                translate: [0, 0, -0.02], rotate: [
                    { axis: "x", angle: Math.PI / 6 },
                ]
            }),

            // ARMS
            leftLowerArmOffset: createModelMatrix({
                translate: [-0.3, 0, 0], rotate: [
                    { axis: "z", angle: Math.PI / 2 },
                ]
            }),
            rightUpperArmOffset: createModelMatrix({
                translate: [0.5, 0, 0], rotate: [
                    { axis: "z", angle: Math.PI / 2 },
                ]
            }),
            rightLowerArmOffset: createModelMatrix({
                translate: [0.3, 0, 0], rotate: [
                    { axis: "z", angle: Math.PI / 2 },
                ]
            }),
            leftUpperArmEngselOffset: createModelMatrix({ translate: [0.1, 0, 0] }),
            rightUpperArmEngselOffset: createModelMatrix({ translate: [-0.1, 0, 0] }),

            leftLowerArmEngselOffset: createModelMatrix({ translate: [-1.1, 0, 0] }),
            rightLowerArmEngselOffset: createModelMatrix({ translate: [1.1, 0, 0] }),

            leftPalmArmEngselOffset: createModelMatrix({ translate: [-0.66, 0, 0] }),
            rightPalmArmEngselOffset: createModelMatrix({ translate: [0.66, 0, 0] }),

            leftPalmOffset: createModelMatrix({ translate: [-0.45, 0, 0] }),
            rightPalmOffset: createModelMatrix({ translate: [0.45, 0, 0] }),
            // leftUpperPalmOffset: createModelMatrix({translate: [-0.6,0.,0]}),
            // rightUpperPalmOffset: createModelMatrix({translate: [0.45,0,0]}),

            // BOTTOM and LEGS
            buttOffset: createModelMatrix({
                translate: [0, 0, 0],
            }),

            leftLegOffset: createModelMatrix({
                translate: [0, -0.8, 0], rotate: [
                    { axis: "x", angle: -Math.PI / 2 },
                ]
            }),
            rightLegOffset: createModelMatrix({
                translate: [0, -0.8, 0], rotate: [
                    { axis: "x", angle: -Math.PI / 2 },
                ]
            }),

            leftLegEngselOffset: createModelMatrix({
                translate: [0, 0.2, 0]
            }),
            rightLegEngselOffset: createModelMatrix({
                translate: [0, 0.2, 0]
            }),


        }
    }

    animate(time) {

        const yOffset = 0.15;
        const xOffset = 0;
        const zOffset = 0;

        // --- DURASI BARU ---
        const totalDuration = 20000;
        const introDurationSeconds = 8;
        const danceDurationSeconds = 12;

        const t_total = (time % totalDuration) / totalDuration;
        const introEndTime = introDurationSeconds / (introDurationSeconds + danceDurationSeconds);

        // --- Variabel Gerakan ---
        const maxLegSwing = Math.PI / 4;
        const initialArmAngle = -Math.PI / 18; // -10 derajat (lengan kanan)
        const armRiseAngle = Math.PI / 6;      // 30 derajat

        if (t_total < introEndTime) {
            // ======================================================
            // === FASE INTRO BARU (0 -> 8 detik) ===
            // ======================================================
            const t_intro = t_total / introEndTime;

            const walkForwardEnd = 2 / 8;
            const poseEnd = 4 / 8;
            const walkBackwardEnd = 6 / 8;

            this.skeleton.neck.setLocalSpec({ rotate: [] });

            if (t_intro < walkForwardEnd) {
                // --- 1. Berjalan Maju (0-2 detik) ---
                const phaseT = t_intro / walkForwardEnd;
                const walkDistance = 1.5;
                const smoothProgress = Math.sin(phaseT * Math.PI / 2);

                // Gerakan maju (Translate)
                const currentPos = [xOffset, yOffset, zOffset + phaseT * walkDistance];
                this.skeleton.neck.setLocalSpec({ translate: currentPos });

                // Gerakan kaki berjalan
                const legAngle = Math.sin(phaseT * 2 * Math.PI) * maxLegSwing;
                setLocalRotationAxisAngle(this.skeleton.leftLeg, 'x', -legAngle);
                setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', legAngle);

                // Lengan turun perlahan ke -10 derajat
                const currentArmAngle = smoothProgress * initialArmAngle;
                setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'z', -currentArmAngle); // Positif 10 derajat
                setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'z', currentArmAngle);  // Negatif 10 derajat

                // Mata kembali normal
                this.skeleton.lefteye.setLocalSpec({ scale: [1, 1, 1] });

            } else if (t_intro < poseEnd) {
                // --- 2. Berhenti dan Pose (2-4 detik) ---
                const phaseT = (t_intro - walkForwardEnd) / (poseEnd - walkForwardEnd);
                const smoothProgress = Math.sin(phaseT * Math.PI / 2);
                const walkDistance = 1.5;

                this.skeleton.neck.setLocalSpec({ translate: [xOffset, yOffset, zOffset + walkDistance] });

                // Kaki berhenti
                setLocalRotationAxisAngle(this.skeleton.leftLeg, 'x', 0);
                setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', 0);

                // Lengan Kiri tetap di -10 derajat
                setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'z', -initialArmAngle);

                // Lengan Kanan naik perlahan ke 30 derajat
                const currentRightArmAngle = initialArmAngle + smoothProgress * (armRiseAngle - initialArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'z', currentRightArmAngle);

                const maxPalmAngle = Math.PI / 2;
                const currentPalmAngle = smoothProgress * maxPalmAngle;
                setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'x', -currentPalmAngle);


                // Mata kiri "wink"
                this.skeleton.lefteye.setLocalSpec({ scale: [1, 0.01, 1] });

            } else if (t_intro < walkBackwardEnd) {
                // --- 3. Berjalan Mundur (4-6 detik) ---
                const phaseT = (t_intro - poseEnd) / (walkBackwardEnd - poseEnd);
                const smoothProgress = Math.sin(phaseT * Math.PI / 2);
                const walkDistance = 1.5;

                // Gerakan mundur (Translate)
                const currentPos = [xOffset, yOffset, zOffset + walkDistance * (1 - phaseT)];
                this.skeleton.neck.setLocalSpec({ translate: currentPos });

                // Gerakan kaki berjalan mundur
                const legAngle = Math.sin(phaseT * 2 * Math.PI) * maxLegSwing;
                setLocalRotationAxisAngle(this.skeleton.leftLeg, 'x', -legAngle);
                setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', legAngle);

                // Mata kembali normal
                this.skeleton.lefteye.setLocalSpec({ scale: [1, 1, 1] });

            } else {
                // --- 4. Transisi ke Tarian (6-8 detik) ---
                const phaseT = (t_intro - walkBackwardEnd) / (1 - walkBackwardEnd);
                const smoothProgress = Math.sin(phaseT * Math.PI / 2);

                this.skeleton.neck.setLocalSpec({ translate: [xOffset, yOffset, zOffset] });
                setLocalRotationAxisAngle(this.skeleton.leftLeg, 'x', 0);
                setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', 0);

                // Kedua lengan kembali ke posisi 0 derajat (posisi awal tarian)
                const finalRightArmAngle = armRiseAngle * (1 - smoothProgress);
                const finalLeftArmAngle = -initialArmAngle * (1 - smoothProgress);
                setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'z', finalRightArmAngle);
                setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'z', finalLeftArmAngle);

                const maxPalmAngle = Math.PI / 2;
                const currentPalmAngle = (1 - smoothProgress) * maxPalmAngle;
                setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'x', -currentPalmAngle);


                this.skeleton.lefteye.setLocalSpec({ scale: [1, 1, 1] });
            }

        } else {
            // ======================================================
            // === FASE TARIAN LAMA (8 -> 20 detik) ===
            // ======================================================
            // Waktu dinormalisasi khusus untuk bagian tarian (0.0 -> 1.0 selama 12 detik)
            const t_dance = (t_total - introEndTime) / (1 - introEndTime);

            // --- SEMUA KODE ANIMASI LAMA ANDA DITEMPATKAN DI SINI ---
            // (Saya sudah menyalin dan menyesuaikannya untuk Anda di bawah)
            const maxArmAngle = Math.PI / 10;
            const maxArmForwardAngle = Math.PI / 4;
            const maxLegAngle = -Math.PI / 4;
            const maxPalmAngle = Math.PI / 2;
            const maxBodyTiltAngle = Math.PI / 10;
            const pivotPoint = [0.5 + xOffset, -2.7 + yOffset, 0 + zOffset];
            const phase1End = 2 / 12;
            const phase2End = 6 / 12;
            const phase3End = 10 / 12;

            // Reset posisi translate dari intro
            this.skeleton.neck.setLocalSpec({ translate: [xOffset, yOffset, zOffset] });

            if (t_dance < phase1End) {
                const phaseT = t_dance / phase1End;
                const smoothProgress = Math.sin(phaseT * Math.PI / 2);
                const currentArmAngle = smoothProgress * maxArmAngle;
                const currentLegAngle = smoothProgress * maxLegAngle;
                setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'z', -currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'z', currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.leftLowerArm, 'z', -currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightLowerArm, 'z', currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'z', -currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'z', currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', -currentLegAngle);
                this.skeleton.neck.setLocalSpec({ rotate: [] });
                setLocalRotationAxisAngle(this.skeleton.shoulder, 'x', 0);
            } else if (t_dance < phase2End) {
                const phaseT = (t_dance - phase1End) / (phase2End - phase1End);
                const smoothTiltProgress = Math.sin(phaseT * Math.PI / 2);
                const currentBodyTilt = smoothTiltProgress * maxBodyTiltAngle;
                setLocalRotationAxisAngle(this.skeleton.shoulder, 'x', currentBodyTilt);
                const bodyRotation = phaseT * 4 * Math.PI;
                setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'z', -maxArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'z', maxArmAngle);
                setLocalRotationAxisAngle(this.skeleton.leftLowerArm, 'z', -maxArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightLowerArm, 'z', maxArmAngle);
                setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'z', -maxArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'z', maxArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', -maxLegAngle);
                const arbitraryRotation = { angle: -bodyRotation, axis: { point: pivotPoint, dir: [0, 1, 0] } };
                this.skeleton.neck.setLocalSpec({ rotate: [arbitraryRotation] });
            } else if (t_dance < phase3End) {
                const phaseT = (t_dance - phase2End) / (phase3End - phase2End);
                const smoothProgress = Math.sin(phaseT * Math.PI / 2);

                const currentBodyTilt = (1 - smoothProgress) * maxBodyTiltAngle;
                setLocalRotationAxisAngle(this.skeleton.shoulder, 'x', currentBodyTilt);

                const bodyRotation = (4 * Math.PI) + (phaseT * 4 * Math.PI);
                const currentArmAngle = (1 - smoothProgress) * maxArmAngle;
                const currentArmForwardAngle = smoothProgress * maxArmForwardAngle;
                const currentPalmAngle = smoothProgress * maxPalmAngle;

                setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'z', -currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'z', currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.leftLowerArm, 'z', -currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightLowerArm, 'z', currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'z', -currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'z', currentArmAngle);
                setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'y', currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'y', -currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.leftLowerArm, 'y', currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.rightLowerArm, 'y', -currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'y', currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'y', -currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'x', -currentPalmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'x', -currentPalmAngle);
                
                setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', -maxLegAngle);
                const arbitraryRotation = { angle: -bodyRotation, axis: { point: pivotPoint, dir: [0, 1, 0] } };
                this.skeleton.neck.setLocalSpec({ rotate: [arbitraryRotation] });
            } else {
                const phaseT = (t_dance - phase3End) / (1 - phase3End);
                const smoothProgress = Math.sin(phaseT * Math.PI / 2);
                const currentLegAngle = (1 - smoothProgress) * maxLegAngle;
                const currentArmForwardAngle = (1 - smoothProgress) * maxArmForwardAngle;
                const currentPalmAngle = (1 - smoothProgress) * maxPalmAngle;
                setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'z', 0);
                setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'z', 0);
                setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'y', currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'y', -currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.leftLowerArm, 'y', currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.rightLowerArm, 'y', -currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'y', currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'y', -currentArmForwardAngle);
                setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'x', -currentPalmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'x', -currentPalmAngle);
                setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', -currentLegAngle);
                this.skeleton.neck.setLocalSpec({ rotate: [] });
                setLocalRotationAxisAngle(this.skeleton.shoulder, 'x', 0);
            }
        }

        // 💡 PENTING! Selalu panggil updateWorld() setelah memodifikasi tulang
        this.updateWorld();
    }
    // animate(time) {
    //     // Total durasi untuk satu siklus animasi (misalnya 4000ms atau 4 detik)
    //     const duration = 12000;

    //     // Buat 't' sebagai nilai yang berulang dari 0.0 hingga 1.0 sesuai durasi
    //     const t = (time % duration) / duration;

    //     // Tentukan sudut maksimum untuk gerakan
    //     const maxArmAngle = Math.PI / 10; // Lengan naik 90 derajat
    //     const maxArmForwardAngle = Math.PI / 4;
    //     const maxLegAngle = -Math.PI / 4; // Kaki kanan ke belakang 72 derajat
    //     const maxPalmAngle = Math.PI / 2;
    //     // --- TAMBAHAN BARU: Sudut maksimal tubuh condong ke depan ---
    //     const maxBodyTiltAngle = Math.PI / 10; // Condong sekitar 15 derajat

    //     // --- PERUBAHAN BARU: Tentukan titik pivot di posisi kaki kiri ---
    //     // Posisi ini dihitung dari root (neck) ke leftLeg
    //     // neck -> shoulder -> hip -> butt -> leftLeg
    //     // y: -0.3  -1.0  -0.1  -1.3 = -2.7
    //     // x: 0     0     0     -0.5 = -0.5
    //     const pivotPoint = [0.5, -2.7, 0];

    //     // Definisikan batas waktu untuk setiap fase (dalam skala 0.0 - 1.0)
    //     const phase1End = 2 / 12;  // 2 detik
    //     const phase2End = 6 / 12;  // 2 + 4 detik
    //     const phase3End = 10 / 12; // 6 + 4 detik

    //     // --- Logika Fase Animasi ---
    //     if (t < phase1End) {
    //         // === FASE 1: 0 -> 2 detik (Angkat Lengan & Kaki) ===
    //         const phaseT = t / phase1End;
    //         const smoothProgress = Math.sin(phaseT * Math.PI / 2);

    //         const currentArmAngle = smoothProgress * maxArmAngle;
    //         const currentLegAngle = smoothProgress * maxLegAngle;

    //         // Terapkan rotasi ke tulang yang sesuai
    //         setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'z', -currentArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'z', currentArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.leftLowerArm, 'z', -currentArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightLowerArm, 'z', currentArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'z', -currentArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'z', currentArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', -currentLegAngle);

    //         // Pastikan rotasi badan tetap 0 di fase ini
    //         // --- PERUBAHAN: Hapus semua rotasi di neck ---
    //         this.skeleton.neck.setLocalSpec({ rotate: [] });
    //         setLocalRotationAxisAngle(this.skeleton.shoulder, 'x', 0);

    //     } else if (t < phase2End) {
    //         // === FASE 2: 2 -> 6 detik (Putaran Pertama + Condong ke Depan) ===
    //         const phaseT = (t - phase1End) / (phase2End - phase1End);

    //         const smoothTiltProgress = Math.sin(phaseT * Math.PI / 2);
    //         const currentBodyTilt = smoothTiltProgress * maxBodyTiltAngle;
    //         setLocalRotationAxisAngle(this.skeleton.shoulder, 'x', currentBodyTilt);

    //         // Berputar 2 kali (4 * PI)
    //         const bodyRotation = phaseT * 4 * Math.PI;

    //         // Kunci posisi lengan dan kaki tetap terangkat
    //         setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'z', -maxArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'z', maxArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.leftLowerArm, 'z', -maxArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightLowerArm, 'z', maxArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'z', -maxArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'z', maxArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', -maxLegAngle);

    //         // --- PERUBAHAN: Terapkan rotasi pada sumbu arbitrer ---
    //         const arbitraryRotation = {
    //             angle: -bodyRotation,
    //             axis: { point: pivotPoint, dir: [0, 1, 0] }
    //         };
    //         this.skeleton.neck.setLocalSpec({ rotate: [arbitraryRotation] });

    //     } else if (t < phase3End) {
    //         // === FASE 3: 6 -> 10 detik (Putaran Kedua + Transisi Lengan + Tubuh Tegak) ===
    //         const phaseT = (t - phase2End) / (phase3End - phase2End);
    //         const smoothProgress = Math.sin(phaseT * Math.PI / 2);

    //         const currentBodyTilt = (1 - smoothProgress) * maxBodyTiltAngle;
    //         setLocalRotationAxisAngle(this.skeleton.shoulder, 'x', currentBodyTilt);

    //         // Lanjutkan putaran dari 2x ke 4x (dari 4*PI ke 8*PI)
    //         const bodyRotation = (4 * Math.PI) + (phaseT * 4 * Math.PI);

    //         // Sambil berputar, lengan turun dan bergerak maju
    //         const currentArmAngle = (1 - smoothProgress) * maxArmAngle;
    //         const currentArmForwardAngle = smoothProgress * maxArmForwardAngle;
    //         const currentPalmAngle = smoothProgress * maxPalmAngle;

    //        // Terapkan gerakan lengan turun (Z-axis)
    //         setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'z', -currentArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'z', currentArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.leftLowerArm, 'z', -currentArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightLowerArm, 'z', currentArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'z', -currentArmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'z', currentArmAngle);

    //         // Terapkan gerakan lengan maju (Y-axis)
    //         setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'y', currentArmForwardAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'y', -currentArmForwardAngle);
    //         setLocalRotationAxisAngle(this.skeleton.leftLowerArm, 'y', currentArmForwardAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightLowerArm, 'y', -currentArmForwardAngle);
    //         setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'y', currentArmForwardAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'y', -currentArmForwardAngle);
    //         setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'x', -currentPalmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'x', -currentPalmAngle);

    //         // Kunci posisi kaki tetap terangkat
    //         setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', -maxLegAngle);

    //         // --- PERUBAHAN: Terapkan rotasi pada sumbu arbitrer ---
    //         const arbitraryRotation = {
    //             angle: -bodyRotation,
    //             axis: { point: pivotPoint, dir: [0, 1, 0] }
    //         };
    //         this.skeleton.neck.setLocalSpec({ rotate: [arbitraryRotation] });

    //     } else {
    //         // === FASE 4: 10 -> 12 detik (Reset Posisi) ===
    //         const phaseT = (t - phase3End) / (1 - phase3End);
    //         const smoothProgress = Math.sin(phaseT * Math.PI / 2);

    //        // Kaki turun dan Tangan kembali ke samping
    //         const currentLegAngle = (1 - smoothProgress) * maxLegAngle;
    //         const currentArmForwardAngle = (1 - smoothProgress) * maxArmForwardAngle;
    //         const currentPalmAngle = (1 - smoothProgress) * maxPalmAngle;

    //         // Kunci lengan di posisi bawah (Z-axis = 0)
    //         setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'z', 0);
    //         setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'z', 0);

    //         // Gerakkan lengan kembali ke samping (Y-axis)
    //         setLocalRotationAxisAngle(this.skeleton.leftUpperArm, 'y', currentArmForwardAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightUpperArm, 'y', -currentArmForwardAngle);
    //         setLocalRotationAxisAngle(this.skeleton.leftLowerArm, 'y', currentArmForwardAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightLowerArm, 'y', -currentArmForwardAngle);
    //         setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'y', currentArmForwardAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'y', -currentArmForwardAngle);

    //         setLocalRotationAxisAngle(this.skeleton.leftPalmArm, 'x', -currentPalmAngle);
    //         setLocalRotationAxisAngle(this.skeleton.rightPalmArm, 'x', -currentPalmAngle);

    //         // Gerakkan kaki turun
    //         setLocalRotationAxisAngle(this.skeleton.rightLeg, 'x', currentLegAngle);

    //         // Pastikan badan berhenti berputar dan menghadap depan
    //         // --- PERUBAHAN: Hapus semua rotasi di neck ---
    //         this.skeleton.neck.setLocalSpec({ rotate: [] });
    //         setLocalRotationAxisAngle(this.skeleton.shoulder, 'x', 0);
    //     }

    //     // 💡 PENTING! Selalu panggil updateWorld() setelah memodifikasi tulang
    //     this.updateWorld();
    // }


    drawObject() {

        // BODY
        drawObject(this.meshes.bodyMesh.solid.buffers, makeModel(this.skeleton.shoulder, this.offsetMesh.bodyOffset), [1, 0.78, 0.94], GL.TRIANGLES)

        // HEAD AND HAIR
        drawObject(this.meshes.headMesh.solid.buffers, makeModel(this.skeleton.head, this.offsetMesh.headOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.leftHairMesh.solid.buffers, makeModel(this.skeleton.lefthair, this.offsetMesh.lefthairOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.rightHairMesh.solid.buffers, makeModel(this.skeleton.righthair, this.offsetMesh.righthairOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.backHairMesh.solid.buffers, makeModel(this.skeleton.backhair, this.offsetMesh.backhairOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.topHairMesh.solid.buffers, makeModel(this.skeleton.tophair, this.offsetMesh.tophairOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.hatMesh.solid.buffers, makeModel(this.skeleton.hat, this.offsetMesh.hatOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.hatMesh.solid.buffers, makeModel(this.skeleton.hat, this.offsetMesh.hatOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.hatCoverMesh.solid.buffers, makeModel(this.skeleton.hat, this.offsetMesh.hatCoverOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.coneHatMesh.solid.buffers, makeModel(this.skeleton.hat, this.offsetMesh.hatConeOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.topHatMesh.solid.buffers, makeModel(this.skeleton.hat, this.offsetMesh.topHatOffset), [1, 1, 1], GL.TRIANGLES)

        // NOSE
        drawObject(this.meshes.noseMesh.solid.buffers, makeModel(this.skeleton.nose, this.offsetMesh.noseOffset), [1, 0.3, 0.46], GL.TRIANGLES)

        // === GAMBAR MULUT 2D ===
        const mouthModel = makeModel(this.skeleton.mouth, this.offsetMesh.mouthOffset);

        // 1. Gambar isian mulut (warna merah gelap)
        drawObject(this.meshes.mouthFillMesh.solid.buffers, mouthModel, [0.51, 0.153, 0.235], GL.TRIANGLES);

        // 2. Gambar garis bibir atas (warna hitam/gelap)
        drawObject(this.meshes.upperLipOutlineMesh.solid.buffers, mouthModel, [0.314, 0.137, 0.176], GL.TRIANGLES);

        // 3. Gambar garis bibir bawah (warna hitam/gelap)
        drawObject(this.meshes.lowerLipOutlineMesh.solid.buffers, mouthModel, [0.314, 0.137, 0.176], GL.TRIANGLES);

        // === GAMBAR TONGUE 2D ===
        const tongueModel = makeModel(this.skeleton.tongue, this.offsetMesh.tongueOffset);

        // 1. Gambar isian mulut (warna merah gelap)
        drawObject(this.meshes.toungeFillMesh.solid.buffers, tongueModel, [1, 0.38, 0.584], GL.TRIANGLES);

        // 2. Gambar garis bibir atas (warna hitam/gelap)
        drawObject(this.meshes.upperToungeOutlineMesh.solid.buffers, tongueModel, [1, 0.38, 0.584], GL.TRIANGLES);

        // 3. Gambar garis bibir bawah (warna hitam/gelap)
        drawObject(this.meshes.lowerToungeOutlineMesh.solid.buffers, tongueModel, [1, 0.38, 0.584], GL.TRIANGLES);



        // EYES
        drawObject(this.meshes.eyeMesh.solid.buffers, makeModel(this.skeleton.lefteye, this.offsetMesh.lefteyeOffset), [0, 0, 0], GL.TRIANGLES)
        drawObject(this.meshes.eyeMesh.solid.buffers, makeModel(this.skeleton.righteye, this.offsetMesh.righteyeOffset), [0, 0, 0], GL.TRIANGLES)
        drawObject(this.meshes.doteyeMesh.solid.buffers, makeModel(this.skeleton.leftdotteye, this.offsetMesh.leftdoteyeOffset), [1, 1, 1], GL.TRIANGLES)
        drawObject(this.meshes.doteyeMesh.solid.buffers, makeModel(this.skeleton.rightdotteye, this.offsetMesh.rightdoteyeOffset), [1, 1, 1], GL.TRIANGLES)

        // BODY BALL
        drawObject(this.meshes.ballMesh.solid.buffers, makeModel(this.skeleton.ball1, this.offsetMesh.ballOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.ballMesh.solid.buffers, makeModel(this.skeleton.ball2, this.offsetMesh.ballOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.ballMesh.solid.buffers, makeModel(this.skeleton.ball3, this.offsetMesh.ballOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.ballMesh.solid.buffers, makeModel(this.skeleton.ball4, this.offsetMesh.ballOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.ballMesh.solid.buffers, makeModel(this.skeleton.ball5, this.offsetMesh.ballOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.ballMesh.solid.buffers, makeModel(this.skeleton.ball6, this.offsetMesh.ballOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.ballMesh.solid.buffers, makeModel(this.skeleton.ball7, this.offsetMesh.ballOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.ballMesh.solid.buffers, makeModel(this.skeleton.ball8, this.offsetMesh.ballOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.redDotBodyMesh.solid.buffers, makeModel(this.skeleton.hip, this.offsetMesh.redDotBodyOffset), [1, 0.3, 0.46], GL.TRIANGLES)

        // ARMS
        drawObject(this.meshes.upperArmMesh.solid.buffers, makeModel(this.skeleton.leftUpperArm, this.offsetMesh.leftUpperArmOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.upperArmMesh.solid.buffers, makeModel(this.skeleton.rightUpperArm, this.offsetMesh.rightUpperArmOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.lowerArmMesh.solid.buffers, makeModel(this.skeleton.leftLowerArm, this.offsetMesh.leftLowerArmOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.lowerArmMesh.solid.buffers, makeModel(this.skeleton.rightLowerArm, this.offsetMesh.rightLowerArmOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.armEngselMesh.solid.buffers, makeModel(this.skeleton.leftUpperArm, this.offsetMesh.leftUpperArmEngselOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.armEngselMesh.solid.buffers, makeModel(this.skeleton.rightUpperArm, this.offsetMesh.rightUpperArmEngselOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.armEngselMesh.solid.buffers, makeModel(this.skeleton.leftUpperArm, this.offsetMesh.leftLowerArmEngselOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.armEngselMesh.solid.buffers, makeModel(this.skeleton.rightUpperArm, this.offsetMesh.rightLowerArmEngselOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.armEngselMesh.solid.buffers, makeModel(this.skeleton.leftLowerArm, this.offsetMesh.leftPalmArmEngselOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.armEngselMesh.solid.buffers, makeModel(this.skeleton.rightLowerArm, this.offsetMesh.rightPalmArmEngselOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.palmBaseMesh.solid.buffers, makeModel(this.skeleton.leftPalmArm, this.offsetMesh.leftPalmOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        drawObject(this.meshes.palmBaseMesh.solid.buffers, makeModel(this.skeleton.rightPalmArm, this.offsetMesh.rightPalmOffset), [1, 0.78, 0.94], GL.TRIANGLES)
        // drawObject(this.meshes.upperPalmMesh.solid.buffers, makeModel(this.skeleton.leftPalmArm, this.offsetMesh.leftUpperPalmOffset), [1, 0.78, 0.94], GL.TRIANGLES)


        // BOTTOM AND LEG
        drawObject(this.meshes.buttMesh.solid.buffers, makeModel(this.skeleton.butt, this.offsetMesh.buttOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.legMesh.solid.buffers, makeModel(this.skeleton.leftLeg, this.offsetMesh.leftLegOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.legMesh.solid.buffers, makeModel(this.skeleton.rightLeg, this.offsetMesh.rightLegOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.legEngselMesh.solid.buffers, makeModel(this.skeleton.leftLeg, this.offsetMesh.leftLegEngselOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
        drawObject(this.meshes.legEngselMesh.solid.buffers, makeModel(this.skeleton.rightLeg, this.offsetMesh.rightLegEngselOffset), [0.157, 0.392, 0.522], GL.TRIANGLES)
    }
}