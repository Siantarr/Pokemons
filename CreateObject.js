import { MeshUtils } from './MeshUtils.js';
import { GL, attribs, proj, view, uMVP, uColor, uModel, uNormalMat, uIsBone, uColorBone } from './main.js'

// MEMBUAT OBJECT NYA
export function createModelMatrix({ translate = [0, 0, 0], rotate = [], scale = [1, 1, 1] }) {
    const model = mat4.create();

    // Apply translate
    if (translate) {
        mat4.translate(model, model, translate);
    }

    // Apply rotations
    for (const r of rotate) {
        if (typeof r.axis === "string") {
            // Case 1: axis = "x" | "y" | "z"
            if (r.axis === "x") mat4.rotateX(model, model, r.angle);
            if (r.axis === "y") mat4.rotateY(model, model, r.angle);
            if (r.axis === "z") mat4.rotateZ(model, model, r.angle);

        } else if (Array.isArray(r.axis)) {
            // Case 2: axis = [ax, ay, az] (vector through origin)
            const axis = vec3.clone(r.axis);
            vec3.normalize(axis, axis);
            mat4.rotate(model, model, r.angle, axis);

        } else if (typeof r.axis === "object" && r.axis.point && r.axis.dir) {
            // Case 3: axis = { point: [px,py,pz], dir: [dx,dy,dz] }
            const axis = vec3.clone(r.axis.dir);
            vec3.normalize(axis, axis);
            const p = r.axis.point;

            // 1. translate so axis point moves to origin
            mat4.translate(model, model, [-p[0], -p[1], -p[2]]);

            // 2. rotate around direction vector
            mat4.rotate(model, model, r.angle, axis);

            // 3. translate back
            mat4.translate(model, model, p);
        }
    }

    // Apply scale
    if (scale) {
        mat4.scale(model, model, scale);
    }

    return model;
}

export function createMesh(generator, { params = null, options = {}, cutOptions = null, deferBuffer = true }) {
    const result = {};
    options = Object.assign({ solid: true, wire: true }, options);

    // --- Solid mesh ---
    if (options.solid) {
        let mesh = generator.apply(null, params);

        // cut kalau ada
        if (cutOptions && cutOptions.percent < 1.0) {
            mesh = cutMesh(mesh, cutOptions.percent, cutOptions.axis, cutOptions.keep);
        }
        result.solid = {};
        result.solid.mesh = mesh;

        if (!deferBuffer) {
            const buffers = MeshUtils.createMeshBuffers(GL, mesh, attribs);
            result.solid.buffers = buffers;
        }

    }

    // --- Wireframe mesh ---
    if (options.wire) {
        let baseMesh = result.solid ? result.solid.mesh : generator.apply(null, params);

        if (!result.solid && cutOptions && cutOptions.percent < 1.0) {
            baseMesh = cutMesh(baseMesh, cutOptions.percent, cutOptions.axis, cutOptions.keep);
        }

        const wireIdx = MeshUtils.generateWireframeIndices(baseMesh.indices);
        const wireMesh = { positions: baseMesh.positions, indices: wireIdx };

        result.wire = {};
        result.wire.mesh = wireMesh;

        if (!deferBuffer) {
            const wireBuffers = MeshUtils.createMeshBuffers(GL, wireMesh, attribs);
            result.wire.buffers = wireBuffers;
        }
    }
    return result;

}

// cutMesh: menerima raw mesh {positions, normals, indices} dan mengembalikan raw cut mesh
export function cutMesh(rawMesh, cutPercent = 1.0, axis = "y", keep = "lower") {
    if (!rawMesh || !rawMesh.positions || !rawMesh.indices) {
        throw new Error('cutMesh: expected raw mesh {positions, normals?, indices}');
    }

    const positions = rawMesh.positions;
    const normals = rawMesh.normals || null;
    const indices = rawMesh.indices;

    const vertexCount = positions.length / 3;
    if (vertexCount === 0 || indices.length === 0) {
        return { positions: new Float32Array(0), normals: null, indices: new Uint16Array(0) };
    }

    const axisIdx = (axis === "x") ? 0 : (axis === "y") ? 1 : 2;

    // find min/max along axis
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < vertexCount; i++) {
        const v = positions[i * 3 + axisIdx];
        if (v < min) min = v;
        if (v > max) max = v;
    }

    const range = max - min;
    const cutoff = (keep === "lower") ? (min + range * cutPercent) : (max - range * cutPercent);

    // build new vertex list only for triangles fully kept
    const newPos = [];
    const newNor = [];
    const newIdx = [];
    const remap = new Map();
    let nextIdx = 0;

    function vertexKeep(idx) {
        const val = positions[idx * 3 + axisIdx];
        return (keep === "lower") ? (val <= cutoff) : (val >= cutoff);
    }

    for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i], b = indices[i + 1], c = indices[i + 2];
        if (vertexKeep(a) && vertexKeep(b) && vertexKeep(c)) {
            const tri = [a, b, c];
            const triOut = [];
            for (let k = 0; k < 3; k++) {
                const oldIdx = tri[k];
                if (!remap.has(oldIdx)) {
                    remap.set(oldIdx, nextIdx);
                    newPos.push(
                        positions[oldIdx * 3],
                        positions[oldIdx * 3 + 1],
                        positions[oldIdx * 3 + 2]
                    );
                    if (normals) {
                        newNor.push(
                            normals[oldIdx * 3],
                            normals[oldIdx * 3 + 1],
                            normals[oldIdx * 3 + 2]
                        );
                    }
                    triOut.push(nextIdx);
                    nextIdx++;
                } else {
                    triOut.push(remap.get(oldIdx));
                }
            }
            newIdx.push(triOut[0], triOut[1], triOut[2]);
        }
    }

    // choose index array type (Uint16 or Uint32)
    const vertexCountOut = newPos.length / 3;
    const indicesArray = (vertexCountOut > 65535) ? new Uint32Array(newIdx) : new Uint16Array(newIdx);

    return {
        positions: new Float32Array(newPos),
        normals: (newNor.length ? new Float32Array(newNor) : null),
        indices: indicesArray,
        vertexCount: vertexCountOut,
        indexCount: newIdx.length
    };
}

export function drawObject(buffers, model, color, mode, isBone = false) {
    // --- binding attribute (pos, normal, uv) — tetap seperti kamu punya sekarang ---
    if (attribs.position >= 0) {
        GL.bindBuffer(GL.ARRAY_BUFFER, buffers.positionBuffer);
        GL.vertexAttribPointer(attribs.position, 3, GL.FLOAT, false, 0, 0);
        GL.enableVertexAttribArray(attribs.position);
    }

    if (buffers.normalBuffer && attribs.normal >= 0) {
        GL.bindBuffer(GL.ARRAY_BUFFER, buffers.normalBuffer);
        GL.vertexAttribPointer(attribs.normal, 3, GL.FLOAT, false, 0, 0);
        GL.enableVertexAttribArray(attribs.normal);
    } else if (attribs.normal >= 0) {
        GL.disableVertexAttribArray(attribs.normal);
    }

    if (buffers.uvBuffer && attribs.uv >= 0) {
        GL.bindBuffer(GL.ARRAY_BUFFER, buffers.uvBuffer);
        GL.vertexAttribPointer(attribs.uv, 2, GL.FLOAT, false, 0, 0);
        GL.enableVertexAttribArray(attribs.uv);
    } else if (attribs.uv >= 0) {
        GL.disableVertexAttribArray(attribs.uv);
    }

    // index buffer
    if (buffers.indexBuffer) GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);

    // uniforms
    const mvp = mat4.create();
    mat4.multiply(mvp, view, model);
    mat4.multiply(mvp, proj, mvp);
    GL.uniformMatrix4fv(uMVP, false, mvp);
    GL.uniformMatrix4fv(uModel, false, model);

    if (isBone) {
        // bone = flat color path — set color uniform only
        GL.uniform1i(uIsBone, 1);
        // IMPORTANT: do NOT set normal matrix here (leave it alone)
    } else {
        // normal mesh path — provide normal matrix + lighting color
        const normalMat = mat3.create();
        mat3.normalFromMat4(normalMat, model);
        GL.uniformMatrix3fv(uNormalMat, false, normalMat);

        GL.uniform1i(uIsBone, 0);
        const col = (color && color.length) ? color : [1.0, 0.8, 0.6];
        GL.uniform3fv(uColor, col);
    }

    // finally draw
    GL.drawElements(mode, buffers.indexCount, buffers.indexType, 0);
}


// mengubah transformasi ini menjadi titik pusatnya. Contoh rotate 90 derajat ke kiri, jika apply, rotation tetap 90 derajat ke kiri tapi akan kembali menjadi 0 derajat lagi.
export function applyTransformToMesh(mesh, { translate = [0, 0, 0], rotate = [], scale = [1, 1, 1] }) {
    const matrix = createModelMatrix({ translate, rotate, scale });
    const pos = mesh.positions;
    const newPos = new Float32Array(pos.length);
    const v = vec3.create();

    for (let i = 0; i < pos.length; i += 3) {
        vec3.set(v, pos[i], pos[i + 1], pos[i + 2]);
        vec3.transformMat4(v, v, matrix);
        newPos[i] = v[0];
        newPos[i + 1] = v[1];
        newPos[i + 2] = v[2];
    }

    return {
        positions: newPos,
        indices: mesh.indices,
        normals: mesh.normals ? mesh.normals.slice() : null
    };
}

// Reset pivot mesh agar center berada di (0,0,0)
export function recenterMesh(mesh) {
    if (!mesh || !mesh.positions) return mesh;

    const positions = mesh.positions;
    const numVerts = positions.length / 3;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    // 1. cari bounding box
    for (let i = 0; i < numVerts; i++) {
        const x = positions[i * 3 + 0];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
    }

    // 2. hitung pusat
    const center = [
        (minX + maxX) / 2,
        (minY + maxY) / 2,
        (minZ + maxZ) / 2,
    ];

    // 3. geser semua posisi
    for (let i = 0; i < numVerts; i++) {
        positions[i * 3 + 0] -= center[0];
        positions[i * 3 + 1] -= center[1];
        positions[i * 3 + 2] -= center[2];
    }

    return mesh;
}
