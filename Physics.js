import { vec3, mat4 } from "./lib/gl-matrix-module.js";

export class Physics {
  constructor(scene) {
    this.scene = scene;
  }

  delNode(node) {
    let i = this.scene.nodes.indexOf(node);
    this.scene.nodes.splice(i, 1)
  }

  update(dt) {
    this.scene.traverse((node) => {
      if (node.velocity) {
        //node.getGlobalTransform();

        //temporary for object placement
        if(node.player){
          if(node.velocity[0] >0){
            //console.log(node.translation[0])
          }
        }

        this.limitPlayArea(node,dt);

        //move
        vec3.scaleAndAdd(node.translation, node.translation, node.velocity, dt);

        //collision checks
        this.scene.traverse((other) => {
          if(node.aabb && other.aabb && node !== other && node.bullet){
            console.log(node,other)
            this.resolveCollision(node, other)
          }
          
          //refill water
          if (other.hydrant && node.player) {
            this.refillWater(node,other,dt);
          }
          else if (node !== other && node.children.length == 0 && other.children.length == 0) {

            let x = vec3.distance(node.translation, other.translation)
            if (x < 5) {
              this.delNode(node);
            }

          }
        });
        node.updateMatrix();
      }

    });
  }

  limitPlayArea(node,dt){
        //limit space
        let tmp = vec3.scaleAndAdd(vec3.create(), node.translation, node.velocity, dt);

        if (tmp[0] < -60 || tmp[0] > 63) {
          if (node.children.length > 0 && node.children[0].camera)
            node.velocity[0] = 0
          else
            this.delNode(node)
        };
        if (tmp[2] < -60 || tmp[2] > 63) {
          if (node.children.length > 0 && node.children[0].camera)
            node.velocity[2] = 0
          else
            this.delNode(node)
        }
  }

  refillWater(node,other,dt){
    let x = vec3.distance(node.translation, other.translation)
    if (x < 12) {
      node.ammo += dt*5;
      if (node.ammo > 100) node.ammo = 100;
    }
  }

  intervalIntersection(min1, max1, min2, max2) {
    return !(min1 > max2 || min2 > max1);
  }

  aabbIntersection(aabb1, aabb2) {
    return (
      this.intervalIntersection(
        aabb1.min[0],
        aabb1.max[0],
        aabb2.min[0],
        aabb2.max[0]
      ) &&
      this.intervalIntersection(
        aabb1.min[1],
        aabb1.max[1],
        aabb2.min[1],
        aabb2.max[1]
      ) &&
      this.intervalIntersection(
        aabb1.min[2],
        aabb1.max[2],
        aabb2.min[2],
        aabb2.max[2]
      )
    );
  }

  resolveCollision(a, b) {
    // Update bounding boxes with global translation.
    //console.log(a.aabb, b.aabb)

    const ta = a.getGlobalTransform();
    const tb = b.getGlobalTransform();

    const posa = mat4.getTranslation(vec3.create(), ta);
    const posb = mat4.getTranslation(vec3.create(), tb);

    const mina = vec3.add(vec3.create(), posa, a.aabb.min);
    const maxa = vec3.add(vec3.create(), posa, a.aabb.max);
    const minb = vec3.add(vec3.create(), posb, b.aabb.min);
    const maxb = vec3.add(vec3.create(), posb, b.aabb.max);

    // Check if there is collision.
    const isColliding = this.aabbIntersection(
      {
        min: mina,
        max: maxa,
      },
      {
        min: minb,
        max: maxb,
      }
    );

    if (!isColliding) {
      return;
    }

    if(a.bullet && !b.bullet){
      this.delNode(a);
      console.log("Bullet destroyed");
      console.log(a,b)
    }


    /* console.log("Here")
    // Move node A minimally to avoid collision.
    const diffa = vec3.sub(vec3.create(), maxb, mina);
    const diffb = vec3.sub(vec3.create(), maxa, minb);

    let minDiff = Infinity;
    let minDirection = [0, 0, 0];
    if (diffa[0] >= 0 && diffa[0] < minDiff) {
      minDiff = diffa[0];
      minDirection = [minDiff, 0, 0];
    }
    if (diffa[1] >= 0 && diffa[1] < minDiff) {
      minDiff = diffa[1];
      minDirection = [0, minDiff, 0];
    }
    if (diffa[2] >= 0 && diffa[2] < minDiff) {
      minDiff = diffa[2];
      minDirection = [0, 0, minDiff];
    }
    if (diffb[0] >= 0 && diffb[0] < minDiff) {
      minDiff = diffb[0];
      minDirection = [-minDiff, 0, 0];
    }
    if (diffb[1] >= 0 && diffb[1] < minDiff) {
      minDiff = diffb[1];
      minDirection = [0, -minDiff, 0];
    }
    if (diffb[2] >= 0 && diffb[2] < minDiff) {
      minDiff = diffb[2];
      minDirection = [0, 0, -minDiff];
    }

    vec3.add(a.translation, a.translation, minDirection);
    a.updateTransform(); */
  }
}
