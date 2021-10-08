import React, { useState } from "react";
import { Slider, Switch, InputNumber } from 'antd';

function EffectSlider({ min, max, value, disabled, defaultValue, title, onAfterChange, positioning, sliderWidth, inputWidth, showInput, updateState, name }) {

  console.log(value)

  return (
    <div style={
      {
        display: positioning === "horizontal" ? "flex" : "block",
        flexFlow: positioning === "horizontal" ? "row nowrap" : "column nowrap",
        width: "100%",
        alignItems: "center"
      }
    }>
      <div style={{display: "flex", justifyContent: "space-between"}}>
        <h5 style={{marginBottom: (positioning === "horizontal" ? "0px" : "auto")}}>{title}</h5>
        {
          showInput && positioning !== "horizontal" &&
            <InputNumber disabled={disabled} min={min} max={max} value={value} defaultValue={defaultValue} size="small" onChange={(newValue) => {
              if (isNaN(newValue)) return;
              if (value === newValue) return;
              newValue = Math.min(max, newValue);
              newValue = Math.max(min, newValue);
              var stateObj = {};
              stateObj[name] = newValue;
              stateObj.canvasesContainerLoading = true;
              updateState(stateObj);
              setTimeout(() => {
                onAfterChange(newValue);
                updateState({canvasesContainerLoading: false});
              }, 50);
            }}/>
        }

      </div>
      <div style={positioning === "horizontal" ? {width: sliderWidth + "px", marginLeft: "10px"} : {width: "100%"}}>
        <Slider disabled={disabled} min={min} max={max} onChange={(newValue) => {
          updateState(name, newValue);
        }} onAfterChange={(newValue) => {
          if (isNaN(newValue)) return;
          newValue = Math.min(max, newValue);
          newValue = Math.max(min, newValue);
          var stateObj = {};
          stateObj[name] = newValue;
          stateObj.canvasesContainerLoading = true;
          updateState(stateObj);
          setTimeout(() => {
            onAfterChange(newValue);
            updateState({canvasesContainerLoading: false});
          }, 50);
        }} value={value} defaultValue={defaultValue} />
      </div>
      {
        positioning === "horizontal" &&
          <InputNumber style={{width: inputWidth ? inputWidth + "px" : null, marginLeft: "5px"}} disabled={disabled} min={min} max={max} value={value} defaultValue={defaultValue} size="small" onChange={(newValue) => {
            if (isNaN(newValue)) return;
            newValue = Math.min(max, newValue);
            newValue = Math.max(min, newValue);
            var stateObj = {};
            stateObj[name] = newValue;
            stateObj.canvasesContainerLoading = true;
            updateState(stateObj);
            setTimeout(() => {
              onAfterChange(newValue);
              updateState({canvasesContainerLoading: false});
            }, 50);
          }}/>
      }
    </div>
  );
}

export default EffectSlider;
