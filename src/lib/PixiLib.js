
import * as PIXI from 'pixi.js'
import * as PixiFilters from "pixi-filters";

class PixiLib {

  static PIXI = PIXI;

  static colorMatrixFilters = {
    "black & white": "blackAndWhite",
    "greyscale": "greyscale",
    "browni": "browni",
    "kodachrome": "kodachrome",
    "technicolor": "technicolor",
    "negative": "negative",
    "polaroid": "polaroid",
    "sepia": "sepia",
    "vintage": "vintage",
    "predator": "predator"
  }

  static generalFilters = {
    "twist": "TwistFilter",
    "zoomblur": "ZoomBlurFilter",
    "motionblur": "MotionBlurFilter",
    "bulge/pinch": "BulgePinchFilter"
  }

  static generalCoreFilters = {
    "blur": "BlurFilter"
  }

  static adjustmentFilters = {
    "gamma": "gamma",
    "contrast": "contrast",
    "saturation": "saturation",
    "brightness": "brightness"
  }

  static appFromImage(image) {
    var app = new PIXI.Application({
        width: image.width,
        height: image.height
    });

    var container = new PIXI.Container();
    app.stage.addChild(container);

    var texture = PIXI.Texture.from(image);
    var sprite = new PIXI.Sprite(texture);

    container.addChild(sprite);

    return app;
  }

  static reuseAppWithImage(app, image) {

    app.stage.removeChildren();

    app.resizeTo = image;
    app.resize();

    var container = new PIXI.Container();
    app.stage.addChild(container);

    var texture = PIXI.Texture.from(image);
    var sprite = new PIXI.Sprite(texture);

    container.addChild(sprite);

    return app;

  }

  static canvasFromApp(app) {
    return app.renderer.plugings.extract.canvas(app.stage);
  }

  static imageFromApp(app) {
    return app.renderer.plugins.extract.image(app.stage);
  }

  static getPoint(x, y) {
    return new PIXI.Point(x, y);
  }

  static setImageFilters(app, filters) {

    //console.log(filters)

    for (var i = 0; i < filters.length; i++) {

      //console.log(i)

      var filterName = filters[i][0];
      var values = filters[i][1];
      var properties = filters[i][2];

      //console.log(filterName, values)

      this.setImageFilter(app, filterName, values, properties);

    }

  }

  static setImageFilter(app, filterName, values, properties) {

    filterName = filterName.toLowerCase();
    if (filterName === "none") return;

    if (this.colorMatrixFilters[filterName]) {
      var filterFunctionName = this.colorMatrixFilters[filterName];
      var type = "colorMatrix";
    }

    if (this.generalFilters[filterName]) {
      var filterFunctionName = this.generalFilters[filterName];
      var type = "general";
    }

    if (this.generalCoreFilters[filterName]) {
      var filterFunctionName = this.generalCoreFilters[filterName];
      var type = "generalCore";
    }

    if (this.adjustmentFilters[filterName]) {
      var filterFunctionName = this.adjustmentFilters[filterName];
      var type = "adjustment";
    }

    if (!filterFunctionName) return;

    this.addFilter(app, filterFunctionName, values, type, properties);

  }

  static removeImageFilter(app, filterName) {

    filterName = filterName.toLowerCase();
    if (filterName === "none") return;

    if (this.colorMatrixFilters[filterName]) {
      var filterFunctionName = this.colorMatrixFilters[filterName];
      var type = "colorMatrix";
    }

    if (this.generalFilters[filterName]) {
      var filterFunctionName = this.generalFilters[filterName];
      var type = "general";
    }

    if (this.generalCoreFilters[filterName]) {
      var filterFunctionName = this.generalCoreFilters[filterName];
      var type = "generalCore";
    }

    if (this.adjustmentFilters[filterName]) {
      var filterFunctionName = this.adjustmentFilters[filterName];
      var type = "adjustment";
    }

    if (!filterFunctionName) return;

    this.removeFilter(app, filterFunctionName, type);

  }

  static addFilter(app, filterName, values, type, properties) {

    var setProperties = (filter, properties) => {

      for (var property in properties) {
        var propertyValue = properties[property];
        filter[property] = propertyValue;
      }

    }

    function handleFilter(filterName, type, container) {

      //console.log(filterName)
      //console.log(values)

      if (type === "colorMatrix") {
        var colorMatrix = new PIXI.filters.ColorMatrixFilter(...values);
        container.filters.push(colorMatrix);
        colorMatrix[filterName](true);
        return;
      }

      if (type === "general") {
          /*
        console.log(filterName)
        console.log(values)
        console.log(properties) */

        /*
        if (filterName === "TwistFilter") {
          console.log("adding twist filter")
          var filter = new PixiFilters.TwistFilter(400, 4, 10);
          filter.offset = new PIXI.Point(500, 500);
          container.filters.push(filter);
          return;
        } */

        var filter = new PixiFilters[filterName](...values);
        if (properties) setProperties(filter, properties);
        container.filters.push(filter);
        return;
      }

      if (type === "generalCore") {
        var filter = new PIXI.filters[filterName](...values);
        container.filters.push(filter);
        return;
      }

      if (type === "adjustment") {
        var options = {};
        options[filterName] = values[0];
        var filter = new PixiFilters.AdjustmentFilter(options);
        container.filters.push(filter);
      }

    }

    if (!values) {
      values = [];
    }

    if (!Array.isArray(values)) {
      values = [values];
    }

    var container = app.stage.children[0];

    if (!container.filters) container.filters = [];

    handleFilter(filterName, type, container);

  }

  static resetImageFilters(container) {
    container.filters = [];
  }

  static removeFilter(app, filterName, type) {

    function handleFilter(filterName, type) {

      // Assuming you can only have one color matrix filter selected at one time
      if (type === "colorMatrix") {
        for (var i = app.filters.length - 1; i >= 0; i--) {
          var filter = app.filters[i];
          if (filter instanceof PIXI.filters.ColorMatrixFilter) {
            app.filters.splice(i, 1);
            break;
          }
        }
        return;
      }

      if (type === "general") {
        for (var i = app.filters.length - 1; i >= 0; i--) {
          var filter = app.filters[i];
          if (filter instanceof PixiFilters[filterName]) {
            app.filters.splice(i, 1);
            break;
          }
        }
        return;
      }

      if (type === "generalCore") {
        for (var i = app.filters.length - 1; i >= 0; i--) {
          var filter = app.filters[i];
          if (filter instanceof PIXI.filters[filterName]) {
            app.filters.splice(i, 1);
            break;
          }
        }
        return;
      }

      if (type === "adjustment") {
        for (var i = app.filters.length - 1; i >= 0; i--) {
          var filter = app.filters[i];
          if (filter instanceof PixiFilters.AdjustmentFilter && filter[filterName] !== 1) {
            app.filters.splice(i, 1);
            break;
          }
        }
        return;
      }

    }

    handleFilter(filterName, type);

  }

  static isWebGLSupported() {
    return PIXI.utils.isWebGLSupported();
  }

}

export default PixiLib;
