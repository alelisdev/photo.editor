
import React from "react";
import Canvas from "./Canvas.js";
import Upload from "./Upload.js" ;
import EffectSlider from "./EffectSlider.js";
import { InputNumber, Button, Tooltip, Empty, Select, Collapse, Spin, Checkbox } from "antd";
import { DownloadOutlined, CloudUploadOutlined, RobotOutlined } from "@ant-design/icons"
import '@simonwep/pickr/dist/themes/nano.min.css';
import "./PhotoEditor.less";
import CustomModal from "./CustomModal.js";
import ContextMenu from "./ContextMenu.js";
import ImageGridMenu from "./ImageGridMenu.js";
import ConfirmPopupButton from "./ConfirmPopupButton.js";
import FilterCollapseHeader from "./FilterCollapseHeader.js";
import { Tabs } from 'antd';
import PhotoEditorLib from "./lib/PhotoEditorLib";
import { detect } from "detect-browser";

class PhotoEditor extends React.Component {

  constructor(props) {
    super(props);

    var selectedTool = "";

    this.defaultState = {
      image: props.image ? props.image : "",
      canvasWidth: 0,
      canvasHeight: 0,
      selectedTargetImage: false,
      numberOfTextFields: 0,
      showAcceptCancelMenu: false,
      drawingLineWidth: 10,
      imageInstanced: false,
      selectedTool: selectedTool,
      brushSize: 10,
      brushHardness: 50,
      drawingLineWidth: 10,
      filterPreviewImages: [],
      blur: 0,
      bulgePinchRadius: 0,
      bulgePinchStrength: 0,
      bulgePinchCenterX: 0,
      bulgePinchCenterY: 0,
      twistRadius: 0,
      twistAngle: 0,
      twistX: 0,
      twistY: 0,
      zoomBlurStrength: 0,
      zoomBlurCenterX: 0,
      zoomBlurCenterY: 0,
      zoomBlurInnerRadius: 0,
      zoomBlurOuterRadius: 0,
      motionBlurVelocityX: 0,
      motionBlurVelocityY: 0,
      motionBlurQuality: 5,
      contrast: 0,
      brightness: 0,
      gamma: 0,
      saturation: 0,
      filter: "None",
      canvasesContainerLoading: false,
      imageFilterPreviewsLoading: false,
      contextMenuVisible: false,
      selectedImageWidth: 0,
      selectedImageHeight: 0,
      undosAmount: 0,
      redosAmount: 0,
      error: false,
      webGLSupported: true,
      selectedTextFont: "Impact",
      selectedTextColor: "rgb(255, 255, 255)"
    }

    this.state = this.defaultState;

    this.fonts = [
      "Impact",
      "Calibri",
      "Comic Sans MS",
      "Arial",
      "Arial Black",
      "Times New Roman",
      "Courier New",
      "Helvetica",
      "Verdana",
      "Tahoma",
      "Trebuchet MS",
      "Georgia"
    ]

    this.selectableFilters = [
      "None",
      "Black & White",
      "Greyscale",
      "Browni",
      "Kodachrome",
      "Technicolor",
      "Negative",
      "Polaroid",
      "Sepia",
      "Vintage"
    ];

    this.adjustableFilters = [
      "blur",
      "twist",
      "zoomblur",
      "bulge/pinch",
      "motionblur"
    ];

    this.adjustments = [
      "contrast",
      "brightness",
      "gamma",
      "saturation"
    ];

    this.acceptedImageTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg",
      "x-icon/svg",
      "image/tiff",
      "image/bmp",
      "image/gif"
    ];

    this.photoEditorLib = new PhotoEditorLib({
      selectableFilters: this.selectableFilters,
      adjustableFilters: this.adjustableFilters,
      adjustments: this.adjustments,
      selectedTool: selectedTool,
      defaultBrushSize: this.state.drawingLineWidth,
      defaultBrushHardness: this.state.brushHardness / 100,
      downscaleImage: true,
      maxImageSize: 2000,
      downScaledImageQuality: 0.8,
      shortCutsEnabled: false,
      fonts: this.fonts,
      selectedFont: "Impact"
    });

    this.photoEditorLib.afterInitialization();

    if (this.photoEditorLib.error === "WebGL not supported") {
      this.state.webGLSupported = false;
      this.state.error = true;
    }

    /*
    this.photoEditorLib.on("load", () => {
      var filterPreviewImages = this.photoEditorLib.getFilterPreviewImages();
      this.setState({
        filterPreviewImages: filterPreviewImages
      });
    }); */

    var setFiltersState = (imageSettings, filterPreviewImages) => {
      console.log(imageSettings)
      this.setState({
        selectedTargetImage: imageSettings.selectedTarget,
        filterPreviewImages: filterPreviewImages,
        blur: imageSettings.blur,
        bulgePinchRadius: imageSettings["bulge/pinch"].radius,
        bulgePinchStrength: imageSettings["bulge/pinch"].strength * 100,
        bulgePinchCenterX: imageSettings["bulge/pinch"].center[0] * 100,
        bulgePinchCenterY: imageSettings["bulge/pinch"].center[1] * 100,
        twistRadius: imageSettings.twist ? imageSettings.twist[0] : 0,
        twistAngle: imageSettings.twist ? imageSettings.twist[1] : 0,
        twistX: imageSettings.twist && imageSettings.properties.twist ? imageSettings.properties.twist.offset.x : 0,
        twistY: imageSettings.twist && imageSettings.properties.twist ? imageSettings.properties.twist.offset.y : 0,
        zoomBlurStrength: imageSettings.zoomblur ? imageSettings.zoomblur.strength * 100 :  0,
        zoomBlurCenterX: imageSettings.zoomblur ? imageSettings.zoomblur.center[0] : 0,
        zoomBlurCenterY: imageSettings.zoomblur ? imageSettings.zoomblur.center[1] : 0,
        zoomBlurInnerRadius: imageSettings.zoomblur ? imageSettings.zoomblur.innerRadius : 0,
        zoomBlurOuterRadius: imageSettings.zoomblur ? imageSettings.zoomblur.radius : 0,
        motionBlurVelocityX: imageSettings.motionblur ? imageSettings.motionblur[0][0] : 0,
        motionBlurVelocityY: imageSettings.motionblur ? imageSettings.motionblur[0][1] : 0,
        motionBlurQuality: imageSettings.motionblur ? imageSettings.motionblur[1] : 5,
        contrast: Math.round((imageSettings.contrast - 1) * 100),
        brightness: Math.round((imageSettings.brightness - 1) * 100),
        gamma: Math.round((imageSettings.gamma - 1) * 100),
        saturation: Math.round((imageSettings.saturation - 1) * 100),
        filter: imageSettings.filter,
        imageFilterPreviewsLoading: false
      });
    }

    this.photoEditorLib.on("imageTargetChange", (newTarget) => {
      var filterPreviewImages = this.photoEditorLib.getFilterPreviewImages(newTarget);
      var imageSettings = this.photoEditorLib.getSelectedTargetImageSettings();
      this.setState({
        selectedImageWidth: imageSettings.width,
        selectedImageHeight: imageSettings.height
      });
      setFiltersState(imageSettings, filterPreviewImages);
    });

    this.photoEditorLib.on("textTargetChange", (newTarget) => {
      if (!newTarget) return;
      this.setState({
        selectedTextColor: newTarget ? newTarget.fill() : "rgba(255, 255, 255, 0)",
        selectedTextFont: newTarget ? newTarget.fontFamily() : "Impact"
      });
    });

    this.photoEditorLib.on("konvaTargetChange", (newTarget) => {
      console.log("new target change")
      this.setState({
        contextMenuVisible: false,
      })
    });

    this.photoEditorLib.on("selectedImageFilterChange", (imageNode) => {
      var filterPreviewImages = this.photoEditorLib.getFilterPreviewImages(imageNode);
      var imageSettings = this.photoEditorLib.getSelectedTargetImageSettings();
      setFiltersState(imageSettings, filterPreviewImages);
    });

    this.photoEditorLib.on("removeImageInstance", () => {
      this.setState(this.defaultState);
    });

    this.photoEditorLib.on("loadingImage", () => {
      this.setState({
        canvasesContainerLoading: true,
        imageFilterPreviewsLoading: true
      });
    });

    this.photoEditorLib.on("loadImage", () => {
      this.setState({
        uploadFileList: [],
        canvasesContainerLoading: false,
        imageFilterPreviewsLoading: false,
        imageInstanced: true,
        canvasHeight: this.photoEditorLib.canvasHeight,
        canvasWidth: this.photoEditorLib.canvasWidth
      });
    });

    this.photoEditorLib.on("croppingSelectionChange", (cropBox) => {
      this.setState({
        cropBoxWidth: Math.round(cropBox.width),
        cropBoxHeight: Math.round(cropBox.height)
      })
    });

    this.photoEditorLib.on("beginRotate", () => {
      this.setState({
        canvasesContainerLoading: true
      });
    });

    this.photoEditorLib.on("startUndoRedo", () => {
      this.setState({
        canvasesContainerLoading: true
      });
    });

    this.photoEditorLib.on("endUndoRedo", () => {
      this.setState({
        canvasesContainerLoading: false
      });
    });

    this.photoEditorLib.on("rotated", () => {
      this.setState({
        canvasesContainerLoading: false
      });
    });

    this.photoEditorLib.on("acceptCrop", () => {
      this.setState({
        canvasesContainerLoading: true
      });
    });

    this.photoEditorLib.on("cropped", (cropBox) => {
      var imageSettings = this.photoEditorLib.getSelectedTargetImageSettings();
      setFiltersState(imageSettings, this.state.filterPreviewImages);
      this.setState({
        selectedImageWidth: imageSettings.width,
        selectedImageHeight: imageSettings.height,
        canvasWidth: cropBox.width,
        canvasHeight: cropBox.height,
        canvasesContainerLoading: false
      });
    })

    this.photoEditorLib.on("canvasResize", (width, height) => {
      this.setState({
        canvasWidth: width,
        canvasHeight: height
      })
    });

    this.photoEditorLib.on("undoAmountChange", (undosAmount) => {
      // we only care whether undosAmount is 0 or not
      console.log(undosAmount, this.state.undosAmount)
      if (this.state.undosAmount !== 0 && undosAmount !== 0 || this.state.undosAmount === 0 && undosAmount === 0) return;
      this.setState({
        undosAmount: undosAmount
      })
    });

    this.photoEditorLib.on("redoAmountChange", (redosAmount) => {
      // we only care whether redosAmount is 0 or not
      if (this.state.redosAmount !== 0 && redosAmount !== 0 || this.state.redosAmount === 0 && redosAmount === 0) return;
      this.setState({
        redosAmount: redosAmount
      })
    });

  }

  render() {

    console.log("react is rerendering PhotoEditor.js")

    var arrInLowerCase = (arr) => {
      var array = [];
      for (var i = 0; i < arr.length; i++) {
        if (typeof arr[i] === "string") {
          array.push(arr[i].toLowerCase());
        } else {
          array.push(arr[i]);
        }
      }
      return array;
    }

    var updateState = (...args) => {
      if (args.length === 1) {
        this.setState(args[0]);
      } else {
        var name = args[0];
        var value = args[1];
        var state = {};
        state[name] = value;
        this.setState(state);
      }
    }


    return (
      <div id="mainContainer">
        <div id="upperRow">
          <div id="toolOptionsMenu">
            <div className="colorPickerContainer" style={{display: this.state.selectedTool === "draw" ? "block" : "none"}}>
              <Tooltip title="Color">
                <div className="colorPickerButtonContainer">
                  <div className="colorPickerButtonTilePattern" style={{backgroundImage: "url(images/background_tile_pattern.png)"}}></div>
                  <button id="drawing-color-picker-button" className="colorPickerButton" onClick={() => {
                    this.photoEditorLib.showColorPicker("drawing-color-picker");
                  }}></button>
                </div>
              </Tooltip>
              <div id="drawing-color-picker" className="colorPicker"></div>
            </div>
            {
              this.state.selectedTool === "draw" &&
                <>
                  <div className="toolOptionsSlider" style={{width: "180px"}}>
                    <EffectSlider name="brushSize" sliderWidth="80" inputWidth="60" updateState={updateState} positioning="horizontal" min={1} max={this.state.canvasWidth} value={this.state.brushSize} defaultValue={ this.state.brushSize } title="Size:" onAfterChange={(value) => {
                      this.photoEditorLib.setBrushSize(value);
                    }}/>
                  </div>
                  <div className="toolOptionsSlider" style={{width: "240px"}}>
                    <EffectSlider name="brushHardness" sliderWidth="80" inputWidth="60" updateState={updateState} positioning="horizontal" min={0} max={100} value={this.state.brushHardness} defaultValue={this.state.brushHardness} title="Hardness:" onAfterChange={(value) => {
                      this.photoEditorLib.softBrush.setHardness(value / 100);
                    }}/>
                  </div>
                </>
            }
            {
              this.state.selectedTool === "erase" &&
                <>
                  <Button id="eraseAllDrawingButton" onClick={() => {
                    this.photoEditorLib.eraseAllDrawing();
                  }} type="dashed" size="default">Erase All</Button>
                  <div className="toolOptionsSlider" style={{width: "180px"}}>
                    <EffectSlider name="brushSize" sliderWidth="80" inputWidth="60" updateState={updateState} positioning="horizontal" min={1} max={this.state.canvasWidth} value={this.state.brushSize} defaultValue={ this.state.brushSize } title="Size:" onAfterChange={(value) => {
                      this.photoEditorLib.setBrushSize(value);
                    }}/>
                  </div>
                  <div className="toolOptionsSlider" style={{width: "240px"}}>
                    <EffectSlider name="brushHardness" sliderWidth="80" inputWidth="60" updateState={updateState} positioning="horizontal" min={10} max={100} value={this.state.brushHardness} defaultValue={this.state.brushHardness} title="Hardness:" onAfterChange={(value) => {
                      this.photoEditorLib.softBrush.setHardness(value / 100);
                    }}/>
                  </div>
                </>
            }
            <div className="colorPickerContainer" style={{display: this.state.selectedTool === "addText" ? "block" : "none"}}>
              <Tooltip title="Color">
                <div className="colorPickerButtonContainer">
                  <div className="colorPickerButtonTilePattern" style={{backgroundImage: "url(images/background_tile_pattern.png)"}}></div>
                  <button id="text-color-picker-button" className="colorPickerButton" onClick={() => {
                    this.photoEditorLib.showColorPicker("text-color-picker");
                  }}></button>
                </div>
              </Tooltip>
              <div id="text-color-picker" className="colorPicker"></div>
            </div>
            <div id="fontMenuContainer" style={{display: this.state.selectedTool === "addText" ? "inline-block" : "none", marginLeft: "10px"}}>
              <Tooltip title="Font">
                <Select className="fontMenu" size="default" value={this.state.selectedTextFont} defaultValue="Impact" onChange={(fontName) => {
                  this.setState({
                    selectedTextFont: fontName
                  })
                  this.photoEditorLib.setSelectedFont(fontName);
                }}>
                  {
                    this.fonts.map((fontName, index) => (
                      <Select.Option key={index} value={fontName}><span style={{fontFamily: fontName}}>{fontName}</span></Select.Option>
                    ))
                  }
                </Select>
              </Tooltip>
            </div>
            <Tooltip title="Emoji Sticker">
              <Button id="addTextEmojiButton" className="addTextEmojiButton" style={{display: this.state.selectedTool === "addText" ? "inline-block" : "none"}} onClick={(e) => {
                this.photoEditorLib.shortCutsTempDisabled = true;
                var closeEventHandler = () => {
                  this.photoEditorLib.shortCutsTempDisabled = false;
                  this.photoEditorLib.emojiPicker.off("hidden", closeEventHandler)
                }
                this.photoEditorLib.emojiPicker.showPicker(e.target);
                this.photoEditorLib.emojiPicker.on("hidden", closeEventHandler)
              }}>😀</Button>
            </Tooltip>
            <div className="colorPickerContainer" style={{display: this.state.selectedTool === "eyedrop" ? "block" : "none"}}>
              <Tooltip title="Color">
                <div id="eyedrop-color-picker-button" className="colorPickerButton" onClick={() => {
                }}></div>
              </Tooltip>
            </div>
            {
              this.state.selectedTool === "move" &&
                <>
                  <Checkbox defaultChecked={true} onChange={(e) => {
                    this.photoEditorLib.toggleSnapToEdges(e.target.checked);
                  }}>Snap to edges</Checkbox>
                </>
            }
          </div>
          {
            this.state.imageInstanced &&
              <Tooltip title="Delete Canvas">
                <div className="clearCanvasButton">
                  <ConfirmPopupButton onOk={() => {
                    this.photoEditorLib.removeImageInstance();
                  }} content={
                    <img className="toolIcon undoRedoButton" src="images/times-circle_antd-colors.svg" height="18px"></img>
                  } />
                </div>
              </Tooltip>
          }
          <Tooltip title="Redo">
            <img className={"toolIcon redoButton undoRedoButton " + (this.state.redosAmount > 0 ? "" : "undoRedoButtonDisabled")} src="images/redo.svg" height="18px" onClick={() => {
              this.photoEditorLib.redo();
            }}></img>
          </Tooltip>
          <Tooltip title="Undo">
            <img className={"toolIcon undoButton undoRedoButton " + (this.state.undosAmount > 0 ? "" : "undoRedoButtonDisabled")} src="images/redo.svg" height="18px" onClick={() => {
              this.photoEditorLib.undo();
            }}></img>
          </Tooltip>
        </div>
        <div className="canvasTools">
          <div id="canvasesContainer" className="canvasesContainer">
            <div className="emptyCanvasImage">
              {
                !this.state.imageInstanced && !this.state.canvasesContainerLoading && !this.state.error &&
                  <Empty
                    image="images/image-outline.svg"
                    imageStyle={{
                      height: 160,
                      filter: "invert(1) brightness(0.25)"
                    }}
                    description={
                      <>
                        <p className="emptyText"></p>
                      </>
                    }
                    >
                  </Empty>
              }
              {
                !this.state.webGLSupported &&
                  <Empty
                    image={<RobotOutlined id="robotImage"/>}
                    imageStyle={{
                      height: 80,
                      filter: "brightness(0.25)"
                    }}
                    description={
                      <>
                        <p className="emptyText">{(() => {

                          var baseMessage = "WebGL is not enabled.";

                          var browser = detect();

                          if (browser) {

                            if (browser.name === "chrome") {
                              return <span>{baseMessage} <a target="_blank" href="https://wevideo.zendesk.com/hc/en-us/articles/225259448-How-to-enable-WebGL"> Enable WebGL</a></span>
                            }

                            if (browser.name === "firefox") {
                              return <span>{baseMessage} <a target="_blank" href="https://wevideo.zendesk.com/hc/en-us/articles/225259448-How-to-enable-WebGL"> Enable WebGL</a></span>
                            }

                            if (browser.name === "opera") {
                              return <span>{baseMessage} <a target="_blank" href="https://wevideo.zendesk.com/hc/en-us/articles/225259448-How-to-enable-WebGL"> Enable WebGL</a></span>
                            }

                            if (browser.name === "safari") {
                              return <span>{baseMessage} <a target="_blank" href="https://wevideo.zendesk.com/hc/en-us/articles/225259448-How-to-enable-WebGL"> Enable WebGL</a></span>
                            }

                            if (browser.name === "edge") {
                              return <span>{baseMessage} <a target="_blank" href="https://www.picmonkey.com/help/errors-and-troubleshooting/crashes-and-performance/how-to-enable-webgl#:~:text=%E2%80%A2,-Microsoft%20Edge&text=In%20an%20Edge%20browser%20window,so%20the%20change%20takes%20effect."> Enable WebGL</a></span>
                            }

                          }

                          return baseMessage;
                        })()}</p>
                      </>
                    }
                    >
                  </Empty>
              }
            </div>
            <ContextMenu visible={this.state.contextMenuVisible} onVisibleChange={(visible, setOptions, setMenuVisible) => {
              var target = this.photoEditorLib.getKonvaTarget();

              this.setState({
                contextMenuVisible: visible
              });

              if (target === this.photoEditorLib.konvaLib.getBackgroundImage() || !target || target === this.photoEditorLib.konvaLib.getColorBackgroundImage()) {
                setOptions([]);
                return;
              }

              if (target instanceof this.photoEditorLib.Konva.Image) {
                setOptions(["Bring To Front", "Delete Image Layer"]);
                return;
              }

              if (target instanceof this.photoEditorLib.Konva.Text) {
                setOptions(["Delete"]);
                return;
              }

            }} onClick={(target) => {
              this.setState({
                contextMenuVisible: false
              });
              if (target.key === "Delete Image Layer") {
                this.photoEditorLib.deleteSelectedImage();
                return;
              }
              if (target.key === "Bring To Front") {
                this.photoEditorLib.bringSelectedImageToFront();
                return;
              }
              if (target.key === "Edit Text") {

                return;
              }
              if (target.key === "Delete") {
                this.photoEditorLib.deleteSelectedText();
                return;
              }
            }}>
              <div id="canvasesZoomContainer" style={{visibility: "hidden"}}>
                <div id="konvaImagesContainer" className="canvasContainer" style={{ position: "absolute", top: 0, left: 0, backgroundColor: "transparent", pointerEvents: "none" }}/>
                <Canvas id="drawingCanvas" containerId="drawingCanvasContainer" style={{ position: "absolute", top: 0, left: 0, backgroundColor: "transparent", pointerEvents: "none", paddingTop: "0.2px" }}/>
                <div id="konvaTransformersContainer" className="canvasContainer" style={{ position: "absolute", top: 0, left: 0, backgroundColor: "transparent", pointerEvents: "none" }}/>
                <Canvas id="overlayCanvas" containerId="overlayCanvasContainer" style={{ position: "absolute", top: 0, left: 0, backgroundColor: "transparent", pointerEvents: "none" }}/>
                <Canvas id="colorPickerCanvas" containerId="colorPickerCanvasContainer" style={{ position: "absolute", top: 0, left: 0, backgroundColor: "transparent", pointerEvents: "none"}}/>
                <Canvas id="cursorCanvas" containerId="cursorCanvasContainer" style={{ position: "absolute", top: 0, left: 0, backgroundColor: "transparent", pointerEvents: "none" }}/>
              </div>
            </ContextMenu>
            <Canvas id="cropDummyCanvas" containerId="cropDummyCanvasContainer" style={{ position: "absolute", top: 0, left: 0, backgroundColor: "transparent", pointerEvents: "none", visibility: "hidden", display: "none" }}/>
            {
              this.state.selectedTool === "crop" &&
                <>
                    <div className="resolutionTag">
                      {this.state.cropBoxWidth} px x {this.state.cropBoxHeight} px
                    </div>
                    <Button onClick={async (e) => {
                      await this.photoEditorLib.acceptCrop();
                      this.setState({
                        showAcceptCancelMenu: false
                      });
                      this.photoEditorLib.inCropMode = false;
                    }} id="cropAccept" type="primary" className="cropAccept"><img className="whiteCheckmark" src="images/check.svg" height="18px"></img></Button>
                    <Button onClick={() => {
                      this.photoEditorLib.endCrop();
                      this.setState({
                        showAcceptCancelMenu: false
                      });
                      this.photoEditorLib.inCropMode = false;
                    }} id="cropCancel" className="cropCancel">Cancel</Button>
                </>
            }
            {
              this.state.canvasesContainerLoading &&
                <div style={{position: "absolute", top: "0px", left: "0px", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Spin size="large" spinning={this.state.canvasesContainerLoading} tip={!this.state.imageInstanced ? "Loading image..." : ""}>
                  </Spin>
                </div>
            }
          </div>
          <div className="toolIcons">
            <Tooltip placement="right" title="Crop">
              <div id="cropToolButton" className={`toolIconContainer${this.state.selectedTool === "crop" ? " toolIconContainerSelected" : ""}`} onClick={(e) => {
                if (!this.state.imageInstanced) return;
                if (this.state.selectedTool === "crop") return;
                if (this.state.selectedTool === "drag") this.photoEditorLib.konvaLib.stage.listening(true);
                if (this.state.selectedTool === "draw") this.photoEditorLib.disableDrawingCanvas();
                if (this.state.selectedTool === "addText") this.photoEditorLib.untargetKonvaText(this.photoEditorLib.konvaTextTarget);
                if (this.state.selectedTool === "eyedrop") this.photoEditorLib.disableColorPickerMode();
                this.setState({
                  showAcceptCancelMenu: true,
                  selectedTool: "crop",
                  inCropMode: true
                });
                this.photoEditorLib.selectedTool = "crop";
                this.photoEditorLib.beginCrop();
              }}>
                <img className="cropToolIcon toolIcon" src="images/crop-alt.svg" width="24px"></img>
              </div>
            </Tooltip>
            <Tooltip placement="right" title="Add Text">
              <div id="addTextToolButton" className={`toolIconContainer${this.state.selectedTool === "addText" ? " toolIconContainerSelected" : ""}`} onClick={(e) => {
                if (!this.state.imageInstanced) return;
                if (this.state.selectedTool === "addText") return;
                if (this.state.selectedTool === "drag") this.photoEditorLib.konvaLib.stage.listening(true);
                if (this.state.selectedTool === "erase") this.photoEditorLib.disableDrawingCanvas();
                if (this.state.selectedTool === "crop") this.photoEditorLib.endCrop();
                if (this.state.selectedTool === "draw") this.photoEditorLib.disableDrawingCanvas();
                if (this.state.selectedTool === "eyedrop") this.photoEditorLib.disableColorPickerMode();
                this.photoEditorLib.readdAllAnchors();
                this.photoEditorLib.focusCanvasContainer("overlayCanvasContainer");
                this.setState({
                  selectedTool: "addText"
                });
                this.photoEditorLib.selectedTool = "addText";
                this.photoEditorLib.enableTextColorPicker();
              }}>
                <img className="addTextToolIcon toolIcon" src="images/text.svg" width="24px"></img>
              </div>
            </Tooltip>
            <Tooltip placement="right" title="Paint">
              <div id="paintToolButton" className={`toolIconContainer${this.state.selectedTool === "draw" ? " toolIconContainerSelected" : ""}`} onClick={(e) => {
                if (!this.state.imageInstanced) return;
                if (this.state.selectedTool === "draw") return;
                if (this.state.selectedTool === "drag") this.photoEditorLib.konvaLib.stage.listening(true);
                if (this.state.selectedTool === "erase") this.photoEditorLib.disableDrawingCanvas();
                if (this.state.selectedTool === "crop") this.photoEditorLib.endCrop();
                if (this.state.selectedTool === "addText") this.photoEditorLib.untargetKonvaText(this.photoEditorLib.konvaTextTarget);
                if (this.state.selectedTool === "eyedrop") this.photoEditorLib.disableColorPickerMode();
                this.photoEditorLib.focusCanvasContainer("drawingCanvasContainer");
                this.setState({
                  selectedTool: "draw"
                });
                this.photoEditorLib.selectedTool = "draw";
                this.photoEditorLib.disableDrawingEraser();
                this.photoEditorLib.enableDrawingCanvas();
                this.photoEditorLib.konvaImagesContainer.style.cursor = "none";
                this.photoEditorLib.drawToolWasJustSelected = true;
              }}>
                <img className="toolIcon" src="images/brush.svg" height="18px"></img>
              </div>
            </Tooltip>
            <Tooltip placement="right" title="Erase">
              <div  id="eraseToolButton" className={`toolIconContainer${this.state.selectedTool === "erase" ? " toolIconContainerSelected" : ""}`} onClick={(e) => {
                if (!this.state.imageInstanced) return;
                if (this.state.selectedTool === "erase") return;
                if (this.state.selectedTool === "drag") this.photoEditorLib.konvaLib.stage.listening(true);
                if (this.state.selectedTool === "crop") this.photoEditorLib.endCrop();
                if (this.state.selectedTool === "draw") this.photoEditorLib.disableDrawingCanvas();
                if (this.state.selectedTool === "addText") this.photoEditorLib.untargetKonvaText(this.photoEditorLib.konvaTextTarget);
                if (this.state.selectedTool === "eyedrop") this.photoEditorLib.disableColorPickerMode();
                this.photoEditorLib.focusCanvasContainer("drawingCanvasContainer");
                this.setState({
                  selectedTool: "erase"
                });
                this.photoEditorLib.selectedTool = "erase";
                this.photoEditorLib.enableDrawingCanvas();
                this.photoEditorLib.enableDrawingEraser();
                this.photoEditorLib.konvaImagesContainer.style.cursor = "none";
              }}>
                <img className="toolIcon" src="images/eraser-filled.svg" height="18px"></img>
              </div>
            </Tooltip>
            <Tooltip placement="right" title="Pick Color">
              <div id="eyedropToolButton" className={`toolIconContainer${this.state.selectedTool === "eyedrop" ? " toolIconContainerSelected" : ""}`} onClick={(e) => {
                if (!this.state.imageInstanced) return;
                if (this.state.selectedTool === "eyedrop") return;
                if (this.state.selectedTool === "drag") this.photoEditorLib.konvaLib.stage.listening(true);
                if (this.state.selectedTool === "crop") this.photoEditorLib.endCrop();
                if (this.state.selectedTool === "draw") this.photoEditorLib.disableDrawingCanvas();
                if (this.state.selectedTool === "erase") this.photoEditorLib.disableDrawingCanvas();
                if (this.state.selectedTool === "addText") this.photoEditorLib.untargetKonvaText(this.photoEditorLib.konvaTextTarget);
                this.photoEditorLib.enableColorPickerMode();
                this.setState({
                  selectedTool: "eyedrop"
                });
                this.photoEditorLib.selectedTool = "eyedrop";
              }}>
                <img className="toolIcon" src="images/eyedrop.svg" height="18px"></img>
              </div>
            </Tooltip>
            <Tooltip placement="right" title="Rotate Images 90° [R]">
              <div className="toolIconContainer" style={{display: "none"}} onClick={() => {
                if (!this.state.imageInstanced) return;
                this.photoEditorLib.rotate();
              }}>
                <img  id="rotateToolButton" className="toolIcon" src="images/refresh.svg" height="18px" style={{transform: "scaleX(-1)"}}></img>
              </div>
            </Tooltip>
            <Tooltip placement="right" title="Select">
              <div id="move-tool-icon" className={`toolIconContainer${this.state.selectedTool === "move" ? " toolIconContainerSelected" : ""}`} onClick={() => {
                if (!this.state.imageInstanced) return;
                if (this.state.selectedTool === "move") return;
                if (this.state.selectedTool === "drag") this.photoEditorLib.konvaLib.stage.listening(true);
                if (this.state.selectedTool === "crop") this.photoEditorLib.endCrop();
                if (this.state.selectedTool === "draw") this.photoEditorLib.disableDrawingCanvas();
                if (this.state.selectedTool === "erase") this.photoEditorLib.disableDrawingCanvas();
                if (this.state.selectedTool === "addText") this.photoEditorLib.untargetKonvaText(this.photoEditorLib.konvaTextTarget);
                if (this.state.selectedTool === "eyedrop") this.photoEditorLib.disableColorPickerMode();
                this.photoEditorLib.konvaImagesContainer.style.cursor = "move";
                this.photoEditorLib.focusCanvasContainer("konvaImagesContainer");
                this.setState({
                  selectedTool: "move"
                });
                this.photoEditorLib.selectedTool = "move";
              }}>
                <div style={{position: "relative"}}>
                  <img className="toolIcon" src="images/images.svg" height="18px"></img>
                  <img style={{position: "absolute", top: "8px", left: "2px", filter: "invert(1)"}} className="toolIcon" src="images/mouse.svg" height="12px"></img>
                </div>
              </div>
            </Tooltip>
            <Tooltip placement="right" title="Drag">
              <div className={`toolIconContainer${this.state.selectedTool === "drag" ? " toolIconContainerSelected" : ""}`} onClick={() => {
                if (!this.state.imageInstanced) return;
                if (this.state.selectedTool === "drag") return;
                if (this.state.selectedTool === "crop") this.photoEditorLib.endCrop();
                if (this.state.selectedTool === "draw") this.photoEditorLib.disableDrawingCanvas();
                if (this.state.selectedTool === "addText") this.photoEditorLib.untargetKonvaText(this.photoEditorLib.konvaTextTarget);
                if (this.state.selectedTool === "eyedrop") this.photoEditorLib.disableColorPickerMode();
                this.photoEditorLib.konvaImagesContainer.style.cursor = "grab";
                this.photoEditorLib.focusCanvasContainer("konvaImagesContainer");
                this.photoEditorLib.konvaLib.stage.listening(false);
                this.photoEditorLib.beginDragMode();
                this.setState({
                  selectedTool: "drag"
                });
                this.photoEditorLib.selectedTool = "drag";
              }}>
                <img id="dragToolButton" className="toolIcon" src="images/hand-right.svg" height="18px"></img>
              </div>
            </Tooltip>
          </div>
          <div id="tools" className="toolsMenuContainer">
            <Tabs type="card" tabBarStyle={{fontSize: "11px"}} tabBarGutter={0} size="small" defaultActiveKey="1" onChange={(activeKey) => {
              this.setState({
                selectedTab: activeKey
              });
            }}>
              <Tabs.TabPane tab="Filters" key="1">
                <div className="filtersTabContainer">
                  <Collapse ghost={true} className="site-collapse-custom-collapse">
                    <Collapse.Panel header={<FilterCollapseHeader showRefreshButton={
                      this.state.blur > 0 ? true : false
                    } onRefreshButtonClick={() => {
                      this.setState({
                        blur: 0
                      });
                      this.photoEditorLib.setSelectedImageFilter("blur", [0, 20]);
                    }} title="Blur"/>} key="1" className="site-collapse-custom-panel">
                      <EffectSlider name="blur" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={100} updateState={updateState} value={this.state.blur} defaultValue={this.state.blur} title="Blur" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("blur", [value, 20]);
                      }}/>
                    </Collapse.Panel>
                  </Collapse>
                  <Collapse ghost={true} className="site-collapse-custom-collapse">
                    <Collapse.Panel header={<FilterCollapseHeader showRefreshButton={
                      this.state.bulgePinchRadius > 0 ||
                      this.state.bulgePinchStrength > 0 ||
                      this.state.bulgePinchCenterX > 0 ||
                      this.state.bulgePinchCenterY > 0
                      ? true : false
                    } onRefreshButtonClick={(e) => {
                      this.setState({
                        bulgePinchRadius: 0,
                        bulgePinchStrength: 0,
                        bulgePinchCenterX: 0,
                        bulgePinchCenterY: 0
                      });
                      this.photoEditorLib.setSelectedImageFilter("bulge/pinch", [{
                        center: [0, 0],
                        radius: 0,
                        strength: 0
                      }]);
                    }} title="Bulge/Pinch"/>} key="1" className="site-collapse-custom-panel">
                      <EffectSlider name="bulgePinchRadius" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={this.state.selectedImageWidth} updateState={updateState} value={this.state.bulgePinchRadius} defaultValue={this.state.bulgePinchRadius} title="Bulge/Pinch Radius" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("bulge/pinch", [{
                          center: [this.state.bulgePinchCenterX / 100, this.state.bulgePinchCenterY / 100],
                          radius: value,
                          strength: this.state.bulgePinchStrength / 100
                        }]);
                      }}/>
                      <EffectSlider name="bulgePinchStrength" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={-100} max={100} updateState={updateState} value={this.state.bulgePinchStrength} defaultValue={this.state.bulgePinchStrength} title="Bulge/Pinch Strength" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("bulge/pinch", [{
                          center: [this.state.bulgePinchCenterX / 100, this.state.bulgePinchCenterY / 100],
                          radius: this.state.bulgePinchRadius,
                          strength: value / 100
                        }]);
                      }}/>
                      <EffectSlider name="bulgePinchCenterX" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={100} updateState={updateState} value={this.state.bulgePinchCenterX} defaultValue={Math.round(this.state.canvasWidth / 2)} title="Bulge/Pinch Center X" onAfterChange={(value) => {



                        setTimeout(() => {
                          this.photoEditorLib.setSelectedImageFilter("bulge/pinch", [{
                            center: [value / 100, this.state.bulgePinchCenterY / 100],
                            radius: this.state.bulgePinchRadius,
                            strength: this.state.bulgePinchStrength / 100
                          }]);
                          this.setState({
                            canvasesContainerLoading: false
                          })
                        }, 50)


                      }}/>
                      <EffectSlider name="bulgePinchCenterY" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={100} updateState={updateState} value={this.state.bulgePinchCenterY} defaultValue={Math.round(this.state.canvasHeight / 2)} title="Bulge/Pinch Center Y" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("bulge/pinch", [{
                          center: [this.state.bulgePinchCenterX / 100, value / 100],
                          radius: this.state.bulgePinchRadius,
                          strength: this.state.bulgePinchStrength / 100
                        }]);
                      }}/>
                    </Collapse.Panel>
                  </Collapse>
                  <Collapse ghost={true} className="site-collapse-custom-collapse">
                    <Collapse.Panel header={<FilterCollapseHeader showRefreshButton={
                      this.state.twistRadius > 0 ||
                      this.state.twistAngle > 0 ||
                      this.state.twistX > 0 ||
                      this.state.twistY > 0
                      ? true : false
                    } onRefreshButtonClick={(e) => {
                      this.setState({
                        twistRadius: 0,
                        twistAngle: 0,
                        twistX: 0,
                        twistY: 0
                      });
                      this.photoEditorLib.setSelectedImageFilter("twist", [0, 0], {
                        offset: this.photoEditorLib.PixiLib.getPoint(0, 0)
                      });
                    }} title="Twist"/>} key="2" className="site-collapse-custom-panel">
                      <EffectSlider name="twistRadius" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={this.state.selectedImageWidth} updateState={updateState} value={this.state.twistRadius} defaultValue={this.state.twistRadius} title="Twist Radius" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("twist", [value, this.state.twistAngle], {
                          offset: this.photoEditorLib.PixiLib.getPoint(this.state.twistX, this.state.twistY)
                        });
                      }}/>
                      <EffectSlider name="twistAngle" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={-10} max={10} updateState={updateState} value={this.state.twistAngle} defaultValue={this.state.twistAngle} title="Twist Angle" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("twist", [this.state.twistRadius, value], {
                          offset: this.photoEditorLib.PixiLib.getPoint(this.state.twistX, this.state.twistY)
                        });
                      }}/>
                      <EffectSlider name="twistX" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={this.state.selectedImageWidth} updateState={updateState} value={this.state.twistX} defaultValue={this.state.twistX} title="Twist X" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("twist", [this.state.twistRadius, this.state.twistAngle], {
                          offset: this.photoEditorLib.PixiLib.getPoint(value, this.state.twistY)
                        });
                      }}/>
                      <EffectSlider name="twistY" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={this.state.selectedImageWidth} updateState={updateState} value={this.state.twistY} defaultValue={this.state.twistY} title="Twist Y" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("twist", [this.state.twistRadius, this.state.twistAngle], {
                          offset: this.photoEditorLib.PixiLib.getPoint(this.state.twistX, value)
                        });
                      }}/>
                    </Collapse.Panel>
                  </Collapse>
                  <Collapse ghost={true} className="site-collapse-custom-collapse">
                    <Collapse.Panel header={<FilterCollapseHeader showRefreshButton={
                      this.state.zoomBlurStrength > 0 ||
                      this.state.zoomBlurCenterX > 0 ||
                      this.state.zoomBlurCenterY > 0 ||
                      this.state.zoomBlurInnerRadius > 0 ||
                      this.state.zoomBlurOuterRadius > 0
                      ? true : false
                    } onRefreshButtonClick={(e) => {
                      this.setState({
                        zoomBlurStrength: 0,
                        zoomBlurCenterX: 0,
                        zoomBlurCenterY: 0,
                        zoomBlurInnerRadius: 0,
                        zoomBlurOuterRadius: 0
                      });
                      this.photoEditorLib.setSelectedImageFilter("zoomblur", [{
                        strength: 0,
                        center: [0, 0],
                        innerRadius: 0,
                        radius: 0
                      }]);
                    }} title="Zoom Blur"/>} key="3" className="site-collapse-custom-panel">
                      <EffectSlider name="zoomBlurStrength" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={100} updateState={updateState} value={this.state.zoomBlurStrength} defaultValue={this.state.zoomBlurStrength} title="Zoom Blur Strength" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("zoomblur", [{
                          strength: value / 100,
                          center: [this.state.zoomBlurCenterX, this.state.zoomBlurCenterY],
                          innerRadius: this.state.zoomBlurInnerRadius,
                          radius: this.state.zoomBlurOuterRadius
                        }]);
                      }}/>
                      <EffectSlider name="zoomBlurCenterX" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={this.state.selectedImageWidth} updateState={updateState} value={this.state.zoomBlurCenterX} defaultValue={Math.round(this.state.canvasWidth / 2)} title="Zoom Blur Center X" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("zoomblur", [{
                          strength: this.state.zoomBlurStrength / 100,
                          center: [value, this.state.zoomBlurCenterY],
                          innerRadius: this.state.zoomBlurInnerRadius,
                          radius: this.state.zoomBlurOuterRadius
                        }]);
                      }}/>
                      <EffectSlider name="zoomBlurCenterY" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={this.state.selectedImageHeight} updateState={updateState} value={this.state.zoomBlurCenterY} defaultValue={Math.round(this.state.canvasHeight / 2)} title="Zoom Blur Center Y" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("zoomblur", [{
                          strength: this.state.zoomBlurStrength / 100,
                          center: [this.state.zoomBlurCenterX, value],
                          innerRadius: this.state.zoomBlurInnerRadius,
                          radius: this.state.zoomBlurOuterRadius
                        }]);
                      }}/>
                      <EffectSlider name="zoomBlurInnerRadius" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={Math.max(this.state.selectedImageWidth, this.state.selectedImageHeight)} updateState={updateState} value={this.state.zoomBlurInnerRadius} defaultValue={0} title="Zoom Blur Inner Radius" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("zoomblur", [{
                          strength: this.state.zoomBlurStrength / 100,
                          center: [this.state.zoomBlurCenterX, this.state.zoomBlurCenterY],
                          innerRadius: value,
                          radius: this.state.zoomBlurOuterRadius
                        }]);
                      }}/>
                      <EffectSlider name="zoomBlurOuterRadius" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={0} max={Math.max(this.state.selectedImageWidth, this.state.selectedImageHeight)} updateState={updateState} value={this.state.zoomBlurOuterRadius} defaultValue={Math.max(this.state.canvasWidth, this.state.canvasHeight)} title="Zoom Blur Outer Radius" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("zoomblur", [{
                          strength: this.state.zoomBlurStrength / 100,
                          center: [this.state.zoomBlurCenterX, this.state.zoomBlurCenterY],
                          innerRadius: this.state.zoomBlurInnerRadius,
                          radius: value
                        }]);
                      }}/>
                    </Collapse.Panel>
                  </Collapse>
                  <Collapse ghost={true} className="site-collapse-custom-collapse">
                    <Collapse.Panel header={<FilterCollapseHeader showRefreshButton={
                      this.state.motionBlurVelocityX !== 0 ||
                      this.state.motionBlurVelocityY !== 0 ||
                      this.state.motionBlurQuality !== 5
                      ? true : false
                    } onRefreshButtonClick={(e) => {
                      this.setState({
                        motionBlurVelocityX: 0,
                        motionBlurVelocityY: 0,
                        motionBlurQuality: 5
                      });
                      this.photoEditorLib.setSelectedImageFilter("motionblur", [
                        [0, 0],
                        (5)
                      ]);
                    }} title="Motion Blur"/>} key="4" className="site-collapse-custom-panel">
                      <EffectSlider name="motionBlurVelocityX" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={-90} max={90} updateState={updateState} value={this.state.motionBlurVelocityX} defaultValue={this.state.motionBlurVelocityX} title="Motion Blur Velocity X" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("motionblur", [
                          [value, this.state.motionBlurVelocityY],
                          (2 * Math.round(this.state.motionBlurQuality / 2) + 1)
                        ]);
                      }}/>
                      <EffectSlider name="motionBlurVelocityY" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={-90} max={90} updateState={updateState} value={this.state.motionBlurVelocityY} defaultValue={this.state.motionBlurVelocityY} title="Motion Blur Velocity Y" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("motionblur", [
                          [this.state.motionBlurVelocityX, value],
                          (2 * Math.round(this.state.motionBlurQuality / 2) + 1)
                        ]);
                      }}/>
                      <EffectSlider name="motionBlurQuality" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={5} max={50} updateState={updateState} value={this.state.motionBlurQuality} defaultValue={this.state.motionBlurQuality} title="Motion Blur Quality" onAfterChange={(value) => {
                        this.photoEditorLib.setSelectedImageFilter("motionblur", [
                          [this.state.motionBlurVelocityX, this.state.motionBlurVelocityY],
                          (2 * Math.round(value / 2) + 1)
                        ]);
                      }}/>
                    </Collapse.Panel>
                  </Collapse>
                  <h4 style={{display: "flex", justifyContent:"space-between", alignItems: "center", marginTop: "10px", marginLeft: "0px"}}></h4>
                  { /* <div style={{display: "flex", justifyContent:"center", alignItems: "center", marginBottom: "10px"}}>
                    <DropdownMenu items={this.selectableFilters} defaultSelectedKey={0} onSelect={(selectedItem) => {
                      this.photoEditorLib.setImageFilter(selectedItem);
                    }}/>
                  </div> */ }
                  {
                    this.state.imageFilterPreviewsLoading &&
                      <div style={{position: "absolute", top: "90px", left: "0px", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center"}}>
                        <Spin spinning={this.state.imageFilterPreviewsLoading}>
                        </Spin>
                      </div>
                  }
                  {
                    this.state.selectedTargetImage &&
                      <ImageGridMenu width={150} updateState={updateState} onSelectChange={(selectedFilterName) => {
                        if (this.state.filter === selectedFilterName) return;
                        this.setState({
                          canvasesContainerLoading: true
                        })
                        setTimeout(() => {
                          this.photoEditorLib.setSelectedImageFilter(selectedFilterName);
                          this.setState({
                            canvasesContainerLoading: false
                          });
                        }, 50)
                      }} titles={this.selectableFilters} images={this.state.filterPreviewImages} selectedIndex={this.selectableFilters.indexOf(this.state.filter)} />
                  }
                </div>
              </Tabs.TabPane>
              <Tabs.TabPane tab="Colors" key="2">
                <div style={{width: "96%", margin: "auto"}}>
                  <EffectSlider name="contrast" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={-100} max={100} updateState={updateState} value={this.state.contrast} defaultValue={this.state.contrast} title="Contrast" onAfterChange={(value) => {
                    this.photoEditorLib.setSelectedImageFilter("contrast", [value / 100 + 1]);
                  }}/>
                  <EffectSlider name="brightness" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={-100} max={100} updateState={updateState} value={this.state.brightness} defaultValue={this.state.brightness} title="Brightness" onAfterChange={(value) => {
                    this.photoEditorLib.setSelectedImageFilter("brightness", [value / 100 + 1]);
                  }}/>
                  <EffectSlider name="gamma" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={-100} max={100} updateState={updateState} value={this.state.gamma} defaultValue={this.state.gamma} title="Gamma" onAfterChange={(value) => {
                    this.photoEditorLib.setSelectedImageFilter("gamma", [value / 100 + 1]);
                  }}/>
                  <EffectSlider name="saturation" disabled={this.state.selectedTargetImage ? false : true} showInput={true} min={-100} max={100} updateState={updateState} value={this.state.saturation} defaultValue={this.state.saturation} title="Saturation" onAfterChange={(value) => {
                    this.photoEditorLib.setSelectedImageFilter("saturation", [value / 100 + 1]);
                  }}/>
                </div>
              </Tabs.TabPane>
              <Tabs.TabPane tab="Background" key="3">
              </Tabs.TabPane>
            </Tabs>
            <div style={{width: "96%", margin: "auto"}}>
              <div style={{height:"24px", position: "relative", display: this.state.selectedTab === "3" ? "block" : "none"}}>
                <div style={{display: "flex", alignItems: "center", position: "relative"}}>
                  <div className="optionsTabTitle"><h5>Background color: </h5></div>
                  <div className="optionsTabValue" style={{position: "relative", height: "24px"}}>
                    <Tooltip title="Color">
                      <div style={{position: "relative", marginLeft: "10px", height: "24px", width: "24px"}}>
                        <div className="colorPickerButton" style={{pointerEvents: "none", zIndex: 1, position: "absolute", top: "0px", left: "0px", backgroundImage: "url(images/background_tile_pattern.png)", backgroundSize: "cover"}}></div>
                        <button style={{zIndex: 2, position: "absolute", top: "0px", left: "0px"}} id="background-color-picker-button" className="colorPickerButton" onClick={() => {
                          this.photoEditorLib.showColorPicker("background-color-picker");
                        }}></button>
                      </div>
                    </Tooltip>
                    <div id="background-color-picker" className="colorPicker" style={{opacity: 0, visibility: "hidden", transition: "opacity 0.3s"}}></div>
                  </div>
                </div>
                <div style={{display: "flex", alignItems: "center", position: "relative", marginTop: "10px"}}>
                  <div className="optionsTabTitle"><h5>Canvas width: </h5></div>
                  <div className="optionsTabValue">
                    <InputNumber min={100} max={3000} value={this.state.canvasWidth} onFocus={(e) => {
                      this.photoEditorLib.shortCutsTempDisabled = true;
                    }} onBlur={(e) => {
                      if (isNaN(parseFloat(e.target.value))) return;
                      if (!this.photoEditorLib.imageInstanced) return;
                      if (e.target.value === this.state.canvasWidth) return;
                      this.setState({
                        canvasWidth: e.target.value
                      });
                      this.photoEditorLib.shortCutsTempDisabled = false;
                      this.photoEditorLib.setCanvasSize(e.target.value, this.state.canvasHeight);
                    }} onPressEnter={(value) => {
                      if (isNaN(parseFloat(value))) return;
                      if (!this.photoEditorLib.imageInstanced) return;
                      if (value === this.state.canvasWidth) return;
                      this.setState({
                        canvasWidth: value
                      });
                      this.photoEditorLib.setCanvasSize(value, this.state.canvasHeight);
                    }} onStep={(value) => {
                      if (isNaN(parseFloat(value))) return;
                      if (!this.photoEditorLib.imageInstanced) return;
                      if (value === this.state.canvasWidth) return;
                      this.setState({
                        canvasWidth: value
                      });
                      this.photoEditorLib.setCanvasSize(value, this.state.canvasHeight);
                      }} size="small"/>
                  </div>
                </div>
                <div style={{display: "flex", alignItems: "center", position: "relative", marginTop: "10px"}}>
                  <div className="optionsTabTitle"><h5>Canvas height: </h5></div>
                  <div className="optionsTabValue">
                    <InputNumber min={100} max={3000} value={this.state.canvasHeight} onFocus={(e) => {
                      this.photoEditorLib.shortCutsTempDisabled = true;
                    }} onBlur={(e) => {
                      if (isNaN(parseFloat(e.target.value))) return;
                      if (!this.photoEditorLib.imageInstanced) return;
                      if (e.target.value === this.state.canvasHeight) return;
                      this.setState({
                        canvasHeight: e.target.value
                      });
                      this.photoEditorLib.shortCutsTempDisabled = false;
                      this.photoEditorLib.setCanvasSize(this.state.canvasWidth, e.target.value);
                    }} onPressEnter={(value) => {
                      if (isNaN(parseFloat(value))) return;
                      if (!this.photoEditorLib.imageInstanced) return;
                      if (value === this.state.canvasHeight) return;
                      this.setState({
                        canvasHeight: value
                      });
                      this.photoEditorLib.setCanvasSize(this.state.canvasWidth, value);
                    }} onStep={(value) => {
                      if (isNaN(parseFloat(value))) return;
                      if (!this.photoEditorLib.imageInstanced) return;
                      if (value === this.state.canvasHeight) return;
                      this.setState({
                        canvasHeight: value
                      });
                      this.photoEditorLib.shortCutsTempDisabled = false;
                      this.photoEditorLib.setCanvasSize(this.state.canvasWidth, value);
                    }} size="small"/>
                  </div>
                </div>
              </div>
            </div>
            <div className="fileOptionsMenu">
              <div>
                <Upload buttonText="Import Image" onUpload={async (file) => {
                  if (!this.acceptedImageTypes.includes(file.type)) return;

                  if (this.state.imageInstanced) {

                    this.setState({
                      canvasesContainerLoading: true,
                      imageFilterPreviewsLoading: true
                    })

                    await this.photoEditorLib.importImage(file);

                    this.setState({
                      canvasesContainerLoading: false
                    });

                    return;
                  }

                  this.setState({
                    canvasesContainerLoading: true,
                    imageFilterPreviewsLoading: true
                  })

                  await this.photoEditorLib.loadImage(file);

                  this.setState({
                    uploadFileList: [],
                    imageInstanced: true,
                    canvasesContainerLoading: false
                  });
                }}
                accept="image/png,image/jpeg,image/jpg"
                showUploadList={{showPreviewIcon: false}}
                fileList={this.state.uploadFileList}/>
              </div>
              <div style={{marginLeft: "5px"}}>
                <Button type="primary" onClick={() => {
                  this.photoEditorLib.saveImage();
                }}>Save</Button>
                {
                  /*
                  <CustomModal>
                    <div style={{width: "100%", height: "120px", display: "flex", alignItems: "center", justifyContent: "space-around", flexFlow: "column nowrap"}}>
                      <Button type="primary" size="large"><CloudUploadOutlined/> Save to profile </Button>
                      <Button size="large" onClick={() => {
                        this.photoEditorLib.exportImage();
                      }}><DownloadOutlined/> Save to local computer</Button>
                    </div>
                  </CustomModal>
                  */
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default PhotoEditor;
