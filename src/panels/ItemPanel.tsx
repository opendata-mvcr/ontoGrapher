import React from 'react';
import {ResizableBox} from "react-resizable";
import {
	Diagrams,
	PackageRoot,
	ProjectElements,
	ProjectSettings,
	Schemes,
	VocabularyElements
} from "../config/Variables";
import PackageFolder from "./element/PackageFolder";
import {PackageNode} from "../datatypes/PackageNode";
import PackageItem from "./element/PackageItem";
import {getLabelOrBlank} from "../function/FunctionGetVars";
import ModalRemoveItem from "./modal/ModalRemoveItem";
import {Form, InputGroup} from 'react-bootstrap';
import {parsePrefix} from "../function/FunctionEditVars";
import {Representation} from "../config/Enum";
import PackageDivider from "./element/PackageDivider";
import {Shapes} from "../config/Shapes";
import {Locale} from "../config/Locale";
import {graph} from "../graph/Graph";
import {paper} from "../main/DiagramCanvas";
import {unHighlightAll} from "../function/FunctionDraw";

interface Props {
	projectLanguage: string;
	performTransaction: (...queries: string[]) => void;
	handleWidth: Function;
	updateDetailPanel: Function;
	selectedID: string;
	error: boolean;
	update: Function;
}

interface State {
	filter: string[];
	search: string;
	modalEditPackage: boolean;
	modalRemoveDiagram: boolean;
	modalRemoveItem: boolean;
	modalRemovePackage: boolean;
	modalRenameDiagram: boolean;
	selectedID: string;
	selectedDiagram: number;
	selectedNode: PackageNode;
	selectionMode: boolean;
	selectedItems: string[];
}

export default class ItemPanel extends React.Component<Props, State> {

	constructor(props: Props) {
		super(props);
		this.state = {
			filter: [],
			search: "",
			modalEditPackage: false,
			modalRemoveDiagram: false,
			modalRemoveItem: false,
			modalRemovePackage: false,
			modalRenameDiagram: false,
			selectedID: "",
			selectedDiagram: 0,
			selectedNode: PackageRoot,
			selectionMode: false,
			selectedItems: []
		};
		this.handleChangeSelect = this.handleChangeSelect.bind(this);
		this.handleChangeSearch = this.handleChangeSearch.bind(this);
	}

	update() {
		this.forceUpdate();
	}

	handleChangeSelect(event: any) {
		let result = [];
		if (Array.isArray(event)) {
			for (let e of event) {
				result.push(e.value);
			}
		}
		this.setState({filter: result});
		this.forceUpdate();
    }

    handleChangeSearch(event: React.ChangeEvent<HTMLSelectElement>) {
		PackageRoot.children.forEach(pkg => pkg.open = !(event.currentTarget.value === ""));
		this.setState({search: event.currentTarget.value});
		this.forceUpdate();
	}

	sort(a: string, b: string): number {
		const aLabel = VocabularyElements[ProjectElements[a].iri].labels[this.props.projectLanguage];
		const bLabel = VocabularyElements[ProjectElements[b].iri].labels[this.props.projectLanguage];
		return aLabel.localeCompare(bLabel);
	}

	categorizeTypes(elements: string[]): { [key: string]: string[] } {
		let result: { [key: string]: string[] } = {'unsorted': []};
		Object.keys(Shapes).forEach(type => result[type] = []);
		for (const elem of elements) {
			const types = VocabularyElements[ProjectElements[elem].iri].types;
			for (const key in Shapes) {
				if (types.includes(key)) {
					result[key].push(elem);
					break;
				}
			}
			if (!Object.values(result).find(arr => arr.includes(elem)))
				result['unsorted'].push(elem);
		}
		return result;
	}

	search(id: string): boolean {
		const search = this.state.search.normalize().trim().toLowerCase();
		const name = getLabelOrBlank(VocabularyElements[ProjectElements[id].iri].labels, this.props.projectLanguage);
		return name.normalize().trim().toLowerCase().includes(search) ||
			VocabularyElements[ProjectElements[id].iri].altLabels
				.find(alt => alt.language === this.props.projectLanguage && alt.label.normalize().trim().toLowerCase().includes(search)) !== undefined;
	}

	getFolders(): JSX.Element[] {
		let result: JSX.Element[] = [];
		for (const node of PackageRoot.children) {
			const elements = node.elements.sort((a, b) => this.sort(a, b)).filter(id => {
				return (
					this.search(id) &&
					(ProjectSettings.representation === Representation.FULL ||
						(ProjectSettings.representation === Representation.COMPACT &&
							(!(VocabularyElements[ProjectElements[id].iri].types.includes(parsePrefix("z-sgov-pojem", "typ-vztahu"))
									|| VocabularyElements[ProjectElements[id].iri].types.includes(parsePrefix("z-sgov-pojem", "typ-vlastnosti")))
							))))
			});
			let packageItems: JSX.Element[] = [];
			let categories = this.categorizeTypes(elements);
			for (const key in categories) {
				if (categories[key].length === 0) continue;
				if (ProjectSettings.viewItemPanelTypes) {
					const slice = elements.filter(elem => categories[key].includes(elem))
					packageItems.push(<PackageDivider
						key={Object.keys(Shapes).includes(key) ? key : ""}
						iri={Object.keys(Shapes).includes(key) ? key : ""}
						projectLanguage={this.props.projectLanguage}
						checkboxChecked={slice.every(elem => this.state.selectedItems.includes(elem))}
						handleShowCheckbox={() => {
							const items = this.state.selectedItems;
							if (slice.every(elem => this.state.selectedItems.includes(elem))) {
								slice.forEach(elem =>
									items.splice(this.state.selectedItems.indexOf(elem), 1))
							} else {
								slice.forEach(elem => items.push(elem))
							}
							this.setState({selectedItems: items, selectionMode: items.length > 0});
						}}
						showCheckbox={this.state.selectionMode}
					/>);
				}
				for (const id of categories[key]) {
					packageItems.push(<PackageItem
						key={id}
						id={id}
						selectedID={this.props.selectedID}
						projectLanguage={this.props.projectLanguage}
						readOnly={(node.scheme ? Schemes[node.scheme].readOnly : true)}
						update={() => {
							this.forceUpdate();
						}}
						openRemoveItem={() => {
							this.setState({
								selectedID: id,
								modalRemoveItem: true
							})
						}}
						checkboxChecked={this.state.selectedItems.includes(id)}
						handleShowCheckbox={() => {
							let items = this.state.selectedItems
							if (items.includes(id)) {
								items.splice(items.indexOf(id), 1)
							} else {
								items.push(id);
							}
							this.setState({selectedItems: items, selectionMode: (items.length > 0)})
						}}
						showCheckbox={this.state.selectionMode}
						selectedItems={this.state.selectedItems}
						clearSelection={() => {
							this.setState({selectedItems: [], selectionMode: false})
						}}
						showDetails={() => {
							unHighlightAll();
							ProjectSettings.selectedCells = [];
							this.props.updateDetailPanel(id);
							let elem = graph.getElements().find(elem => elem.id === id);
							if (elem) {
								const scale = paper.scale().sx;
								paper.translate(0, 0);
								paper.translate((-elem.position().x * scale) + (paper.getComputedSize().width / 2) - elem.getBBox().width,
									(-elem.position().y * scale) + (paper.getComputedSize().height / 2) - elem.getBBox().height);
								Diagrams[ProjectSettings.selectedDiagram].origin = {
									x: paper.translate().tx,
									y: paper.translate().ty
								};
								Diagrams[ProjectSettings.selectedDiagram].scale = paper.scale().sx;
							}
						}}
					/>)
				}
			}
			result.push(
				<PackageFolder
					key={node.scheme}
					projectLanguage={this.props.projectLanguage}
					node={node}
					update={() => {
						this.forceUpdate();
					}}
					openEditPackage={() => {
						this.setState({
							selectedNode: node,
							modalEditPackage: true
						})
					}}
					openRemovePackage={() => {
						this.setState({
							selectedNode: node,
							modalRemovePackage: true
						})
					}}
					readOnly={node.scheme ? Schemes[node.scheme].readOnly : false}
					checkboxChecked={node.elements.every(elem => this.state.selectedItems.includes(elem))}
					handleShowCheckbox={() => {
						let items = this.state.selectedItems;
						if (node.elements.every(elem => this.state.selectedItems.includes(elem))) {
							node.elements.forEach(elem =>
								items.splice(this.state.selectedItems.indexOf(elem), 1)
							)
							this.setState({selectedItems: items});
						} else {
							node.elements.forEach(elem =>
								items.push(elem)
							)
						}
						this.setState({selectedItems: items, selectionMode: items.length > 0});
					}}
					showCheckbox={this.state.selectionMode}
				>{packageItems}</PackageFolder>);
		}
		return result;
	}

	render() {
		return (<ResizableBox
				className={"elements" + (this.props.error ? " disabled" : "")}
				width={300}
				height={1000}
				axis={"x"}
				handleSize={[8, 8]}
				onResizeStop={(e, d) => this.props.handleWidth(d.size.width)}
			>
				<InputGroup>
					<InputGroup.Prepend>
						<InputGroup.Text id="inputGroupPrepend">
							<span role="img"
								  aria-label={Locale[ProjectSettings.viewLanguage].searchStereotypes}>🔎</span></InputGroup.Text>
					</InputGroup.Prepend>
					<Form.Control
						type="search"
						id={"searchInput"}
						placeholder={Locale[ProjectSettings.viewLanguage].searchStereotypes}
						aria-describedby="inputGroupPrepend"
						value={this.state.search}
						onChange={this.handleChangeSearch}
					/>
				</InputGroup>
				<div className={"elementLinkList" + (this.props.error ? " disabled" : "")}>
					{this.getFolders()}
				</div>

				<ModalRemoveItem
					modal={this.state.modalRemoveItem}
					id={this.state.selectedID}
					close={() => {
						this.setState({modalRemoveItem: false});
					}}
					update={() => {
						this.forceUpdate();
						this.props.update();
					}}
					performTransaction={this.props.performTransaction}
				/>

			</ResizableBox>
        );
    }
}