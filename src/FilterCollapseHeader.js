
import { ReloadOutlined } from "@ant-design/icons";

function FilterCollapseHeader(props) {

  return (
    <div style={{width: "100%", position: "relative"}}>{props.title}
      <div style={{visibility: (props.showRefreshButton ? "visible" : "hidden")}} className="filtersRefreshButton" onClick={(e) => {
        e.stopPropagation();
        props.onRefreshButtonClick(e)
      }}>
        <ReloadOutlined/>
      </div>
    </div>
  );

}

export default FilterCollapseHeader;
