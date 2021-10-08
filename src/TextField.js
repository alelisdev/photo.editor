
import {Input} from "antd";
import { DeleteOutlined } from "@ant-design/icons"

export default function TextField(props) {

  return (
    <div>
      <h5 style={{marginBottom: "5px", marginTop: "5px"}}>
        Text Field
        <DeleteOutlined style={{fontSize: "14px", color: "#ff7875", cursor: "pointer", marginLeft: "5px"}} onClick={props.onDelete}/>
      </h5>
      <Input.TextArea onChange={props.onInput} defaultValue={props.defaultValue} size="small" style={{fontSize: "12px"}}/>
    </div>
  )

}
