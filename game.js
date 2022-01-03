import { Application } from "./engine/Application.js";

import { GLTFLoader } from "./engine/GLTFLoader.js";
import { Renderer } from "./engine/Renderer.js";

import { Physics } from "./Physics.js";

import { vec3, mat4 } from "./lib/gl-matrix-module.js";

const playerDefaults = {
  "aabb": {
    "min": [-1, -1, -1],
    "max": [1, 1, 1]
  },
  velocity: [0, 0, 0],
  maxSpeed: 20,
  friction: 0.8,
  acceleration: 20,
  time_left: 300,
  score: 0,
  ammo: 100,
  type: "player"
};

const fireWindowDefaults = {
  "aabb": {
    "min": [-2, -2.4, -0.1],
    "max": [2, 2.4, 0.1]
  },
  type: "fireWindow"
};

const windowDefaults = {
  "aabb": {
    "min": [-2, -2.4, -0.1],
    "max": [2, 2.4, 0.1]
  },
  type: "window"
};

const hydrantDefaults = {
  type: "hydrant"
};

const waterDefaults = {
  "aabb": {
    "min": [-0.5, -0.5, -0.5],
    "max": [0.5, 0.5, 0.5]
  },
  type: "bullet"
};

const houseDefaults = {
  "aabb": {
    "min": [-10, -10, -6],
    "max": [10, 15, 6]
  },
  type: "house"
};

class App extends Application {
  start() {
    this.time = Date.now();
    this.startTime = this.time;
    this.aspect = 1;

    this.keydownHandler = this.keydownHandler.bind(this);
    this.mousemoveHandler = this.mousemoveHandler.bind(this);
    this.keyupHandler = this.keyupHandler.bind(this);
    this.keys = {};
    this.mousedownHandler = this.mousedownHandler.bind(this);
    //this.mouseupHandler = this.mouseupHandler.bind(this);

    this.pointerlockchangeHandler = this.pointerlockchangeHandler.bind(this);
    document.addEventListener('pointerlockchange', this.pointerlockchangeHandler);
    this.focus = false;

    this.load("./models/brizgalna/brizgalna.gltf");

  }

  async load(uri) {
    this.loader = new GLTFLoader();
    await this.loader.load(uri);
    this.scene = await this.loader.loadScene(this.loader.defaultScene);
    this.camera = await this.loader.loadNode("Camera");
    //console.log(this.camera.translation)
    
    
    
    this.player = await this.loader.loadNode("Cev");
    
    this.player.addChild(this.camera);
    this.camera.translation[1] += 0.3;
    this.camera.translation[2] += 0.2;
    this.camera.updateMatrix();
    this.loader.setNode("Cev", playerDefaults);
    this.bullet = await this.loader.loadNode("Water")
    this.loader.setNode("Water", waterDefaults);
    
    console.log(this.player.type)

    this.hydrant = await this.loader.loadNode("FireHydrant");
    this.loader.setNode("FireHydrant", hydrantDefaults);

    this.window = await this.loader.loadNode("BigWindow");
    this.loader.setNode("BigWindow", windowDefaults);
    //console.log(this.window.translation)

    this.fireWindow = await this.loader.loadNode("BigWindowFire");
    this.loader.setNode("BigWindowFire", fireWindowDefaults);

    this.house = await this.loader.loadNode("House");
    this.loader.setNode("House", houseDefaults);

    if (!this.scene || !this.camera) {
      throw new Error("Scene or Camera not present in glTF");
    }

    if (!this.camera.camera) {
      throw new Error("Camera node does not contain a camera reference");
    }
    this.initLevel();

    this.physics = new Physics(this.scene);
    this.renderer = new Renderer(this.gl);
    this.renderer.prepareScene(this.scene);
    this.resize();
  }

  initLevel() {
    let win1 = this.window.clone();
    win1.translation = [6.5,0,6.5];
    win1.updateMatrix();
    
    let win2 = win1.clone();
    win2.translation = [-6.5,0,6.5];
    win2.updateMatrix();
    
    
    let h1 = this.house.clone();
    h1.translation[1] =10;
    h1.updateMatrix();
    h1.addChild(win1);
    h1.addChild(win2);

    let h2 = h1.clone();
    h2.translation[0] = 34;
    h2.updateMatrix();

    let h3 = h1.clone();
    h3.translation[2] = 34;
    h3.rotation[1] = Math.PI;
    h3.updateMatrix();

    let h4 = h2.clone();
    h4.translation[2] = 34;
    h4.rotation[1] = Math.PI;
    h4.updateMatrix();

    this.scene.addNode(h1);
    this.scene.addNode(h2);
    this.scene.addNode(h3);
    this.scene.addNode(h4);

    //console.log(win1)
  }

  update() {
    //player
    if (!this.player) return;
    const c = this.player;

    const t = (this.time = Date.now());
    const dt = (this.time - this.startTime) * 0.001;
    this.startTime = this.time;


    document.getElementById("score").innerHTML = "Točke: " + c.score;
    c.time_left -= dt;
    let m = Math.floor(c.time_left / 60);
    let s = Math.floor(c.time_left) % 60;
    if (s < 10) s = "0" + s;
    document.getElementById("time").innerHTML = "Preostali Čas: " + m + ":" + s;
    document.getElementById("ammo").innerHTML = "Rezervuar z vodo: " + Math.floor(c.ammo);



    const forward = vec3.set(
      vec3.create(),
      -Math.sin(c.rotation[1]),
      0,
      -Math.cos(c.rotation[1])
    );
    const right = vec3.set(
      vec3.create(),
      Math.cos(c.rotation[1]),
      0,
      -Math.sin(c.rotation[1])
    );

    // 1: add movement acceleration
    let acc = vec3.create();
    if (this.keys["KeyW"]) {
      vec3.add(acc, acc, forward);
    }
    if (this.keys["KeyS"]) {
      vec3.sub(acc, acc, forward);
    }
    if (this.keys["KeyD"]) {
      vec3.add(acc, acc, right);
    }
    if (this.keys["KeyA"]) {
      vec3.sub(acc, acc, right);
    }

    // 2: update velocity
    vec3.scaleAndAdd(c.velocity, c.velocity, acc, dt * c.acceleration);

    // 3: if no movement, apply friction
    if (
      !this.keys["KeyW"] &&
      !this.keys["KeyS"] &&
      !this.keys["KeyD"] &&
      !this.keys["KeyA"]
    ) {
      vec3.scale(c.velocity, c.velocity, 1 - c.friction);
    }

    // 4: limit speed
    const len = vec3.len(c.velocity);
    if (len > c.maxSpeed) {
      vec3.scale(c.velocity, c.velocity, c.maxSpeed / len);
    }

    //shotting
    if (c.left_click) {
      if (c.ammo >= 1) {
        c.ammo--;

        let bullet_clone = this.bullet.clone();
        bullet_clone.translation = vec3.add(vec3.create(), c.translation.slice(), vec3.set(vec3.create(), -Math.sin(c.rotation[1])*5 , Math.sin(c.rotation[0]) , -Math.cos(c.rotation[1])*5 ));

        let speed = 30;
        const forward = vec3.set(vec3.create(), -Math.sin(c.rotation[1]) * speed, Math.sin(c.rotation[0]) * speed, -Math.cos(c.rotation[1]) * speed);
        bullet_clone.velocity = forward;
        bullet_clone.bullet = true;
        bullet_clone.aabb = this.bullet.aabb;
        this.scene.addNode(bullet_clone);
      }
      c.left_click = false;
    }

    //this.burnHouses();

    if (this.physics) {
      this.physics.update(dt);
    }
  }

  burnHouses() {
    let count_fires = 0;
    this.scene.traverse((node) => {
      if (node.type = "fireWindow")
        count_fires++;
    });
    //console.log(count_fires)
    if (count_fires < 2)
      while (count_fires < 2) {
        this.scene.traverse((node) => {
          if (node.type == "window") {
            //console.log("Window!")
            let translation = vec3.clone(node.translation);

            let node1 = this.fireWindow.clone();
            node1.translation = translation;
            node1.fireWindow = true;
            node1.updateMatrix();

            let i = this.scene.nodes.indexOf(node);
            this.scene.nodes.splice(i, 1)
            this.scene.addNode(node1);
            return;
          }
          count_fires++;
        });
      }
  }

  render() {
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const aspectRatio = w / h;

    if (this.camera) {
      this.camera.camera.aspect = aspectRatio;
      this.camera.camera.updateMatrix();
    }
  }

  keydownHandler(e) {
    this.keys[e.code] = true;
  }

  keyupHandler(e) {
    this.keys[e.code] = false;
  }

  mousedownHandler(e) {
    switch (e.which) {
      case 1:
        this.player.left_click = true;
        console.log("Fire!!")
        break;
    }
  }

  enable() {
    document.addEventListener("mousemove", this.mousemoveHandler);
    document.addEventListener("keydown", this.keydownHandler);
    document.addEventListener("keyup", this.keyupHandler);

    document.addEventListener("mousedown", this.mousedownHandler);
    document.addEventListener("mouseup", this.mouseupHandler);

    //this.canvas.removeAttribute("onclick");
  }

  disable() {
    //console.log("Disabling...")
    document.removeEventListener("mousemove", this.mousemoveHandler);
    document.removeEventListener("keydown", this.keydownHandler);
    document.removeEventListener("keyup", this.keyupHandler);

    document.removeEventListener("mousedown", this.mousedownHandler);
    document.removeEventListener("mouseup", this.mouseupHandler);

    for (let key in this.keys) {
      this.keys[key] = false;
    }
    this.focus = false;
  }

  enableCamera() {
    if (!this.focus) {
      this.focus = true;
      this.canvas.requestPointerLock();
    }
  }

  pointerlockchangeHandler() {
    if (!this.camera) {
      return;
    }

    if (document.pointerLockElement === this.canvas) {
      this.enable();
    } else {
      this.disable();
    }
  }

  mousemoveHandler(e) {

    const c = this.player;
    const mouseSensitivity = 0.002;
    const dx = e.movementX;
    const dy = e.movementY;

    c.rotation[0] -= dy * mouseSensitivity;
    c.rotation[1] -= dx * mouseSensitivity;

    const pi = Math.PI;
    const twopi = pi * 2;
    const halfpi = pi / 2;

    if (c.rotation[0] > halfpi) {
      c.rotation[0] = halfpi;
    }
    if (c.rotation[0] < -halfpi) {
      c.rotation[0] = -halfpi;
    }

    c.rotation[1] = ((c.rotation[1])) % twopi;

  }

}

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector("canvas");
  const app = new App(canvas);
  canvas.onclick = function () {
    app.enableCamera()
  }
});
