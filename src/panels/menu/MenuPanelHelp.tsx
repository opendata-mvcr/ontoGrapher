import React from "react";
import { Nav } from "react-bootstrap";
import HelpModal from "./misc/HelpModal";
import { AppSettings } from "../../config/Variables";
import { Locale } from "../../config/Locale";

interface Props {}

interface State {
  modal: boolean;
}

export default class MenuPanelHelp extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      modal: false,
    };
  }

  render() {
    return (
      <div className={"inert"}>
        <Nav.Link
          onClick={() => {
            this.setState({ modal: true });
          }}
        >
          {Locale[AppSettings.viewLanguage].help}
        </Nav.Link>
        <HelpModal
          modal={this.state.modal}
          close={() => {
            this.setState({ modal: false });
          }}
        />
      </div>
    );
  }
}
