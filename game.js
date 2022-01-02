import { Application } from "./engine/Application.js";

import { GLTFLoader } from "./engine/GLTFLoader.js";
import { Renderer } from "./engine/Renderer.js";

import { Physics } from "./Physics.js";

import { vec3, mat4 } from "./lib/gl-matrix-module.js";

const carDefaults = {
  velocity: [0, 0, 0],
  maxSpeed: 20,
  friction: 0.8,
  acceleration: 20,
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
    this.mouseupHandler = this.mouseupHandler.bind(this);

    this.pointerlockchangeHandler = this.pointerlockchangeHandler.bind(this);
    document.addEventListener('pointerlockchange', this.pointerlockchangeHandler);
    this.focus = false;

    this.load("./models/brizgalna/brizgalna.gltf");


  }

  enableCamera() {
    if(!this.focus){
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

  async load(uri) {
    this.loader = new GLTFLoader();
    await this.loader.load(uri);
    this.scene = await this.loader.loadScene(this.loader.defaultScene);
    this.camera = await this.loader.loadNode("Camera");

    this.bullet = await this.loader.loadNode("POV")
    this.physics = new Physics(this.scene, this.bullet);

    this.car = await this.loader.loadNode("Hoop");
    //this.car.rotation = [1,0,0,1];
    this.car.addChild(this.camera);
    //this.camera.translation = [0 , 10, 10];
    //this.camera.updateMatrix();
    //console.log(this.car.rotation)
    /* this.car.rotation = [0,0,0,1];
    this.camera.rotation = [0,0,0,1];
    this.camera.updateMatrix(); */

    this.loader.setNode("Hoop", carDefaults);

    if (!this.scene || !this.camera) {
      throw new Error("Scene or Camera not present in glTF");
    }

    if (!this.camera.camera) {
      throw new Error("Camera node does not contain a camera reference");
    }

    this.renderer = new Renderer(this.gl);
    this.renderer.prepareScene(this.scene);
    this.resize();
  }

  mousemoveHandler(e) {

    const c = this.car;
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

    c.rotation[1] = ((c.rotation[1] ))% twopi;

  }

  update() {
    const t = (this.time = Date.now());
    const dt = (this.time - this.startTime) * 0.001;
    this.startTime = this.time;

    //car
    if (!this.car) return;

    const c = this.car;

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

    if (this.physics) {
      this.physics.update(dt);
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

  mousedownHandler(e){
    switch(e.which){
      case 1: 
        this.car.left_click = true;
        console.log("Fire!!")
        break;
    }
  }

  mouseupHandler(e){
    switch(e.which){
      case 1: 
        this.car.left_click = false;
        console.log("No Fire!!")
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

}

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector("canvas");
  const app = new App(canvas);
  canvas.onclick = function(){
    app.enableCamera()
  }
});
