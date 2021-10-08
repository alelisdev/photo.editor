import { Tabs } from 'antd';

const { TabPane } = Tabs;

function callback(key) {
  console.log(key);
}

const ToolTabs = () => (
  <Tabs type="card" tabBarStyle={{fontSize: "11px"}} tabBarGutter={0} size="small" defaultActiveKey="1" onChange={callback}>
    <TabPane tab="Filters" key="1">
    </TabPane>
    <TabPane tab="Adjustments" key="2">
    </TabPane>
  </Tabs>
);

export default ToolTabs;
