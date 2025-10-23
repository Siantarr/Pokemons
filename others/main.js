import { MeshUtilsCurves } from './MeshUtilsCurves.js';
import { MeshUtils } from './MeshUtils.js';
import * as Curves from './curves.js';
import { createModelMatrix, createMesh, drawObject, applyTransformToMesh, recenterMesh } from './CreateObject.js';
import { meshToCSG, CSGBuilder } from "./csgOperation.js";
import { Bone, makeModel } from "./bone.js"

function cameraUpdate() {
    const eye = [
        camera.target[0] + camera.radius * Math.cos(camera.pitch) * Math.sin(camera.yaw),
        camera.target[1] + camera.radius * Math.sin(camera.pitch),
        camera.target[2] + camera.radius * Math.cos(camera.pitch) * Math.cos(camera.yaw)
    ];

    const up = [0, 1, 0];

    view = mat4.create();
    mat4.lookAt(view, eye, camera.target, up);

    // update posisi kamera 
    GL.uniform3fv(uViewPos, eye);
    // Bersihin layar
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
}

// Export for node/module style if desired
if (typeof module !== "undefined") module.exports = MeshUtils;

// NOTE GLOBAL VARIABLE KE SELURUH FILE
export let GL = null;
export let attribs = null;
export let proj = null;
export let view = null;
export let uMVP = null;
export let uColor = null;
export let uModel = null;
export let uNormalMat = null;
export let uIsBone = null;
export let uColorBone = null;

let camera = null;
let uViewPos = null;

function main() {
    var CANVAS = document.getElementById("mycanvas");

    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    /*===================== GET WEBGL CONTEXT ===================== */
    /** @type {WebGLRenderingContext} */
    // var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    // REVIEW ---------- Camera ----------
    camera = {
        yaw: 0,       // rotasi horizontal (sekitar Y axis)
        pitch: Math.PI / 30,     // rotasi vertical (sekitar X axis)
        radius: 10.0,   // jarak kamera dari target
        target: [0, 0, 0] // pusat pandangan
    };
    let isDragging = false;
    let lastX = 0, lastY = 0;
    CANVAS.addEventListener("mousedown", (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });
    CANVAS.addEventListener("mouseup", () => {
        isDragging = false;
    });
    CANVAS.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        if (e.buttons === 1 && e.shiftKey) {
            // --- PAN MODE ---
            const panSpeed = 0.002 * camera.radius;

            // hitung basis vektor relatif kamera
            const cosPitch = Math.cos(camera.pitch);
            const sinPitch = Math.sin(camera.pitch);
            const cosYaw = Math.cos(camera.yaw);
            const sinYaw = Math.sin(camera.yaw);

            const right = [cosYaw, 0, -sinYaw];
            const up = [-sinPitch * sinYaw, cosPitch, -sinPitch * cosYaw];

            // geser target
            camera.target[0] -= dx * panSpeed * right[0] - dy * panSpeed * up[0];
            camera.target[1] -= dx * panSpeed * right[1] - dy * panSpeed * up[1];
            camera.target[2] -= dx * panSpeed * right[2] - dy * panSpeed * up[2];
        } else if (e.buttons === 1) {
            // --- ORBIT MODE ---
            camera.yaw -= dx * 0.005;
            camera.pitch += dy * 0.005;
            camera.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camera.pitch));
        }
    });
    CANVAS.addEventListener("wheel", (e) => {
        camera.radius += e.deltaY * 0.01;
        // camera.radius = Math.max(1.0, Math.min(20.0, camera.radius));
    });

    // ---------- Shaders ----------
    const vsSource = `
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 uv;

        uniform mat4 uMVP;
        uniform mat4 uModel;     // buat posisi dunia
        uniform mat3 uNormalMat; // transform normal
        uniform vec3 uLightDir;
        
        varying vec3 vNormal;
        varying vec3 vPos;
        varying vec2 vUV;

        void main(void) {
            gl_Position = uMVP * vec4(position, 1.0);
            vNormal = normalize(uNormalMat * normal);
            vPos = (uModel * vec4(position, 1.0)).xyz; // posisi dunia
            vUV = uv;
        }`;

    const fsSource = `

        precision mediump float;

        uniform bool uIsBone;        // apakah ini bone helper? 0 = mesh, 1 = bone
        uniform vec4 uColorBone;     // warna RGBA bone
        
        uniform vec3 uColor;      // warna mesh biasa
        uniform vec3 uLightDir;   // arah cahaya (world space)
        uniform vec3 uAmbient;    // warna ambient
        uniform vec3 uLightColor; // warna cahaya utama
        uniform vec3 uViewPos;    // posisi kamera (eye)
        
        varying vec3 vNormal;
        varying vec3 vPos;
        varying vec2 vUV;

        void main(void) {
            if (uIsBone) {
                gl_FragColor = uColorBone; // bypass lighting
                return;
            }

            vec3 N = normalize(vNormal);
            vec3 L = normalize(-uLightDir);
            vec3 V = normalize(uViewPos - vPos);
            vec3 R = reflect(-L, N);

            vec3 ambient = uAmbient * uColor;
            float diff = max(dot(N, L), 0.0);
            vec3 diffuse = diff * uLightColor * uColor;
            float spec = pow(max(dot(R, V), 0.0), 32.0);
            vec3 specular = spec * uLightColor;

            vec3 result = ambient + diffuse + specular;
            gl_FragColor = vec4(result, 1.0);
        }`;

    function compile(src, type) {
        const sh = GL.createShader(type);
        GL.shaderSource(sh, src);
        GL.compileShader(sh);
        if (!GL.getShaderParameter(sh, GL.COMPILE_STATUS)) {
            throw GL.getShaderInfoLog(sh);
        }
        return sh;
    }

    const prog = GL.createProgram();
    GL.attachShader(prog, compile(vsSource, GL.VERTEX_SHADER));
    GL.attachShader(prog, compile(fsSource, GL.FRAGMENT_SHADER));
    GL.linkProgram(prog);
    GL.useProgram(prog);

    GL.enable(GL.DEPTH_TEST);
    GL.enable(GL.BLEND);
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);


    // ---------- Attributes & Uniforms ----------
    attribs = {
        position: GL.getAttribLocation(prog, "position"),
        normal: GL.getAttribLocation(prog, "normal"),
        uv: GL.getAttribLocation(prog, "uv")
    };

    // REVIEW CAHAYA
    uModel = GL.getUniformLocation(prog, "uModel");
    uNormalMat = GL.getUniformLocation(prog, "uNormalMat");
    const uLightDir = GL.getUniformLocation(prog, "uLightDir");
    const uAmbient = GL.getUniformLocation(prog, "uAmbient");
    const uLightColor = GL.getUniformLocation(prog, "uLightColor");
    uViewPos = GL.getUniformLocation(prog, "uViewPos");

    // arah cahaya dari kanan-atas-depan
    function sphericalToDir(azimuth, elevation) {
        return [
            Math.cos(elevation) * Math.cos(azimuth),
            Math.sin(elevation),
            Math.cos(elevation) * Math.sin(azimuth)
        ];
    }
    const az = Math.PI / 2;    // ..° horizontal
    const el = Math.PI / -1.5;    // ..° vertical
    const lightDir = sphericalToDir(az, el);
    GL.uniform3fv(uLightDir, lightDir);
    GL.uniform3fv(uAmbient, [0.5, 0.5, 0.5]);
    GL.uniform3fv(uLightColor, [1.0, 1.0, 1.0]); // putih

    uMVP = GL.getUniformLocation(prog, "uMVP");
    uColor = GL.getUniformLocation(prog, "uColor");

    uIsBone = GL.getUniformLocation(prog, "uIsBone");
    uColorBone = GL.getUniformLocation(prog, "uColorBone");

    if (uIsBone !== null) GL.uniform1i(uIsBone, 0);
    if (uColorBone !== null) GL.uniform4fv(uColorBone, [0.0, 1.0, 1.0, 0.9]); // default neon cyan
    // ---------- Mesh ----------
    // TODO disini membuat mesh solid danatau wireframe
    // INGAT di akhir parameter ada cutOptions = null, deferBuffer = true secara default (tidak di cut dan tidak perlu di buffer)
    // Penjelasan BUFFER: anggep aja hasil akhir/final dari objek tersebut, jika di buffer/deferBuffer = False. 
    // TODO
    // TODO DEFERBUFFER: TRUE JIKA PAKAI CSG (Mau beberapa mesh di union / intersect / subtract)
    // TODO
    // NOTE generator, { params = null, solid = true, wire = true , cutOptions = null, deferBuffer = true}
    const ell = createMesh(MeshUtils.generateEllipsoid, { params: [0.8, 0.5, 0.6, 40, 60], options: { wire: false }, deferBuffer: true });

    const cube = createMesh(MeshUtils.generateBox, { params: [1, 1, 1], deferBuffer: true });

    // // radiusXTop = 1, radiusZTop = 0.5, radiusXBottom = 1, radiusZBottom = 0.5, height = 2, radialSeg = 32, heightSeg = 1, capped = true
    const cyl = createMesh(MeshUtils.generateEllipticalCylinder, { params: [1, 0.5, 1, 0.5, 2, 32, 1, true], deferBuffer: false });

    // // Hyperboloid 2 Sheets a = 1, b = 1, c = 1, uSteps = 32, vSteps = 32, vMax = 1.5
    // // Cut 50% sebelahnya. Belum di buffer
    const hyp2sheets = createMesh(MeshUtils.generateHyperboloid2Sheets,
        { params: [0.2, 0.2, 0.2, 8, 8, 2.0], cutOptions: { percent: 0.5, axis: "z", keep: "lower" }, deferBuffer: false });


    // //NOTE CURVE -> curveFunc, tMin = 0, tMax = 1, tSteps = 100 (segmen sepanjang curve), 
    // // radiusFunc = (u) => 0.1 (fungsi radius(u) atau array of radii), radialSteps = 16 (segmen tiap lingkaran), 
    // // options = {} (capped: false, computeNormals: false )

    // Radius pakai fungsi → mengecil ke ujung
    const tail1 = createMesh(MeshUtilsCurves.generateVariableTube,
        { params: [Curves.sineWave, 0, 5, 50, (u) => 0.5 * (1 - u), 16], deferBuffer: false });
    // Radius pakai array interval → besar → kecil → besar → kecil
    const tail2 = createMesh(MeshUtilsCurves.generateVariableTube,
        { params: [Curves.sineWave, 0, 1, 15, [0.5, 0.1, 0.4, 0.05], 16], deferBuffer: false });
    // (fungsi kurva, tMin, tMax (3 lilitan = 6π rad), tSteps (detail kurva), tSteps (detail kurva), radius tabung,radialSteps (detail lingkaran)
    const helix = createMesh(MeshUtilsCurves.generateVariableTube,
        { params: [Curves.helixCurve, 0, 6 * Math.PI, 50, (u) => 0.2, 16], deferBuffer: false });

    // //NOTE BEZIER
    const bezierCurve = Curves.cubicBezier3D(
        [-2, 0, 0],   // p0 (awal)
        [-1, 3, 2],   // p1 (kontrol 1)
        [2, -2, -1], // p2 (kontrol 2)
        [3, 1, 0]    // p3 (akhir)
    );

    const bezierTube = createMesh(MeshUtilsCurves.generateVariableTube,
        { params: [bezierCurve, 0, 1, 50, [0.2, 0.5, 0.3], 24], deferBuffer: false }
    );

    // NOTE HUMAN
    const bodyMesh = createMesh(MeshUtils.generateBox, { params: [1.0, 1.6, 0.5], deferBuffer: false, options: { wire: false } });
    const chestMesh = createMesh(MeshUtils.generateBox, { params: [0.9, 0.9, 0.45], deferBuffer: false });
    // const headMesh = createMesh(MeshUtils.generateEllipsoid, { params: [0.35, 0.4, 0.35, 20, 20], deferBuffer: false });

    const upperArmMesh = createMesh(MeshUtils.generateBox, { params: [0.28, 0.9, 0.28], deferBuffer: false });
    const lowerArmMesh = createMesh(MeshUtils.generateBox, { params: [0.24, 0.7, 0.24], deferBuffer: false });
    const handMesh = createMesh(MeshUtils.generateBox, { params: [0.18, 0.28, 0.12], deferBuffer: false });

    const upperLegMesh = createMesh(MeshUtils.generateBox, { params: [0.4, 1.0, 0.4], deferBuffer: false });
    const lowerLegMesh = createMesh(MeshUtils.generateBox, { params: [0.35, 0.9, 0.35], deferBuffer: false });
    const footMesh = createMesh(MeshUtils.generateBox, { params: [0.5, 0.18, 0.28], deferBuffer: false });


    // ---------- field of view, aspect ratio, near plane, far plane ----------
    proj = mat4.create();
    mat4.perspective(proj, 45 * Math.PI / 180, CANVAS.width / CANVAS.height, 0.1, 100);

    // ---------- Transform ------------
    // TODO
    // TODO
    // TODO Kalau mau CSG -> apply transform to mesh dulu disini
    // TODO
    // TODO
    // TODO disini membuat objek-objek individual di dunia 3D (khusus untuk transformasi objek)
    const cubeMesh = applyTransformToMesh(cube.solid.mesh, {
        translate: [0, 1, 0],
        rotate: [
            { axis: "x", angle: Math.PI / 4 }, // rotasi 45° sumbu X
            { axis: "y", angle: Math.PI / 3 }, // rotasi 60° sumbu Y
            { axis: "z", angle: Math.PI / 6 }],  // rotasi 30° sumbu Z
    });

    const ellipsoidMesh = applyTransformToMesh(ell.solid.mesh, {
        translate: [0, 1, 0],
        rotate: [{ axis: "x", angle: Math.PI / 2 }]
    });

    // // TODO Buat Bone, align mesh dengan bone
    // TODO Kalau CSG -> 
    // TODO Konversi ke CSG, Operasi, Konversi ke mesh, Recenter, BUFFER 
    // TODO 
    // TODO
    // TODO
    // // #1 Konversi ke CSG
    const cubeCSG = meshToCSG(cubeMesh);
    const ellCSG = meshToCSG(ellipsoidMesh);

    // // #2 Operasi boolean: cube dipotong sphere (bisa lanjut dengan objek lain)
    // // #3 Konversi kembali ke mesh
    const holeOnCubeMesh = new CSGBuilder(cubeCSG)
        .subtract(ellCSG)
        .toMesh();

    // // #4 Recenter kalau mau (biar ke tengah 0,0,0)
    recenterMesh(holeOnCubeMesh)

    // // #5 Buffer mesh hasil mesh ke GPU
    const holeOnCube = MeshUtils.createMeshBuffers(GL, holeOnCubeMesh, attribs);

    // #6 Buat Bone 
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
    const hip = new Bone("hip", null, { translate: [0, 0, 0] });
    const spine = new Bone("spine", hip, { translate: [0, 0.6, 0] });
    const chest = new Bone("chest", spine, { translate: [0, 0.7, 0] });
    const neck = new Bone("neck", chest, { translate: [0, 0.55, 0] });

    const head = new Bone("head", neck, { translate: [0, 0, 0] });

    // left arm chain
    const leftShoulder = new Bone("leftShoulder", chest, { translate: [0, 0, 0] });
    const leftUpperArm = new Bone("leftUpperArm", leftShoulder, { translate: [0, -0.45, 0] });
    const leftLowerArm = new Bone("leftLowerArm", leftUpperArm, { translate: [0, 0, 0] });
    const leftHand = new Bone("leftHand", leftLowerArm, { translate: [0, 0, 0] });

    // right arm chain
    const rightShoulder = new Bone("rightShoulder", chest, { translate: [0, 0, 0] });
    const rightUpperArm = new Bone("rightUpperArm", rightShoulder, { translate: [0, -0.45, 0] });
    const rightLowerArm = new Bone("rightLowerArm", rightUpperArm, { translate: [0, 0, 0] });
    const rightHand = new Bone("rightHand", rightLowerArm, { translate: [0, 0, 0] });

    // left leg chain
    const leftUpperLeg = new Bone("leftUpperLeg", hip, { translate: [0, 0, 0] });
    const leftLowerLeg = new Bone("leftLowerLeg", leftUpperLeg, { translate: [0, 0, 0] });
    const leftFoot = new Bone("leftFoot", leftLowerLeg, { translate: [0, -0.6, 0] });

    // right leg chain
    const rightUpperLeg = new Bone("rightUpperLeg", hip, { translate: [0, 0, 0] });
    const rightLowerLeg = new Bone("rightLowerLeg", rightUpperLeg, { translate: [0, 0, 0] });
    const rightFoot = new Bone("rightFoot", rightLowerLeg, { translate: [0, -0.6, 0.15] });

    // Menyebarkan transformasi dari root ke semua bone supaya setiap bone tahu posisi globalnya, bukan cuma posisi relatif.
    hip.updateWorld(); //karena hip nya adalah root. 

    // NOTE #7 Buat Model (kalau tidak recenter -> 0,0,0 bisa berada di tempat lain)
    // NOTE Gunanya untuk align mesh dengan bone. kita align mesh dengan bone dulu
    const bodyOffset = createModelMatrix({ translate: [0, 0.8, 0] });   // put body mesh above hip
    const chestOffset = createModelMatrix({ translate: [0, 0, 0] });
    const headOffset = createModelMatrix({ translate: [0, 0.25, 0] });

    const upperArmOffset = createModelMatrix({ translate: [0, 0, 0] });
    const lowerArmOffset = createModelMatrix({ translate: [0, -0.1, 0] });
    const handOffset = createModelMatrix({ translate: [0, -0.18, 0] });

    const upperLegOffset = createModelMatrix({ translate: [0, -0.5, 0] });
    const lowerLegOffset = createModelMatrix({ translate: [0, -0.5, 0] });
    const footOffset = createModelMatrix({ translate: [0, -0.09, 0.08] });

    const modelHoleOnCube = createModelMatrix({ translate: [0, 2, 0] });

    // Model matrix helix
    const modelHelix = createModelMatrix({ translate: [3, 2, 0], rotate: [{ axis: "x", angle: Math.PI / 2 }] });

    const modelTail1 = createModelMatrix({ translate: [0, -3, 0] });

    const modelTail2 = createModelMatrix({ translate: [5, -3, 0] });

    const modelCyl = createModelMatrix({ translate: [-2, 0, 0], rotate: [{ axis: "x", angle: Math.PI / 2 }] });

    const modelHyp2sheets = createModelMatrix({ translate: [-3, 0, 0], rotate: [{ axis: "y", angle: Math.PI / 2 }] });

    // const modelBezier = createModelMatrix({ translate: [-5, -2, 0] });

    // ---------- Render Loop ----------
    GL.clearColor(0.0, 0.0, 0.0, 0.0);
    GL.enable(GL.DEPTH_TEST);

    function animate(time) {
        // CAMERA
        // const eye = [
        //     camera.target[0] + camera.radius * Math.cos(camera.pitch) * Math.sin(camera.yaw),
        //     camera.target[1] + camera.radius * Math.sin(camera.pitch),
        //     camera.target[2] + camera.radius * Math.cos(camera.pitch) * Math.cos(camera.yaw)
        // ];

        // const up = [0, 1, 0];

        // view = mat4.create();
        // mat4.lookAt(view, eye, camera.target, up);

        // // update posisi kamera 
        // GL.uniform3fv(uViewPos, eye);
        // // Bersihin layar
        // GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        cameraUpdate();


        // Simple procedural animation params
        const t = time * 0.001;
        const walkSpeed = 2.0;
        const armSwing = Math.sin(t * walkSpeed) * 0.9;
        const legSwing = Math.sin(t * walkSpeed) * 0.9;

        // -------------- update bone localSpecs (example: walking) ----------------
        // TODO 
        // TODO 
        // TODO ANIMASIKAN
        // TODO 
        // TODO 
        // Slight bounce of hip
        hip.setLocalSpec({ translate: [0, 0, 0] });

        // head slight look around
        head.setLocalSpec({ translate: [0, 0.05, 0], rotate: [{ axis: "y", angle: Math.sin(t * 0.6) * 0.25 }] });

        // arms swing opposite to legs
        leftShoulder.setLocalSpec({ translate: [-0.7, 0.45, 0], 
            rotate: [{ axis: [1,1,0], angle: t * (2 * Math.PI) / 5 }] }); // rotate di sumbu x dan y

        rightShoulder.setLocalSpec({ translate: [0.7, 0.45, 0], 
            rotate: [{ axis: { point: [0,0,0], dir: [1,0,0] }, angle: t * (2 * Math.PI) / 5 }] }); // jadi rusak

        // elbow bend a little (lower arm)
        leftLowerArm.setLocalSpec({ translate: [0, -0.6, 0], rotate: [{ axis: "z", angle: Math.abs(Math.sin(t * walkSpeed)) * 0.2 }] });
        rightLowerArm.setLocalSpec({ translate: [0, -0.6, 0], rotate: [{ axis: "z", angle: -Math.abs(Math.sin(t * walkSpeed + Math.PI)) * 0.2 }] });

        // legs swing (hip)
        leftUpperLeg.setLocalSpec({ translate: [-0.3, 0, 0], rotate: [{ axis: "x", angle: legSwing }] });
        rightUpperLeg.setLocalSpec({ translate: [0.3, 0, 0], rotate: [{ axis: "x", angle: -legSwing }] });

        // knees bend depending on swing
        leftLowerLeg.setLocalSpec({ translate: [0, -1.0, 0], rotate: [{ axis: "x", angle: Math.max(0, -legSwing) * 0.8 }] });
        rightLowerLeg.setLocalSpec({ translate: [0, -1.0, 0], rotate: [{ axis: "x", angle: Math.max(0, legSwing) * 0.8 }] });

        // update full world matrices
        hip.updateWorld();

        // ------------------------ Draw Object -------------
        // ---------------- Draw meshes attached to bones ----------------
        // TODO disini menggambar objek
        // NOTE madeModel params -> bone, offset
        // NOTE drawObject params -> buffers, model, color, mode
        // body (hip -> bodyOffset)

        // drawObject(holeOnCube, modelHoleOnCube, [1.0, 0.9, 0.0], GL.TRIANGLES);

        drawObject(cyl.solid.buffers, modelCyl, [0.7, 0.1, 0.9], GL.TRIANGLES);
        drawObject(cyl.wire.buffers, modelCyl, [1.0, 1.0, 1.0], GL.LINES);

        drawObject(hyp2sheets.solid.buffers, modelHyp2sheets, [0.0, 0.3, 0.6], GL.TRIANGLES);
        drawObject(hyp2sheets.wire.buffers, modelHyp2sheets, [1.0, 1.0, 1.0], GL.LINES);

        drawObject(helix.solid.buffers, modelHelix, [0.8, 0.2, 0.2], GL.TRIANGLES);
        drawObject(helix.wire.buffers, modelHelix, [1, 1, 1], GL.LINES);

        // //TAILS
        drawObject(tail1.solid.buffers, modelTail1, [0.8, 0.2, 0.2], GL.TRIANGLES);
        drawObject(tail1.wire.buffers, modelTail1, [1, 1, 1], GL.LINES);
        // 
        drawObject(tail2.solid.buffers, modelTail2, [0.2, 0.8, 0.2], GL.TRIANGLES);
        drawObject(tail2.wire.buffers, modelTail2, [1, 1, 1], GL.LINES);

        // //BEZIER
        // drawObject(bezierTube.solid.buffers, modelBezier, [0.2, 0.5, 0.9], GL.TRIANGLES);
        // drawObject(bezierTube.wire.buffers, modelBezier, [1, 1, 1], GL.LINES);

        //HUMAN
        drawObject(bodyMesh.solid.buffers, makeModel(hip, bodyOffset), [0.2, 0.6, 0.9], GL.TRIANGLES);

        // chest
        drawObject(chestMesh.solid.buffers, makeModel(chest, chestOffset), [0.15, 0.5, 0.8], GL.TRIANGLES);

        // head
        drawObject(holeOnCube, makeModel(head, headOffset), [1.0, 0.8, 0.6], GL.TRIANGLES);

        // left arm
        drawObject(upperArmMesh.solid.buffers, makeModel(leftUpperArm, upperArmOffset), [0.8, 0.2, 0.2], GL.TRIANGLES);        
        drawObject(lowerArmMesh.solid.buffers, makeModel(leftLowerArm, lowerArmOffset), [0.7, 0.2, 0.2], GL.TRIANGLES);
        drawObject(handMesh.solid.buffers, makeModel(leftHand, handOffset), [0.9, 0.6, 0.5], GL.TRIANGLES);

        // right arm
        drawObject(upperArmMesh.solid.buffers, makeModel(rightUpperArm, upperArmOffset), [0.8, 0.2, 0.2], GL.TRIANGLES);
        drawObject(lowerArmMesh.solid.buffers, makeModel(rightLowerArm, lowerArmOffset), [0.7, 0.2, 0.2], GL.TRIANGLES);
        drawObject(handMesh.solid.buffers, makeModel(rightHand, handOffset), [0.9, 0.6, 0.5], GL.TRIANGLES);

        // left legs
        drawObject(upperLegMesh.solid.buffers, makeModel(leftUpperLeg, upperLegOffset), [0.2, 0.2, 0.2], GL.TRIANGLES);
        drawObject(lowerLegMesh.solid.buffers, makeModel(leftLowerLeg, lowerLegOffset), [0.15, 0.15, 0.15], GL.TRIANGLES);
        drawObject(footMesh.solid.buffers, makeModel(leftFoot, footOffset), [0.1, 0.1, 0.1], GL.TRIANGLES);

        // right legs
        drawObject(upperLegMesh.solid.buffers, makeModel(rightUpperLeg, upperLegOffset), [0.2, 0.2, 0.2], GL.TRIANGLES);
        drawObject(lowerLegMesh.solid.buffers, makeModel(rightLowerLeg, lowerLegOffset), [0.15, 0.15, 0.15], GL.TRIANGLES);
        drawObject(footMesh.solid.buffers, makeModel(rightFoot, footOffset), [0.1, 0.1, 0.1], GL.TRIANGLES);

        // REVIEW --------------- Draw bone helpers overlay (so they are visible) ----------------
        hip.drawHelper(); // recursively draws children helpers as well

        GL.flush();
        requestAnimationFrame(animate);
    }
    animate(0);
}
window.addEventListener("load", main);