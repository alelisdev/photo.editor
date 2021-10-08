
import { Menu, Dropdown, Tooltip } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import React, { useState } from 'react';

export default function({ items, defaultSelectedKey, onSelect, aStyle }) {

  var [selectedKey = defaultSelectedKey, setSelectedKey] = useState(0);

  var menu = (
    <Menu onClick={(item) => {
      onSelect(items[item.key]);
      setSelectedKey(item.key);
    }}>
      {
        items.map((item, index) => (
          <Menu.Item key={index}>
            <a target="_blank" rel="noopener noreferrer">
              { item }
            </a>
          </Menu.Item>
        ))
      }
    </Menu>
  )

  return (
    <Dropdown overlay={menu}>
      <Tooltip title="Font">
        <a style={aStyle} className="ant-dropdown-link" onClick={e => e.preventDefault()}>
          { items[selectedKey] } <DownOutlined />
        </a>
      </Tooltip>
    </Dropdown>
  )

}
