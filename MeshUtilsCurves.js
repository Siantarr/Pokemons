import { MeshUtils } from "./MeshUtils.js"; // kalau butuh generateWireframeIndices
import { Bone } from "./bone.js";

export function rotateAroundAxis(v, axis, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const [x, y, z] = v;
    const [ax, ay, az] = axis;

    return [
        (cos + (1 - cos) * ax * ax) * x + ((1 - cos) * ax * ay - sin * az) * y + ((1 - cos) * ax * az + sin * ay) * z,
        ((1 - cos) * ay * ax + sin * az) * x + (cos + (1 - cos) * ay * ay) * y + ((1 - cos) * ay * az - sin * ax) * z,
        ((1 - cos) * az * ax - sin * ay) * x + ((1 - cos) * az * ay + sin * ax) * y + (cos + (1 - cos) * az * az) * z
    ];
}

export function animateAlongCurve(bone, curveFunc, time, duration = 5.0, mode = "loop") {
    let t = (time / duration);

    if (mode === "loop") {
        t = t % 1.0; // 0..1, reset tiap durasi
    } else if (mode === "pingpong") {
        // bolak balik: 0→1, 1→0
        t = t % 2.0;
        if (t > 1.0) t = 2.0 - t;
    } else if (mode === "once") {
        // stop di ujung
        t = Math.min(t, 1.0);
    }

    // sebagian kurva butuh skala 0..2π
    const param = (curveFunc.name.includes("circle") || curveFunc.name.includes("ellipse") || curveFunc.name.includes("lissajous"))
        ? t * 2 * Math.PI
        : t;

    const pos = curveFunc(param);
    bone.setLocalSpec({ translate: pos });
}

export const MeshUtilsCurves = {

    generateVariableTube: function (
        curveFunc,          // function (t) -> [x,y,z] or [x,y] (z=0)
        tMin = 0,
        tMax = 1,
        tSteps = 100,       // segmen sepanjang curve
        radiusFunc = (u) => 0.1, // fungsi radius(u) atau array of radii
        radialSteps = 16,   // segmen tiap lingkaran
        options = {}        // { capped: false, computeNormals: false }
    ) {
        const capped = !!options.capped;
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        const tangents = [];
        const curvePoints = [];

        const norm = (v) => {
            const l = Math.hypot(...v);
            return l > 1e-8 ? v.map(x => x / l) : [0, 0, 0];
        };

        // helper: interpolate array profile
        const interpArray = (arr, u) => {
            if (!Array.isArray(arr)) return arr;
            const scaled = u * (arr.length - 1);
            const i = Math.floor(scaled);
            const f = scaled - i;
            const a = arr[i];
            const b = arr[Math.min(i + 1, arr.length - 1)];
            return a * (1 - f) + b * f;
        };

        // 1) sample curve points & tangents
        for (let i = 0; i <= tSteps; i++) {
            const t = tMin + (i / tSteps) * (tMax - tMin);
            let p = curveFunc(t);
            if (p.length === 2) p = [p[0], p[1], 0];
            curvePoints.push(p);

            // small forward difference for tangent
            const dt = (tMax - tMin) / tSteps * 0.5;
            const t2 = Math.min(t + dt, tMax);
            let p2 = curveFunc(t2);
            if (p2.length === 2) p2 = [p2[0], p2[1], 0];
            tangents.push(norm([p2[0] - p[0], p2[1] - p[1], (p2[2] || 0) - (p[2] || 0)]));
        }

        // 2) initial frame (choose a stable normal)
        let tangent = tangents[0];
        let normal = Math.abs(tangent[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        let binormal = [
            tangent[1] * normal[2] - tangent[2] * normal[1],
            tangent[2] * normal[0] - tangent[0] * normal[2],
            tangent[0] * normal[1] - tangent[1] * normal[0]
        ];
        normal = norm([
            binormal[1] * tangent[2] - binormal[2] * tangent[1],
            binormal[2] * tangent[0] - binormal[0] * tangent[2],
            binormal[0] * tangent[1] - binormal[1] * tangent[0]
        ]);
        binormal = norm(binormal);

        const ringVerts = radialSteps + 1;

        // 3) generate rings
        for (let i = 0; i <= tSteps; i++) {
            const p = curvePoints[i];
            const u = i / tSteps;

            // radius either function or array
            let radius;
            if (typeof radiusFunc === "function") radius = radiusFunc(u);
            else if (Array.isArray(radiusFunc)) radius = interpArray(radiusFunc, u);
            else radius = Number(radiusFunc) || 0.1;

            for (let j = 0; j <= radialSteps; j++) {
                const theta = (j / radialSteps) * Math.PI * 2;
                const cx = Math.cos(theta);
                const sy = Math.sin(theta);

                const vx = p[0] + normal[0] * cx * radius + binormal[0] * sy * radius;
                const vy = p[1] + normal[1] * cx * radius + binormal[1] * sy * radius;
                const vz = p[2] + normal[2] * cx * radius + binormal[2] * sy * radius;
                positions.push(vx, vy, vz);

                // normal (unnormalized) -> normalize per-vertex
                const nx = normal[0] * cx + binormal[0] * sy;
                const ny = normal[1] * cx + binormal[1] * sy;
                const nz = normal[2] * cx + binormal[2] * sy;
                const nl = Math.hypot(nx, ny, nz) || 1;
                normals.push(nx / nl, ny / nl, nz / nl);

                uvs.push(j / radialSteps, u);
            }

            // parallel transport frame to next segment
            if (i < tSteps) {
                const nextTangent = tangents[i + 1];
                const dot = Math.max(-1, Math.min(1, tangent[0] * nextTangent[0] + tangent[1] * nextTangent[1] + tangent[2] * nextTangent[2]));
                if (dot < 0.9999) {
                    const axis = [
                        tangent[1] * nextTangent[2] - tangent[2] * nextTangent[1],
                        tangent[2] * nextTangent[0] - tangent[0] * nextTangent[2],
                        tangent[0] * nextTangent[1] - tangent[1] * nextTangent[0]
                    ];
                    const axisLen = Math.hypot(...axis);
                    if (axisLen > 1e-6) {
                        const a = axis.map(v => v / axisLen);
                        const angle = Math.acos(dot);
                        normal = rotateAroundAxis(normal, a, angle);
                        binormal = rotateAroundAxis(binormal, a, angle);
                        normal = norm(normal);
                        binormal = norm(binormal);
                    }
                }
                tangent = nextTangent;
            }
        }

        // 4) create faces between rings
        for (let i = 0; i < tSteps; i++) {
            for (let j = 0; j < radialSteps; j++) {
                const i0 = i * ringVerts + j;
                const i1 = i0 + 1;
                const i2 = i0 + ringVerts;
                const i3 = i2 + 1;
                indices.push(i0, i2, i1, i1, i2, i3);
            }
        }

        // caps (optional)
        if (capped) {
            const startCenter = positions.length / 3;
            const sp = curvePoints[0];
            positions.push(sp[0], sp[1], sp[2]);
            normals.push(-tangents[0][0], -tangents[0][1], -tangents[0][2]);
            uvs.push(0.5, 0.5);
            for (let j = 0; j < radialSteps; j++) {
                const a = j;
                const b = j + 1;
                indices.push(startCenter, b, a);
            }

            const endCenter = positions.length / 3;
            const ep = curvePoints[tSteps];
            positions.push(ep[0], ep[1], ep[2]);
            normals.push(tangents[tSteps][0], tangents[tSteps][1], tangents[tSteps][2]);
            uvs.push(0.5, 0.5);
            const base = tSteps * ringVerts;
            for (let j = 0; j < radialSteps; j++) {
                const a = base + j;
                const b = base + j + 1;
                indices.push(endCenter, a, b);
            }
        }

        // choose index array type depending on vertex count
        const vertexCount = positions.length / 3;
        let indicesArray;
        if (vertexCount > 65535) {
            // need 32-bit indices -> caller must ensure OES_element_index_uint is enabled,
            // else createMeshBuffers should attempt to enable it; we still return Uint32Array.
            indicesArray = new Uint32Array(indices);
        } else {
            indicesArray = new Uint16Array(indices);
        }

        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: indicesArray,
            vertexCount,
            indexCount: indices.length
        };
    },

    // helper buat radius array
    interpolateArray: function (arr, u) {
        const scaled = u * (arr.length - 1);
        const i = Math.floor(scaled);
        const f = scaled - i;
        const a = arr[i];
        const b = arr[Math.min(i + 1, arr.length - 1)];
        return a * (1 - f) + b * f;
    },

};
