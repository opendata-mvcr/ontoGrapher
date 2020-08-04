import React from 'react';
import DetailLink from "./detail/DetailLink";
import {graph} from "../graph/Graph";
import DetailElement from "./detail/DetailElement";

const headers: { [key: string]: { [key: string]: string } } = {
    labels: {"cs": "Název", "en": "Label"},
    inScheme: {"cs": "Ze slovníku", "en": "In vocabulary"},
    definition: {"cs": "Definice", "en": "Definition"},
    stereotype: {"cs": "Stereotyp", "en": "Stereotype"}
}

interface Props {
    projectLanguage: string;
    resizeElem: Function;
    update: Function;
    handleChangeLoadingStatus: Function;
    retry: boolean;
    handleWidth: Function;
}

interface State {
    id: any,
    hidden: boolean;
    type: string;
}

export default class DetailPanel extends React.Component<Props, State> {

    private readonly detailElem: React.RefObject<DetailElement>;
    private readonly detailLink: React.RefObject<DetailLink>;

    constructor(props: Props) {
        super(props);
        this.state = {
            id: undefined,
            hidden: true,
            type: "",
        };
        this.detailElem = React.createRef();
        this.detailLink = React.createRef();
        this.hide = this.hide.bind(this);
        this.save = this.save.bind(this);
    }

    hide() {
        this.setState({hidden: true});
    }

    prepareDetails(id: string) {
        if (graph.getCell(id).isElement()) {
            this.setState({
                id: id,
                type: "elem",
                hidden: false
            });
            this.detailElem.current?.prepareDetails(id);
        } else if (graph.getCell(id).isLink()) {
            this.setState({
                id: id,
                type: "link",
                hidden: false
            });
            this.detailLink.current?.prepareDetails(id);
        }
    }

    save() {
        if (graph.getCell(this.state.id).isElement()) this.props.resizeElem(this.state.id);
        this.props.update();
    }

    update() {
        this.detailElem.current?.forceUpdate();
        this.detailLink.current?.forceUpdate();
        if (this.detailElem.current?.state.id) {
            this.prepareDetails(this.detailElem.current?.state.id);
        }
    }

    retry() {
        this.detailElem.current?.save();
    }

    render() {
        if (!this.state.hidden) {
            if (this.state.type === "elem") {
                return (<DetailElement headers={headers} projectLanguage={this.props.projectLanguage}
                                       save={this.save} ref={this.detailElem}
                                       handleChangeLoadingStatus={this.props.handleChangeLoadingStatus}
                                       retry={this.props.retry}
                                       handleWidth={this.props.handleWidth}
                />);
            } else if (this.state.type === "link") {
                return (<DetailLink
                    handleWidth={this.props.handleWidth}
                    handleChangeLoadingStatus={this.props.handleChangeLoadingStatus}
                    projectLanguage={this.props.projectLanguage} headers={headers}
                    save={this.save} ref={this.detailLink} retry={this.props.retry}/>);
            }
        } else {
            return (<div/>);
        }

    }

}