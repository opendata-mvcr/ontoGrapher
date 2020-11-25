import React from 'react';
import {ProjectElements, ProjectSettings} from "../../config/Variables";

interface Props {
	label: string;
	id: string;
	update: Function;
	openRemoveItem: Function;
	selectedItems: string[];
	showCheckbox: boolean;
	handleShowCheckbox: Function;
	checkboxChecked: boolean;
	clearSelection: Function;
	readOnly: boolean;
}

interface State {
	hover: boolean;
	modalRemove: boolean;
}

const hiddenSVG = (
	<svg width="24" height="20" xmlns="http://www.w3.org/2000/svg" transform='scale(0.7) translate(0 -5)'
		 strokeWidth={1} fill="#000" stroke="#000">
		<path
			d="M8.137 15.147c-.71-.857-1.146-1.947-1.146-3.147 0-2.76 2.241-5 5-5 1.201 0 2.291.435 3.148 1.145l1.897-1.897c-1.441-.738-3.122-1.248-5.035-1.248-6.115 0-10.025 5.355-10.842 6.584.529.834 2.379 3.527 5.113 5.428l1.865-1.865zm6.294-6.294c-.673-.53-1.515-.853-2.44-.853-2.207 0-4 1.792-4 4 0 .923.324 1.765.854 2.439l5.586-5.586zm7.56-6.146l-19.292 19.293-.708-.707 3.548-3.548c-2.298-1.612-4.234-3.885-5.548-6.169 2.418-4.103 6.943-7.576 12.01-7.576 2.065 0 4.021.566 5.782 1.501l3.501-3.501.707.707zm-2.465 3.879l-.734.734c2.236 1.619 3.628 3.604 4.061 4.274-.739 1.303-4.546 7.406-10.852 7.406-1.425 0-2.749-.368-3.951-.938l-.748.748c1.475.742 3.057 1.19 4.699 1.19 5.274 0 9.758-4.006 11.999-8.436-1.087-1.891-2.63-3.637-4.474-4.978zm-3.535 5.414c0-.554-.113-1.082-.317-1.562l.734-.734c.361.69.583 1.464.583 2.296 0 2.759-2.24 5-5 5-.832 0-1.604-.223-2.295-.583l.734-.735c.48.204 1.007.318 1.561.318 2.208 0 4-1.792 4-4z"/>
	</svg>);

export default class PackageItem extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			hover: false,
			modalRemove: false,
		}
	}

	isHidden() {
		return ProjectElements[this.props.id].hidden[ProjectSettings.selectedDiagram] ||
			ProjectElements[this.props.id].hidden[ProjectSettings.selectedDiagram] === undefined
	}

	render() {
		return (
			<div draggable
				 onDragStart={(event) => {
					 event.dataTransfer.setData("newClass", JSON.stringify({
						 type: "existing",
						 id: this.props.selectedItems.length > 0 ? this.props.selectedItems : [this.props.id],
						 iri: this.props.selectedItems.length > 0 ? this.props.selectedItems.map(id => ProjectElements[id].iri) : [ProjectElements[this.props.id].iri]
					 }));
				 }}
				 onDragEnd={() => {
					 this.props.clearSelection()
				 }}
				 onClick={(event) => {
					 event.stopPropagation();
					 if (event.shiftKey) {
						 this.props.handleShowCheckbox();
					 }
				 }}
				 onMouseOver={() => {
					 this.setState({hover: true})
				 }}
				 onMouseLeave={() => {
					 this.setState({hover: false})
				 }}
				 className={"stereotypeElementItem" + (this.isHidden() ? " hidden" : "")}>
				{(this.props.showCheckbox || this.state.hover) &&
                <input type="checkbox" checked={this.props.checkboxChecked}
                       onClick={(event) => {
						   event.stopPropagation();
						   this.props.handleShowCheckbox()
					   }}
                       onChange={() => {
					   }}
                />}
				&nbsp;<span className={"label"}>{this.props.label}</span>
				{(this.isHidden() ? hiddenSVG : <span/>)}
				{(this.props.showCheckbox || this.state.hover) &&
                <span className={"packageOptions right"}>
						{(this.state.hover && !(this.props.readOnly)) && <button className={"buttonlink"}
                                                                                 onClick={(event) => {
																					 event.stopPropagation();
																					 this.props.openRemoveItem();
																				 }}><span role="img"
                                                                                          aria-label={""}>❌</span>
                        </button>}
                    </span>
				}
			</div>
		);
	}
}