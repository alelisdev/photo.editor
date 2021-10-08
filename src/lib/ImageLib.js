
import Jimp from "jimp/es";
import CanvasLib from "./CanvasLib.js";

class ImageLib {

  static async bufferToImage(buffer) {

    var image = await Jimp.read(buffer);

    var imageData = new ImageData(Uint8ClampedArray.from(image.bitmap.data), image.bitmap.width);

    var tempCanvas = CanvasLib.canvasFromImageData(imageData);

    return await this.canvasToImage(tempCanvas);

  }

  static canvasToImage(canvas) {

    var imageObj = new Image(canvas.width, canvas.height);
    imageObj.src = canvas.toDataURL();

    return new Promise((resolve, reject) => {
      imageObj.onload = () => {
        resolve(imageObj);
      }
    });
  }

}

export default ImageLib;
