import { BaseCharacter } from '/process/BaseCharacter.js';
import { createModelMatrix, createMesh, drawObject, applyTransformToMesh, recenterMesh } from '../CreateObject.js';
import { MeshUtilsCurves } from '../MeshUtilsCurves.js';
import { MeshUtils } from '../MeshUtils.js';
import * as Curves from '../curves.js';
import { makeModel } from "../bone.js";
import { GL, attribs } from '../main.js'

export class env extends BaseCharacter {
    constructor() {
        super();
        this.meshes = {};
        this.models = {};

        // 1. GEOMETRI DASAR PANGGUNG
        this.meshes.stageFloor = createMesh(MeshUtils.generateBox, { params: [60, 0.5, 25], deferBuffer: false });
        this.models.stageFloor = createModelMatrix({ translate: [0, -3, 0] });

        this.meshes.woodPlank = createMesh(MeshUtils.generateBox, { params: [60, 0.2, 0.9], deferBuffer: false });
        this.models.planks = [];
        const plankCount = 25;
        for (let i = 0; i < plankCount; i++) {
            const zPos = -12 + i * 1.0;
            this.models.planks.push(createModelMatrix({ translate: [0, -2.6, zPos] }));
        }

        // Di dalam constructor(), setelah this.models.grassField = ...

        // 7. DINDING LANGIT
        this.meshes.skyWall = createMesh(MeshUtils.generateBox, { params: [500, 200, 1], deferBuffer: false }); // Panjang 400, Tinggi 200

        const skyWallY = 100 - 3.7; // Posisi vertikal agar pas dengan alas rumput

        this.models.skyWallBack = createModelMatrix({ translate: [0, skyWallY, -250] });
        this.models.skyWallFront = createModelMatrix({ translate: [0, skyWallY, 250] });
        this.models.skyWallLeft = createModelMatrix({
            translate: [-250, skyWallY, 0],
            rotate: [{ axis: 'y', angle: Math.PI / 2 }]
        });
        this.models.skyWallRight = createModelMatrix({
            translate: [250, skyWallY, 0],
            rotate: [{ axis: 'y', angle: Math.PI / 2 }]
        });

        // 6. LAPANGAN HIJAU DI LUAR
        this.meshes.grassField = createMesh(MeshUtils.generateBox, { params: [500, 0.2, 500], deferBuffer: false });
        this.models.grassField = createModelMatrix({ translate: [0, -3.7, 0] }); // Posisikan di bawah alas krem

        // Ganti baris ini:
        this.meshes.basePlane = createMesh(MeshUtils.generateBox, { params: [200, 0.2, 200], deferBuffer: false });

        // Dengan yang ini:
        this.meshes.basePlane = createMesh(MeshUtils.generateBox, { params: [200, 0.2, 150], deferBuffer: false });

        // ... (setelah this.models.basePlane = ...)

        // 5. DINDING SIRKUS
        this.meshes.wallPanel = createMesh(MeshUtils.generateBox, { params: [5, 60, 1], deferBuffer: false }); // Lebar panel 5, tinggi 25
        this.models.wallPanels = [];

        const wallHeight = 28.5; // Setengah dari tinggi panel, untuk penempatan Y
        const wallColors = [
            [0.8, 0.15, 0.15], // Merah
            [0.9, 0.9, 0.85]   // Putih Gading
        ];
        const panelWidth = 5;
        const doorStart = 80; // Posisi X di mana pintu dimulai
        const doorEnd = 95;   // Posisi X di mana pintu berakhir

        // Dinding Belakang (Z = -75)
        for (let x = -100; x < 100; x += panelWidth) {
            const color = wallColors[(x / panelWidth) % 2 === 0 ? 0 : 1];
            const model = createModelMatrix({ translate: [x + panelWidth / 2, wallHeight - 3.5, -75] });
            this.models.wallPanels.push({ model, color });
        }

        // Dinding Depan (Z = 75) - dengan celah pintu
        for (let x = -100; x < 100; x += panelWidth) {
            if (x >= doorStart && x < doorEnd) continue; // Lewati panel ini untuk membuat pintu
            const color = wallColors[(x / panelWidth) % 2 === 0 ? 0 : 1];
            const model = createModelMatrix({ translate: [x + panelWidth / 2, wallHeight - 3.5, 75] });
            this.models.wallPanels.push({ model, color });
        }

        // Dinding Kiri (X = -100)
        for (let z = -75; z < 75; z += panelWidth) {
            const color = wallColors[(z / panelWidth) % 2 === 0 ? 0 : 1];
            const model = createModelMatrix({
                translate: [-100, wallHeight - 3.5, z + panelWidth / 2],
                rotate: [{ axis: 'y', angle: Math.PI / 2 }]
            });
            this.models.wallPanels.push({ model, color });
        }

        // Dinding Kanan (X = 100)
        for (let z = -75; z < 75; z += panelWidth) {
            const color = wallColors[(z / panelWidth) % 2 === 0 ? 0 : 1];
            const model = createModelMatrix({
                translate: [100, wallHeight - 3.5, z + panelWidth / 2],
                rotate: [{ axis: 'y', angle: Math.PI / 2 }]
            });
            this.models.wallPanels.push({ model, color });
        }

        this.meshes.spotlightPool = createMesh(MeshUtils.generateEllipticalCylinder, {
            params: [5, 5, 0.1, 0.1, 0.1, 64],
            deferBuffer: false
        });
        this.models.spotlightPool1 = createModelMatrix({ translate: [0, -2.7, 0] });
        this.models.spotlightPool2 = createModelMatrix({ translate: [20, -2.7, 0] });
        this.models.spotlightPool3 = createModelMatrix({ translate: [-20, -2.7, 0] });

        // --- PEMBUATAN TRIBUN DAN PENONTON ---

        // 2. GEOMETRI UNTUK TRIBUN
        // Mesh untuk platform (tangga)
        this.meshes.platform = createMesh(MeshUtils.generateBox, { params: [100, 1, 3], deferBuffer: false });
        // Mesh untuk penonton (gaya siluet)
        this.meshes.spectatorBody = createMesh(MeshUtils.generateEllipsoid, { params: [2, 5, 2, 8, 16], deferBuffer: false });
        this.meshes.spectatorHead = createMesh(MeshUtils.generateEllipsoid, { params: [1.4, 1.4, 1.4, 8, 16], deferBuffer: false });

        // Array untuk menyimpan model matrix dari semua elemen tribun
        this.models.platforms = [];
        this.models.spectatorBodies = [];
        this.models.spectatorHeads = [];

        // --- PERUBAHAN: Struktur data baru untuk menyimpan info penonton ---
        this.initialSpectatorData = []; // Menyimpan posisi awal, row, dan seat
        this.models.spectators = []; // Menyimpan model matrix yang akan dianimasikan

        // 3. PENGATURAN POSISI TRIBUN
        const rows = 4;
        const seatsPerRow = 20;
        const rowHeight = 2.5; // Ketinggian tiap baris
        const rowDepth = 5.0; // Kedalaman tiap baris
        const spectatorSpacing = 5; // Jarak antar penonton


        // =============================

        // Helper function untuk membuat satu sisi tribun
        const createAudienceSide = (config) => {
            for (let r = 0; r < rows; r++) {
                // Hitung posisi platform untuk baris saat ini
                const platformPos = vec3.clone(config.startPos);
                vec3.scaleAndAdd(platformPos, platformPos, config.depthDir, r * rowDepth);
                vec3.scaleAndAdd(platformPos, platformPos, [0, 1, 0], r * rowHeight);

                this.models.platforms.push(createModelMatrix({
                    translate: platformPos,
                    rotate: [{ axis: 'y', angle: config.rotation }]
                }));

                // Hitung posisi awal penonton di baris ini
                const firstSeatPos = vec3.clone(platformPos);
                vec3.scaleAndAdd(firstSeatPos, firstSeatPos, config.rowDir, -(seatsPerRow - 1) * spectatorSpacing / 2);
                vec3.add(firstSeatPos, firstSeatPos, [0, 5, 0]); // Naik sedikit dari platform

                for (let s = 0; s < seatsPerRow; s++) {
                    const bodyPos = vec3.clone(firstSeatPos);
                    vec3.scaleAndAdd(bodyPos, bodyPos, config.rowDir, s * spectatorSpacing);
                    this.models.spectatorBodies.push(createModelMatrix({ translate: bodyPos }));

                    const headPos = vec3.clone(bodyPos);
                    vec3.add(headPos, headPos, [0, 5.5, 0]); // Posisi kepala di atas badan
                    this.models.spectatorHeads.push(createModelMatrix({ translate: headPos }));

                    // --- PERBAIKAN DI SINI ---
                    // Clone the vectors to store a snapshot of their values, not a reference.
                    this.initialSpectatorData.push({
                        body: vec3.clone(bodyPos), // Clone the body position
                        head: vec3.clone(headPos), // Clone the head position
                        row: r,
                        seat: s
                    });

                    // Buat model matrix awal yang akan diubah di 'animate'
                    this.models.spectators.push({
                        bodyModel: createModelMatrix({ translate: bodyPos }),
                        headModel: createModelMatrix({ translate: headPos })
                    });
                }
            }
        };

        // Buat 4 sisi tribun
        createAudienceSide({ startPos: [0, -2, -35], depthDir: [0, 0, -1], rowDir: [1, 0, 0], rotation: 0 }); // Belakang
        createAudienceSide({ startPos: [0, -2, 35], depthDir: [0, 0, 1], rowDir: [-1, 0, 0], rotation: 0 }); // Depan
        createAudienceSide({ startPos: [-70, -2, 0], depthDir: [-1, 0, 0], rowDir: [0, 0, -1], rotation: Math.PI / 2 }); // Kiri
        createAudienceSide({ startPos: [70, -2, 0], depthDir: [1, 0, 0], rowDir: [0, 0, 1], rotation: Math.PI / 2 }); // Kanan


        // 4. ALAS DASAR UNTUK SEMUANYA
        this.meshes.basePlane = createMesh(MeshUtils.generateBox, { params: [200, 0.2, 150], deferBuffer: false });
        this.models.basePlane = createModelMatrix({ translate: [0, -3.5, 0] }); // Posisikan sedikit di bawah panggung

        // Letakkan ini di akhir constructor()

        // 8. ATAP SIRKUS (VERSI BARU)
        const wallTopY = 55;        // Ketinggian atas dinding
        const roofPeakY = 85;       // Ketinggian puncak atap
        const roofPeakWidth = 50;   // Lebar lubang puncak (X)
        const roofPeakDepth = 40;   // Kedalaman lubang puncak (Z)

        // Definisikan 8 titik sudut atap
        const roofPositions = [
            // Sudut bawah (di atas dinding)
            -100, wallTopY, -75, // 0: Kiri-Belakang-Bawah
            100, wallTopY, -75, // 1: Kanan-Belakang-Bawah
            100, wallTopY, 75, // 2: Kanan-Depan-Bawah
            -100, wallTopY, 75, // 3: Kiri-Depan-Bawah

            // Sudut atas (di puncak)
            -roofPeakWidth / 2, roofPeakY, -roofPeakDepth / 2, // 4: Kiri-Belakang-Atas
            roofPeakWidth / 2, roofPeakY, -roofPeakDepth / 2, // 5: Kanan-Belakang-Atas
            roofPeakWidth / 2, roofPeakY, roofPeakDepth / 2, // 6: Kanan-Depan-Atas
            -roofPeakWidth / 2, roofPeakY, roofPeakDepth / 2, // 7: Kiri-Depan-Atas
        ];

        // Hubungkan titik-titik menjadi 8 segitiga (2 per sisi)
        // Hubungkan titik-titik menjadi 8 segitiga (2 per sisi) - DENGAN URUTAN TERBALIK
        const roofIndices = [
            0, 1, 5, 0, 5, 4, // Belakang
            3, 7, 6, 3, 6, 2, // Depan
            3, 0, 4, 3, 4, 7, // Kiri
            1, 2, 6, 1, 6, 5  // Kanan
        ];

        // Buat mesh tunggal untuk atap
        const roofRawMesh = {
            positions: new Float32Array(roofPositions),
            indices: new Uint16Array(roofIndices)
        };
        // Hitung normal agar lighting berfungsi
        roofRawMesh.normals = MeshUtils.computeNormals(roofRawMesh.positions, roofRawMesh.indices);

        // Simpan mesh dan model matrixnya
        this.meshes.circusRoof = { solid: { buffers: MeshUtils.createMeshBuffers(GL, roofRawMesh, attribs) } };
        this.models.circusRoof = mat4.create(); // Matriks identitas karena posisi sudah di world space


        // ... (setelah kode this.models.circusRoof = mat4.create();)

        // ... (setelah kode atap merah solid)

        // ... (setelah kode atap merah solid)

        // 9. MOTIF STRIPE PUTIH UNTUK ATAP (VERSI SEGMENT MAPPING)
        this.models.roofStripes = [];
        const stripeOffset = 0.1;
        const roofPanelWidth = 10;
        const whiteColor = [0.9, 0.9, 0.85];

        const createStripePanel = (positions, indices) => {
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] += stripeOffset;
            }
            const rawMesh = { positions: new Float32Array(positions), indices: new Uint16Array(indices) };
            rawMesh.normals = MeshUtils.computeNormals(rawMesh.positions, rawMesh.indices);
            return MeshUtils.createMeshBuffers(GL, rawMesh, attribs);
        };

        // --- Stripe Sisi Panjang (Belakang & Depan) ---
        const wallWidth = 200; // Total lebar dinding (dari -100 hingga 100)
        for (let i = 0; i < 20; i++) {
            if (i % 2 === 0) continue; // Hanya buat panel ganjil (putih)
            const x = -100 + i * roofPanelWidth;

            // === PERBAIKAN LOGIKA DI SINI ===
            // 1. Cari posisi tengah dasar panel di dinding (antara -100 s/d 100)
            const baseCenter = x + roofPanelWidth / 2;
            // 2. Ubah posisi itu menjadi persentase (0.0 s/d 1.0) di sepanjang dinding
            const normalizedPos = (baseCenter + 100) / wallWidth;
            // 3. Terapkan persentase yang sama untuk menemukan posisi puncak di lubang atap
            const peakX = -roofPeakWidth / 2 + normalizedPos * roofPeakWidth;

            // Stripe Belakang
            const pos_back = [
                x, wallTopY, -75,
                x + roofPanelWidth, wallTopY, -75,
                peakX, roofPeakY, -roofPeakDepth / 2 // Gunakan peakX yang dipetakan
            ];
            const buf_back = createStripePanel(pos_back, [2, 1, 0]);
            this.models.roofStripes.push({ buffers: buf_back, model: mat4.create(), color: whiteColor });

            // Stripe Depan
            const pos_front = [
                x, wallTopY, 75,
                x + roofPanelWidth, wallTopY, 75,
                peakX, roofPeakY, roofPeakDepth / 2 // Gunakan peakX yang dipetakan
            ];
            const buf_front = createStripePanel(pos_front, [0, 1, 2]);
            this.models.roofStripes.push({ buffers: buf_front, model: mat4.create(), color: whiteColor });
        }

        // --- Stripe Sisi Pendek (Kiri & Kanan) ---
        const wallDepth = 150; // Total kedalaman dinding (dari -75 hingga 75)
        for (let i = 0; i < 15; i++) {
            if (i % 2 === 0) continue;
            const z = -75 + i * roofPanelWidth;

            // Lakukan pemetaan yang sama untuk sumbu Z
            const baseCenter = z + roofPanelWidth / 2;
            const normalizedPos = (baseCenter + 75) / wallDepth;
            const peakZ = -roofPeakDepth / 2 + normalizedPos * roofPeakDepth;

            // Stripe Kiri
            const pos_left = [
                -100, wallTopY, z,
                -100, wallTopY, z + roofPanelWidth,
                -roofPeakWidth / 2, roofPeakY, peakZ // Gunakan peakZ yang dipetakan
            ];
            const buf_left = createStripePanel(pos_left, [0, 1, 2]);
            this.models.roofStripes.push({ buffers: buf_left, model: mat4.create(), color: whiteColor });

            // Stripe Kanan
            const pos_right = [
                100, wallTopY, z,
                100, wallTopY, z + roofPanelWidth,
                roofPeakWidth / 2, roofPeakY, peakZ // Gunakan peakZ yang dipetakan
            ];
            const buf_right = createStripePanel(pos_right, [2, 1, 0]);
            this.models.roofStripes.push({ buffers: buf_right, model: mat4.create(), color: whiteColor });
        }

        // ... (setelah kode loop atap kanan luar)

        // ... (setelah kode atap luar)

        // 10. MOTIF STRIPE PUTIH UNTUK ATAP BAGIAN DALAM
        this.models.innerRoofStripes = [];
        const innerStripeOffset = -0.1;

        // Helper function tetap sama
        const createInnerStripePanel = (positions, indices) => {
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] += innerStripeOffset;
            }
            const rawMesh = { positions: new Float32Array(positions), indices: new Uint16Array(indices) };
            rawMesh.normals = MeshUtils.computeNormals(rawMesh.positions, rawMesh.indices);
            return MeshUtils.createMeshBuffers(GL, rawMesh, attribs);
        };

        // --- Stripe Sisi Panjang (Belakang & Depan) - BAGIAN DALAM ---
        for (let i = 0; i < 20; i++) {
            if (i % 2 === 0) continue;
            const x = -100 + i * roofPanelWidth;
            const normalizedPos = (x + 100 + roofPanelWidth / 2) / wallWidth;
            const peakX = -roofPeakWidth / 2 + normalizedPos * roofPeakWidth;

            // Stripe Belakang Dalam (Luar: [2, 1, 0] -> Dalam: [0, 1, 2])
            const pos_back = [x, wallTopY, -75, x + roofPanelWidth, wallTopY, -75, peakX, roofPeakY, -roofPeakDepth / 2];
            const buf_back = createInnerStripePanel(pos_back, [0, 1, 2]); // <<< PERBAIKAN DI SINI
            this.models.innerRoofStripes.push({ buffers: buf_back, model: mat4.create(), color: whiteColor });

            // Stripe Depan Dalam (Luar: [0, 1, 2] -> Dalam: [2, 1, 0])
            const pos_front = [x, wallTopY, 75, x + roofPanelWidth, wallTopY, 75, peakX, roofPeakY, roofPeakDepth / 2];
            const buf_front = createInnerStripePanel(pos_front, [2, 1, 0]); // <<< PERBAIKAN DI SINI
            this.models.innerRoofStripes.push({ buffers: buf_front, model: mat4.create(), color: whiteColor });
        }

        // --- Stripe Sisi Pendek (Kiri & Kanan) - BAGIAN DALAM ---
        for (let i = 0; i < 15; i++) {
            if (i % 2 === 0) continue;
            const z = -75 + i * roofPanelWidth;
            const normalizedPos = (z + 75 + roofPanelWidth / 2) / wallDepth;
            const peakZ = -roofPeakDepth / 2 + normalizedPos * roofPeakDepth;

            // Stripe Kiri Dalam (Luar: [0, 1, 2] -> Dalam: [2, 1, 0])
            const pos_left = [-100, wallTopY, z, -100, wallTopY, z + roofPanelWidth, -roofPeakWidth / 2, roofPeakY, peakZ];
            const buf_left = createInnerStripePanel(pos_left, [2, 1, 0]); // <<< PERBAIKAN DI SINI
            this.models.innerRoofStripes.push({ buffers: buf_left, model: mat4.create(), color: whiteColor });

            // Stripe Kanan Dalam (Luar: [2, 1, 0] -> Dalam: [0, 1, 2])
            const pos_right = [100, wallTopY, z, 100, wallTopY, z + roofPanelWidth, roofPeakWidth / 2, roofPeakY, peakZ];
            const buf_right = createInnerStripePanel(pos_right, [0, 1, 2]); // <<< PERBAIKAN DI SINI
            this.models.innerRoofStripes.push({ buffers: buf_right, model: mat4.create(), color: whiteColor });
        }
    }

    animate(time) {
        // Pengaturan gerakan
        const speed = 0.010;
        const height = 0.3; // Seberapa tinggi penonton bergerak

        // Gelombang sinus dasar untuk animasi
        const baseWave = time * speed;

        // Loop melalui setiap penonton untuk memperbarui posisinya
        this.initialSpectatorData.forEach((initialData, i) => {
            // Tentukan apakah penonton ini "genap" atau "ganjil" berdasarkan posisi gridnya
            const isEvenPattern = (initialData.row + initialData.seat) % 2 === 0;

            // Buat fase yang berlawanan untuk kelompok ganjil
            const phaseShift = isEvenPattern ? 0 : Math.PI;

            // Hitung nilai gelombang (0 -> 1 -> 0)
            const wave = (Math.sin(baseWave + phaseShift) + 1) / 2;
            const yOffset = wave * height;

            // Hitung posisi baru dengan menambahkan offset Y
            const newBodyPos = vec3.clone(initialData.body);
            newBodyPos[1] += yOffset;

            const newHeadPos = vec3.clone(initialData.head);
            newHeadPos[1] += yOffset;

            // Buat ulang model matrix dengan posisi baru
            this.models.spectators[i].bodyModel = createModelMatrix({ translate: newBodyPos });
            this.models.spectators[i].headModel = createModelMatrix({ translate: newHeadPos });
        });

    }

    drawObject() {

        // GAMBAR LAPANGAN HIJAU DI LUAR
        drawObject(this.meshes.grassField.solid.buffers, this.models.grassField, [0.3, 0.6, 0.2], GL.TRIANGLES); // Warna hijau rumput

        // GAMBAR ALAS DASAR
        drawObject(this.meshes.basePlane.solid.buffers, this.models.basePlane, [0.878, 0.686, 0.624], GL.TRIANGLES);


        // GAMBAR DINDING LANGIT
        const skyColor = [0.114, 0.569, 0.831]; // Warna biru langit
        drawObject(this.meshes.skyWall.solid.buffers, this.models.skyWallBack, skyColor, GL.TRIANGLES);
        drawObject(this.meshes.skyWall.solid.buffers, this.models.skyWallFront, skyColor, GL.TRIANGLES);
        drawObject(this.meshes.skyWall.solid.buffers, this.models.skyWallLeft, skyColor, GL.TRIANGLES);
        drawObject(this.meshes.skyWall.solid.buffers, this.models.skyWallRight, skyColor, GL.TRIANGLES);

        // GAMBAR LAPANGAN HIJAU DI LUAR
        drawObject(this.meshes.grassField.solid.buffers, this.models.grassField, [0.3, 0.6, 0.2], GL.TRIANGLES);

        // ... sisa kode drawObject() Anda



        // GAMBAR ALAS DASAR
        drawObject(this.meshes.basePlane.solid.buffers, this.models.basePlane, [0.878, 0.686, 0.624], GL.TRIANGLES); // Warna krem muda     

        // Gambar elemen panggung utama
        drawObject(this.meshes.stageFloor.solid.buffers, this.models.stageFloor, [0.2, 0.2, 0.25], GL.TRIANGLES);

        for (const plankModel of this.models.planks) {
            drawObject(this.meshes.woodPlank.solid.buffers, plankModel, [0.4, 0.25, 0.15], GL.TRIANGLES);
        }

        drawObject(this.meshes.spotlightPool.solid.buffers, this.models.spotlightPool1, [0.8, 0.8, 0.6], GL.TRIANGLES);
        drawObject(this.meshes.spotlightPool.solid.buffers, this.models.spotlightPool2, [0.8, 0.8, 0.6], GL.TRIANGLES);
        drawObject(this.meshes.spotlightPool.solid.buffers, this.models.spotlightPool3, [0.8, 0.8, 0.6], GL.TRIANGLES);

        // --- MENGGAMBAR TRIBUN DAN PENONTON ---

        // Gambar semua platform
        for (const platformModel of this.models.platforms) {
            drawObject(this.meshes.platform.solid.buffers, platformModel, [0.3, 0.3, 0.35], GL.TRIANGLES);
        }

        // === PERBAIKAN DI SINI ===
        // Loop melalui 'this.models.spectators' yang sudah dianimasikan
        const clothingColors = [
            [0.8, 0.2, 0.2],  // Merah
            [0.2, 0.3, 0.8],  // Biru
            [0.1, 0.5, 0.2],  // Hijau
            [0.8, 0.8, 0.1],  // Kuning
            [0.5, 0.2, 0.8]   // Ungu
        ];
        // Warna kulit untuk semua kepala
        const skinTone = [0.85, 0.7, 0.62]; // Krem kulit

        this.models.spectators.forEach((spectator, i) => {
            const bodyColor = clothingColors[i % clothingColors.length];

            // Ambil model matrix dari objek 'spectator'
            drawObject(this.meshes.spectatorBody.solid.buffers, spectator.bodyModel, bodyColor, GL.TRIANGLES); // Gunakan bodyColor
            drawObject(this.meshes.spectatorHead.solid.buffers, spectator.headModel, skinTone, GL.TRIANGLES);   // Gunakan skinTone
        });

        // ... (setelah kode menggambar penonton)

        // --- MENGGAMBAR DINDING SIRKUS ---
        for (const panel of this.models.wallPanels) {
            drawObject(this.meshes.wallPanel.solid.buffers, panel.model, panel.color, GL.TRIANGLES);
        }

        // Letakkan ini di akhir drawObject()

        // --- MENGGAMBAR ATAP SIRKUS ---
        drawObject(this.meshes.circusRoof.solid.buffers, this.models.circusRoof, [0.8, 0.15, 0.15], GL.TRIANGLES); // Warna Merah
        // ... (setelah baris drawObject(this.meshes.circusRoof.solid.buffers, ...))

        // --- MENGGAMBAR MOTIF STRIPE ATAP ---
        for (const stripe of this.models.roofStripes) {
            drawObject(stripe.buffers, stripe.model, stripe.color, GL.TRIANGLES);
        }

        // ... (setelah loop for (const stripe of this.models.roofStripes))

        // --- MENGGAMBAR MOTIF STRIPE ATAP BAGIAN DALAM ---
        for (const stripe of this.models.innerRoofStripes) {
            drawObject(stripe.buffers, stripe.model, stripe.color, GL.TRIANGLES);
        }
    }
}


