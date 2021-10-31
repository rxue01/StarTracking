import React, {Component} from 'react';
import { List, Avatar, Button, Checkbox, Spin } from 'antd';
import satellite from "../assets/images/satellite.svg";

class SatelliteList extends Component {
    constructor(){
        super();
        this.state = {
            selected: [],
        };
    }

    onChange = e => { // 此为卫星被选中check box时候触发
        const { dataInfo, checked } = e.target; // checked ---> 此卫星是否点选了
        const { selected } = this.state;
        const list = this.addOrRemove(dataInfo, checked, selected); //新生成一个list，表示在state里面增加或者删除
        this.setState({ selected: list }) // 传入
    }

    addOrRemove = (item, status, list) => { //定义addor Remove
        const found = list.some( entry => entry.satid === item.satid); //list.some:把已点中卫星和在选择list里对比 
        if(status && !found){//若选，但不再list里add
            list.push(item)
        }

        if(!status && found){//若反选，但在list里
            list = list.filter( entry => { // filter是用来删除
                return entry.satid !== item.satid;
            });
        }
        return list;
    }

    onShowSatMap = () =>{
        this.props.onShowMap(this.state.selected);
    }

    render() {
        const satList = this.props.satInfo ? this.props.satInfo.above : [];
        const { isLoad } = this.props;
        const { selected } = this.state;

        return (
            <div className="sat-list-box">
                <Button className="sat-list-btn"
                        size="large"
                        disabled={ selected.length === 0} // 无选中，button disable掉
                        onClick={this.onShowSatMap}
                >Track on the map</Button>
                <hr/>

                {
                    isLoad ?
                        <div className="spin-box">
                            <Spin tip="Loading..." size="large" />
                        </div>
                        :
                        <List
                            className="sat-list"
                            itemLayout="horizontal"
                            size="small"
                            dataSource={satList}
                            renderItem={item => (
                                <List.Item
                                    actions={[<Checkbox dataInfo={item} onChange={this.onChange}/>]}
                                >
                                    <List.Item.Meta
                                        avatar={<Avatar size={50} src={satellite} />}
                                        title={<p>{item.satname}</p>}
                                        description={`Launch Date: ${item.launchDate}`}
                                    />

                                </List.Item>
                            )}
                        />
                }
            </div>
        );
    }
}

export default SatelliteList;

