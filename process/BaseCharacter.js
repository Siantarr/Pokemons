import { Bone } from "../bone.js";

export class BaseCharacter {
    constructor() {
        this.offsetMesh = {};   // node transform
        this.meshes = {};  //createMesh
        this.skeleton = {};
        this.bones = {};
        this.root = null;
    }

    // step 1: create Bone
    createBone(name, parentName = null, spec = { translate: [0, 0, 0], rotate: [], scale: [1, 1, 1] }) {
        // kalau parentName string → ambil dari this.bones
        let parent = null;
        if (typeof parentName === "string") {
            parent = this.bones[parentName] || null;
        } else {
            parent = parentName; // kalau langsung object Bone
        }

        const bone = new Bone(name, parent, spec);
        this.bones[name] = bone;

        if (!this.root && !parent && parentName == null) {
            this.root = bone; // root otomatis kalau belum ada
        }
        return bone;
    }

    // step 2: define offsets + mesh binding
    createModelMatrix() {
        throw new Error("mesh() must be implemented");
    }

    // step 3: animate per-frame
    animate(time) {

    }

    // step 4: draw
    drawObject() {

    }

    updateWorld() {
        if (this.root) this.root.updateWorld();
    }
}
