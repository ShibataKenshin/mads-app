/*=================================================================================================
// Project: CADS/MADS - An Integrated Web-based Visual Platform for Materials Informatics
//          Hokkaido University (2018)
//          Last Update: Q3 2023
// ________________________________________________________________________________________________
// Authors: Mikael Nicander Kuwahara (Lead Developer) [2021-]
// ________________________________________________________________________________________________
// Description: This is the React Component for the Visualization View of the 'CatalystGeneVC' module
// ------------------------------------------------------------------------------------------------
// Notes: 'CatalystGeneVC' is a visualization component that can display more or less any of the other
//        VizComps available based on a range of available properties.
// ------------------------------------------------------------------------------------------------
// References: React & prop-types Libs
=================================================================================================*/

// IMPORT SECTION
//===================================================================================================================
// Main Dependent libraries (React and related)
//---------------------------------------------
import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as Bokeh from "@bokeh/bokehjs";
import * as allPal from "@bokeh/bokehjs/build/js/lib/api/palettes";
import { cmMax } from '../Views/FormUtils';


// Available Visual Components to be used with this customizable one
//------------------------------------------------------------------
import BarChart from "./BarVis";
import LineChart from "./LineChartVis";
import ClassificationVis from "./ClassificationVis";
import HeatMap from "./HeatMapVis";
import ImageView from "./ImageVis";
import Molecule3D from './Molecule3DVis';
import PeriodicTableChart from "./PeriodicTableVis";
import PieChart from "./PieChartVis";
import QuadBarChart from "./QuadBarChartVis";
import RegressionVis from "./RegressionVis";
import Scatter from "./ScatterVis";
import Scatter3D from './Scatter3DVis';
import { root } from "postcss";


// CONSTANTS AND VARIABLES
//===================================================================================================================

//----------------------------------------------------------------------------------
// CONSTANT VARIABLE: defaultOptions
// object that contains all default settings for this visual component
//----------------------------------------------------------------------------------
const defaultOptions = {
  title: "Catalyst Gene Analysis",           // Displayed Name/Title of the component
  extent: { width: 600, height: 600 },        // Size (Width & Height) of the component
  axisLabels: ['x', 'y'],
  x_range: [-1.0, 10],
  y_range: [-1.0, 10],
  legendLabel: undefined,
  margin: { l: 0, r: 10, b: 10, t: 10},
  modebar: { orientation: 'h'},
  lineWidth: 2,
  lineDash: undefined,
  colorMap: 'Category10',  
  tools: 'pan,crosshair,wheel_zoom,box_zoom,box_select,reset,save',
  mappings: {
    xData: 'xData',
    yData: 'yData',
    heatVal: 'heatVal',
  },
  toolTipTitles: ['XY Cross', 'HeatValue'],
  heatValUnit: '',
  fontSize: '7px'
   // Which Visual Component to use for displaying data
};
//----------------------------------------------------------------------------------


//----------------------------------------------------------------------------------
// CONSTANT VARIABLE: availableComponents
// object that contains all available Visual Coponents this custom component can display
//----------------------------------------------------------------------------------
const availableComponents = {
  BarChart: BarChart,
  LineChart: LineChart,
  ClassificationVis: ClassificationVis,
  HeatMap: HeatMap,
  ImageView: ImageView,
  Molecule3D: Molecule3D,
  PeriodicTableChart: PeriodicTableChart,
  PieChart: PieChart,
  QuadBarChart: QuadBarChart,
  RegressionVis: RegressionVis,
  Scatter: Scatter,
  Scatter3D: Scatter3D,
};
//----------------------------------------------------------------------------------

//===================================================================================================================



// MAIN CLASS OBJECT
//===================================================================================================================

//----------------------------------------------------------------------------------
// CLASS: CatalystGeneVC
// The main Visual Component, that is of custom type, meaning that it can be set and
// configured into any of the exisiting stand alone visual components and more.
//----------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
const getMaxPoint = (linePoints) => {
  let maxPoint = -Infinity;
  linePoints.forEach(line => {
    line.forEach(point => {
      if (point > maxPoint) {
        maxPoint = point;
      }
    });
  });
  return maxPoint;
};


function Clustering({
  data,
  options,
  selectedIndices,
  onSelectedIndicesChange,
  colorMap
}){
  const internalOptions = Object.assign({}, defaultOptions, options);
  const internalData = data;
  const rootNode = useRef(null);
  useEffect(() => {
    if (!rootNode.current) return;
    rootNode.current.innerHTML = '';
    console.log(rootNode)
    const rootCatalyst = data["rootCatalyst"];
    const similarGeneCatalyst = data["similarGeneCatalyst"]
    const { extent, margin } = internalOptions;
    const { width, height } = extent;
    const { l: left, r: right, t: top, b: bottom } = margin;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const yTicklabels = internalData['clusteringTicks']
    const linePoints = internalData['clusteringData'];
    const maxXPoint = getMaxPoint(linePoints.map(p => [p[0], p[2]]));
    const maxYPoint = getMaxPoint(linePoints.map(p => [p[1], p[3]]));
  
    const scaleX = plotWidth / maxXPoint;
    const scaleY = plotHeight / maxYPoint;
    console.log("yscale of clustering is" + scaleY.toString())


    const source = new Bokeh.ColumnDataSource({
      data: {
        x0: linePoints.map(p => (p[0] * scaleX * 0.95 + plotWidth*0.05)),
        y0: linePoints.map(p => (p[1] * scaleY * 0.95 + plotHeight*0.025)),
        x1: linePoints.map(p => (p[2] * scaleX * 0.95 + plotWidth*0.05)),
        y1: linePoints.map(p => (p[3] * scaleY * 0.95 + plotHeight*0.025)),
      }
    });

    const minY = Math.min(Math.min(...source.data.y0),Math.min(...source.data.y1))
    const maxY = Math.max(Math.max(...source.data.y0),Math.max(...source.data.y1))
    const yTickPoint = yTicklabels.map((label, index) => ((maxY - minY) / (yTicklabels.length - 1)) * index + minY)
    const yTickDiff = yTickPoint[1] - yTickPoint[0]
    const xRange = new Bokeh.Range1d({ start: 0, end: plotWidth });
    const yRange = new Bokeh.Range1d({ start: 0, end: plotHeight });

    const plot = new Bokeh.Plotting.figure({
      tools: internalOptions.tools,
      width: plotWidth,
      height: plotHeight,
      x_range: xRange,
      y_range: yRange,
    });

    const hierarchy = plot.segment({ field: 'x0' }, { field: 'y0' }, { field: 'x1' }, { field: 'y1' }, { source });

    const similarGeneCatalystIndxs = similarGeneCatalyst.map((label,index) => yTicklabels.indexOf(label))
    const similarGeneCatalystYPoints = similarGeneCatalystIndxs.map((index) => yTickPoint[index])
    const circleX = Array.from({ length: similarGeneCatalystYPoints.length }, () => plotWidth*0.02);
    const rootCatalystIndex =  yTicklabels.indexOf(rootCatalyst)
    const yRootCatalyst = yTickPoint[rootCatalystIndex]
    const circleColor = similarGeneCatalystYPoints.map((yPoint) => yPoint === yRootCatalyst ? 'green': 'yellow');
    const ellipseheight = Array.from({ length: similarGeneCatalystYPoints.length }, () => yTickDiff*0.98);
    const ellipsewidth = Array.from({ length: similarGeneCatalystYPoints.length }, () => 15);


    const similarGeneSource = new Bokeh.ColumnDataSource({
      data: {
        xData: circleX,
        yData: similarGeneCatalystYPoints,
        height:ellipseheight,
        width:ellipsewidth,
        color:circleColor,
      }
    });

    const circles = plot.ellipse({
      x: { field: "xData" },
      y: { field: "yData" },
      width: { field: "width" },
      height: { field: "height" },
      fill_color:{ field: "color" },
      line_color:{ field: "color" },
      source: similarGeneSource,
    });

    if (yTicklabels.length > 0) {
      const yaxis = plot.yaxis[0];
      yaxis.ticker = new Bokeh.FixedTicker({ ticks: yTickPoint });
      yaxis.major_label_orientation = 0;
      yaxis.formatter = new Bokeh.FuncTickFormatter({
        args: { labels: yTicklabels, tickPoints: yTickPoint },
        code: `
          const ind = tickPoints.indexOf(tick);
          return labels[ind] ? labels[ind] : '';
        `
      });    
    }

    Bokeh.Plotting.show(plot, rootNode.current);

  }, [data]);

  return(
    <div>
      <div ref={rootNode} />
    </div>
  );
}

 function HeatMapGene({
  data,
  options,
  selectedIndices,
  onSelectedIndicesChange,
  colorMap
}){
  const internalOptions = Object.assign({}, defaultOptions, options);
  const internalData = data.heatmapData;
  const rootNode = useRef(null);
  
  useEffect(() => {
    if (!rootNode.current) return;
    rootNode.current.innerHTML = '';
    const rootCatalyst = data["rootCatalyst"];
    const similarGeneCatalyst = data["similarGeneCatalyst"]
    const { extent, margin } = internalOptions;
    const { width, height } = extent;
    const { l: left, r: right, t: top, b: bottom } = margin;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const yTicklabels =internalData['yTicks']
    const xTicklabels =internalData['xTicks']
    const xAxisRange = Math.max(...internalData['xData']) - Math.min(...internalData['xData']);
    const yAxisRange = Math.max(...internalData['yData']) - Math.min(...internalData['yData']);
    const scaleX = plotWidth / (xAxisRange + 1);
    const scaleY = plotHeight / (yAxisRange + 1);
    const xRange = new Bokeh.Range1d({ start: 0, end: plotWidth });
    const yRange = new Bokeh.Range1d({ start: 0, end: plotHeight });
  

    let colors = internalOptions.colors;
    if(!colors){
      colors = (cmMax[internalOptions.colorMap] != undefined) ? allPal[internalOptions.colorMap+cmMax[internalOptions.colorMap]] : allPal[defaultOptions.colorMap+cmMax[defaultOptions.colorMap]];
    }

    const colMapMinMax = internalOptions.colorMapperMinMax ? internalOptions.colorMapperMinMax : [Math.min(...(internalData["heatVal"])), Math.max(...(internalData["heatVal"]))];
    var mapper = new Bokeh.LinearColorMapper({palette: colors, low: colMapMinMax[0], high: colMapMinMax[1]});
    const source = new Bokeh.ColumnDataSource({
      data: {
        xData: internalData['xData'].map(x => x * scaleX * 0.95 + scaleX/2 + plotWidth*0.05),
        yData: internalData['yData'].map(y => y * scaleY * 0.95 + scaleY/2+ plotHeight*0.025),
        heatVal: internalData['heatVal'],
        x0: internalData['xData'].map(x => 0),
        y0: internalData['yData'].map(y => 0),
      }
    });

    const minY = Math.min(...source.data.yData);
    const maxY = Math.max(...source.data.yData);
    const yTickPoint = yTicklabels.map((label, index) => ((maxY - minY) / (yTicklabels.length - 1)) * index + minY)
    const yTickDiff = yTickPoint[1]-yTickPoint[0]
    const similarGeneCatalystIndxs = similarGeneCatalyst.map((label,index) => yTicklabels.indexOf(label))
    const similarGeneCatalystYPoints = similarGeneCatalystIndxs.map((index) => yTickPoint[index])
    const circleX = Array.from({ length: similarGeneCatalystYPoints.length }, () => plotWidth*0.02);
    const ellipseheight = Array.from({ length: similarGeneCatalystYPoints.length }, () => yTickDiff*0.98);
    const ellipsewidth = Array.from({ length: similarGeneCatalystYPoints.length }, () => 15);

    const rootCatalystIndex =  yTicklabels.indexOf(rootCatalyst)
    const yRootCatalyst = yTickPoint[rootCatalystIndex]
    const circleColor = similarGeneCatalystYPoints.map((yPoint) => yPoint === yRootCatalyst ? 'green': 'yellow');

    const similarGeneSource = new Bokeh.ColumnDataSource({
      data: {
        xData: circleX,
        yData: similarGeneCatalystYPoints,
        height:ellipseheight,
        width:ellipsewidth,
        color:circleColor,
      }
    });

    // async source.connect(source.selected.change, () => {
    //   handleSelectedIndicesChange(source)
    // })

    const plot = new Bokeh.Plotting.figure({
      tools: internalOptions.tools,
      width: plotWidth,
      height: plotHeight,
      x_range: xRange,
      y_range: yRange,
    });

    const circles = plot.ellipse({
      x: { field: "xData" },
      y: { field: "yData" },
      width: { field: "width" },
      height: { field: "height" },
      fill_color:{ field: "color" },
      line_color:{ field: "color" },
      source: similarGeneSource,
    });

    const renderer = plot.rect({
      x: { field: "xData" },
      y: { field: "yData" },
      width: scaleX,
      height: scaleY,
      source: source,
      fill_color: {
        field: "heatVal",
        transform: mapper
      },
      line_color: "black",
    });
    

    // let activeToolTipTitles = internalOptions.toolTipTitles || defaultOptions.toolTipTitles;
    // let activeHeatValUnit = (internalOptions.heatValUnit || defaultOptions.heatValUnit);
    // if(activeHeatValUnit == "%%"){ activeHeatValUnit = "%" }
    // const tooltip = activeToolTipTitles.length == 2 ?
    // [
    //   [activeToolTipTitles[0], '@'+"xData"+' @'+"yData"],
    //   [activeToolTipTitles[1], '@'+"heatVal"+' '+activeHeatValUnit],
    // ] :
    // [
    //   [activeToolTipTitles[0], '@'+"xData"],
    //   [activeToolTipTitles[1], '@'+"yData"],
    //   [activeToolTipTitles[2], '@'+"heatVal"+' '+activeHeatValUnit],
    // ];
    // plot.add_tools(new Bokeh.HoverTool({ tooltips: tooltip, renderers: [renderer] }));
    const color_bar = new Bokeh.ColorBar({
      color_mapper: mapper,
      major_label_text_font_size: internalOptions.fontSize || defaultOptions.fontSize,
      ticker: new Bokeh.BasicTicker({desired_num_ticks: colors.length}),
      formatter: new Bokeh.PrintfTickFormatter({format: "%f"+(internalOptions.heatValUnit || defaultOptions.heatValUnit)}),
      label_standoff: 6,
      border_line_color: null
    });

    plot.add_layout(color_bar, 'right');
    const labelColors = yTicklabels.map(label => label === rootCatalyst ? 'red' : 'black');
    const x0 = yTickPoint.map(y => 0)
    source.data['labelColors'] = labelColors;

    if (yTicklabels.length > 0) {
      const yaxis = plot.yaxis[0];
      yaxis.ticker = new Bokeh.FixedTicker({ ticks: yTickPoint });
      yaxis.major_label_orientation = 0;
      yaxis.formatter = new Bokeh.FuncTickFormatter({
        args: { labels: yTicklabels, tickPoints: yTickPoint, rootCatalyst: rootCatalyst},
        code: `
          const ind = tickPoints.indexOf(tick);
          return labels[ind]
          `
      });    
    }




    // const callback = new Bokeh.CustomJS({
    //   args: { yaxis: plot.yaxis[0], rootCatalyst: rootCatalyst, yTicklabels: yTicklabels, yTickPoint: yTickPoint },
    //   code: `
    //       // y軸のラベル要素を取得
    //       const labels = document.querySelectorAll('.bk-axis-tick');
    //       labels.forEach((label, index) => {
    //           const tickText = label.innerText.trim();
    //           if (tickText === rootCatalyst) {
    //               label.style.color = 'red';
    //           } else {
    //               label.style.color = 'black';
    //           }
    //       });
    //   `
    // });
   Bokeh.Plotting.show(plot, rootNode.current);
    // plot.js_event_callbacks = {'reset': [callback]};

  }, [data])

  return(
    <div id="containerHolder">
      <div ref={rootNode} />
    </div>
  );
}

function emptyCatalystGeneVC({data, options}) {
  const rootNode = useRef(null);
  useEffect(() => {
    if (!rootNode.current) return;
    rootNode.current.innerHTML = '';
    const internalOptions = Object.assign({}, defaultOptions, options);
    const internalData = data;

    const plot = Bokeh.Plotting.figure({
      title: internalOptions.title || 'Plot',
      tools: internalOptions.tools,
      x_range: internalOptions.x_range || [-1, 1],
      y_range: internalOptions.y_range || [-1, 1],
      width: internalOptions.extent.width || 400,
      height: internalOptions.extent.height || 400,
      toolbar_location: 'right',
    });

    Bokeh.Plotting.show(plot, rootNode.current);
  }, [data, options]);

  return (
    <div>
      <div ref={rootNode} />
    </div>
  );
}

function componentSelector(data){
  const columnNumber = (data && data.scaledData) ? Object.keys(data.scaledData).length : 0;
  const visualization = data && data["visualizationMethod"];
  let SelComp = emptyCatalystGeneVC;
  if (columnNumber > 0 && visualization){
    if (visualization === "Hierarchical Clustering"){
      SelComp = Clustering;
    } else if (visualization === 'Heatmap'){
      SelComp = HeatMapGene;
    }
  }
  return SelComp
}
export default function CatalystGene({
  actions, 
  appMgs,
  filteredIndices,
  id,
  data, 
  options, 
  colorTags, 
  selectedIndices, 
  onSelectedIndicesChange,
  mappings,
  originalOptions,
  
  }){
  useEffect(() => {
    if(data && data.resetRequest){
      internalOptions.title = "EMPTY CUSTOM COMPONENT";
      delete data.resetRequest;
    }
  }, [data]);

  const internalData = data
  const internalOptions = Object.assign({}, defaultOptions, options);
  const internalProps = Object.assign({}, colorTags, selectedIndices, onSelectedIndicesChange);
  const SelComp = componentSelector(internalData)
  const params = { data, mappings, options, colorTags, selectedIndices, onSelectedIndicesChange,}

  return (
    <div id="containerHolder">
      <SelComp {...params} />
    </div>
  );

}



//----------------------------------------------------------------------------------
// OPJECT DEFINES: propTypes
// Defining the types for various properties this Visual Component should manage
// and recieve.
//----------------------------------------------------------------------------------
CatalystGene.propTypes = {
  options: PropTypes.shape({
    title: PropTypes.string,
    VisComp: PropTypes.string,
    extent: PropTypes.shape({
      width: PropTypes.number,
      height: PropTypes.number,
    }),
  }),
  colorTags: PropTypes.arrayOf(PropTypes.object),
  selectedIndices: PropTypes.arrayOf(PropTypes.number),
  filteredIndices: PropTypes.arrayOf(PropTypes.number),
  onSelectedIndicesChange: PropTypes.func,
};

//----------------------------------------------------------------------------------

//----------------------------------------------------------------------------------
// OPJECT DEFINES: defaultProps
// Defining the default initial values for the various parameters this Visual
// Component should use.
//----------------------------------------------------------------------------------
CatalystGene.defaultProps = {
  options: defaultOptions,
};
//----------------------------------------------------------------------------------

//===================================================================================================================
