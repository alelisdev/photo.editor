
import React from "react";
import { Modal, Button } from 'antd';

class CustomModal extends React.Component {

  constructor(props) {
    super(props);
    this.state = { visible: false };
  }

  showModal = () => {
    this.setState({
      visible: true,
    });
  };

  handleOk = e => {
    /* this.setState({
      visible: false,
    }); */
  };

  handleCancel = e => {
    this.setState({
      visible: false,
    });
  };

  render() {
    return (
      <>
        <Button type="primary" onClick={this.showModal}>
          Save
        </Button>
        <Modal
          width={640}
          title={this.props.title}
          visible={this.state.visible}
          onOk={this.handleOk}
          onCancel={this.handleCancel}
          okButtonProps={{id: "saveImageButton"}}
          okText="Save"
          footer={null}
        >
          {this.props.children}
        </Modal>
      </>
    );
  }
}

export default CustomModal
