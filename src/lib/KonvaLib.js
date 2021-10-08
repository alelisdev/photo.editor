
import Konva from "konva";
import ImageCropLib from "./ImageCropLib.js";

class KonvaLib {

  constructor(options, callback) {


    var isFillPatternSupported = async (fillPatternUrl, stage) => {

      var fillImage = new Image("background-3000px.png", 3000, 3000);
      fillImage.src = fillPatternUrl;

      return new Promise((resolve) => {
        fillImage.onload = () => {

          try {
            var layer = new Konva.Layer();

            stage.add(layer);

            var image = new Konva.Image({
              image: fillImage,
              width: options.width,
              height: options.height
            });

          } catch (e) {
            resolve(false)
          }

          resolve(true);
        }
      });

    }

    this.initialScale = options.initialScale;
    this.initialOptions = options;
    this.options = options;

    var fillPatternBase64Url = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAARUlEQVRYhe3VsQkAMAwDQSVkIO0/hTdShlAgzat/OHDhlSQqNjNNrl3VDwYAAAAAAAAAOO0/t131nAAAAAAAAAD4C5B0ARR5Ca7CHgmpAAAAAElFTkSuQmCC`

    /*
    var fillImage = new Image("background-3000px.png", 3000, 3000);
    fillImage.src = "background-3000px.png"; */

    var fillImage = new Image(fillPatternBase64Url, 32, 32);
    fillImage.src = fillPatternBase64Url;

    this.stage = new Konva.Stage({
      container: options.containerId,
      width: options.width,
      height: options.height
    });

    this.transformersStage = new Konva.Stage({
      container: options.transformersContainerId,
      width: options.width,
      height: options.height
    });

    //var fillPatternSupported = await isFillPatternSupported(fillPatternBase64Url, this.stage);

    fillImage.onload = () => {

      var backgroundLayer = new Konva.Layer();
      this.backgroundLayer = backgroundLayer;

      this.stage.add(backgroundLayer);

      var backgroundTileImage = new Konva.Image({
        fillPatternImage: fillImage,
        width: options.width,
        height: options.height
      });

      var colorBackgroundImage = new Konva.Image({
        fillColor: "rgba(0,0,0,0)",
        width: options.width,
        height: options.height
      });

      backgroundLayer.add(backgroundTileImage);
      backgroundLayer.add(colorBackgroundImage);

      //this.imagesCroppingLayer = new Konva.Layer();

      this.imagesLayer = new Konva.Layer();
      //this.imagesCroppingLayer.add(this.imagesLayer);
      this.stage.add(this.imagesLayer);

      this.imagesLayer.zIndex(1);

      this.imagesLayer.offsetX(options.width / 2);
      this.imagesLayer.offsetY(options.height / 2);

      this.imagesLayer.x(options.width / 2);
      this.imagesLayer.y(options.height / 2);

      this.imagesLayerRotation = 0;

      var mainLayer = new Konva.Layer();

      this.stage.add(mainLayer);
      this.mainLayer = mainLayer;

      mainLayer = new Konva.Layer();

      this.transformersStage.add(mainLayer);
      this.transformersStageMainLayer = mainLayer;

      this.mainLayer.zIndex(2);

      this.transformersStageMainLayer.offsetX(options.width / 2);
      this.transformersStageMainLayer.offsetY(options.height / 2);

      this.transformersStageMainLayer.x(options.width / 2);
      this.transformersStageMainLayer.y(options.height / 2);

      try {
        this.stage.draw();
      } catch (e) {
        // Firefox 63 crashes when we try to use Konva.Image with a fillPattern
        fillImage.src = "background-3000px.png";
        backgroundTileImage.fillPatternImage("");
        fillImage.onload = () => {
          backgroundTileImage.image(fillImage);
          this.stage.draw();
        }
      }

      this.stage.draw();
      this.transformersStage.draw();

      this.backgroundImage = backgroundTileImage;
      this.colorBackgroundImage = colorBackgroundImage;
      this.backgroundImageColor = "transparent";

      // transformers won't update for some reason unless we update constantly
      var timeout;
      this.stage.on("mousemove", (e) => {

        if (timeout) {
          window.cancelAnimationFrame(timeout);
        }

        timeout = window.requestAnimationFrame(() => {

          // if an image has been deleted and brought back with redo, one of the transformers won't update on its own any longer
          this.updateTransformers(this.mainLayer);

          this.stage.batchDraw();
          this.transformersStage.batchDraw();
        });
      });

      var timeout2;
      this.transformersStage.on("mousemove", (e) => {
        if (timeout2) {
          window.cancelAnimationFrame(timeout2);
        }

        timeout2 = window.requestAnimationFrame(() => {

          // if an image has been deleted and brought back with redo, one of the transformers won't update on its own any longer
          this.updateTransformers(this.mainLayer);

          this.stage.batchDraw();
          this.transformersStage.batchDraw();
        })
      });

      var timeout3;
      this.stage.on("dragmove", (e) => {
        if (timeout3) {
          window.cancelAnimationFrame(timeout3);
        }

        timeout3 = window.requestAnimationFrame(() => {

          // if an image has been deleted and brought back with redo, one of the transformers won't update on its own any longer
          this.updateTransformers(this.mainLayer);

          this.stage.batchDraw();
          this.transformersStage.batchDraw();
        })
      });

      callback();

    }

  }

  setBackgroundColor(rgbaString) {
    this.colorBackgroundImage.fill(rgbaString);
    this.stage.batchDraw();
  }

  createImageTransformer(image) {
    var transformer = new Konva.Transformer({
      nodes: [image],
      rotateAnchorOffset: 60,
      borderStroke: "rgb(0 149 255)",
      anchorStroke: "rgb(0 149 255)",
      borderStrokeWidth: 1,
      rotationSnaps: [0, 90, 180, 270],
      anchorSize: Math.max(4, image.height() / 12),
      anchorCornerRadius: Math.max(4, image.height() / 12),
      anchorStrokeWidth: this.initialScale ? 4 / this.initialScale : 4,
      borderStrokeWidth: this.initialScale ? 4 / this.initialScale : 4,
      anchorFill: "rgba(255, 255, 255, 0.5)",
      rotateAnchorOffset: Math.max(4 * 2, image.height() / 12 * 2)
    });

    return transformer;
  }

  getImageNodes() {
    var imageNodes = [];
    for (var i = 0; i < this.imagesLayer.getChildren().length; i++) {
      imageNodes.push(this.imagesLayer.getChildren()[i]);
    }
    return imageNodes;
  }

  transformerIsTransforming() {

    var transformers = this.mainLayer.getChildren();
    var overlayTransformers = this.transformersStageMainLayer.getChildren();

    for (var i = 0; i < transformers.length; i++) {
      var transformer = transformers[i];
      var overlayTransformer = overlayTransformers[i];
      if (transformer.isTransforming() || overlayTransformer.isTransforming()) return true;
    }

    return false;

  }

  addDefaultImageDragBoundFuncs(image) {

    image.dragBoundFunc((pos) => {

      if (image.rotation() >= 360) {
        image.rotation(image.rotation() - 360);
      }

      var rotation = parseFloat(image.rotation().toFixed(8));

      if (this.options.snapToEdges) {
        if (rotation === 0) {
          // left edge snap
          if (pos.x < 10 && pos.x > -10) {
            pos.x = 0;
          }
          // top edge snap
          if (pos.y < 10 && pos.y > -10) {
            pos.y = 0;
          }
          // right edge snap
          if (pos.x + image.width() * image.getAbsoluteScale().x + 10 > this.stage.width() &&
              pos.x + image.width() * image.getAbsoluteScale().x - 10 < this.stage.width()) {
            pos.x = this.stage.width() - image.width() * image.getAbsoluteScale().x;
          }
          // bottom edge snap
          if (pos.y + image.height() * image.getAbsoluteScale().y + 10 > this.stage.height() &&
              pos.y + image.height() * image.getAbsoluteScale().y - 10 < this.stage.height()) {
            pos.y = this.stage.height() - image.height() * image.getAbsoluteScale().y;
          }
          // right edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.x + image.width() * image.getAbsoluteScale().x > this.stage.width() + image.width() * image.getAbsoluteScale().x - 10) {
            pos.x = this.stage.width() - 10;
          }
          // bottom edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.y + image.height() * image.getAbsoluteScale().y > this.stage.height() + image.height() * image.getAbsoluteScale().y - 10) {
            pos.y = this.stage.height() - 10;
          }
          // left edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.x < image.width() * image.getAbsoluteScale().x * -1 + 10) {
            pos.x = image.width() * image.getAbsoluteScale().x * -1 + 10;
          }
          // top edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.y < image.height() * image.getAbsoluteScale().y * -1 + 10) {
            pos.y = image.height() * image.getAbsoluteScale().y * -1 + 10;
          }

          return pos;
        }

        if (rotation === 90 || rotation === -270) {
          // left edge snap
          if (pos.x - image.height() * image.getAbsoluteScale().y < 10 && pos.x - image.height() * image.getAbsoluteScale().y > -10) {
            pos.x = image.height() * image.getAbsoluteScale().y;
          }
          // top edge snap
          if (pos.y < 10 && pos.y > -10) {
            pos.y = 0;
          }
          // right edge snap
          if (pos.x + 10 > this.stage.width() &&
              pos.x - 10 < this.stage.width()) {
            pos.x = this.stage.width();
          }
          // bottom edge snap
          if (pos.y + image.width() * image.getAbsoluteScale().x + 10 > this.stage.height() &&
              pos.y + image.width() * image.getAbsoluteScale().x - 10 < this.stage.height()) {
            pos.y = this.stage.height() - image.width() * image.getAbsoluteScale().x;
          }
          // right edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.x > this.stage.width() + image.height() * image.getAbsoluteScale().y - 10) {
            pos.x = this.stage.width() + image.height() * image.getAbsoluteScale().y - 10;
          }
          // bottom edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.y > this.stage.height() - 10) {
            pos.y = this.stage.height() - 10;
          }
          // left edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.x < 10) {
            pos.x = 10;
          }
          // top edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.y < image.height() * image.getAbsoluteScale().y * -1 + 10) {
            pos.y = image.height() * image.getAbsoluteScale().y * -1 + 10;
          }

          return pos;

        }

        if (rotation === 180 || rotation === -180) {

          // left edge snap
          if (pos.x - image.width() * image.getAbsoluteScale().x < 10 && pos.x - image.width() * image.getAbsoluteScale().x > -10) {
            pos.x = image.width() * image.getAbsoluteScale().x;
          }
          // top edge snap
          if (pos.y - image.height() * image.getAbsoluteScale().y < 10 && pos.y - image.height() * image.getAbsoluteScale().y > -10) {
            pos.y = image.height() * image.getAbsoluteScale().y;
          }
          // right edge snap
          if (pos.x + 10 > this.stage.width() &&
              pos.x - 10 < this.stage.width()) {
            pos.x = this.stage.width();
          }
          // bottom edge snap
          if (pos.y + 10 > this.stage.height() &&
              pos.y - 10 < this.stage.height()) {
            pos.y = this.stage.height();
          }
          // right edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.x > this.stage.width() + image.height() * image.getAbsoluteScale().y - 10) {
            pos.x = this.stage.width() + image.height() * image.getAbsoluteScale().y - 10;
          }
          // bottom edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.y > this.stage.height() + image.height() * image.getAbsoluteScale().y - 10) {
            pos.y = this.stage.height() + image.height() * image.getAbsoluteScale().y - 10;
          }
          // left edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.x < 10) {
            pos.x = 10;
          }
          // top edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.y < 10) {
            pos.y = 10;
          }

          return pos;
        }

        if (rotation === 270 || rotation === -90) {

          // left edge snap
          if (pos.x < 10 && pos.x > -10) {
            pos.x = 0;
          }
          // top edge snap
          if (pos.y - image.width() * image.getAbsoluteScale().x < 10 && pos.y - image.width() * image.getAbsoluteScale().x > -10) {
            pos.y = image.width() * image.getAbsoluteScale().x;
          }
          // right edge snap
          if (pos.x + image.height() * image.getAbsoluteScale().y + 10 > this.stage.width() &&
              pos.x + image.height() * image.getAbsoluteScale().y - 10 < this.stage.width()) {
            pos.x = this.stage.width() - image.height() * image.getAbsoluteScale().y;
          }
          // bottom edge snap
          if (pos.y + 10 > this.stage.height() &&
              pos.y - 10 < this.stage.height()) {
            pos.y = this.stage.height();
          }
          // right edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.x > this.stage.width() - 10) {
            pos.x = this.stage.width() - 10;
          }
          // bottom edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.y > this.stage.height() + image.height() * image.getAbsoluteScale().y - 10) {
            pos.y = this.stage.height() + image.height() * image.getAbsoluteScale().y - 10;
          }
          // left edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.x < image.height() * image.getAbsoluteScale().y * -1 + 10) {
            pos.x = image.height() * image.getAbsoluteScale().y * -1 + 10;
          }
          // top edge prevent image from going outside the canvas, at least 10px width/height of image will be visible on canvas
          if (pos.y < 10) {
            pos.y = 10;
          }

          return pos;
        }
      }

      return pos;

    });
  }

  addDefaultTransformerBoundFuncs(image, transformer, overlayTransformer) {

    var boundingFunc = (oldBox, newBox) => {

      var image = transformer.nodes()[0];

      console.log(image.width() * image.getAbsoluteScale().x, newBox.width)

      // no bounding actions when not adjusting size
      if (oldBox.width === newBox.width && oldBox.height === newBox.height) return newBox;

      if (image.rotation() >= 360) {
        image.rotation(image.rotation() - 360);
      }

      var rotation = parseFloat(image.rotation().toFixed(8));

      // no bounding actions when not at a right angle
      if (rotation % 90 !== 0) return newBox;

      if ((oldBox.width / oldBox.height).toFixed(5) === (newBox.width / newBox.height).toFixed(5)) {
        var aspectRatioLocked = true;
        var aspectRatio = oldBox.height / oldBox.width;
      } else {
        var aspectRatioLocked = false;
      }

      if (this.options.snapToEdges) {
        if (rotation === 0) {

          // right edge snap
          if (newBox.x + newBox.width + 10 > this.stage.width() &&
              newBox.x + newBox.width - 10 < this.stage.width()) {
            let oldWidth = newBox.width;
            newBox.width = this.stage.width() - newBox.x + 1;
            if (aspectRatioLocked) {
              newBox.height += (newBox.width - oldWidth) * aspectRatio;
            }
          }
          // bottom edge snap
          if (newBox.y + newBox.height + 10 > this.stage.height() &&
              newBox.y + newBox.height - 10 < this.stage.height()) {
            let oldHeight = newBox.height;
            newBox.height = this.stage.height() - newBox.y + 1;
            if (aspectRatioLocked) {
              newBox.width += (newBox.height - oldHeight) / aspectRatio;
            }
          }
          // left edge snap
          if (newBox.x < 10 && newBox.x > -10) {
            let widthChange = newBox.x + 1;
            newBox.width += widthChange;
            newBox.x = -1;
            if (aspectRatioLocked) {
              newBox.height += widthChange * aspectRatio;
              newBox.y -= widthChange * aspectRatio;
            }
          }
          // top edge snap
          if (newBox.y < 10 && newBox.y > -10) {
            newBox.height += newBox.y + 1;
            let oldY = newBox.y;
            newBox.y = -1;
            if (aspectRatioLocked) {
              newBox.width += (oldY + 1) / aspectRatio;
            }
          }

        }

        if (rotation === 90 || rotation === -270) {

          // right edge snap
          if (newBox.x + 10 > this.stage.width() &&
              newBox.x - 10 < this.stage.width()) {
            let oldHeight = newBox.height;
            newBox.height += this.stage.width() - newBox.x + 1;
            newBox.x = this.stage.width() + 1;
            if (aspectRatioLocked) {
              newBox.width += (newBox.height - oldHeight) / aspectRatio;
            }
          }
          // bottom edge snap
          if (newBox.y + newBox.width + 10 > this.stage.height() &&
              newBox.y + newBox.width - 10 < this.stage.height()) {
            let oldWidth = newBox.width;
            newBox.width = this.stage.height() - newBox.y + 1;
            if (aspectRatioLocked) {
              newBox.height += (newBox.width - oldWidth) * aspectRatio;
            }
          }
          // left edge snap
          if (newBox.height - newBox.x < 10 &&
              newBox.height - newBox.x > -10) {
            let oldHeight = newBox.height;
            newBox.height = newBox.x + 1;
            if (aspectRatioLocked) {
              newBox.width += (newBox.height - oldHeight) / aspectRatio;
            }
          }
          // top edge snap
          if (newBox.y < 10 && newBox.y > -10) {
            let oldWidth = newBox.width;
            newBox.width += newBox.y + 1
            newBox.y = -1;
            if (aspectRatioLocked) {
              newBox.height += (newBox.width - oldWidth) * aspectRatio;
            }
          }

        }

        if (rotation === 180 || rotation === -180) {

          // right edge snap
          if (newBox.x + 10 > this.stage.width() &&
              newBox.x - 10 < this.stage.width()) {
            let oldWidth = newBox.width;
            newBox.width += this.stage.width() - newBox.x + 1;
            newBox.x = this.stage.width() + 1;
            if (aspectRatioLocked) {
              newBox.height += (newBox.width - oldWidth) * aspectRatio;
            }
          }
          // bottom edge snap
          if (newBox.y + 10 > this.stage.height() &&
              newBox.y - 10 < this.stage.height()) {
            let oldHeight = newBox.height;
            newBox.height += this.stage.height() - newBox.y + 1;
            newBox.y = this.stage.height() + 1;
            if (aspectRatioLocked) {
              newBox.width += (newBox.height - oldHeight) / aspectRatio;
            }
          }
          // left edge snap
          if (newBox.x - newBox.width < 10 &&
            newBox.x - newBox.width > -10) {
            let oldWidth = newBox.width;
            newBox.width = newBox.x + 1;
            if (aspectRatioLocked) {
              newBox.height += (newBox.width - oldWidth) * aspectRatio;
            }
          }
          // top edge snap
          if (newBox.y - newBox.height < 10 && newBox.y - newBox.height > -10) {
            let oldHeight = newBox.height;
            newBox.height = newBox.y + 1
            if (aspectRatioLocked) {
              newBox.width += (newBox.height - oldHeight) / aspectRatio;
            }
          }

        }

        if (rotation === 270 || rotation === -90) {

          // right edge snap
          if (newBox.x + newBox.height + 10 > this.stage.width() &&
              newBox.x + newBox.height - 10 < this.stage.width()) {
            let oldHeight = newBox.height;
            newBox.height = this.stage.width() - newBox.x + 1;
            if (aspectRatioLocked) {
              newBox.width += (newBox.height - oldHeight) / aspectRatio;
            }
          }
          // bottom edge snap
          if (newBox.y > this.stage.height() - 10 &&
              newBox.y < this.stage.height() + 10) {
            let oldWidth = newBox.width;
            newBox.width += this.stage.height() - newBox.y + 1;
            newBox.y = this.stage.height() + 1;
            if (aspectRatioLocked) {
              newBox.height += (newBox.width - oldWidth) * aspectRatio;
            }
          }
          // left edge snap
          if (newBox.x < 10 &&
            newBox.x > -10) {
            let oldHeight = newBox.height;
            newBox.height += newBox.x + 1;
            newBox.x = -1;
            if (aspectRatioLocked) {
              newBox.width += (newBox.height - oldHeight) / aspectRatio;
            }
          }
          // top edge snap
          if (newBox.y - newBox.width < 10 && newBox.y - newBox.width > -10) {
            let oldWidth = newBox.width;
            newBox.width = newBox.y + 1
            if (aspectRatioLocked) {
              newBox.height += (newBox.width - oldWidth) * aspectRatio;
            }
          }

        }

      }

      if (parseFloat(rotation) % 90 === 0) {
        // restrict width to at least 10
        if (newBox.width < 10) {
          newBox.width = 10;
        }
        // restrict height to at least 10
        if (newBox.height < 10) {
          newBox.height = 10;
        }
        // don't allow resizing outside of x-boundaries
        if (newBox.x < newBox.width * -1 + 10) {
          newBox.x = newBox.width * -1 + 10;
        }
        // don't allow resizing outside of y-boundaries
        if (newBox.y < newBox.height * -1 + 10) {
          newBox.y = newBox.height * -1 + 10;
        }
      }

      console.log(newBox.width, image.width() * image.getAbsoluteScale().x)

      return newBox;


    }

    var initialImageSize = image.width() * image.getAbsoluteScale().x;
    var initialAnchorSize = overlayTransformer.anchorSize();

    var resizeAnchorsFunc = (oldBox, newBox) => {
      var anchorSize = Math.max(10 / this.initialScale, newBox.width / initialImageSize * initialAnchorSize);
      transformer.anchorSize(anchorSize);
      transformer.anchorCornerRadius(anchorSize);
      transformer.rotateAnchorOffset(anchorSize * 2);
      overlayTransformer.anchorSize(Math.max(anchorSize));
      overlayTransformer.anchorCornerRadius(anchorSize);
      overlayTransformer.rotateAnchorOffset(anchorSize * 2);

      return boundingFunc(oldBox, newBox)
    }

    transformer.boundBoxFunc(resizeAnchorsFunc);
    overlayTransformer.boundBoxFunc(resizeAnchorsFunc);

  }

  addImage(imageObj, options) {

    /*
    var layer = new Konva.Layer();

    this.stage.add(layer); */

    if (!options) options = {};

    console.log(this.stage.width())

    var image = new Konva.Image({
      image: imageObj,
      x: options.alignCenter ? this.stage.width() / 2 - imageObj.width / 2 : 0,
      y: options.alignCenter ? this.stage.height() / 2 - imageObj.height / 2: 0,
      width: imageObj.width,
      height: imageObj.height,
      draggable: options.draggable ? options.draggable : false
    });

    image.photoEditorId = imageObj.id;
    image.targetable = options.targetable ? options.targetable : false;

    this.addDefaultImageDragBoundFuncs(image);

    if (options.addToMainLayer) {
      this.mainLayer.add(image);
    } else {
      this.imagesLayer.add(image);
    }

    if (!options || options.enableTransformer !== false) {

      var overlayTransformer = this.createImageTransformer(image);
      this.transformersStageMainLayer.add(overlayTransformer);
      overlayTransformer.forceUpdate();

      var transformer = this.createImageTransformer(image);
      this.mainLayer.add(transformer);
      transformer.forceUpdate();

      this.addDefaultTransformerBoundFuncs(image, transformer, overlayTransformer);
    }

    if (!options.preventTarget) this.targetImage(image);

    this.stage.draw();
    this.transformersStage.draw();

    return [image, transformer, overlayTransformer];

  }

  rotateLayerContents(layer, negative) {

    if (!this.count) this.count = 0;

    this.count += 1;

    var rotateDeg = negative ? -90 : 90;

    var tempRotationLayer = new Konva.Layer();
    this.stage.add(tempRotationLayer);
    this.cloneLayerProperties(tempRotationLayer, layer);
    this.moveLayerContents(layer, tempRotationLayer);

    console.log(tempRotationLayer.width(), tempRotationLayer.height())

    var x = tempRotationLayer.width() / 2;
    var y = tempRotationLayer.height() / 2;

    tempRotationLayer.x(y);
    tempRotationLayer.y(x);

    console.log(this.imagesLayerRotation)

    if (Math.abs(this.imagesLayerRotation) === 90 || Math.abs(this.imagesLayerRotation) === 270) {

      tempRotationLayer.offsetX(x);
      tempRotationLayer.offsetY(y);

      tempRotationLayer.x(x);
      tempRotationLayer.y(y);

      //console.log(this.stage.offsetX(), this.stage.offsetY(), this.stage.x(), this.stage.y())

      tempRotationLayer.rotate(rotateDeg);

      /*
      tempRotationLayer.add(new Konva.Rect({
        width: tempRotationLayer.width(),
        height: tempRotationLayer.height(),
        x: 0,
        y: 0,
        fill: "grey",
        draggable: true
      })) */

      console.log(tempRotationLayer.width(), this.stage.height(), y)

      console.log(tempRotationLayer.x(), tempRotationLayer.y(), tempRotationLayer.width(), tempRotationLayer.height(), this.stage.width(), this.stage.height());
      console.log(tempRotationLayer.x() + ((tempRotationLayer.height() - this.stage.width()) / 2))
      console.log(tempRotationLayer.y() - ((this.stage.height() - tempRotationLayer.width()) / 2))

      tempRotationLayer.x(tempRotationLayer.x() + ((tempRotationLayer.height() - this.stage.width()) / 2));
      tempRotationLayer.y(tempRotationLayer.y() - ((this.stage.height() - tempRotationLayer.width()) / 2));

      this.moveLayerContents(tempRotationLayer, layer, true);

      //console.log(tempRotationLayer.offsetX(), tempRotationLayer.offsetY(), tempRotationLayer.x(), tempRotationLayer.y())
      this.stage.draw();

      this.imagesLayerRotation += rotateDeg;
      if (Math.abs(this.imagesLayerRotation) === 360) this.imagesLayerRotation = 0;

      return;
    }

    /*
    tempRotationLayer.add(new Konva.Rect({
      width: tempRotationLayer.width(),
      height: tempRotationLayer.height(),
      x: 0,
      y: 0,
      fill: "grey",
      draggable: true
    })) */

    console.log(tempRotationLayer.width(), tempRotationLayer.height(), tempRotationLayer.x(), tempRotationLayer.y(), tempRotationLayer.offsetX(), tempRotationLayer.offsetY())

    tempRotationLayer.rotate(rotateDeg);

    this.moveLayerContents(tempRotationLayer, layer, true);

    this.stage.draw();

    this.imagesLayerRotation += rotateDeg;
    if (this.imagesLayerRotation === 360) this.imagesLayerRotation = 0;

  }

  moveLayerContents(fromLayer, toLayer, useAbsolutePosition) {

    var contents = fromLayer.getChildren();
    var toMove = [];

    for (var i = 0; i < contents.length; i++) {
      var item = contents[i];
      var zIndex = item.zIndex();
      if (useAbsolutePosition) {
        var absolutePosition = item.absolutePosition();
        console.log(absolutePosition)
        item.x(absolutePosition.x);
        item.y(absolutePosition.y);
        item.rotation(item.rotation() + fromLayer.rotation());
      }
      toMove.push(item);
    }

    for (var i = 0; i < toMove.length; i++) {
      var item = toMove[i];
      item.remove();
      toLayer.add(item);
      this.getNodeTransformer(item).forceUpdate();
      item.zIndex(zIndex);
    }

  }

  cloneLayerProperties(layer, layerToClone) {

    layer.x(layerToClone.x());
    layer.y(layerToClone.y());
    layer.offsetX(layerToClone.offsetX());
    layer.offsetY(layerToClone.offsetY());

    layer.rotation(layerToClone.rotation());
    layer.scale(layerToClone.scale());
    layer.size(layerToClone.size());

  }

  fixLayerContentsPositioning(layer) {

    var contents = layer.getChildren();

    for (var i = 0; i < contents.length; i++) {
      var item = contents[i];

      var pos = item.absolutePosition();

      item.x(pos.x);
      item.y(pos.y);
    }

    layer.offsetX(0);
    layer.offsetY(0);
    layer.x(0);
    layer.y(0);

  }

  cropImages(boundaryBox) {

    var images = this.imagesLayer.getChildren();

    var cropResults = [];

    for (var i = 0; i < images.length; i++) {
      var image = images[i];

      this.hideAllImages();
      this.hideAllImageTransformers();
      image.show();
      this.disableBackground();
      if (this.selectedTargetImage) this.unTargetImage(this.selectedTargetImage);
      if (this.previewedTargetImage) this.unPreviewTargetImage(this.previewedTargetImage);

      var transformer = this.getImageTransformer(image);
      transformer.hide();
      transformer.forceUpdate();

      var overlayTransformer = this.getImageTransformer(image, this.transformersStageMainLayer);
      overlayTransformer.hide();
      overlayTransformer.forceUpdate();

      this.transformersStageMainLayer.hide();
      console.log(image.getAbsolutePosition())
      console.log(this.imagesLayer.getAbsolutePosition())

      this.stage.draw();

      var canvas = this.stage.toCanvas();

      var cropResult = ImageCropLib.cropImageInLayer(canvas, boundaryBox);

      cropResults.push([image, cropResult]);

      this.showAllImages();
      this.enableBackground();

      this.transformersStageMainLayer.show();

      this.stage.batchDraw();
      this.transformersStage.batchDraw();

    }

    for (var i = 0; i < cropResults.length; i++) {

      var image = cropResults[i][0];
      var cropResult = cropResults[i][1];

      if (!cropResult) continue;

      var croppedImage = cropResult.croppedImage;

      croppedImage.id = image.photoEditorId;

      transformer = this.getImageTransformer(image);
      var overlayTransformer = this.getImageTransformer(image, this.transformersStageMainLayer);

      var [newImage] = this.replaceImage(image, croppedImage);

      newImage.rotation(0);
      newImage.scale({
        x: 1,
        y: 1
      });
      newImage.width(Math.round(cropResult.afterCropBoundingBox.width));
      newImage.height(Math.round(cropResult.afterCropBoundingBox.height))

      newImage.x(Math.max(cropResult.beforeCropBoundingBox.x - boundaryBox.x, boundaryBox.x - boundaryBox.x));
      newImage.y(Math.max(cropResult.beforeCropBoundingBox.y - boundaryBox.y, boundaryBox.y - boundaryBox.y));

      transformer.forceUpdate();
      if (overlayTransformer) overlayTransformer.forceUpdate();

    }

    /*
    this.imagesLayer.add(new Konva.Rect({
      width: this.imagesLayer.height(),
      height: this.imagesLayer.width(),
      fill: "gray",
      draggable: true
    })) */

    this.stage.draw();

  }

  hideAllImages() {
    var images = this.imagesLayer.getChildren();
    for (var i = 0; i < images.length; i++) {
      var image = images[i];
      image.hide();
    }
  }

  showAllImages() {
    var images = this.imagesLayer.getChildren();
    for (var i = 0; i < images.length; i++) {
      var image = images[i];
      image.show();
    }
  }

  enableBackground() {
    this.backgroundImage.show();
    this.colorBackgroundImage.show();
  }

  disableBackground() {
    this.backgroundImage.hide();
    this.colorBackgroundImage.hide();
  }

  cloneAllImages() {

    var cloneImages = [];
    var images = this.imagesLayer.getChildren();

    for (var i = 0; i < images.length; i++) {
      var image = images[i];

      var cloneImage = image.clone();
      cloneImage.photoEditorId = image.photoEditorId;

      cloneImages.push(cloneImage);

    }

    return cloneImages;

  }

  bringToFront(konvaNode) {
    konvaNode.moveToTop();
    this.stage.draw();
  }

  // #deprecated
  bringTransformersToFront() {
    for (var i = 0; i < this.mainLayer.getChildren().length; i++) {
      var node = this.mainLayer.getChildren()[i];
      if (node instanceof Konva.Transformer) {
        node.moveToTop();
        node.zIndex(this.mainLayer.getChildren().length)
        node.forceUpdate();
      }
    }
    this.stage.draw();
  }

  // #deprecated
  rearrangeImagesWithNodeLast(nodeToBeLast) {

    var images = [];

    for (var i = 0; i < this.mainLayer.getChildren().length; i++) {
      var node = this.mainLayer.getChildren()[i];
      if (node instanceof Konva.Image) {
        node.remove();

        if (node === nodeToBeLast) {
          continue;
        }
        images.unshift(node);
      }
    }

    images.push(nodeToBeLast);

    for (var i = 0; i < images.length; i++) {
      this.mainLayer.add(images[i]);
      images[i].zIndex(1);
    }

    nodeToBeLast.zIndex(100)

    this.stage.draw();
  }

  targetImage(image) {

    var setSelectedTargetStyles = (target) => {

      target.shadowEnabled(true);
      target.shadowColor("black");
      target.shadowOffsetY(this.initialScale ? 30 / this.initialScale : 30);
      target.shadowOffsetX(0);
      target.shadowOpacity(0.8);
      target.shadowBlur(this.initialScale ? 50 / this.initialScale : 50);

      /*
      target.strokeEnabled(true);
      target.stroke("rgb(0 149 255)");
      target.strokeWidth(1);
      target.strokeScaleEnabled(false); */

      this.stage.batchDraw();

    }

    if (this.selectedTargetImage === image) {
      this.unTargetImage(image);
      return true;
    }

    if (!image.targetable) return false;

    if (!this.selectedTargetImage) {
      setSelectedTargetStyles(image);
      this.showImageTransformer(image);
      image.draggable(true);
      this.selectedTargetImage = image;
      return true;
    }

    this.unTargetImage(this.selectedTargetImage);
    this.showImageTransformer(image);

    setSelectedTargetStyles(image);

    image.draggable(true);

    this.selectedTargetImage = image;

    return true;

  }

  unTargetImage(image) {
    if (!image) return;
    if (this.selectedTargetImage !== image) return;
    image.shadowEnabled(false);
    image.strokeEnabled(false);
    image.draggable(false);
    this.hideImageTransformer(image);
    this.selectedTargetImage = false;
  }

  getTargetedImageId() {
    if (this.selectedTargetImage) {
      return this.selectedTargetImage.photoEditorId;
    }
  }

  previewTargetImage(image) {

    var setPreviewTargetStyles = (target) => {

      target.shadowEnabled(true);
      target.shadowColor("black");
      target.shadowOffsetY(this.initialScale ? 30 / this.initialScale : 30);
      target.shadowOffsetX(0);
      target.shadowOpacity(0.8);
      target.shadowBlur(this.initialScale ? 50 / this.initialScale : 50);

      /*
      target.strokeEnabled(true);
      target.stroke("rgb(0 149 255)");
      target.strokeWidth(1);
      target.strokeScaleEnabled(false); */

      this.stage.batchDraw();

    }

    if (this.previewedTargetImage === image) return false;

    this.unPreviewTargetImage(this.previewedTargetImage);

    if (!image.targetable) return false;

    setPreviewTargetStyles(image);
    this.showImageTransformer(image);

    this.previewedTargetImage = image;

    return true;

  }

  unPreviewTargetImage(image) {
    if (!image) return;
    if (this.previewedTargetImage !== image) return;
    if (this.selectedTargetImage === image) return;
    image.shadowEnabled(false);
    image.strokeEnabled(false);
    this.hideImageTransformer(image);
    this.previewedTargetImage = false;
  }

  hideAllImageTransformers() {

    var transformers = this.mainLayer.getChildren();

    for (var i = 0; i < transformers.length; i++) {
      var transformer = transformers[i];
      transformer.hide();
    }

  }

  hideImageTransformer(image) {
    this.mainLayer.getChildren().forEach((node) => {
      if (!(node instanceof Konva.Transformer)) return;
      if (!node.nodes().includes(image)) return;
      node.hide();
    });
    var overlayTransformer = this.getImageTransformer(image, this.transformersStageMainLayer);
    if (overlayTransformer) overlayTransformer.hide();
  }

  showImageTransformer(image) {
    this.mainLayer.getChildren().forEach((node) => {
      if (!(node instanceof Konva.Transformer)) return;
      if (!node.nodes().includes(image)) return;
      node.show();
    });
    var overlayTransformer = this.getImageTransformer(image, this.transformersStageMainLayer);
    if (overlayTransformer) overlayTransformer.show();
  }

  getImageTransformer(image, layer) {
    return this.getNodeTransformer(image, layer);
  }

  // #deprecated
  getImageTransformersWithId(id) {

    var returnObj = {
      mainLayer: false,
      transformersStageMainLayer: false
    }

    var mainTransformers = this.mainLayer.getChildren();
    var overlayTransformers = this.transformersStageMainLayer.getChildren();

    for (let i = 0; i < mainTransformers.length; i++) {
      let transformer = overlayTransformers[i];
      if ((!transformer instanceof Konva.Transformer)) return;
      let node = transformer.nodes()[0];
      if (node.photoEditorId === id) {
        returnObj.transformersStageMainLayer = node;
      }
    }

    for (let i = 0; i < overlayTransformers.length; i++) {
      let transformer = overlayTransformers[i];
      if ((!transformer instanceof Konva.Transformer)) return;
      let node = transformer.nodes()[0];
      if (node.photoEditorId === id) {
        returnObj.mainLayer = node;
      }
    }

    return returnObj;

  }

  getNodeTransformer(node, layer) {
    var transformer;
    layer = layer ? layer : this.mainLayer;
    var transformers = layer.getChildren();
    for (var i = 0; i < transformers.length; i++) {
      var transformer = transformers[i];
      if (!(transformer instanceof Konva.Transformer)) continue;
      if (!transformer.nodes().includes(node)) continue;
      return transformer;
    }
  }

  updateTransformers(layer) {
    var nodes = layer.getChildren();
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node instanceof Konva.Transformer) node.forceUpdate();
    }
  }

  // #deprecated
  updateImageTransformerConnections(id) {

    var image = this.getImageWithId(id);

    var transformers = this.getImageTransformersWithId(id);

    if (transformers.mainLayer) {
      if (!transformers.mainLayer.nodes().includes(image)) {
        transformers.mainLayer.nodes([image]);
        transformers.mainLayer.forceUpdate();
      }
    }

    if (transformers.transformersStageMainLayer) {
      if (!transformers.transformersStageMainLayer.nodes().includes(image)) {
        transformers.transformersStageMainLayer.nodes([image]);
        transformers.transformersStageMainLayer.forceUpdate();
      }
    }

  }

  // #deprecated
  recreateTransformersStageTransformers() {
    var nodes = this.transformersStageMainLayer.getChildren();
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node instanceof Konva.Transformer) {
        var originalTransformer = this.getNodeTransformer(node.nodes()[0]);
        var newTransformer = this.createImageTransformer(originalTransformer.nodes()[0]);
        newTransformer.zIndex(node.zIndex());
        node.remove();
        this.transformersStageMainLayer.add(newTransformer);
        node.forceUpdate();
        newTransformer.forceUpdate();
      }
    }
  }

  hideImage(image) {
    image.visible(false);
    this.stage.draw();
  }

  showImage(image) {
    image.show();
    this.stage.draw();
  }

  replaceImages(newImages, startIndex) {

    var images = this.imagesLayer.getChildren();

    var toReplace = [];
    var replaced = [];

    for (var i = 0; i < newImages.length; i++) {

      var id = newImages[i] instanceof HTMLImageElement ? newImages[i].id : newImages[i].photoEditorId;
      var image = this.getImageWithId(id);
      if (!image) continue;

      var newImage = newImages[i] instanceof Konva.Image ? newImages[i] : new Konva.Image({
        image: newImages[i],
        x: image.x(),
        y: image.y(),
        scale: image.scale(),
        width: image.width(),
        height: image.height(),
        rotation: image.rotation(),
        draggable: image.draggable()
      });

      newImage.targetable = image.targetable;
      newImage.photoEditorId = image.photoEditorId;
      newImage.zIndex(image.zIndex());

      toReplace.push([newImage, image]);
    }

    /*
    for (var i = startIndex; i < images.length; i++) {
      var image = images[i];

      if (newImages[i] instanceof Konva.Image){
        if (image.photoEditorId !== newImages[i].photoEditorId) return;
      }

      console.log(image.photoEditorId, newImages[i].id)

      if (newImages[i] instanceof HTMLImageElement) {
        if (image.photoEditorId !== newImages[i].id) return;
      }

      var newImage = newImages[i] instanceof Konva.Image ? newImages[i] : new Konva.Image({
        image: newImages[i],
        x: image.x(),
        y: image.y(),
        scale: image.scale(),
        width: image.width(),
        height: image.height(),
        rotation: image.rotation(),
        draggable: image.draggable()
      });

      newImage.targetable = image.targetable;
      newImage.photoEditorId = image.photoEditorId;
      newImage.zIndex(image.zIndex());

      toReplace.push([newImage, image]);

    } */

    for (var i = 0; i < toReplace.length; i++) {
      var newImage = toReplace[i][0];
      var oldImage = toReplace[i][1];

      var transformer = this.getImageTransformer(oldImage);
      var overlayTransformer = this.getImageTransformer(oldImage, this.transformersStageMainLayer);

      if (transformer) {
        transformer.nodes([newImage]);
        transformer.forceUpdate();
        transformer.hide();
      }

      if (overlayTransformer) {
        overlayTransformer.nodes([newImage]);
        overlayTransformer.forceUpdate();
        overlayTransformer.hide();
      }

      oldImage.remove();

      this.imagesLayer.add(newImage);

      this.addDefaultImageDragBoundFuncs(newImage)

      if (this.selectedTargetImage === oldImage) this.targetImage(newImage);

      newImage.zIndex(oldImage.zIndex());

      replaced.push(oldImage);

    }

    this.stage.draw();
    this.transformersStageMainLayer.draw();

    return replaced;

  }

  replaceImage(oldImage, newImageObj) {

    var transformer = this.getImageTransformer(oldImage);
    var overlayTransformer = this.getImageTransformer(oldImage, this.transformersStageMainLayer);

    var newImage = newImageObj instanceof Konva.Image ? newImageObj : new Konva.Image({
      image: newImageObj,
      x: oldImage.x(),
      y: oldImage.y(),
      scale: oldImage.scale(),
      width: oldImage.width(),
      height: oldImage.height(),
      rotation: oldImage.rotation(),
      draggable: oldImage.draggable()
    });

    newImage.targetable = oldImage.targetable;
    newImage.photoEditorId = oldImage.photoEditorId;

    transformer.nodes([newImage]);
    overlayTransformer.nodes([newImage]);

    oldImage.remove();

    console.log(newImage)

    this.imagesLayer.add(newImage);
    transformer.forceUpdate();
    overlayTransformer.forceUpdate();

    this.addDefaultImageDragBoundFuncs(newImage)

    transformer.hide();
    overlayTransformer.hide();

    newImage.zIndex(oldImage.zIndex());

    if (this.selectedTargetImage === oldImage) this.targetImage(newImage);

    this.stage.draw();

    console.log(newImage, oldImage)

    return [newImage, oldImage];

  }

  replaceImageWithSameId(imageObj) {

    var id = imageObj instanceof Konva.Image ? imageObj.photoEditorId : imageObj.id;

    for (var i = 0; i < this.imagesLayer.getChildren().length; i++) {
      var image = this.imagesLayer.getChildren()[i];
      if (id=== image.photoEditorId) {
        return this.replaceImage(image, imageObj);
      }
    }

  }

  deleteImage(image) {
    if (image === this.selectedTargetImage) this.unTargetImage(image);
    image.remove();
    var transformer = this.getImageTransformer(image);
    if (transformer) transformer.remove();
    var overlayTransformer = this.getImageTransformer(image, this.transformersStageMainLayer);
    if (overlayTransformer) overlayTransformer.remove();
    this.stage.draw();
    return [image, transformer, overlayTransformer];
  }

  deleteImageWithId(id) {
    var image = this.getImageWithId(id);
    if (image) return this.deleteImage(image);
  }

  getImageWithId(id) {
    for (var i = 0; i < this.imagesLayer.getChildren().length; i++) {
      var image = this.imagesLayer.getChildren()[i];
      if (id === image.photoEditorId) {
        return image;
      }
    }
  }

  async getImageObjects(layer) {

    var imageObjects = [];
    var imageNodes = layer.getChildren();

    for (var i = 0; i < imageNodes.length; i++) {
      var node = imageNodes[i];
      if (node instanceof Konva.Image) {
        await new Promise((resolve) => {
          var transformer = this.getImageTransformer(node);
          if (transformer) transformer.hide();
          node.toImage({
            callback: (image) => {
              image.id = node.photoEditorId;
              imageObjects.push(image);
              if (transformer) transformer.show();
              resolve();
            }
          })

        })
      }
    }

    return imageObjects;

  }

  bringImageToFront(image) {
    image.zIndex(this.imagesLayer.getChildren().length - 1);
    this.stage.draw();
  }

  getBackgroundImage() {
    return this.backgroundImage;
  }

  getColorBackgroundImage() {
    return this.colorBackgroundImage;
  }

}

export default KonvaLib;
