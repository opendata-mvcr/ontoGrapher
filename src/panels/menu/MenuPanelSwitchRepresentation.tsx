import React from 'react';
import {Nav, OverlayTrigger, Tooltip} from "react-bootstrap";
import {setRepresentation} from "../../function/FunctionGraph";
import {ProjectSettings} from "../../config/Variables";
import {Representation} from "../../config/Enum";
import {Locale} from "../../config/Locale";

interface Props {
	update: Function;
	close: Function;
	performTransaction: (...queries: string[]) => void;
}

interface State {
	alert: boolean;
}

export default class MenuPanelSwitchRepresentation extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			alert: false
		}
	}

	switch() {
		let result = setRepresentation(ProjectSettings.representation === Representation.FULL ? Representation.COMPACT : Representation.FULL);
		if (result) this.setState({alert: result.result});
		setTimeout(() => {
			this.setState({alert: false})
		}, 3000)
		this.props.performTransaction(...result.transaction);
		this.props.close();
		this.props.update();
		this.forceUpdate();
	}

	render() {
		return (<OverlayTrigger show={this.state.alert} placement="right" overlay={
			<Tooltip id="tooltipC">{Locale[ProjectSettings.viewLanguage].deletedRelationships}</Tooltip>}>
			<div className={"inert"}><Nav.Link onClick={() => this.switch()}>
				{ProjectSettings.representation === Representation.FULL ? Locale[ProjectSettings.viewLanguage].representationCompact : Locale[ProjectSettings.viewLanguage].representationFull}
			</Nav.Link>
			</div>
		</OverlayTrigger>);
	}
}