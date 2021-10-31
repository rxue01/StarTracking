import React, { Component } from "react";
import axios from "axios";
import { Spin } from "antd";
import { feature } from "topojson-client";
import { geoKavrayskiy7 } from "d3-geo-projection";
import { geoGraticule, geoPath } from "d3-geo";
import { select as d3Select } from "d3-selection";
import { schemeCategory10 } from "d3-scale-chromatic";
import * as d3Scale from "d3-scale";
import { timeFormat as d3TimeFormat } from "d3-time-format";

import {
  WORLD_MAP_URL,
  SATELLITE_POSITION_URL,
  SAT_API_KEY,
} from "../constants";

// import世界地图

const width = 960; //地图尺寸
const height = 600;

class WorldMap extends Component {
    constructor(){
        super();
        this.state = {
            isLoading: false,
            isDrawing: false,

        }
        this.map = null;

        this.refMap = React.createRef(); // ref：canvas要求的
        this.color = d3Scale.scaleOrdinal(schemeCategory10);
   
        this.refTrack = React.createRef();

    }

    componentDidMount() {
        axios.get(WORLD_MAP_URL) //拉数据
            .then(res => {
                const { data } = res;
                const land = feature(data, data.objects.countries).features;
                this.generateMap(land); //画图方法
            })
            .catch(e => console.log('err in fecth world map data ', e))
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.satData !== this.props.satData) { //若新选中数据不等于之前的数据
          const { latitude, longitude, elevation, duration } =
            this.props.observerData;
          const endTime = duration * 60; //读取的是分钟数据
    
          this.setState({
            isLoading: true,
          });
          const urls = this.props.satData.map((sat) => {
            const { satid } = sat;
            const url = `/api/${SATELLITE_POSITION_URL}/${satid}/${latitude}/${longitude}/${elevation}/${endTime}/&apiKey=${SAT_API_KEY}`;
            //每条都执行
            return axios.get(url);
          });
    
          Promise.all(urls) // 打包所有URL
          .then((res) => { // 所有url都没有问题的话：
            const arr = res.map((sat) => sat.data); // 新data数组
            this.setState({
              isLoading: false,
              isDrawing: true, //没画完
            });
  
            if (!prevState.isDrawing) { //有url 出问题的话：
                this.track(arr);
              } else {
                const oHint = document.getElementsByClassName("hint")[0];
                oHint.innerHTML =
                  "Please wait for these satellite animation to finish before selection new ones!"; //若没有画完，又点
              }
            })
            .catch((e) => {
              console.log("err in fetch satellite position -> ", e.message);
            });
        }
      }
    
      track = (data) => { //
        if (!data[0].hasOwnProperty("positions")) { //确认有propert
          throw new Error("no position data");
        } //sanity check
    
        const len = data[0].positions.length;
        const { context2 } = this.map;
    
        let now = new Date();  //画出时间--》运行时候的时间
    
        let i = 0;
    
        let timer = setInterval(() => { // 两个参数， p1 & p2每隔p2时间，做一次p1
          let ct = new Date();
    
          let timePassed = i === 0 ? 0 : ct - now;
          let time = new Date(now.getTime() + 60 * timePassed); 
    
          context2.clearRect(0, 0, width, height); //擦除之前的点
    
          context2.font = "bold 14px sans-serif";
          context2.fillStyle = "#333";
          context2.textAlign = "center";
          context2.fillText(d3TimeFormat(time), width / 2, 10);
    
          if (i >= len) { //大于900点之后不需要再画， 需要return
            clearInterval(timer); //
            this.setState({ isDrawing: false });
            const oHint = document.getElementsByClassName("hint")[0];
            oHint.innerHTML = "";
            return;
          }
    
          data.forEach((sat) => {
            const { info, positions } = sat;
            this.drawSat(info, positions[i]);
          });
    
          i += 60; //计数器
        }, 1000); 
      };
    
      drawSat = (sat, pos) => { //一个卫星
        const { satlongitude, satlatitude } = pos; //拆卸
    
        if (!satlongitude || !satlatitude) return;
    
        const { satname } = sat;
        const nameWithNumber = satname.match(/\d+/g).join("");
    
        const { projection, context2 } = this.map;
        const xy = projection([satlongitude, satlatitude]);
    
        context2.fillStyle = this.color(nameWithNumber);
        context2.beginPath();
        context2.arc(xy[0], xy[1], 4, 0, 2 * Math.PI);
        context2.fill();
    
        context2.font = "bold 11px sans-serif";
        context2.textAlign = "center";
        context2.fillText(nameWithNumber, xy[0], xy[1] + 14);
      };
        
    generateMap(land){
        const projection = geoKavrayskiy7() // 在配置世界地图的投影
            .scale(170) //
            .translate([width / 2, height / 2])
            .precision(.1); //精度

        const graticule = geoGraticule(); //经纬线

        const canvas = d3Select(this.refMap.current) // 
            .attr("width", width)
            .attr("height", height);

        let context = canvas.node().getContext("2d"); //“2d”的图

        let path = geoPath() //计算路径（用来作画）
            .projection(projection)
            .context(context); // API

        land.forEach(ele => { //
            //画国家
            context.fillStyle = '#B3DDEF'; //填充颜色
            context.strokeStyle = '#000'; // 线条颜色
            context.globalAlpha = 0.7; //
            context.beginPath(); // 开始作画方法
            path(ele);
            context.fill();
            context.stroke();
            //画经纬度
            context.strokeStyle = 'rgba(220, 220, 220, 0.1)';
            context.beginPath();
            path(graticule());
            context.lineWidth = 0.1;
            context.stroke();
            //画外框
            context.beginPath();
            context.lineWidth = 0.5;
            path(graticule.outline()); // 
            context.stroke();
        })
    }

    render() {
        const { isLoading } = this.state;
        return (
            <div className="map-box">
        {isLoading ? (
          <div className="spinner">
            <Spin tip="Loading..." size="large" />
          </div>
        ) : null}
        <canvas className="map" ref={this.refMap} /> 
        <canvas className="track" ref={this.refTrack} />
        <div className="hint" />
      </div>

        );
        //两个canvas： 一个地图，一个作画
    }
    generateMap = (land) => {
        const projection = geoKavrayskiy7()
          .scale(170)
          .translate([width / 2, height / 2])
          .precision(0.1);
    
        const graticule = geoGraticule();
    
        const canvas = d3Select(this.refMap.current)
          .attr("width", width)
          .attr("height", height);
    
        const canvas2 = d3Select(this.refTrack.current)
          .attr("width", width)
          .attr("height", height);
    
        const context = canvas.node().getContext("2d");
        const context2 = canvas2.node().getContext("2d");
    
        let path = geoPath().projection(projection).context(context);
    
        land.forEach((ele) => {
          context.fillStyle = "#B3DDEF";
          context.strokeStyle = "#000";
          context.globalAlpha = 0.7;
          context.beginPath();
          path(ele);
          context.fill();
          context.stroke();
    
          context.strokeStyle = "rgba(220, 220, 220, 0.1)";
          context.beginPath();
          path(graticule());
          context.lineWidth = 0.1;
          context.stroke();
    
          context.beginPath();
          context.lineWidth = 0.5;
          path(graticule.outline());
          context.stroke();
        });
    
        this.map = {
          projection: projection,
          graticule: graticule,
          context: context,
          context2: context2,
        };
      };
}

export default WorldMap;

