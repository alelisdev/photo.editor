
import { useState } from "react";
import { Menu, Dropdown } from 'antd';


function ContextMenu(props) {

  var defaultOptions = ["Bring To Front", "Delete"];

  var [options, setOptions] = useState(defaultOptions);
  var [menuVisible, setMenuVisible] = useState(false);

  const menu = (
    options.length > 0 ?
      <Menu onClick={props.onClick}>
        {
          options.map((option) => (
            <Menu.Item key={option}>{option}</Menu.Item>
          ))
        }
      </Menu>
      :
      <span style={{pointerEvents: "none"}}></span>
  );

  return (
    <Dropdown visible={props.visible} onVisibleChange={(visible) => {
      props.onVisibleChange(visible, setOptions, setMenuVisible);
    }} overlay={menu} trigger={['contextMenu']}>
      { props.children }
    </Dropdown>
  )

}

export default ContextMenu;
