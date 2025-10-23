export const MeshUtils = (function () {
    // ---------- Basic generators ----------

    // Ellipsoid generator
    function generateEllipsoid(rx = 1, ry = 1, rz = 1, latSeg = 32, lonSeg = 64) {
        // rx, ry, rz: radii along x,y,z
        // latSeg: >=2, lonSeg: >=3
        if (latSeg < 2) latSeg = 2;
        if (lonSeg < 3) lonSeg = 3;

        const positions = [];
        const normals = [];
        const uvs = [];
        // We'll generate repeated vertex at lon = 0 and lon = 2PI to allow seamless UVs
        const vertsPerRow = lonSeg + 1;

        for (let lat = 0; lat <= latSeg; lat++) {
            const v = lat / latSeg; // 0..1
            const phi = (v * Math.PI) - Math.PI / 2; // -pi/2 .. pi/2
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);

            for (let lon = 0; lon <= lonSeg; lon++) {
                const u = lon / lonSeg; // 0..1
                const theta = u * Math.PI * 2; // 0..2pi
                const cosT = Math.cos(theta);
                const sinT = Math.sin(theta);

                // unit sphere direction
                const nx_unit = cosPhi * cosT;
                const ny_unit = sinPhi;
                const nz_unit = cosPhi * sinT;

                // position scaled by radii
                const x = rx * nx_unit;
                const y = ry * ny_unit;
                const z = rz * nz_unit;

                positions.push(x, y, z);

                // correct normal: normalize( S^{-1} * n_unit ) where S = diag(rx,ry,rz)
                // i.e. [nx/rx, ny/ry, nz/rz] normalized
                const nxS = nx_unit / rx;
                const nyS = ny_unit / ry;
                const nzS = nz_unit / rz;
                const len = Math.hypot(nxS, nyS, nzS) || 1.0;
                normals.push(nxS / len, nyS / len, nzS / len);

                // UV coordinates (u,v). v=0 at south pole, 1 at north pole
                uvs.push(u, 1 - v);
            }
        }

        // indices (triangles)
        const indices = [];
        for (let lat = 0; lat < latSeg; lat++) {
            for (let lon = 0; lon < lonSeg; lon++) {
                const i0 = lat * vertsPerRow + lon;
                const i1 = i0 + vertsPerRow;
                const i2 = i0 + 1;
                const i3 = i1 + 1;

                // triangle 1: i0, i1, i2
                indices.push(i0, i1, i2);
                // triangle 2: i2, i1, i3
                indices.push(i2, i1, i3);
            }
        }

        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: (positions.length / 3) > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
            vertexCount: positions.length / 3,
            indexCount: indices.length
        };
    }

    // Box generator
    function generateBox(width = 1, height = 1, depth = 1) {
        const w2 = width / 2, h2 = height / 2, d2 = depth / 2;
        // 24 verts (4 per face) so normals per face are flat
        const positions = [
            // +X face
            w2, -h2, -d2, w2, h2, -d2, w2, h2, d2, w2, -h2, d2,
            // -X
            -w2, -h2, d2, -w2, h2, d2, -w2, h2, -d2, -w2, -h2, -d2,
            // +Y
            -w2, h2, -d2, -w2, h2, d2, w2, h2, d2, w2, h2, -d2,
            // -Y
            -w2, -h2, d2, -w2, -h2, -d2, w2, -h2, -d2, w2, -h2, d2,
            // +Z
            -w2, -h2, d2, w2, -h2, d2, w2, h2, d2, -w2, h2, d2,
            // -Z
            w2, -h2, -d2, -w2, -h2, -d2, -w2, h2, -d2, w2, h2, -d2
        ];
        const normals = [
            // +X
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            // -X
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
            // +Y
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            // -Y
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
            // +Z
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            // -Z
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1
        ];
        const uvs = [
            // simple per-face uvs (repeated)
            0, 0, 1, 0, 1, 1, 0, 1,
            0, 0, 1, 0, 1, 1, 0, 1,
            0, 0, 1, 0, 1, 1, 0, 1,
            0, 0, 1, 0, 1, 1, 0, 1,
            0, 0, 1, 0, 1, 1, 0, 1,
            0, 0, 1, 0, 1, 1, 0, 1
        ];
        const indices = [
            0, 1, 2, 0, 2, 3,       // +X
            4, 5, 6, 4, 6, 7,       // -X
            8, 9, 10, 8, 10, 11,    // +Y
            12, 13, 14, 12, 14, 15, // -Y
            16, 17, 18, 16, 18, 19, // +Z
            20, 21, 22, 20, 22, 23  // -Z
        ];

        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint16Array(indices),
            vertexCount: positions.length / 3,
            indexCount: indices.length
        };
    }

    function generateEllipticalCylinder(radiusXTop = 1, radiusZTop = 0.5, radiusXBottom = 1, radiusZBottom = 0.5,
        height = 2, radialSeg = 32, heightSeg = 1, capped = true) {

        radialSeg = Math.max(3, Math.floor(radialSeg));
        heightSeg = Math.max(1, Math.floor(heightSeg));
        const positions = [], normals = [], uvs = [], indices = [];

        const halfH = height / 2;
        const vertsPerRow = radialSeg + 1;

        // Body vertices
        for (let y = 0; y <= heightSeg; y++) {
            const v = y / heightSeg;
            const py = -halfH + v * height;

            const rx = radiusXBottom + (radiusXTop - radiusXBottom) * v;
            const rz = radiusZBottom + (radiusZTop - radiusZBottom) * v;

            for (let i = 0; i <= radialSeg; i++) {
                const u = i / radialSeg;
                const theta = u * Math.PI * 2;
                const cosT = Math.cos(theta);
                const sinT = Math.sin(theta);

                const x = rx * cosT;
                const z = rz * sinT;
                positions.push(x, py, z);

                // approximate normal
                let nx = cosT / rx;
                let nz = sinT / rz;
                let ny = (rx === rz && radiusXTop === radiusXBottom && radiusZTop === radiusZBottom) ? 0 : (radiusXBottom - radiusXTop + radiusZBottom - radiusZTop) / (2 * height);
                const len = Math.hypot(nx, ny, nz) || 1;
                normals.push(nx / len, ny / len, nz / len);

                uvs.push(u, 1 - v);
            }
        }

        // side indices
        for (let y = 0; y < heightSeg; y++) {
            for (let i = 0; i < radialSeg; i++) {
                const i0 = y * vertsPerRow + i;
                const i1 = i0 + vertsPerRow;
                const i2 = i0 + 1;
                const i3 = i1 + 1;
                indices.push(i0, i1, i2);
                indices.push(i2, i1, i3);
            }
        }

        const baseIndex = positions.length / 3;

        // caps
        if (capped) {
            // top cap
            const topCenterIndex = baseIndex;
            positions.push(0, halfH, 0);
            normals.push(0, 1, 0);
            uvs.push(0.5, 0.5);
            for (let i = 0; i <= radialSeg; i++) {
                const u = i / radialSeg;
                const theta = u * Math.PI * 2;
                const cosT = Math.cos(theta);
                const sinT = Math.sin(theta);
                positions.push(radiusXTop * cosT, halfH, radiusZTop * sinT);
                normals.push(0, 1, 0);
                uvs.push((cosT + 1) * 0.5, (sinT + 1) * 0.5);
            }
            const topStart = topCenterIndex + 1;
            for (let i = 0; i < radialSeg; i++) {
                indices.push(topCenterIndex, topStart + i + 1, topStart + i);
            }

            // bottom cap
            const bottomCenterIndex = positions.length / 3;
            positions.push(0, -halfH, 0);
            normals.push(0, -1, 0);
            uvs.push(0.5, 0.5);
            for (let i = 0; i <= radialSeg; i++) {
                const u = i / radialSeg;
                const theta = u * Math.PI * 2;
                const cosT = Math.cos(theta);
                const sinT = Math.sin(theta);
                positions.push(radiusXBottom * cosT, -halfH, radiusZBottom * sinT);
                normals.push(0, -1, 0);
                uvs.push((cosT + 1) * 0.5, (sinT + 1) * 0.5);
            }
            const bottomStart = bottomCenterIndex + 1;
            for (let i = 0; i < radialSeg; i++) {
                indices.push(bottomCenterIndex, bottomStart + i, bottomStart + i + 1);
            }
        }

        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: (positions.length / 3) > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
            vertexCount: positions.length / 3,
            indexCount: indices.length
        };
    }

    // Torus generator
    function generateTorus(radius = 1, tube = 0.25, radialSeg = 64, tubularSeg = 24) {
        radialSeg = Math.max(3, Math.floor(radialSeg));
        tubularSeg = Math.max(3, Math.floor(tubularSeg));
        const positions = [], normals = [], uvs = [], indices = [];

        for (let j = 0; j <= tubularSeg; j++) {
            const v = j / tubularSeg * Math.PI * 2;
            const cosV = Math.cos(v);
            const sinV = Math.sin(v);

            for (let i = 0; i <= radialSeg; i++) {
                const u = i / radialSeg * Math.PI * 2;
                const cosU = Math.cos(u);
                const sinU = Math.sin(u);

                const cx = (radius + tube * cosV) * cosU;
                const cy = tube * sinV;
                const cz = (radius + tube * cosV) * sinU;
                positions.push(cx, cy, cz);

                // approximate normal
                const nx = cosV * cosU;
                const ny = sinV;
                const nz = cosV * sinU;
                const len = Math.hypot(nx, ny, nz) || 1;
                normals.push(nx / len, ny / len, nz / len);

                uvs.push(i / radialSeg, j / tubularSeg);
            }
        }

        const vertsPerRow = radialSeg + 1;
        for (let j = 0; j < tubularSeg; j++) {
            for (let i = 0; i < radialSeg; i++) {
                const a = j * vertsPerRow + i;
                const b = (j + 1) * vertsPerRow + i;
                const c = b + 1;
                const d = a + 1;
                indices.push(a, b, d);
                indices.push(d, b, c);
            }
        }

        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: (positions.length / 3) > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
            vertexCount: positions.length / 3,
            indexCount: indices.length
        };
    }

    function generateEllipticalCone(radiusX = 1, radiusZ = 1, height = 2, slices = 32, singleNappe = true) {
        slices = Math.max(3, Math.floor(slices));
        const positions = [];
        const indices = [];

        // --- 1. Buat Vertices ---

        // Base circle (di y=0)
        positions.push(0, 0, 0); // center index 0
        for (let i = 0; i <= slices; i++) {
            const theta = (i / slices) * 2 * Math.PI;
            // Gunakan radiusX dan radiusZ untuk membuat elips
            positions.push(radiusX * Math.cos(theta), 0, radiusZ * Math.sin(theta));
        }

        // Tip (ujung atas)
        const tipIndex = positions.length / 3; // Index dari vertex ujung atas
        positions.push(0, height, 0); // tip at y=height

        let negTipIndex = -1; // Index untuk ujung bawah (jika ada)

        if (!singleNappe) {
            // Buat tip kedua (ujung bawah) untuk bentuk jam pasir
            negTipIndex = positions.length / 3;
            positions.push(0, -height, 0); // negative tip at y=-height
        }

        // --- 2. Buat Indices ---

        // Base indices (Tutup dasar)
        // (Mengikuti urutan Clockwise/CW Anda: 0, i, i+1)
        for (let i = 1; i <= slices; i++) {
            indices.push(0, i, i + 1);
        }

        // Side indices (Sisi kerucut atas)
        // (Mengikuti urutan CW Anda: i, tip, i+1)
        for (let i = 1; i <= slices; i++) {
            indices.push(i, tipIndex, i + 1);
        }

        // Side indices (Sisi kerucut bawah, jika ada)
        if (!singleNappe) {
            // (Menggunakan urutan CW: i, i+1, negTip)
            for (let i = 1; i <= slices; i++) {
                indices.push(i, i + 1, negTipIndex);
            }
        }

        return {
            positions: new Float32Array(positions),
            indices: (positions.length / 3) > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)
            // Catatan: 'normals' dan 'uvs' sengaja dihilangkan,
            // sama seperti fungsi generateCone Anda.
        };
    }

    function generateCone(radius = 1, height = 2, slices = 32) {
        const positions = [];
        const indices = [];

        // base circle
        positions.push(0, 0, 0); // center index 0
        for (let i = 0; i <= slices; i++) {
            const theta = (i / slices) * 2 * Math.PI;
            positions.push(radius * Math.cos(theta), 0, radius * Math.sin(theta));
        }

        const tipIndex = positions.length / 3;
        positions.push(0, height, 0); // tip

        // base indices
        for (let i = 1; i <= slices; i++) {
            indices.push(0, i, i + 1);
        }

        // side indices
        for (let i = 1; i <= slices; i++) {
            indices.push(i, tipIndex, i + 1);
        }

        return { positions: new Float32Array(positions), indices: new Uint16Array(indices) };
    }

    function generateEllipticParaboloid(a = 1, b = 1, c = 1, height = 2, slices = 32, stacks = 16) {
        const positions = [];
        const indices = [];
        const tempNormals = [];

        for (let i = 0; i <= stacks; i++) {
            const Z_scaled = (i / stacks) * (height / c);
            const r = Math.sqrt(Z_scaled);
            const z = c * Z_scaled;

            for (let j = 0; j <= slices; j++) {
                const theta = (j / slices) * 2 * Math.PI;

                const x = a * r * Math.cos(theta);
                const y = b * r * Math.sin(theta);
                positions.push(x, y, z);

                // --- Perhitungan Normal ---
                let nx = 2 * x / (a * a);
                let ny = 2 * y / (b * b);
                let nz = -1 / c;

                // Normalisasi
                const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
                if (length > 0) {
                    nx /= length;
                    ny /= length;
                    nz /= length;
                }
                tempNormals.push(nx, ny, nz);
            }
        }

        // --- Perhitungan Indeks ---
        const rowVerts = slices + 1;
        for (let i = 0; i < stacks; i++) {
            for (let j = 0; j < slices; j++) {
                const i0 = i * rowVerts + j;
                const i1 = i0 + 1;
                const i2 = i0 + rowVerts;
                const i3 = i2 + 1;

                indices.push(i0, i1, i2);
                indices.push(i1, i3, i2);

            }
        }

        const positionsLength = positions.length / 3;

        return {
            positions: new Float32Array(positions),
            indices: (positionsLength > 65535)
                ? new Uint32Array(indices)
                : new Uint16Array(indices),
            normals: new Float32Array(tempNormals),
        };
    }

    function generateHyperbolicParaboloid(a = 1, b = 1, c = 1, size = 2, slices = 32, stacks = 32) {
        const positions = [];
        const normals = [];
        const indices = [];

        // 1. Hitung Posisi dan Normal
        // Iterasi melalui domain (kotak) dari x dan y
        for (let i = 0; i <= stacks; i++) {
            // y: berkisar dari -size hingga +size
            const y = -size + (2 * size * i) / stacks;

            for (let j = 0; j <= slices; j++) {
                // x: berkisar dari -size hingga +size
                const x = -size + (2 * size * j) / slices;

                // Hitung Z_term: (x^2 / a^2) - (y^2 / b^2)
                const z_term = (x * x) / (a * a) - (y * y) / (b * b);

                // Ketinggian z sebenarnya: z = c * Z_term
                const z = c * z_term;

                positions.push(x, y, z);

                // --- Perhitungan Normal ---
                // F(x,y,z) = x^2/a^2 - y^2/b^2 - z/c = 0
                // Vektor Normal N = gradien F = < dF/dx, dF/dy, dF/dz >
                // N = < 2x/a^2, -2y/b^2, -1/c >
                let nx = 2 * x / (a * a);
                let ny = -2 * y / (b * b);
                let nz = -1 / c;

                // Normalisasi vektor
                const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
                if (length > 1e-6) { // Pastikan tidak dibagi nol
                    nx /= length;
                    ny /= length;
                    nz /= length;
                }
                // Normalnya harus menunjuk ke atas, jadi kita balik (negatif)
                // (Tergantung orientasi segitiga, biasanya kita ingin normal menunjuk ke 'luar' atau 'atas')
                normals.push(-nx, -ny, -nz);
            }
        }

        // 2. Hitung Indeks (Topologi Mesh)
        const rowVerts = slices + 1;
        for (let i = 0; i < stacks; i++) {
            for (let j = 0; j < slices; j++) {
                const i0 = i * rowVerts + j;
                const i1 = i0 + 1;
                const i2 = i0 + rowVerts;
                const i3 = i2 + 1;

                // Segitiga 1 dan Segitiga 2 untuk membentuk quad
                indices.push(i0, i2, i1);
                indices.push(i1, i2, i3);
            }
        }

        // 3. Kembalikan Data Mesh
        const positionsLength = positions.length / 3;

        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            // Menggunakan Uint32Array jika jumlah simpul sangat besar
            indices: (positionsLength > 65535) ? new Uint32Array(indices) : new Uint16Array(indices)
        };
    }

    function generateHyperboloidSheets(a = 1, b = 1, c = 1, uSteps = 32, vSteps = 32, vMax = 1.5) {
        // parameterization:
        // x = a * cosh(v) * cos(u)
        // y = b * cosh(v) * sin(u)
        // z = ± c * sinh(v)
        const positions = [];
        const indices = [];

        for (let sign of [-1, 1]) {
            for (let i = 0; i <= vSteps; i++) {
                const v = (i / vSteps) * vMax;
                for (let j = 0; j <= uSteps; j++) {
                    const u = (j / uSteps) * 2 * Math.PI;
                    const x = a * Math.cosh(v) * Math.cos(u);
                    const y = b * Math.cosh(v) * Math.sin(u);
                    const z = sign * c * Math.sinh(v);
                    positions.push(x, y, z);
                }
            }
        }

        const rowVerts = uSteps + 1;
        const half = (vSteps + 1) * (uSteps + 1);

        // buat koneksi untuk tiap sheet
        for (let base = 0; base <= half; base += half) {
            for (let i = 0; i < vSteps; i++) {
                for (let j = 0; j < uSteps; j++) {
                    const i0 = base + i * rowVerts + j;
                    const i1 = i0 + 1;
                    const i2 = i0 + rowVerts;
                    const i3 = i2 + 1;
                    indices.push(i0, i2, i1, i1, i2, i3);
                }
            }
        }

        return { positions: new Float32Array(positions), normals: new Float32Array(positions, indices), indices: new Uint16Array(indices) };
    }

    function generateHyperboloid2Sheets(a = 1, b = 1, c = 1, uSteps = 32, vSteps = 32, vMax = 1.5) {
        // parameterization of 2 sheets:
        // x = a * sinh(v) * cos(u)
        // y = b * sinh(v) * sin(u)
        // z = ± c * cosh(v)

        const positions = [];
        const indices = [];

        for (let sign of [-1, 1]) { // +1 = top sheet, -1 = bottom sheet
            for (let i = 0; i <= vSteps; i++) {
                const v = (i / vSteps) * vMax;
                for (let j = 0; j <= uSteps; j++) {
                    const u = (j / uSteps) * 2 * Math.PI;
                    const x = a * Math.sinh(v) * Math.cos(u);
                    const y = b * Math.sinh(v) * Math.sin(u);
                    const z = sign * c * Math.cosh(v);
                    positions.push(x, y, z);
                }
            }
        }

        const rowVerts = uSteps + 1;
        const half = (vSteps + 1) * (uSteps + 1);

        // connect each sheet separately
        for (let base = 0; base <= half; base += half) {
            for (let i = 0; i < vSteps; i++) {
                for (let j = 0; j < uSteps; j++) {
                    const i0 = base + i * rowVerts + j;
                    const i1 = i0 + 1;
                    const i2 = i0 + rowVerts;
                    const i3 = i2 + 1;
                    indices.push(i0, i2, i1, i1, i2, i3);
                }
            }
        }

        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(positions, indices),
            indices: new Uint16Array(indices)
        };
    }

    // ---------- Helpers ----------

    // Compute smooth normals from arbitrary positions + indices (overwrites/returns new Float32Array)
    function computeNormals(positions, indices) {
        const nVerts = positions.length / 3;
        const normals = new Float32Array(nVerts * 3);
        // accumulate face normals
        for (let i = 0; i < indices.length; i += 3) {
            const ia = indices[i] * 3, ib = indices[i + 1] * 3, ic = indices[i + 2] * 3;
            const ax = positions[ia], ay = positions[ia + 1], az = positions[ia + 2];
            const bx = positions[ib], by = positions[ib + 1], bz = positions[ib + 2];
            const cx = positions[ic], cy = positions[ic + 1], cz = positions[ic + 2];

            const ux = bx - ax, uy = by - ay, uz = bz - az;
            const vx = cx - ax, vy = cy - ay, vz = cz - az;
            // face normal = cross(u, v)
            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;

            normals[ia] += nx; normals[ia + 1] += ny; normals[ia + 2] += nz;
            normals[ib] += nx; normals[ib + 1] += ny; normals[ib + 2] += nz;
            normals[ic] += nx; normals[ic + 1] += ny; normals[ic + 2] += nz;
        }
        // normalize
        for (let i = 0; i < nVerts; i++) {
            const ix = i * 3;
            const x = normals[ix], y = normals[ix + 1], z = normals[ix + 2];
            const len = Math.hypot(x, y, z) || 1.0;
            normals[ix] = x / len; normals[ix + 1] = y / len; normals[ix + 2] = z / len;
        }
        return normals;
    }

    // Create GL buffers: returns object with VBOs and IBO
    // GL: WebGLRenderingContext
    // mesh: object returned by generators {positions, normals, uvs, indices}
    // attribLocations: {position: loc, normal: loc?, uv: loc?}
    function createMeshBuffers(GL, mesh, attribLocations = {}) {
        const vaoLike = {};

        // position
        vaoLike.positionBuffer = GL.createBuffer();
        GL.bindBuffer(GL.ARRAY_BUFFER, vaoLike.positionBuffer);
        GL.bufferData(GL.ARRAY_BUFFER, mesh.positions, GL.STATIC_DRAW);
        vaoLike.positionSize = 3;

        if (attribLocations.position !== undefined) {
            GL.enableVertexAttribArray(attribLocations.position);
            GL.bindBuffer(GL.ARRAY_BUFFER, vaoLike.positionBuffer);
            GL.vertexAttribPointer(attribLocations.position, 3, GL.FLOAT, false, 0, 0);
        }

        // normals
        if (mesh.normals) {
            vaoLike.normalBuffer = GL.createBuffer();
            GL.bindBuffer(GL.ARRAY_BUFFER, vaoLike.normalBuffer);
            GL.bufferData(GL.ARRAY_BUFFER, mesh.normals, GL.STATIC_DRAW);
            vaoLike.normalSize = 3;
            if (attribLocations.normal !== undefined) {
                GL.enableVertexAttribArray(attribLocations.normal);
                GL.bindBuffer(GL.ARRAY_BUFFER, vaoLike.normalBuffer);
                GL.vertexAttribPointer(attribLocations.normal, 3, GL.FLOAT, false, 0, 0);
            }
        }

        // uvs
        if (mesh.uvs) {
            vaoLike.uvBuffer = GL.createBuffer();
            GL.bindBuffer(GL.ARRAY_BUFFER, vaoLike.uvBuffer);
            GL.bufferData(GL.ARRAY_BUFFER, mesh.uvs, GL.STATIC_DRAW);
            vaoLike.uvSize = 2;
            if (attribLocations.uv !== undefined) {
                GL.enableVertexAttribArray(attribLocations.uv);
                GL.bindBuffer(GL.ARRAY_BUFFER, vaoLike.uvBuffer);
                GL.vertexAttribPointer(attribLocations.uv, 2, GL.FLOAT, false, 0, 0);
            }
        }

        // index
        if (mesh.indices) {
            // cek apakah index > 65535 (butuh uint32)
            if (mesh.indices instanceof Uint32Array) {
                const ext = GL.getExtension('OES_element_index_uint');
                if (!ext) {
                    if ((mesh.positions.length / 3) <= 65535) {
                        // fallback: konversi ke 16-bit
                        mesh.indices = new Uint16Array(mesh.indices);
                    } else {
                        throw new Error('Butuh extension OES_element_index_uint untuk >65535 vertex');
                    }
                }
            }
            vaoLike.indexBuffer = GL.createBuffer();
            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, vaoLike.indexBuffer);
            GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, mesh.indices, GL.STATIC_DRAW);
            vaoLike.indexType = (mesh.indices instanceof Uint32Array) ? GL.UNSIGNED_INT : GL.UNSIGNED_SHORT;
            vaoLike.indexCount = mesh.indices.length;
        } else {
            vaoLike.indexCount = mesh.vertexCount;
        }

        // unbind array buffer to be clean
        GL.bindBuffer(GL.ARRAY_BUFFER, null);

        return vaoLike;
    }

    // Draw helper: expects shader already in use and attribute pointers bound
    // mode: GL.TRIANGLES (default) or GL.LINES etc.
    function drawMesh(GL, buffers, mode = null) {
        const drawMode = mode || GL.TRIANGLES;
        if (buffers.indexBuffer) {
            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
            GL.drawElements(drawMode, buffers.indexCount, buffers.indexType, 0);
        } else {
            // arrays
            GL.drawArrays(drawMode, 0, buffers.indexCount);
        }
    }

    // Convert triangle indices to line list for wireframe drawing (no duplication)
    function generateWireframeIndices(triIndices) {
        const edgeSet = new Map();
        function edgeKey(a, b) { return (a < b) ? (a + '_' + b) : (b + '_' + a); }
        for (let i = 0; i < triIndices.length; i += 3) {
            const a = triIndices[i], b = triIndices[i + 1], c = triIndices[i + 2];
            [[a, b], [b, c], [c, a]].forEach(([p, q]) => {
                const k = edgeKey(p, q);
                if (!edgeSet.has(k)) edgeSet.set(k, [p, q]);
            });
        }
        const lines = [];
        for (const v of edgeSet.values()) lines.push(v[0], v[1]);
        return (lines.length > 65535) ? new Uint32Array(lines) : new Uint16Array(lines);
    }

    // Useful small utility: compute bounding sphere (center in world space origin assumed)
    function computeBoundingSphere(positions) {
        // naive: compute centroid then max distance
        const n = positions.length / 3;
        let cx = 0, cy = 0, cz = 0;
        for (let i = 0; i < n; i++) {
            cx += positions[i * 3];
            cy += positions[i * 3 + 1];
            cz += positions[i * 3 + 2];
        }
        cx /= n; cy /= n; cz /= n;
        let r = 0;
        for (let i = 0; i < n; i++) {
            const dx = positions[i * 3] - cx, dy = positions[i * 3 + 1] - cy, dz = positions[i * 3 + 2] - cz;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > r) r = d2;
        }
        return { center: [cx, cy, cz], radius: Math.sqrt(r) };
    }

    // Public API
    return {
        generateEllipsoid,
        generateBox,
        generateEllipticalCylinder,
        generateTorus,
        generateEllipticalCone,
        generateCone,
        generateEllipticParaboloid,
        generateHyperbolicParaboloid,
        generateHyperboloidSheets,
        generateHyperboloid2Sheets,
        computeNormals,
        createMeshBuffers,
        drawMesh,
        generateWireframeIndices,
        computeBoundingSphere
    };
})();
