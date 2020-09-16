import React from 'react';
import {Nav} from 'react-bootstrap';
import AboutModal from "./misc/AboutModal";

interface Props {
    projectLanguage: string;
}

interface State {
    modal: boolean;
}

export default class MenuPanelAbout extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            modal: false
        };
    }

    render() {
        return (<div className={"inert"}><Nav.Link onClick={() => {
            this.setState({modal: true});
        }}>
            {"14 September - Changelog"}
        </Nav.Link>
            <AboutModal modal={this.state.modal} close={() => {
                this.setState({modal: false})
            }} projectLanguage={this.props.projectLanguage}/>
        </div>);
    }
}