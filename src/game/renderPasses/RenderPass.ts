import { Pass } from "three/examples/jsm/Addons.js";

export class RenderPass extends Pass {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }


}