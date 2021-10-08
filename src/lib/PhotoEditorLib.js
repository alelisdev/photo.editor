
import Cropper from "cropperjs";
import Konva from "konva";
import iro from '@jaames/iro';
import UndoRedo from "./UndoRedo.js";
import SoftBrush from "./SoftBrush.js";
import CanvasLib from "./CanvasLib.js";
import ImageLib from "./ImageLib.js";
import PixiLib from "./PixiLib.js";
import KonvaLib from "./KonvaLib.js";
import { EmojiButton } from '@joeattardi/emoji-button';
import * as imageConversion from 'image-conversion';
const pica = require("pica")();

class PhotoEditorLib {

  constructor(options) {

    this.originalOptions = options;

    this.options = options;

    var { selectableFilters, adjustableFilters, adjustments, selectedTool, defaultBrushSize, defaultBrushHardness } = options;

    this.appliedPixiFilters = {};

    this.activeTransformers = [];
    this.reattachTextAnchorList = [];
    this.imageInstanced = false;
    this.hasLoadedOnce = false;

    this.shortCutsTempDisabled = false;

    this.inManualSaveMode = false;
    this.manualSaveType = false;

    this.inCropMode = false;
    this.texts = [];

    this.selectedFont = options.selectedFont;
    this.fonts = options.fonts;

    this.offsetX = 0;
    this.offsetY = 0;

    this.offsetLeftOriginX = 0;
    this.offsetLeftOriginY = 0;

    this.undoRedoLib = new UndoRedo(this);

    this.Konva = Konva;
    this.PixiLib = PixiLib;

    this.defaultBrushSize = defaultBrushSize ? defaultBrushSize : 20;
    this.defaultBrushHardness = defaultBrushHardness ? defaultBrushHardness : 0.5;

    this.selectedTool = selectedTool ? selectedTool : "";

    this.selectableFilters = selectableFilters ? selectableFilters : [];
    this.adjustableFilters = adjustableFilters ? adjustableFilters : [];
    this.adjustments = adjustments ? adjustments : [];

    this.filterPreviews = [];

    this.eventListeners= [];

    this.runningImageId = 1;

    this.emojiPicker = new EmojiButton({
      theme: "dark"
    });

    this.emojiPicker.on("emoji", (emojiSelection) => {
      this.targetKonvaText(this.addText({
        evt: {
          offsetX: this.stage.width() / 2,
          offsetY: this.stage.height() / 2,
        }
      }, emojiSelection.emoji));
    });

    if (!this.PixiLib.isWebGLSupported()) {
      this.error = "WebGL not supported";
    }

  }

  afterInitialization() {

    if (window && window.photoEditorLib && window.photoEditorLib.eventListeners) {

      for (var i = window.photoEditorLib.eventListeners.length - 1; i >= 0; i--) {
        var evtString = window.photoEditorLib.eventListeners[i].type;
        var evtHandler = window.photoEditorLib.eventListeners[i].handler;
        this.on(evtString, evtHandler);

      }

    }

    if (window) {
      window.photoEditorLib = this;
    }
    
    this.dispatchEvent("load", []);

  }

  on(evtString, evtHandler, immediateDispatch) {
    this.eventListeners.unshift({
      type: evtString,
      handler: evtHandler
    });

    if (immediateDispatch) {
      evtHandler();
    }

  }

  dispatchEvent(evtString, args) {

    for (var i = this.eventListeners.length - 1; i >= 0; i--) {
      var event = this.eventListeners[i];
      if (event.type !== evtString) continue;
      event.handler.apply(null, args);
    }
  }

  initKonva(image) {
    var stage = new Konva.Stage({
      container: 'overlayCanvasContainer',
      width: image.width,
      height: image.height
    });

    var layer = new Konva.Layer();

    stage.add(layer);

    this.layer = layer;
    this.stage = stage;

    document.getElementById("overlayCanvasContainer").firstElementChild.style.position = `absolute`;

    this.konvaReady = true;

    this.konvaJsContent = document.getElementById("overlayCanvasContainer").firstElementChild;

    this.konvaTextTarget = false;

    var target = (text) => {

      console.log(text)

      if (this.konvaTextTarget === text) {
        untarget(text);
        this.dispatchEvent("textTargetChange", [false]);
        return;
      }

      if (this.konvaTextTarget) {
        untarget(this.konvaTextTarget);
      }

      var transformer = this.konvaLib.getNodeTransformer(text, this.layer);
      transformer.show();

      text.draggable(true);

      this.konvaTextTarget = text;

      this.stage.batchDraw();

      var color = text.fill();

      var iroColor = new iro.Color(color);

      if (this.textColorPicker) {
        this.textColorPicker.setColors([iroColor]);
        this.textColorPicker.setActiveColor(0);
        document.getElementById("text-color-picker-button").style.backgroundColor = color;
        this.selectedTextColor = iroColor;
      }

      this.selectedFont = text.fontFamily();

      this.dispatchEvent("textTargetChange", [text]);

    }

    var untarget = (text) => {

      if (!text) return;

      var transformer = this.konvaLib.getNodeTransformer(text, this.layer);
      if (transformer) transformer.hide();

      text.draggable(false);

      this.konvaTextTarget = false;

      this.stage.batchDraw();

      this.dispatchEvent("textTargetChange", [false]);

    }

    this.targetKonvaText = target;
    this.untargetKonvaText = untarget;

    this.stage.on("click touchstart", (e) => {
      if (this.editingText) return;
      if (e.evt.button === 2) return;
      if (e.target instanceof Konva.Text) {
        target(e.target);
        return;
      };
      var text = this.addText(e);
      target(text);
      text.fire("dblclick")

    });

    var timeout;
    this.stage.on("mousemove touchmove", (e) => {

      if (timeout) {
        window.cancelAnimationFrame(timeout);
      }

      timeout = window.requestAnimationFrame(() => {

        if (e.target instanceof Konva.Stage) {
          if (this.konvaTarget !== false) this.dispatchEvent("konvaTargetChange", [false]);
          this.konvaTarget = false;
          this.konvaJsContent.style.cursor = "text";
          return;
        }

        if (e.target instanceof Konva.Text) {
          if (this.konvaTarget !== e.target) this.dispatchEvent("konvaTargetChange", [e.target]);
          this.konvaTarget = e.target;
          this.konvaJsContent.style.cursor = "auto";
          return;
        }
      });

    });

  }

  async undo() {
    if (this.undoing || this.redoing) return;
    if (this.undoRedoLib.getUndoCache().length === 0) return;
    this.undoing = true;
    this.dispatchEvent("startUndoRedo", ["undo"]);
    // stop blocking so the loading animation can render
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 0)
    });
    if (this.selectedTool === "crop") document.getElementById("cropCancel").click();
    await this.undoRedoLib.undoRedo("undo");
    this.undoing = false;
    this.dispatchEvent("endUndoRedo", ["undo"]);
  }

  async redo() {
    if (this.undoing || this.redoing) return;
    if (this.undoRedoLib.getRedoCache().length === 0) return;
    this.redoing = true;
    this.dispatchEvent("startUndoRedo", ["redo"]);
    // stop blocking so the loading animation can render
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 0)
    });
    if (this.selectedTool === "crop") document.getElementById("cropCancel").click();
    await this.undoRedoLib.undoRedo("redo")
    this.redoing = false;
    this.dispatchEvent("endUndoRedo", ["redo"]);
  }

  getSelectedTargetImageSettings() {
    var settings = {};
    settings.properties = {};
    if (!this.konvaLib.selectedTargetImage) {
      return {
        selectedTarget: false,
        contrast: 1,
        brightness: 1,
        gamma: 1,
        saturation: 1,
        filter: "none",
        blur: 0,
        "bulge/pinch": {
          radius: 0,
          center: [0, 0],
          strength: 0
        },
        "tilt/shift": [0, 0]
      }
    }

    settings.width = this.konvaLib.selectedTargetImage.width();
    settings.height = this.konvaLib.selectedTargetImage.height();

    var appliedFilters = this.appliedPixiFilters[this.konvaLib.selectedTargetImage.photoEditorId];

    for (var i = 0; i < this.selectableFilters.length; i++) {
      if (!appliedFilters) {
        settings.filter = "None";
        break;
      }
      var appliedFilter = false;
      for (let j = 0; j < appliedFilters.length; j++) {
        if (appliedFilters[j][0] === this.selectableFilters[i]) {
          appliedFilter = appliedFilters[j][0];
          break;
        }
      }
      if (!appliedFilter) {
        settings.filter = "None";
        continue;
      }

      settings.filter = appliedFilter;
      break;
    }

    for (var i = 0; i < this.adjustableFilters.length; i++) {
      if (!appliedFilters) {
        settings[this.adjustableFilters[i]] = 0;
        continue;
      }
      var appliedFilter = false;
      for (let j = 0; j < appliedFilters.length; j++) {
        if (appliedFilters[j][0] === this.adjustableFilters[i]) {
          console.log(appliedFilters[j])

          if (appliedFilters[j][1].length > 1) {
            settings[this.adjustableFilters[i]] = appliedFilters[j][1];
          } else {
            settings[this.adjustableFilters[i]] = appliedFilters[j][1][0];
          }

          settings.properties[this.adjustableFilters[i]] = appliedFilters[j][2];
          appliedFilter = true;
          break;
        }
      }
      if (!appliedFilter) {
        settings[this.adjustableFilters[i]] = 0;
      }

    }

    for (var i = 0; i < this.adjustments.length; i++) {
      if (!appliedFilters) {
        settings[this.adjustments[i]] = 1;
        continue;
      }
      var appliedFilter = false;
      for (let j = 0; j < appliedFilters.length; j++) {
        if (appliedFilters[j][0] === this.adjustments[i]) {
          settings[this.adjustments[i]] = appliedFilters[j][1][0];
          appliedFilter = true;
          break;
        }
      }
      if (!appliedFilter) {
        settings[this.adjustments[i]] = 1;
      }

    }

    settings.selectedTarget = true;

    if (!settings["bulge/pinch"]) {
      settings["bulge/pinch"] = {
        radius: 0,
        center: [0, 0],
        strength: 0
      }
    }

    if (!settings["tilt/shift"]) {
      settings["tilt/shift"] = [0, 0]
    }

    return settings;
  }

  addAppliedFilter(filterName, values, imageId, properties) {

    var appliedFilters = this.removeAppliedFilter(filterName, imageId);

    appliedFilters.push([filterName, values, properties])

    return appliedFilters;
  }

  removeAppliedFilter(filterName, imageId) {
    var appliedFilters = this.appliedPixiFilters[imageId] ? this.appliedPixiFilters[imageId] : [];

    for (var i = 0; i < appliedFilters.length; i++) {
      var filter = appliedFilters[i];
      if (filter[0] === filterName || (this.selectableFilters.includes(filter[0]) &&  this.selectableFilters.includes(filterName))) {
        appliedFilters.splice(i, 1);
        break;
      }
    }

    this.appliedPixiFilters[imageId] = appliedFilters;

    return appliedFilters;
  }

  getMatchingFilter(filterName, imageId) {

    var appliedFilters = this.appliedPixiFilters[imageId] ? this.appliedPixiFilters[imageId] : [];

    var appliedFilter;

    for (var i = 0; i < appliedFilters.length; i++) {
      var filter = appliedFilters[i];
      if (filter[0] === filterName || (this.selectableFilters.includes(filter[0]) &&  this.selectableFilters.includes(filterName))) {
        appliedFilter = filter;
        break;
      }
    }

    return appliedFilter;

  }

  getSelectedImageWithNoFilters() {

    var image;

    for (var i = 0; i < this.imagesWithNoFilters.length; i++) {

      var imageWithNoFilters = this.imagesWithNoFilters[i];

      if (imageWithNoFilters.id === this.konvaLib.selectedTargetImage.photoEditorId) {
        image = imageWithNoFilters;
        break;
      }

    }

    return image;

  }

  async getImageWithFilters(image) {

    var appliedFilters = this.appliedPixiFilters[image.id] ? this.appliedPixiFilters[image.id] : [];

    console.log(appliedFilters)

    PixiLib.reuseAppWithImage(this.pixiApp, image);
    PixiLib.resetImageFilters(this.pixiApp.stage.children[0]);
    PixiLib.setImageFilters(this.pixiApp, appliedFilters);

    var imageObj = PixiLib.imageFromApp(this.pixiApp);

    await new Promise((resolve) => {
      imageObj.onload = () => {
        resolve();
      }
    });

    imageObj.id = image.id;

    return imageObj;
  }

  replaceImagesWithNoFilters(newImages) {

    var adjustFiltersCoordinates = (oldImages, newImages ) => {

      for (var i = 0; i < oldImages.length; i++) {
        var oldImage = oldImages[i];
        var newImage = newImages[i];
        var appliedFilters = this.appliedPixiFilters[oldImage.id];
        if (!appliedFilters) continue;

        console.log(appliedFilters)

        for (let i = 0; i < appliedFilters.length; i++) {
          let filter = appliedFilters[i];
          let filterName = filter[0];
          let values = filter[1];
          let properties = filter[2];

          var widthRatio = newImage.width / oldImage.width;
          var heightRatio = newImage.height / oldImage.height;

          console.log(filter)

          switch (filterName) {

            case "bulge/pinch": {

              values[0].radius = Math.round(values[0].radius * (oldImage.width > oldImage.height ? widthRatio : heightRatio));

              break;
            }

            case "twist": {

              values[0] = Math.round(values[0] * widthRatio);
              properties.offset.set(Math.round(properties.offset.x * widthRatio), Math.round(properties.offset.y * heightRatio));

              break;
            }

            case "zoomblur": {

              values[0].center = [Math.round(values[0].center[0] * widthRatio), Math.round(values[0].center[1] * heightRatio)];
              values[0].innerRadius = Math.round(values[0].innerRadius * (oldImage.width > oldImage.height ? widthRatio : heightRatio));
              values[0].radius = Math.round(values[0].radius * (oldImage.width > oldImage.height ? widthRatio : heightRatio));

              break;
            }

          }

        }
      }

    }

    adjustFiltersCoordinates(this.imagesWithNoFilters, newImages);

    this.imagesWithNoFilters = newImages;

  }

  async reapplyImageFilters() {

    for (var i = 0; i < this.imagesWithNoFilters.length; i++) {
      var imageWithNoFilters = this.imagesWithNoFilters[i];

      var imageObj = await this.getImageWithFilters(imageWithNoFilters);

      var [newImageNode, oldImageNode] = this.konvaLib.replaceImageWithSameId(imageObj);

    }

  }

  async setSelectedImageFilter(filterName, values, properties) {

    console.log(this.konvaLib.selectedTargetImage)

    console.log(filterName, values)

    if (!this.konvaLib.selectedTargetImage) return;

    var image = this.getSelectedImageWithNoFilters();

    if (!image) return;

    var matchingFilter = this.getMatchingFilter(filterName, image.id);
    if (!matchingFilter) {
      var undoRedoItem = this.undoRedoLib.typesLib.getFilterRemoveUndoRedo(this.konvaLib.selectedTargetImage, filterName);
    } else {
      var undoRedoItem = this.undoRedoLib.typesLib.getFilterUndoRedo(this.konvaLib.selectedTargetImage, matchingFilter[0], matchingFilter[1], matchingFilter[2]);
    }

    this.undoRedoLib.addToUndoCache(undoRedoItem);

    this.addAppliedFilter(filterName, values, image.id, properties);

    var imageObj = await this.getImageWithFilters(image);

    var [newImageNode, oldImageNode] = this.konvaLib.replaceImageWithSameId(imageObj);

    //this.undoRedoLib.replaceImageNodeInCaches(oldImageNode, newImageNode);
    this.undoRedoLib.addKonvaImageUndoRedoEvents(newImageNode);

    this.konvaLib.stage.draw();

    this.softBrush.setSamplingCanvas(this.konvaLib.stage.toCanvas());

  }

  zoom = (e) => {

    e.preventDefault();

    var factor = e.deltaY < 0 ? 1 : -1
    var zoomConstant = 0.1 * factor;

    var drawingCanvas = document.getElementById("drawingCanvas");
    var konvaCanvas = document.getElementById("overlayCanvasContainer").firstElementChild;

    if (this.scale + zoomConstant <= 0) return;

    this.scale += zoomConstant;

    var offsetLeftOriginX = this.konvaLib.stage.width() * zoomConstant / 2;
    var offsetLeftOriginY = this.konvaLib.stage.height() * zoomConstant / 2;

    this.offsetLeftOriginX += offsetLeftOriginX;
    this.offsetLeftOriginY += offsetLeftOriginY;

    var x = e.offsetX;
    var y = e.offsetY;


    var newX = 1.1 * x;
    var newY = 1.1 * y;

    this.offsetX += (newX - x) * -1 * factor;
    this.offsetY += (newY - y) * -1 * factor;


    if (this.konvaLib.stage.width() * this.scale < this.canvasesZoomContainer.parentElement.offsetWidth ||
        this.konvaLib.stage.height() * this.scale < this.canvasesZoomContainer.parentElement.offsetHeight) {
      this.offsetLeftOriginX = this.offsetLeftOriginY = this.offsetX = this.offsetY = 0;
    }

    this.setScale(parseFloat(this.scale.toFixed(2)));
    this.offsetX = Math.round(this.offsetX);
    this.offsetY = Math.round(this.offsetY);
    this.offsetLeftOriginX = Math.round(this.offsetLeftOriginX);
    this.offsetLeftOriginY = Math.round(this.offsetLeftOriginY);

    this.canvasesZoomContainer.style.height = drawingCanvas.height + "px";
    this.canvasesZoomContainer.style.position= "absolute";
    this.canvasesZoomContainer.style.width = drawingCanvas.width + "px";

    this.updateCanvasCSSTransforms();

    console.log(drawingCanvas.getBoundingClientRect());
    console.log(konvaCanvas.firstElementChild.getBoundingClientRect())

    var scaleOffsetX = this.originalImage.width * (this.scale - this.nativeScale) / 2;
    var scaleOffsetY = this.originalImage.height * (this.scale - this.nativeScale) / 2;

    this.softBrush.setCanvasScale(this.scale)

    //this.drawingCanvasCursor.setCanvasScale(this.scale);
    //this.drawingCanvasCursor.setCursorSize(this.softBrush.getSize() * this.scale);

  }

  // #deprecated
  beginZoomMode() {

    return;

    var canvasesContainer = document.getElementById("canvasesContainer");
    canvasesContainer.style.cursor = "zoom-in";

    var lastX = 0;
    var skipCounter = 0;
    var noMoving = true;

    var mouseMoveEventHandler = (e) => {

      if (skipCounter++ % 2 !== 0) return;

      noMoving = false;

      this.zoom({
        preventDefault: function() {},
        deltaY: e.offsetX > lastX ? -1 : 1,
        offsetX: e.offsetX,
        offsetY: e.offsetY
      });

      lastX = e.offsetX;

    }

    var mouseUpEventHandler = (e) => {
      canvasesContainer.removeEventListener("mousemove", mouseMoveEventHandler);
      canvasesContainer.removeEventListener("mouseup", mouseUpEventHandler);

      if (noMoving) {
        this.zoom({
          preventDefault: function() {},
          deltaY: -1,
          offsetX: e.offsetX,
          offsetY: e.offsetY
        });
      }

      noMoving = true;
    }

    var mouseDownEventHandler = (e) => {
      canvasesContainer.addEventListener("mousemove", mouseMoveEventHandler);
      canvasesContainer.addEventListener("mouseup", mouseUpEventHandler);
    }

    canvasesContainer.addEventListener("mousedown", mouseDownEventHandler);

  }

  toggleSnapToEdges(snap) {
    console.log(snap)
    this.konvaLib.options.snapToEdges = snap;
  }

  setScale(value) {
    this.scale = value;
    if (this.softBrush) this.softBrush.setCanvasScale(value);
  }

  setCanvasSize(width, height, preventUndoCaching) {

    width = parseFloat(width);
    height = parseFloat(height);

    if (!preventUndoCaching) this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getCanvasResizeUndoRedo());

    console.log(this.konvaLib.imagesLayer.offsetX(), this.konvaLib.imagesLayer.offsetY(), this.konvaLib.imagesLayer.x(), this.konvaLib.imagesLayer.y(), this.konvaLib.imagesLayer.width(), this.konvaLib.imagesLayer.height())

    var halfWidth = parseFloat((this.konvaLib.imagesLayer.width() / 2).toFixed(5));
    var halfHeight = parseFloat((this.konvaLib.imagesLayer.height() / 2).toFixed(5));

    if (this.konvaLib.imagesLayer.offsetX() === halfWidth) {
      this.konvaLib.imagesLayer.offsetX(width / 2);
    } else if (this.konvaLib.imagesLayer.offsetX() === halfHeight) {
      this.konvaLib.imagesLayer.offsetX(height / 2);
    }

    if (this.konvaLib.imagesLayer.offsetY() === halfWidth) {
      this.konvaLib.imagesLayer.offsetY(width / 2);
    } else if (this.konvaLib.imagesLayer.offsetY() === halfHeight) {
      this.konvaLib.imagesLayer.offsetY(height / 2);
    }

    if (this.konvaLib.imagesLayer.x() === halfWidth) {
      this.konvaLib.imagesLayer.x(width / 2);
    } else if (this.konvaLib.imagesLayer.x() === halfHeight) {
      this.konvaLib.imagesLayer.x(height / 2);
    }

    if (this.konvaLib.imagesLayer.y() === halfWidth) {
      this.konvaLib.imagesLayer.y(width / 2);
    } else if (this.konvaLib.imagesLayer.y() === halfHeight) {
      this.konvaLib.imagesLayer.y(height / 2);
    }

    console.log(this.konvaLib.imagesLayer.offsetX(), this.konvaLib.imagesLayer.offsetY(), this.konvaLib.imagesLayer.x(), this.konvaLib.imagesLayer.y(), this.konvaLib.imagesLayer.width(), this.konvaLib.imagesLayer.height())

    this.konvaLib.stage.size({
      width: width,
      height: height
    });

    this.konvaLib.transformersStage.size({
      width: width,
      height: height
    });

    this.konvaLib.colorBackgroundImage.size({
      width: width,
      height: height
    });

    this.konvaLib.backgroundImage.size({
      width: width,
      height: height
    });

    this.stage.size({
      width: width,
      height: height
    });

    var drawingCtx = this.drawingCanvas.getContext("2d");
    var drawingImageData = drawingCtx.getImageData(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);

    this.drawingCanvas.width = width;
    this.drawingCanvas.height = height;

    drawingCtx.putImageData(drawingImageData, 0, 0);

    var imageRatio = width / height;
    var canvasRatio = this.canvasesContainer.clientWidth / this.canvasesContainer.clientHeight;

    var scale = imageRatio > canvasRatio ?
      (this.canvasesContainer.clientWidth / width) : this.canvasesContainer.clientHeight / height;

    if (this.canvasesContainer.clientWidth >= width && this.canvasesContainer.clientHeight >= height) {
      scale = 1;
    }

    this.setScale(scale);

    this.updateCanvasCSSTransforms();

    CanvasLib.copyCanvasProperties(this.drawingCanvas, this.cursorCanvas);
    CanvasLib.copyCanvasProperties(this.drawingCanvas, this.colorPickerCanvas);

    this.konvaLib.stage.draw();
    this.konvaLib.transformersStage.draw();
    this.stage.draw();

    this.dispatchEvent("canvasResize", [width, height]);

    this.softBrush.setSamplingCanvas(this.konvaLib.stage.toCanvas());

  }

  updateCanvasCSSTransforms() {
    this.canvasesZoomContainer.style.transform = `translate(${this.offsetLeftOriginX}px, ${this.offsetLeftOriginY}px) translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;

  }

  async loadImage(file) {

    if (this.imageInstanced) return;

    if (!this.hasLoadedOnce) {

      if (this.options.shortCutsEnabled) {

          
        document.addEventListener("keydown", (e) => {
          console.log(this.shortCutsTempDisabled)

          if (this.shortCutsTempDisabled) return;

          switch (e.code) {

            case "KeyC": {
              document.getElementById("cropToolButton").click();
              break;
            }
            case "KeyT": {
              document.getElementById("addTextToolButton").click();
              break;
            }
            case "KeyB": {
              document.getElementById("paintToolButton").click();
              break;
            }
            case "KeyE": {
              document.getElementById("eraseToolButton").click();
              break;
            }
            case "KeyP": {
              document.getElementById("eyedropToolButton").click();
              break;
            }
            case "KeyR": {
              document.getElementById("rotateToolButton").click();
              break;
            }
            case "KeyS": {
              document.getElementById("move-tool-icon").click();
              break;
            }
            case "KeyG": {
              document.getElementById("dragToolButton").click();
              break;
            }

          }

        });

      }

      this.hasLoadedOnce = true;
    }

    this.dispatchEvent("loadingImage", [file]);

    document.getElementById("canvasesContainer").addEventListener("wheel", (e) => {
      if (this.editingText) this.endTextEditing();
      this.zoom(e);
    });

    this.beginDragModeEventHandler = () => {
      this.beginDragMode();
    };

    document.getElementById("canvasesContainer").addEventListener("mousedown", this.beginDragModeEventHandler);

    this.drawingCanvas = document.getElementById("drawingCanvas");
    this.drawingCanvasCtx = this.drawingCanvas.getContext("2d");
    this.cursorCanvas = document.getElementById("cursorCanvas");
    this.konvaImagesContainer = document.getElementById("konvaImagesContainer");
    this.konvaTransformersContainer = document.getElementById("konvaTransformersContainer");
    this.colorPickerCanvas = document.getElementById("colorPickerCanvas");
    this.canvasesContainer = document.getElementById("canvasesContainer");
    this.canvasesZoomContainer = document.getElementById("canvasesZoomContainer")

    this.canvasesZoomContainer.style.visibility = "hidden";

    var image;

    if (file instanceof HTMLImageElement) {
      image = file;
      file = await imageConversion.imagetoCanvas(file);
      file = await imageConversion.canvastoFile(file);

    } else if (file instanceof File) {

      var url = await imageConversion.filetoDataURL(file);
      image = await imageConversion.dataURLtoImage(url);
    }

    if (this.options.downscaleImage) {
      if (image.width > this.options.maxImageSize || image.height > this.options.maxImageSize) {

        /*
        file = await readAndCompressImage(file, {
          quality: this.options.downScaledImageQuality,
          maxWidth: this.options.maxImageSize,
          maxHeight: this.options.maxImageSize
        }); */

        var resizeRatio = this.options.maxImageSize / Math.max(image.width, image.height);

        var destinationCanvas = document.createElement("canvas");
        destinationCanvas.width = image.width * resizeRatio;
        destinationCanvas.height = image.height * resizeRatio;

        await pica.resize(image, destinationCanvas, {
          unsharpAmount: 80,
          unsharpRadius: 0.6,
          unsharpThreshold: 2
        });

        image = await ImageLib.canvasToImage(destinationCanvas);

        /*
        let url = await imageConversion.filetoDataURL(file);
        image = await imageConversion.dataURLtoImage(url); */
      }
    }

    if (!image) return;

    this.colorPickerCanvas.height = image.height;
    this.colorPickerCanvas.width = image.width;

    this.canvasesZoomContainer.style.width = image.width + "px";
    this.canvasesZoomContainer.style.height = image.height + "px";
    this.canvasesZoomContainer.style.position = "absolute";

    this.canvasWidth = image.width;
    this.canvasHeight = image.height;

    var imageRatio = image.width / image.height;
    var canvasRatio = this.canvasesContainer.clientWidth / this.canvasesContainer.clientHeight;

    var scale = imageRatio > canvasRatio ?
      (this.canvasesContainer.clientWidth / image.width) : this.canvasesContainer.clientHeight / image.height;

    if (this.canvasesContainer.clientWidth >= image.width && this.canvasesContainer.clientHeight >= image.height) {
      scale = 1;
    }

    this.setScale(scale);
    this.nativeScale = scale;

    this.originalImage = image;

    image.id = this.runningImageId++;

    var initKonvaLib = new Promise((resolve) => {

      this.konvaLib = new KonvaLib({
        containerId: "konvaImagesContainer",
        transformersContainerId: "konvaTransformersContainer",
        width: image.width,
        height: image.height,
        initialScale: this.nativeScale,
        snapToEdges: true
      }, () => {
        resolve();
      });

    });

    await initKonvaLib;

    this.konvaImagesContainer.firstElementChild.style.boxShadow = "rgb(11, 11, 11) 4px 10px 4px";

    var [konvaImage, transformer, overlayTransformer] = this.konvaLib.addImage(image, {
      targetable: true,
      alignCenter: true
    });

    this.rotateOriginOffsetX = konvaImage.width() / 2;
    this.rotateOriginOffsetY = konvaImage.height() / 2;

    this.undoRedoLib.addKonvaImageUndoRedoEvents(konvaImage, this.konvaLib);
    this.undoRedoLib.addKonvaTransformerUndoRedoEvents(konvaImage, transformer);
    this.undoRedoLib.addKonvaTransformerUndoRedoEvents(konvaImage, overlayTransformer);

    document.getElementById("konvaImagesContainer").style.pointerEvents = "auto";

    var first = true;
    var timeout;

    this.konvaPreviewTargetChangeEventHandler = (e) => {

      if (timeout) {
        window.cancelAnimationFrame(timeout);
      }

      timeout = window.requestAnimationFrame(() => {

        if (this.konvaTarget !== e.target) this.dispatchEvent("konvaTargetChange", [e.target]);
        this.konvaTarget = e.target;
        if (this.konvaTarget instanceof Konva.Image) {
          this.konvaLib.previewTargetImage(e.target);
        }
      });

    }

    this.konvaLib.stage.on("mousemove", this.konvaPreviewTargetChangeEventHandler);

    this.konvaTargetChangeEventHandler = (e) => {
      if (e.evt.button === 2) return;
      if (e.target instanceof Konva.Image) {
        console.log("targeting")
        var targeted = this.konvaLib.targetImage(e.target);
        if (targeted) this.dispatchEvent("imageTargetChange", [e.target]);
      }
    }

    this.konvaLib.stage.on("click tap", this.konvaTargetChangeEventHandler);

    this.konvaLib.stage.on("mouseleave", () => {
      if (this.konvaLib.transformerIsTransforming()) {
        var redraw = () => {
          if (!draw) return;
          setTimeout(() => {
            this.konvaLib.stage.batchDraw();
            this.konvaLib.transformersStage.batchDraw();
            redraw();
          }, 1000 / 60)
        }
        var mouseUpEvent = () => {
          draw = false;
          document.removeEventListener("mouseup", mouseUpEvent);
        }
        var draw = true;
        redraw();
        document.addEventListener("mouseup", mouseUpEvent);
      }
      if (this.konvaLib.previewedTargetImage) this.konvaLib.unPreviewTargetImage(this.konvaLib.previewedTargetImage);
    });

    this.initKonva(image);

    this.drawingCanvas.width = image.width;
    this.drawingCanvas.height = image.height;

    CanvasLib.copyCanvasProperties(this.drawingCanvas, this.cursorCanvas);
    CanvasLib.copyCanvasProperties(this.drawingCanvas, this.colorPickerCanvas);

    this.konvaImagesContainer.firstElementChild.style.position = `absolute`;
    //this.konvaImagesContainer.style.overflow = "hidden";

    this.konvaTransformersContainer.firstElementChild.style.position = `absolute`;
    //this.konvaTransformersContainer.style.overflow = "hidden";

    this.imagesWithNoFilters = [image];

    var imageAsCanvas = await imageConversion.imagetoCanvas(image);

    this.pixiApp = PixiLib.appFromImage(imageAsCanvas.toDataURL());

    /*
    var konvaDrawingCanvas = CanvasLib.cloneCanvas(this.drawingCanvas);
    var konvaCursorCanvas = CanvasLib.cloneCanvas(this.drawingCanvas); */

    /*
    let options = {
      draggable: false,
      enableTransformer: false,
      zIndex: 10,
      addToMainLayer: true,
      preventTarget: true
    } */

    /*
    this.konvaDrawingCanvas = konvaDrawingCanvas;
    this.konvaDrawingCanvasNode = this.konvaLib.addImage(konvaDrawingCanvas, options);
    this.konvaCursorCanvas = konvaCursorCanvas;
    this.konvaCursorCanvasNode = this.konvaLib.addImage(konvaCursorCanvas, options); */

    this.softBrush = new SoftBrush(this.drawingCanvas, {
      size: this.defaultBrushSize,
      hardness: this.defaultBrushHardness,
      cursorCanvas: this.cursorCanvas,
      color: [255, 255, 255, 1],
      brushPreviewEnabled: true,
      canvasScale: this.scale,
      enabled: false
    });

    var redrawCounter = 0;

    var lastDrawnPointsAmount = 0;

    /*
    this.softBrush.on("draw", (drawnPointsAmount) => {

      if (redrawCounter++ >= 100) {
        console.log("draw")
        redrawCounter = 0;
        this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getDrawingUndoRedo(null, drawnPointsAmount - lastDrawnPointsAmount));
        lastDrawnPointsAmount = drawnPointsAmount;
      }

    }); */

    this.softBrush.on("drawSegment", (drawSegment) => {
      console.log(drawSegment)
      this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getDrawingUndoRedo(drawSegment));
    });

    this.softBrush.on("drawbegin", () => {
      console.log("drawbegin")
      //this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getDrawingUndoRedo());
    });

    this.imageInstanced = true;

    this.enableDrawingColorPicker();
    this.enableBackgroundColorPicker();
    this.enableDrawing();

    /*
    this.konvaDrawingCanvasNode.listening(false);
    this.konvaCursorCanvasNode.listening(false); */

    var resizeRatio = 150 / Math.max(image.width, image.height);

    var thumbnailCanvas = document.createElement("canvas");
    thumbnailCanvas.width = image.width * resizeRatio;
    thumbnailCanvas.height = image.height * resizeRatio;

    await pica.resize(image, thumbnailCanvas, {
      unsharpAmount: 80,
      unsharpRadius: 0.6,
      unsharpThreshold: 2
    });

    var thumbnailImage = await ImageLib.canvasToImage(thumbnailCanvas);

    this.filterPreviews.push([
      konvaImage,
      this.generateFilterPreviewImages(thumbnailImage)
    ]);

    this.updateCanvasCSSTransforms();

    this.getImageDataReset();

    setTimeout(() => {
      document.getElementById("move-tool-icon").click();
    }, 50)

    this.canvasesZoomContainer.style.visibility = "visible";

    this.dispatchEvent("loadImage", [{
      konvaImage: konvaImage,
      imageObj: image
    }]);

    this.dispatchEvent("imageTargetChange", [konvaImage]);

  }

  async importImage(file) {

    if (file instanceof HTMLImageElement) {
      var imageObj = file;
    } else { // assume that the file is a File blob.
      var dataURL = await imageConversion.filetoDataURL(file);
      var imageObj = await imageConversion.dataURLtoImage(dataURL);
    }

    if (this.options.downscaleImage) {
      if (imageObj.width > this.options.maxImageSize || imageObj.height > this.options.maxImageSize) {
        console.log(this.options.maxImageSize / Math.max(imageObj.width, imageObj.height))

        /*
        file = await readAndCompressImage(file, {
          quality: 1,
          maxWidth: this.options.maxImageSize,
          maxHeight: this.options.maxImageSize
        });

        let url = await imageConversion.filetoDataURL(file);
        imageObj = await imageConversion.dataURLtoImage(url); */

        var resizeRatio = this.options.maxImageSize / Math.max(imageObj.width, imageObj.height);

        var destinationCanvas = document.createElement("canvas");
        destinationCanvas.width = imageObj.width * resizeRatio;
        destinationCanvas.height = imageObj.height * resizeRatio;

        await pica.resize(imageObj, destinationCanvas, {
          unsharpAmount: 80,
          unsharpRadius: 0.6,
          unsharpThreshold: 2
        });

        imageObj = await ImageLib.canvasToImage(destinationCanvas);
      }
    }

    imageObj.id = this.runningImageId++;

    var [konvaImage, transformer, overlayTransformer] = this.konvaLib.addImage(imageObj, {
      targetable: true,
      alignCenter: true
    });

    this.undoRedoLib.addKonvaImageUndoRedoEvents(konvaImage, this.konvaLib);
    this.undoRedoLib.addKonvaTransformerUndoRedoEvents(konvaImage, transformer);
    this.undoRedoLib.addKonvaTransformerUndoRedoEvents(konvaImage, overlayTransformer);

    this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getImageAddUndoRedo(konvaImage));

    // this.konvaLib.rearrangeImagesWithNodeLast(this.konvaDrawingCanvasNode);

    // this.konvaLib.bringTransformersToFront();

    this.imagesWithNoFilters.push(imageObj);

    var resizeRatio = 150 / Math.max(imageObj.width, imageObj.height);

    var thumbnailCanvas = document.createElement("canvas");
    thumbnailCanvas.width = imageObj.width * resizeRatio;
    thumbnailCanvas.height = imageObj.height * resizeRatio;

    await pica.resize(imageObj, thumbnailCanvas, {
      unsharpAmount: 80,
      unsharpRadius: 0.6,
      unsharpThreshold: 2
    });

    var thumbnailImage = await ImageLib.canvasToImage(thumbnailCanvas);

    this.filterPreviews.push([
      konvaImage,
      this.generateFilterPreviewImages(thumbnailImage)
    ]);

    this.dispatchEvent("importImage", [{
      konvaImage: konvaImage,
      imageObj: imageObj
    }]);

    this.dispatchEvent("imageTargetChange", [konvaImage]);

    setTimeout(() => {
      document.getElementById("move-tool-icon").click();
    }, 50)

    this.softBrush.setSamplingCanvas(this.konvaLib.stage.toCanvas());

  }

  deleteSelectedImage() {
    if (!this.konvaTarget instanceof this.Konva.Image) return;
    this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getImageDeleteUndoRedo(this.konvaTarget));
    this.konvaLib.deleteImage(this.konvaTarget);
    this.dispatchEvent("imageTargetChange", [false]);
    this.softBrush.setSamplingCanvas(this.konvaLib.stage.toCanvas());
    //this.imagesWithNoFilters.splice(this.imagesWithNoFilters.indexOf(this.getImageWithNoFiltersById(this.konvaTarget.photoEditorId)), 1);
  }

  getImageWithNoFiltersById(id) {
    for (var i = 0; i < this.imagesWithNoFilters.length; i++) {
      var image = this.imagesWithNoFilters[i];
      if (image.id === id) return image;
    }
  }

  bringSelectedImageToFront() {
    if (!this.konvaTarget instanceof this.Konva.Image) return;
    this.konvaLib.bringImageToFront(this.konvaTarget);
  }

  getFilterPreviewImages(konvaImage) {

    var filterPreview = [];

    this.filterPreviews.forEach((preview) => {
      if (preview[0].photoEditorId === konvaImage.photoEditorId) filterPreview = preview[1];
    });

    return filterPreview;
  }

  generateFilterPreviewImages(image) {

    var filterPreviewImages = [];

    this.selectableFilters.forEach((filterName) => {

      var pixiApp = PixiLib.reuseAppWithImage(this.pixiApp, image);
      PixiLib.setImageFilter(pixiApp, filterName);
      var appImage = PixiLib.imageFromApp(pixiApp);

      filterPreviewImages.push(appImage);

    });

    return filterPreviewImages;

  }

  setSelectedFont(fontName) {
    this.selectedFont = fontName;
    if (this.konvaTextTarget) {
      this.konvaTextTarget.fontFamily(fontName);
      var transformer = this.konvaLib.getNodeTransformer(this.konvaTextTarget, this.layer);
      if (transformer) transformer.forceUpdate();
      this.stage.batchDraw();
    }

  }

  addText(e, initialText) {

    this.focusCanvasContainer("overlayCanvasContainer")

    var layer = this.layer;

    var scaleOffsetX = this.originalImage.width * (this.scale - this.nativeScale) / this.scale / 2;
    var scaleOffsetY = this.originalImage.height * (this.scale - this.nativeScale) / this.scale / 2;

    var zoomOffsetLeftOriginX = this.offsetLeftOriginX / this.scale * -1;
    var zoomOffsetLeftOriginY = this.offsetLeftOriginY / this.scale * -1;

    var zoomOffsetX = this.offsetX / this.scale * -1;
    var zoomOffsetY = this.offsetY / this.scale * -1;

    if (this.nativeScale > this.scale) {
      scaleOffsetX = scaleOffsetY = zoomOffsetLeftOriginX = zoomOffsetLeftOriginY = zoomOffsetX = zoomOffsetY = 0;
    }

    var textPositionX = this.layer.offsetX() + scaleOffsetX + zoomOffsetLeftOriginX + zoomOffsetX;
    var textPositionY = this.layer.offsetY() + scaleOffsetY + zoomOffsetLeftOriginY + zoomOffsetY;

    var text = new Konva.Text({
      x: this.layer.offsetX() + e.evt.offsetX,
      y: this.layer.offsetY() + e.evt.offsetY,
      text: 'Simple Text',
      fontSize: 70 / this.scale,
      fontFamily: this.selectedFont,
      fill: this.selectedTextColor.rgbaString,
      draggable: false
    });

    // text.x(text.x() < this.layer.offsetX() ? this.layer.offsetX() : text.x());
    // text.y(text.y() < this.layer.offsetY() ? this.layer.offsetY() : text.y());

    text.on("mousedown", (e) => {
      e.evt.cancelBubble = true
    })

    text.on("dragstart", (e) => {
      this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getTextTransformUndoRedo(text));
    });

    layer.add(text);

    var transformer = new Konva.Transformer({
      nodes: [text],
      rotateAnchorOffset: 60,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      anchorSize: Math.max(5, this.nativeScale ? 24 / this.nativeScale : 24),
      rotationSnaps: [0, 90, 180, 270],
      borderStroke: "rgb(0 149 255)",
      anchorStroke: "rgb(0 149 255)",
      anchorCornerRadius: this.nativeScale ? 30 / this.nativeScale : 30,
      anchorStrokeWidth: this.nativeScale ? 2 / this.nativeScale : 2,
      borderStrokeWidth: this.nativeScale ? 2 / this.nativeScale : 2,
      anchorFill: "rgba(255, 255, 255, 0.5)"
    })

    transformer.on("mousedown", (e) => {
      e.evt.cancelBubble = true
      this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getTextTransformUndoRedo(text));
    })

    layer.add(transformer);

    this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getTextAddUndoRedo(text, transformer));

    text.text(initialText ? initialText : "Add text")

    layer.draw();

    text.on('dblclick', () => {

      //if (this.konvaTextTarget === text) this.untargetKonvaText(text);

      this.shortCutsTempDisabled = true;

      var removeTextarea = () => {

        this.shortCutsTempDisabled = false;
        this.editingText = false;

        textarea.parentNode.removeChild(textarea);
        window.removeEventListener('click', handleOutsideClick);
        text.show();
        this.targetKonvaText(text);
        transformer.forceUpdate();
        layer.draw();

      }

      this.endTextEditing = () => {
        if (textarea.value === "") {
          removeTextarea();
          this.deleteText(text);
        } else {
          text.text(textarea.value);
          removeTextarea();
        }

      }

      var handleOutsideClick = (e) => {
        if (e.target !== textarea) {
          this.endTextEditing();
        }
      }

      this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getTextTransformUndoRedo(text));

      this.editingText = true;

      text.hide();
      transformer.hide();
      layer.draw();

      var textPosition = text.absolutePosition();

      var stageBox = this.stage.container().getBoundingClientRect();

      var containerOffsetX = Math.max(0, (this.canvasesContainer.offsetWidth - this.stage.width() * this.scale) / 2);
      var containerOffsetY = Math.max(0, (this.canvasesContainer.offsetHeight - this.stage.height() * this.scale) / 2);

      var scaleZoomOffsetX = (this.canvasesContainer.clientWidth - this.konvaImagesContainer.firstElementChild.offsetWidth * this.scale) / 2;
      var scaleZoomOffsetY = (this.canvasesContainer.clientHeight - this.konvaImagesContainer.firstElementChild.offsetHeight * this.scale) / 2;

      if (scaleZoomOffsetX > 0) scaleZoomOffsetX = 0;
      if (scaleZoomOffsetY > 0) scaleZoomOffsetY = 0;

      var zoomOffsetX = this.offsetLeftOriginX + this.offsetX;
      var zoomOffsetY = this.offsetLeftOriginY + this.offsetY;

      var areaPosition = {
        x: scaleZoomOffsetX + zoomOffsetX + containerOffsetX + textPosition.x * this.scale,
        y: scaleZoomOffsetY + zoomOffsetY + containerOffsetY + textPosition.y * this.scale,
      };

      var textarea = document.createElement('textarea');
      this.canvasesContainer.appendChild(textarea);

      textarea.value = text.text();
      textarea.style.position = 'absolute';
      textarea.style.top = areaPosition.y + 'px';
      textarea.style.left = areaPosition.x + 'px';

      // added (text.fontSize() * text.getAbsoluteScale().x * this.scale * 0.5) to fix jumping to another line for some reason. adds 0.5 * fontsize to width to fix this
      textarea.style.width = text.width() * text.getAbsoluteScale().x * this.scale - text.padding() * 2 + (text.fontSize() * text.getAbsoluteScale().x * this.scale * 0.5) + 'px';

      textarea.style.height = text.height() - text.padding() * 2 + 5 + 'px';
      textarea.style.fontSize = text.fontSize() * text.getAbsoluteScale().x * this.scale + 'px';
      textarea.style.border = 'none';
      textarea.style.padding = '0px';
      textarea.style.margin = '0px';
      textarea.style.overflow = 'hidden';
      textarea.style.background = 'none';
      textarea.style.outline = 'none';
      textarea.style.resize = 'none';
      textarea.style.lineHeight = text.lineHeight();
      textarea.style.fontFamily = text.fontFamily();
      textarea.style.transformOrigin = 'left top';
      textarea.style.textAlign = text.align();
      textarea.style.color = text.fill();
      textarea.style.zIndex = "100000";

      var rotation = text.rotation();
      var transform = '';

      if (rotation) {
        transform += 'rotateZ(' + rotation + 'deg)';
      }

      var px = 0;

      transform += 'translateY(-' + px + 'px)';
      textarea.style.transform = transform;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 3 + 'px';

      textarea.focus();

      var textareaWidth = textarea.offsetWidth;

      textarea.addEventListener('keydown', (e) => {

        // +1 as lazy fix, doesn't matter if we remove characters but momentarily add 1 font-size too much width
        textarea.style.width = (textarea.value.length + 1) * text.fontSize() * text.getAbsoluteScale().x * this.scale + "px";

        if (e.keyCode === 13 && !e.shiftKey) {
          text.text(textarea.value);
          removeTextarea();
        }

        if (e.keyCode === 27) {
          removeTextarea();
        }

        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + text.fontSize() * this.scale + 'px';

      });

      textarea.select();

      setTimeout(() => {
        window.addEventListener('click', handleOutsideClick);
      });

    });

    document.getElementById("overlayCanvasContainer").style.pointerEvents = "auto"

    this.activeTransformers.push(transformer);

    return text;
  }

  getKonvaTarget() {
    return this.konvaTarget;
  }

  beginDragMode() {

    if (this.selectedTool !== "drag") return;

    this.konvaImagesContainer.style.cursor = "grabbing";

    this.dragModeEventHandler = (e) => {

      this.offsetX += e.movementX;
      this.offsetY += e.movementY;

      this.updateCanvasCSSTransforms();
    }

    this.dragModeMouseupEventHandler = (e) => {
      this.endDragMode();
      this.konvaImagesContainer.style.cursor = "grab";
    }

    this.dragModeMouseoutEventHandler = (e) => {
      this.endDragMode();
      this.konvaImagesContainer.style.cursor = "grab";
    }

    console.log("adding drag mode event listeners..")
    this.canvasesContainer.addEventListener("mousemove", this.dragModeEventHandler);
    this.canvasesContainer.addEventListener("mouseup", this.dragModeMouseupEventHandler);
    this.canvasesContainer.addEventListener("mouseout", this.dragModeMouseoutEventHandler);
  }

  endDragMode() {
    console.log("removing drag mode event listeners..")
    this.canvasesContainer.removeEventListener("mousemove", this.dragModeEventHandler);
    this.canvasesContainer.removeEventListener("mouseup", this.dragModeMouseupEventHandler);
    this.canvasesContainer.removeEventListener("mouseout", this.dragModeMouseoutEventHandler);
  }

  enableColorPickerMode() {

    var initColorPickerMode = () => {

      function getColorAt(x, y, imageData) {

        x = Math.round(x);
        y = Math.round(y);

        var index = (y * imageData.width * 4) + x * 4;

        return [
          imageData.data[index],
          imageData.data[index + 1],
          imageData.data[index + 2],
          imageData.data[index + 3]
        ]

      }

      var timeout;

      this.colorPickerMoveEventHandler = (e) => {

        console.log("moving")

        if (timeout) {
          window.cancelAnimationFrame(timeout);
        }

        timeout = window.requestAnimationFrame(() => {

          if (this.colorPickerModeDisabled) return;

          //var pos = this.konvaLib.stage.getPointerPosition();

          var boundingRect = this.colorPickerCanvas.getBoundingClientRect();

          var x = e.clientX - boundingRect.x;
          var y = e.clientY - boundingRect.y;

          var pos = {x: x / this.scale, y: y / this.scale}

          var x = pos.x * this.scale;
          var y = pos.y * this.scale;

          var offsetX = (this.canvasesContainer.clientWidth - this.konvaImagesContainer.firstElementChild.clientWidth * this.scale) / 2;
          var offsetY = (this.canvasesContainer.clientHeight - this.konvaImagesContainer.firstElementChild.clientHeight * this.scale) / 2;

          /*
          cursorImage.style.left = this.offsetLeftOriginX + this.offsetX + offsetX + x * this.scale + -1 +"px";
          cursorImage.style.top = this.offsetLeftOriginY + this.offsetY + offsetY + y *this.scale - 15 +"px";

          colorPreview.style.left = this.offsetLeftOriginX + this.offsetX + offsetX + e.offsetX * this.scale + 8 + "px";
          colorPreview.style.top = this.offsetLeftOriginY + this.offsetY + offsetY + e.offsetY * this.scale + -4 + "px"; */

          this.colorPickerCursorImage.style.left = this.offsetLeftOriginX + this.offsetX + x + offsetX - 1 + "px";
          this.colorPickerCursorImage.style.top = this.offsetLeftOriginY + this.offsetY + y + offsetY - 16 + "px";

          this.colorPickerColorPreview.style.left = this.offsetLeftOriginX + this.offsetX + x + offsetX + 8 + "px";
          this.colorPickerColorPreview.style.top = this.offsetLeftOriginY + this.offsetY + y + offsetY - 4 + "px";

          var textCanvasColor = getColorAt(pos.x, pos.y, this.textCanvasImageData);
          var konvaImagesColor = getColorAt(pos.x, pos.y, this.konvaImagesImageData);
          var drawingCanvasColor = getColorAt(pos.x, pos.y, this.drawingCanvasImageData);

          if (konvaImagesColor[3] > 0) {
            var color = konvaImagesColor;
          }

          if (drawingCanvasColor[3] > 0) {
            var color = drawingCanvasColor;
          }

          if (textCanvasColor[3] > 0) {
            var color = textCanvasColor;
          }

          if (!color) return;

          this.colorPickerColorPreview.style.backgroundColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;

        });

      }

      this.colorPickerClickEventHandler = (e) => {

        if (this.colorPickerModeDisabled) return;

        //var pos = this.konvaLib.stage.getPointerPosition();

        var boundingRect = this.colorPickerCanvas.getBoundingClientRect();

        var x = e.clientX - boundingRect.x;
        var y = e.clientY - boundingRect.y;

        var pos = {x: x / this.scale, y: y / this.scale}

        var textCanvasColor = getColorAt(pos.x, pos.y, this.textCanvasImageData);
        var konvaImagesColor = getColorAt(pos.x, pos.y, this.konvaImagesImageData);
        var drawingCanvasColor = getColorAt(pos.x, pos.y, this.drawingCanvasImageData);

        if (konvaImagesColor[3] > 0) {
          var color = konvaImagesColor;
        }

        if (drawingCanvasColor[3] > 0) {
          var color = drawingCanvasColor;
        }

        if (textCanvasColor[3] > 0) {
          var color = textCanvasColor;
        }

        if (!color) return;

        var iroColor = new iro.Color({r: color[0], g: color[1], b: color[2], a: color[3]});

        if (this.textColorPicker) {
          this.textColorPicker.setColors([iroColor]);
          this.textColorPicker.setActiveColor(0);
        }

        if (this.drawingColorPicker) {
          this.drawingColorPicker.setColors([iroColor]);
          this.drawingColorPicker.setActiveColor(0);
        }

        this.selectedTextColor = iroColor;
        this.selectedDrawingColor = iroColor;

        this.softBrush.setColor([iroColor.red, iroColor.green, iroColor.blue, iroColor.alpha]);

        document.getElementById("text-color-picker-button").style.backgroundColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
        document.getElementById("drawing-color-picker-button").style.backgroundColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
        document.getElementById("eyedrop-color-picker-button").style.backgroundColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;

      }

      this.colorPickerMouseoutEventHandler = (e) => {

        if (this.colorPickerModeDisabled) return;

        this.colorPickerCursorImage.style.visibility = "hidden";
        this.colorPickerColorPreview.style.visibility = "hidden";

      }

      this.colorPickerMouseinEventHandler = (e) => {

        if (this.colorPickerModeDisabled) return;

        this.colorPickerCursorImage.style.visibility = "visible";
        this.colorPickerColorPreview.style.visibility = "visible";

      }

      this.colorPickerCanvas.onmousemove = this.colorPickerMoveEventHandler;
      this.colorPickerCanvas.onmouseover = this.colorPickerMouseinEventHandler;
      this.colorPickerCanvas.onmouseout = this.colorPickerMouseoutEventHandler;
      this.colorPickerCanvas.onmousedown = this.colorPickerClickEventHandler;

      /*
      this.colorPickerCanvas.addEventListener("mousemove", this.colorPickerMoveEventHandler);
      this.colorPickerCanvas.addEventListener("mouseover", this.colorPickerMouseinEventHandler);
      this.colorPickerCanvas.addEventListener("mouseout", this.colorPickerMouseoutEventHandler);
      this.colorPickerCanvas.addEventListener("click", this.colorPickerClickEventHandler); */

      this.colorPickerModeInitialized = true;
    }

    setTimeout(() => {
      this.konvaAsCanvas = this.stage.toCanvas();
      this.konvaImagesAsCanvas = this.konvaLib.stage.toCanvas();

      this.textCanvasImageData = this.konvaAsCanvas.getContext("2d").getImageData(0, 0, this.stage.width(), this.stage.height());
      this.konvaImagesImageData = this.konvaImagesAsCanvas.getContext("2d").getImageData(0, 0, this.konvaLib.stage.width(), this.konvaLib.stage.height());
      this.drawingCanvasImageData = CanvasLib.cloneCanvas(this.drawingCanvas).getContext("2d").getImageData(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    }, 0)

    this.colorPickerModeDisabled = false;

    this.focusCanvasContainer("colorPickerCanvasContainer");

    this.colorPickerCanvas.style.cursor = "none";

    var cursorImage = document.createElement("img");
    var colorPreview = document.createElement("div");

    this.colorPickerCursorImage = cursorImage;
    this.colorPickerColorPreview = colorPreview;

    cursorImage.src = "images/eyedrop.svg";
    cursorImage.width = "18";
    cursorImage.height = "18";
    cursorImage.style.top = "-100px";
    cursorImage.style.left = "-100px";

    cursorImage.style.pointerEvents = "none";
    cursorImage.style.position = "absolute";

    colorPreview.style.width = "18px";
    colorPreview.style.height = "18px";
    colorPreview.style.border = "2px solid white";
    colorPreview.style.borderRadius = "18px";

    colorPreview.style.pointerEvents = "none";
    colorPreview.style.position = "absolute";
    colorPreview.style.top = "-100px";
    colorPreview.style.left = "-100px";

    this.canvasesContainer.appendChild(cursorImage);
    this.canvasesContainer.appendChild(colorPreview);

    if (!this.colorPickerModeInitialized) initColorPickerMode();

  }

  disableColorPickerMode() {

    if (!this.colorPickerCursorImage) return;

    this.canvasesContainer.removeChild(this.colorPickerCursorImage);
    this.canvasesContainer.removeChild(this.colorPickerColorPreview);

    this.colorPickerModeDisabled = true;

  }

  async rotate(preventUndoCache, negative, preventDrawing) {

    this.dispatchEvent("beginRotate", []);

    // stop blocking so the loading animation can render
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 0)
    });

    if (!preventUndoCache) this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getRotateUndoRedo());

    /*
    var degToRad = Math.PI / 180

    var rotatePoint = ({x, y}, deg) => {
        var rcos = Math.cos(deg * degToRad), rsin = Math.sin(deg * degToRad)
        return {x: x*rcos - y*rsin, y: y*rcos + x*rsin}
    }

    //current rotation origin (0, 0) relative to desired origin - center (node.width()/2, node.height()/2)
    var topLeft = {x:-this.konvaLib.imagesLayer.width()/2, y:-this.konvaLib.imagesLayer.height()/2}
    var current = rotatePoint(topLeft, this.konvaLib.imagesLayer.rotation())
    var rotated = rotatePoint(topLeft, 90)
    var dx = rotated.x - current.x, dy = rotated.y - current.y

    console.log(this.konvaLib.imagesLayer.x(), this.konvaLib.imagesLayer.y(), this.konvaLib.imagesLayer.offsetX(), this.konvaLib.imagesLayer.offsetY())
    console.log(dx, dy)

    this.konvaLib.imagesLayer.rotation(90)
    this.konvaLib.imagesLayer.x(this.konvaLib.imagesLayer.x() + dx)
    this.konvaLib.imagesLayer.y(this.konvaLib.imagesLayer.y() + dy) */

    /*
    var x = this.rotateOriginOffsetX;
    var y = this.rotateOriginOffsetY; */


    /*
    var x = this.konvaLib.imagesLayer.x() - this.cropOffsetX;
    var y = this.konvaLib.imagesLayer.y() - this.cropOffsetY; */


    /*
    var x = this.konvaLib.imagesLayer.x();
    var y = this.konvaLib.imagesLayer.y(); */

    /*
    var rotatePoint = ({ x, y }, rad) => {
      var rcos = Math.cos(rad);
      var rsin = Math.sin(rad);
      return { x: x * rcos - y * rsin, y: y * rcos + x * rsin };
    };

    // will work for shapes with top-left origin, like rectangle
    function rotateAroundCenter(node, rotation) {
      //current rotation origin (0, 0) relative to desired origin - center (node.width()/2, node.height()/2)
      var topLeft = { x: -node.width() / 2, y: -node.height() / 2 };
      var current = rotatePoint(topLeft, Konva.getAngle(node.rotation()));
      var rotated = rotatePoint(topLeft, Konva.getAngle(rotation));
      var dx = rotated.x - current.x,
        dy = rotated.y - current.y;

      node.rotation(rotation);
      node.x(node.x() + dx);
      node.y(node.y() + dy);
    } */

    // then use it
    //rotateAroundCenter(this.konvaLib.imagesLayer, 90);

    var width = this.konvaLib.imagesLayer.width();
    var height = this.konvaLib.imagesLayer.height();

    /*
    var x = this.konvaLib.imagesLayer.width() / 2;
    var y = this.konvaLib.imagesLayer.height() / 2;



    this.konvaLib.imagesLayer.x(y);
    this.konvaLib.imagesLayer.y(x);


    this.konvaLib.imagesLayer.rotate(90); */

    this.konvaLib.rotateLayerContents(this.konvaLib.imagesLayer, negative);

    this.konvaLib.stage.size({
      width: this.konvaLib.stage.height(),
      height: this.konvaLib.stage.width(),
    })

    //if (this.konvaLib.count === 2) return;

    /*
    this.konvaLib.imagesLayer.add(new Konva.Rect({
      width: this.konvaLib.imagesLayer.width(),
      height: this.konvaLib.imagesLayer.height(),
      x: 0,
      y: 0,
      fill: "grey",
      draggable: true
    })) */

    //this.konvaLib.imagesLayer.rotate(90);

    /*
    this.konvaLib.imagesLayer.x(0)
    this.konvaLib.imagesLayer.y(0)

    this.konvaLib.stage.draw() */

    /*
    var offsetX = this.konvaLib.stage.offsetX();
    var offsetY = this.konvaLib.stage.offsetY();

    this.konvaLib.stage.x(offsetY);
    this.konvaLib.stage.y(offsetX); */

    this.konvaLib.backgroundImage.size({
      width: this.konvaLib.backgroundImage.height(),
      height: this.konvaLib.backgroundImage.width(),
    });

    this.konvaLib.colorBackgroundImage.size({
      width: this.konvaLib.colorBackgroundImage.height(),
      height: this.konvaLib.colorBackgroundImage.width(),
    });

    /*
    var ctx = this.konvaDrawingCanvas.getContext("2d");
    var drawingImageData = ctx.getImageData(0, 0, this.konvaDrawingCanvas.width, this.konvaDrawingCanvas.height);

    console.log(this.konvaDrawingCanvasNode.width()) */

    /*
    this.konvaDrawingCanvas.width = this.konvaDrawingCanvasNode.height();
    this.konvaDrawingCanvas.height = this.konvaDrawingCanvasNode.width(); */

    /*
    this.konvaDrawingCanvasNode.size({
      width: this.konvaDrawingCanvasNode.height(),
      height: this.konvaDrawingCanvasNode.width(),
    });

    this.konvaCursorCanvas.width = this.konvaCursorCanvasNode.height();
    this.konvaCursorCanvas.height = this.konvaCursorCanvasNode.width();

    this.konvaCursorCanvasNode.size({
      width: this.konvaCursorCanvasNode.height(),
      height: this.konvaCursorCanvasNode.width(),
    }); */

    //ctx.putImageData(drawingImageData, 0, 0);

    this.konvaLib.mainLayer.size({
      width: this.konvaLib.stage.width(),
      height: this.konvaLib.stage.height(),
    });

    this.konvaLib.transformersStage.size({
      width: this.konvaLib.stage.width(),
      height: this.konvaLib.stage.height(),
    });

    this.konvaLib.transformersStageMainLayer.size({
      width: this.konvaLib.stage.width(),
      height: this.konvaLib.stage.height(),
    });

    this.konvaLib.updateTransformers(this.konvaLib.transformersStageMainLayer);
    //this.konvaLib.recreateTransformersStageTransformers();

    if (!preventDrawing) {
      this.konvaLib.stage.draw();
      this.konvaLib.transformersStage.draw();
    }

    CanvasLib.rotateCanvasSize(this.drawingCanvas);
    CanvasLib.rotateCanvasSize(this.cursorCanvas);
    CanvasLib.rotateCanvasSize(this.colorPickerCanvas);

    this.softBrush.clearCanvas();
    this.softBrush.redrawSegments();

    this.stage.width(this.konvaLib.stage.width());
    this.stage.height(this.konvaLib.stage.height());

    var canvasContainer = this.canvasesContainer;

    var imageRatio = this.konvaLib.stage.width() / this.konvaLib.stage.height();
    var canvasRatio = canvasContainer.clientWidth / canvasContainer.clientHeight;

    var scale = imageRatio > canvasRatio ?
      (canvasContainer.clientWidth / this.konvaLib.stage.width()) : canvasContainer.clientHeight / this.konvaLib.stage.height();

    if (canvasContainer.clientWidth >= this.konvaLib.stage.width() && canvasContainer.clientHeight >= this.konvaLib.stage.height()) {
      scale = 1;
    }

    this.setScale(scale);

    this.updateCanvasCSSTransforms();

    this.dispatchEvent("canvasResize", [this.konvaLib.stage.width(), this.konvaLib.stage.height()]);
    this.dispatchEvent("rotated", []);

    this.softBrush.setSamplingCanvas(this.konvaLib.stage.toCanvas());

  }

  deleteSelectedText() {
    if (!(this.konvaTarget instanceof Konva.Text)) return;
    this.deleteText(this.konvaTarget);
  }

  deleteText(text) {

    if (this.konvaTextTarget === text) this.untargetKonvaText(this.konvaTextTarget);

    this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getTextDeleteUndoRedo(text));

    var transformer = this.konvaLib.getNodeTransformer(text, this.layer);

    transformer.remove();

    text.remove();
    this.layer.draw();

    return [text, transformer];
  }

  removeAllAnchors() {

    if (!this.layer || !this.stage) return;

    for (var i = 0; i < this.activeTransformers.length; i++) {
      this.reattachTextAnchorList.push([this.activeTransformers[i], this.activeTransformers[i].nodes()])
      this.activeTransformers[i].detach();
    }

    this.activeTransformers = [];

    this.layer.draw();

  }

  readdAllAnchors() {

    for (var i = 0; i < this.reattachTextAnchorList.length; i++) {
      var attachPair = this.reattachTextAnchorList[i];
      attachPair[0].nodes(attachPair[1]);
      this.activeTransformers.push(attachPair[0]);
    }

    this.reattachTextAnchorList = [];

    this.layer.draw();
  }

  beginCrop() {

    this.focusCanvasContainer("cropDummyCanvasContainer");

    var cropDummyCanvas = document.getElementById("cropDummyCanvas");

    this.cropDummyCanvas = cropDummyCanvas;

    this.cropDummyCanvas.style.visibility = "hidden";

    cropDummyCanvas.parentElement.style.visibility = "visible";
    cropDummyCanvas.parentElement.style.pointerEvents = "auto";
    cropDummyCanvas.parentElement.style.display = "block";

    var konvaImagesCanvas = this.konvaLib.stage.toCanvas();

    cropDummyCanvas.width = konvaImagesCanvas.width;
    cropDummyCanvas.height = konvaImagesCanvas.height;

    cropDummyCanvas.style.transform = this.canvasesZoomContainer.style.transform;

    var ctx = cropDummyCanvas.getContext("2d");

    ctx.drawImage(konvaImagesCanvas, 0, 0);
    ctx.drawImage(this.drawingCanvas, 0, 0);
    ctx.drawImage(this.stage.toCanvas(), 0, 0);

    var cropper = new Cropper(cropDummyCanvas, {
      viewMode: 1
    });

    this.cropper = cropper;

    var timeout;
    var hasLoadedOnce = false;

    this.cropEventListener = (e) => {

      if (!hasLoadedOnce) {
        document.getElementById("overlayCanvasContainer").style.visibility = "hidden";
        this.canvasesZoomContainer.style.visibility = "hidden";
        hasLoadedOnce = true;
      }

      if (timeout) {
        window.cancelAnimationFrame(timeout);
      }

      timeout = window.requestAnimationFrame(() => {
        this.dispatchEvent("croppingSelectionChange", [e.detail]);
      })
    }

    cropDummyCanvas.addEventListener("crop", this.cropEventListener);

  }

  endCrop() {

    document.getElementById("overlayCanvasContainer").style.visibility = "visible";
    this.canvasesZoomContainer.style.visibility = "visible";

    this.cropDummyCanvas.parentElement.style.display = "none";

    var cropDummyCanvas = document.getElementById("cropDummyCanvas");

    cropDummyCanvas.parentElement.style.visibility = "hidden";
    cropDummyCanvas.parentElement.style.pointerEvents = "none";

    this.cropDummyCanvas.removeEventListener("crop", this.cropEventListener);

    this.cropper.destroy();

    document.getElementById("move-tool-icon").click();
  }

  async acceptCrop() {

    this.dispatchEvent("acceptCrop", []);

    // stop blocking so the loading animation can render
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 0)
    });

    console.log(this.konvaLib.getImageNodes())

    this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getCropUndoRedo());

    console.log(this.undoRedoLib.undoCache, this.undoRedoLib.redoCache)

    var cropData = this.cropper.getData();

    cropData.x = Math.round(cropData.x);
    cropData.y = Math.round(cropData.y);
    cropData.width = Math.round(cropData.width);
    cropData.height = Math.round(cropData.height)

    var oldLayerOffsetX = this.layer.offsetX();
    var oldLayerOffsetY = this.layer.offsetY();

    this.layer.offsetX(Math.round(this.layer.offsetX() + cropData.x));
    this.layer.offsetY(Math.round(this.layer.offsetY() + cropData.y));

    this.softBrush.addOffsetToDrawSegments((this.layer.offsetX() - oldLayerOffsetX) * -1, (this.layer.offsetY() - oldLayerOffsetY) * -1);
    this.softBrush.setOffset(this.layer.offsetX() * -1, this.layer.offsetY() * -1);

    this.stage.size({
      width: Math.round(cropData.width),
      height: Math.round(cropData.height)
    })

    this.layer.draw();

    var selectedTargetImage = this.konvaLib.selectedTargetImage;

    var replaced = this.konvaLib.replaceImages(this.imagesWithNoFilters, 0);

    this.konvaLib.cropImages(cropData);
    var newImagesWithNoFilters = await this.konvaLib.getImageObjects(this.konvaLib.imagesLayer);

    this.replaceImagesWithNoFilters(newImagesWithNoFilters);

    await this.reapplyImageFilters();

    if (selectedTargetImage) this.konvaLib.targetImage(this.konvaLib.getImageWithId(selectedTargetImage.photoEditorId));

    for (var i = 0; i < this.konvaLib.imagesLayer.getChildren().length; i++) {
      let image = this.konvaLib.imagesLayer.getChildren()[i];
      this.undoRedoLib.addKonvaImageUndoRedoEvents(image);
    }

    /*
    this.konvaLib.transformersStageMainLayer.x(this.konvaLib.transformersStageMainLayer.x() + cropData.x * -1);
    this.konvaLib.transformersStageMainLayer.y(this.konvaLib.transformersStageMainLayer.y() + cropData.y * -1); */

    /*
    this.konvaLib.transformersStage.size({
      width: Math.floor(cropData.width),
      height: Math.floor(cropData.height)
    }); */
    /*
    this.konvaLib.transformersStageMainLayer.size({
      width: Math.floor(cropData.width),
      height: Math.floor(cropData.height)
    }); */
    /*
    var x = this.konvaLib.imagesLayer.x() - this.cropOffsetX;
    var y = this.konvaLib.imagesLayer.y() - this.cropOffsetY;

    this.cropOffsetX += cropData.x * -1;
    this.cropOffsetY += cropData.y * -1; */

    /*
    this.konvaLib.imagesLayer.x(x + this.cropOffsetX);
    this.konvaLib.imagesLayer.y(y + this.cropOffsetY); */
    /*
    this.konvaLib.stage.x(this.konvaLib.stage.x() + cropData.x * -1);
    this.konvaLib.stage.y(this.konvaLib.stage.y() + cropData.y * -1); */

    this.konvaLib.stage.size({
      width: Math.round(cropData.width),
      height: Math.round(cropData.height)
    });
    this.konvaLib.transformersStage.size({
      width: Math.round(cropData.width),
      height: Math.round(cropData.height)
    });

    this.konvaLib.imagesLayer.size({
      width: Math.round(cropData.width),
      height: Math.round(cropData.height)
    });

    var diffX = Math.round(cropData.width / 2) - this.konvaLib.imagesLayer.offsetX();
    var diffY =  Math.round(cropData.height / 2) - this.konvaLib.imagesLayer.offsetY();

    this.konvaLib.imagesLayer.offsetX(Math.round(cropData.width / 2));
    this.konvaLib.imagesLayer.offsetY(Math.round(cropData.height / 2));

    this.konvaLib.imagesLayer.x(Math.round(this.konvaLib.imagesLayer.x() + diffX));
    this.konvaLib.imagesLayer.y(Math.round(this.konvaLib.imagesLayer.y() + diffY));

    this.konvaLib.colorBackgroundImage.size({
      width: Math.round(cropData.width),
      height: Math.round(cropData.height)
    });

    this.konvaLib.backgroundImage.size({
      width: Math.round(cropData.width),
      height: Math.round(cropData.height)
    });

    this.konvaLib.fixLayerContentsPositioning(this.konvaLib.imagesLayer);

    if (this.konvaLib.imagesLayerRotation === 90 || this.konvaLib.imagesLayerRotation === 270) {
      this.konvaLib.imagesLayer.offsetX(cropData.height / 2);
      this.konvaLib.imagesLayer.offsetY(cropData.width / 2);

      this.konvaLib.imagesLayer.x(cropData.height / 2);
      this.konvaLib.imagesLayer.y(cropData.width / 2);
    } else {
      this.konvaLib.imagesLayer.offsetX(cropData.width / 2);
      this.konvaLib.imagesLayer.offsetY(cropData.height / 2);

      this.konvaLib.imagesLayer.x(cropData.width / 2);
      this.konvaLib.imagesLayer.y(cropData.height / 2);
    }

/*    this.konvaLib.imagesCroppingLayer.size({
      width: Math.floor(cropData.width),
      height: Math.floor(cropData.height)
    }); */

    /*
    this.konvaLib.mainLayer.size({
      width: Math.floor(cropData.width),
      height: Math.floor(cropData.height)
    }); */

    this.konvaLib.transformersStage.batchDraw();
    this.konvaLib.stage.batchDraw();

    var ctx = this.drawingCanvas.getContext("2d");
    //var drawingImageData = ctx.getImageData(cropData.x, cropData.y, Math.round(cropData.width), Math.round(cropData.height));

    this.drawingCanvas.width = Math.round(cropData.width);
    this.drawingCanvas.height = Math.round(cropData.height);

    this.softBrush.clearCanvas();
    this.softBrush.redrawSegments();

    console.log(cropData.x, cropData.y)

    //ctx.putImageData(drawingImageData, 0, 0);

    this.cursorCanvas.width = Math.round(cropData.width);
    this.cursorCanvas.height = Math.round(cropData.height);

    this.colorPickerCanvas.width = Math.round(cropData.width);
    this.colorPickerCanvas.height = Math.round(cropData.height);

    this.cropDummyCanvas.removeEventListener("crop", this.cropEventListener);

    this.dispatchEvent("cropped", [cropData]);

    this.cropper.destroy();

    document.getElementById("move-tool-icon").click();

    console.log(this.konvaLib.imagesLayer.offsetX(), this.konvaLib.imagesLayer.offsetY())

    /*
    var layer = new Konva.Layer();
    this.konvaLib.stage.add(layer)
    layer.add(new Konva.Rect({
      width: this.konvaLib.stage.width(),
      height: this.konvaLib.stage.height(),
      fill: "white",
      x: 0,
      y: 0
    })) */

    this.cropDummyCanvas.parentElement.style.display = "none";

    console.log(this.konvaLib.stage.height(), this.drawingCanvas.height, this.konvaLib.imagesLayer.height(), this.konvaLib.stage.x(), this.konvaLib.stage.y(), this.konvaLib.stage.offsetX(), this.konvaLib.stage.offsetY())

    /*
    this.konvaLib.imagesLayer.add(new Konva.Rect({
      width: this.konvaLib.imagesLayer.width(),
      height: this.konvaLib.imagesLayer.height(),
      x: 0,
      y: 0,
      fill: "gray",
      draggable: true
    })); */

    this.softBrush.setSamplingCanvas(this.konvaLib.stage.toCanvas());

    var image = this.konvaLib.imagesLayer.getChildren()[0];
    var transformer = this.konvaLib.getImageTransformer(image);
    var overlayTransformer = this.konvaLib.getImageTransformer(image, this.transformersStageMainLayer);

    document.getElementById("overlayCanvasContainer").style.visibility = "visible";

    var cropDummyCanvas = document.getElementById("cropDummyCanvas");

    cropDummyCanvas.parentElement.style.visibility = "hidden";
    cropDummyCanvas.parentElement.style.pointerEvents = "none";

    this.getImageDataReset();

  }

  getImageDataReset() {

    this.drawingCanvas.getContext("2d").getImageData(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    this.cursorCanvas.getContext("2d").getImageData(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);

    var konvaTextContainer = document.getElementById("overlayCanvasContainer").firstElementChild;

    for (var i = 0; i < konvaTextContainer.firstElementChild.children.length; i++) {
      var canvas = konvaTextContainer.firstElementChild.children[i];
      canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    }

    for (var i = 0; i < this.konvaImagesContainer.firstElementChild.children.length; i++) {
      var canvas = this.konvaImagesContainer.firstElementChild.children[i];
      canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    }

    for (var i = 0; i < this.konvaTransformersContainer.firstElementChild.children.length; i++) {
      var canvas = this.konvaTransformersContainer.firstElementChild.children[i];
      canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    }

  }

  enableDrawing() {

    var checkIfAnyUndo = () => {

      var undoCache = this.undoRedoLib.typesLib.getUndoCache();

      for (var i = 0; i < undoCache.length; i++) {
        var cacheItem = undoCache[i];
        if (cacheItem.type === "drawingCanvas") return true;
      }

      return false;

    }

    if (this.drawingEnabled) return;

    this.focusCanvasContainer("drawingCanvasContainer");

    this.softBrush.setSamplingCanvas(this.konvaLib.stage.toCanvas())
    this.softBrush.enableSoftBrush();

    this.drawingEnabled = true;


  }

  disableDrawingCanvas() {
    //this.konvaDrawingCanvasNode.listening(false);
    //this.konvaCursorCanvasNode.listening(false);
    this.softBrush.enabled = false;
    this.softBrush.cursorCanvas.getContext("2d").clearRect(0, 0, this.softBrush.cursorCanvas.width, this.softBrush.cursorCanvas.height)
    //this.konvaLib.stage.draw();
  }

  enableDrawingCanvas() {
    //this.konvaDrawingCanvasNode.listening(true);
    //this.konvaCursorCanvasNode.listening(true);
    this.softBrush.enabled = true;
    this.drawingCanvas.style.cursor = "none";
    //this.konvaLib.stage.draw();
  }

  changeDrawingColor(color) {

    this.selectedDrawingColor = color;

  }

  setBrushSize(value) {
    this.softBrush.setSize(value);
  }

  enableDrawingEraser() {
    if (this.softBrush) this.softBrush.enableEraseMode();
  }

  disableDrawingEraser() {
    if (this.softBrush) this.softBrush.disableEraseMode();
  }

  eraseAllDrawing() {

    this.undoRedoLib.addToUndoCache(this.undoRedoLib.typesLib.getEraseAllDrawingUndoRedo());
    this.softBrush.removeDrawSegments();
    this.softBrush.clearCanvas();

  }

  getDefaultColorPicker(id, color) {
    return new iro.ColorPicker(id, {
      width: 75,
      color: color ? color : "#fff",
      layout: [
        {
          component: iro.ui.Box,
          options: {}
        },
        {
          component: iro.ui.Slider,
          options: {
            sliderType: 'hue'
          }
        },
        {
          component: iro.ui.Slider,
          options: {
            sliderType: 'alpha'
          }
        },
      ],
      sliderSize: 10,
      padding: 0
    })
  }

  enableDrawingColorPicker() {
    if (this.drawingColorPicker) return;
    this.drawingColorPicker = this.getDefaultColorPicker("#drawing-color-picker");
    this.drawingColorPicker.on("color:change", (color) => {
      this.selectedDrawingColor = color;
      this.softBrush.setColor([color.red, color.green, color.blue, color.alpha]);

      document.getElementById("drawing-color-picker-button").style.backgroundColor = color.rgbaString;
      this.changeDrawingColor(color)
    })
    this.selectedDrawingColor = this.drawingColorPicker.color;
  }

  enableTextColorPicker() {
    if (this.textColorPicker) return;
    this.textColorPicker = this.getDefaultColorPicker("#text-color-picker", this.selectedTextColor);
    this.textColorPicker.on("color:change", (color) => {
      this.selectedTextColor = color;
      if (this.konvaTextTarget) this.konvaTextTarget.fill(color.rgbaString);
      document.getElementById("text-color-picker-button").style.backgroundColor = color.rgbaString;
      this.stage.batchDraw();
    });
    this.selectedTextColor = this.textColorPicker.color;
  }

  enableBackgroundColorPicker() {
    if (this.backgroundColorPicker) return;
    this.backgroundColorPicker = this.getDefaultColorPicker("#background-color-picker");
    this.backgroundColorPicker.on("color:change", (color) => {
      this.selectedBackgroundColor = color;
      document.getElementById("background-color-picker-button").style.backgroundColor = color.rgbaString;
      this.konvaLib.setBackgroundColor(color.rgbaString);
    });
    this.selectedBackgroundColor = this.backgroundColorPicker.color;
    document.getElementById("background-color-picker-button").style.backgroundColor = "transparent";
  }

  showColorPicker(id) {

    document.getElementById(id).style.visibility = "visible";
    document.getElementById(id).style.opacity = 1;

    setTimeout(() => {

      function hideColorPickerHandler(e) {

        if (e.target.id === id) return;

        var parentElement = e.target.parentElement;

        while (true) {
          if (!parentElement) {
            break;
          }
          if (parentElement.id === id) {
            return;
          }
          parentElement = parentElement.parentElement;
        }

        document.getElementById(id).style.opacity = 0;
        setTimeout(() => {
          document.getElementById(id).style.visibility = "hidden";
        }, 300);

        window.removeEventListener("click", hideColorPickerHandler)

      }

      window.addEventListener("click", hideColorPickerHandler);

    }, 100);

  }

  focusCanvasContainer(id) {
    document.getElementById("drawingCanvasContainer").style.pointerEvents = id === "drawingCanvasContainer" ? "auto" : "none";
    document.getElementById("overlayCanvasContainer").style.pointerEvents = id === "overlayCanvasContainer" ? "auto" : "none";
    document.getElementById("konvaImagesContainer").style.pointerEvents = id === "konvaImagesContainer" ? "auto" : "none";
    document.getElementById("konvaTransformersContainer").style.pointerEvents = id === "konvaTransformersContainer" ? "auto" : "none";
    document.getElementById("cropDummyCanvasContainer").style.pointerEvents = id === "konvaImagesContainer" ? "auto" : "none";
    document.getElementById("colorPickerCanvasContainer").style.pointerEvents = id === "colorPickerCanvasContainer" ? "auto" : "none";
  }

  getImageCompositeCanvas() {

    if (this.selectedTool === "addText") this.removeAllAnchors();

    var downloadCanvas = document.createElement("canvas");
    downloadCanvas.width = this.konvaLib.stage.width();
    downloadCanvas.height = this.konvaLib.stage.height();

    var downloadCtx = downloadCanvas.getContext("2d");

    var selectedImage = this.konvaLib.selectedTargetImage;
    this.konvaLib.unTargetImage(selectedImage);

    var previewedImage = this.konvaLib.previewedTargetImage;
    this.konvaLib.unPreviewTargetImage(previewedImage);

    if (this.konvaLib.backgroundImageColor === "transparent") this.konvaLib.hideImage(this.konvaLib.backgroundImage);

    downloadCtx.drawImage(this.konvaLib.stage.toCanvas(), 0, 0);
    downloadCtx.drawImage(this.drawingCanvas, 0, 0);
    downloadCtx.drawImage(this.stage.toCanvas(), 0, 0);

    if (this.selectedTool === "addText") this.readdAllAnchors();

    this.konvaLib.targetImage(selectedImage);
    this.konvaLib.previewTargetImage(previewedImage);
    if (this.konvaLib.backgroundImageColor === "transparent") this.konvaLib.showImage(this.konvaLib.backgroundImage);

    return downloadCanvas;

  }

  exportImage() {

    var canvas = this.getImageCompositeCanvas();

    download(canvas, "image.png");

    this.dispatchEvent("imageExport", [canvas])

    function download(canvas, filename) {

      var lnk = document.createElement('a');
      lnk.download = filename;

      lnk.href = canvas.toDataURL("image/png;base64");

      lnk.click();

    }
  }

  async saveImage() {

    if (!this.imageInstanced) return;

    if (!this.inManualSaveMode) {
      this.exportImage();
      return;
    }

    var canvas = this.getImageCompositeCanvas();

    if (this.manualSaveType === "file") {

      let file = await imageConversion.canvastoFile(canvas);
      this.dispatchEvent("imageSave", [file]);
      return file;

    } else if (this.manualSaveType === "png") {

      let dataURL = await imageConversion.canvastoDataURL(canvas);
      let image = await imageConversion.dataURLtoImage(dataURL);
      this.dispatchEvent("imageSave", [image]);
      return image;

    }

  }

  enableManualSaveMode(options) {

    this.inManualSaveMode = true;
    this.manualSaveType = options.manualSaveType ? options.manualSaveType : "png";

  }

  disableManualSaveMode() {
    this.inManualSaveMode = false;
    this.manualSaveType = false;
  }

  removeImageInstance() {

    if (!this.imageInstanced) return;

    // drawing

    var drawingCanvas = document.getElementById("drawingCanvas");
    var ctx = drawingCanvas.getContext("2d");
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    this.softBrush.removeInstance();
    this.softBrush = false;
    this.drawingEnabled = false;

    // konva

    if (this.konvaReady) {

      this.stage.destroyChildren();
      this.konvaLib.stage.listening(false);
      this.stage.remove();

      this.stage = false;
      this.layer = false;
      this.konvaReady = false;

      document.getElementById("overlayCanvasContainer").firstElementChild.remove();

    }

    this.konvaLib.stage.destroyChildren();
    this.konvaLib.stage.listening(false);
    this.konvaLib.stage.remove();
    document.getElementById("konvaImagesContainer").firstElementChild.remove();
    document.getElementById("konvaTransformersContainer").firstElementChild.remove();
    this.konvaLib = false;

    // misc

    this.appliedPixiFilters = {};

    this.runningImageId = 1;

    this.texts = [];

    this.offsetX = 0;
    this.offsetY = 0;

    this.filterPreviews = [];

    this.offsetLeftOriginX = 0;
    this.offsetLeftOriginY = 0;

    this.shortCutsTempDisabled = false;

    this.activeTransformers = [];
    this.reattachTextAnchorList = [];
    this.imageInstanced = false;

    this.inCropMode = false;

    this.selectedTool = "";

    this.defaultBrushSize = this.originalOptions.defaultBrushSize ? this.originalOptions.defaultBrushSize : 20;
    this.defaultBrushHardness = this.originalOptions.defaultBrushHardness ? this.originalOptions.defaultBrushHardness : 0.5;

    this.focusCanvasContainer("");

    // undo/redo

    this.undoRedoLib.clearRedoCache();
    this.undoRedoLib.clearUndoCache();

    // events

    document.getElementById("canvasesContainer").removeEventListener("wheel", this.zoom);
    document.getElementById("canvasesContainer").removeEventListener("mousedown", this.beginDragModeEventHandler);

    // color pickers

    var iroColor = new iro.Color({r: 255, g: 255, b: 255, a: 1});

    if (this.textColorPicker) {
      this.textColorPicker.setColors([iroColor]);
      this.textColorPicker.setActiveColor(0);
    }

    if (this.drawingColorPicker) {
      this.drawingColorPicker.setColors([iroColor]);
      this.drawingColorPicker.setActiveColor(0);
    }

    if (this.backgroundColorPicker) {
      this.backgroundColorPicker.setColors([iroColor]);
      this.backgroundColorPicker.setActiveColor(0);
    }

    this.selectedTextColor = iroColor;
    this.selectedDrawingColor = iroColor;

    document.getElementById("text-color-picker-button").style.backgroundColor = `rgba(255, 255, 255, 1)`;
    document.getElementById("drawing-color-picker-button").style.backgroundColor = `rgba(255, 255, 255, 1)`;
    document.getElementById("eyedrop-color-picker-button").style.backgroundColor = `rgba(255, 255, 255, 1)`;
    document.getElementById("background-color-picker-button").style.backgroundColor = `rgba(255, 255, 255, 0)`;

    // dispatch event

    this.dispatchEvent("removeImageInstance", []);

  }

}

export default PhotoEditorLib;
