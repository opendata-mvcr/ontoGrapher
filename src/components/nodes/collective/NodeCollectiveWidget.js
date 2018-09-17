import * as React from "react";
import {NodeCollectiveModel} from "./NodeCollectiveModel";
import { PortWidget } from "storm-react-diagrams";

export interface NodeCollectiveWidgetProps {
    node: NodeCollectiveModel;
    size?: number;
}

export interface NodeCollectiveWidgetState {}

export class NodeCollectiveWidget extends React.Component<NodeCollectiveWidgetProps, NodeCollectiveWidgetState>{
    constructor(props: NodeCollectiveWidgetProps){
        super(props);
        this.state = {};
    }

    changeName(str: string){
        this.props.node.changeName(str);
    }

    render(){
        let attrkey = 0;
        let height = 48;
        height += this.props.node.attributes.length * 15;
        let select = "black";
        if (this.props.node.selected){
            select = "blue";
        }
        const attrs = this.props.node.attributes.map((attr) =>
            <tspan key={attrkey++} x="5px" dy="15px">{attr.getFirst() + ": " + attr.getSecond()}</tspan>
        )
        return (
            <div className={"collective-node"} width={this.props.size} height={height} onDoubleClick={event => {let str = prompt("Enter name:"); this.changeName(str);this.forceUpdate();}}>
                <svg
                    width={this.props.size}
                    height={height}>

                    <g>
                        <rect fill="#ffffff" stroke={select} strokeWidth="3" width={this.props.size}
                              height={height}></rect>
                        <text width={this.props.size} textAnchor="middle" dominantBaseline="hanging" x="50%" y="5px" fill="#000000">«collective»</text>
                        <line x1="0" x2={this.props.size} y1="20px" y2="20px" strokeWidth="1" stroke="#000000"/>
                        <text width={this.props.size} textAnchor="middle" dominantBaseline="hanging" x="50%" y="25px" fill="#000000">{this.props.node.name}</text>
                        <text width={this.props.size} textAnchor="start" dominantBaseline="hanging" x="5px" y="30px" fill="#000000">
                            {attrs}
                        </text>
                    </g>
                </svg>
                <div style={{position: "absolute",
                    zIndex: 10,
                    top: height / 2 - 8,
                    left: -8
                }}
                >
                <PortWidget name="left" node={this.props.node}/>
                </div>
                <div style={{position: "absolute",
                    zIndex: 10,
                    left: this.props.size / 2 - 8,
                    top: -8
                }}
                >
                    <PortWidget name="top" node={this.props.node}/>
                </div>
                <div style={{position: "absolute",
                    zIndex: 10,
                    left: this.props.size - 8,
                    top: height / 2 - 8
                }}
                >
                    <PortWidget name="right" node={this.props.node}/>
                </div>
                <div style={{position: "absolute",
                    zIndex: 10,
                    left: this.props.size / 2 - 8,
                    top: height - 8
                }}
                >
                    <PortWidget name="bottom" node={this.props.node}/>
                </div>
            </div>
            );
    }
}

NodeCollectiveWidget.defaultProps = {
    size: 150,
    node: null
};

export var NodeCollectiveWidgetFactory = React.createFactory(NodeCollectiveWidget);