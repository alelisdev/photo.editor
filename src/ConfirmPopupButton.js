
import { Modal, Button, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';


function ConfirmPopupButton(props) {

  const { confirm } = Modal;

  function showConfirm() {
    confirm({
      title: 'Do you Want to delete these items?',
      icon: <ExclamationCircleOutlined />,
      content: 'Some descriptions',
      onOk() {
        console.log('OK');
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  }

  function showPromiseConfirm() {
    confirm({
      title: 'Do you want to delete these items?',
      icon: <ExclamationCircleOutlined />,
      content: 'When clicked the OK button, this dialog will be closed after 1 second',
      onOk() {
        return new Promise((resolve, reject) => {
          setTimeout(Math.random() > 0.5 ? resolve : reject, 1000);
        }).catch(() => console.log('Oops errors!'));
      },
      onCancel() {},
    });
  }

  function showDeleteConfirm() {
    confirm({
      title: 'Delete the whole canvas?',
      icon: <ExclamationCircleOutlined />,
      content: 'Reset and delete the whole canvas?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk() {
        props.onOk();
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  }

  function showPropsConfirm() {
    confirm({
      title: 'Are you sure delete this task?',
      icon: <ExclamationCircleOutlined />,
      content: 'Some descriptions',
      okText: 'Yes',
      okType: 'danger',
      okButtonProps: {
        disabled: true,
      },
      cancelText: 'No',
      onOk() {
        console.log('OK');
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  }

  return (
    <div onClick={showDeleteConfirm}>
      {props.content}
    </div>
  )
}

export default ConfirmPopupButton;
