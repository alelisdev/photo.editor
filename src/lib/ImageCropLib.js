
import CanvasLib from "./CanvasLib.js";

class ImageCropLib {

  static cropImageInLayer(layerCanvas, cropData) {

    var oldBoundingBox = this.getNontransparentBoundingBox(layerCanvas);

    if (!this.boundingBoxesOverlap(oldBoundingBox, cropData)) return false;

    var croppedLayer = this.cropImage(layerCanvas, cropData);

    var newBoundingBox = this.getNontransparentBoundingBox(croppedLayer);

    var croppedImage = this.cropImage(croppedLayer, newBoundingBox);

    return {
      croppedImage: croppedImage,
      afterCropBoundingBox: newBoundingBox,
      beforeCropBoundingBox: oldBoundingBox
    };

  }

  static cropImage(canvasImage, cropData) {

    var ctx = canvasImage.getContext("2d");

    var imageData = ctx.getImageData(cropData.x, cropData.y, cropData.width, cropData.height);

    var clonedCanvas = CanvasLib.cloneCanvas(canvasImage);

    clonedCanvas.width = cropData.width;
    clonedCanvas.height = cropData.height;

    clonedCanvas.getContext("2d").putImageData(imageData, 0, 0);

    return clonedCanvas;

  }

  static getNontransparentBoundingBox(canvasImage) {

    var imageData = canvasImage.getContext("2d").getImageData(0, 0, canvasImage.width, canvasImage.height);

    var leftX = imageData.width;
    var rightX = 0;
    var topY = imageData.height;
    var bottomY = 0;

    var previousIndex = 0;

    for (var y = 0; y < imageData.height; y++) {

      for (var x = 0; x < imageData.width; x++) {

        var index = (3 + y * imageData.width * 4 + (x * 4));

        var alpha = imageData.data[index];

        if (alpha > 0) {
          if (x < leftX) leftX = x;
          if (x > rightX) rightX = x;
          if (y < topY) topY = y;
          if (y > bottomY) bottomY = y;
        }
      }
    }

    return {
      x: leftX,
      y: topY,
      width: rightX - leftX + 1,
      height: bottomY - topY + 1
    }

  }

  static boundingBoxesOverlap(boundaryBox1, boundaryBox2) {

    if (boundaryBox1.x + boundaryBox1.width <= boundaryBox2.x) {
      return false;
    }

    if (boundaryBox1.y + boundaryBox1.height <= boundaryBox2.y) {
      return false;
    }

    return true;

  }

}

export default ImageCropLib;
