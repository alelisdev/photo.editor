
import UndoRedoTypesLib from "./UndoRedoTypesLib.js";
import CanvasLib from "./CanvasLib.js";

class UndoRedo {

  constructor(parent) {
    this.parent = parent;

    this.undoCache = [];
    this.redoCache = [];

    this.typesLib = new UndoRedoTypesLib(parent);

  }

  replaceImageNodeInCaches(oldImage, newImage) {

    var replace = (undoRedoItem) => {
      if (!undoRedoItem.data.imageNode) return;
      if (undoRedoItem.data.imageNode === oldImage) undoRedoItem.data.imageNode = newImage;
    }

    this.redoCache.forEach(replace);
    this.undoCache.forEach(replace);

  }

  addKonvaImageUndoRedoEvents(konvaImage) {

    console.log("adding image undo events")

    var beforeDragUndoRedo;

    var onDragStart = () => {
      console.log("beginning undo drag")
      beforeDragUndoRedo = this.typesLib.getImageTransformUndoRedo(konvaImage);
    }

    var onDragEnd = () => {
      this.addToUndoCache(beforeDragUndoRedo);
      this.parent.softBrush.setSamplingCanvas(this.parent.konvaLib.stage.toCanvas());
    }

    konvaImage.on("dragstart", onDragStart);

    konvaImage.on("dragend", onDragEnd);

  }

  addKonvaTransformerUndoRedoEvents(konvaImage, transformer) {

    var beforeTransformUndoRedo;

    var onMouseDown = () => {
      beforeTransformUndoRedo = this.typesLib.getImageTransformUndoRedo(transformer.nodes()[0]);
      document.addEventListener("mouseup", onMouseUp)
    }

    var onMouseUp = () => {
      this.addToUndoCache(beforeTransformUndoRedo);
      this.parent.softBrush.setSamplingCanvas(this.parent.konvaLib.stage.toCanvas());
      document.removeEventListener("mouseup", onMouseUp)
    }

    if (!konvaImage || !transformer) return;

    transformer.on("mousedown", onMouseDown);

    transformer.on("mouseup", onMouseUp);

  }

  clearRedoCache() {
    this.redoCache = [];
    this.parent.dispatchEvent("redoAmountChange", [this.getRedoCache().length]);
  }

  clearUndoCache() {
    this.undoCache = [];
    this.parent.dispatchEvent("undoAmountChange", [this.getUndoCache().length]);
  }

  addToRedoCache(redoItem, redoType) {
    if (!redoType) {
      this.redoCache.push(redoItem);
    } else {
      this.redoCache.push({
        data: redoItem,
        type: redoType
      });
    }
    this.parent.dispatchEvent("redoAmountChange", [this.getRedoCache().length]);
  }

  addToUndoCache(undoItem, undoType, isRedo) {

    if (!isRedo) this.clearRedoCache();

    if (!undoType) {
      this.undoCache.push(undoItem);
    } else {
      this.undoCache.push({
        data: undoItem,
        type: undoType
      });
    }

    this.parent.dispatchEvent("undoAmountChange", [this.getUndoCache().length]);
  }

  getUndoCache() {
    return this.undoCache;
  }

  getRedoCache() {
    return this.redoCache;
  }

  async undoRedo(undoOrRedo) {

    debugger;

    var handleUndoRedoCache = (undoRedoItem, undoOrRedo) => {
      if (undoOrRedo === "undo") {
        this.addToRedoCache(undoRedoItem);
        this.undoCache.pop();
        this.parent.dispatchEvent("undoAmountChange", [this.getUndoCache().length]);
        console.log(this.undoCache, this.redoCache)
      } else {
        this.addToUndoCache(undoRedoItem, null, true);
        this.redoCache.pop();
        this.parent.dispatchEvent("redoAmountChange", [this.getRedoCache().length]);
        console.log(this.undoCache, this.redoCache)
      }
    }

    var latestUndoRedo = undoOrRedo === "undo" ? this.undoCache[this.undoCache.length - 1] : this.redoCache[this.redoCache.length -  1];

    if (!latestUndoRedo) return;

    switch (latestUndoRedo.type) {

      case "konva": {

        handleUndoRedoCache(this.typesLib.getKonvaUndoRedo(), undoOrRedo);

        this.parent.layer.destroy();
        this.parent.stage.add(latestUndoRedo.data.layer);

        this.parent.layer = latestUndoRedo.data.layer;

        this.parent.texts = [];

        for (var i = 0; i < latestUndoRedo.data.transformerPairs.length; i++) {
          var pair = latestUndoRedo.data.transformerPairs[i];
          this.parent.texts.push(pair[0]);

          var transformer = new this.parent.Konva.Transformer({
            nodes: [pair[0]],
            rotateAnchorOffset: 60,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
          })

          transformer.on("mousedown", (e) => {
            e.evt.cancelBubble = true
            this.addToUndoCache(this.typesLib.getKonvaUndoRedo());
          })

          this.parent.layer.add(pair[0]);
          this.parent.layer.add(transformer);

        }

        this.parent.layer.batchDraw();

        break;
      }

      case "canvas-resize": {

        handleUndoRedoCache(this.typesLib.getCanvasResizeUndoRedo(), undoOrRedo);

        this.parent.setCanvasSize(latestUndoRedo.data.width, latestUndoRedo.data.height, true);

        break;

        this.parent.konvaLib.stage.width(latestUndoRedo.data.width);
        this.parent.konvaLib.stage.height(latestUndoRedo.data.height);

        this.parent.konvaLib.backgroundImage.width(latestUndoRedo.data.width);
        this.parent.konvaLib.backgroundImage.height(latestUndoRedo.data.height);

        this.parent.konvaLib.colorBackgroundImage.width(latestUndoRedo.data.width);
        this.parent.konvaLib.colorBackgroundImage.height(latestUndoRedo.data.height);

        this.parent.konvaLib.transformersStage.width(latestUndoRedo.data.width);
        this.parent.konvaLib.transformersStage.height(latestUndoRedo.data.height);

        this.parent.stage.width(latestUndoRedo.data.width);
        this.parent.stage.height(latestUndoRedo.data.height);

        this.parent.konvaLib.stage.batchDraw();
        this.parent.konvaLib.transformersStage.batchDraw();
        this.parent.stage.batchDraw();

        this.parent.dispatchEvent("canvasResize", [latestUndoRedo.data.width, latestUndoRedo.data.height]);

        break;
      }

      case "crop": {

        this.parent.dispatchEvent("acceptCrop", []);

        // stop blocking so the loading animation can render
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, 0)
        });

        handleUndoRedoCache(this.typesLib.getCropUndoRedo(), undoOrRedo);

        latestUndoRedo.x = Math.round(latestUndoRedo.x);
        latestUndoRedo.y = Math.round(latestUndoRedo.y);
        latestUndoRedo.imagesOffsetX = Math.round(latestUndoRedo.imagesOffsetX);
        latestUndoRedo.imagesOffsetY = Math.round(latestUndoRedo.imagesOffsetY);
        latestUndoRedo.width = Math.round(latestUndoRedo.width);
        latestUndoRedo.height = Math.round(latestUndoRedo.height)

        console.log(latestUndoRedo.data.images)

        console.log(this.undoCache, this.redoCache)

        var replacedImages = this.parent.konvaLib.replaceImages(latestUndoRedo.data.images, 0);

        /*
        for (var i = 0; i < latestUndoRedo.data.images.length; i++) {
          let image = latestUndoRedo.data.images[i];
          this.addKonvaImageUndoRedoEvents(image);
          this.replaceImageNodeInCaches(replacedImages[i], image);

          this.parent.konvaLib.targetImage(image)

        } */

        var oldLayerOffsetX = this.parent.layer.offsetX();
        var oldLayerOffsetY = this.parent.layer.offsetY();

        this.parent.layer.offsetX(latestUndoRedo.data.offsetX);
        this.parent.layer.offsetY(latestUndoRedo.data.offsetY);

        this.parent.softBrush.addOffsetToDrawSegments((this.parent.layer.offsetX() - oldLayerOffsetX) * -1, (this.parent.layer.offsetY() - oldLayerOffsetY) * -1);
        this.parent.softBrush.setOffset(this.parent.layer.offsetX() * -1, this.parent.layer.offsetY() * -1);

        this.parent.stage.size({
          width: Math.round(latestUndoRedo.data.width),
          height: Math.round(latestUndoRedo.data.height)
        })

        this.parent.konvaLib.colorBackgroundImage.size({
          width: Math.round(latestUndoRedo.data.width),
          height: Math.round(latestUndoRedo.data.height)
        });

        this.parent.konvaLib.backgroundImage.size({
          width: Math.round(latestUndoRedo.data.width),
          height: Math.round(latestUndoRedo.data.height)
        });

        this.parent.konvaLib.imagesLayer.x(latestUndoRedo.data.x);
        this.parent.konvaLib.imagesLayer.y(latestUndoRedo.data.y);

        this.parent.konvaLib.transformersStageMainLayer.x(latestUndoRedo.data.x);
        this.parent.konvaLib.transformersStageMainLayer.y(latestUndoRedo.data.y);

        this.parent.konvaLib.imagesLayer.offsetX(latestUndoRedo.data.imagesOffsetX);
        this.parent.konvaLib.imagesLayer.offsetY(latestUndoRedo.data.imagesOffsetY);

        this.parent.konvaLib.transformersStageMainLayer.offsetX(latestUndoRedo.data.imagesOffsetX);
        this.parent.konvaLib.transformersStageMainLayer.offsetY(latestUndoRedo.data.imagesOffsetY);

        this.parent.drawingCanvas.width = Math.round(latestUndoRedo.data.width);
        this.parent.drawingCanvas.height = Math.round(latestUndoRedo.data.height);

        this.parent.cursorCanvas.width = Math.round(latestUndoRedo.data.width);
        this.parent.cursorCanvas.height = Math.round(latestUndoRedo.data.height);

        this.parent.drawingCanvas.getContext("2d").putImageData(latestUndoRedo.data.drawingImageData, 0, 0);

        this.parent.colorPickerCanvas.width = Math.round(latestUndoRedo.data.width);
        this.parent.colorPickerCanvas.height = Math.round(latestUndoRedo.data.height);

        this.parent.konvaLib.transformersStage.size({
          width: Math.round(latestUndoRedo.data.width),
          height: Math.round(latestUndoRedo.data.height)
        });

        this.parent.konvaLib.stage.size({
          width: Math.round(latestUndoRedo.data.width),
          height: Math.round(latestUndoRedo.data.height)
        });

        this.parent.replaceImagesWithNoFilters(latestUndoRedo.data.imagesWithNoFilters);
        //this.parent.reapplyImageFilters();

        this.parent.konvaLib.transformersStage.batchDraw();
        this.parent.konvaLib.stage.batchDraw();

        this.parent.konvaLib.updateTransformers(this.parent.konvaLib.mainLayer);
        this.parent.konvaLib.updateTransformers(this.parent.konvaLib.transformersStageMainLayer);

        this.parent.dispatchEvent("cropped", [{
          width: latestUndoRedo.data.width,
          height: latestUndoRedo.data.height,
          x: latestUndoRedo.data.x,
          y: latestUndoRedo.data.y,
        }]);

        break;
      }

      case "rotate": {

        if (undoOrRedo === "undo") {
          await this.parent.rotate(true, true);
        } else {
          await this.parent.rotate(true);
        }

        this.parent.konvaLib.stage.batchDraw();

        handleUndoRedoCache(latestUndoRedo, undoOrRedo);

        this.parent.softBrush.setSamplingCanvas(this.parent.konvaLib.stage.toCanvas());

        break;
      }

      case "image-transform": {

        var image = this.parent.konvaLib.getImageWithId(latestUndoRedo.data.imageNode.photoEditorId);

        handleUndoRedoCache(this.typesLib.getImageTransformUndoRedo(image), undoOrRedo);

        image.scale(latestUndoRedo.data.scale)
        image.rotation(latestUndoRedo.data.rotation);
        image.offsetX(latestUndoRedo.data.offsetX);
        image.offsetY(latestUndoRedo.data.offsetY);
        image.x(latestUndoRedo.data.x);
        image.y(latestUndoRedo.data.y);
        image.size({
          width: latestUndoRedo.data.width,
          height: latestUndoRedo.data.height
        });
        latestUndoRedo.data.transformer.anchorSize(latestUndoRedo.data.transformerAnchorSize);
        latestUndoRedo.data.transformer.anchorCornerRadius(latestUndoRedo.data.transformerAnchorSize);
        latestUndoRedo.data.transformer.rotateAnchorOffset(latestUndoRedo.data.rotateAnchorOffset);
        latestUndoRedo.data.overlayTransformer.anchorSize(latestUndoRedo.data.transformerAnchorSize);
        latestUndoRedo.data.overlayTransformer.anchorCornerRadius(latestUndoRedo.data.transformerAnchorSize);
        latestUndoRedo.data.overlayTransformer.rotateAnchorOffset(latestUndoRedo.data.rotateAnchorOffset);

        // if an image has been deleted and brought back with redo, one of the transformers won't update on its own any longer
        this.parent.konvaLib.updateTransformers(this.parent.konvaLib.mainLayer);

        /*
        var overlayTransformer = this.parent.konvaLib.getImageTransformer(latestUndoRedo.data.imageNode, this.parent.konvaLib.transformersStageMainLayer);
        if (overlayTransformer) overlayTransformer.forceUpdate(); */

        this.parent.konvaLib.stage.batchDraw();
        this.parent.konvaLib.transformersStage.batchDraw();

        this.parent.softBrush.setSamplingCanvas(this.parent.konvaLib.stage.toCanvas());

        break;

      }

      case "image-add": {

        console.log(latestUndoRedo.data.imageNode)
        console.log(this.undoCache, this.redoCache)

        if (undoOrRedo === "undo") {
          var selectedTarget = this.parent.konvaLib.selectedTargetImage;
          var [image, transformer, overlayTransformer] = this.parent.konvaLib.deleteImageWithId(latestUndoRedo.data.imageNode.photoEditorId);

          if (selectedTarget.photoEditorId === latestUndoRedo.data.imageNode.photoEditorId) {
            this.parent.dispatchEvent("imageTargetChange", [false]);
          }
          latestUndoRedo.data.imageNode = image;
          latestUndoRedo.data.transformer = transformer;
          latestUndoRedo.data.overlayTransformer = overlayTransformer;
          handleUndoRedoCache(this.typesLib.getImageAddUndoRedo(latestUndoRedo.data.imageNode, latestUndoRedo.data.transformer, latestUndoRedo.data.overlayTransformer), undoOrRedo);
          latestUndoRedo.data.imageNode.zIndex(latestUndoRedo.data.zIndex);
        } else {

          this.parent.konvaLib.imagesLayer.add(latestUndoRedo.data.imageNode);

          if (latestUndoRedo.data.transformer) {
            latestUndoRedo.data.transformer.nodes([latestUndoRedo.data.imageNode]);
            this.parent.konvaLib.mainLayer.add(latestUndoRedo.data.transformer);
            latestUndoRedo.data.transformer.forceUpdate();
          }

          if (latestUndoRedo.data.overlayTransformer) {
            latestUndoRedo.data.overlayTransformer.nodes([latestUndoRedo.data.imageNode]);
            this.parent.konvaLib.transformersStageMainLayer.add(latestUndoRedo.data.overlayTransformer);
            latestUndoRedo.data.overlayTransformer.forceUpdate();
          }

          latestUndoRedo.data.imageNode.zIndex(latestUndoRedo.data.zIndex);

          if (this.parent.konvaLib.selectedTargetImage !== latestUndoRedo.data.imageNode){
            this.parent.konvaLib.targetImage(latestUndoRedo.data.imageNode);
            this.parent.dispatchEvent("imageTargetChange", [latestUndoRedo.data.imageNode]);
          }

          handleUndoRedoCache(this.typesLib.getImageAddUndoRedo(latestUndoRedo.data.imageNode, latestUndoRedo.data.transformer, latestUndoRedo.data.overlayTransformer), undoOrRedo);

        }

        this.parent.konvaLib.stage.batchDraw();
        this.parent.konvaLib.transformersStage.batchDraw();

        this.parent.softBrush.setSamplingCanvas(this.parent.konvaLib.stage.toCanvas());



        break;

      }

      case "image-delete": {

        if (undoOrRedo === "undo") {
          handleUndoRedoCache(this.typesLib.getImageDeleteUndoRedo(latestUndoRedo.data.imageNode), undoOrRedo);
          this.parent.konvaLib.imagesLayer.add(latestUndoRedo.data.imageNode);
          if (latestUndoRedo.data.transformer) {
            latestUndoRedo.data.transformer.nodes([latestUndoRedo.data.imageNode]);
            this.parent.konvaLib.mainLayer.add(latestUndoRedo.data.transformer);
          }
          if (latestUndoRedo.data.overlayTransformer) {
            latestUndoRedo.data.overlayTransformer.nodes([latestUndoRedo.data.imageNode]);
            this.parent.konvaLib.transformersStageMainLayer.add(latestUndoRedo.data.overlayTransformer);
          }
          latestUndoRedo.data.imageNode.zIndex(latestUndoRedo.data.zIndex);
          if (this.parent.konvaLib.selectedTargetImage !== latestUndoRedo.data.imageNode) {
            this.parent.konvaLib.targetImage(latestUndoRedo.data.imageNode);
            this.parent.dispatchEvent("imageTargetChange", [latestUndoRedo.data.imageNode]);
          }
        } else {
          handleUndoRedoCache(this.typesLib.getImageDeleteUndoRedo(this.parent.konvaLib.getImageWithId(latestUndoRedo.data.imageNode.photoEditorId)), undoOrRedo);
          var selectedTarget = this.parent.konvaLib.selectedTargetImage;
          this.parent.konvaLib.deleteImageWithId(latestUndoRedo.data.imageNode.photoEditorId);
          if (selectedTarget.photoEditorId === latestUndoRedo.data.imageNode.photoEditorId) {
            this.parent.dispatchEvent("imageTargetChange", [false]);
          }
          latestUndoRedo.data.imageNode.zIndex(latestUndoRedo.data.zIndex);
        }

        this.parent.konvaLib.stage.batchDraw();
        this.parent.konvaLib.transformersStage.batchDraw();

        this.parent.softBrush.setSamplingCanvas(this.parent.konvaLib.stage.toCanvas());

        break;

      }

      case "text-transform": {

        handleUndoRedoCache(this.typesLib.getTextTransformUndoRedo(latestUndoRedo.data.textNode), undoOrRedo);

        var text = latestUndoRedo.data.textNode;

        text.scale(latestUndoRedo.data.scale)
        text.rotation(latestUndoRedo.data.rotation);
        text.offsetX(latestUndoRedo.data.offsetX);
        text.offsetY(latestUndoRedo.data.offsetY);
        text.x(latestUndoRedo.data.x);
        text.y(latestUndoRedo.data.y);
        text.text(latestUndoRedo.data.text);
        text.fill(latestUndoRedo.data.fill);
        text.fontFamily(latestUndoRedo.data.fontFamily);
        text.stroke(latestUndoRedo.data.stroke);

        this.parent.stage.batchDraw();

        break;

      }

      case "text-add": {

        handleUndoRedoCache(this.typesLib.getTextAddUndoRedo(latestUndoRedo.data.textNode, latestUndoRedo.data.transformer), undoOrRedo);

        if (undoOrRedo === "undo") {
          if (latestUndoRedo.data.textNode === this.parent.konvaTextTarget) this.parent.untargetKonvaText(latestUndoRedo.data.textNode);
          latestUndoRedo.data.textNode.remove();
          if (latestUndoRedo.data.transformer) latestUndoRedo.data.transformer.remove();
          latestUndoRedo.data.textNode.zIndex(latestUndoRedo.data.zIndex);
        } else {
          this.parent.layer.add(latestUndoRedo.data.textNode);
          if (latestUndoRedo.data.transformer) this.parent.layer.add(latestUndoRedo.data.transformer);
          latestUndoRedo.data.textNode.zIndex(latestUndoRedo.data.zIndex);
          this.parent.targetKonvaText(latestUndoRedo.data.textNode);
        }

        this.parent.stage.batchDraw();

        break;

      }

      case "text-delete": {

        handleUndoRedoCache(this.typesLib.getTextDeleteUndoRedo(latestUndoRedo.data.textNode, latestUndoRedo.data.transformer), undoOrRedo);

        if (undoOrRedo === "undo") {
          this.parent.layer.add(latestUndoRedo.data.textNode);
          if (latestUndoRedo.data.transformer) this.parent.layer.add(latestUndoRedo.data.transformer);
          latestUndoRedo.data.textNode.zIndex(latestUndoRedo.data.zIndex);
          this.parent.targetKonvaText(latestUndoRedo.data.textNode);
        } else {
          if (latestUndoRedo.data.textNode === this.parent.konvaTextTarget) this.parent.untargetKonvaText(latestUndoRedo.data.textNode);
          latestUndoRedo.data.textNode.remove();
          if (latestUndoRedo.data.transformer) latestUndoRedo.data.transformer.remove();
          latestUndoRedo.data.textNode.zIndex(latestUndoRedo.data.zIndex);
        }

        this.parent.stage.batchDraw();

        break;

      }

      case "filter": {

        console.log(latestUndoRedo)

        if (latestUndoRedo.data.remove) {

          var matchingFilter = this.parent.getMatchingFilter(latestUndoRedo.data.filterName, latestUndoRedo.data.imageNode.photoEditorId);

          var undoRedoItem = this.typesLib.getFilterUndoRedo(latestUndoRedo.data.imageNode, matchingFilter[0], matchingFilter[1], matchingFilter[2]);

          handleUndoRedoCache(undoRedoItem, undoOrRedo);

        } else {

          var matchingFilter = this.parent.getMatchingFilter(latestUndoRedo.data.filterName, latestUndoRedo.data.imageNode.photoEditorId);

          if (!matchingFilter) {
            handleUndoRedoCache(this.typesLib.getFilterRemoveUndoRedo(latestUndoRedo.data.imageNode, latestUndoRedo.data.filterName), undoOrRedo);
          } else {
            handleUndoRedoCache(this.typesLib.getFilterUndoRedo(latestUndoRedo.data.imageNode, matchingFilter[0], matchingFilter[1], matchingFilter[2]), undoOrRedo);
          }

        }

        if (latestUndoRedo.data.remove) {
          this.parent.removeAppliedFilter(latestUndoRedo.data.filterName, latestUndoRedo.data.imageNode.photoEditorId);
        } else {
          this.parent.addAppliedFilter(latestUndoRedo.data.filterName, latestUndoRedo.data.values, latestUndoRedo.data.imageNode.photoEditorId, latestUndoRedo.data.properties);
        }

        var isAlreadyTargeted = (this.parent.konvaLib.getTargetedImageId() === latestUndoRedo.data.imageNode.photoEditorId);

        console.log(isAlreadyTargeted)

        if (!isAlreadyTargeted) {
          this.parent.konvaLib.targetImage(this.parent.konvaLib.getImageWithId(latestUndoRedo.data.imageNode.photoEditorId));
        }

        var image = this.parent.getSelectedImageWithNoFilters();

        var imageObj = await this.parent.getImageWithFilters(image);

        var [newImageNode, oldImageNode] = this.parent.konvaLib.replaceImageWithSameId(imageObj);

        //this.replaceImageNodeInCaches(oldImageNode, newImageNode);
        this.addKonvaImageUndoRedoEvents(newImageNode);

        this.parent.konvaLib.stage.batchDraw();

        if (isAlreadyTargeted) {
          this.parent.dispatchEvent("selectedImageFilterChange", [newImageNode]);
        } else {
          this.parent.dispatchEvent("imageTargetChange", [newImageNode]);
        }

        imageObj.onload = () => {
          this.parent.softBrush.setSamplingCanvas(this.parent.konvaLib.stage.toCanvas());
        }

        break;

      }

      case "drawing": {

        var drawnPoints = this.parent.softBrush.getDrawnPoints();

        console.log(drawnPoints)

        if (undoOrRedo === "undo") {

          var drawSegment = this.parent.softBrush.popLatestDrawSegment();

          console.log(drawSegment, this.parent.softBrush.drawSegments)

          handleUndoRedoCache(this.typesLib.getDrawingUndoRedo(drawSegment), undoOrRedo);

        } else {

          this.parent.softBrush.addDrawSegment(latestUndoRedo.data.drawSegment)

          handleUndoRedoCache(this.typesLib.getDrawingUndoRedo(latestUndoRedo.data.drawSegment), undoOrRedo);
        }

        this.parent.softBrush.clearCanvas();
        this.parent.softBrush.redrawSegments();

        break;
      }

      case "erase-all-drawing": {

        handleUndoRedoCache(this.typesLib.getEraseAllDrawingUndoRedo(), undoOrRedo);

        if (undoOrRedo === "undo") {
          this.parent.softBrush.setDrawSegments(latestUndoRedo.data.drawSegments);
          this.parent.softBrush.redrawSegments();
        } else {
          this.parent.softBrush.removeDrawSegments();
          this.parent.softBrush.clearCanvas();
        }

        break;
      }

    }

  }

}

export default UndoRedo;
