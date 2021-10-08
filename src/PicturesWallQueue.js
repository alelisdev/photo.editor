
import React from "react";
import { Upload, Modal, Image, Tooltip } from 'antd';
import { PlusOutlined, ToolOutlined, DeleteOutlined, EyeOutlined, UploadOutlined, PictureOutlined } from '@ant-design/icons';
import "./PicturesWallQueue.css";

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

class PicturesWallQueue extends React.Component {
  state = {
    previewVisible: false,
    previewImage: '',
    previewTitle: '',
    images: this.props.images
  };

  handleCancel = () => this.setState({ previewVisible: false });

  handlePreview = async file => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }

    this.setState({
      previewImage: file.url || file.preview,
      previewVisible: true,
      previewTitle: file.name || file.url.substring(file.url.lastIndexOf('/') + 1),
    });
  };

  handleChange = ({ fileList }) => this.setState({ fileList });

  render() {
    console.log("rerendering..")
    const { previewVisible, previewImage, fileList, previewTitle } = this.state;
    const uploadButton = (
      <div>
        <PlusOutlined />
        <div style={{ marginTop: 8 }}>Upload</div>
      </div>
    );
    return (
      <div class="picturesWallQueueMainContainer">
        {
          this.state.images.map((image) => {
            return (
              <div key={image.uid} style={{width: this.props.width + 40, height: this.props.height + 40}} className="picturesWallQueueContainer">
                <Image preview={{visible: this.state.imageShowing === image.uid ? true: false}} className="picturesWallQueuePicture" width={this.props.width} src={image.url}/>
                <div className="picturesWallQueueIconsContainer">
                  <div className="picturesWallQueueIcons">
                    <Tooltip title="View">
                      <EyeOutlined className="picturesWallQueueIcon" onClick={() => {
                        this.setState({
                          imageShowing: image.uid
                        });
                        var clickHandler = () => {
                          this.setState({
                            imageShowing: ""
                          });
                          document.body.removeEventListener("click", clickHandler);
                          document.body.removeEventListener("touch", clickHandler);
                          setTimeout(() => {
                            var imagePreviewOperationsBars = document.getElementsByClassName("ant-image-preview-operations");
                            for (var i = 0; i < imagePreviewOperationsBars.length; i++) {
                              var bar = imagePreviewOperationsBars[i];
                              bar.style.visibility = "visible";
                            }
                          }, 350)
                        }
                        setTimeout(() => {
                          var imagePreviewOperationsBars = document.getElementsByClassName("ant-image-preview-operations");
                          for (var i = 0; i < imagePreviewOperationsBars.length; i++) {
                            var bar = imagePreviewOperationsBars[i];
                            bar.style.visibility = "hidden";
                          }
                          document.body.addEventListener("click", clickHandler);
                          document.body.addEventListener("touch", clickHandler);
                        }, 10);
                      }}/>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <DeleteOutlined className="picturesWallQueueIcon" onClick={() => {
                        if (this.props.onClickDelete) this.props.onClickDelete();
                      }}/>
                    </Tooltip>
                    <Tooltip title="Import">
                      <UploadOutlined className="picturesWallQueueIcon" onClick={() => {
                        this.props.onClickEdit(image);
                      }}/>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>
    );
  }
}

export default PicturesWallQueue;
