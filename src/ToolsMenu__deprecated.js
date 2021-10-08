
import React from "react";
import EffectSlider from "./EffectSlider.js";
import TextField from "./TextField.js";
import { Input, Button, Tooltip } from "antd";
import "./ToolsMenu.css";

class ToolsMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      numberOfTextFields: 0,
      showAcceptCancelMenu: false,
    }
    this.inCropMode = false;
    this.texts = [];
  }

  render() {

    return (
      <div id={this.props.id} className="toolsMenuContainer">
        <EffectSlider min={-100} max={100} defaultValue={0} title="Contrast" onChange={(value) => {
          this.props.callToolFunction("contrast", [value])
        }}/>
        <EffectSlider min={-100} max={100} defaultValue={0} title="Brightness" onChange={(value) => {
          this.props.callToolFunction("brightness", [value])
        }}/>
        <EffectSlider min={-100} max={100} defaultValue={0} title="Saturation" onChange={(value) => {
          this.props.callToolFunction("saturate", [value])
        }}/>
        <div className="toolIcons">
          <Tooltip title="Crop">
            <div className={`toolIconContainer${this.state.selectedTool === "crop" ? " toolIconContainerSelected" : ""}`} onClick={(e) => {
              if (this.state.selectedTool === "crop") return;
              if (this.state.selectedTool === "addText") this.props.callToolFunction("removeAllAnchors", [])
              this.props.callToolFunction("focusTool", ["crop"])
              this.setState({
                showAcceptCancelMenu: true,
                selectedTool: "crop",
                inCropMode: true
              });
              this.props.callToolFunction("beginCrop", [])
            }}>
              <img className="toolIcon" src="crop-alt.svg" width="24px"></img>
            </div>
          </Tooltip>
          <Tooltip title="Add Text">
            <div className={`toolIconContainer${this.state.selectedTool === "addText" ? " toolIconContainerSelected" : ""}`} onClick={(e) => {
              if (this.state.selectedTool === "addText") return;
              if (this.state.selectedTool === "crop") this.props.callToolFunction("endCrop", [])
              this.props.callToolFunction("readdAllAnchors", [])
              this.props.callToolFunction("focusTool", ["addText"])
              this.setState({
                selectedTool: "addText"
              })
            }}>
              <img className="toolIcon" src="text.svg" width="24px"></img>
            </div>
          </Tooltip>
          <Tooltip title="Draw">
            <div className={`toolIconContainer${this.state.selectedTool === "draw" ? " toolIconContainerSelected" : ""}`} onClick={(e) => {
              if (this.state.selectedTool === "draw") return;
              if (this.state.selectedTool === "crop") this.props.callToolFunction("endCrop", [])
              if (this.state.selectedTool === "addText") this.props.callToolFunction("removeAllAnchors", [])
              this.props.callToolFunction("focusTool", ["draw"])
              this.setState({
                selectedTool: "draw"
              })
              this.props.callToolFunction("enableDrawing");
            }}>
              <img className="toolIcon" src="pen.svg" height="18px"></img>
            </div>
          </Tooltip>
          {
            this.state.selectedTool === "crop" ?
              ( <>
                  <Button onClick={(e) => {
                    this.props.callToolFunction("acceptCrop", [])

                    this.setState({
                      selectedTool: "",
                      showAcceptCancelMenu: false
                    });
                    this.inCropMode = false;
                  }} type="primary" className="cropAccept"><img className="whiteCheckmark" src="check.svg" height="18px"></img></Button>
                  <Button onClick={() => {
                    this.props.callToolFunction("endCrop", [])
                    this.setState({
                      selectedTool: "",
                      showAcceptCancelMenu: false
                    });
                    this.inCropMode = false;
                  }} className="cropCancel">Cancel</Button>
                </>
              )
              :
              null
          }

        </div>
        {
          this.state.selectedTool === "addText" ?
            <>
            <Button onClick={() => {
              var text = this.props.callToolFunction("addText", [])
              this.texts.push(text);
              this.setState({
                numberOfTexts: this.texts.length
              });
            }} type="dashed" size="small" style={{fontSize: "12px", marginTop: "10px"}}>+ New Text Field</Button>
            <div style={{height: "87px", overflow: "auto", marginTop: "5px"}}>
              {
                this.state.numberOfTexts > 0 ?
                  this.texts.map((text, index) =>
                    <TextField defaultValue="Add Text" key={text._id} onDelete={() => {
                      this.props.callToolFunction("deleteText", [text]);
                      this.texts.splice(this.texts.indexOf(text), 1);
                      this.setState({
                        numberOfTexts: this.state.numberOfTexts - 1
                      });
                      this.forceUpdate();
                    }} onInput={(e) => {
                      this.props.callToolFunction("updateText", [text, e.target.value])
                    }}/>
                  )
                  :
                  null
              }
            </div>
            </>
            :
            null
        }
      </div>
    )
  }

}

export default ToolsMenu;
