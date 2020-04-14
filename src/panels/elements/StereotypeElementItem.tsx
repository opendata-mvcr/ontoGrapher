import React from 'react';
import {OverlayTrigger, Tooltip} from "react-bootstrap";

interface Props {
    label: string;
    element: string;
    category: string;
    onMouseOver: Function;
    package: boolean;
    definition?: string;
}

interface State {

}

export default class StereotypeElementItem extends React.Component<Props, State> {

    render() {
        if (this.props.definition){
            return (
                <OverlayTrigger popperConfig={{
                    modifiers: {
                        preventOverflow: {
                            enabled: false
                        }
                    }
                }} placement="right" overlay={<Tooltip id={this.props.element}>{this.props.definition}</Tooltip>}>
                    <div draggable
                         onDragStart={(event) =>{
                             event.dataTransfer.setData("newClass", JSON.stringify({type: "stereotype", elem: this.props.element, package: this.props.package}));
                         }}
                         className={"stereotypeElementItem"} onMouseOver={()=>{this.props.onMouseOver();}}>
                        <span className={"label"}>{this.props.label}</span><span className={"category"}>{this.props.category}</span>
                    </div>
                </OverlayTrigger>
            );
        } else {
            return(<div draggable
                        onDragStart={(event) =>{
                            event.dataTransfer.setData("newClass", JSON.stringify({type: "stereotype", elem: this.props.element, package: this.props.package}));
                        }}
                        className={"stereotypeElementItem"} onMouseOver={()=>{this.props.onMouseOver();}}>
                <span className={"label"}>{this.props.label}</span><span className={"category"}>{this.props.category}</span>
            </div>);
        }

    }
}