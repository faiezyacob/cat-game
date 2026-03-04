/**
 * catModel.js - Procedural low-poly cat construction
 */
class CatModel {
    constructor() {
        this.group = new THREE.Group();

        // Materials
        this.bodyMat = new THREE.MeshStandardMaterial({ color: 0xffa726 }); // Tabby Orange
        this.stripeMat = new THREE.MeshStandardMaterial({ color: 0xe68a00 }); // Darker Orange
        this.whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        this.eyeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.noseMat = new THREE.MeshStandardMaterial({ color: 0xff8a80 }); // Pinkish

        this.buildCat();
    }

    buildCat() {
        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), this.bodyMat);
        body.position.y = 0.6;
        body.castShadow = true;
        this.group.add(body);

        // Stripes
        for (let i = 0; i < 3; i++) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.82, 0.82), this.stripeMat);
            stripe.position.set(-0.3 + i * 0.3, 0.6, 0);
            this.group.add(stripe);
        }

        // Head
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), this.bodyMat);
        this.head.position.set(0.7, 1.1, 0);
        this.head.castShadow = true;
        this.group.add(this.head);

        // Ears
        const earGeo = new THREE.BoxGeometry(0.2, 0.3, 0.2);
        const earL = new THREE.Mesh(earGeo, this.bodyMat);
        earL.position.set(0.7, 1.5, 0.2);
        this.group.add(earL);

        const earR = new THREE.Mesh(earGeo, this.bodyMat);
        earR.position.set(0.7, 1.5, -0.2);
        this.group.add(earR);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const eyeL = new THREE.Mesh(eyeGeo, this.eyeMat);
        eyeL.position.set(1.05, 1.2, 0.2);
        this.group.add(eyeL);

        const eyeR = new THREE.Mesh(eyeGeo, this.eyeMat);
        eyeR.position.set(1.05, 1.2, -0.2);
        this.group.add(eyeR);

        // Nose
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.15), this.noseMat);
        nose.position.set(1.05, 1.05, 0);
        this.group.add(nose);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.2, 0.4, 0.2);
        const sockGeo = new THREE.BoxGeometry(0.22, 0.1, 0.22);
        this.legs = [];
        const legPositions = [
            [0.4, 0.2, 0.3], [0.4, 0.2, -0.3],
            [-0.4, 0.2, 0.3], [-0.4, 0.2, -0.3]
        ];

        legPositions.forEach(pos => {
            const leg = new THREE.Group();
            leg.position.set(...pos);

            const legMesh = new THREE.Mesh(legGeo, this.bodyMat);
            legMesh.position.y = 0; // Relative to group
            leg.add(legMesh);

            const sock = new THREE.Mesh(sockGeo, this.whiteMat);
            sock.position.y = -0.15;
            leg.add(sock);

            this.group.add(leg);
            this.legs.push(leg);
        });

        // Tail
        this.tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.15), this.bodyMat);
        this.tail.position.set(-0.9, 0.8, 0);
        this.tail.rotation.z = 0.5;
        this.group.add(this.tail);
    }

    animate(dt, state, elapsed) {
        // Reset previously applied rotations/positions to ensure clean state transitions
        this.group.rotation.x = 0;
        this.head.rotation.z = 0;
        this.legs.forEach(leg => {
            leg.rotation.x = 0;
            leg.rotation.z = 0;
        });

        // Idle bobbing
        if (state === 'idle') {
            this.group.position.y = Math.sin(elapsed * 0.003) * 0.05;
            this.head.rotation.z = Math.sin(elapsed * 0.002) * 0.1;
        }

        // Walking animation (simulated)
        if (state === 'walk') {
            this.group.position.y = Math.abs(Math.sin(elapsed * 0.01)) * 0.1;
            this.legs.forEach((leg, i) => {
                leg.rotation.z = Math.sin(elapsed * 0.01 + (i % 2) * Math.PI) * 0.5;
            });
        }

        // Play animation
        if (state === 'play') {
            this.group.position.y = Math.abs(Math.sin(elapsed * 0.008)) * 0.8 + 0.2; // Jump up and down
            this.group.rotation.x = Math.sin(elapsed * 0.005) * 0.5; // Pitch up and down
            this.head.rotation.z = Math.sin(elapsed * 0.01) * 0.2; // Head bop
            this.legs.forEach((leg, i) => {
                leg.rotation.x = Math.sin(elapsed * 0.015 + i) * 0.8; // Flailing legs
            });
        }

        // Sad animation
        if (state === 'sad') {
            this.head.rotation.z = -0.3; // Look down
            this.group.position.y = -0.05; // Slumped down slightly

            // Slow sad breathing
            this.group.scale.y = 1 + Math.sin(elapsed * 0.001) * 0.02;
            this.tail.rotation.z = Math.PI - 0.2; // Tail drooping
        } else {
            // Reset scale from breathing
            this.group.scale.y = 1;
            this.tail.rotation.z = 0.5; // Normal tail position
        }
    }

    setDirection(dir) {
        // dir 1: Right, -1: Left, 0: Front
        if (dir > 0) this.group.rotation.y = 0; // Face Right
        else if (dir < 0) this.group.rotation.y = Math.PI; // Face Left
        else if (dir === 0) this.group.rotation.y = -Math.PI / 2; // Face Front (Camera)
    }
}

window.CatModel = CatModel;
