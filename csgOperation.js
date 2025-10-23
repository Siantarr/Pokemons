// import { CSG, Vertex, Vector3D } from './others/csg.js';

// Convert raw mesh -> CSG
export function meshToCSG(mesh) {

    if (!mesh) {
        throw new Error("meshToCSG() dipanggil tanpa mesh (undefined/null)");
    }
    if (!mesh.positions || !mesh.indices) {
        console.error("Mesh tidak valid:", mesh);
        throw new Error("meshToCSG() membutuhkan {positions, indices}");
    }

    const polygons = [];
    const pos = mesh.positions;
    const idx = mesh.indices;

    for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i], b = idx[i + 1], c = idx[i + 2];
        const v1 = new CSG.Vertex(
            new CSG.Vector(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]),
            new CSG.Vector(0, 0, 0)
        );
        const v2 = new CSG.Vertex(
            new CSG.Vector(pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]),
            new CSG.Vector(0, 0, 0)
        );
        const v3 = new CSG.Vertex(
            new CSG.Vector(pos[c * 3], pos[c * 3 + 1], pos[c * 3 + 2]),
            new CSG.Vector(0, 0, 0)
        );
        polygons.push(new CSG.Polygon([v1, v2, v3]));
    }
    return CSG.fromPolygons(polygons);
}


// Convert CSG -> raw mesh
export function csgToMesh(csg) {
    const positions = [];
    const normals = [];
    const indices = [];
    let idx = 0;

    csg.polygons.forEach(p => {
        for (let i = 2; i < p.vertices.length; i++) {
            const v0 = p.vertices[0].pos;
            const v1 = p.vertices[i - 1].pos;
            const v2 = p.vertices[i].pos;

            // posisi
            positions.push(v0.x, v0.y, v0.z);
            positions.push(v1.x, v1.y, v1.z);
            positions.push(v2.x, v2.y, v2.z);

            // hitung normal face pakai cross product
            const ux = v1.x - v0.x;
            const uy = v1.y - v0.y;
            const uz = v1.z - v0.z;
            const vx = v2.x - v0.x;
            const vy = v2.y - v0.y;
            const vz = v2.z - v0.z;

            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;

            // normal sama untuk semua vertex segitiga
            for (let j = 0; j < 3; j++) {
                normals.push(nx, ny, nz);
            }

            // indices
            indices.push(idx, idx + 1, idx + 2);
            idx += 3;
        }
    });

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new (positions.length / 3 > 65535 ? Uint32Array : Uint16Array)(indices)
    };
}


// Boolean ops
// --- builder ---
export class CSGBuilder {
    constructor(initial) {
        if (initial.positions && initial.indices) {
            // Kalau bentuknya mesh → convert dulu
            this.csg = meshToCSG(initial);
        } else if (initial.polygons) {
            // Kalau sudah CSG → langsung pakai
            this.csg = initial;
        } else {
            throw new Error("CSGBuilder butuh mesh {positions, indices} atau CSG {polygons}");
        }
    }

    union(meshOrCSG) {
        const other = meshOrCSG.polygons ? meshOrCSG : meshToCSG(meshOrCSG);
        this.csg = this.csg.union(other);
        return this;
    }

    subtract(meshOrCSG) {
        const other = meshOrCSG.polygons ? meshOrCSG : meshToCSG(meshOrCSG);
        this.csg = this.csg.subtract(other);
        return this;
    }

    intersect(meshOrCSG) {
        const other = meshOrCSG.polygons ? meshOrCSG : meshToCSG(meshOrCSG);
        this.csg = this.csg.intersect(other);
        return this;
    }

    toMesh() {
        return csgToMesh(this.csg);
    }

    toCSG() {
        return this.csg;
    }
}
