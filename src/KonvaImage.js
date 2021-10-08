
import Konva from "konva";

class KonvaImage {

  constructor(konvaNode, id) {

    this.id = id;
    this.konvaNode = konvaNode;

  }

  changeImage() {

    

  }

  on(evtStr, evtHandler) {
    this.konvaNode.on(evtStrg, evtHandler);
  }

}

export default KonvaImage;
