

class CanvasLib {

  static cloneCanvas(originalCanvas) {
    var canvas = document.createElement("canvas");
    canvas.width = originalCanvas.width;
    canvas.height = originalCanvas.height;
    canvas.transform = originalCanvas.transform;

    canvas.getContext("2d").drawImage(originalCanvas, 0, 0);

    return canvas;
  }

  static cloneImageData(originalImageData) {
    return new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    )
  }

  static copyCanvasProperties(originalCanvas, targetCanvas) {
    targetCanvas.width = originalCanvas.width;
    targetCanvas.height = originalCanvas.height;
    targetCanvas.style.transform = originalCanvas.style.transform;
  }

  // #deprecated
  static canvasFromImageData(imageData) {
    var canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext("2d").putImageData(imageData, 0, 0);
    return canvas;
  }

  static rotateCanvas(canvas) {

    var canvasCtx = canvas.getContext("2d");

    var tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    tempCanvas.getContext("2d").drawImage(canvas, 0, 0);

    canvas.height = canvas.width;
    canvas.width = tempCanvas.height;

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.save();
    canvasCtx.translate(canvas.width / 2, canvas.height / 2)
    canvasCtx.rotate(90 * Math.PI / 180);
    canvasCtx.translate(canvas.width / -2, canvas.height / -2)
    canvasCtx.drawImage(tempCanvas, (tempCanvas.height - tempCanvas.width) / 2, (tempCanvas.width - tempCanvas.height) / 2);
    canvasCtx.restore();

  }

  static rotateCanvasSize(canvas) {

    var canvasCtx = canvas.getContext("2d");

    var tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    tempCanvas.getContext("2d").drawImage(canvas, 0, 0);

    canvas.height = canvas.width;
    canvas.width = tempCanvas.height;

    canvasCtx.drawImage(tempCanvas, (tempCanvas.height - tempCanvas.width) / 2, (tempCanvas.width - tempCanvas.height) / 2);

  }

  // #deprecated
  static getCroppedCanvas(cropData, canvas) {

    var ctx = canvas.getContext("2d");

    var croppedImageData = ctx.getImageData(cropData.x, cropData.y, cropData.width, cropData.height);

    var croppedCanvas = canvas;
    croppedCanvas.width = cropData.width;
    croppedCanvas.height = cropData.height;
    croppedCanvas.id = canvas.id;

    ctx = croppedCanvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(croppedImageData, 0, 0);

    return croppedCanvas;

  }



}

export default CanvasLib;
