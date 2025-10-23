Urutan Proses Animasi

1. Buat Mesh

- Gunakan createMesh(generator, {...}) untuk membangkitkan raw mesh dari generator (contoh: cube, sphere, cylinder).
- Output berupa objek { solid, wire } dengan data mesh.
- deferBuffer harus true jika mau CSG (ingat untuk buffer)

2. Modifikasi (Opsional – CSG Operation)

- Untuk operasi boolean (union, intersect, difference):
        - meshToCSG(mesh)
        - Lakukan operasi boolean CSG (misal csgA.union(csgB)).
        - csgToMesh(csg)

3. Buffer Object ke GPU (jika deferBuffer awalnya true / melakukan CSG)

- Gunakan MeshUtils.createMeshBuffers(gl, mesh, attribs) untuk membuat vertex buffer, normal buffer, index buffer, dll.

4. Buat Bone

- Di sini buat hierarki Bone.
    //  hip
    //  ├── spine
    //  │   └── chest
    //  │       ├── neck → head
    //  │       ├── leftShoulder → leftUpperArm → leftLowerArm → leftHand
    //  │       └── rightShoulder → rightUpperArm → rightLowerArm → rightHand
    //  ├── leftUpperLeg → leftLowerLeg → leftFoot
    //  └── rightUpperLeg → rightLowerLeg → rightFoot

- Bone ini juga di posisikan disini

5. Buat Model Matrix untuk Offset

- Gunanya untuk align mesh dengan bone. kita align mesh dengan bone dulu
- Create Model Matrix

6. Animasi 

- Bone yang digerakan (gunakan fungsi untuk rotate kalau mau)

7. Draw

- Panggil drawObject(buffers, modelMatrix, color, mode) untuk menggambar ke layar.
- mode bisa berupa gl.TRIANGLES (solid) atau gl.LINES (wireframe).
