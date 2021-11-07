import React from "react";
/*import logo from './logo.svg'; */
import './App.less';
/*import { Image, Button, Modal } from "antd";
import { CloudUploadOutlined, ExclamationCircleOutlined } from "@ant-design/icons"*/
import PhotoEditor from "./PhotoEditor.js";
/*import PicturesWallQueue from "./PicturesWallQueue.js";*/
import 'cropperjs/dist/cropper.css';

class App extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    /*
    var testImages = [
      {
        uid: '-1',
        name: 'image.png',
        status: 'done',
        url: 'asian-girl.png',
      },
      {
        uid: '-2',
        name: 'image.png',
        status: 'done',
        url: 'tesla.png',
      },
      {
        uid: '-3',
        name: 'image.png',
        status: 'done',
        url: 'city_view.jpg',
      },
      {
        uid: '-4',
        name: 'image.png',
        status: 'done',
        url: 'spiderman-pointing.jpg',
      },
      {
        uid: '-5',
        name: 'image.png',
        status: 'done',
        url: 'white-background.png',
      }
    ]; **/
    return (
      <div className="photoEditorOuterWrapper">
        {
          /*
          <div className="testLeftSidebar"></div>
          */
        }
        <div className="photoEditorContainer">
          <PhotoEditor/>
          {
          /*
          <div style={{display: "flex", alignItems: "center", marginTop: "80px", padding: "10px"}}>
            <h2 style={{padding: "10px", fontWeight: "600"}}>Your Memes</h2>
          </div>
          <div>
            <PicturesWallQueue width={240} height={240} images={testImages} onClickEdit={(image) => {

              var loadImage = () => {
                var img = document.createElement("img");

                img.src = image.url;

                img.onload = () => {
                  if (window.photoEditorLib.imageInstanced) {
                    window.photoEditorLib.importImage(img);
                  } else {
                    window.photoEditorLib.loadImage(img);
                  }
                }

                document.getElementById("mainContainer").parentElement.scrollTop = 0;
              }

              loadImage();

            }}/>
          </div> 
          */
          }
        </div>
        {
          /*
          <div className="testRightSidebar"></div>
          */
        }
      </div>

    );
  }
}

export default App;
