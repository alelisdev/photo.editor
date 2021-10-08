
import { useState } from "react";
import { Image, Tooltip } from "antd"
import "./ImageGridMenu.less";

function ImageGridMenu(props) {

  var images = props.images ? props.images : [];

  return (
    <div>
      {
        props.images.map((imageSrc, index) => (
          <Tooltip title={props.titles[index]}>
            <div className="imageGridMenuImageContainer" onClick={() => {
              props.updateState("filter", props.titles[index]);
              props.onSelectChange(props.titles[index]);
            }}>
              <img key={props.titles[index]}
              className={props.selectedIndex === index ? "imageGridMenuImage imageGridMenuImageSelected" : "imageGridMenuImage"}
                width={props.width ? props.width : 70}
                src={imageSrc instanceof HTMLImageElement ? imageSrc.src : imageSrc}
              />
            </div>
          </Tooltip>
        ))
      }
    </div>
  );

}

export default ImageGridMenu;
