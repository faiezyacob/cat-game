/**
 * toyModel.js - Procedural 3D toy models
 */
class ToyModel {
    constructor() {
        this.group = new THREE.Group();
        this.mesh = null;
        this.type = null;

        // Materials
        this.ballMat = new THREE.MeshStandardMaterial({ color: 0xff5252 }); // Red
        this.featherMat = new THREE.MeshStandardMaterial({ color: 0x80deea }); // Cyan
        this.mouseMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae }); // Gray
        this.foodMat = new THREE.MeshStandardMaterial({ color: 0xffcc80 }); // Tan/Bowl
        this.kibbleMat = new THREE.MeshStandardMaterial({ color: 0x795548 }); // Brown
        this.eyeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    }

    build(type) {
        // Clear existing
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }
        this.type = type;
        this.group.position.set(0, 0, 0);
        this.group.rotation.set(0, 0, 0);
        this.group.scale.set(1, 1, 1);

        if (type === 'ball') {
            this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), this.ballMat);
            this.mesh.position.y = 0.2;
            this.mesh.castShadow = true;
            this.group.add(this.mesh);
        } else if (type === 'feather') {
            this.mesh = new THREE.Group();
            for (let i = 0; i < 3; i++) {
                const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.2), this.featherMat);
                f.position.set(0, 0.2, (i - 1) * 0.15);
                f.rotation.z = (i - 1) * 0.3;
                this.mesh.add(f);
            }
            this.group.add(this.mesh);
        } else if (type === 'mouse') {
            this.mesh = new THREE.Group();
            // Body
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), this.mouseMat);
            body.position.y = 0.15;
            body.castShadow = true;
            this.mesh.add(body);
            // Ears
            const earL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), this.mouseMat);
            earL.position.set(0.2, 0.3, 0.1);
            this.mesh.add(earL);
            const earR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), this.mouseMat);
            earR.position.set(0.2, 0.3, -0.1);
            this.mesh.add(earR);
            // Tail
            const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), this.mouseMat);
            tail.position.set(-0.4, 0.05, 0);
            this.mesh.add(tail);

            this.group.add(this.mesh);
        } else if (type === 'food') {
            this.mesh = new THREE.Group();
            // Bowl
            const bowl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), this.foodMat);
            bowl.position.y = 0.1;
            this.mesh.add(bowl);
            // Food
            const kibble = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), this.kibbleMat);
            kibble.position.y = 0.2;
            this.mesh.add(kibble);
            this.group.add(this.mesh);
        }
    }

    animate(dt, time) {
        if (!this.mesh) return;

        if (this.type === 'ball') {
            this.mesh.rotation.x += 0.1 * dt;
            this.mesh.rotation.z += 0.05 * dt;
            // Bouncing logic
            this.mesh.position.y = 0.2 + Math.abs(Math.sin(time * 0.01)) * 0.6;
        } else if (this.type === 'feather') {
            this.mesh.rotation.x = Math.sin(time * 0.003) * 0.3;
            this.mesh.rotation.z = Math.cos(time * 0.002) * 0.3;
            this.mesh.rotation.y += 0.02 * dt; // Slow spin
        } else if (this.type === 'mouse') {
            this.mesh.position.y = Math.abs(Math.sin(time * 0.02)) * 0.1;
        }
    }
}

window.ToyModel = ToyModel;
