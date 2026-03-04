/**
 * threeScene.js - Handles the 3D environment setup
 */
class ThreeScene {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf9fbe7); // Pastel yellow

        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Fog
        this.scene.fog = new THREE.Fog(0xf9fbe7, 5, 15);

        // Ground
        const groundGeo = new THREE.PlaneGeometry(20, 20);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0xe1f5fe }); // Light blue
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        this.cameraTargetPos = new THREE.Vector3(0, 2, 5);
        this.cameraTargetLook = new THREE.Vector3(0, 0, 0);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setCameraView(pos, lookAt) {
        this.cameraTargetPos.set(...pos);
        this.cameraTargetLook.set(...lookAt);
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    render() {
        // Smooth Camera Transition
        this.camera.position.lerp(this.cameraTargetPos, 0.05);
        this.camera.lookAt(this.cameraTargetLook);

        this.renderer.render(this.scene, this.camera);
    }
}

window.ThreeScene = ThreeScene;
